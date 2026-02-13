/**
 * RAG Resilience
 * 
 * Provides retry logic and resilience patterns for RAG operations.
 * Handles failures gracefully with fallbacks.
 * 
 * @module services/rag/ragResilience
 */

import { RAG_CONFIG } from '../knowledge/knowledgeRetriever';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const RESILIENCE_CONFIG = {
  /** Maximum retry attempts */
  maxRetries: 3,
  /** Initial delay between retries (ms) */
  initialDelayMs: 200,
  /** Maximum delay between retries (ms) */
  maxDelayMs: 2000,
  /** Backoff multiplier */
  backoffMultiplier: 2,
  /** Timeout for RAG operations (ms) - uses RAG_CONFIG */
  timeoutMs: RAG_CONFIG.timeoutMs,
  /** Circuit breaker: failures before opening */
  circuitBreakerThreshold: 5,
  /** Circuit breaker: time to stay open (ms) */
  circuitBreakerResetMs: 30_000,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
  shouldRetry?: (error: Error) => boolean;
}

export interface RagOperationResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTimeMs: number;
  usedFallback: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════════════

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

/**
 * Get or create circuit breaker state for a service
 */
function getCircuitBreaker(serviceKey: string): CircuitBreakerState {
  let state = circuitBreakers.get(serviceKey);
  
  if (!state) {
    state = {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false,
    };
    circuitBreakers.set(serviceKey, state);
  }
  
  // Check if circuit should be reset (half-open state)
  if (state.isOpen) {
    const timeSinceFailure = Date.now() - state.lastFailureTime;
    if (timeSinceFailure >= RESILIENCE_CONFIG.circuitBreakerResetMs) {
      state.isOpen = false;
      state.failures = 0;
    }
  }
  
  return state;
}

/**
 * Record a failure for circuit breaker
 */
function recordFailure(serviceKey: string): void {
  const state = getCircuitBreaker(serviceKey);
  state.failures++;
  state.lastFailureTime = Date.now();
  
  if (state.failures >= RESILIENCE_CONFIG.circuitBreakerThreshold) {
    state.isOpen = true;
    console.warn(`[RAG Resilience] Circuit breaker OPEN for ${serviceKey}`);
  }
}

/**
 * Record a success (resets failure count)
 */
function recordSuccess(serviceKey: string): void {
  const state = getCircuitBreaker(serviceKey);
  state.failures = 0;
  state.isOpen = false;
}

/**
 * Check if circuit is open (should skip operation)
 */
export function isCircuitOpen(serviceKey: string): boolean {
  return getCircuitBreaker(serviceKey).isOpen;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY WITH EXPONENTIAL BACKOFF
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default retry condition - retry on network errors and timeouts
 */
function defaultShouldRetry(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Retry on network/timeout errors
  if (message.includes('network') || 
      message.includes('timeout') || 
      message.includes('timed out') ||
      message.includes('fetch')) {
    return true;
  }
  
  // Retry on rate limits
  if (message.includes('429') || message.includes('rate limit')) {
    return true;
  }
  
  // Retry on server errors
  if (message.includes('503') || message.includes('502') || message.includes('500')) {
    return true;
  }
  
  // Don't retry on client errors (4xx except 429)
  if (message.includes('400') || message.includes('401') || message.includes('403')) {
    return false;
  }
  
  return false;
}

/**
 * Execute operation with retry and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = RESILIENCE_CONFIG.maxRetries,
    initialDelayMs = RESILIENCE_CONFIG.initialDelayMs,
    maxDelayMs = RESILIENCE_CONFIG.maxDelayMs,
    backoffMultiplier = RESILIENCE_CONFIG.backoffMultiplier,
    onRetry,
    shouldRetry = defaultShouldRetry,
  } = options;
  
  let lastError: Error | null = null;
  let delay = initialDelayMs;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      if (attempt > maxRetries || !shouldRetry(lastError)) {
        throw lastError;
      }
      
      // Calculate next delay with jitter
      const jitter = Math.random() * 100;
      const nextDelay = Math.min(delay + jitter, maxDelayMs);
      
      // Notify of retry
      if (onRetry) {
        onRetry(attempt, lastError, nextDelay);
      } else {
        console.log(`[RAG Resilience] Retry ${attempt}/${maxRetries} after ${nextDelay}ms: ${lastError.message}`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, nextDelay));
      
      // Increase delay for next attempt
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMEOUT WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute operation with timeout
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = RESILIENCE_CONFIG.timeoutMs,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESILIENT RAG OPERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute a RAG operation with full resilience (timeout, retry, circuit breaker, fallback)
 * 
 * @param operation - The main operation to execute
 * @param fallback - Fallback value if operation fails
 * @param serviceKey - Key for circuit breaker tracking
 * @returns Result object with success status and data/error
 */
export async function resilientRagOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  serviceKey: string = 'rag-search'
): Promise<RagOperationResult<T>> {
  const startTime = performance.now();
  let attempts = 0;
  
  // Check circuit breaker first
  if (isCircuitOpen(serviceKey)) {
    console.log(`[RAG Resilience] Circuit open for ${serviceKey}, using fallback`);
    return {
      success: false,
      data: fallback,
      error: new Error('Circuit breaker is open'),
      attempts: 0,
      totalTimeMs: performance.now() - startTime,
      usedFallback: true,
    };
  }
  
  try {
    // Execute with timeout and retry
    const result = await withRetry(
      () => withTimeout(operation, RESILIENCE_CONFIG.timeoutMs),
      {
        onRetry: (attempt) => {
          attempts = attempt;
        },
      }
    );
    
    attempts++;
    recordSuccess(serviceKey);
    
    return {
      success: true,
      data: result,
      attempts,
      totalTimeMs: performance.now() - startTime,
      usedFallback: false,
    };
  } catch (error) {
    attempts++;
    recordFailure(serviceKey);
    
    const err = error instanceof Error ? error : new Error(String(error));
    console.warn(`[RAG Resilience] Operation failed after ${attempts} attempts: ${err.message}`);
    
    return {
      success: false,
      data: fallback,
      error: err,
      attempts,
      totalTimeMs: performance.now() - startTime,
      usedFallback: true,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reset circuit breaker for a service (for testing/admin)
 */
export function resetCircuitBreaker(serviceKey: string): void {
  circuitBreakers.delete(serviceKey);
}

/**
 * Get circuit breaker status (for monitoring)
 */
export function getCircuitBreakerStatus(serviceKey: string): {
  isOpen: boolean;
  failures: number;
  lastFailureTime: number | null;
} {
  const state = circuitBreakers.get(serviceKey);
  
  if (!state) {
    return {
      isOpen: false,
      failures: 0,
      lastFailureTime: null,
    };
  }
  
  return {
    isOpen: state.isOpen,
    failures: state.failures,
    lastFailureTime: state.lastFailureTime || null,
  };
}

/**
 * Get all circuit breaker statuses
 */
export function getAllCircuitBreakerStatuses(): Map<string, {
  isOpen: boolean;
  failures: number;
  lastFailureTime: number | null;
}> {
  const statuses = new Map();
  
  for (const [key, state] of circuitBreakers) {
    statuses.set(key, {
      isOpen: state.isOpen,
      failures: state.failures,
      lastFailureTime: state.lastFailureTime || null,
    });
  }
  
  return statuses;
}
