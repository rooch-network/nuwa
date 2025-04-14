import { ToolSchema, ToolRegistry } from 'nuwa-script';
import { buildPrompt } from 'nuwa-script';

export interface AIServiceOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class AIService {
  private options: AIServiceOptions;

  constructor(options: AIServiceOptions) {
    this.options = {
      model: 'gpt-4',
      maxTokens: 1000,
      ...options,
    };
  }

  async generateNuwaScript(prompt: string, toolRegistry: ToolRegistry): Promise<string> {
    if (!this.options.apiKey) {
      throw new Error('API key is required');
    }

    try {
      const fullPrompt = buildPrompt(toolRegistry, prompt);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: [
            { role: "system", content: "You are an AI assistant generating NuwaScript code based on the provided tools and user request." },
            { role: "user", content: fullPrompt }
          ],
          max_tokens: this.options.maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content returned from API');
      }

      const codeBlockRegex = /```(?:nuwa|nuwascript)?\n([\s\S]+?)```/;
      const match = content.match(codeBlockRegex);
      return match ? match[1].trim() : content.trim();
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }

  async explainNuwaScript(code: string): Promise<string> {
    if (!this.options.apiKey) {
      throw new Error('API key is required');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that explains NuwaScript code. Provide clear, concise explanations of what the code does.'
            },
            { 
              role: 'user', 
              content: `Explain the following NuwaScript code:\n\n${code}` 
            }
          ],
          max_tokens: this.options.maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content returned from API');
      }

      return content.trim();
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }
}