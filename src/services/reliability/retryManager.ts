/**
 * Retry Manager with Exponential Backoff
 * Handles transient failures with intelligent retry logic
 */

import { ERROR_CODES, type LLMError } from '../providers/llm/types';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  retryableErrors: string[];
  onRetry?: (attempt: number, error: LLMError) => void;
}

export class RetryManager {
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      baseDelayMs: config?.baseDelayMs ?? 1000,
      maxDelayMs: config?.maxDelayMs ?? 30000,
      exponentialBase: config?.exponentialBase ?? 2,
      retryableErrors: config?.retryableErrors ?? [
        ERROR_CODES.RATE_LIMIT,
        ERROR_CODES.TIMEOUT,
        ERROR_CODES.SERVER_ERROR,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        ERROR_CODES.NETWORK_ERROR,
        ERROR_CODES.OVERLOADED,
      ],
      onRetry: config?.onRetry,
    };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: LLMError | undefined;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.normalizeError(error);
        
        // Don't retry if not retryable or max attempts reached
        if (!this.shouldRetry(lastError, attempt)) {
          throw lastError;
        }
        
        // Calculate delay with exponential backoff + jitter
        const delay = this.calculateDelay(attempt, lastError);
        
        // Notify about retry
        this.config.onRetry?.(attempt + 1, lastError);
        
        console.warn(
          `[RetryManager] ${context} failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}). ` +
          `Retrying in ${delay}ms. Error: ${lastError.code} - ${lastError.message}`
        );
        
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  private shouldRetry(error: LLMError, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) return false;
    if (!error.retryable) return false;
    return this.config.retryableErrors.includes(error.code);
  }

  private calculateDelay(attempt: number, error: LLMError): number {
    // Check for Retry-After header (rate limits)
    if (error.details?.retryAfter) {
      const retryAfter = error.details.retryAfter as number;
      return Math.min(retryAfter * 1000, this.config.maxDelayMs);
    }
    
    // Exponential backoff: base * (exponentialBase ^ attempt)
    const exponentialDelay = this.config.baseDelayMs * 
      Math.pow(this.config.exponentialBase, attempt);
    
    // Add jitter (±20%) to prevent thundering herd
    const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
    
    return Math.min(exponentialDelay + jitter, this.config.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private normalizeError(error: unknown): LLMError {
    // If already an LLMError, return it
    if (this.isLLMError(error)) {
      return error;
    }
    
    // Convert standard Error to LLMError
    const message = error instanceof Error ? error.message : String(error);
    const llmError = new Error(message) as LLMError;
    llmError.code = ERROR_CODES.SERVER_ERROR;
    llmError.retryable = true;
    llmError.provider = 'unknown';
    llmError.name = 'LLMError';
    
    return llmError;
  }

  private isLLMError(error: unknown): error is LLMError {
    return (
      error instanceof Error &&
      'code' in error &&
      'retryable' in error &&
      'provider' in error
    );
  }

  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): RetryConfig {
    return { ...this.config };
  }
}
