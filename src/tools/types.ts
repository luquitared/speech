export interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  [key: string]: unknown;
}

export interface TTSModelConfig {
  id: string;
  name: string;
  provider: string;
  description: string;
  cost: string;
  speed: string;
  quality: string;
  capabilities: string[];
  parameters: Record<string, any>;
  outputFormat: string;
  maxLength: string;
  languages: string[];
}

export interface TTSModelsInfo {
  [key: string]: TTSModelConfig;
}