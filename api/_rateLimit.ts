import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Rate Limiting Module for Vercel Serverless Functions
 * 
 * This is an in-memory rate limiter that works for basic protection.
 * For production with high traffic, use @upstash/ratelimit with Redis.
 * 
 * Note: In Vercel serverless, memory is not shared across instances,
 * so this provides per-instance rate limiting. For stricter limits,
 * integrate with Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// In-memory storage for rate limit entries
// Keys are IP addresses or identifiers
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default configurations for different endpoint types
export const RATE_LIMITS = {
  // LLM endpoints - more expensive, stricter limits
  llm: { windowMs: 60 * 1000, maxRequests: 20 },       // 20 requests per minute
  
  // TTS endpoints - also expensive
  tts: { windowMs: 60 * 1000, maxRequests: 30 },       // 30 requests per minute
  
  // Auth endpoints - prevent brute force
  auth: { windowMs: 60 * 1000, maxRequests: 5 },       // 5 attempts per minute
  
  // General endpoints
  default: { windowMs: 60 * 1000, maxRequests: 60 },   // 60 requests per minute
} as const;

/**
 * Get client identifier from request
 * Uses X-Forwarded-For header (set by Vercel) or falls back to IP
 */
function getClientId(req: VercelRequest): string {
  // Vercel sets X-Forwarded-For for the real client IP
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0].trim();
  }
  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0];
  }
  
  // Fallback to X-Real-IP or unknown
  return (req.headers['x-real-ip'] as string) || 'unknown';
}

/**
 * Clean expired entries periodically
 */
function cleanExpiredEntries(): void {
  const now = Date.now();
  const keys = Array.from(rateLimitStore.keys());
  
  for (const key of keys) {
    const entry = rateLimitStore.get(key);
    if (entry && entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check and update rate limit for a client
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  clientId: string,
  endpoint: string,
  config: RateLimitConfig = RATE_LIMITS.default
): { allowed: boolean; remaining: number; resetAt: number; retryAfter?: number } {
  const key = `${clientId}:${endpoint}`;
  const now = Date.now();
  
  // Clean expired entries occasionally (1% chance per request)
  if (Math.random() < 0.01) {
    cleanExpiredEntries();
  }
  
  let entry = rateLimitStore.get(key);
  
  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }
  
  entry.count++;
  rateLimitStore.set(key, entry);
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const allowed = entry.count <= config.maxRequests;
  
  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * Rate limiting middleware for Vercel serverless functions
 * Returns true if request should continue, false if rate limited
 */
export function handleRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  endpointType: keyof typeof RATE_LIMITS = 'default'
): boolean {
  const clientId = getClientId(req);
  const endpoint = req.url || '/unknown';
  const config = RATE_LIMITS[endpointType];
  
  const result = checkRateLimit(clientId, endpoint, config);
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', config.maxRequests);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));
  
  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfter || 60);
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please retry after ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
    });
    return false;
  }
  
  return true;
}

/**
 * Get current rate limit status for a client (useful for debugging)
 */
export function getRateLimitStatus(
  clientId: string,
  endpoint: string,
  config: RateLimitConfig = RATE_LIMITS.default
): { count: number; remaining: number; resetAt: number } | null {
  const key = `${clientId}:${endpoint}`;
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < Date.now()) {
    return null;
  }
  
  return {
    count: entry.count,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}
