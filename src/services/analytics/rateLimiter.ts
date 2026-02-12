/**
 * Rate Limiter
 * 
 * Client-side rate limiting to prevent runaway event logging.
 * Protects against bugs or edge cases that could spam Convex with events.
 */

export interface RateLimitConfig {
  /** Maximum number of events allowed in the window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Default rate limits for different event types
export const RATE_LIMITS = {
  interactionEvents: { max: 100, windowMs: 60_000 },  // 100 events/minute
  sessionUpdates: { max: 10, windowMs: 60_000 },      // 10 updates/minute
  errorLogs: { max: 20, windowMs: 60_000 },           // 20 errors/minute
  sessionStarts: { max: 5, windowMs: 60_000 },        // 5 sessions/minute
} as const;

/**
 * Simple in-memory rate limiter
 */
export class RateLimiter {
  private counts: Map<string, RateLimitEntry> = new Map();

  /**
   * Check if an operation can proceed under rate limits
   * @param key - Unique key for the rate limit bucket (e.g., "interactionEvents")
   * @param limit - Rate limit configuration
   * @returns true if operation can proceed, false if rate limited
   */
  canProceed(key: string, limit: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.counts.get(key);

    // First request or window expired - allow and reset
    if (!entry || now > entry.resetAt) {
      this.counts.set(key, { count: 1, resetAt: now + limit.windowMs });
      return true;
    }

    // Check if under limit
    if (entry.count >= limit.max) {
      console.warn(`[RateLimiter] Rate limit exceeded for ${key}: ${entry.count}/${limit.max}`);
      return false;
    }

    // Under limit - increment and allow
    entry.count++;
    return true;
  }

  /**
   * Get current count for a key
   */
  getCount(key: string): number {
    const entry = this.counts.get(key);
    if (!entry || Date.now() > entry.resetAt) {
      return 0;
    }
    return entry.count;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, limit: RateLimitConfig): number {
    const count = this.getCount(key);
    return Math.max(0, limit.max - count);
  }

  /**
   * Reset a specific key
   */
  reset(key: string): void {
    this.counts.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.counts.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
