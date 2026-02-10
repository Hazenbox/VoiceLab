import React, { useRef, useEffect, useState, useCallback } from 'react';
import { formatTime, getWaveformData } from '../../services/audioUtils';
import { DSIcon } from '../DSIcon';

interface TwAudioPlayerProps {
  audioBuffer: AudioBuffer | null;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

/**
 * Tailwind-styled audio player with waveform visualization
 */
export const TwAudioPlayer: React.FC<TwAudioPlayerProps> = ({
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

      // Color based on progress - orange for played, gray for remaining
      if (x < progressX) {
        ctx.fillStyle = '#f97316'; // orange-500
      } else {
        ctx.fillStyle = document.body.classList.contains('dark') ? '#27272a' : '#f4f4f5'; // zinc-800/zinc-100
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
      setIsPlaying(false);
      setCurrentTime(duration);
      pauseTimeRef.current = 0;
      onPlayStateChange?.(false);
    }
  }, [isPlaying, duration, drawWaveform, onPlayStateChange]);

  // Start/resume playback
  const play = useCallback(() => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

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
      <div className="flex items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 min-h-16 p-4">
        <p className="text-zinc-600 dark:text-zinc-400 text-xs">
          No audio generated yet
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Waveform canvas */}
      <canvas
        ref={canvasRef}
        onClick={seek}
        className="w-full cursor-pointer bg-zinc-50 dark:bg-zinc-800 rounded-lg"
        style={{ height: '56px' }}
      />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {/* Play/Pause button */}
          <button
            onClick={togglePlayPause}
            className="p-1.5 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
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
            className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-50 hover:opacity-80 transition-opacity"
          >
            <DSIcon name="IcRefresh" size="XS" attention="high" />
          </button>
        </div>

        {/* Time display */}
        <div className="text-zinc-600 dark:text-zinc-400 text-xs font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

export default TwAudioPlayer;
