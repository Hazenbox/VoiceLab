/**
 * OpenAI LLM Provider
 * Production-ready implementation with error handling, streaming, and usage tracking
 */

import {
  type LLMProvider,
  type LLMGenerateOptions,
  type LLMGenerateResult,
  type LLMUsageMetrics,
  type LLMError,
  ERROR_CODES,
  createLLMError,
} from './types';

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly displayName = 'OpenAI (ChatGPT)';
  readonly supportsStreaming = true;
  readonly maxTokens = 128000; // GPT-4o context window
  readonly costPer1kTokens = 0.0025; // GPT-4o-mini pricing

  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
  }

  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: options.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature ?? 0.7,
          top_p: options.topP,
          stop: options.stopSequences,
        }),
        signal: options.signal,
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;

      const usage: LLMUsageMetrics = {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
        estimatedCost: this.calculateCost(data.usage),
        latencyMs: latency,
        model: this.config.model,
        provider: this.name,
        timestamp: Date.now(),
      };

      return {
        content: data.choices[0]?.message?.content || '',
        usage,
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw createLLMError(
          'Request cancelled',
          ERROR_CODES.TIMEOUT,
          this.name,
          false
        );
      }
      throw error;
    }
  }

  async generateStream(
    options: LLMGenerateOptions,
    onChunk: (text: string) => void,
    onUsage?: (usage: LLMUsageMetrics) => void
  ): Promise<string> {
    const startTime = Date.now();
    let fullText = '';
    let totalTokens = 0;

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: options.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature ?? 0.7,
          stream: true,
        }),
        signal: options.signal,
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content;
                if (content) {
                  fullText += content;
                  totalTokens++;
                  onChunk(content);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      const latency = Date.now() - startTime;
      const usage: LLMUsageMetrics = {
        promptTokens: 0,
        completionTokens: totalTokens,
        totalTokens: totalTokens,
        estimatedCost: (totalTokens / 1000) * this.costPer1kTokens,
        latencyMs: latency,
        model: this.config.model,
        provider: this.name,
        timestamp: Date.now(),
      };

      onUsage?.(usage);
      return fullText;

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw createLLMError(
          'Stream cancelled',
          ERROR_CODES.TIMEOUT,
          this.name,
          false
        );
      }
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  isReady(): boolean {
    return this.config.apiKey.length > 0;
  }

  disconnect(): void {
    // No cleanup needed
  }

  private async handleError(response: Response): Promise<LLMError> {
    const text = await response.text();
    let errorData: { error?: { message?: string; type?: string } };
    
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { error: { message: text } };
    }

    const code = this.mapErrorCode(response.status, errorData.error?.type);
    const retryAfter = response.headers.get('retry-after');

    return createLLMError(
      errorData.error?.message || text,
      code,
      this.name,
      this.isRetryable(response.status),
      {
        statusCode: response.status,
        type: errorData.error?.type,
        retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
      }
    );
  }

  private mapErrorCode(status: number, type?: string): string {
    if (status === 429) return ERROR_CODES.RATE_LIMIT;
    if (status === 401) return ERROR_CODES.INVALID_API_KEY;
    if (status === 403) return ERROR_CODES.PERMISSION_DENIED;
    if (status === 400) {
      if (type === 'invalid_request_error') return ERROR_CODES.INVALID_REQUEST;
      if (type?.includes('context_length')) return ERROR_CODES.CONTEXT_LENGTH_EXCEEDED;
    }
    if (status >= 500) return ERROR_CODES.SERVER_ERROR;
    return ERROR_CODES.SERVER_ERROR;
  }

  private isRetryable(status: number): boolean {
    return status === 429 || status >= 500;
  }

  private calculateCost(usage?: { prompt_tokens?: number; completion_tokens?: number }): number {
    if (!usage) return 0;
    // GPT-4o-mini: $0.15/1M input, $0.6/1M output
    const inputCost = (usage.prompt_tokens || 0) * (0.15 / 1000000);
    const outputCost = (usage.completion_tokens || 0) * (0.6 / 1000000);
    return inputCost + outputCost;
  }
}

export function createOpenAIProvider(config?: Partial<OpenAIConfig>): OpenAIProvider {
  return new OpenAIProvider({
    apiKey: config?.apiKey || import.meta.env.VITE_OPENAI_API_KEY || '',
    model: config?.model || import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
    baseUrl: config?.baseUrl || import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  });
}
