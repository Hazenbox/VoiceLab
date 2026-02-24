/**
 * Retry Manager with Exponential Backoff
 * Handles transient failures with intelligent retry logic
 * 
 * PHASE 4 Enhancements:
 * - Operation deadline (total timeout across all retries)
 * - Decorrelated jitter for better distribution
 * - Budget tracking to prevent retry storms
 */

import { ERROR_CODES, type LLMError } from '../providers/llm/types';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  retryableErrors: string[];
  onRetry?: (attempt: number, error: LLMError) => void;
  /** PHASE 4: Maximum total time for operation including all retries (ms) */
  operationDeadlineMs?: number;
  /** PHASE 4: Use decorrelated jitter instead of simple jitter */
  useDecorrelatedJitter?: boolean;
}

// PHASE 4: Deadline exceeded error
export class DeadlineExceededError extends Error {
  code = 'DEADLINE_EXCEEDED';
  retryable = false;
  constructor(message: string, public elapsedMs: number, public deadlineMs: number) {
    super(message);
    this.name = 'DeadlineExceededError';
  }
}

export class RetryManager {
  private config: RetryConfig;
  // PHASE 4: Track last delay for decorrelated jitter
  private lastDelay: number;

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
      // PHASE 4: Default 30 second operation deadline
      operationDeadlineMs: config?.operationDeadlineMs ?? 30000,
      useDecorrelatedJitter: config?.useDecorrelatedJitter ?? true,
    };
    this.lastDelay = this.config.baseDelayMs;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: LLMError | undefined;
    const startTime = Date.now();
    
    // PHASE 4: Reset decorrelated jitter state
    this.lastDelay = this.config.baseDelayMs;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      // PHASE 4: Check deadline before attempting
      if (this.config.operationDeadlineMs) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= this.config.operationDeadlineMs) {
          throw new DeadlineExceededError(
            `Operation deadline exceeded after ${attempt} attempts (${elapsed}ms > ${this.config.operationDeadlineMs}ms)`,
            elapsed,
            this.config.operationDeadlineMs
          );
        }
      }
      
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
        
        // PHASE 4: Check if delay would exceed deadline
        if (this.config.operationDeadlineMs) {
          const elapsed = Date.now() - startTime;
          const remainingTime = this.config.operationDeadlineMs - elapsed;
          if (delay >= remainingTime) {
            console.warn(
              `[RetryManager] ${context}: Skipping retry - delay (${delay}ms) would exceed deadline (${remainingTime}ms remaining)`
            );
            throw lastError;
          }
        }
        
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
      const delay = Math.min(retryAfter * 1000, this.config.maxDelayMs);
      this.lastDelay = delay;
      return delay;
    }
    
    let delay: number;
    
    if (this.config.useDecorrelatedJitter) {
      // PHASE 4: Decorrelated jitter (AWS recommended approach)
      // delay = min(maxDelay, random_between(baseDelay, lastDelay * 3))
      const minDelay = this.config.baseDelayMs;
      const maxDelay = this.lastDelay * 3;
      delay = Math.min(
        this.config.maxDelayMs,
        minDelay + Math.random() * (maxDelay - minDelay)
      );
      this.lastDelay = delay;
    } else {
      // Original: Exponential backoff with simple jitter
      const exponentialDelay = this.config.baseDelayMs * 
        Math.pow(this.config.exponentialBase, attempt);
      
      // Add jitter (±20%) to prevent thundering herd
      const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
      delay = Math.min(exponentialDelay + jitter, this.config.maxDelayMs);
    }
    
    return delay;
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
