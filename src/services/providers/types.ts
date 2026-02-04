import type { Voice, PersonaConfig, ResponseLength } from '../../types';

/**
 * Voice configuration for TTS synthesis
 */
export interface VoiceConfig {
  voice: string;
  format?: 'mp3' | 'pcm' | 'wav' | 'opus';
  sampleRate?: number;
  volume?: number;  // 0-100
  rate?: number;    // 0.5-2.0
  pitch?: number;   // 0.5-2.0
}

/**
 * TTS Provider Interface
 * Abstraction for text-to-speech services
 */
export interface TTSProvider {
  /** Provider identifier */
  readonly name: string;
  
  /** Provider display name */
  readonly displayName: string;
  
  /**
   * Synthesize text to audio
   * @param text Text to synthesize
   * @param config Voice configuration
   * @param signal Optional AbortSignal for cancellation
   * @returns AudioBuffer containing the synthesized audio
   */
  synthesize(text: string, config: VoiceConfig, signal?: AbortSignal): Promise<AudioBuffer>;
  
  /**
   * Get list of supported voices
   */
  getSupportedVoices(): Voice[];
  
  /**
   * Get default voice for a gender
   * @param gender 'male' or 'female'
   */
  getDefaultVoice(gender: 'male' | 'female'): string;
  
  /**
   * Check if provider is ready (API key configured, etc.)
   */
  isReady(): boolean;
  
  /**
   * Clean up resources
   */
  disconnect(): void;
}

/**
 * Conversation state events
 */
export type ConversationState = 'idle' | 'connecting' | 'connected' | 'listening' | 'processing' | 'speaking' | 'error';

/**
 * Conversation event callbacks
 */
export interface ConversationCallbacks {
  onStateChange?: (state: ConversationState) => void;
  onAudioReceived?: (audio: AudioBuffer) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onResponse?: (text: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Conversation session configuration
 */
export interface ConversationSessionConfig {
  voice: string;
  systemPrompt: string;
  persona: PersonaConfig;
  greeting: string;
  maxResponseLength: ResponseLength;
}

/**
 * Conversation Provider Interface
 * Abstraction for real-time voice conversation services
 */
export interface ConversationProvider {
  /** Provider identifier */
  readonly name: string;
  
  /** Provider display name */
  readonly displayName: string;
  
  /** Current connection state */
  readonly state: ConversationState;
  
  /**
   * Connect to the conversation service
   * @param config Session configuration
   * @param callbacks Event callbacks
   */
  connect(config: ConversationSessionConfig, callbacks: ConversationCallbacks): Promise<void>;
  
  /**
   * Send audio data to the service
   * @param audioData PCM audio data (Float32Array)
   */
  sendAudio(audioData: Float32Array): void;
  
  /**
   * Send text message (for testing without audio)
   * @param text Text to send
   */
  sendText?(text: string): void;
  
  /**
   * Interrupt the current AI response
   */
  interrupt?(): void;
  
  /**
   * Get list of supported voices
   */
  getSupportedVoices(): Voice[];
  
  /**
   * Get default voice for a gender
   */
  getDefaultVoice(gender: 'male' | 'female'): string;
  
  /**
   * Check if provider is ready
   */
  isReady(): boolean;
  
  /**
   * Disconnect and clean up
   */
  disconnect(): void;
}

/**
 * Provider factory type
 */
export type ProviderType = 'alibaba' | 'gemini' | 'elevenlabs';

/**
 * Provider factory interface
 */
export interface ProviderFactory {
  createTTSProvider(type: ProviderType): TTSProvider;
  createConversationProvider(type: ProviderType): ConversationProvider;
}
