import { ToolRegistry } from 'nuwa-script';
import { buildPrompt } from 'nuwa-script';

export interface AIServiceOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  appSpecificGuidance?: string;
  baseUrl?: string;
}

export class AIService {
  private options: AIServiceOptions;

  constructor(options: AIServiceOptions) {
    this.options = {
      model: options.model || 'gpt-4o',
      maxTokens: 4000,
      temperature: 0.3,
      baseUrl: options.baseUrl || 'https://api.openai.com',
      ...options,
    };
    if (this.options.baseUrl!.endsWith('/')) {
      this.options.baseUrl = this.options.baseUrl!.slice(0, -1);
    }
  }

  async generateNuwaScript(prompt: string, toolRegistry: ToolRegistry): Promise<string> {
    if (!this.options.apiKey) {
      throw new Error('API key is required');
    }

    let fullUrl: string;
    const normalizedBaseUrl = this.options.baseUrl!;
    if (normalizedBaseUrl.endsWith('/v1')) {
      fullUrl = `${normalizedBaseUrl}/chat/completions`;
    } else {
      fullUrl = `${normalizedBaseUrl}/v1/chat/completions`;
    }

    console.log(`Constructed API URL: ${fullUrl}`);

    try {
      const final_prompt = buildPrompt(toolRegistry, prompt, { appSpecificGuidance: this.options.appSpecificGuidance });
      console.log(`Final prompt: ${final_prompt}`);
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: [
            { role: "system", content: final_prompt},
          ],
          max_tokens: this.options.maxTokens,
          temperature: this.options.temperature,
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
      console.error('Error calling API:', error);
      throw error;
    }
  }

  async explainNuwaScript(code: string): Promise<string> {
    if (!this.options.apiKey) {
      throw new Error('API key is required');
    }

    let fullUrl: string;
    const normalizedBaseUrl = this.options.baseUrl!;
    if (normalizedBaseUrl.endsWith('/v1')) {
      fullUrl = `${normalizedBaseUrl}/chat/completions`;
    } else {
      fullUrl = `${normalizedBaseUrl}/v1/chat/completions`;
    }

    console.log(`Constructed API URL for explanation: ${fullUrl}`);

    try {
      const response = await fetch(fullUrl, {
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
              content: `Explain the following NuwaScript code:

${code}`
            }
          ],
          max_tokens: this.options.maxTokens,
          temperature: this.options.temperature,
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
      console.error('Error calling API:', error);
      throw error;
    }
  }
}