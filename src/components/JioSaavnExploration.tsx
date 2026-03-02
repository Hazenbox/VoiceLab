/**
 * JioSaavnExploration Component
 * 
 * Displays JioSaavn exploration cards when music topics are detected in AI responses.
 * Features larger music-focused cards with in-browser audio playback.
 * 
 * Features:
 * - Auto-detects music topics from message content
 * - Horizontal scrollable card layout with larger cards
 * - In-browser audio playback for songs
 * - Dynamic CTA buttons based on content type
 * - Loading skeleton state
 * - Dismissible with X button
 */

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { useThemeColors } from '../theme';
import { useJioSaavnSearch } from '../hooks/useJioSaavnSearch';
import { ActionButton } from './ActionButton';
import { DSIcon } from './DSIcon';
import type { ExplorationItem } from '../services/jiosaavn/types';

interface JioSaavnExplorationProps {
  messageId: string;
  messageContent: string;
  isDismissed?: boolean;
  onDismiss?: (messageId: string) => void;
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

function getCtaLabel(type: ExplorationItem['type']): string {
  switch (type) {
    case 'playlist':
      return 'View playlist';
    case 'artist':
      return 'View artist';
    case 'album':
      return 'View album';
    case 'song':
      return 'View on JioSaavn';
    default:
      return 'View more';
  }
}

const PlayButton = memo(function PlayButton({
  isPlaying,
  isCurrentSong,
  onClick,
  theme,
}: {
  isPlaying: boolean;
  isCurrentSong: boolean;
  onClick: (e: React.MouseEvent) => void;
  theme: ReturnType<typeof useThemeColors>;
}) {
  return (
    <button
      onClick={onClick}
      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"
      style={{
        opacity: isCurrentSong && isPlaying ? 1 : undefined,
      }}
      aria-label={isPlaying && isCurrentSong ? 'Pause' : 'Play'}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: JIOSAAVN_GREEN,
        }}
      >
        {isPlaying && isCurrentSong ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </div>
    </button>
  );
});

const ExplorationCard = memo(function ExplorationCard({
  item,
  theme,
  audioState,
  onPlay,
  onPause,
}: {
  item: ExplorationItem;
  theme: ReturnType<typeof useThemeColors>;
  audioState: AudioPlayerState;
  onPlay: (item: ExplorationItem) => void;
  onPause: () => void;
}) {
  const handleOpenLink = useCallback(() => {
    if (item.jiosaavnUrl) {
      window.open(item.jiosaavnUrl, '_blank', 'noopener,noreferrer');
    }
  }, [item.jiosaavnUrl]);
  
  const handlePlayClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioState.playingId === item.id && audioState.isPlaying) {
      onPause();
    } else {
      onPlay(item);
    }
  }, [item, audioState.playingId, audioState.isPlaying, onPlay, onPause]);
  
  const isArtist = item.type === 'artist';
  const isSong = item.type === 'song';
  const isCurrentSong = audioState.playingId === item.id;
  const canPlay = isSong && item.audioUrl;
  
  return (
    <div
      className="flex-shrink-0 rounded-xl overflow-hidden group"
      style={{
        backgroundColor: theme.background.bold,
        width: '280px',
      }}
    >
      {/* Image with play button overlay */}
      <div 
        className="relative w-full aspect-square cursor-pointer"
        onClick={canPlay ? handlePlayClick : handleOpenLink}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className={`w-full h-full object-cover ${isArtist ? '' : ''}`}
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              backgroundColor: theme.stroke.low,
            }}
          >
            <DSIcon name="IcMusic" size="L" style={{ color: theme.text.low }} />
          </div>
        )}
        
        {/* Play button overlay for songs */}
        {canPlay && (
          <PlayButton
            isPlaying={audioState.isPlaying}
            isCurrentSong={isCurrentSong}
            onClick={handlePlayClick}
            theme={theme}
          />
        )}
        
        {/* Progress bar for playing song */}
        {isCurrentSong && audioState.isPlaying && (
          <div 
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          >
            <div
              className="h-full transition-all duration-200"
              style={{
                backgroundColor: JIOSAAVN_GREEN,
                width: `${(audioState.progress / audioState.duration) * 100}%`,
              }}
            />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3">
        {/* Title and subtitle */}
        <div className="mb-3">
          <h4
            className="font-semibold truncate"
            style={{
              color: theme.text.high,
              fontSize: '15px',
              lineHeight: '1.3',
            }}
          >
            {item.name}
          </h4>
          <p
            className="truncate mt-0.5"
            style={{
              color: theme.text.medium,
              fontSize: '13px',
              lineHeight: '1.3',
            }}
          >
            {item.subtitle}
            {item.year && ` (${item.year})`}
            {item.songCount && ` - ${item.songCount} songs`}
            {isSong && item.duration && ` - ${formatDuration(item.duration)}`}
          </p>
        </div>
        
        {/* CTA Button */}
        <button
          onClick={handleOpenLink}
          className="w-full py-2 px-4 rounded-full text-sm font-medium transition-colors duration-150"
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
          {getCtaLabel(item.type)}
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
          className="flex-shrink-0 rounded-xl animate-pulse overflow-hidden"
          style={{
            backgroundColor: theme.background.bold,
            width: '280px',
          }}
        >
          <div
            className="w-full aspect-square"
            style={{ backgroundColor: theme.stroke.low }}
          />
          <div className="p-3">
            <div
              className="rounded mb-2"
              style={{
                height: '18px',
                width: '80%',
                backgroundColor: theme.stroke.low,
              }}
            />
            <div
              className="rounded mb-3"
              style={{
                height: '14px',
                width: '60%',
                backgroundColor: theme.stroke.low,
              }}
            />
            <div
              className="rounded-full"
              style={{
                height: '36px',
                width: '100%',
                backgroundColor: theme.stroke.low,
              }}
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
  isDismissed = false,
  onDismiss,
}: JioSaavnExplorationProps) {
  const theme = useThemeColors();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [audioState, setAudioState] = useState<AudioPlayerState>({
    playingId: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
  });
  
  const { data, isLoading, error, musicTopic } = useJioSaavnSearch(messageContent, {
    enabled: !isDismissed,
    limit: 5,
  });
  
  const handleDismiss = useCallback(() => {
    onDismiss?.(messageId);
  }, [messageId, onDismiss]);
  
  const handlePlay = useCallback((item: ExplorationItem) => {
    if (!item.audioUrl) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audio = new Audio(item.audioUrl);
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
        playingId: item.id,
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
  
  if (isDismissed) {
    return null;
  }
  
  if (!musicTopic?.detected) {
    return null;
  }
  
  if (error && !isLoading) {
    return null;
  }
  
  if (!isLoading && (!data || data.items.length === 0)) {
    return null;
  }
  
  return (
    <div
      className="mt-4 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: theme.background.subtle,
        border: `1px solid ${theme.stroke.low}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          paddingTop: '12px',
          paddingBottom: '12px',
          paddingLeft: '16px',
          paddingRight: '12px',
          borderBottom: `1px solid ${theme.stroke.low}`,
        }}
      >
        <div className="flex items-center gap-2">
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
        
        {onDismiss && (
          <ActionButton
            icon={<DSIcon name="IcClose" size="XS" style={{ color: theme.text.medium }} />}
            label="Dismiss"
            onClick={handleDismiss}
            size={28}
          />
        )}
      </div>
      
      {/* Cards container */}
      <div
        className="overflow-x-auto scrollable-container"
        style={{
          paddingTop: '16px',
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
            {data?.items.map((item) => (
              <ExplorationCard
                key={`${item.type}-${item.id}`}
                item={item}
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
