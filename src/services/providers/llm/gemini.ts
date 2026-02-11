/**
 * Gemini LLM Provider
 * Production-ready implementation with error handling and usage tracking
 * Routes through /api/gemini serverless function in production for security
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

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export class GeminiTextProvider implements LLMProvider {
  readonly name = 'gemini-text';
  readonly displayName = 'Google Gemini';
  readonly supportsStreaming = true;
  readonly maxTokens = 1000000; // Gemini 1.5 context window
  readonly costPer1kTokens = 0.000075; // Gemini 1.5 Flash pricing

  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
  }

  /**
   * Get the API endpoint URL
   * In production: use /api/gemini serverless function
   * In development: use direct API with key in URL (or proxy if available)
   */
  private getApiUrl(stream: boolean = false): string {
    if (isProduction()) {
      return `${getApiBaseUrl()}/api/gemini`;
    }
    // In development, check if proxy is available
    const proxyBase = getApiBaseUrl();
    if (proxyBase) {
      return `${proxyBase}/api/gemini`;
    }
    // Fallback to direct API (not recommended - exposes API key)
    const action = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:${action}&key=${this.config.apiKey}`;
  }

  /**
   * Check if we should use proxy mode (send model/action in body instead of URL)
   */
  private useProxyMode(): boolean {
    return isProduction() || Boolean(getApiBaseUrl());
  }

  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    const startTime = Date.now();

    // Convert to Gemini format
    const systemInstruction = options.messages.find(m => m.role === 'system');
    const contents = options.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    try {
      const useProxy = this.useProxyMode();
      const url = this.getApiUrl(false);
      
      const requestBody: Record<string, unknown> = {
        system_instruction: systemInstruction 
          ? { parts: [{ text: systemInstruction.content }] } 
          : undefined,
        contents,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 1000,
          temperature: options.temperature ?? 0.7,
          topP: options.topP,
          stopSequences: options.stopSequences,
        },
      };

      // Add model and action for proxy mode
      if (useProxy) {
        requestBody.model = this.config.model;
        requestBody.action = 'generateContent';
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: options.signal,
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;

      // Gemini returns usage metadata
      const usageMetadata = data.usageMetadata || {};
      
      const usage: LLMUsageMetrics = {
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
        estimatedCost: this.calculateCost(usageMetadata),
        latencyMs: latency,
        model: this.config.model,
        provider: this.name,
        timestamp: Date.now(),
      };

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        content,
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

    const systemInstruction = options.messages.find(m => m.role === 'system');
    const contents = options.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    try {
      const useProxy = this.useProxyMode();
      const url = this.getApiUrl(true);
      
      const requestBody: Record<string, unknown> = {
        system_instruction: systemInstruction 
          ? { parts: [{ text: systemInstruction.content }] } 
          : undefined,
        contents,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 1000,
          temperature: options.temperature ?? 0.7,
        },
      };

      // Add model and stream flag for proxy mode
      if (useProxy) {
        requestBody.model = this.config.model;
        requestBody.stream = true;
        requestBody.action = 'streamGenerateContent';
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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
              try {
                const parsed = JSON.parse(data);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  fullText += text;
                  totalTokens++;
                  onChunk(text);
                }
                
                // Check for usage metadata in final chunk
                if (parsed.usageMetadata) {
                  totalTokens = parsed.usageMetadata.totalTokenCount || totalTokens;
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
      // In production, check the health endpoint
      if (isProduction()) {
        const response = await fetch(`${getApiBaseUrl()}/api/health`);
        return response.ok;
      }
      // In development, check if proxy is available
      const proxyBase = getApiBaseUrl();
      if (proxyBase) {
        const response = await fetch(`${proxyBase}/health`);
        return response.ok;
      }
      // Direct API check
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.config.apiKey}`;
      const response = await fetch(url);
      return response.ok;
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
    let errorData: { error?: { message?: string; code?: number } };
    
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { error: { message: text } };
    }

    const code = this.mapErrorCode(response.status, errorData.error?.code);

    return createLLMError(
      errorData.error?.message || text,
      code,
      this.name,
      this.isRetryable(response.status),
      {
        statusCode: response.status,
      }
    );
  }

  private mapErrorCode(status: number, _errorCode?: number): ErrorCode {
    if (status === 429) return ERROR_CODES.RATE_LIMIT;
    if (status === 401 || status === 403) return ERROR_CODES.INVALID_API_KEY;
    if (status === 400) return ERROR_CODES.INVALID_REQUEST;
    if (status >= 500) return ERROR_CODES.SERVER_ERROR;
    return ERROR_CODES.SERVER_ERROR;
  }

  private isRetryable(status: number): boolean {
    return status === 429 || status >= 500;
  }

  private calculateCost(usage?: { promptTokenCount?: number; candidatesTokenCount?: number }): number {
    if (!usage) return 0;
    // Gemini 1.5 Flash: $0.075/1M input, $0.30/1M output
    const inputCost = (usage.promptTokenCount || 0) * (0.075 / 1000000);
    const outputCost = (usage.candidatesTokenCount || 0) * (0.30 / 1000000);
    return inputCost + outputCost;
  }
}

export function createGeminiTextProvider(config?: Partial<GeminiConfig>): GeminiTextProvider {
  return new GeminiTextProvider({
    // API key is server-side only - passed to serverless function via process.env
    apiKey: config?.apiKey || '',
    model: config?.model || 'gemini-1.5-flash',
  });
}
