import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import ffmpeg from "fluent-ffmpeg";
import { z } from "zod";
import { ToolResponse } from "./types.js";

export function registerAudioProcessingTools(server: McpServer) {
  // Tool: Trim audio
  server.tool(
    "trim-audio",
    "Trim audio file to specified start and end times",
    {
      input_path: z.string().describe("Path to the input audio file"),
      output_path: z.string().describe("Path for the output trimmed audio file"),
      start_time: z
        .string()
        .describe("Start time in format HH:MM:SS or seconds (e.g., '00:00:30' or '30')"),
      end_time: z
        .string()
        .optional()
        .describe("End time in format HH:MM:SS or seconds. If not provided, trims to end of file"),
      duration: z
        .string()
        .optional()
        .describe("Duration in format HH:MM:SS or seconds. Alternative to end_time"),
    },
    async ({ input_path, output_path, start_time, end_time, duration }): Promise<ToolResponse> => {
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
    async ({ input_path, output_path, volume }): Promise<ToolResponse> => {
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
    async ({ input_path, output_path, format, bitrate, sample_rate }): Promise<ToolResponse> => {
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
}