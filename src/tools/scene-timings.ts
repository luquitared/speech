import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ToolResponse } from "./types.js";

export function registerSceneTimingsTool(server: McpServer) {
  server.tool(
    "get-scene-timings",
    "Calculate durations between word pairs from a word transcript JSON file. Takes word index pairs and returns the duration for each scene. Scene ends at the START of the end word (not after it completes).",
    {
      transcript_path: z.string().describe("Path to the word transcript JSON file"),
      word_pairs: z
        .array(
          z.object({
            start_index: z.number().describe("Starting word index (inclusive)"),
            end_index: z.number().describe("Ending word index (inclusive)"),
          })
        )
        .describe("Array of word index pairs defining scenes"),
    },
    async ({ transcript_path, word_pairs }): Promise<ToolResponse> => {
      try {
        const fs = await import("fs");
        const path = await import("path");

        // Check if file exists
        if (!fs.existsSync(transcript_path)) {
          throw new Error(`Transcript file not found: ${transcript_path}`);
        }

        // Read and parse the transcript file
        const transcriptContent = fs.readFileSync(transcript_path, "utf-8");
        const transcriptData = JSON.parse(transcriptContent);

        // Validate transcript structure
        if (!transcriptData.word_timestamps || typeof transcriptData.word_timestamps !== 'object') {
          throw new Error("Invalid transcript format: missing or invalid word_timestamps");
        }
        if (typeof transcriptData.total_duration !== 'number') {
          throw new Error("Invalid transcript format: missing or invalid total_duration");
        }

        const wordTimestamps = transcriptData.word_timestamps;
        const totalDuration = transcriptData.total_duration;

        // Calculate scene durations
        const sceneDurations: Array<{
          scene_index: number;
          start_word_index: number;
          end_word_index: number;
          start_word: string;
          end_word: string;
          start_time: number;
          end_time: number;
          duration: number;
        }> = [];

        for (let i = 0; i < word_pairs.length; i++) {
          const pair = word_pairs[i];
          
          // Validate word indices
          if (!(pair.start_index in wordTimestamps)) {
            throw new Error(`Start index ${pair.start_index} not found in word timestamps`);
          }
          if (!(pair.end_index in wordTimestamps)) {
            throw new Error(`End index ${pair.end_index} not found in word timestamps`);
          }
          if (pair.start_index > pair.end_index) {
            throw new Error(`Invalid pair: start index ${pair.start_index} is greater than end index ${pair.end_index}`);
          }

          const startWord = wordTimestamps[pair.start_index];
          const endWord = wordTimestamps[pair.end_index];
          
          sceneDurations.push({
            scene_index: i,
            start_word_index: pair.start_index,
            end_word_index: pair.end_index,
            start_word: startWord.word,
            end_word: endWord.word,
            start_time: startWord.start_time,
            end_time: endWord.start_time,
            duration: endWord.start_time - startWord.start_time,
          });
        }

        // Validate that all durations add up correctly
        let calculatedTotal = 0;
        const gaps: Array<{ between_scenes: string; gap_duration: number }> = [];
        
        // Check for gaps between scenes
        for (let i = 0; i < sceneDurations.length - 1; i++) {
          const currentScene = sceneDurations[i];
          const nextScene = sceneDurations[i + 1];
          
          if (nextScene.start_time > currentScene.end_time) {
            const gapDuration = nextScene.start_time - currentScene.end_time;
            gaps.push({
              between_scenes: `${i} and ${i + 1}`,
              gap_duration: gapDuration,
            });
          }
        }

        // Calculate total duration coverage
        if (sceneDurations.length > 0) {
          const firstScene = sceneDurations[0];
          const lastScene = sceneDurations[sceneDurations.length - 1];
          calculatedTotal = lastScene.end_time - firstScene.start_time;
        }

        const response = {
          transcript_file: path.basename(transcript_path),
          total_audio_duration: totalDuration,
          scene_durations: sceneDurations,
          coverage: {
            first_word_time: sceneDurations.length > 0 ? sceneDurations[0].start_time : 0,
            last_word_time: sceneDurations.length > 0 ? sceneDurations[sceneDurations.length - 1].end_time : 0,
            total_coverage_duration: calculatedTotal,
            coverage_percentage: totalDuration > 0 ? (calculatedTotal / totalDuration) * 100 : 0,
          },
          gaps: gaps,
          validation: {
            has_gaps: gaps.length > 0,
            total_gap_duration: gaps.reduce((sum, gap) => sum + gap.gap_duration, 0),
          },
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
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
              text: `Error calculating scene timings: ${errorMessage}`,
            },
          ],
        };
      }
    }
  );
}