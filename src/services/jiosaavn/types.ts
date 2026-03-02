/**
 * JioSaavn API Types
 * 
 * Type definitions for the unofficial JioSaavn API (saavn.sumit.co).
 * These types match the API response structure for search endpoints.
 */

/**
 * Image quality variants from JioSaavn API.
 * Available qualities: '50x50', '150x150', '500x500'
 */
export interface JioSaavnImage {
  quality: string;
  url: string;
}

/**
 * Artist information (used in songs, albums, and as standalone results)
 */
export interface JioSaavnArtist {
  id: string;
  name: string;
  role?: string;
  type: 'artist';
  image: JioSaavnImage[];
  url: string;
}

/**
 * Album reference (used within song results)
 */
export interface JioSaavnAlbumRef {
  id: string | null;
  name: string | null;
  url: string | null;
}

/**
 * Song result from search
 */
export interface JioSaavnSong {
  id: string;
  name: string;
  type: 'song';
  year: string | null;
  releaseDate: string | null;
  duration: number | null;
  label: string | null;
  explicitContent: boolean;
  playCount: number | null;
  language: string;
  hasLyrics: boolean;
  lyricsId: string | null;
  url: string;
  copyright: string | null;
  album: JioSaavnAlbumRef;
  artists: {
    primary: JioSaavnArtist[];
    featured: JioSaavnArtist[];
    all: JioSaavnArtist[];
  };
  image: JioSaavnImage[];
  downloadUrl: JioSaavnImage[];
}

/**
 * Playlist result from search
 */
export interface JioSaavnPlaylist {
  id: string;
  name: string;
  type: 'playlist';
  image: JioSaavnImage[];
  url: string;
  songCount: number | null;
  language: string;
  explicitContent: boolean;
}

/**
 * Album result from search
 */
export interface JioSaavnAlbum {
  id: string;
  name: string;
  description: string;
  year: string | null;
  type: 'album';
  playCount: number | null;
  language: string;
  explicitContent: boolean;
  artists: {
    primary: JioSaavnArtist[];
    featured: JioSaavnArtist[];
    all: JioSaavnArtist[];
  };
  url: string;
  image: JioSaavnImage[];
}

/**
 * Search result category with position for ranking
 */
export interface JioSaavnSearchCategory<T> {
  results: T[];
  position: number;
}

/**
 * Global search response from /api/search
 */
export interface JioSaavnGlobalSearchResponse {
  success: boolean;
  data: {
    songs: JioSaavnSearchCategory<JioSaavnSong>;
    playlists: JioSaavnSearchCategory<JioSaavnPlaylist>;
    artists: JioSaavnSearchCategory<JioSaavnArtist>;
    albums: JioSaavnSearchCategory<JioSaavnAlbum>;
    topQuery: JioSaavnSearchCategory<JioSaavnSong>;
  };
}

/**
 * Type-specific search response (songs, playlists, albums, artists)
 */
export interface JioSaavnTypeSearchResponse<T> {
  success: boolean;
  data: {
    total: number;
    start: number;
    results: T[];
  };
}

/**
 * Music topic detection result
 */
export interface MusicTopicResult {
  /** Whether music content was detected */
  detected: boolean;
  /** Extracted search query for JioSaavn */
  searchQuery: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Keywords that triggered detection */
  matchedKeywords: string[];
}

/**
 * Unified exploration item for UI rendering
 */
export interface ExplorationItem {
  id: string;
  type: 'song' | 'playlist' | 'artist' | 'album';
  name: string;
  subtitle: string;
  imageUrl: string;
  jiosaavnUrl: string;
  /** Streaming URL for songs (from downloadUrl) */
  audioUrl?: string;
  /** Duration in seconds (for songs) */
  duration?: number;
  /** Song count (for playlists/albums) */
  songCount?: number;
  /** Year of release (for albums) */
  year?: string;
}

/**
 * Exploration data for a message
 */
export interface ExplorationData {
  query: string;
  items: ExplorationItem[];
  timestamp: number;
}

/**
 * Playlist with songs for the new UI layout
 */
export interface PlaylistWithSongs {
  id: string;
  name: string;
  imageUrl: string;
  jiosaavnUrl: string;
  songCount?: number;
  songs: ExplorationItem[];
}

/**
 * Playlist details response from /api/playlists
 */
export interface JioSaavnPlaylistDetailsResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    description?: string;
    type: 'playlist';
    year?: string | null;
    playCount?: number | null;
    language: string;
    explicitContent: boolean;
    url: string;
    songCount?: number | null;
    image: JioSaavnImage[];
    songs: JioSaavnSong[];
  };
}

/**
 * Exploration data with playlists containing songs
 */
export interface PlaylistExplorationData {
  query: string;
  playlists: PlaylistWithSongs[];
  timestamp: number;
}
