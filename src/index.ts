#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Replicate from "replicate";
import { registerTextToSpeechTool } from "./tools/text-to-speech.js";
import { registerAudioMetadataTool } from "./tools/audio-metadata.js";
import { registerAudioProcessingTools } from "./tools/audio-processing.js";
import { registerAudioManipulationTools } from "./tools/audio-manipulation.js";
import { registerModelInfoTool } from "./tools/model-info.js";

// Create the MCP server
const server = new McpServer({
  name: "speech-tts",
  version: "1.0.0",
});

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Register all tools
registerTextToSpeechTool(server, replicate);
registerAudioMetadataTool(server);
registerAudioProcessingTools(server);
registerAudioManipulationTools(server);
registerModelInfoTool(server);

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
