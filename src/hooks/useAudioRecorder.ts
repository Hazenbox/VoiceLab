/**
 * useAudioRecorder Hook
 * 
 * Captures user audio during voice mode for saving to library.
 * 
 * Features:
 * - MediaRecorder-based recording
 * - Returns AudioBuffer for playback and persistence
 * - Handles cleanup automatically
 * - Provides recording state
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { audioBufferManager } from '../services/audioBufferManager';

// =============================================================================
// Types
// =============================================================================

interface UseAudioRecorderOptions {
  /** Sample rate for recording (default: 16000) */
  sampleRate?: number;
  /** Max recording duration in seconds (default: 60) */
  maxDuration?: number;
  /** Callback when recording starts */
  onStart?: () => void;
  /** Callback when recording stops */
  onStop?: (result: RecordingResult) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface RecordingResult {
  buffer: AudioBuffer;
  duration: number;
  base64: string;
  sampleRate: number;
}

interface UseAudioRecorderReturn {
  /** Whether currently recording */
  isRecording: boolean;
  /** Recording duration in seconds */
  duration: number;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording and get result */
  stopRecording: () => Promise<RecordingResult | null>;
  /** Cancel recording without result */
  cancelRecording: () => void;
  /** Error message if any */
  error: string | null;
  /** Whether microphone permission is granted */
  hasPermission: boolean | null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useAudioRecorder(
  options: UseAudioRecorderOptions = {}
): UseAudioRecorderReturn {
  const {
    sampleRate = 16000,
    maxDuration = 60,
    onStart,
    onStop,
    onError,
  } = options;
  
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolverRef = useRef<((result: RecordingResult | null) => void) | null>(null);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setDuration(0);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  // Start recording
  const startRecording = useCallback(async () => {
    setError(null);
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      
      setHasPermission(true);
      streamRef.current = stream;
      chunksRef.current = [];
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      onStart?.();
      
      // Duration timer
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setDuration((Date.now() - startTime) / 1000);
      }, 100);
      
      // Max duration timeout
      maxDurationTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, maxDuration * 1000);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      setHasPermission(false);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      cleanup();
    }
  }, [sampleRate, maxDuration, onStart, onError, cleanup]);
  
  // Stop recording
  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        resolve(null);
        return;
      }
      
      resolverRef.current = resolve;
      
      mediaRecorderRef.current.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType });
          const arrayBuffer = await blob.arrayBuffer();
          
          // Decode to AudioBuffer
          const buffer = await audioBufferManager.decodeMP3(arrayBuffer);
          
          // Convert to base64
          const base64 = audioBufferManager.toBase64(buffer);
          
          const result: RecordingResult = {
            buffer,
            duration: buffer.duration,
            base64,
            sampleRate: buffer.sampleRate,
          };
          
          cleanup();
          onStop?.(result);
          resolverRef.current?.(result);
          resolverRef.current = null;
          
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to process recording';
          setError(errorMessage);
          onError?.(err instanceof Error ? err : new Error(errorMessage));
          cleanup();
          resolverRef.current?.(null);
          resolverRef.current = null;
        }
      };
      
      mediaRecorderRef.current.stop();
    });
  }, [cleanup, onStop, onError]);
  
  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
    }
    cleanup();
    resolverRef.current?.(null);
    resolverRef.current = null;
  }, [cleanup]);
  
  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
    hasPermission,
  };
}

export default useAudioRecorder;
