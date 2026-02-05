/**
 * useAudioAnalyzer Hook
 * Real-time audio frequency and volume analysis using Web Audio API
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioAnalyzerResult {
  /** Normalized volume level (0-1) */
  volume: number;
  /** 32-band frequency data (0-1 each) */
  frequencies: number[];
  /** Low frequency intensity (0-1) */
  bassLevel: number;
  /** Mid frequency intensity (0-1) */
  midLevel: number;
  /** High frequency intensity (0-1) */
  highLevel: number;
  /** Whether voice/sound is detected above threshold */
  isVoiceActive: boolean;
  /** The AnalyserNode instance for direct access */
  analyzerNode: AnalyserNode | null;
}

export interface AudioAnalyzerOptions {
  /** FFT size for frequency analysis (power of 2, default: 256) */
  fftSize?: number;
  /** Smoothing time constant (0-1, default: 0.8) */
  smoothing?: number;
  /** Volume threshold for voice detection (0-1, default: 0.05) */
  voiceThreshold?: number;
  /** Number of frequency bands to return (default: 32) */
  frequencyBands?: number;
  /** Update rate in ms (default: 16 for ~60fps) */
  updateRate?: number;
}

// Frequency band boundaries (relative to frequencyBinCount)
const BASS_RANGE = [0, 0.15];      // ~0-150Hz
const MID_RANGE = [0.15, 0.5];     // ~150-500Hz
const HIGH_RANGE = [0.5, 1];       // ~500Hz+

/**
 * Hook for real-time audio analysis
 * 
 * @param stream - MediaStream from microphone or other audio source
 * @param options - Configuration options
 * @returns AudioAnalyzerResult with real-time audio data
 */
export function useAudioAnalyzer(
  stream: MediaStream | null,
  options: AudioAnalyzerOptions = {}
): AudioAnalyzerResult {
  const {
    fftSize = 256,
    smoothing = 0.8,
    voiceThreshold = 0.05,
    frequencyBands = 32,
    updateRate = 16,
  } = options;

  // State for analyzed values
  const [volume, setVolume] = useState(0);
  const [frequencies, setFrequencies] = useState<number[]>(() => 
    new Array(frequencyBands).fill(0)
  );
  const [bassLevel, setBassLevel] = useState(0);
  const [midLevel, setMidLevel] = useState(0);
  const [highLevel, setHighLevel] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [analyzerNode, setAnalyzerNode] = useState<AnalyserNode | null>(null);

  // Refs for audio context and nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (analyzerRef.current) {
      analyzerRef.current.disconnect();
      analyzerRef.current = null;
    }

    // Don't close the audio context - it might be shared
    // Just clear the reference
    audioContextRef.current = null;

    setAnalyzerNode(null);
    setVolume(0);
    setFrequencies(new Array(frequencyBands).fill(0));
    setBassLevel(0);
    setMidLevel(0);
    setHighLevel(0);
    setIsVoiceActive(false);
  }, [frequencyBands]);

  // Setup audio analyzer when stream changes
  useEffect(() => {
    if (!stream) {
      cleanup();
      return;
    }

    // Create audio context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported');
      return;
    }

    try {
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      // Create analyzer node
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = fftSize;
      analyzer.smoothingTimeConstant = smoothing;
      analyzerRef.current = analyzer;
      setAnalyzerNode(analyzer);

      // Connect stream to analyzer
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyzer);
      sourceRef.current = source;

      // Buffers for analysis
      const frequencyData = new Uint8Array(analyzer.frequencyBinCount);
      const timeDomainData = new Uint8Array(analyzer.fftSize);

      // Analysis loop
      const analyze = (timestamp: number) => {
        // Throttle updates
        if (timestamp - lastUpdateRef.current < updateRate) {
          animationFrameRef.current = requestAnimationFrame(analyze);
          return;
        }
        lastUpdateRef.current = timestamp;

        // Get frequency data
        analyzer.getByteFrequencyData(frequencyData);
        analyzer.getByteTimeDomainData(timeDomainData);

        // Calculate volume (RMS)
        let sumSquares = 0;
        for (let i = 0; i < timeDomainData.length; i++) {
          const normalized = (timeDomainData[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / timeDomainData.length);
        const newVolume = Math.min(1, rms * 3); // Scale up for visibility
        setVolume(newVolume);
        setIsVoiceActive(newVolume > voiceThreshold);

        // Calculate frequency bands
        const binCount = frequencyData.length;
        const bandsPerGroup = Math.floor(binCount / frequencyBands);
        const newFrequencies: number[] = [];
        
        for (let i = 0; i < frequencyBands; i++) {
          let sum = 0;
          const start = i * bandsPerGroup;
          const end = start + bandsPerGroup;
          for (let j = start; j < end && j < binCount; j++) {
            sum += frequencyData[j];
          }
          newFrequencies.push(sum / (bandsPerGroup * 255));
        }
        setFrequencies(newFrequencies);

        // Calculate bass/mid/high levels
        const bassStart = Math.floor(binCount * BASS_RANGE[0]);
        const bassEnd = Math.floor(binCount * BASS_RANGE[1]);
        const midStart = Math.floor(binCount * MID_RANGE[0]);
        const midEnd = Math.floor(binCount * MID_RANGE[1]);
        const highStart = Math.floor(binCount * HIGH_RANGE[0]);
        const highEnd = binCount;

        let bassSum = 0, midSum = 0, highSum = 0;
        for (let i = bassStart; i < bassEnd; i++) bassSum += frequencyData[i];
        for (let i = midStart; i < midEnd; i++) midSum += frequencyData[i];
        for (let i = highStart; i < highEnd; i++) highSum += frequencyData[i];

        setBassLevel(bassSum / ((bassEnd - bassStart) * 255));
        setMidLevel(midSum / ((midEnd - midStart) * 255));
        setHighLevel(highSum / ((highEnd - highStart) * 255));

        animationFrameRef.current = requestAnimationFrame(analyze);
      };

      animationFrameRef.current = requestAnimationFrame(analyze);
    } catch (error) {
      console.error('Failed to create audio analyzer:', error);
      cleanup();
    }

    return cleanup;
  }, [stream, fftSize, smoothing, voiceThreshold, frequencyBands, updateRate, cleanup]);

  return {
    volume,
    frequencies,
    bassLevel,
    midLevel,
    highLevel,
    isVoiceActive,
    analyzerNode,
  };
}

/**
 * Create a standalone AnalyserNode from a MediaStream
 * Useful when you need to pass the analyzer to child components
 */
export function createAudioAnalyzer(
  stream: MediaStream,
  options: { fftSize?: number; smoothing?: number } = {}
): { analyzerNode: AnalyserNode; audioContext: AudioContext; cleanup: () => void } | null {
  const { fftSize = 256, smoothing = 0.8 } = options;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    const audioContext = new AudioContextClass();
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = fftSize;
    analyzer.smoothingTimeConstant = smoothing;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyzer);

    const cleanup = () => {
      source.disconnect();
      analyzer.disconnect();
      audioContext.close();
    };

    return { analyzerNode: analyzer, audioContext, cleanup };
  } catch (error) {
    console.error('Failed to create audio analyzer:', error);
    return null;
  }
}

export default useAudioAnalyzer;
