/**
 * Claude (Anthropic) LLM Provider
 * Production-ready implementation with error handling and usage tracking
 * Routes through /api/claude serverless function in production for security
 */

import {
  type LLMProvider,
  type LLMGenerateOptions,
  type LLMGenerateResult,
  type LLMUsageMetrics,
  type LLMError,
  type ErrorCode,
  ERROR_CODES,
  createLLMError,
} from './types';
import { getApiBaseUrl, getInternalApiKey, isProduction } from '../../../config/providers';

export interface ClaudeConfig {
  apiKey: string;
  model: string;
}

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude';
  readonly displayName = 'Anthropic (Claude)';
  readonly supportsStreaming = true;
  readonly maxTokens = 200000; // Claude 3.5 context window
  readonly costPer1kTokens = 0.003; // Claude 3.5 Sonnet pricing

  private config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    this.config = config;
  }

  /**
   * Get the API endpoint URL
   * In production: use /api/claude serverless function
   * In development: use local proxy or direct API
   */
  private getApiUrl(): string {
    if (isProduction()) {
      return `${getApiBaseUrl()}/api/claude`;
    }
    // In development, use the proxy server
    const proxyBase = getApiBaseUrl();
    if (proxyBase) {
      return `${proxyBase}/api/claude`;
    }
    // Fallback to direct API (not recommended for production)
    return 'https://api.anthropic.com/v1/messages';
  }

  /**
   * Get headers for API request
   * In production: include internal API key for authentication
   * In development with proxy: include internal API key if configured
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Include internal API key for authenticated requests
    const internalApiKey = getInternalApiKey();
    if (internalApiKey) {
      headers['x-api-key'] = internalApiKey;
    }
    
    // Only include Anthropic auth headers for direct API calls (fallback only)
    const proxyBase = getApiBaseUrl();
    if (!isProduction() && !proxyBase) {
      headers['x-api-key'] = this.config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }
    
    return headers;
  }

  /**
   * Create an abort signal that combines user signal with timeout (P0-FIX)
   */
  private createTimeoutSignal(userSignal?: AbortSignal, timeoutMs: number = 30000): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error('Request timeout after 30s')), timeoutMs);
    
    // If user provides a signal, abort when it aborts
    const onUserAbort = () => controller.abort(userSignal?.reason);
    userSignal?.addEventListener('abort', onUserAbort);
    
    return {
      signal: controller.signal,
      cleanup: () => {
        clearTimeout(timeoutId);
        userSignal?.removeEventListener('abort', onUserAbort);
      }
    };
  }

  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    const startTime = Date.now();
    const { signal, cleanup } = this.createTimeoutSignal(options.signal);

    // Extract system message
    const systemMessage = options.messages.find(m => m.role === 'system');
    const conversationMessages = options.messages.filter(m => m.role !== 'system');

    try {
      const response = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          system: systemMessage?.content,
          messages: conversationMessages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature ?? 0.7,
          stop_sequences: options.stopSequences,
        }),
        signal,
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;

      const usage: LLMUsageMetrics = {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        estimatedCost: this.calculateCost(data.usage),
        latencyMs: latency,
        model: this.config.model,
        provider: this.name,
        timestamp: Date.now(),
      };

      // Claude returns content as array
      const content = data.content?.[0]?.text || '';

      return {
        content,
        usage,
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        const isTimeout = (error as Error).message?.includes('timeout');
        throw createLLMError(
          isTimeout ? 'Request timeout after 30s' : 'Request cancelled',
          ERROR_CODES.TIMEOUT,
          this.name,
          isTimeout // Timeout errors are retryable
        );
      }
      throw error;
    } finally {
      cleanup();
    }
  }

  async generateStream(
    options: LLMGenerateOptions,
    onChunk: (text: string) => void,
    onUsage?: (usage: LLMUsageMetrics) => void
  ): Promise<string> {
    const startTime = Date.now();
    let fullText = '';
    let inputTokens = 0;
    let outputTokens = 0;
    const { signal, cleanup } = this.createTimeoutSignal(options.signal, 60000); // 60s for streaming

    const systemMessage = options.messages.find(m => m.role === 'system');
    const conversationMessages = options.messages.filter(m => m.role !== 'system');

    try {
      const response = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.config.model,
          system: systemMessage?.content,
          messages: conversationMessages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature ?? 0.7,
          stream: true,
        }),
        signal,
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
              try {
                const parsed = JSON.parse(data);
                
                // Handle different event types
                if (parsed.type === 'content_block_delta') {
                  const text = parsed.delta?.text;
                  if (text) {
                    fullText += text;
                    onChunk(text);
                  }
                } else if (parsed.type === 'message_delta') {
                  outputTokens = parsed.usage?.output_tokens || outputTokens;
                } else if (parsed.type === 'message_start') {
                  inputTokens = parsed.message?.usage?.input_tokens || 0;
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
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
        estimatedCost: this.calculateCost({ input_tokens: inputTokens, output_tokens: outputTokens }),
        latencyMs: latency,
        model: this.config.model,
        provider: this.name,
        timestamp: Date.now(),
      };

      onUsage?.(usage);
      return fullText;

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        const isTimeout = (error as Error).message?.includes('timeout');
        throw createLLMError(
          isTimeout ? 'Stream timeout after 60s' : 'Stream cancelled',
          ERROR_CODES.TIMEOUT,
          this.name,
          isTimeout // Timeout errors are retryable
        );
      }
      throw error;
    } finally {
      cleanup();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // In production, check the health endpoint
      if (isProduction()) {
        const response = await fetch(`${getApiBaseUrl()}/api/health`);
        return response.ok;
      }
      // In development, check if proxy is available or API key is set
      const proxyBase = getApiBaseUrl();
      if (proxyBase) {
        const response = await fetch(`${proxyBase}/health`);
        return response.ok;
      }
      // Claude doesn't have a simple health endpoint, so we'll just check if API key is set
      return this.isReady();
    } catch {
      return false;
    }
  }

  isReady(): boolean {
    // In production, we don't need client-side API key
    if (isProduction()) {
      return true;
    }
    // In development with proxy, we don't need client-side API key
    const proxyBase = getApiBaseUrl();
    if (proxyBase) {
      return true;
    }
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

    return createLLMError(
      errorData.error?.message || text,
      code,
      this.name,
      this.isRetryable(response.status),
      {
        statusCode: response.status,
        type: errorData.error?.type,
      }
    );
  }

  private mapErrorCode(status: number, type?: string): ErrorCode {
    if (status === 429) return ERROR_CODES.RATE_LIMIT;
    if (status === 401) return ERROR_CODES.INVALID_API_KEY;
    if (status === 403) return ERROR_CODES.PERMISSION_DENIED;
    if (status === 529) return ERROR_CODES.OVERLOADED; // Claude-specific
    if (status === 400) {
      if (type === 'invalid_request_error') return ERROR_CODES.INVALID_REQUEST;
    }
    if (status >= 500) return ERROR_CODES.SERVER_ERROR;
    return ERROR_CODES.SERVER_ERROR;
  }

  private isRetryable(status: number): boolean {
    return status === 429 || status === 529 || status >= 500;
  }

  private calculateCost(usage?: { input_tokens?: number; output_tokens?: number }): number {
    if (!usage) return 0;
    // Claude 3.5 Sonnet: $3/1M input, $15/1M output
    const inputCost = (usage.input_tokens || 0) * (3 / 1000000);
    const outputCost = (usage.output_tokens || 0) * (15 / 1000000);
    return inputCost + outputCost;
  }
}

export function createClaudeProvider(config?: Partial<ClaudeConfig>): ClaudeProvider {
  return new ClaudeProvider({
    // API key is server-side only - passed to serverless function via process.env
    apiKey: config?.apiKey || '',
    model: config?.model || import.meta.env.VITE_CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
  });
}
