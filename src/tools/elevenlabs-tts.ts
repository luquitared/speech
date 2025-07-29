import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { z } from "zod";
import { ToolResponse } from "./types.js";

// ElevenLabs voice mapping
const ELEVENLABS_VOICES = {
  "Aria": "9BWtsMINqrJLrRacOk9x",
  "Sarah": "EXAVITQu4vr4xnSDxMaL",
  "Laura": "FGY2WhTYpPnrIDTdsKH5",
  "Charlie": "IKne3meq5aSn9XLyUdCD",
  "George": "JBFqnCBsd6RMkjVDRZzb",
  "Callum": "N2lVS1w4EtoT3dr4eOWO",
  "River": "SAz9YHcvj6GT2YYXdXww",
  "Liam": "TX3LPaxmHKxFdv7VOQHJ",
  "Charlotte": "XB0fDUnXU5powFXDhCwa",
  "Alice": "Xb7hH8MSUJpSbSDYk0k2",
  "Matilda": "XrExE9yKIg1WjnnlVkGX",
  "Will": "bIHbv24MWmeRgasZH58o",
  "Jessica": "cgSgspJ2msm6clMCkdW9",
  "Eric": "cjVigY5qzO86Huf0OWal",
  "Chris": "iP95p4xoKVk53GoZ742B",
  "Brian": "nPczCjzI2devNBz1zQrb",
  "Daniel": "onwK4e9ZLuTAKqWW03F9",
  "Lily": "pFZP5JQG7iQjIQuC4Bku",
  "Bill": "pqHfZKP75CvOlQylNhV4"
} as const;

export function registerElevenLabsTTSTool(server: McpServer, elevenlabs: ElevenLabsClient) {
  server.tool(
    "elevenlabs-text-to-speech",
    "Convert text to speech using ElevenLabs API with character-level timestamps. Automatically saves audio file and timestamp files (character, word, and sentence level) to specified or default audio directory",
    {
      text: z.string().describe("The text to convert to speech"),
      filename: z
        .string()
        .optional()
        .describe("Optional filename for the audio file (without extension). Defaults to timestamp"),
      output_directory: z
        .string()
        .optional()
        .describe("Optional output directory for the audio files. Defaults to './audio'"),
      
      // Voice selection
      voice: z
        .enum(["Aria", "Sarah", "Laura", "Charlie", "George", "Callum", "River", "Liam", "Charlotte", "Alice", "Matilda", "Will", "Jessica", "Eric", "Chris", "Brian", "Daniel", "Lily", "Bill"])
        .optional()
        .describe("Voice name for ElevenLabs. Available voices: Aria (middle-aged female, African-American, husky), Sarah (young female, professional), Laura (young female, sassy), Charlie (young male, Australian, hyped), George (middle-aged male, British, mature), Callum (middle-aged male, gravelly), River (middle-aged neutral, calm), Liam (young male, American, confident), Charlotte (young female, Swedish, sensual), Alice (middle-aged female, British, professional), Matilda (middle-aged female, American, upbeat), Will (young male, American, chill), Jessica (young female, American, cute), Eric (middle-aged male, American, classy), Chris (middle-aged male, American, casual), Brian (middle-aged male, American, classy), Daniel (middle-aged male, British, formal), Lily (middle-aged female, British, warm), Bill (old male, American, crisp)"),
      voice_id: z
        .string()
        .optional()
        .describe("Direct voice ID for ElevenLabs (alternative to voice parameter)"),
      
      // Model and language
      model_id: z
        .string()
        .optional()
        .describe("ElevenLabs model ID (default: eleven_multilingual_v2)"),
      language_code: z
        .string()
        .optional()
        .describe("Language code (ISO 639-1) for ElevenLabs. Currently only Turbo v2.5 and Flash v2.5 support language enforcement"),
      
      // Audio format and quality
      output_format: z
        .enum(["mp3_22050_32", "mp3_44100_64", "mp3_44100_96", "mp3_44100_128", "mp3_44100_192", "pcm_16000", "pcm_22050", "pcm_24000", "pcm_44100", "ulaw_8000"])
        .optional()
        .describe("ElevenLabs output format (default: mp3_44100_128). Higher quality formats may require subscription"),
      
      // Voice settings
      stability: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe("Voice stability (0.0-1.0, default: 0.5)"),
      similarity_boost: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe("Similarity boost (0.0-1.0, default: 0.8)"),
      style: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe("Style exaggeration (0.0-1.0, default: 0.0)"),
      use_speaker_boost: z
        .boolean()
        .optional()
        .describe("Use speaker boost (default: true)"),
      
      // Generation parameters
      seed: z
        .number()
        .min(0)
        .max(4294967295)
        .optional()
        .describe("Random seed for reproducible results (0-4294967295)"),
      
      // Text continuity
      previous_text: z
        .string()
        .optional()
        .describe("Text that came before current request for better speech continuity"),
      next_text: z
        .string()
        .optional()
        .describe("Text that comes after current request for better speech continuity"),
      
      // Text processing
      apply_text_normalization: z
        .enum(["auto", "on", "off"])
        .optional()
        .describe("Text normalization mode (default: auto). Controls spelling out numbers, etc."),
      apply_language_text_normalization: z
        .boolean()
        .optional()
        .describe("Language text normalization (default: false). May increase latency but improves pronunciation"),
      
      // System settings
      enable_logging: z
        .boolean()
        .optional()
        .describe("Enable logging (default: true). Set false for zero retention mode"),
    },
    async ({
      text,
      filename,
      output_directory,
      voice,
      voice_id,
      model_id,
      language_code,
      output_format,
      stability,
      similarity_boost,
      style,
      use_speaker_boost,
      seed,
      previous_text,
      next_text,
      apply_text_normalization,
      apply_language_text_normalization,
      enable_logging,
    }): Promise<ToolResponse> => {
      try {
        if (!process.env.ELEVENLABS_API_KEY) {
          throw new Error("ELEVENLABS_API_KEY environment variable is not set");
        }

        const fs = await import("fs");
        const path = await import("path");

        // Create audio directory if it doesn't exist
        const audioDir = path.resolve(output_directory || "audio");
        if (!fs.existsSync(audioDir)) {
          fs.mkdirSync(audioDir, { recursive: true });
        }

        // Create subdirectory for this generation
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const sessionDir = path.join(audioDir, `elevenlabs-${timestamp}`);
        fs.mkdirSync(sessionDir, { recursive: true });

        // Determine voice ID
        const voiceId = voice_id || (voice ? ELEVENLABS_VOICES[voice] : "21m00Tcm4TlvDq8ikWAM");

        // Build request options
        const requestOptions: any = {
          text: text,
          modelId: model_id || "eleven_multilingual_v2",
          voiceSettings: {
            stability: stability ?? 0.5,
            similarityBoost: similarity_boost ?? 0.8,
            style: style ?? 0.0,
            useSpeakerBoost: use_speaker_boost ?? true,
          },
        };

        // Add optional parameters
        if (language_code) requestOptions.languageCode = language_code;
        if (previous_text) requestOptions.previousText = previous_text;
        if (next_text) requestOptions.nextText = next_text;
        if (apply_text_normalization) requestOptions.applyTextNormalization = apply_text_normalization;
        if (apply_language_text_normalization !== undefined) requestOptions.applyLanguageTextNormalization = apply_language_text_normalization;
        if (seed !== undefined) requestOptions.seed = seed;

        // Build query parameters
        const queryParams: any = {};
        if (output_format) queryParams.outputFormat = output_format;
        if (enable_logging !== undefined) queryParams.enableLogging = enable_logging;

        // Generate TTS audio with timestamps
        const elevenLabsResponse = await elevenlabs.textToSpeech.convertWithTimestamps(
          voiceId,
          requestOptions,
          queryParams
        );

        // Convert base64 audio to buffer
        const audioBuffer = Buffer.from(elevenLabsResponse.audioBase64, 'base64');

        // Generate filename
        let outputFilename: string;
        if (filename) {
          outputFilename = filename;
        } else {
          outputFilename = `speech`;
        }

        // Set appropriate extension based on output format
        const extension = output_format?.startsWith('pcm') ? '.wav' : '.mp3';
        if (!outputFilename.endsWith(extension)) {
          outputFilename += extension;
        }

        const outputPath = path.join(sessionDir, outputFilename);
        fs.writeFileSync(outputPath, audioBuffer);

        // Add voice information
        const usedVoice = voice || voice_id || "default";
        
        // Save timestamp data to files if available
        if (elevenLabsResponse.alignment) {
          // Full timestamp data file
          const fullTimestampPath = path.join(sessionDir, 'timestamps_full.json');
          const fullTimestampData = {
            text: text,
            audio_file: outputFilename,
            alignment: elevenLabsResponse.alignment,
            normalized_alignment: elevenLabsResponse.normalizedAlignment,
            generated_at: new Date().toISOString(),
            voice_used: usedVoice,
            model: model_id || "eleven_multilingual_v2"
          };
          fs.writeFileSync(fullTimestampPath, JSON.stringify(fullTimestampData, null, 2));

          // Abbreviated timestamp file (word-level approximations)
          const words = text.split(/\s+/);
          const characters = elevenLabsResponse.alignment.characters;
          const startTimes = elevenLabsResponse.alignment.characterStartTimesSeconds;
          const endTimes = elevenLabsResponse.alignment.characterEndTimesSeconds;
          
          const wordTimestamps = [];
          let charIndex = 0;
          
          for (const word of words) {
            // Find the start of this word in the character array
            while (charIndex < characters.length && characters[charIndex].trim() === '') {
              charIndex++;
            }
            
            if (charIndex < characters.length) {
              const wordStart = startTimes[charIndex];
              
              // Find the end of this word
              const wordEndCharIndex = Math.min(charIndex + word.length - 1, characters.length - 1);
              const wordEnd = endTimes[wordEndCharIndex];
              
              wordTimestamps.push({
                word: word,
                start_time: wordStart,
                end_time: wordEnd,
                duration: wordEnd - wordStart
              });
              
              charIndex += word.length;
              // Skip spaces
              while (charIndex < characters.length && characters[charIndex].trim() === '') {
                charIndex++;
              }
            }
          }

          const abbreviatedTimestampPath = path.join(sessionDir, 'timestamps_words.json');
          const abbreviatedTimestampData = {
            text: text,
            audio_file: outputFilename,
            word_timestamps: wordTimestamps,
            total_duration: endTimes[endTimes.length - 1],
            generated_at: new Date().toISOString(),
            voice_used: usedVoice,
            model: model_id || "eleven_multilingual_v2"
          };
          fs.writeFileSync(abbreviatedTimestampPath, JSON.stringify(abbreviatedTimestampData, null, 2));

          // Generate sentence-level timestamps
          const sentenceMatches = text.match(/[^.!?]*[.!?]+/g) || [];
          const sentenceTimestamps = [];
          let textIndex = 0;
          
          for (const fullSentence of sentenceMatches) {
            const trimmedSentence = fullSentence.trim();
            if (trimmedSentence.length === 0) continue;
            
            // Find the start position of this sentence in the original text
            const sentenceStart = text.indexOf(trimmedSentence, textIndex);
            const sentenceEnd = sentenceStart + trimmedSentence.length;
            
            // Find corresponding character indices in the alignment (direct mapping)
            const startCharIndex = sentenceStart;
            const endCharIndex = sentenceEnd - 1;
            
            // Ensure indices are within bounds
            if (startCharIndex >= 0 && startCharIndex < startTimes.length && 
                endCharIndex >= 0 && endCharIndex < endTimes.length) {
              const sentenceStartTime = startTimes[startCharIndex];
              const sentenceEndTime = endTimes[endCharIndex];
              
              sentenceTimestamps.push({
                sentence: trimmedSentence,
                start_time: sentenceStartTime,
                end_time: sentenceEndTime,
                duration: sentenceEndTime - sentenceStartTime
              });
            }
            
            textIndex = sentenceEnd;
          }

          const sentenceTimestampPath = path.join(sessionDir, 'timestamps_sentences.json');
          const sentenceTimestampData = {
            text: text,
            audio_file: outputFilename,
            sentence_timestamps: sentenceTimestamps,
            total_duration: endTimes[endTimes.length - 1],
            generated_at: new Date().toISOString(),
            voice_used: usedVoice,
            model: model_id || "eleven_multilingual_v2"
          };
          fs.writeFileSync(sentenceTimestampPath, JSON.stringify(sentenceTimestampData, null, 2));
        }

        const responseText = `Directory: ${sessionDir}

ElevenLabs speech generation completed successfully. Contains:
- ${outputFilename}: Generated audio file (${output_format || "mp3_44100_128"})
- timestamps_full.json: Complete character-level timing data with alignment info  
- timestamps_words.json: Simplified word-level timing summary
- timestamps_sentences.json: Sentence-level timing data

Voice: ${usedVoice} | Model: ${model_id || "eleven_multilingual_v2"}`;

        return {
          content: [
            {
              type: "text",
              text: responseText,
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [
            {
              type: "text",
              text: `Error generating ElevenLabs speech: ${errorMessage}`,
            },
          ],
        };
      }
    }
  );
}