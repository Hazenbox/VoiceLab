/**
 * useAbortController Hook
 * Provides request cancellation support for async operations
 */

import { useEffect, useRef, useCallback } from 'react';

interface UseAbortControllerReturn {
  /** @deprecated Use getSignal() instead to avoid stale signal references */
  signal: AbortSignal;
  /** Get the current abort signal - use this after calling reset() */
  getSignal: () => AbortSignal;
  abort: () => void;
  reset: () => void;
  /** @deprecated Use isAborted() function instead */
  isAborted: boolean;
  /** Check if the current signal is aborted */
  getIsAborted: () => boolean;
}

/**
 * Hook for managing AbortController instances
 * Automatically aborts on unmount
 */
export function useAbortController(): UseAbortControllerReturn {
  const controllerRef = useRef<AbortController>(new AbortController());

  // Cleanup on unmount
  useEffect(() => {
    const controller = controllerRef.current;
    
    return () => {
      controller.abort();
    };
  }, []);

  const abort = useCallback(() => {
    controllerRef.current.abort();
    // Create new controller for future requests
    controllerRef.current = new AbortController();
  }, []);

  const reset = useCallback(() => {
    // Abort current if not already aborted
    if (!controllerRef.current.signal.aborted) {
      controllerRef.current.abort();
    }
    // Create fresh controller
    controllerRef.current = new AbortController();
  }, []);

  // Getter function to always get the current signal (avoids stale references)
  const getSignal = useCallback(() => controllerRef.current.signal, []);
  
  // Getter function to check if current signal is aborted
  const getIsAborted = useCallback(() => controllerRef.current.signal.aborted, []);

  return {
    // Keep backward compatibility with deprecated properties
    signal: controllerRef.current.signal,
    // New getter functions that always return current values
    getSignal,
    abort,
    reset,
    isAborted: controllerRef.current.signal.aborted,
    getIsAborted,
  };
}

/**
 * Hook for cancellable fetch operations
 */
export function useCancellableFetch() {
  const { getSignal, abort, reset } = useAbortController();

  const fetchWithAbort = useCallback(async <T>(
    url: string,
    options?: RequestInit
  ): Promise<T> => {
    const response = await fetch(url, {
      ...options,
      signal: getSignal(), // Use getter to get fresh signal
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }, [getSignal]);

  return {
    fetch: fetchWithAbort,
    abort,
    reset,
  };
}

/**
 * Hook for managing multiple abort controllers by key
 */
export function useAbortControllerMap() {
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    const controllers = controllersRef.current;
    
    return () => {
      // Abort all on unmount
      controllers.forEach(controller => controller.abort());
      controllers.clear();
    };
  }, []);

  const getSignal = useCallback((key: string): AbortSignal => {
    // Abort previous request with same key
    const existing = controllersRef.current.get(key);
    if (existing) {
      existing.abort();
    }

    // Create new controller
    const controller = new AbortController();
    controllersRef.current.set(key, controller);
    return controller.signal;
  }, []);

  const abort = useCallback((key: string) => {
    const controller = controllersRef.current.get(key);
    if (controller) {
      controller.abort();
      controllersRef.current.delete(key);
    }
  }, []);

  const abortAll = useCallback(() => {
    controllersRef.current.forEach(controller => controller.abort());
    controllersRef.current.clear();
  }, []);

  return {
    getSignal,
    abort,
    abortAll,
  };
}
