/**
 * JioSaavnExploration Component
 * 
 * Displays JioSaavn playlists with embedded songs when music topics are detected.
 * Each playlist card shows cover art, 3 playable songs, and a "View playlist" button.
 * 
 * Features:
 * - Auto-detects music topics from message content
 * - Horizontal scrollable playlist cards (max 3-5)
 * - In-browser audio playback for songs
 * - Song rows with play/pause buttons
 * - Loading skeleton state
 */

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { useThemeColors } from '../theme';
import { usePlaylistSearch } from '../hooks/useJioSaavnSearch';
import { DSIcon } from './DSIcon';
import type { ExplorationItem, PlaylistWithSongs } from '../services/jiosaavn/types';

interface JioSaavnExplorationProps {
  messageId: string;
  messageContent: string;
}

const JIOSAAVN_GREEN = '#2bc5b4';

interface AudioPlayerState {
  playingId: string | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const SongRow = memo(function SongRow({
  song,
  theme,
  audioState,
  onPlay,
  onPause,
}: {
  song: ExplorationItem;
  theme: ReturnType<typeof useThemeColors>;
  audioState: AudioPlayerState;
  onPlay: (song: ExplorationItem) => void;
  onPause: () => void;
}) {
  const isCurrentSong = audioState.playingId === song.id;
  const isPlaying = isCurrentSong && audioState.isPlaying;
  const canPlay = song.audioUrl;
  
  const handlePlayClick = useCallback(() => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay(song);
    }
  }, [song, isPlaying, onPlay, onPause]);
  
  const handleOpenLink = useCallback(() => {
    if (song.jiosaavnUrl) {
      window.open(song.jiosaavnUrl, '_blank', 'noopener,noreferrer');
    }
  }, [song.jiosaavnUrl]);
  
  return (
    <div
      className="flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-150 cursor-pointer"
      style={{
        backgroundColor: isCurrentSong ? theme.stroke.low : 'transparent',
      }}
      onClick={handleOpenLink}
      onMouseEnter={(e) => {
        if (!isCurrentSong) {
          e.currentTarget.style.backgroundColor = theme.background.bold;
        }
      }}
      onMouseLeave={(e) => {
        if (!isCurrentSong) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {/* Song thumbnail */}
      {song.imageUrl ? (
        <img
          src={song.imageUrl}
          alt=""
          className="w-10 h-10 rounded object-cover flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div
          className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: theme.stroke.low }}
        >
          <DSIcon name="IcMusic" size="XS" style={{ color: theme.text.low }} />
        </div>
      )}
      
      {/* Song info */}
      <div className="flex-1 min-w-0">
        <p
          className="truncate font-medium"
          style={{
            color: theme.text.high,
            fontSize: '14px',
            lineHeight: '1.3',
          }}
        >
          {song.name}
        </p>
        <p
          className="truncate"
          style={{
            color: theme.text.medium,
            fontSize: '12px',
            lineHeight: '1.3',
          }}
        >
          {song.subtitle}
          {song.duration ? ` - ${formatDuration(song.duration)}` : ''}
        </p>
      </div>
      
      {/* Play button */}
      {canPlay && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePlayClick();
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-150"
          style={{
            backgroundColor: isPlaying ? JIOSAAVN_GREEN : theme.stroke.low,
          }}
          onMouseEnter={(e) => {
            if (!isPlaying) {
              e.currentTarget.style.backgroundColor = theme.stroke.medium;
            }
          }}
          onMouseLeave={(e) => {
            if (!isPlaying) {
              e.currentTarget.style.backgroundColor = theme.stroke.low;
            }
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <DSIcon name="IcPause" size="M" style={{ color: 'white' }} />
          ) : (
            <DSIcon name="IcPlay" size="M" style={{ color: theme.text.high }} />
          )}
        </button>
      )}
    </div>
  );
});

const PlaylistCard = memo(function PlaylistCard({
  playlist,
  theme,
  audioState,
  onPlay,
  onPause,
}: {
  playlist: PlaylistWithSongs;
  theme: ReturnType<typeof useThemeColors>;
  audioState: AudioPlayerState;
  onPlay: (song: ExplorationItem) => void;
  onPause: () => void;
}) {
  const handleViewPlaylist = useCallback(() => {
    if (playlist.jiosaavnUrl) {
      window.open(playlist.jiosaavnUrl, '_blank', 'noopener,noreferrer');
    }
  }, [playlist.jiosaavnUrl]);
  
  return (
    <div
      className="flex-shrink-0 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: theme.background.bold,
        width: '300px',
      }}
    >
      {/* Playlist cover image */}
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        {playlist.imageUrl ? (
          <img
            src={playlist.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: theme.stroke.low }}
          >
            <DSIcon name="IcMusic" size="L" style={{ color: theme.text.low }} />
          </div>
        )}
      </div>
      
      {/* Songs list */}
      <div className="py-2">
        {playlist.songs.slice(0, 3).map((song) => (
          <SongRow
            key={song.id}
            song={song}
            theme={theme}
            audioState={audioState}
            onPlay={onPlay}
            onPause={onPause}
          />
        ))}
      </div>
      
      {/* View playlist button */}
      <div className="px-3 pb-3">
        <button
          onClick={handleViewPlaylist}
          className="w-full py-2.5 px-4 rounded-full text-sm font-medium transition-colors duration-150"
          style={{
            backgroundColor: theme.stroke.low,
            color: theme.text.high,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.stroke.medium;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.stroke.low;
          }}
        >
          View playlist
        </button>
      </div>
    </div>
  );
});

const LoadingSkeleton = memo(function LoadingSkeleton({
  theme,
}: {
  theme: ReturnType<typeof useThemeColors>;
}) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex-shrink-0 rounded-2xl animate-pulse overflow-hidden"
          style={{
            backgroundColor: theme.background.bold,
            width: '300px',
          }}
        >
          {/* Cover skeleton */}
          <div
            className="w-full aspect-[16/9]"
            style={{ backgroundColor: theme.stroke.low }}
          />
          {/* Song rows skeleton */}
          <div className="py-2 px-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-3 py-2">
                <div
                  className="w-10 h-10 rounded"
                  style={{ backgroundColor: theme.stroke.low }}
                />
                <div className="flex-1">
                  <div
                    className="h-4 rounded mb-1"
                    style={{ backgroundColor: theme.stroke.low, width: '70%' }}
                  />
                  <div
                    className="h-3 rounded"
                    style={{ backgroundColor: theme.stroke.low, width: '50%' }}
                  />
                </div>
                <div
                  className="w-10 h-10 rounded-full"
                  style={{ backgroundColor: theme.stroke.low }}
                />
              </div>
            ))}
          </div>
          {/* Button skeleton */}
          <div className="px-3 pb-3">
            <div
              className="h-10 rounded-full"
              style={{ backgroundColor: theme.stroke.low }}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

export const JioSaavnExploration = memo(function JioSaavnExploration({
  messageId,
  messageContent,
}: JioSaavnExplorationProps) {
  console.log('[JioSaavnExploration] Rendering for message:', messageId, 'content length:', messageContent?.length);
  
  const theme = useThemeColors();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [audioState, setAudioState] = useState<AudioPlayerState>({
    playingId: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
  });
  
  const { data, isLoading, isDetecting, error, musicTopic } = usePlaylistSearch(messageContent, {
    enabled: true,
    limit: 5,
    useLLMDetection: true,
  });
  
  const handlePlay = useCallback((song: ExplorationItem) => {
    if (!song.audioUrl) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audio = new Audio(song.audioUrl);
    audioRef.current = audio;
    
    audio.addEventListener('loadedmetadata', () => {
      setAudioState(prev => ({
        ...prev,
        duration: audio.duration,
      }));
    });
    
    audio.addEventListener('timeupdate', () => {
      setAudioState(prev => ({
        ...prev,
        progress: audio.currentTime,
      }));
    });
    
    audio.addEventListener('ended', () => {
      setAudioState(prev => ({
        ...prev,
        isPlaying: false,
        progress: 0,
      }));
    });
    
    audio.addEventListener('error', (e) => {
      console.error('[JioSaavn] Audio playback error:', e);
      setAudioState(prev => ({
        ...prev,
        isPlaying: false,
        playingId: null,
      }));
    });
    
    audio.play().then(() => {
      setAudioState({
        playingId: song.id,
        isPlaying: true,
        progress: 0,
        duration: audio.duration || 0,
      });
    }).catch((err) => {
      console.error('[JioSaavn] Failed to play audio:', err);
    });
  }, []);
  
  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioState(prev => ({
        ...prev,
        isPlaying: false,
      }));
    }
  }, []);
  
  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  if (isDetecting) {
    console.log('[JioSaavnExploration] Still detecting music topic...');
    return null;
  }
  
  if (!musicTopic?.detected) {
    console.log('[JioSaavnExploration] Not detected, returning null');
    return null;
  }
  
  if (error && !isLoading) {
    console.log('[JioSaavnExploration] Error occurred:', error);
    return null;
  }
  
  if (!isLoading && (!data || data.playlists.length === 0)) {
    console.log('[JioSaavnExploration] No playlists:', { hasData: !!data, count: data?.playlists?.length, isLoading });
    return null;
  }
  
  console.log('[JioSaavnExploration] Rendering UI with', data?.playlists?.length, 'playlists');
  
  return (
    <div
      className="mt-4 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: theme.background.subtle,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2"
        style={{
          paddingTop: '12px',
          paddingBottom: '12px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" fill={JIOSAAVN_GREEN} />
          <path
            d="M10 8l6 4-6 4V8z"
            fill="white"
          />
        </svg>
        <span
          style={{
            color: theme.text.high,
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Explore on JioSaavn
        </span>
        {data?.query && (
          <span
            style={{
              color: theme.text.low,
              fontSize: '13px',
            }}
          >
            "{data.query}"
          </span>
        )}
      </div>
      
      {/* Playlist cards container */}
      <div
        className="overflow-x-auto scrollable-container"
        style={{
          paddingTop: '4px',
          paddingBottom: '16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          scrollbarWidth: 'thin',
        }}
      >
        {isLoading ? (
          <LoadingSkeleton theme={theme} />
        ) : (
          <div className="flex gap-4">
            {data?.playlists.slice(0, 5).map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                theme={theme}
                audioState={audioState}
                onPlay={handlePlay}
                onPause={handlePause}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default JioSaavnExploration;
