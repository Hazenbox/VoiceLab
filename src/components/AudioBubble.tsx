/**
 * AudioBubble Component
 * 
 * Inline audio player for chat messages with:
 * - Compact playback controls
 * - Progress bar with seek functionality
 * - Save to library button
 * - Transcript display
 * - Keyboard accessibility
 */

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { useThemeColors } from '../theme/useColors';
import { audioBufferManager } from '../services/audioBufferManager';
import { formatTime } from '../services/audioUtils';
import { DSIcon } from './DSIcon';

// =============================================================================
// Types
// =============================================================================

interface AudioBubbleProps {
  messageId: string;
  audioData: string;        // Base64 encoded PCM16
  sampleRate: number;
  duration: number;         // Duration in seconds
  transcript: string;       // Text content of the message
  onSave?: () => void;
  role: 'user' | 'assistant';
  showTranscript?: boolean;
}

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

// =============================================================================
// Component
// =============================================================================

export const AudioBubble = memo(function AudioBubble({
  messageId,
  audioData,
  sampleRate,
  duration,
  transcript,
  onSave,
  role,
  showTranscript = true,
}: AudioBubbleProps) {
  const theme = useThemeColors();
  
  // State
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Refs
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);
  
  // Decode audio on first interaction
  const loadAudio = useCallback(async (): Promise<AudioBuffer | null> => {
    if (audioBuffer) return audioBuffer;
    
    try {
      setPlaybackState('loading');
      const buffer = await audioBufferManager.fromBase64(
        audioData,
        sampleRate,
        `audio-bubble-${messageId}`
      );
      setAudioBuffer(buffer);
      setPlaybackState('idle');
      return buffer;
    } catch (error) {
      console.error('[AudioBubble] Failed to decode audio:', error);
      setErrorMessage('Failed to load audio');
      setPlaybackState('error');
      return null;
    }
  }, [audioBuffer, audioData, sampleRate, messageId]);
  
  // Update playback time
  const updateTime = useCallback(() => {
    if (playbackState === 'playing') {
      const ctx = audioBufferManager.getContext();
      const elapsed = ctx.currentTime - startTimeRef.current + pausedAtRef.current;
      const clampedTime = Math.min(elapsed, duration);
      setCurrentTime(clampedTime);
      
      if (clampedTime < duration) {
        animationFrameRef.current = requestAnimationFrame(updateTime);
      } else {
        // Playback finished
        setPlaybackState('idle');
        setCurrentTime(0);
        pausedAtRef.current = 0;
      }
    }
  }, [playbackState, duration]);
  
  // Play audio
  const play = useCallback(async (startFrom: number = pausedAtRef.current) => {
    const buffer = await loadAudio();
    if (!buffer) return;
    
    // Stop any existing playback
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // Ignore
      }
    }
    
    const ctx = audioBufferManager.getContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      if (playbackState === 'playing') {
        setPlaybackState('idle');
        setCurrentTime(0);
        pausedAtRef.current = 0;
      }
    };
    
    sourceRef.current = source;
    startTimeRef.current = ctx.currentTime;
    pausedAtRef.current = startFrom;
    
    source.start(0, startFrom);
    setPlaybackState('playing');
    setCurrentTime(startFrom);
    
    // Start animation loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(updateTime);
  }, [loadAudio, playbackState, updateTime]);
  
  // Pause audio
  const pause = useCallback(() => {
    if (sourceRef.current && playbackState === 'playing') {
      const ctx = audioBufferManager.getContext();
      pausedAtRef.current += ctx.currentTime - startTimeRef.current;
      
      try {
        sourceRef.current.stop();
      } catch {
        // Ignore
      }
      sourceRef.current = null;
      
      setPlaybackState('paused');
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [playbackState]);
  
  // Toggle play/pause
  const togglePlayback = useCallback(() => {
    if (playbackState === 'playing') {
      pause();
    } else {
      play();
    }
  }, [playbackState, play, pause]);
  
  // Seek to position
  const handleSeek = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = percentage * duration;
    
    if (playbackState === 'playing') {
      // Stop current and restart at new position
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch {
          // Ignore
        }
      }
      play(seekTime);
    } else {
      // Just update the position
      pausedAtRef.current = seekTime;
      setCurrentTime(seekTime);
    }
  }, [duration, playbackState, play]);
  
  // Handle keyboard
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault();
        togglePlayback();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        const backTime = Math.max(0, currentTime - 5);
        if (playbackState === 'playing') {
          if (sourceRef.current) sourceRef.current.stop();
          play(backTime);
        } else {
          pausedAtRef.current = backTime;
          setCurrentTime(backTime);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        const forwardTime = Math.min(duration, currentTime + 5);
        if (playbackState === 'playing') {
          if (sourceRef.current) sourceRef.current.stop();
          play(forwardTime);
        } else {
          pausedAtRef.current = forwardTime;
          setCurrentTime(forwardTime);
        }
        break;
    }
  }, [togglePlayback, currentTime, duration, playbackState, play]);
  
  const isUser = role === 'user';
  
  return (
    <div
      className={`flex flex-col gap-1.5 max-w-[55%] ${isUser ? 'ml-auto' : 'mr-auto'}`}
    >
      {/* Audio Player - Compact design */}
      <div
        className={`
          flex items-center gap-2 px-2.5 py-1.5 rounded-2xl
          ${isUser ? 'rounded-br-md' : 'rounded-bl-md'}
        `}
        style={{
          backgroundColor: isUser ? theme.accent : theme.background.subtle,
        }}
        role="region"
        aria-label={`Audio message from ${role}`}
      >
        {/* Play/Pause Button - Smaller */}
        <button
          onClick={togglePlayback}
          onKeyDown={handleKeyDown}
          disabled={playbackState === 'loading' || playbackState === 'error'}
          className={`
            flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
            transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
            ${playbackState === 'loading' ? 'animate-pulse' : ''}
          `}
          style={{
            backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : theme.background.ghost,
            color: isUser ? 'white' : theme.text.high,
          }}
          aria-label={
            playbackState === 'loading' ? 'Loading audio...' :
            playbackState === 'error' ? 'Audio error' :
            playbackState === 'playing' ? 'Pause (Space)' :
            'Play (Space)'
          }
        >
          {playbackState === 'loading' ? (
            <span className="animate-spin">
              <DSIcon name="IcRefresh" size="XS" attention="medium" />
            </span>
          ) : playbackState === 'error' ? (
            <DSIcon name="IcWarning" size="XS" attention="medium" />
          ) : playbackState === 'playing' ? (
            <DSIcon name="IcPause" size="XS" attention="medium" />
          ) : (
            <span className="ml-0.5">
              <DSIcon name="IcPlayArrow" size="XS" attention="medium" />
            </span>
          )}
        </button>
        
        {/* Progress Bar and Time - Compact */}
        <div className="flex-1 flex flex-col gap-0.5 min-w-0">
          {/* Progress Bar */}
          <div
            ref={progressBarRef}
            onClick={handleSeek}
            className="relative h-1 rounded-full cursor-pointer group"
            style={{
              backgroundColor: isUser ? 'rgba(255,255,255,0.3)' : theme.stroke.low,
            }}
            role="slider"
            aria-label="Audio progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            {/* Filled Progress */}
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-75"
              style={{
                width: `${progress}%`,
                backgroundColor: isUser ? 'white' : theme.accent,
              }}
            />
            {/* Scrubber */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
              style={{
                left: `calc(${progress}% - 6px)`,
                backgroundColor: isUser ? 'white' : theme.accent,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </div>
          
          {/* Time Display - Smaller */}
          <div
            className="flex justify-between"
            style={{
              color: isUser ? 'rgba(255,255,255,0.8)' : theme.text.low,
              fontSize: '10px',
            }}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Save Button (only for assistant messages) - Smaller */}
        {!isUser && onSave && (
          <button
            onClick={onSave}
            className={`
              flex-shrink-0 p-1 rounded-md
              transition-colors duration-150
              hover:bg-black/5
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
            `}
            style={{
              color: theme.text.medium,
            }}
            aria-label="Save to library"
            title="Save to library"
          >
            <DSIcon name="IcSave" size="XS" attention="medium" />
          </button>
        )}
      </div>
      
      {/* Transcript (optional) */}
      {showTranscript && transcript && (
        <p
          className={`text-sm px-3 ${isUser ? 'text-right' : 'text-left'}`}
          style={{ color: theme.text.medium }}
        >
          {transcript}
        </p>
      )}
      
      {/* Error Message */}
      {errorMessage && (
        <p
          className="text-xs px-3"
          style={{ color: '#ef4444' }}
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
});

export default AudioBubble;
