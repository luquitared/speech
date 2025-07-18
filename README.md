# MCP Speech TTS Server

A comprehensive MCP (Model Context Protocol) server that provides text-to-speech generation and audio processing capabilities. This server integrates with Replicate's TTS models and FFmpeg for complete audio workflows.

## Purpose

This MCP server enables AI assistants to:

- Generate speech from text using multiple TTS models
- Process and manipulate audio files
- Extract audio metadata and information
- Convert between different audio formats
- Perform advanced audio editing operations

## Features

- **Text-to-Speech**: Generate speech using Chatterbox, Chatterbox Pro, and Minimax models
- **Audio Processing**: Trim, volume adjustment, format conversion, and concatenation
- **Audio Analysis**: Extract comprehensive metadata from audio files
- **Multi-Model Support**: Choose from different TTS models with specific parameters
- **Audio Editing**: Split audio files into segments with customizable durations
- **TypeScript Support**: Full type definitions and Zod schema validation
- **Easy Installation**: Scripts for different MCP clients

## How It Works

This MCP server provides:

1. **TTS Generation**: Converts text to speech using Replicate's AI models
2. **Audio Processing**: Comprehensive audio manipulation using FFmpeg
3. **File Management**: Automatic audio directory creation and file handling
4. **Multi-Model Support**: Configurable parameters for different TTS models
5. **Error Handling**: Robust error handling with detailed feedback

The server includes 7 main tools for complete audio workflows from text input to final processed audio files.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- FFmpeg installed on your system
- Replicate API token (sign up at [replicate.com](https://replicate.com))

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd mcp-speech-server

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your REPLICATE_API_TOKEN

# Build the project
pnpm run build

# Start the server
pnpm start
```

## Installation Scripts

This boilerplate includes convenient installation scripts for different MCP clients:

```bash
# For Claude Desktop
pnpm run install-desktop

# For Cursor
pnpm run install-cursor

# For Claude Code
pnpm run install-code

# Generic installation
pnpm run install-server
```

These scripts will build the project and automatically update the appropriate configuration files.

## Usage with Claude Desktop

The installation script will automatically add the configuration, but you can also manually add it to your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "your-server-name": {
      "command": "node",
      "args": ["/path/to/your/dist/index.js"]
    }
  }
}
```

Then restart Claude Desktop to connect to the server.

## Customizing Your Server

### Adding Tools

Tools are functions that the AI assistant can call. Here's the basic structure:

```typescript
server.tool(
  "tool-name",
  "Description of what the tool does",
  {
    // Zod schema for parameters
    param1: z.string().describe("Description of parameter"),
    param2: z.number().optional().describe("Optional parameter"),
  },
  async ({ param1, param2 }) => {
    // Your tool logic here
    return {
      content: [
        {
          type: "text",
          text: "Your response",
        },
      ],
    };
  }
);
```

### Adding Resources

Resources provide dynamic content that the AI can access:

```typescript
server.resource(
  "resource://example/{id}",
  "Description of the resource",
  async (uri) => {
    // Extract parameters from URI
    const id = uri.path.split("/").pop();

    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: `Content for ${id}`,
        },
      ],
    };
  }
);
```

### Adding Prompts

Prompts are reusable templates:

```typescript
server.prompt(
  "prompt-name",
  "Description of the prompt",
  {
    // Parameters for the prompt
    topic: z.string().describe("The topic to discuss"),
  },
  async ({ topic }) => {
    return {
      description: `A prompt about ${topic}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please help me with ${topic}`,
          },
        },
      ],
    };
  }
);
```

## Project Structure

```
├── src/
│   └── index.ts          # Main server implementation
├── scripts/              # Installation and utility scripts
├── dist/                 # Compiled JavaScript (generated)
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Development

1. Make changes to `src/index.ts`
2. Run `pnpm run build` to compile
3. Test your server with `pnpm start`
4. Use the installation scripts to update your MCP client configuration

## Next Steps

1. Update `package.json` with your project details
2. Customize the server name and tools in `src/index.ts`
3. Add your own tools, resources, and prompts
4. Integrate with external APIs or databases as needed

## License

MIT
