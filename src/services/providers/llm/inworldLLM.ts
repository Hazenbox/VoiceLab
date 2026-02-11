/**
 * Inworld LLM Provider
 * Production-ready implementation with error handling and usage tracking
 * Routes through /api/inworld serverless function in production for security
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
import { getApiBaseUrl, isProduction } from '../../../config/providers';

export interface InworldLLMConfig {
  apiKey: string;
  character: string;
  proxyUrl: string;
}

export class InworldLLMProvider implements LLMProvider {
  readonly name = 'inworld';
  readonly displayName = 'Inworld AI';
  readonly supportsStreaming = false;
  readonly maxTokens = 8000; // Inworld typical limit
  readonly costPer1kTokens = 0.002;

  private config: InworldLLMConfig;
  private sessionId?: string;

  constructor(config: InworldLLMConfig) {
    this.config = config;
  }

  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    const startTime = Date.now();

    // Get the last user message
    const userMessage = options.messages.filter(m => m.role === 'user').pop();
    if (!userMessage) {
      throw createLLMError(
        'No user message provided',
        ERROR_CODES.INVALID_REQUEST,
        this.name,
        false
      );
    }

    // Extract system prompt if it's the first message of a new session
    const systemMessage = options.messages.find(m => m.role === 'system');
    let messageText = userMessage.content;
    
    // If no session yet and we have a system prompt, prepend it
    if (!this.sessionId && systemMessage) {
      messageText = `[Context: ${systemMessage.content}]\n\nUser: ${userMessage.content}`;
    }

    try {
      const requestBody = {
        character: this.config.character,
        text: messageText,
        endUserFullname: 'User',
        endUserId: 'user-001',
        sessionId: this.sessionId,
      };

      const response = await fetch(
        `${this.config.proxyUrl}/api/inworld/simpleSendText`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.config.apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: options.signal,
        }
      );

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;

      // Store session ID for conversation continuity
      if (data.sessionId) {
        this.sessionId = data.sessionId;
      }

      // Estimate tokens based on text length
      const inputTokens = Math.ceil(messageText.length / 4);
      const outputText = data.interaction?.text || data.text || '';
      const outputTokens = Math.ceil(outputText.length / 4);

      const usage: LLMUsageMetrics = {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
        estimatedCost: this.calculateCost(inputTokens, outputTokens),
        latencyMs: latency,
        model: 'inworld-character',
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
    // Inworld doesn't support streaming, fall back to regular generate
    const result = await this.generate(options);
    onChunk(result.content);
    onUsage?.(result.usage);
    return result.content;
  }

  async healthCheck(): Promise<boolean> {
    return this.isReady();
  }

  isReady(): boolean {
    // Character is required regardless of environment
    if (!this.config.character || this.config.character.length === 0) {
      return false;
    }
    
    // In production, server-side keys are configured via Vercel env vars
    if (isProduction()) {
      return true;
    }
    
    // In development with proxy, check if proxy is available
    const proxyBase = getApiBaseUrl();
    if (proxyBase) {
      return true;
    }
    
    // Fallback: check for client-side key (legacy direct API mode)
    return this.config.apiKey.length > 0;
  }

  disconnect(): void {
    this.sessionId = undefined;
  }

  resetSession(): void {
    this.sessionId = undefined;
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  private async handleError(response: Response): Promise<LLMError> {
    const text = await response.text();
    let errorData: { error?: string; message?: string };
    
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

  private mapErrorCode(status: number): ErrorCode {
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
    const inputCost = inputTokens * (0.002 / 1000);
    const outputCost = outputTokens * (0.002 / 1000);
    return inputCost + outputCost;
  }
}

export function createInworldLLMProvider(config?: Partial<InworldLLMConfig>): InworldLLMProvider {
  // Get API base URL for proxy
  const apiBase = getApiBaseUrl();
  
  return new InworldLLMProvider({
    // API key is server-side only - passed to serverless function via process.env
    apiKey: config?.apiKey || '',
    character: config?.character || import.meta.env.VITE_INWORLD_CHARACTER || '',
    proxyUrl: config?.proxyUrl || apiBase,
  });
}
