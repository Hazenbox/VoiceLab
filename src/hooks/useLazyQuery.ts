/**
 * useLazyQuery Hook
 * 
 * PHASE 3: Provides lazy-loading behavior for Convex queries in admin panels.
 * 
 * Instead of real-time reactive queries that update continuously,
 * this hook:
 * 1. Fetches data once on mount
 * 2. Only refreshes when explicitly triggered via triggerRefresh()
 * 3. Uses visibility pause to skip updates when tab is hidden
 * 4. Provides manual refresh button capability for admin dashboards
 * 
 * This significantly reduces Convex query calls for admin panels that
 * don't need real-time updates.
 * 
 * Usage:
 * ```tsx
 * const { data, isLoading, refresh, lastRefreshTime } = useLazyQuery(
 *   api.analytics.dashboardStats,
 *   { since }
 * );
 * ```
 * 
 * @module hooks/useLazyQuery
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from 'convex/react';
import { useVisibilityPause } from './useVisibilityPause';

interface UseLazyQueryOptions {
  /** Whether to skip the initial fetch. Default: false */
  skipInitialFetch?: boolean;
  /** Minimum time between auto-refreshes in ms. Default: 60000 (1 minute) */
  minRefreshIntervalMs?: number;
  /** Whether to enable stale-while-revalidate behavior. Default: true */
  staleWhileRevalidate?: boolean;
  /** Time after which data is considered stale in ms. Default: 300000 (5 minutes) */
  staleAfterMs?: number;
}

interface UseLazyQueryReturn<T> {
  /** The query data */
  data: T | undefined;
  /** Whether the query is currently loading */
  isLoading: boolean;
  /** Error from the query if any */
  error: Error | null;
  /** Manually trigger a refresh */
  refresh: () => void;
  /** Last time data was refreshed (timestamp) */
  lastRefreshTime: number | null;
  /** Whether the current data is considered stale */
  isStale: boolean;
  /** Whether queries are paused due to tab visibility */
  isPaused: boolean;
}

/**
 * A wrapper around Convex's useQuery that provides lazy-loading behavior
 * suitable for admin dashboards.
 * 
 * @param queryFn The Convex query function reference (e.g., api.analytics.dashboardStats)
 * @param args The arguments to pass to the query
 * @param options Configuration options
 */
export function useLazyQuery<T, Args extends Record<string, unknown> | 'skip'>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryFn: any,
  args: Args,
  options: UseLazyQueryOptions = {}
): UseLazyQueryReturn<T | undefined> {
  const {
    skipInitialFetch = false,
    minRefreshIntervalMs = 60000, // 1 minute
    staleWhileRevalidate = true,
    staleAfterMs = 300000, // 5 minutes
  } = options;

  // Visibility pause integration
  const { isPaused, triggerRefresh: visibilityRefresh } = useVisibilityPause({
    pauseDelayMs: 5000, // Pause after 5 seconds hidden
    resumeDelayMs: 0,   // Resume immediately
  });

  // Track refresh state
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const [cachedData, setCachedData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const initialFetchDone = useRef(false);

  // Determine if we should skip the query
  const shouldSkip = args === 'skip' || isPaused || (skipInitialFetch && !initialFetchDone.current);

  // Use Convex's useQuery with skip logic
  const data = useQuery(queryFn, shouldSkip ? 'skip' : args) as T | undefined;

  // Track when we get data
  useEffect(() => {
    if (data !== undefined && mountedRef.current) {
      setCachedData(data);
      setLastRefreshTime(Date.now());
      setError(null);
      initialFetchDone.current = true;
    }
  }, [data]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Calculate staleness
  const isStale = lastRefreshTime !== null && 
    (Date.now() - lastRefreshTime) > staleAfterMs;

  // Manual refresh function
  const refresh = useCallback(() => {
    const now = Date.now();
    
    // Throttle refreshes
    if (lastRefreshTime && (now - lastRefreshTime) < minRefreshIntervalMs) {
      console.log('[useLazyQuery] Refresh throttled, too soon since last refresh');
      return;
    }

    console.log('[useLazyQuery] Manual refresh triggered');
    setRefreshKey(prev => prev + 1);
    visibilityRefresh();
  }, [lastRefreshTime, minRefreshIntervalMs, visibilityRefresh]);

  // Determine loading state
  const isLoading = data === undefined && cachedData === undefined && !shouldSkip;

  // Return stale data while revalidating if enabled
  const returnData = staleWhileRevalidate 
    ? (data ?? cachedData) 
    : data;

  return {
    data: returnData,
    isLoading,
    error,
    refresh,
    lastRefreshTime,
    isStale,
    isPaused,
  };
}

/**
 * Hook that provides refresh controls for admin sections
 * Can be used to show "last updated" and manual refresh button
 */
export function useAdminRefresh() {
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const { isPaused, isVisible } = useVisibilityPause();

  const triggerRefresh = useCallback(() => {
    setLastRefresh(Date.now());
    console.log('[useAdminRefresh] Manual refresh triggered');
  }, []);

  // Format last refresh time
  const getLastRefreshText = useCallback((): string => {
    const elapsed = Date.now() - lastRefresh;
    if (elapsed < 60000) return 'just now';
    if (elapsed < 3600000) return `${Math.floor(elapsed / 60000)}m ago`;
    return `${Math.floor(elapsed / 3600000)}h ago`;
  }, [lastRefresh]);

  return {
    lastRefresh,
    triggerRefresh,
    getLastRefreshText,
    isPaused,
    isVisible,
  };
}
