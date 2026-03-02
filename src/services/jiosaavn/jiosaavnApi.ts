/**
 * JioSaavn API Client
 * 
 * Client-side service for fetching JioSaavn search results via our proxy endpoint.
 * Includes caching, error handling, and response transformation.
 */

import type {
  JioSaavnGlobalSearchResponse,
  JioSaavnPlaylistDetailsResponse,
  JioSaavnSong,
  JioSaavnPlaylist,
  JioSaavnArtist,
  JioSaavnAlbum,
  ExplorationItem,
  ExplorationData,
  PlaylistWithSongs,
  PlaylistExplorationData,
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

/**
 * Get best audio URL from downloadUrl array
 * Prefers higher quality (320kbps > 160kbps > 96kbps)
 */
function getBestAudioUrl(downloadUrls: { quality: string; url: string }[]): string {
  if (!downloadUrls || downloadUrls.length === 0) {
    return '';
  }
  
  const preferredQualities = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];
  
  for (const quality of preferredQualities) {
    const match = downloadUrls.find(dl => dl.quality === quality);
    if (match) return match.url;
  }
  
  return downloadUrls[downloadUrls.length - 1].url;
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
    audioUrl: getBestAudioUrl(song.downloadUrl || []),
    duration: song.duration || undefined,
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
    songCount: playlist.songCount || undefined,
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
  return {
    id: album.id,
    type: 'album',
    name: album.name,
    subtitle: artistNames,
    imageUrl: getBestImageUrl(album.image),
    jiosaavnUrl: album.url,
    year: album.year || undefined,
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

/**
 * Search specifically for songs with streaming URLs
 * Uses /api/jiosaavn/songs endpoint which returns downloadUrl
 */
export async function searchSongsWithAudio(
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
  
  try {
    const url = new URL(`${API_ENDPOINT}/songs`, window.location.origin);
    url.searchParams.set('query', trimmedQuery);
    url.searchParams.set('limit', limit.toString());
    
    console.log(`[JioSaavn] Fetching songs with audio: "${trimmedQuery}"`);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[JioSaavn] Songs API error: ${response.status}`, errorData);
      return {
        success: false,
        data: null,
        error: errorData.error || `HTTP ${response.status}`,
        errorCode: errorData.code || 'HTTP_ERROR',
      };
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data?.results) {
      return {
        success: false,
        data: null,
        error: 'Invalid response structure',
        errorCode: 'INVALID_RESPONSE',
      };
    }
    
    const items: ExplorationItem[] = data.data.results.map((song: JioSaavnSong) => 
      transformSongToItem(song)
    );
    
    return {
      success: true,
      data: {
        query: trimmedQuery,
        items,
        timestamp: Date.now(),
      },
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
    
    console.error('[JioSaavn] Songs fetch error:', error);
    
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'FETCH_ERROR',
    };
  }
}

/**
 * Fetch playlist details with songs
 * Returns playlist info with first N songs including streaming URLs
 */
export async function fetchPlaylistDetails(
  playlistId: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; data: PlaylistWithSongs | null; error?: string }> {
  const { limit = 3, signal } = options;
  
  if (!playlistId || playlistId.trim().length === 0) {
    return {
      success: false,
      data: null,
      error: 'Invalid playlist ID',
    };
  }
  
  try {
    const url = new URL(`${API_ENDPOINT}/playlist`, window.location.origin);
    url.searchParams.set('id', playlistId.trim());
    url.searchParams.set('limit', limit.toString());
    
    console.log(`[JioSaavn] Fetching playlist: ${playlistId}`);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[JioSaavn] Playlist API error: ${response.status}`, errorData);
      return {
        success: false,
        data: null,
        error: errorData.error || `HTTP ${response.status}`,
      };
    }
    
    const data: JioSaavnPlaylistDetailsResponse = await response.json();
    
    if (!data.success || !data.data) {
      return {
        success: false,
        data: null,
        error: 'Invalid response structure',
      };
    }
    
    const playlistData = data.data;
    const songs: ExplorationItem[] = (playlistData.songs || []).map(transformSongToItem);
    
    return {
      success: true,
      data: {
        id: playlistData.id,
        name: playlistData.name,
        imageUrl: getBestImageUrl(playlistData.image),
        jiosaavnUrl: playlistData.url,
        songCount: playlistData.songCount || undefined,
        songs,
      },
    };
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        data: null,
        error: 'Request cancelled',
      };
    }
    
    console.error('[JioSaavn] Playlist fetch error:', error);
    
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search for playlists and fetch their details with songs
 * Returns playlists with embedded songs for the new UI layout
 */
export async function searchPlaylistsWithSongs(
  query: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; data: PlaylistExplorationData | null; error?: string }> {
  const { limit = 5, signal } = options;
  
  if (!query || query.trim().length === 0) {
    return {
      success: false,
      data: null,
      error: 'Empty search query',
    };
  }
  
  const trimmedQuery = query.trim();
  
  try {
    // First, search for playlists
    const searchUrl = new URL(API_ENDPOINT, window.location.origin);
    searchUrl.searchParams.set('query', trimmedQuery);
    searchUrl.searchParams.set('limit', limit.toString());
    
    console.log(`[JioSaavn] Searching playlists for: "${trimmedQuery}"`);
    
    const searchResponse = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal,
    });
    
    if (!searchResponse.ok) {
      return {
        success: false,
        data: null,
        error: `Search failed: HTTP ${searchResponse.status}`,
      };
    }
    
    const searchData: JioSaavnGlobalSearchResponse = await searchResponse.json();
    
    if (!searchData.success || !searchData.data?.playlists?.results) {
      return {
        success: false,
        data: null,
        error: 'No playlists found',
      };
    }
    
    // Get playlist IDs (limit to max 5)
    const playlistResults = searchData.data.playlists.results.slice(0, Math.min(limit, 5));
    
    if (playlistResults.length === 0) {
      return {
        success: true,
        data: {
          query: trimmedQuery,
          playlists: [],
          timestamp: Date.now(),
        },
      };
    }
    
    // Fetch details for each playlist in parallel
    console.log(`[JioSaavn] Fetching ${playlistResults.length} playlist details...`);
    
    const playlistPromises = playlistResults.map(playlist =>
      fetchPlaylistDetails(playlist.id, { limit: 3, signal })
    );
    
    const playlistDetailsResults = await Promise.all(playlistPromises);
    
    // Filter successful results
    const playlists: PlaylistWithSongs[] = playlistDetailsResults
      .filter(result => result.success && result.data)
      .map(result => result.data!);
    
    console.log(`[JioSaavn] Got ${playlists.length} playlists with songs`);
    console.log('[JioSaavn] Returning playlist data:', {
      success: true,
      playlistCount: playlists.length,
      totalSongs: playlists.reduce((sum, p) => sum + p.songs.length, 0),
      playlistNames: playlists.map(p => p.name).slice(0, 3)
    });
    
    return {
      success: true,
      data: {
        query: trimmedQuery,
        playlists,
        timestamp: Date.now(),
      },
    };
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        data: null,
        error: 'Request cancelled',
      };
    }
    
    console.error('[JioSaavn] Playlists search error:', error);
    
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const jiosaavnApi = {
  search: searchJioSaavn,
  searchSongs: searchSongsWithAudio,
  searchPlaylistsWithSongs,
  fetchPlaylist: fetchPlaylistDetails,
  clearCache: clearSearchCache,
};
