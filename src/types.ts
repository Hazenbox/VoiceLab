// Voice gender options
export enum VoiceGender {
  FEMALE = 'female',
  MALE = 'male',
}

// Application states for the conversation mode
export enum AppState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  LISTENING = 'listening',
  SPEAKING = 'speaking',
  ERROR = 'error',
}

// Vibe options for the voice persona
export type Vibe = 'calm' | 'warm' | 'energetic' | 'professional';

// Pace options
export type Pace = 'slow' | 'medium' | 'fast';

// Response length options
export type ResponseLength = 'short' | 'medium' | 'long';

// Language options
export type Language = 'english' | 'hindi' | 'hinglish';

// Persona configuration
export interface PersonaConfig {
  tone: string;
  pace: Pace;
  confidence: 'low' | 'medium' | 'high';
  vibe: Vibe;
  language: Language;
}

// Full conversation configuration
export interface ConversationConfig {
  persona: PersonaConfig;
  greeting: string;
  maxResponseLength: ResponseLength;
}

// Voice information
export interface Voice {
  id: string;
  name: string;
  gender: VoiceGender;
  language: string;
  description: string;
}

// TTS Provider types
export type TTSProviderType = 'alibaba' | 'gemini';
export type ConversationProviderType = 'alibaba' | 'gemini';

// Audio output format
export type AudioFormat = 'mp3' | 'pcm' | 'wav' | 'opus';

// TTS synthesis options
export interface TTSSynthesisOptions {
  text: string;
  voice: string;
  format?: AudioFormat;
  sampleRate?: number;
  volume?: number;
  rate?: number;
  pitch?: number;
}

// Conversation session options
export interface ConversationSessionOptions {
  voice: string;
  systemPrompt: string;
  persona: PersonaConfig;
  greeting: string;
  maxResponseLength: ResponseLength;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

// Active view type
export type ActiveView = 'main' | 'docs';

// Active tab type
export type ActiveTab = 'tts' | 'talk';

// Color mode
export type ColorMode = 'Light' | 'Dark';

// Documentation section
export interface DocSection {
  id: string;
  title: string;
  content: string;
}
