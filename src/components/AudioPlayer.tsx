import React, { useRef, useEffect, useState, useCallback } from 'react';
import { formatTime, getWaveformData } from '../services/audioUtils';
import { useThemeColors } from '../theme';
import { DSIcon } from './DSIcon';

interface AudioPlayerProps {
  audioBuffer: AudioBuffer | null;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

/**
 * Audio player with waveform visualization and playback controls
 */
export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioBuffer,
  onPlayStateChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  
  const theme = useThemeColors();

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Update waveform when audio buffer changes
  useEffect(() => {
    if (audioBuffer) {
      const data = getWaveformData(audioBuffer, 100);
      setWaveformData(data);
      setDuration(audioBuffer.duration);
      setCurrentTime(0);
      pauseTimeRef.current = 0;
    } else {
      setWaveformData([]);
      setDuration(0);
      setCurrentTime(0);
    }
  }, [audioBuffer]);

  // Draw waveform - uses theme colors
  const drawWaveform = useCallback((progress: number = 0) => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const barWidth = width / waveformData.length;
    const progressX = progress * width;

    ctx.clearRect(0, 0, width, height);

    waveformData.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = Math.max(4, value * height * 0.8);
      const y = (height - barHeight) / 2;

      // Color based on progress - use theme accent for played, stroke for unplayed
      if (x < progressX) {
        ctx.fillStyle = theme.accent; // DS accent color
      } else {
        ctx.fillStyle = theme.stroke.low; // DS stroke color for remaining
      }

      ctx.beginPath();
      ctx.roundRect(x + 1, y, barWidth - 2, barHeight, 2);
      ctx.fill();
    });
  }, [waveformData, theme.stroke.low, theme.accent]);

  // Animation loop for playback progress
  const animate = useCallback(() => {
    if (!audioContextRef.current || !isPlaying) return;

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current;
    setCurrentTime(Math.min(elapsed, duration));
    drawWaveform(elapsed / duration);

    if (elapsed < duration) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Playback finished
      setIsPlaying(false);
      setCurrentTime(duration);
      pauseTimeRef.current = 0;
      onPlayStateChange?.(false);
    }
  }, [isPlaying, duration, drawWaveform, onPlayStateChange]);

  // Start/resume playback
  const play = useCallback(() => {
    if (!audioBuffer || !audioContextRef.current) return;

    // Resume audio context if suspended
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    // Create new source node
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    // Start from pause position
    source.start(0, pauseTimeRef.current);
    sourceRef.current = source;
    startTimeRef.current = audioContextRef.current.currentTime;

    source.onended = () => {
      if (isPlaying) {
        setIsPlaying(false);
        pauseTimeRef.current = 0;
        setCurrentTime(duration);
        onPlayStateChange?.(false);
      }
    };

    setIsPlaying(true);
    onPlayStateChange?.(true);
  }, [audioBuffer, duration, isPlaying, onPlayStateChange]);

  // Pause playback
  const pause = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      pauseTimeRef.current += audioContextRef.current.currentTime - startTimeRef.current;
    }

    setIsPlaying(false);
    onPlayStateChange?.(false);
  }, [onPlayStateChange]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Restart from beginning
  const restart = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }
    pauseTimeRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    drawWaveform(0);
    
    // Start playing immediately
    setTimeout(() => play(), 50);
  }, [drawWaveform, play]);

  // Seek to position
  const seek = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const seekTime = progress * duration;

    pauseTimeRef.current = seekTime;
    setCurrentTime(seekTime);
    drawWaveform(progress);

    if (isPlaying) {
      pause();
      setTimeout(() => play(), 50);
    }
  }, [audioBuffer, duration, isPlaying, drawWaveform, pause, play]);

  // Run animation when playing
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);

  // Initial draw
  useEffect(() => {
    drawWaveform(currentTime / duration);
  }, [waveformData, currentTime, duration, drawWaveform]);

  if (!audioBuffer) {
    return (
      <div 
        className="flex items-center justify-center rounded-lg"
        style={{ 
          backgroundColor: theme.isLight ? '#f5f5f5' : '#18181b',
          border: `1px solid ${theme.stroke.low}`,
          minHeight: '64px',
          padding: '16px'
        }}
      >
        <p 
          style={{ 
            color: theme.text.medium,
            fontSize: '12px',
            lineHeight: '16px'
          }}
        >
          No audio generated yet
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Waveform canvas */}
      <canvas
        ref={canvasRef}
        onClick={seek}
        className="w-full cursor-pointer"
        style={{ 
          backgroundColor: theme.background.subtle,
          height: '56px',
          borderRadius: '8px'
        }}
      />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center" style={{ gap: '6px' }}>
          {/* Play/Pause button */}
          <button
            onClick={togglePlayPause}
            className="transition-colors"
            style={{
              padding: '6px',
              borderRadius: '50%',
              backgroundColor: theme.accent,
              color: theme.local.white,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {isPlaying ? (
              <DSIcon name="IcPause" size="XS" attention="high" />
            ) : (
              <DSIcon name="IcPlayArrow" size="XS" attention="high" />
            )}
          </button>

          {/* Restart button */}
          <button
            onClick={restart}
            className="transition-colors"
            style={{ 
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: theme.background.subtle,
              border: `1px solid ${theme.stroke.medium}`,
              color: theme.text.high,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <DSIcon name="IcRefresh" size="XS" attention="medium" />
          </button>
        </div>

        {/* Time display */}
        <div 
          style={{ 
            color: theme.text.medium,
            fontSize: '12px',
            lineHeight: '16px',
            fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          }}
        >
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
