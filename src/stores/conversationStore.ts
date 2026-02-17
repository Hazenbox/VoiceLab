import { create } from 'zustand';
import type {
  EcosystemType,
  ContentChannelType,
  TrustSettings,
} from '../types';
import type { LLMProviderType } from '../services/providers/llm';
import { getDefaultLLMProviderType } from '../services/providers/llm';
import type { TTSProviderType } from '../components';
import type { MidTermMemory } from '../services/memory';
import {
  storageProjectDefaults,
  storageTrustSettings,
} from '../services/trustStorage';

/**
 * Conversation Store -- generation config, provider selection, memory.
 * No UI concerns (modals, panels, editing).
 * Voice state is owned by useVoiceConversation hook, NOT this store.
 *
 * localStorage keys (aligned with App.tsx):
 *   ecosystem/channel -> voicelab_project_defaults (JSON with .ecosystem, .channel)
 *   trustSettings     -> voicelab_trust_settings   (JSON)
 *   midTermMemory     -> jio_voice_midterm_memory  (JSON)
 *
 * Split rule: if this store exceeds 10 state fields or 10 actions, split it.
 */

// One-time migration: delete stale keys from an older store format
const STALE_KEYS = [
  'tone-studio-ecosystem',
  'tone-studio-channel',
  'tone-studio-trust-settings',
  'tone-studio-mid-term-memory',
] as const;

function cleanupStaleKeys() {
  try {
    for (const key of STALE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch { /* noop in private browsing */ }
}

// Run once at module load
cleanupStaleKeys();

// localStorage key for mid-term memory (matches App.tsx)
const MID_TERM_MEMORY_KEY = 'jio_voice_midterm_memory';

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
  setMidTermMemory: (memory: MidTermMemory | null) => void;
}

export const useConversationStore = create<ConversationState & ConversationActions>()((set) => ({
  // initial state -- read from the SAME keys App.tsx uses
  ecosystem: storageProjectDefaults.get().ecosystem,
  contentChannel: storageProjectDefaults.get().channel,
  trustSettings: storageTrustSettings.get(),
  temperature: 0.7,
  maxTokens: 2000,
  streamResponse: true,
  isChatLoading: false,
  selectedLLMProvider: getDefaultLLMProviderType(),
  selectedTTSProvider: 'dashscope' as TTSProviderType,
  selectedTalkLLMProvider: 'qwen-text' as LLMProviderType,
  midTermMemory: (() => {
    try {
      const stored = localStorage.getItem(MID_TERM_MEMORY_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),

  // actions -- persist to the SAME keys App.tsx uses
  setEcosystem: (ecosystem) => {
    try {
      const current = storageProjectDefaults.get();
      storageProjectDefaults.save({ ...current, ecosystem });
    } catch { /* noop */ }
    set({ ecosystem });
  },
  setContentChannel: (channel) => {
    try {
      const current = storageProjectDefaults.get();
      storageProjectDefaults.save({ ...current, channel });
    } catch { /* noop */ }
    set({ contentChannel: channel });
  },
  setTrustSettings: (settings) => {
    try { storageTrustSettings.save(settings); } catch { /* noop */ }
    set({ trustSettings: settings });
  },
  setTemperature: (temperature) => set({ temperature }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),
  setStreamResponse: (streamResponse) => set({ streamResponse }),
  setIsChatLoading: (isChatLoading) => set({ isChatLoading }),
  setSelectedLLMProvider: (provider) => set({ selectedLLMProvider: provider }),
  setSelectedTTSProvider: (provider) => set({ selectedTTSProvider: provider }),
  setSelectedTalkLLMProvider: (provider) => set({ selectedTalkLLMProvider: provider }),
  setMidTermMemory: (memory) => {
    try {
      if (memory) {
        localStorage.setItem(MID_TERM_MEMORY_KEY, JSON.stringify(memory));
      } else {
        localStorage.removeItem(MID_TERM_MEMORY_KEY);
      }
    } catch { /* noop */ }
    set({ midTermMemory: memory });
  },
}));
