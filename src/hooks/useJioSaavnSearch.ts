/**
 * useJioSaavnSearch Hook
 * 
 * React hook for fetching JioSaavn search results with:
 * - Automatic music topic detection
 * - Debounced API calls
 * - Request cancellation on unmount
 * - Loading and error states
 * - Songs with streaming URLs for in-browser playback
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { jiosaavnApi } from '../services/jiosaavn/jiosaavnApi';
import { detectMusicTopic } from '../services/jiosaavn/musicTopicDetector';
import type { ExplorationData, MusicTopicResult, ExplorationItem, PlaylistExplorationData } from '../services/jiosaavn/types';

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
      // Fetch both global search (for playlists, artists, albums) and songs (for streaming URLs)
      const [globalResult, songsResult] = await Promise.all([
        jiosaavnApi.search(query, {
          limit,
          signal: abortControllerRef.current.signal,
        }),
        jiosaavnApi.searchSongs(query, {
          limit,
          signal: abortControllerRef.current.signal,
        }),
      ]);
      
      if (globalResult.success && globalResult.data) {
        // Merge songs with audio URLs into the global results
        const mergedItems: ExplorationItem[] = [];
        const songsWithAudio = songsResult.success && songsResult.data 
          ? songsResult.data.items 
          : [];
        
        // Create a map of songs with audio URLs by ID
        const songsMap = new Map<string, ExplorationItem>();
        for (const song of songsWithAudio) {
          songsMap.set(song.id, song);
        }
        
        // Process global results, replacing songs with versions that have audio URLs
        for (const item of globalResult.data.items) {
          if (item.type === 'song' && songsMap.has(item.id)) {
            mergedItems.push(songsMap.get(item.id)!);
          } else if (item.type === 'song') {
            // If song not in songsMap, try to find a matching one by name
            const matchingSong = songsWithAudio.find(s => 
              s.name.toLowerCase() === item.name.toLowerCase()
            );
            mergedItems.push(matchingSong || item);
          } else {
            mergedItems.push(item);
          }
        }
        
        // Add any songs with audio that weren't in global results
        for (const song of songsWithAudio) {
          if (!mergedItems.some(i => i.id === song.id)) {
            mergedItems.push(song);
          }
        }
        
        setData({
          query: globalResult.data.query,
          items: mergedItems.slice(0, limit * 4), // Limit total items
          timestamp: Date.now(),
        });
        setError(null);
      } else if (globalResult.errorCode !== 'ABORTED') {
        setError(globalResult.error || 'Failed to fetch');
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
    
    // Skip if we already fetched this query
    if (query === lastQueryRef.current) {
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
  }, [enabled, musicTopic, fetchData]);
  
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

/**
 * Hook for fetching playlists with embedded songs
 * Used by the new playlist-focused UI
 */
export interface UsePlaylistSearchReturn {
  data: PlaylistExplorationData | null;
  isLoading: boolean;
  error: string | null;
  musicTopic: MusicTopicResult | null;
  refetch: () => void;
}

export function usePlaylistSearch(
  content: string,
  options: UseJioSaavnSearchOptions = {}
): UsePlaylistSearchReturn {
  const { enabled = true, limit = 5 } = options;
  
  const [data, setData] = useState<PlaylistExplorationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>('');
  
  const musicTopic = useMemo(() => {
    if (!content || !enabled) return null;
    return detectMusicTopic(content);
  }, [content, enabled]);
  
  // Debug: Log when music topic changes
  useEffect(() => {
    console.log('[usePlaylistSearch] Music topic changed:', {
      detected: musicTopic?.detected,
      query: musicTopic?.searchQuery,
      confidence: musicTopic?.confidence?.toFixed(2)
    });
  }, [musicTopic]);
  
  const fetchData = useCallback(async (query: string) => {
    console.log('[usePlaylistSearch] fetchData called with query:', query);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await jiosaavnApi.searchPlaylistsWithSongs(query, {
        limit: Math.min(limit, 5),
        signal: abortControllerRef.current.signal,
      });
      
      console.log('[usePlaylistSearch] API result:', {
        success: result.success,
        playlistCount: result.data?.playlists?.length,
        error: result.error
      });
      
      if (result.success && result.data) {
        setData(result.data);
        setError(null);
      } else if (result.error !== 'Request cancelled') {
        setError(result.error || 'Failed to fetch playlists');
        setData(null);
      }
    } catch (err) {
      console.error('[usePlaylistSearch] Fetch error:', err);
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
      console.log('[usePlaylistSearch] Fetch skipped:', {
        enabled,
        detected: musicTopic?.detected,
        hasQuery: !!musicTopic?.searchQuery
      });
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    
    const query = musicTopic.searchQuery;
    
    // Skip if we already fetched this query
    if (query === lastQueryRef.current) {
      console.log('[usePlaylistSearch] Query unchanged, skipping fetch:', query);
      return;
    }
    
    console.log('[usePlaylistSearch] Starting fetch for:', query);
    lastQueryRef.current = query;
    
    debounceTimerRef.current = setTimeout(() => {
      fetchData(query);
    }, DEBOUNCE_MS);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, musicTopic, fetchData]);
  
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
