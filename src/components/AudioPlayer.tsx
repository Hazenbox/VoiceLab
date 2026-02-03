import React, { useRef, useEffect, useState, useCallback } from 'react';
import { formatTime, getWaveformData } from '../services/audioUtils';

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

  // Draw waveform
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

      // Color based on progress
      if (x < progressX) {
        ctx.fillStyle = '#f97316'; // Orange for played portion
      } else {
        ctx.fillStyle = document.body.classList.contains('dark') ? '#52525b' : '#d4d4d8'; // Zinc for remaining
      }

      ctx.beginPath();
      ctx.roundRect(x + 1, y, barWidth - 2, barHeight, 2);
      ctx.fill();
    });
  }, [waveformData]);

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
      <div className="flex items-center justify-center h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <p className="text-zinc-500 dark:text-zinc-400 text-xs">
          No audio generated yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Waveform canvas */}
      <canvas
        ref={canvasRef}
        onClick={seek}
        className="w-full h-14 cursor-pointer rounded-lg bg-zinc-100 dark:bg-zinc-800"
      />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Play/Pause button */}
          <button
            onClick={togglePlayPause}
            className="p-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white transition-colors"
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Restart button */}
          <button
            onClick={restart}
            className="p-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Time display */}
        <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
