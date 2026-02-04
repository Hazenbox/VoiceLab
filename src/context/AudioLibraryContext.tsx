import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { SavedAudio } from '../types';
import { storageAudios, generateId } from '../services/storage';
import { createAudioContext } from '../services/audioUtils';

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
    
    const audioData = btoa(
      String.fromCharCode(...Array.from(new Uint8Array(pcm16.buffer)))
    );

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
  };

  return (
    <AudioLibraryContext.Provider value={value}>
      {children}
    </AudioLibraryContext.Provider>
  );
};
