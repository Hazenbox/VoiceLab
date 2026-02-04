import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { SavedAudio } from '../types';
import { storageAudios, generateId } from '../services/storage';
import { createAudioContext } from '../services/audioUtils';

// Helper function to create WAV buffer from PCM16 data
function createWavBuffer(pcm16: Int16Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm16.length * 2;
  const bufferSize = 44 + dataSize;
  
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // PCM data
  for (let i = 0; i < pcm16.length; i++) {
    view.setInt16(44 + i * 2, pcm16[i], true);
  }
  
  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

interface AudioLibraryContextValue {
  audios: SavedAudio[];
  saveAudio: (
    projectId: string,
    name: string,
    prompt: string,
    audioBuffer: AudioBuffer,
    voiceConfig: { gender: string; voice: string }
  ) => SavedAudio;
  deleteAudio: (id: string) => void;
  playAudio: (id: string) => Promise<void>;
  stopAudio: () => void;
  playingAudioId: string | null;
  getAudiosByProject: (projectId: string) => SavedAudio[];
  updateAudioName: (id: string, name: string) => void;
  downloadAudio: (id: string) => void;
}

const AudioLibraryContext = createContext<AudioLibraryContextValue | null>(null);

export const useAudioLibrary = (): AudioLibraryContextValue => {
  const context = useContext(AudioLibraryContext);
  if (!context) {
    throw new Error('useAudioLibrary must be used within AudioLibraryProvider');
  }
  return context;
};

interface AudioLibraryProviderProps {
  children: React.ReactNode;
}

export const AudioLibraryProvider: React.FC<AudioLibraryProviderProps> = ({ children }) => {
  const [audios, setAudios] = useState<SavedAudio[]>([]);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audios from localStorage
  useEffect(() => {
    const loadedAudios = storageAudios.getAll();
    setAudios(loadedAudios);
  }, []);

  const saveAudio = useCallback((
    projectId: string,
    name: string,
    prompt: string,
    audioBuffer: AudioBuffer,
    voiceConfig: { gender: string; voice: string }
  ): SavedAudio => {
    // Convert AudioBuffer to base64
    const channelData = audioBuffer.getChannelData(0);
    const pcm16 = new Int16Array(channelData.length);
    
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    
    // Convert to base64 in chunks to avoid call stack size exceeded error
    const uint8Array = new Uint8Array(pcm16.buffer);
    const chunkSize = 8192; // Process 8KB at a time
    let binaryString = '';
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binaryString += String.fromCharCode(...Array.from(chunk));
    }
    
    const audioData = btoa(binaryString);

    const newAudio: SavedAudio = {
      id: generateId(),
      projectId,
      name,
      prompt,
      audioData,
      duration: audioBuffer.duration,
      createdAt: Date.now(),
      voiceConfig,
    };

    storageAudios.save(newAudio);
    setAudios(prev => [...prev, newAudio]);

    return newAudio;
  }, []);

  const deleteAudio = useCallback((id: string) => {
    storageAudios.delete(id);
    setAudios(prev => prev.filter(a => a.id !== id));
    
    // Stop playing if this audio is currently playing
    if (playingAudioId === id) {
      stopAudio();
    }
  }, [playingAudioId]);

  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (error) {
        // Ignore errors if already stopped
      }
      audioSourceRef.current = null;
    }
    setPlayingAudioId(null);
  }, []);

  const playAudio = useCallback(async (id: string): Promise<void> => {
    const audio = audios.find(a => a.id === id);
    if (!audio) {
      throw new Error('Audio not found');
    }

    // Stop currently playing audio
    stopAudio();

    try {
      // Get or create audio context
      if (!audioContextRef.current) {
        audioContextRef.current = createAudioContext();
      }
      const audioContext = audioContextRef.current;

      // Decode base64 to ArrayBuffer
      const binaryString = atob(audio.audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const pcm16 = new Int16Array(bytes.buffer);
      
      // Convert PCM16 to Float32
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
      }

      // Create AudioBuffer
      const audioBuffer = audioContext.createBuffer(
        1, // mono
        float32.length,
        audioContext.sampleRate
      );
      audioBuffer.getChannelData(0).set(float32);

      // Create and play source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        setPlayingAudioId(null);
        audioSourceRef.current = null;
      };

      audioSourceRef.current = source;
      setPlayingAudioId(id);
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingAudioId(null);
      throw error;
    }
  }, [audios, stopAudio]);

  const getAudiosByProject = useCallback((projectId: string): SavedAudio[] => {
    return audios.filter(a => a.projectId === projectId);
  }, [audios]);

  const updateAudioName = useCallback((id: string, name: string) => {
    storageAudios.update(id, { name });
    setAudios(prev => prev.map(a => a.id === id ? { ...a, name } : a));
  }, []);

  const downloadAudio = useCallback((id: string) => {
    const audio = audios.find(a => a.id === id);
    if (!audio) return;

    try {
      // Decode base64 to PCM16 bytes
      const binaryString = atob(audio.audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const pcm16 = new Int16Array(bytes.buffer);
      const sampleRate = 24000; // Default sample rate used in TTS
      
      // Create WAV file
      const wavBuffer = createWavBuffer(pcm16, sampleRate);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${audio.name.replace(/[^a-z0-9]/gi, '_')}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading audio:', error);
    }
  }, [audios]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopAudio]);

  const value: AudioLibraryContextValue = {
    audios,
    saveAudio,
    deleteAudio,
    playAudio,
    stopAudio,
    playingAudioId,
    getAudiosByProject,
    updateAudioName,
    downloadAudio,
  };

  return (
    <AudioLibraryContext.Provider value={value}>
      {children}
    </AudioLibraryContext.Provider>
  );
};
