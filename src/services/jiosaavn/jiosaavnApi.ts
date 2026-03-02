/**
 * JioSaavn API Client
 * 
 * Client-side service for fetching JioSaavn search results via our proxy endpoint.
 * Includes caching, error handling, and response transformation.
 */

import type {
  JioSaavnGlobalSearchResponse,
  JioSaavnSong,
  JioSaavnPlaylist,
  JioSaavnArtist,
  JioSaavnAlbum,
  ExplorationItem,
  ExplorationData,
} from './types';

const API_ENDPOINT = '/api/jiosaavn';
const DEFAULT_LIMIT = 5;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  data: JioSaavnGlobalSearchResponse;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();

function getCacheKey(query: string, limit: number): string {
  return `${query.toLowerCase().trim()}:${limit}`;
}

function getFromCache(key: string): JioSaavnGlobalSearchResponse | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCache(key: string, data: JioSaavnGlobalSearchResponse): void {
  if (searchCache.size > 50) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  
  searchCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function clearSearchCache(): void {
  searchCache.clear();
}

function getBestImageUrl(images: { quality: string; url: string }[]): string {
  if (!images || images.length === 0) {
    return '';
  }
  
  const preferredQualities = ['500x500', '150x150', '50x50'];
  
  for (const quality of preferredQualities) {
    const match = images.find(img => img.quality === quality);
    if (match) return match.url;
  }
  
  return images[images.length - 1].url;
}

function formatArtistNames(artists: JioSaavnArtist[]): string {
  if (!artists || artists.length === 0) return '';
  
  const names = artists.slice(0, 3).map(a => a.name);
  if (artists.length > 3) {
    return `${names.join(', ')} +${artists.length - 3}`;
  }
  return names.join(', ');
}

function transformSongToItem(song: JioSaavnSong): ExplorationItem {
  return {
    id: song.id,
    type: 'song',
    name: song.name,
    subtitle: formatArtistNames(song.artists?.primary || []),
    imageUrl: getBestImageUrl(song.image),
    jiosaavnUrl: song.url,
  };
}

function transformPlaylistToItem(playlist: JioSaavnPlaylist): ExplorationItem {
  const songCount = playlist.songCount ? `${playlist.songCount} songs` : '';
  return {
    id: playlist.id,
    type: 'playlist',
    name: playlist.name,
    subtitle: songCount,
    imageUrl: getBestImageUrl(playlist.image),
    jiosaavnUrl: playlist.url,
  };
}

function transformArtistToItem(artist: JioSaavnArtist): ExplorationItem {
  return {
    id: artist.id,
    type: 'artist',
    name: artist.name,
    subtitle: 'Artist',
    imageUrl: getBestImageUrl(artist.image),
    jiosaavnUrl: artist.url,
  };
}

function transformAlbumToItem(album: JioSaavnAlbum): ExplorationItem {
  const artistNames = formatArtistNames(album.artists?.primary || []);
  const year = album.year ? ` (${album.year})` : '';
  return {
    id: album.id,
    type: 'album',
    name: album.name,
    subtitle: `${artistNames}${year}`,
    imageUrl: getBestImageUrl(album.image),
    jiosaavnUrl: album.url,
  };
}

export interface SearchOptions {
  limit?: number;
  signal?: AbortSignal;
}

export interface SearchResult {
  success: boolean;
  data: ExplorationData | null;
  error?: string;
  errorCode?: string;
}

export async function searchJioSaavn(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const { limit = DEFAULT_LIMIT, signal } = options;
  
  if (!query || query.trim().length === 0) {
    return {
      success: false,
      data: null,
      error: 'Empty search query',
      errorCode: 'EMPTY_QUERY',
    };
  }
  
  const trimmedQuery = query.trim();
  const cacheKey = getCacheKey(trimmedQuery, limit);
  
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log(`[JioSaavn] Cache hit for: "${trimmedQuery}"`);
    return {
      success: true,
      data: transformResponse(cached, trimmedQuery),
    };
  }
  
  try {
    const url = new URL(API_ENDPOINT, window.location.origin);
    url.searchParams.set('query', trimmedQuery);
    url.searchParams.set('limit', limit.toString());
    
    console.log(`[JioSaavn] Fetching: "${trimmedQuery}"`);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      console.error(`[JioSaavn] API error: ${response.status}`, errorData);
      
      return {
        success: false,
        data: null,
        error: errorData.error || `HTTP ${response.status}`,
        errorCode: errorData.code || 'HTTP_ERROR',
      };
    }
    
    const data: JioSaavnGlobalSearchResponse = await response.json();
    
    if (!data.success || !data.data) {
      return {
        success: false,
        data: null,
        error: 'Invalid response structure',
        errorCode: 'INVALID_RESPONSE',
      };
    }
    
    setCache(cacheKey, data);
    
    return {
      success: true,
      data: transformResponse(data, trimmedQuery),
    };
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        data: null,
        error: 'Request cancelled',
        errorCode: 'ABORTED',
      };
    }
    
    console.error('[JioSaavn] Fetch error:', error);
    
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'FETCH_ERROR',
    };
  }
}

function transformResponse(
  response: JioSaavnGlobalSearchResponse,
  query: string
): ExplorationData {
  const items: ExplorationItem[] = [];
  
  const playlists = response.data.playlists?.results || [];
  for (const playlist of playlists) {
    items.push(transformPlaylistToItem(playlist));
  }
  
  const songs = response.data.songs?.results || [];
  for (const song of songs) {
    items.push(transformSongToItem(song));
  }
  
  const artists = response.data.artists?.results || [];
  for (const artist of artists) {
    items.push(transformArtistToItem(artist));
  }
  
  const albums = response.data.albums?.results || [];
  for (const album of albums) {
    items.push(transformAlbumToItem(album));
  }
  
  return {
    query,
    items,
    timestamp: Date.now(),
  };
}

export const jiosaavnApi = {
  search: searchJioSaavn,
  clearCache: clearSearchCache,
};
