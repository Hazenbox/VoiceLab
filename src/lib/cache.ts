/**
 * TTL Cache Utility
 * 
 * PHASE 1: Client-side caching layer for Convex query data.
 * Reduces function calls by caching stable data with configurable TTL.
 * 
 * Patterns aligned with SWR/TanStack Query:
 * - Stale-while-revalidate support
 * - TTL-based expiration
 * - Cache key management
 * 
 * @module lib/cache
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  staleTime?: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  evictions: number;
}

type CacheEventType = 'hit' | 'miss' | 'stale' | 'set' | 'evict' | 'clear';

interface CacheEvent {
  type: CacheEventType;
  key: string;
  timestamp: number;
}

type CacheEventListener = (event: CacheEvent) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// TTL CACHE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class TTLCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats: CacheStats = { hits: 0, misses: 0, staleHits: 0, evictions: 0 };
  private listeners: CacheEventListener[] = [];
  private maxSize: number;
  private name: string;

  constructor(options: { maxSize?: number; name?: string } = {}) {
    this.maxSize = options.maxSize ?? 100;
    this.name = options.name ?? 'TTLCache';
  }

  /**
   * Get a value from cache
   * Returns undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.emit({ type: 'miss', key, timestamp: Date.now() });
      return undefined;
    }
    
    const age = Date.now() - entry.timestamp;
    
    // Check if completely expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      this.stats.evictions++;
      this.stats.misses++;
      this.emit({ type: 'evict', key, timestamp: Date.now() });
      return undefined;
    }
    
    // Check if stale (but still valid)
    if (entry.staleTime && age > entry.staleTime) {
      this.stats.staleHits++;
      this.emit({ type: 'stale', key, timestamp: Date.now() });
      return entry.data as T;
    }
    
    this.stats.hits++;
    this.emit({ type: 'hit', key, timestamp: Date.now() });
    return entry.data as T;
  }

  /**
   * Check if a key exists and is fresh (not stale)
   */
  isFresh(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) return false;
    if (entry.staleTime && age > entry.staleTime) return false;
    
    return true;
  }

  /**
   * Check if a key exists and is valid (fresh or stale, but not expired)
   */
  isValid(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const age = Date.now() - entry.timestamp;
    return age <= entry.ttl;
  }

  /**
   * Check if a key is stale (past staleTime but before ttl)
   */
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) return false;
    
    return entry.staleTime ? age > entry.staleTime : false;
  }

  /**
   * Set a value in cache with TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttlMs Time to live in milliseconds
   * @param staleTimeMs Optional stale time (for stale-while-revalidate pattern)
   */
  set<T>(key: string, data: T, ttlMs: number, staleTimeMs?: number): void {
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      staleTime: staleTimeMs,
    });
    
    this.emit({ type: 'set', key, timestamp: Date.now() });
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.emit({ type: 'evict', key, timestamp: Date.now() });
    }
    return existed;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    const keys = Array.from(this.cache.keys());
    this.cache.clear();
    
    for (const key of keys) {
      this.emit({ type: 'clear', key, timestamp: Date.now() });
    }
    
    console.log(`[${this.name}] Cache cleared (${keys.length} entries)`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { size: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get age of a cached entry in milliseconds
   */
  getAge(key: string): number | null {
    const entry = this.cache.get(key);
    return entry ? Date.now() - entry.timestamp : null;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: CacheEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Evict oldest entry to make room
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.emit({ type: 'evict', key: oldestKey, timestamp: Date.now() });
    }
  }

  private emit(event: CacheEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error(`[${this.name}] Cache event listener error:`, e);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCES FOR DIFFERENT DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cache for Convex query data (knowledge, enforcement rules, etc.)
 * Higher max size since we cache multiple ecosystem/channel combinations
 */
export const queryCache = new TTLCache({ maxSize: 50, name: 'QueryCache' });

/**
 * Cache for user-specific data (profiles, corrections)
 */
export const userCache = new TTLCache({ maxSize: 20, name: 'UserCache' });

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a cache key for knowledge queries
 */
export function knowledgeCacheKey(ecosystem: string, channel: string): string {
  return `knowledge:${ecosystem}:${channel}`;
}

/**
 * Generate a cache key for token enforcement rules
 */
export function enforcementCacheKey(): string {
  return 'enforcement:rules';
}

/**
 * Generate a cache key for training examples
 */
export function examplesCacheKey(ecosystem: string, channel: string): string {
  return `examples:${ecosystem}:${channel}`;
}

/**
 * Generate a cache key for directive overrides
 */
export function directivesCacheKey(ecosystem: string, channel: string): string {
  return `directives:${ecosystem}:${channel}`;
}

/**
 * Generate a cache key for user profile
 */
export function userProfileCacheKey(deviceId: string): string {
  return `profile:${deviceId}`;
}

/**
 * Generate a cache key for corrections
 */
export function correctionsCacheKey(ecosystem: string, channel: string): string {
  return `corrections:${ecosystem}:${channel}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TTL CONSTANTS (centralized for easy tuning)
// ═══════════════════════════════════════════════════════════════════════════════

export const CACHE_TTL = {
  /** Knowledge data - changes rarely, 5 min TTL */
  KNOWLEDGE: 5 * 60 * 1000,
  /** Token enforcement rules - critical, 10 min TTL */
  ENFORCEMENT: 10 * 60 * 1000,
  /** Training examples - semi-static, 15 min TTL */
  EXAMPLES: 15 * 60 * 1000,
  /** Directive overrides - admin managed, 10 min TTL */
  DIRECTIVES: 10 * 60 * 1000,
  /** User profile - personal, 5 min TTL */
  USER_PROFILE: 5 * 60 * 1000,
  /** Corrections - user feedback, 5 min TTL */
  CORRECTIONS: 5 * 60 * 1000,
} as const;

/**
 * Stale times for stale-while-revalidate pattern
 * Data becomes "stale" after this time but is still served while revalidating
 */
export const CACHE_STALE = {
  KNOWLEDGE: 2 * 60 * 1000,
  ENFORCEMENT: 5 * 60 * 1000,
  EXAMPLES: 10 * 60 * 1000,
  DIRECTIVES: 5 * 60 * 1000,
  USER_PROFILE: 2 * 60 * 1000,
  CORRECTIONS: 2 * 60 * 1000,
} as const;

// Log cache initialization
console.log('[Cache] TTL Cache utility initialized', {
  queryCacheMaxSize: 50,
  userCacheMaxSize: 20,
  ttls: CACHE_TTL,
});
