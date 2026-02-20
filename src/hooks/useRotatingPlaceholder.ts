import { useState, useEffect, useRef, useCallback } from 'react';

interface UseRotatingPlaceholderOptions {
  placeholders: string[];
  intervalMs?: number;
  /** Pause rotation when true (e.g., user has typed something) */
  paused?: boolean;
}

interface UseRotatingPlaceholderReturn {
  currentText: string;
  /** Changes on each rotation -- use as React key to re-trigger CSS animation */
  animKey: number;
}

export function useRotatingPlaceholder({
  placeholders,
  intervalMs = 1200,
  paused = false,
}: UseRotatingPlaceholderOptions): UseRotatingPlaceholderReturn {
  const [index, setIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (paused || placeholders.length <= 1) {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % placeholders.length);
      setAnimKey((prev) => prev + 1);
    }, intervalMs);

    return clearTimer;
  }, [placeholders.length, intervalMs, paused, clearTimer]);

  useEffect(() => {
    setIndex(0);
    setAnimKey(0);
  }, [placeholders]);

  return {
    currentText: placeholders[index] ?? '',
    animKey,
  };
}
