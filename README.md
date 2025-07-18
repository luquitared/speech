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

Install the server to different MCP clients:

```bash
# For Claude Desktop
pnpm run install-desktop

# For Cursor
pnpm run install-cursor

# For Claude Code
pnpm run install-code

# For all MCP clients
pnpm run install-server
```

These scripts will build the project and automatically update the appropriate configuration files.

## Usage with Claude Desktop

The installation script will automatically add the configuration, but you can also manually add it to your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "speech-tts": {
      "command": "node",
      "args": ["/path/to/your/dist/index.js"],
      "env": {
        "REPLICATE_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

Then restart Claude Desktop to connect to the server.

## Available Tools

### Text-to-Speech
- **text-to-speech**: Generate speech from text using Chatterbox, Chatterbox Pro, or Minimax models
- Supports voice selection, emotion control, and audio quality settings
- Automatically saves generated audio to the `audio/` directory

### Audio Processing
- **get-audio-metadata**: Extract comprehensive metadata from audio files
- **trim-audio**: Trim audio files to specified start/end times or duration
- **adjust-audio-volume**: Adjust audio volume with multiplier controls
- **convert-audio-format**: Convert between different audio formats (mp3, wav, flac, ogg)
- **concatenate-audio**: Combine multiple audio files into one
- **split-audio**: Split audio files into segments of specified duration

### Usage Examples

```bash
# Generate speech using Chatterbox model
text-to-speech "Hello world!" --model chatterbox --voice Luna

# Extract audio metadata
get-audio-metadata audio/speech.wav

# Trim audio from 30 seconds to 2 minutes
trim-audio audio/input.wav audio/output.wav --start_time 30 --duration 90

# Convert audio format
convert-audio-format audio/input.wav audio/output.mp3 --format mp3 --bitrate 192k
```

## Project Structure

```
├── src/
│   └── index.ts          # Main server implementation with all tools
├── scripts/              # Installation and utility scripts
├── dist/                 # Compiled JavaScript (generated)
├── audio/                # Generated audio files (created automatically)
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript configuration
├── .env.local            # Environment variables (create from .env.example)
└── README.md            # This file
```

## Development

1. Make changes to `src/index.ts`
2. Run `pnpm run build` to compile
3. Test your server with `pnpm start`
4. Use the installation scripts to update your MCP client configuration

## TTS Models

### Chatterbox
- **Voices**: Luna, Ember, Hem, Aurora, Cliff, Josh, William, Orion, Ken
- **Parameters**: temperature, cfg_weight, exaggeration, audio_prompt
- **Use case**: General-purpose TTS with voice cloning support

### Chatterbox Pro  
- **Voices**: Luna and custom voice UUIDs
- **Parameters**: pitch, temperature, exaggeration, custom_voice
- **Use case**: Professional-grade TTS with custom voices

### Minimax
- **Voices**: Deep_Voice_Man, Wise_Woman, and others
- **Parameters**: speed, volume, emotion, sample_rate, bitrate
- **Use case**: Multilingual TTS with emotion control

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `replicate` - AI model inference platform
- `fluent-ffmpeg` - Audio processing and manipulation
- `axios` - HTTP client for API calls
- `zod` - Runtime type validation

## License

MIT
