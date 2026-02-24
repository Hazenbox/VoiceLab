/**
 * useVisibilityPause Hook
 * 
 * PHASE 3: Pauses polling/queries when tab is not visible.
 * Reduces unnecessary Convex calls when user is not actively viewing.
 * 
 * Usage:
 * ```tsx
 * const { isVisible, isPaused } = useVisibilityPause();
 * 
 * // Skip queries when paused
 * const data = useQuery(api.something, isPaused ? 'skip' : { ... });
 * ```
 * 
 * @module hooks/useVisibilityPause
 */

import { useState, useEffect, useCallback } from 'react';

interface UseVisibilityPauseOptions {
  /** Delay before considering tab as "paused" (ms). Default: 1000 */
  pauseDelayMs?: number;
  /** Resume immediately on visibility, or with delay. Default: 0 (immediate) */
  resumeDelayMs?: number;
  /** Callback when visibility changes */
  onVisibilityChange?: (isVisible: boolean) => void;
  /** Callback when pause state changes */
  onPauseChange?: (isPaused: boolean) => void;
}

interface UseVisibilityPauseReturn {
  /** Whether the tab is currently visible */
  isVisible: boolean;
  /** Whether queries should be paused (visible=false for longer than pauseDelay) */
  isPaused: boolean;
  /** Manually trigger a refresh (useful after long pause) */
  triggerRefresh: () => void;
  /** Number of times the tab has become visible */
  visibilityCount: number;
  /** Time spent paused in this session (ms) */
  totalPausedTime: number;
}

export function useVisibilityPause(options: UseVisibilityPauseOptions = {}): UseVisibilityPauseReturn {
  const {
    pauseDelayMs = 1000,
    resumeDelayMs = 0,
    onVisibilityChange,
    onPauseChange,
  } = options;

  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === 'undefined') return true;
    return document.visibilityState === 'visible';
  });
  
  const [isPaused, setIsPaused] = useState(false);
  const [visibilityCount, setVisibilityCount] = useState(0);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    console.log('[useVisibilityPause] Manual refresh triggered');
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    let pauseTimer: ReturnType<typeof setTimeout> | null = null;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      
      // Clear any pending timers
      if (pauseTimer) {
        clearTimeout(pauseTimer);
        pauseTimer = null;
      }
      if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
      }

      setIsVisible(visible);
      onVisibilityChange?.(visible);

      if (visible) {
        // Tab became visible
        setVisibilityCount(prev => prev + 1);
        
        // Calculate paused time
        if (pauseStartTime) {
          const pauseDuration = Date.now() - pauseStartTime;
          setTotalPausedTime(prev => prev + pauseDuration);
          setPauseStartTime(null);
        }
        
        // Resume with optional delay
        if (resumeDelayMs > 0) {
          resumeTimer = setTimeout(() => {
            setIsPaused(false);
            onPauseChange?.(false);
          }, resumeDelayMs);
        } else {
          setIsPaused(false);
          onPauseChange?.(false);
        }
        
        console.log('[useVisibilityPause] Tab visible, resuming queries');
      } else {
        // Tab became hidden - pause after delay
        pauseTimer = setTimeout(() => {
          setIsPaused(true);
          setPauseStartTime(Date.now());
          onPauseChange?.(true);
          console.log('[useVisibilityPause] Tab hidden, pausing queries');
        }, pauseDelayMs);
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also listen for window focus/blur as backup
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        handleVisibilityChange();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (pauseTimer) clearTimeout(pauseTimer);
      if (resumeTimer) clearTimeout(resumeTimer);
    };
  }, [pauseDelayMs, resumeDelayMs, onVisibilityChange, onPauseChange, pauseStartTime]);

  return {
    isVisible,
    isPaused,
    triggerRefresh,
    visibilityCount,
    totalPausedTime,
  };
}

/**
 * Simple hook that just returns visibility state
 * Use when you don't need pause delay logic
 */
export function useDocumentVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === 'undefined') return true;
    return document.visibilityState === 'visible';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
}

/**
 * Hook to track whether the window is currently focused
 */
export function useWindowFocus(): boolean {
  const [isFocused, setIsFocused] = useState(() => {
    if (typeof document === 'undefined') return true;
    return document.hasFocus();
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return isFocused;
}
