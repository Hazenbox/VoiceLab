/**
 * useJioSaavnSearch Hook
 * 
 * React hook for fetching JioSaavn search results with:
 * - Automatic music topic detection
 * - Debounced API calls
 * - Request cancellation on unmount
 * - Loading and error states
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { jiosaavnApi, type SearchResult } from '../services/jiosaavn/jiosaavnApi';
import { detectMusicTopic } from '../services/jiosaavn/musicTopicDetector';
import type { ExplorationData, MusicTopicResult } from '../services/jiosaavn/types';

const DEBOUNCE_MS = 300;

export interface UseJioSaavnSearchOptions {
  enabled?: boolean;
  limit?: number;
}

export interface UseJioSaavnSearchReturn {
  data: ExplorationData | null;
  isLoading: boolean;
  error: string | null;
  musicTopic: MusicTopicResult | null;
  refetch: () => void;
}

export function useJioSaavnSearch(
  content: string,
  options: UseJioSaavnSearchOptions = {}
): UseJioSaavnSearchReturn {
  const { enabled = true, limit = 5 } = options;
  
  const [data, setData] = useState<ExplorationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>('');
  
  const musicTopic = useMemo(() => {
    if (!content || !enabled) return null;
    return detectMusicTopic(content);
  }, [content, enabled]);
  
  const fetchData = useCallback(async (query: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await jiosaavnApi.search(query, {
        limit,
        signal: abortControllerRef.current.signal,
      });
      
      if (result.success && result.data) {
        setData(result.data);
        setError(null);
      } else if (result.errorCode !== 'ABORTED') {
        setError(result.error || 'Failed to fetch');
        setData(null);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
        setData(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [limit]);
  
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    if (!enabled || !musicTopic?.detected || !musicTopic.searchQuery) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    
    const query = musicTopic.searchQuery;
    
    if (query === lastQueryRef.current && data) {
      return;
    }
    
    lastQueryRef.current = query;
    
    debounceTimerRef.current = setTimeout(() => {
      fetchData(query);
    }, DEBOUNCE_MS);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, musicTopic, fetchData, data]);
  
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  const refetch = useCallback(() => {
    if (musicTopic?.detected && musicTopic.searchQuery) {
      fetchData(musicTopic.searchQuery);
    }
  }, [musicTopic, fetchData]);
  
  return {
    data,
    isLoading,
    error,
    musicTopic,
    refetch,
  };
}

export default useJioSaavnSearch;
