export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties?: Record<string, {
      type: string;
      description: string;
    }>;
    required?: string[];
  };
  returnType: string;
}

export interface ExampleConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  script: string;
  tools: ToolSchema[];
  aiPrompt?: string;
  tags?: string[];
}