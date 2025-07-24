import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";
import Replicate from "replicate";
import { z } from "zod";
import { ToolResponse } from "./types.js";

export function registerTextToSpeechTool(server: McpServer, replicate: Replicate) {
  server.tool(
    "text-to-speech",
    "Convert text to speech using Replicate's TTS models (Chatterbox, Chatterbox Pro, Minimax) and save to specified or default audio directory. For ElevenLabs TTS with timestamps, use the elevenlabs-text-to-speech tool instead.",
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
      model: z
        .enum(["chatterbox", "chatterbox-pro", "minimax"])
        .optional()
        .describe("TTS model to use: chatterbox (default), chatterbox-pro, or minimax"),
      seed: z
        .number()
        .optional()
        .describe("Random seed for reproducible results"),
      
      // Chatterbox/Chatterbox Pro parameters
      voice: z
        .string()
        .optional()
        .describe("Voice name for Chatterbox models (Luna, Ember, Hem, Aurora, Cliff, Josh, William, Orion, Ken)"),
      temperature: z
        .number()
        .optional()
        .describe("Speech variation (0.05-5.0 for Chatterbox, 0.1-5.0 for Chatterbox Pro)"),
      cfg_weight: z
        .number()
        .optional()
        .describe("Pace/control weight for Chatterbox (0.2-1.0)"),
      exaggeration: z
        .number()
        .optional()
        .describe("Emotion intensity (0.25-2.0 for Chatterbox, 0.1-1.0 for Chatterbox Pro)"),
      pitch: z
        .enum(["x-low", "low", "medium", "high", "x-high"])
        .optional()
        .describe("Voice pitch for Chatterbox Pro"),
      audio_prompt: z
        .string()
        .optional()
        .describe("Reference audio file URL for voice cloning (Chatterbox)"),
      custom_voice: z
        .string()
        .optional()
        .describe("Custom voice UUID for Chatterbox Pro"),

      // Minimax parameters
      minimax_voice_id: z
        .string()
        .optional()
        .describe("Voice ID for Minimax (e.g., 'Deep_Voice_Man', 'Wise_Woman')"),
      speed: z.number().optional().describe("Speech speed for Minimax (0.5-2.0)"),
      volume: z.number().optional().describe("Volume for Minimax (0-10)"),
      emotion: z
        .enum([
          "auto",
          "neutral",
          "happy",
          "sad",
          "angry",
          "fearful",
          "disgusted",
          "surprised",
        ])
        .optional()
        .describe("Emotion for Minimax"),
      sample_rate: z
        .number()
        .optional()
        .describe("Sample rate for Minimax (8000-44100)"),
      bitrate: z
        .number()
        .optional()
        .describe("Bitrate for Minimax (32000-256000)"),
      channel: z
        .enum(["mono", "stereo"])
        .optional()
        .describe("Audio channel for Minimax"),
      language_boost: z
        .string()
        .optional()
        .describe("Language boost for Minimax"),
      english_normalization: z
        .boolean()
        .optional()
        .describe("Enable English normalization for Minimax"),
    },
    async ({
      text,
      filename,
      output_directory,
      model = "chatterbox",
      seed,
      voice,
      temperature,
      cfg_weight,
      exaggeration,
      pitch,
      audio_prompt,
      custom_voice,
      minimax_voice_id,
      speed,
      volume,
      emotion,
      sample_rate,
      bitrate,
      channel,
      language_boost,
      english_normalization,
    }): Promise<ToolResponse> => {
      try {
        if (!process.env.REPLICATE_API_TOKEN) {
          throw new Error("REPLICATE_API_TOKEN environment variable is not set");
        }

        const fs = await import("fs");
        const path = await import("path");

        // Create audio directory if it doesn't exist
        const audioDir = path.resolve(output_directory || "audio");
        if (!fs.existsSync(audioDir)) {
          fs.mkdirSync(audioDir, { recursive: true });
        }

        let modelId: string = "";
        let input: any = {};

        // Configure model and input based on selected model
        switch (model) {
          case "chatterbox":
            modelId = "resemble-ai/chatterbox";
            input = {
              prompt: text,
              seed: seed ?? 0,
              temperature: temperature ?? 0.8,
              cfg_weight: cfg_weight ?? 0.5,
              exaggeration: exaggeration ?? 0.5,
            };
            if (audio_prompt) input.audio_prompt = audio_prompt;
            break;

          case "chatterbox-pro":
            modelId = "resemble-ai/chatterbox-pro";
            input = {
              prompt: text,
              voice: voice ?? "Luna",
              pitch: pitch ?? "medium",
              temperature: temperature ?? 0.8,
              exaggeration: exaggeration ?? 0.5,
            };
            if (custom_voice) input.custom_voice = custom_voice;
            if (seed !== undefined) input.seed = seed;
            break;

          case "minimax":
            modelId = "minimax/speech-02-turbo";
            input = {
              text: text,
              voice_id: minimax_voice_id ?? "Deep_Voice_Man",
              speed: speed ?? 1.0,
              volume: volume ?? 1,
              emotion: emotion ?? "auto",
              sample_rate: sample_rate ?? 32000,
              bitrate: bitrate ?? 128000,
              channel: channel ?? "mono",
            };
            if (language_boost) input.language_boost = language_boost;
            if (english_normalization !== undefined)
              input.english_normalization = english_normalization;
            break;


          default:
            throw new Error(`Unsupported model: ${model}`);
        }

        // Generate TTS audio using Replicate
        const output = await replicate.run(modelId as `${string}/${string}`, {
          input,
        });

        console.error(`Replicate output:`, JSON.stringify(output, null, 2));

        const audioUrl = (output as any).url();

        // Download and save the audio file
        const response = await axios({
          method: "GET",
          url: audioUrl,
          responseType: "arraybuffer",
        });

        const audioBuffer = Buffer.from(response.data);


        // Generate filename
        let outputFilename: string;
        if (filename) {
          outputFilename = filename;
        } else {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          outputFilename = `speech-${timestamp}`;
        }

        // Set .wav extension
        if (!outputFilename.endsWith(".wav")) {
          outputFilename += ".wav";
        }

        const outputPath = path.join(audioDir, outputFilename);
        fs.writeFileSync(outputPath, audioBuffer);

        return {
          content: [
            {
              type: "text",
              text: `Successfully generated and saved speech audio file using ${model} model: ${outputPath}`,
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
              text: `Error generating speech: ${errorMessage}`,
            },
          ],
        };
      }
    }
  );
}