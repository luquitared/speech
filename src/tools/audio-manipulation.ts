import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import ffmpeg from "fluent-ffmpeg";
import { z } from "zod";
import { ToolResponse } from "./types.js";

export function registerAudioManipulationTools(server: McpServer) {
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
    async ({ input_paths, output_path }): Promise<ToolResponse> => {
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
        .describe("Duration of each segment in format HH:MM:SS or seconds (e.g., '00:01:00' or '60')"),
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
    }): Promise<ToolResponse> => {
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
}