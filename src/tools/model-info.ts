import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolResponse, TTSModelsInfo } from "./types.js";

export function registerModelInfoTool(server: McpServer) {
  server.tool(
    "get-models",
    "Get comprehensive information about available TTS models including parameters, capabilities, and characteristics",
    {},
    async (): Promise<ToolResponse> => {
      try {
        const modelsInfo: TTSModelsInfo = {
          chatterbox: {
            id: "resemble-ai/chatterbox",
            name: "Chatterbox",
            provider: "Resemble AI",
            description: "High-quality conversational TTS model with voice cloning capabilities",
            cost: "Medium",
            speed: "Medium",
            quality: "High",
            capabilities: [
              "Voice cloning with audio prompt",
              "Emotional control",
              "Seed-based reproducibility",
              "Temperature control for variation"
            ],
            parameters: {
              prompt: { type: "string", required: true, description: "Text to convert to speech" },
              seed: { type: "number", default: 0, range: "0-∞", description: "Random seed for reproducible results" },
              temperature: { type: "number", default: 0.8, range: "0.05-5.0", description: "Speech variation control" },
              cfg_weight: { type: "number", default: 0.5, range: "0.2-1.0", description: "Pace/control weight" },
              exaggeration: { type: "number", default: 0.5, range: "0.25-2.0", description: "Emotion intensity" },
              audio_prompt: { type: "string", optional: true, description: "Reference audio URL for voice cloning" }
            },
            outputFormat: "WAV",
            maxLength: "Long texts supported",
            languages: ["English (primary)", "Multi-language support"]
          },
          "chatterbox-pro": {
            id: "resemble-ai/chatterbox-pro",
            name: "Chatterbox Pro",
            provider: "Resemble AI",
            description: "Professional-grade TTS with advanced voice control and custom voice support",
            cost: "High",
            speed: "Medium-Fast",
            quality: "Very High",
            capabilities: [
              "Custom voice UUID support",
              "Advanced pitch control",
              "Professional voice library",
              "Enhanced emotional control",
              "Premium voice quality"
            ],
            parameters: {
              prompt: { type: "string", required: true, description: "Text to convert to speech" },
              voice: { type: "string", default: "Luna", options: ["Luna", "Ember", "Hem", "Aurora", "Cliff", "Josh", "William", "Orion", "Ken"], description: "Voice selection" },
              pitch: { type: "string", default: "medium", options: ["x-low", "low", "medium", "high", "x-high"], description: "Voice pitch control" },
              temperature: { type: "number", default: 0.8, range: "0.1-5.0", description: "Speech variation control" },
              exaggeration: { type: "number", default: 0.5, range: "0.1-1.0", description: "Emotion intensity" },
              custom_voice: { type: "string", optional: true, description: "Custom voice UUID" },
              seed: { type: "number", optional: true, description: "Random seed for reproducible results" }
            },
            outputFormat: "WAV",
            maxLength: "Long texts supported",
            languages: ["English (primary)", "Multi-language support"]
          },
          minimax: {
            id: "minimax/speech-02-turbo",
            name: "Minimax Speech 02 Turbo",
            provider: "Minimax",
            description: "Fast, high-quality TTS with extensive voice options and audio format controls",
            cost: "Low-Medium",
            speed: "Very Fast",
            quality: "High",
            capabilities: [
              "Wide variety of voice IDs",
              "Comprehensive audio format control",
              "Emotion control",
              "Speed and volume adjustment",
              "Language boost features",
              "English normalization"
            ],
            parameters: {
              text: { type: "string", required: true, description: "Text to convert to speech" },
              voice_id: { type: "string", default: "Deep_Voice_Man", examples: ["Deep_Voice_Man", "Wise_Woman", "Young_Girl", "Old_Man"], description: "Voice ID selection" },
              speed: { type: "number", default: 1.0, range: "0.5-2.0", description: "Speech speed control" },
              volume: { type: "number", default: 1, range: "0-10", description: "Volume control" },
              emotion: { type: "string", default: "auto", options: ["auto", "neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised"], description: "Emotion control" },
              sample_rate: { type: "number", default: 32000, range: "8000-44100", description: "Audio sample rate" },
              bitrate: { type: "number", default: 128000, range: "32000-256000", description: "Audio bitrate" },
              channel: { type: "string", default: "mono", options: ["mono", "stereo"], description: "Audio channel configuration" },
              language_boost: { type: "string", optional: true, description: "Language enhancement features" },
              english_normalization: { type: "boolean", optional: true, description: "Enable English text normalization" }
            },
            outputFormat: "WAV (configurable)",
            maxLength: "Long texts supported",
            languages: ["English", "Chinese", "Multi-language support"]
          }
        };

        const summary = `## Available TTS Models\n\n` +
          Object.entries(modelsInfo).map(([key, model]) => {
            const paramCount = Object.keys(model.parameters).length;
            const capabilities = model.capabilities.join(", ");
            
            return `### ${model.name} (${key})
**Provider:** ${model.provider}
**Description:** ${model.description}
**Cost:** ${model.cost} | **Speed:** ${model.speed} | **Quality:** ${model.quality}
**Parameters:** ${paramCount} configurable options
**Key Capabilities:** ${capabilities}
**Output:** ${model.outputFormat}
**Languages:** ${model.languages.join(", ")}

`;
          }).join("");

        const detailedInfo = `## Detailed Parameter Information\n\n` +
          Object.entries(modelsInfo).map(([, model]) => {
            const params = Object.entries(model.parameters).map(([paramName, param]) => {
              let paramInfo = `  - **${paramName}**: ${param.description}`;
              if (param.type) paramInfo += ` (${param.type})`;
              if ('required' in param && param.required) paramInfo += ` *[Required]*`;
              if ('default' in param && param.default !== undefined) paramInfo += ` *[Default: ${param.default}]*`;
              if ('range' in param && param.range) paramInfo += ` *[Range: ${param.range}]*`;
              if ('options' in param && param.options) paramInfo += ` *[Options: ${param.options.join(", ")}]*`;
              if ('examples' in param && param.examples) paramInfo += ` *[Examples: ${param.examples.join(", ")}]*`;
              return paramInfo;
            }).join("\n");

            return `### ${model.name} Parameters\n${params}\n`;
          }).join("\n");

        const usageGuidelines = `## Usage Guidelines

### Cost Optimization
- **Low cost**: Use Minimax for bulk processing and fast turnaround
- **Medium cost**: Use Chatterbox for balanced quality and cost
- **High cost**: Use Chatterbox Pro for premium applications

### Quality Requirements
- **Highest quality**: Chatterbox Pro with custom voices
- **High quality**: Chatterbox or Minimax
- **Fast processing**: Minimax with default settings

### Voice Customization
- **Voice cloning**: Use Chatterbox with audio_prompt
- **Professional voices**: Use Chatterbox Pro with built-in voices
- **Quick variety**: Use Minimax with different voice_ids

### Parameter Recommendations
- Start with default parameters for initial testing
- Adjust temperature/exaggeration for emotional control
- Use seed parameter for reproducible results
- Configure audio format parameters (sample_rate, bitrate) based on output requirements`;

        return {
          content: [
            {
              type: "text",
              text: summary + detailedInfo + usageGuidelines,
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
              text: `Error retrieving model information: ${errorMessage}`,
            },
          ],
        };
      }
    }
  );
}