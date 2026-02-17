import { create } from 'zustand';
import type {
  EcosystemType,
  ContentChannelType,
  TrustSettings,
  AppState,
} from '../types';
import { AppState as AppStateEnum } from '../types';
import type { LLMProviderType } from '../services/providers/llm';
import { getDefaultLLMProviderType } from '../services/providers/llm';
import type { TTSProviderType } from '../components';
import type { MidTermMemory } from '../services/memory';
import { DEFAULT_TRUST_SETTINGS } from '../types';

/**
 * Conversation Store -- generation config, provider selection, voice state, memory.
 * No UI concerns (modals, panels, editing).
 *
 * Split rule: if this store exceeds 10 state fields or 10 actions, split it.
 */

interface ConversationState {
  // content trust config
  ecosystem: EcosystemType;
  contentChannel: ContentChannelType;
  trustSettings: TrustSettings;

  // generation params
  temperature: number;
  maxTokens: number;
  streamResponse: boolean;
  isChatLoading: boolean;

  // provider selection
  selectedLLMProvider: LLMProviderType;
  selectedTTSProvider: TTSProviderType;
  selectedTalkLLMProvider: LLMProviderType;

  // voice state
  voiceSupported: boolean | null;
  appState: AppState;
  transcript: string;
  streamingAIResponse: string;

  // memory
  midTermMemory: MidTermMemory | null;
}

interface ConversationActions {
  setEcosystem: (ecosystem: EcosystemType) => void;
  setContentChannel: (channel: ContentChannelType) => void;
  setTrustSettings: (settings: TrustSettings) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setStreamResponse: (stream: boolean) => void;
  setIsChatLoading: (loading: boolean) => void;
  setSelectedLLMProvider: (provider: LLMProviderType) => void;
  setSelectedTTSProvider: (provider: TTSProviderType) => void;
  setSelectedTalkLLMProvider: (provider: LLMProviderType) => void;
  setVoiceSupported: (supported: boolean | null) => void;
  setAppState: (state: AppState) => void;
  setTranscript: (transcript: string) => void;
  setStreamingAIResponse: (response: string) => void;
  setMidTermMemory: (memory: MidTermMemory | null) => void;
}

export const useConversationStore = create<ConversationState & ConversationActions>()((set) => ({
  // initial state
  ecosystem: (() => {
    try {
      const stored = localStorage.getItem('tone-studio-ecosystem');
      return (stored as EcosystemType) || 'connectivity';
    } catch {
      return 'connectivity' as EcosystemType;
    }
  })(),
  contentChannel: (() => {
    try {
      const stored = localStorage.getItem('tone-studio-channel');
      return (stored as ContentChannelType) || 'push_notification';
    } catch {
      return 'push_notification' as ContentChannelType;
    }
  })(),
  trustSettings: (() => {
    try {
      const stored = localStorage.getItem('tone-studio-trust-settings');
      return stored ? JSON.parse(stored) : DEFAULT_TRUST_SETTINGS;
    } catch {
      return DEFAULT_TRUST_SETTINGS;
    }
  })(),
  temperature: 0.7,
  maxTokens: 2000,
  streamResponse: true,
  isChatLoading: false,
  selectedLLMProvider: getDefaultLLMProviderType(),
  selectedTTSProvider: 'dashscope' as TTSProviderType,
  selectedTalkLLMProvider: 'qwen-text' as LLMProviderType,
  voiceSupported: null,
  appState: AppStateEnum.IDLE,
  transcript: '',
  streamingAIResponse: '',
  midTermMemory: (() => {
    try {
      const stored = localStorage.getItem('tone-studio-mid-term-memory');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),

  // actions
  setEcosystem: (ecosystem) => {
    try { localStorage.setItem('tone-studio-ecosystem', ecosystem); } catch { /* noop */ }
    set({ ecosystem });
  },
  setContentChannel: (channel) => {
    try { localStorage.setItem('tone-studio-channel', channel); } catch { /* noop */ }
    set({ contentChannel: channel });
  },
  setTrustSettings: (settings) => {
    try { localStorage.setItem('tone-studio-trust-settings', JSON.stringify(settings)); } catch { /* noop */ }
    set({ trustSettings: settings });
  },
  setTemperature: (temperature) => set({ temperature }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),
  setStreamResponse: (streamResponse) => set({ streamResponse }),
  setIsChatLoading: (isChatLoading) => set({ isChatLoading }),
  setSelectedLLMProvider: (provider) => set({ selectedLLMProvider: provider }),
  setSelectedTTSProvider: (provider) => set({ selectedTTSProvider: provider }),
  setSelectedTalkLLMProvider: (provider) => set({ selectedTalkLLMProvider: provider }),
  setVoiceSupported: (supported) => set({ voiceSupported: supported }),
  setAppState: (state) => set({ appState: state }),
  setTranscript: (transcript) => set({ transcript }),
  setStreamingAIResponse: (response) => set({ streamingAIResponse: response }),
  setMidTermMemory: (memory) => {
    try {
      if (memory) {
        localStorage.setItem('tone-studio-mid-term-memory', JSON.stringify(memory));
      } else {
        localStorage.removeItem('tone-studio-mid-term-memory');
      }
    } catch { /* noop */ }
    set({ midTermMemory: memory });
  },
}));
