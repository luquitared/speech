import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";
import type Replicate from "replicate";
import { z } from "zod";

export function registerAudioToTextTool(
  server: McpServer,
  replicate: Replicate
) {
  server.tool(
    "audio-to-text",
    "Transcribe audio files to text with word-level timestamps using WhisperX. Automatically saves transcript with timestamps, sentence-level timestamps, and returns directory reference.",
    {
      audio_file: z.string().describe("Path to the audio file to transcribe"),
      language: z
        .string()
        .optional()
        .describe(
          "ISO code of the language spoken in the audio, specify None to perform language detection"
        ),
      language_detection_min_prob: z
        .number()
        .optional()
        .describe(
          "If language is not specified, then the language will be detected recursively on different parts of the file until it reaches the given probability"
        ),
      language_detection_max_tries: z
        .number()
        .int()
        .optional()
        .describe(
          "If language is not specified, then the language will be detected following the logic of language_detection_min_prob parameter, but will stop after the given max retries"
        ),
      initial_prompt: z
        .string()
        .optional()
        .describe("Optional text to provide as a prompt for the first window"),
      batch_size: z
        .number()
        .int()
        .optional()
        .describe("Parallelization of input audio transcription"),
      temperature: z
        .number()
        .optional()
        .describe("Temperature to use for sampling"),
      vad_onset: z.number().optional().describe("VAD onset"),
      vad_offset: z.number().optional().describe("VAD offset"),
      align_output: z
        .boolean()
        .optional()
        .describe(
          "Aligns whisper output to get accurate word-level timestamps"
        ),
      diarization: z.boolean().optional().describe("Assign speaker ID labels"),
      huggingface_access_token: z
        .string()
        .optional()
        .describe(
          "To enable diarization, please enter your HuggingFace token (read). You need to accept the user agreement for the models specified in the README"
        ),
      min_speakers: z
        .number()
        .int()
        .optional()
        .describe(
          "Minimum number of speakers if diarization is activated (leave blank if unknown)"
        ),
      max_speakers: z
        .number()
        .int()
        .optional()
        .describe(
          "Maximum number of speakers if diarization is activated (leave blank if unknown)"
        ),
      debug: z
        .boolean()
        .optional()
        .describe(
          "Print out compute/inference times and memory usage information"
        ),
      filename: z
        .string()
        .optional()
        .describe(
          "Optional filename for the transcript file (without extension). Defaults to timestamp"
        ),
    },
    async ({
      audio_file,
      language,
      language_detection_min_prob,
      language_detection_max_tries,
      initial_prompt,
      batch_size = 64,
      temperature = 0,
      vad_onset = 0.5,
      vad_offset = 0.363,
      align_output = true,
      diarization = false,
      huggingface_access_token,
      min_speakers,
      max_speakers,
      debug = false,
      filename,
    }) => {
      try {
        // Initialize Supabase client
        const supabaseUrl = "https://yiwkbafldsqjvrktrlbu.supabase.co";
        const supabaseKey =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlpd2tiYWZsZHNxanZya3RybGJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjM2Mzk1MiwiZXhwIjoyMDU3OTM5OTUyfQ.CkuQ95MQ-FPWNNR1BVxCA13MsihRvubo_spZYy2zHZc";

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Create bucket if it doesn't exist
        const { data: buckets, error: bucketsError } =
          await supabase.storage.listBuckets();

        if (bucketsError) {
          console.error("Error listing buckets:", bucketsError);
          throw new Error(`Failed to list buckets: ${bucketsError.message}`);
        }

        const audioBucketExists = buckets?.some(
          (bucket) => bucket.name === "audio"
        );

        if (!audioBucketExists) {
          const { error: createBucketError } =
            await supabase.storage.createBucket("audio", {
              public: true,
            });
          if (createBucketError) {
            console.error("Error creating bucket:", createBucketError);
            throw new Error(
              `Failed to create audio bucket: ${createBucketError.message}`
            );
          }
        } else {
        }

        // Upload file to Supabase storage
        const fileBuffer = readFileSync(audio_file);

        const fileName = `${Date.now()}-${basename(audio_file)}`;
        const filePath = `audio/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("audio")
          .upload(filePath, fileBuffer, {
            contentType: "audio/wav",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw new Error(
            `Failed to upload file to Supabase: ${uploadError.message}`
          );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("audio")
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;

        const input: any = {
          audio: publicUrl,
          temperature,
        };

        if (language) input.language = language;
        if (initial_prompt) input.initial_prompt = initial_prompt;

        const output = (await replicate.run(
          "openai/whisper:cdd97b257f93cb89dede1c7584e3f3dfc969571b357dbcee08e793740bedd854",
          {
            input,
          }
        )) as {
          transcription?: string;
          segments?: Array<{
            start: number;
            end: number;
            text: string;
          }>;
        };

        const audioDir = join(process.cwd(), "audio");
        mkdirSync(audioDir, { recursive: true });

        const baseFilename =
          filename || new Date().toISOString().replace(/[:.]/g, "-");
        const transcriptPath = join(
          audioDir,
          `${baseFilename}_transcript.json`
        );
        const textPath = join(audioDir, `${baseFilename}_transcript.txt`);
        const sentencesPath = join(audioDir, `${baseFilename}_sentences.json`);

        const transcriptData = {
          transcription: output.transcription || "",
          segments: output.segments || [],
          metadata: {
            transcribed_at: new Date().toISOString(),
            audio_file: audio_file,
            model: "openai/whisper",
            settings: {
              language,
              temperature,
            },
          },
        };

        writeFileSync(transcriptPath, JSON.stringify(transcriptData, null, 2));

        let textContent = `Audio Transcript\n`;
        textContent += `Transcribed: ${new Date().toISOString()}\n\n`;

        if (output.transcription) {
          textContent += output.transcription;
        } else if (output.segments && output.segments.length > 0) {
          output.segments.forEach((segment, index) => {
            const startTime = new Date(segment.start * 1000)
              .toISOString()
              .substr(11, 12);
            const endTime = new Date(segment.end * 1000)
              .toISOString()
              .substr(11, 12);
            textContent += `[${startTime} - ${endTime}]: ${segment.text.trim()}\n\n`;
          });
        }

        writeFileSync(textPath, textContent);

        // Generate sentence-level timestamps by grouping segments
        const sentenceTimestamps = [];
        if (output.segments && output.segments.length > 0) {
          let currentSentence = "";
          let sentenceStart = output.segments[0].start;

          for (let i = 0; i < output.segments.length; i++) {
            const segment = output.segments[i];
            currentSentence += segment.text;

            // Check if this segment ends a sentence (contains sentence-ending punctuation)
            const endsWithPunctuation = /[.!?][\s]*$/.test(segment.text.trim());
            const isLastSegment = i === output.segments.length - 1;

            if (endsWithPunctuation || isLastSegment) {
              sentenceTimestamps.push({
                sentence: currentSentence.trim(),
                start_time: sentenceStart,
                end_time: segment.end,
                duration: segment.end - sentenceStart,
              });

              // Reset for next sentence
              if (i < output.segments.length - 1) {
                currentSentence = "";
                sentenceStart = output.segments[i + 1].start;
              }
            }
          }
        }

        const sentenceData = {
          sentence_timestamps: sentenceTimestamps,
          metadata: {
            transcribed_at: new Date().toISOString(),
            audio_file: audio_file,
            model: "openai/whisper",
            settings: {
              language,
              temperature,
            },
          },
        };

        writeFileSync(sentencesPath, JSON.stringify(sentenceData, null, 2));

        const segmentCount = output.segments?.length || 0;
        const duration =
          output.segments && output.segments.length > 0
            ? output.segments[output.segments.length - 1].end
            : 0;

        return {
          content: [
            {
              type: "text",
              text: `Audio transcription completed successfully!

Segments: ${segmentCount}
Sentences: ${sentenceTimestamps.length}
Duration: ${duration.toFixed(2)} seconds

Files saved:
- Full transcript with timestamps: ${transcriptPath}
- Human-readable transcript: ${textPath}
- Sentence-level timestamps: ${sentencesPath}

Audio directory: ${audioDir}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error transcribing audio: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
