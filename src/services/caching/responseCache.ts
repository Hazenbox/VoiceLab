/**
 * LRU Response Cache
 * Caches LLM responses to reduce costs and improve latency
 */

import type { LLMMessage, LLMUsageMetrics } from '../providers/llm/types';

export interface CacheConfig {
  maxSize: number;
  ttlMs: number;
  enabled: boolean;
}

export interface CachedResponse {
  content: string;
  usage: LLMUsageMetrics;
  cachedAt: number;
}

export class ResponseCache {
  private cache: Map<string, CachedResponse> = new Map();
  private accessOrder: string[] = [];
  private hits = 0;
  private misses = 0;
  private config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: config?.maxSize ?? 100,
      ttlMs: config?.ttlMs ?? 3600000, // 1 hour
      enabled: config?.enabled ?? true,
    };
  }

  get(key: string): CachedResponse | null {
    if (!this.config.enabled) {
      this.misses++;
      return null;
    }

    const cached = this.cache.get(key);
    if (!cached) {
      this.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - cached.cachedAt > this.config.ttlMs) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.misses++;
      return null;
    }

    // Update access order (LRU)
    this.updateAccessOrder(key);
    this.hits++;
    
    console.log(`[ResponseCache] Cache HIT (hit rate: ${this.getHitRate().toFixed(2)}%)`);
    
    return cached;
  }

  set(key: string, response: Omit<CachedResponse, 'cachedAt'>): void {
    if (!this.config.enabled) return;

    // Evict oldest if at capacity
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      const oldest = this.accessOrder[0];
      if (oldest) {
        this.cache.delete(oldest);
        this.accessOrder.shift();
        console.log(`[ResponseCache] Evicted oldest entry: ${oldest.substring(0, 8)}...`);
      }
    }

    this.cache.set(key, {
      ...response,
      cachedAt: Date.now(),
    });
    
    this.updateAccessOrder(key);
    
    console.log(
      `[ResponseCache] Cached response (size: ${this.cache.size}/${this.config.maxSize})`
    );
  }

  generateKey(
    messages: LLMMessage[], 
    options: { temperature?: number; maxTokens?: number }
  ): string {
    // Create stable hash from messages and options
    const data = JSON.stringify({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });
    
    return this.hashCode(data);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
    console.log('[ResponseCache] Cache cleared');
  }

  invalidateByPattern(pattern: RegExp): number {
    let count = 0;
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      count++;
    });

    console.log(`[ResponseCache] Invalidated ${count} entries matching pattern`);
    return count;
  }

  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    hits: number;
    misses: number;
    enabled: boolean;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.getHitRate(),
      hits: this.hits,
      misses: this.misses,
      enabled: this.config.enabled,
    };
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
    console.log(`[ResponseCache] Cache ${enabled ? 'enabled' : 'disabled'}`);
  }

  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    
    // If size was reduced, evict excess entries
    while (this.cache.size > this.config.maxSize) {
      const oldest = this.accessOrder[0];
      if (oldest) {
        this.cache.delete(oldest);
        this.accessOrder.shift();
      }
    }
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
