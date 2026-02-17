/**
 * Reliability Utilities
 * 
 * Provides utilities for robust, production-grade operations:
 * - Idempotency keys for duplicate prevention
 * - Multi-tab localStorage synchronization
 * - Retry logic with exponential backoff
 * - Cross-tab message deduplication
 */

import { safeStorage } from '../safeStorage';

// =============================================================================
// Idempotency Key Generation
// =============================================================================

/**
 * Generate a unique idempotency key for a request.
 * Combines timestamp, random component, and optional context for uniqueness.
 */
export function generateIdempotencyKey(context?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const contextPart = context ? `-${context.substring(0, 8)}` : '';
  return `idk_${timestamp}_${random}${contextPart}`;
}

/**
 * Storage for processed idempotency keys (with TTL)
 */
const IDEMPOTENCY_STORAGE_KEY = 'voicelab_idempotency_keys';
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface IdempotencyEntry {
  key: string;
  timestamp: number;
  result?: unknown;
}

/**
 * Check if an idempotency key has already been processed
 */
export function isIdempotencyKeyProcessed(key: string): boolean {
  try {
    const stored = safeStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
    if (!stored) return false;
    
    const entries: IdempotencyEntry[] = JSON.parse(stored);
    const now = Date.now();
    
    // Clean expired entries and check for match
    const validEntries = entries.filter(e => now - e.timestamp < IDEMPOTENCY_TTL_MS);
    return validEntries.some(e => e.key === key);
  } catch {
    return false;
  }
}

/**
 * Mark an idempotency key as processed
 */
export function markIdempotencyKeyProcessed(key: string, result?: unknown): void {
  try {
    const stored = safeStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
    const entries: IdempotencyEntry[] = stored ? JSON.parse(stored) : [];
    const now = Date.now();
    
    // Clean expired entries
    const validEntries = entries.filter(e => now - e.timestamp < IDEMPOTENCY_TTL_MS);
    
    // Add new entry
    validEntries.push({ key, timestamp: now, result });
    
    // Keep max 100 entries
    const trimmed = validEntries.slice(-100);
    safeStorage.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('[Idempotency] Failed to mark key as processed:', error);
  }
}

/**
 * Get cached result for an idempotency key (if available)
 */
export function getIdempotencyResult(key: string): unknown | undefined {
  try {
    const stored = safeStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
    if (!stored) return undefined;
    
    const entries: IdempotencyEntry[] = JSON.parse(stored);
    const entry = entries.find(e => e.key === key);
    return entry?.result;
  } catch {
    return undefined;
  }
}

// =============================================================================
// Multi-Tab LocalStorage Synchronization
// =============================================================================

type StorageChangeListener = (key: string, newValue: string | null, oldValue: string | null) => void;
const storageListeners = new Map<string, Set<StorageChangeListener>>();

/**
 * Subscribe to localStorage changes from other tabs.
 * Returns an unsubscribe function.
 */
export function subscribeToStorageChanges(
  key: string,
  listener: StorageChangeListener
): () => void {
  // Initialize listener set for this key
  if (!storageListeners.has(key)) {
    storageListeners.set(key, new Set());
  }
  
  storageListeners.get(key)!.add(listener);
  
  // Return unsubscribe function
  return () => {
    const listeners = storageListeners.get(key);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        storageListeners.delete(key);
      }
    }
  };
}

// Global storage event handler (initialized once)
let storageEventHandlerInitialized = false;

function initStorageEventHandler(): void {
  if (storageEventHandlerInitialized || typeof window === 'undefined') return;
  
  window.addEventListener('storage', (event) => {
    if (!event.key) return;
    
    const listeners = storageListeners.get(event.key);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event.key!, event.newValue, event.oldValue);
        } catch (error) {
          console.error('[StorageSync] Listener error:', error);
        }
      });
    }
  });
  
  storageEventHandlerInitialized = true;
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initStorageEventHandler();
}

// =============================================================================
// Retry Logic with Exponential Backoff
// =============================================================================

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial delay in ms */
  initialDelayMs?: number;
  /** Maximum delay in ms */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Optional abort signal */
  signal?: AbortSignal;
  /** Optional callback on each retry */
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
  /** Function to determine if error is retryable */
  isRetryable?: (error: Error) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'signal' | 'onRetry' | 'isRetryable'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Execute a function with automatic retry and exponential backoff.
 * 
 * @example
 * const result = await withRetry(
 *   () => fetch('/api/data'),
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    // Check if aborted
    if (config.signal?.aborted) {
      throw new Error('Operation aborted');
    }
    
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      if (config.isRetryable && !config.isRetryable(lastError)) {
        throw lastError;
      }
      
      // If this was the last attempt, throw
      if (attempt === config.maxAttempts) {
        throw lastError;
      }
      
      // Calculate delay with jitter
      const baseDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
      const jitter = Math.random() * 0.3 * baseDelay; // Up to 30% jitter
      const delay = Math.min(baseDelay + jitter, config.maxDelayMs);
      
      // Notify listener
      config.onRetry?.(attempt, lastError, delay);
      
      // Wait before retry
      await sleep(delay, config.signal);
    }
  }
  
  // Should never reach here, but TypeScript needs this
  throw lastError!;
}

/**
 * Sleep for a given duration, respecting abort signal
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Operation aborted'));
      return;
    }
    
    const timeoutId = setTimeout(resolve, ms);
    
    if (signal) {
      const abortHandler = () => {
        clearTimeout(timeoutId);
        reject(new Error('Operation aborted'));
      };
      signal.addEventListener('abort', abortHandler, { once: true });
    }
  });
}

// =============================================================================
// Request Deduplication
// =============================================================================

const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Deduplicate concurrent identical requests.
 * If a request with the same key is already in flight, returns the same promise.
 * 
 * @example
 * // Multiple calls with same key will share the same request
 * const result = await deduplicateRequest('user-123', () => fetchUser(123));
 */
export async function deduplicateRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  // Check if request already in flight
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  
  // Create new request and track it
  const promise = fn().finally(() => {
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, promise);
  return promise;
}

// =============================================================================
// Exports
// =============================================================================

export {
  // Re-export types
  type StorageChangeListener,
  type IdempotencyEntry,
};
