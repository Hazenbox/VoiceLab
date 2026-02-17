import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Rate Limiting Module for Vercel Serverless Functions
 * 
 * Phase 6F: Upgraded to support distributed rate limiting via Upstash Redis.
 * 
 * Architecture:
 * - When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are configured,
 *   uses Upstash Redis for distributed rate limiting across all serverless instances.
 * - Falls back to in-memory rate limiting for development/preview environments.
 * 
 * To enable Upstash:
 * 1. Create an Upstash Redis database at https://console.upstash.com
 * 2. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to Vercel env vars
 * 3. Install @upstash/ratelimit and @upstash/redis packages
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// In-memory storage for rate limit entries (fallback)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Track whether we're using distributed rate limiting
let useDistributedRateLimit = false;
let upstashClient: unknown = null;

// Default configurations for different endpoint types
export const RATE_LIMITS = {
  // LLM endpoints - more expensive, stricter limits
  llm: { windowMs: 60 * 1000, maxRequests: 20 },       // 20 requests per minute
  
  // TTS endpoints - also expensive
  tts: { windowMs: 60 * 1000, maxRequests: 30 },       // 30 requests per minute
  
  // Auth endpoints - prevent brute force
  auth: { windowMs: 60 * 1000, maxRequests: 5 },       // 5 attempts per minute
  
  // Pipeline endpoints - most expensive
  pipeline: { windowMs: 60 * 1000, maxRequests: 15 },  // 15 requests per minute
  
  // General endpoints
  default: { windowMs: 60 * 1000, maxRequests: 60 },   // 60 requests per minute
} as const;

/**
 * Check if Upstash Redis is configured.
 */
export function isDistributedRateLimitEnabled(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Initialize Upstash rate limiter (lazy loaded).
 * Returns null if Upstash is not configured.
 */
async function getUpstashRateLimiter(): Promise<unknown> {
  if (!isDistributedRateLimitEnabled()) {
    return null;
  }
  
  if (upstashClient) {
    return upstashClient;
  }
  
  try {
    // Dynamic import to avoid bundling if not used
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');
    
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    
    // Create rate limiter with sliding window
    upstashClient = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '60 s'),
      analytics: true,
      prefix: 'voice-lab-rl',
    });
    
    useDistributedRateLimit = true;
    console.log('[RateLimit] Initialized Upstash distributed rate limiting');
    
    return upstashClient;
  } catch (error) {
    console.warn('[RateLimit] Failed to initialize Upstash, falling back to in-memory:', error);
    return null;
  }
}

/**
 * Check rate limit using Upstash (distributed).
 */
async function checkUpstashRateLimit(
  identifier: string,
  _config: RateLimitConfig
): Promise<RateLimitResult> {
  const limiter = await getUpstashRateLimiter();
  
  if (!limiter) {
    // Fall back to in-memory if Upstash unavailable
    return checkInMemoryRateLimit(identifier, '', _config);
  }
  
  try {
    // @ts-expect-error - dynamic import typing
    const result = await limiter.limit(identifier);
    
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
      retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
    };
  } catch (error) {
    console.error('[RateLimit] Upstash error, falling back to in-memory:', error);
    return checkInMemoryRateLimit(identifier, '', _config);
  }
}

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
 * Check rate limit using in-memory store (fallback).
 */
function checkInMemoryRateLimit(
  clientId: string,
  endpoint: string,
  config: RateLimitConfig = RATE_LIMITS.default
): RateLimitResult {
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
 * Check and update rate limit for a client.
 * Uses Upstash Redis if configured, otherwise falls back to in-memory.
 * 
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  clientId: string,
  endpoint: string,
  config: RateLimitConfig = RATE_LIMITS.default
): RateLimitResult {
  // Use in-memory for sync compatibility
  // For async Upstash, use checkRateLimitAsync
  return checkInMemoryRateLimit(clientId, endpoint, config);
}

/**
 * Async version of checkRateLimit that uses Upstash if configured.
 * Recommended for API routes that can be async.
 */
export async function checkRateLimitAsync(
  clientId: string,
  endpoint: string,
  config: RateLimitConfig = RATE_LIMITS.default
): Promise<RateLimitResult> {
  // Try Upstash first if configured
  if (isDistributedRateLimitEnabled()) {
    const identifier = `${clientId}:${endpoint}`;
    return checkUpstashRateLimit(identifier, config);
  }
  
  // Fall back to in-memory
  return checkInMemoryRateLimit(clientId, endpoint, config);
}

/**
 * Rate limiting middleware for Vercel serverless functions.
 * Sync version - uses in-memory rate limiting.
 * Returns true if request should continue, false if rate limited.
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
  
  return handleRateLimitResult(res, result, config);
}

/**
 * Async rate limiting middleware that uses Upstash if configured.
 * Recommended for production API routes.
 */
export async function handleRateLimitAsync(
  req: VercelRequest,
  res: VercelResponse,
  endpointType: keyof typeof RATE_LIMITS = 'default'
): Promise<boolean> {
  const clientId = getClientId(req);
  const endpoint = req.url || '/unknown';
  const config = RATE_LIMITS[endpointType];
  
  const result = await checkRateLimitAsync(clientId, endpoint, config);
  
  return handleRateLimitResult(res, result, config);
}

/**
 * Handle rate limit result - set headers and respond if rate limited.
 */
function handleRateLimitResult(
  res: VercelResponse,
  result: RateLimitResult,
  config: RateLimitConfig
): boolean {
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', config.maxRequests);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));
  
  // Add header to indicate rate limiting mode
  res.setHeader('X-RateLimit-Mode', useDistributedRateLimit ? 'distributed' : 'local');
  
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
