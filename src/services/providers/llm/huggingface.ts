/**
 * Hugging Face LLM Provider
 * Production-ready implementation with error handling, streaming, and usage tracking
 * Supports multiple models via Hugging Face Inference API
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

// Available HuggingFace models configuration
export const HF_MODELS = {
  'qwen25-7b': {
    id: 'Qwen/Qwen2.5-7B-Instruct',
    displayName: 'Qwen 2.5 7B Instruct',
    maxTokens: 128000,
    costPer1kTokens: 0, // Free tier
  },
  'gemma2-2b': {
    id: 'google/gemma-2-2b-it',
    displayName: 'Gemma 2 2B',
    maxTokens: 8192,
    costPer1kTokens: 0,
  },
  'deepseek-r1': {
    id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B',
    displayName: 'DeepSeek R1 7B',
    maxTokens: 128000,
    costPer1kTokens: 0,
  },
  'llama33-70b': {
    id: 'meta-llama/Llama-3.3-70B-Instruct',
    displayName: 'Llama 3.3 70B Instruct',
    maxTokens: 128000,
    costPer1kTokens: 0,
  },
  'glm4-9b': {
    id: 'THUDM/glm-4-9b-chat',
    displayName: 'GLM-4 9B Chat',
    maxTokens: 128000,
    costPer1kTokens: 0,
  },
  'mistral-7b': {
    id: 'mistralai/Mistral-7B-Instruct-v0.3',
    displayName: 'Mistral 7B Instruct',
    maxTokens: 32768,
    costPer1kTokens: 0,
  },
} as const;

export type HFModelKey = keyof typeof HF_MODELS;

export interface HuggingFaceConfig {
  apiKey: string;
  model: HFModelKey;
  baseUrl: string;
}

export class HuggingFaceProvider implements LLMProvider {
  readonly name = 'huggingface';
  readonly displayName = 'Hugging Face';
  readonly supportsStreaming = true;
  
  private config: HuggingFaceConfig;
  private modelConfig: typeof HF_MODELS[HFModelKey];

  constructor(config: HuggingFaceConfig) {
    this.config = config;
    this.modelConfig = HF_MODELS[config.model] || HF_MODELS['qwen25-7b'];
  }

  get maxTokens(): number {
    return this.modelConfig.maxTokens;
  }

  get costPer1kTokens(): number {
    return this.modelConfig.costPer1kTokens;
  }

  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    const startTime = Date.now();

    try {
      // Use OpenAI-compatible endpoint for chat models
      const response = await fetch(`${this.config.baseUrl}/models/${this.modelConfig.id}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelConfig.id,
          messages: options.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature ?? 0.7,
          top_p: options.topP,
          stop: options.stopSequences,
          stream: false,
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
        model: this.modelConfig.id,
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
      const response = await fetch(`${this.config.baseUrl}/models/${this.modelConfig.id}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelConfig.id,
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
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
            
            const data = trimmedLine.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                totalTokens++;
                onChunk(content);
              }
            } catch {
              // Skip invalid JSON chunks
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
        model: this.modelConfig.id,
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
      // Check model availability via HF API
      const response = await fetch(`${this.config.baseUrl}/models/${this.modelConfig.id}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
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

  /**
   * Get the current model configuration
   */
  getModelInfo(): { id: string; displayName: string; maxTokens: number } {
    return {
      id: this.modelConfig.id,
      displayName: this.modelConfig.displayName,
      maxTokens: this.modelConfig.maxTokens,
    };
  }

  /**
   * Get available models list
   */
  static getAvailableModels(): Array<{ key: HFModelKey; id: string; displayName: string }> {
    return Object.entries(HF_MODELS).map(([key, config]) => ({
      key: key as HFModelKey,
      id: config.id,
      displayName: config.displayName,
    }));
  }

  private async handleError(response: Response): Promise<LLMError> {
    const text = await response.text();
    let errorData: { error?: string; message?: string; detail?: string };
    
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { error: text };
    }

    const errorMessage = errorData.error || errorData.message || errorData.detail || text;
    const code = this.mapErrorCode(response.status, errorMessage);
    const retryAfter = response.headers.get('retry-after');

    return createLLMError(
      errorMessage,
      code,
      this.name,
      this.isRetryable(response.status, errorMessage),
      {
        statusCode: response.status,
        retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
      }
    );
  }

  private mapErrorCode(status: number, message?: string): ErrorCode {
    // HuggingFace-specific error mapping
    if (status === 429) return ERROR_CODES.RATE_LIMIT;
    if (status === 401) return ERROR_CODES.INVALID_API_KEY;
    if (status === 403) return ERROR_CODES.PERMISSION_DENIED;
    if (status === 400) {
      if (message?.toLowerCase().includes('context') || 
          message?.toLowerCase().includes('length') ||
          message?.toLowerCase().includes('token')) {
        return ERROR_CODES.CONTEXT_LENGTH_EXCEEDED;
      }
      return ERROR_CODES.INVALID_REQUEST;
    }
    // Model loading status
    if (status === 503) return ERROR_CODES.SERVICE_UNAVAILABLE;
    if (status >= 500) return ERROR_CODES.SERVER_ERROR;
    return ERROR_CODES.SERVER_ERROR;
  }

  private isRetryable(status: number, message?: string): boolean {
    // 503 with "loading" message is retryable (model is starting up)
    if (status === 503 && message?.toLowerCase().includes('loading')) {
      return true;
    }
    return status === 429 || status >= 500;
  }

  private calculateCost(usage?: { prompt_tokens?: number; completion_tokens?: number }): number {
    if (!usage) return 0;
    // Free tier - no cost
    const inputCost = (usage.prompt_tokens || 0) * (this.costPer1kTokens / 1000);
    const outputCost = (usage.completion_tokens || 0) * (this.costPer1kTokens / 1000);
    return inputCost + outputCost;
  }
}

/**
 * Create a HuggingFace provider instance
 */
export function createHuggingFaceProvider(config?: Partial<HuggingFaceConfig>): HuggingFaceProvider {
  const modelKey = (config?.model || import.meta.env.VITE_HUGGINGFACE_MODEL || 'qwen25-7b') as HFModelKey;
  
  // Validate model key
  const validModel = modelKey in HF_MODELS ? modelKey : 'qwen25-7b';

  return new HuggingFaceProvider({
    apiKey: config?.apiKey || import.meta.env.VITE_HUGGINGFACE_API_KEY || '',
    model: validModel,
    baseUrl: config?.baseUrl || import.meta.env.VITE_HUGGINGFACE_BASE_URL || 'https://api-inference.huggingface.co',
  });
}
