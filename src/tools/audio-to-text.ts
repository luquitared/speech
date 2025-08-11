import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";
import type Replicate from "replicate";
import { z } from "zod";

config({ path: ".env.local" });

export function registerAudioToTextTool(
  server: McpServer,
  replicate: Replicate
) {
  server.tool(
    "audio-to-text",
    "Transcribe audio files to text with word-level timestamps using WhisperX. Automatically saves transcript with timestamps, sentence-level timestamps, and returns directory reference.",
    {
      audio_file: z.string().describe("Path to the audio file to transcribe"),
      task: z
        .enum(["transcribe", "translate"])
        .optional()
        .default("transcribe")
        .describe(
          "Task to perform: transcribe or translate to another language."
        ),
      diarise_audio: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Use Pyannote.audio to diarise the audio clips. You will need to provide hf_token below too."
        ),
      output_directory: z
        .string()
        .optional()
        .default("./audio")
        .describe(
          "Output directory for the audio files. Defaults to './audio' in current working directory"
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
      task = "transcribe",
      diarise_audio = true,
      output_directory = "./audio",
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

        // Handle @ prefix in audio_file path
        let processedAudioFile = audio_file;
        if (audio_file.startsWith('@')) {
          processedAudioFile = join(process.cwd(), audio_file.substring(1));
        }

        // Upload file to Supabase storage
        const fileBuffer = readFileSync(processedAudioFile);

        const fileName = `${Date.now()}-${basename(processedAudioFile)}`;
        const filePath = `audio/${fileName}`;

        const { error: uploadError } = await supabase.storage
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
          task,
          language: "None",
          timestamp: "chunk",
          batch_size: 64,
          diarise_audio,
          hf_token: process.env.HF_TOKEN,
        };

        const output = (await replicate.run(
          "vaibhavs10/incredibly-fast-whisper:3ab86df6c8f54c11309d4d1f930ac292bad43ace52d10c80d87eb258b3c9f79c",
          {
            input,
          }
        )) as Array<{
          text: string;
          speaker?: string;
          timestamp: [number, number];
          chunks?: Array<{
            text: string;
            timestamp: [number, number];
          }>;
        }>;

        console.log("Replicate output:", JSON.stringify(output, null, 2));

        if (!output || !Array.isArray(output)) {
          throw new Error("No output received from Replicate API");
        }

        const audioDir = output_directory.startsWith('/') || output_directory.startsWith('C:') 
          ? output_directory 
          : join(process.cwd(), output_directory);
        mkdirSync(audioDir, { recursive: true });

        const baseFilename =
          filename || new Date().toISOString().replace(/[:.]/g, "-");
        const transcriptPath = join(
          audioDir,
          `${baseFilename}_transcript.json`
        );
        const textPath = join(audioDir, `${baseFilename}_transcript.txt`);
        const markdownPath = join(audioDir, `${baseFilename}_transcript.md`);
        const sentencesPath = join(audioDir, `${baseFilename}_sentences.json`);

        const fullText = output.map((segment) => segment.text).join(" ");
        const allChunks = output.flatMap(
          (segment) =>
            segment.chunks || [
              {
                text: segment.text,
                timestamp: segment.timestamp,
                speaker: segment.speaker,
              },
            ]
        );

        const transcriptData = {
          text: fullText,
          segments: output,
          chunks: allChunks,
          metadata: {
            transcribed_at: new Date().toISOString(),
            audio_file: processedAudioFile,
            model: "vaibhavs10/incredibly-fast-whisper",
            settings: {
              task,
              language: "english",
              timestamp: "chunk",
              batch_size: 64,
              diarise_audio,
            },
          },
        };

        writeFileSync(transcriptPath, JSON.stringify(transcriptData, null, 2));

        let textContent = `Audio Transcript\n`;
        textContent += `Transcribed: ${new Date().toISOString()}\n`;
        textContent += `Model: vaibhavs10/incredibly-fast-whisper\n\n`;

        if (fullText) {
          textContent += `Full Text:\n${fullText}\n\n`;
        }

        // Filter output to only include segments with valid structure for text content
        const validSegmentsForText = output.filter(segment => 
          segment && segment.timestamp && Array.isArray(segment.timestamp) && segment.timestamp.length >= 2
        );

        if (validSegmentsForText && validSegmentsForText.length > 0) {
          textContent += `Segments:\n`;
          validSegmentsForText.forEach((segment) => {
            const startTime = new Date(segment.timestamp[0] * 1000)
              .toISOString()
              .substring(11, 23);
            const endTime = new Date(segment.timestamp[1] * 1000)
              .toISOString()
              .substring(11, 23);
            const speakerInfo = segment.speaker ? ` (${segment.speaker})` : "";
            textContent += `[${startTime} - ${endTime}]${speakerInfo}: ${segment.text.trim()}\n\n`;
          });
        }

        writeFileSync(textPath, textContent);

        // Generate simple markdown transcript with speaker labels
        let markdownContent = '';
        if (validSegmentsForText && validSegmentsForText.length > 0) {
          validSegmentsForText.forEach((segment) => {
            const speakerLabel = segment.speaker ? segment.speaker.toLowerCase() : 'speaker_00';
            markdownContent += `(${speakerLabel}): ${segment.text.trim()}\n\n`;
          });
        }
        
        writeFileSync(markdownPath, markdownContent);

        // Generate sentence-level timestamps by grouping chunks
        const sentenceTimestamps = [];
        
        // Filter output to only include segments with valid structure
        const validSegments = output.filter(segment => 
          segment && segment.timestamp && Array.isArray(segment.timestamp) && segment.timestamp.length >= 2
        );
        
        if (validSegments && validSegments.length > 0) {
          let currentSentence = "";
          let sentenceStart = validSegments[0].timestamp[0];
          let currentSpeaker = validSegments[0].speaker;

          for (let i = 0; i < validSegments.length; i++) {
            const segment = validSegments[i];
            currentSentence += segment.text;

            // Check if this segment ends a sentence (contains sentence-ending punctuation)
            const endsWithPunctuation = /[.!?][\s]*$/.test(segment.text.trim());
            const isLastSegment = i === validSegments.length - 1;
            const speakerChanged =
              i < validSegments.length - 1 && validSegments[i + 1].speaker !== currentSpeaker;

            if (endsWithPunctuation || isLastSegment || speakerChanged) {
              sentenceTimestamps.push({
                sentence: currentSentence.trim(),
                start_time: sentenceStart,
                end_time: segment.timestamp[1],
                duration: segment.timestamp[1] - sentenceStart,
                speaker: currentSpeaker,
              });

              // Reset for next sentence
              if (i < validSegments.length - 1) {
                currentSentence = "";
                sentenceStart = validSegments[i + 1].timestamp[0];
                currentSpeaker = validSegments[i + 1].speaker;
              }
            }
          }
        }

        const sentenceData = {
          sentence_timestamps: sentenceTimestamps,
          metadata: {
            transcribed_at: new Date().toISOString(),
            audio_file: processedAudioFile,
            model: "vaibhavs10/incredibly-fast-whisper",
            settings: {
              task,
              language: "None",
              timestamp: "chunk",
              batch_size: 64,
              diarise_audio,
            },
          },
        };

        writeFileSync(sentencesPath, JSON.stringify(sentenceData, null, 2));

        const segmentCount = output?.length || 0;
        const duration =
          validSegments && validSegments.length > 0
            ? validSegments[validSegments.length - 1].timestamp[1]
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
- Simple markdown transcript: ${markdownPath}
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
