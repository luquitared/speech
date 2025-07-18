#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import Replicate from "replicate";
import { z } from "zod";

// Create the MCP server
const server = new McpServer({
  name: "speech-tts",
  version: "1.0.0",
});

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Tool: Convert text to speech and save to audio directory
server.tool(
  "text-to-speech",
  "Convert text to speech using Replicate's TTS models and save to audio directory",
  {
    text: z.string().describe("The text to convert to speech"),
    filename: z
      .string()
      .optional()
      .describe(
        "Optional filename for the audio file (without extension). Defaults to timestamp"
      ),
    model: z
      .enum(["chatterbox", "chatterbox-pro", "minimax"])
      .optional()
      .describe(
        "TTS model to use: chatterbox (default), chatterbox-pro, or minimax"
      ),

    seed: z
      .number()
      .optional()
      .describe("Random seed for reproducible results"),

    // Chatterbox/Chatterbox Pro parameters
    voice: z
      .string()
      .optional()
      .describe(
        "Voice name for Chatterbox models (Luna, Ember, Hem, Aurora, Cliff, Josh, William, Orion, Ken)"
      ),
    temperature: z
      .number()
      .optional()
      .describe(
        "Speech variation (0.05-5.0 for Chatterbox, 0.1-5.0 for Chatterbox Pro)"
      ),
    cfg_weight: z
      .number()
      .optional()
      .describe("Pace/control weight for Chatterbox (0.2-1.0)"),
    exaggeration: z
      .number()
      .optional()
      .describe(
        "Emotion intensity (0.25-2.0 for Chatterbox, 0.1-1.0 for Chatterbox Pro)"
      ),
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
    voice_id: z
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
    model = "chatterbox",
    seed,
    voice,
    temperature,
    cfg_weight,
    exaggeration,
    pitch,
    audio_prompt,
    custom_voice,
    voice_id,
    speed,
    volume,
    emotion,
    sample_rate,
    bitrate,
    channel,
    language_boost,
    english_normalization,
  }) => {
    try {
      if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN environment variable is not set");
      }

      let modelId: string;
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
            voice_id: voice_id ?? "Deep_Voice_Man",
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

        default: // bark
          modelId =
            "suno-ai/bark:b76242b40d67c76ab6742e987628a2a9ac019e11d56ab96c4e91ce03b79b2787";
          input = {
            text,
            text_temp: 0.7,
            waveform_temp: 0.7,
          };
          if (seed !== undefined) input.seed = seed;
          break;
      }

      // Generate TTS audio
      const output = await replicate.run(modelId as `${string}/${string}`, {
        input,
      });

      console.error("Replicate output:", JSON.stringify(output, null, 2));

      const audioUrl = (output as any).url();

      // Download and save the audio file
      const response = await axios({
        method: "GET",
        url: audioUrl,
        responseType: "arraybuffer",
      });

      const audioBuffer = Buffer.from(response.data);
      const fs = await import("fs");
      const path = await import("path");

      // Create audio directory if it doesn't exist
      const audioDir = path.resolve("audio");
      if (!fs.existsSync(audioDir)) {
        fs.mkdirSync(audioDir, { recursive: true });
      }

      // Generate filename if not provided
      if (!filename) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        filename = `speech-${timestamp}`;
      }

      // Ensure .wav extension
      if (!filename.endsWith(".wav")) {
        filename += ".wav";
      }

      const outputPath = path.join(audioDir, filename);
      fs.writeFileSync(outputPath, audioBuffer);

      const relativePath = path.join("audio", filename);

      return {
        content: [
          {
            type: "text",
            text: `Successfully generated and saved speech audio using ${model} model to: ${relativePath}`,
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

// Tool: Get audio metadata
server.tool(
  "get-audio-metadata",
  "Extract metadata from audio files including duration, format, bitrate, and other properties",
  {
    file_path: z.string().describe("Path to the audio file"),
  },
  async ({ file_path }) => {
    try {
      const fs = await import("fs");
      const path = await import("path");

      // Check if file exists
      if (!fs.existsSync(file_path)) {
        throw new Error(`Audio file not found: ${file_path}`);
      }

      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(file_path, (err, metadata) => {
          if (err) {
            reject(new Error(`Failed to read metadata: ${err.message}`));
            return;
          }

          const format = metadata.format;
          const audioStream = metadata.streams.find(
            (stream) => stream.codec_type === "audio"
          );

          const info = {
            filename: path.basename(file_path),
            format: format.format_name,
            duration: format.duration
              ? `${Math.round(format.duration * 100) / 100}s`
              : "Unknown",
            size: format.size
              ? `${Math.round((format.size / 1024 / 1024) * 100) / 100} MB`
              : "Unknown",
            bitrate: format.bit_rate
              ? `${Math.round(format.bit_rate / 1000)} kbps`
              : "Unknown",
            sample_rate: audioStream?.sample_rate
              ? `${audioStream.sample_rate} Hz`
              : "Unknown",
            channels: audioStream?.channels || "Unknown",
            codec: audioStream?.codec_name || "Unknown",
          };

          resolve({
            content: [
              {
                type: "text",
                text: `Audio Metadata for ${info.filename}:
Format: ${info.format}
Duration: ${info.duration}
File Size: ${info.size}
Bitrate: ${info.bitrate}
Sample Rate: ${info.sample_rate}
Channels: ${info.channels}
Codec: ${info.codec}`,
              },
            ],
          });
        });
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        content: [
          {
            type: "text",
            text: `Error getting audio metadata: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Tool: Trim audio
server.tool(
  "trim-audio",
  "Trim audio file to specified start and end times",
  {
    input_path: z.string().describe("Path to the input audio file"),
    output_path: z.string().describe("Path for the output trimmed audio file"),
    start_time: z
      .string()
      .describe(
        "Start time in format HH:MM:SS or seconds (e.g., '00:00:30' or '30')"
      ),
    end_time: z
      .string()
      .optional()
      .describe(
        "End time in format HH:MM:SS or seconds. If not provided, trims to end of file"
      ),
    duration: z
      .string()
      .optional()
      .describe(
        "Duration in format HH:MM:SS or seconds. Alternative to end_time"
      ),
  },
  async ({ input_path, output_path, start_time, end_time, duration }) => {
    try {
      const fs = await import("fs");
      const path = await import("path");

      // Check if input file exists
      if (!fs.existsSync(input_path)) {
        throw new Error(`Input audio file not found: ${input_path}`);
      }

      // Create output directory if it doesn't exist
      const outputDir = path.dirname(output_path);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      return new Promise((resolve, reject) => {
        let command = ffmpeg(input_path).seekInput(start_time);

        if (duration) {
          command = command.duration(duration);
        } else if (end_time) {
          command = command.seekInput(start_time).duration(end_time);
        }

        command
          .output(output_path)
          .on("error", (err) => {
            reject(new Error(`Failed to trim audio: ${err.message}`));
          })
          .on("end", () => {
            resolve({
              content: [
                {
                  type: "text",
                  text: `Successfully trimmed audio and saved to: ${output_path}`,
                },
              ],
            });
          })
          .run();
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        content: [
          {
            type: "text",
            text: `Error trimming audio: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Tool: Adjust audio volume
server.tool(
  "adjust-audio-volume",
  "Adjust the volume of an audio file",
  {
    input_path: z.string().describe("Path to the input audio file"),
    output_path: z.string().describe("Path for the output audio file"),
    volume: z
      .number()
      .describe("Volume multiplier (e.g., 0.5 for 50%, 2.0 for 200%)"),
  },
  async ({ input_path, output_path, volume }) => {
    try {
      const fs = await import("fs");
      const path = await import("path");

      // Check if input file exists
      if (!fs.existsSync(input_path)) {
        throw new Error(`Input audio file not found: ${input_path}`);
      }

      // Create output directory if it doesn't exist
      const outputDir = path.dirname(output_path);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      return new Promise((resolve, reject) => {
        ffmpeg(input_path)
          .audioFilters(`volume=${volume}`)
          .output(output_path)
          .on("error", (err) => {
            reject(new Error(`Failed to adjust volume: ${err.message}`));
          })
          .on("end", () => {
            resolve({
              content: [
                {
                  type: "text",
                  text: `Successfully adjusted volume to ${volume}x and saved to: ${output_path}`,
                },
              ],
            });
          })
          .run();
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        content: [
          {
            type: "text",
            text: `Error adjusting volume: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Tool: Convert audio format
server.tool(
  "convert-audio-format",
  "Convert audio file to a different format",
  {
    input_path: z.string().describe("Path to the input audio file"),
    output_path: z.string().describe("Path for the output audio file"),
    format: z
      .string()
      .describe("Output format (e.g., 'mp3', 'wav', 'flac', 'ogg')"),
    bitrate: z
      .string()
      .optional()
      .describe("Output bitrate (e.g., '128k', '256k', '320k')"),
    sample_rate: z
      .number()
      .optional()
      .describe("Output sample rate (e.g., 44100, 48000)"),
  },
  async ({ input_path, output_path, format, bitrate, sample_rate }) => {
    try {
      const fs = await import("fs");
      const path = await import("path");

      // Check if input file exists
      if (!fs.existsSync(input_path)) {
        throw new Error(`Input audio file not found: ${input_path}`);
      }

      // Create output directory if it doesn't exist
      const outputDir = path.dirname(output_path);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      return new Promise((resolve, reject) => {
        let command = ffmpeg(input_path).format(format);

        if (bitrate) {
          command = command.audioBitrate(bitrate);
        }

        if (sample_rate) {
          command = command.audioFrequency(sample_rate);
        }

        command
          .output(output_path)
          .on("error", (err) => {
            reject(new Error(`Failed to convert audio format: ${err.message}`));
          })
          .on("end", () => {
            resolve({
              content: [
                {
                  type: "text",
                  text: `Successfully converted audio to ${format} format and saved to: ${output_path}`,
                },
              ],
            });
          })
          .run();
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        content: [
          {
            type: "text",
            text: `Error converting audio format: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Tool: Concatenate audio files
server.tool(
  "concatenate-audio",
  "Concatenate multiple audio files into one",
  {
    input_paths: z
      .array(z.string())
      .describe("Array of paths to input audio files"),
    output_path: z
      .string()
      .describe("Path for the output concatenated audio file"),
  },
  async ({ input_paths, output_path }) => {
    try {
      const fs = await import("fs");
      const path = await import("path");

      // Check if all input files exist
      for (const inputPath of input_paths) {
        if (!fs.existsSync(inputPath)) {
          throw new Error(`Input audio file not found: ${inputPath}`);
        }
      }

      // Create output directory if it doesn't exist
      const outputDir = path.dirname(output_path);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      return new Promise((resolve, reject) => {
        let command = ffmpeg();

        // Add all input files
        input_paths.forEach((inputPath) => {
          command = command.input(inputPath);
        });

        command
          .on("error", (err) => {
            reject(
              new Error(`Failed to concatenate audio files: ${err.message}`)
            );
          })
          .on("end", () => {
            resolve({
              content: [
                {
                  type: "text",
                  text: `Successfully concatenated ${input_paths.length} audio files and saved to: ${output_path}`,
                },
              ],
            });
          })
          .mergeToFile(output_path, path.dirname(output_path));
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        content: [
          {
            type: "text",
            text: `Error concatenating audio files: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Tool: Split audio file
server.tool(
  "split-audio",
  "Split audio file into segments of specified duration",
  {
    input_path: z.string().describe("Path to the input audio file"),
    output_directory: z
      .string()
      .describe("Directory to save the split audio segments"),
    segment_duration: z
      .string()
      .describe(
        "Duration of each segment in format HH:MM:SS or seconds (e.g., '00:01:00' or '60')"
      ),
    output_prefix: z
      .string()
      .optional()
      .describe("Prefix for output filenames (defaults to 'segment')"),
  },
  async ({
    input_path,
    output_directory,
    segment_duration,
    output_prefix = "segment",
  }) => {
    try {
      const fs = await import("fs");
      const path = await import("path");

      // Check if input file exists
      if (!fs.existsSync(input_path)) {
        throw new Error(`Input audio file not found: ${input_path}`);
      }

      // Create output directory if it doesn't exist
      if (!fs.existsSync(output_directory)) {
        fs.mkdirSync(output_directory, { recursive: true });
      }

      return new Promise((resolve, reject) => {
        const outputPattern = path.join(
          output_directory,
          `${output_prefix}_%03d.wav`
        );

        ffmpeg(input_path)
          .outputOptions([
            `-f`,
            `segment`,
            `-segment_time`,
            segment_duration,
            `-c`,
            `copy`,
          ])
          .output(outputPattern)
          .on("error", (err) => {
            reject(new Error(`Failed to split audio: ${err.message}`));
          })
          .on("end", () => {
            // Count the number of segments created
            const files = fs
              .readdirSync(output_directory)
              .filter(
                (file) =>
                  file.startsWith(output_prefix) && file.endsWith(".wav")
              );

            resolve({
              content: [
                {
                  type: "text",
                  text: `Successfully split audio into ${files.length} segments in directory: ${output_directory}`,
                },
              ],
            });
          })
          .run();
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return {
        content: [
          {
            type: "text",
            text: `Error splitting audio: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

// Start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Speech TTS Server running...");
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main().catch(console.error);
