/**
 * useSystemHealth Hook
 * 
 * PHASE 6: Provides system health monitoring and observability.
 * 
 * Tracks:
 * - Queue health (offline event queue depth, oldest event age)
 * - Circuit breaker states for all domains
 * - Cache statistics (hit rate, size, evictions)
 * - Recent sync errors
 * 
 * Updates every 30 seconds by default.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCircuitBreakerManager, type CircuitState } from '../services/reliability/circuitBreaker';
import * as queueStorage from '../services/sync/queueStorage';
import { queryCache } from '../lib/cache';

export interface QueueHealth {
  depth: number;
  oldestEventAge: number | null;
  maxQueueSize: number;
  utilizationPercent: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  consecutiveSuccesses: number;
  openedAt?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

export interface SyncError {
  timestamp: number;
  domain: string;
  message: string;
}

export interface SystemHealth {
  queueHealth: QueueHealth;
  circuitBreakers: Record<string, CircuitBreakerStats>;
  openCircuitCount: number;
  cacheStats: CacheStats;
  recentErrors: SyncError[];
  lastUpdated: number;
}

interface UseSystemHealthOptions {
  refreshIntervalMs?: number;
  maxErrors?: number;
}

const MAX_QUEUE_SIZE = 5000;
const MAX_ERRORS = 10;
const DEFAULT_REFRESH_INTERVAL = 30000;

export function useSystemHealth(options: UseSystemHealthOptions = {}): SystemHealth | null {
  const { 
    refreshIntervalMs = DEFAULT_REFRESH_INTERVAL,
    maxErrors = MAX_ERRORS,
  } = options;
  
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const errorsRef = useRef<SyncError[]>([]);
  const mountedRef = useRef(true);

  const collectHealth = useCallback(async (): Promise<SystemHealth> => {
    const now = Date.now();
    
    // Get queue health
    let queueDepth = 0;
    let oldestEventAge: number | null = null;
    
    try {
      const queue = await queueStorage.getQueue();
      queueDepth = queue.length;
      
      if (queue.length > 0) {
        const oldestTimestamp = Math.min(...queue.map(e => e.timestamp));
        oldestEventAge = now - oldestTimestamp;
      }
    } catch (err) {
      console.warn('[useSystemHealth] Failed to get queue:', err);
    }
    
    const queueHealth: QueueHealth = {
      depth: queueDepth,
      oldestEventAge,
      maxQueueSize: MAX_QUEUE_SIZE,
      utilizationPercent: Math.round((queueDepth / MAX_QUEUE_SIZE) * 100),
    };
    
    // Get circuit breaker stats
    const cbManager = getCircuitBreakerManager();
    const allStats = cbManager.getAllStats();
    const circuitBreakers: Record<string, CircuitBreakerStats> = {};
    
    for (const [domain, stats] of Object.entries(allStats)) {
      circuitBreakers[domain] = {
        state: stats.state,
        failures: stats.failures,
        consecutiveSuccesses: stats.consecutiveSuccesses,
        openedAt: stats.openedAt,
      };
    }
    
    const openCircuitCount = cbManager.getOpenCircuitCount();
    
    // Get cache stats
    let cacheStats: CacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      hitRate: 0,
    };
    
    try {
      const rawStats = queryCache.getStats();
      const total = rawStats.hits + rawStats.misses;
      cacheStats = {
        ...rawStats,
        hitRate: total > 0 ? Math.round((rawStats.hits / total) * 100) : 0,
      };
    } catch (err) {
      console.warn('[useSystemHealth] Failed to get cache stats:', err);
    }
    
    // Get recent errors (from ref to maintain across refreshes)
    const recentErrors = errorsRef.current.slice(-maxErrors);
    
    return {
      queueHealth,
      circuitBreakers,
      openCircuitCount,
      cacheStats,
      recentErrors,
      lastUpdated: now,
    };
  }, [maxErrors]);

  // Record error from anywhere in the app
  const recordError = useCallback((domain: string, message: string) => {
    errorsRef.current.push({
      timestamp: Date.now(),
      domain,
      message: message.slice(0, 200),
    });
    
    // Keep only last N errors
    if (errorsRef.current.length > maxErrors * 2) {
      errorsRef.current = errorsRef.current.slice(-maxErrors);
    }
  }, [maxErrors]);

  // Initial load and refresh interval
  useEffect(() => {
    mountedRef.current = true;
    
    const refresh = async () => {
      if (!mountedRef.current) return;
      try {
        const newHealth = await collectHealth();
        if (mountedRef.current) {
          setHealth(newHealth);
        }
      } catch (err) {
        console.error('[useSystemHealth] Failed to collect health:', err);
      }
    };
    
    refresh();
    
    const interval = setInterval(refresh, refreshIntervalMs);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [collectHealth, refreshIntervalMs]);

  // Listen for circuit breaker state changes
  useEffect(() => {
    const manager = getCircuitBreakerManager();
    
    // Unfortunately the manager doesn't have a proper event system,
    // but we log state changes which could be hooked up in the future.
    // For now, we rely on the polling interval.
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  return health;
}

// Export for manual error recording from other parts of the app
let globalRecordError: ((domain: string, message: string) => void) | null = null;

export function setGlobalErrorRecorder(fn: (domain: string, message: string) => void) {
  globalRecordError = fn;
}

export function recordSyncError(domain: string, message: string) {
  if (globalRecordError) {
    globalRecordError(domain, message);
  }
}
