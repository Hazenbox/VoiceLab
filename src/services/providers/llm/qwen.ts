/**
 * Qwen (Alibaba) LLM Provider
 * Production-ready implementation with error handling and usage tracking
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

export interface QwenConfig {
  apiKey: string;
  model: string;
  proxyUrl: string;
}

export class QwenTextProvider implements LLMProvider {
  readonly name = 'qwen-text';
  readonly displayName = 'Alibaba Qwen';
  readonly supportsStreaming = false; // Via proxy doesn't support streaming
  readonly maxTokens = 128000;
  readonly costPer1kTokens = 0.001;

  private config: QwenConfig;

  constructor(config: QwenConfig) {
    this.config = config;
  }

  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    const startTime = Date.now();

    try {
      // Use proxy for API calls (avoids CORS)
      const response = await fetch(`${this.config.proxyUrl}/api/llm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: options.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          maxTokens: options.maxTokens || 1000,
          temperature: options.temperature ?? 0.7,
        }),
        signal: options.signal,
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;

      // Parse DashScope response format
      const outputText = data.output?.text || 
                        data.output?.choices?.[0]?.message?.content || 
                        '';
      
      const inputTokens = data.usage?.input_tokens || 0;
      const outputTokens = data.usage?.output_tokens || 0;

      const usage: LLMUsageMetrics = {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
        estimatedCost: this.calculateCost(inputTokens, outputTokens),
        latencyMs: latency,
        model: this.config.model,
        provider: this.name,
        timestamp: Date.now(),
      };

      return {
        content: outputText,
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
    // Qwen via proxy doesn't support streaming, fall back to regular generate
    const result = await this.generate(options);
    onChunk(result.content);
    onUsage?.(result.usage);
    return result.content;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.proxyUrl}/health`);
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
    let errorData: { error?: string; message?: string; code?: string };
    
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { message: text };
    }

    const code = this.mapErrorCode(response.status);

    return createLLMError(
      errorData.message || errorData.error || text,
      code,
      this.name,
      this.isRetryable(response.status),
      {
        statusCode: response.status,
      }
    );
  }

  private mapErrorCode(status: number): string {
    if (status === 429) return ERROR_CODES.RATE_LIMIT;
    if (status === 401) return ERROR_CODES.INVALID_API_KEY;
    if (status === 403) return ERROR_CODES.PERMISSION_DENIED;
    if (status === 400) return ERROR_CODES.INVALID_REQUEST;
    if (status >= 500) return ERROR_CODES.SERVER_ERROR;
    return ERROR_CODES.SERVER_ERROR;
  }

  private isRetryable(status: number): boolean {
    return status === 429 || status >= 500;
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Qwen pricing estimates
    const inputCost = inputTokens * (0.001 / 1000);
    const outputCost = outputTokens * (0.002 / 1000);
    return inputCost + outputCost;
  }
}

export function createQwenTextProvider(config?: Partial<QwenConfig>): QwenTextProvider {
  const proxyHost = import.meta.env.VITE_WS_PROXY_HOST || 'localhost';
  const proxyPort = import.meta.env.VITE_WS_PROXY_PORT || '3001';
  
  return new QwenTextProvider({
    apiKey: config?.apiKey || import.meta.env.VITE_DASHSCOPE_API_KEY || '',
    model: config?.model || 'qwen-turbo',
    proxyUrl: config?.proxyUrl || `http://${proxyHost}:${proxyPort}`,
  });
}
