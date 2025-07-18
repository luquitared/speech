import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import ffmpeg from "fluent-ffmpeg";
import { z } from "zod";
import { ToolResponse } from "./types.js";

export function registerAudioMetadataTool(server: McpServer) {
  server.tool(
    "get-audio-metadata",
    "Extract metadata from audio files including duration, format, bitrate, and other properties",
    {
      file_path: z.string().describe("Path to the audio file"),
    },
    async ({ file_path }): Promise<ToolResponse> => {
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
}