import { create } from 'zustand';
import type { ActiveView, ChatMode, AppError } from '../types';
import { getDeviceId } from '../components/OnboardingModal';

/**
 * UI Store -- purely visual/interaction state.
 * No business logic, no service imports.
 *
 * localStorage keys (aligned with App.tsx):
 *   chatMode -> voiceDesigner_chatMode (string)
 *
 * Split rule: if this store exceeds 10 state fields or 10 actions, split it.
 */

// One-time migration: delete stale key from older store format
try { localStorage.removeItem('tone-studio-chat-mode'); } catch { /* noop */ }

// Matches the key App.tsx has always used
const CHAT_MODE_STORAGE_KEY = 'voiceDesigner_chatMode';
const DISMISSED_EXPLORATIONS_KEY = 'voiceDesigner_dismissedExplorations';
const MAX_DISMISSED_EXPLORATIONS = 100;

interface UIState {
  // navigation
  activeView: ActiveView;
  chatMode: ChatMode;
  isConfigPanelCollapsed: boolean;

  // modals & panels
  showOnboarding: boolean;
  showTrustPanel: boolean;
  selectedMessageForTrust: string | null;
  dislikeModalMessageId: string | null;

  // inline editing
  editingMessageId: string | null;
  editValue: string;

  // loading / status
  isAutoFixing: boolean;
  error: AppError | null;

  // highlight state for trust panel interactions
  highlightedText: string | null;
  highlightedMessageId: string | null;

  // JioSaavn exploration dismissed state
  dismissedExplorations: Set<string>;
}

interface UIActions {
  setActiveView: (view: ActiveView) => void;
  setChatMode: (mode: ChatMode) => void;
  setConfigPanelCollapsed: (collapsed: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  setShowTrustPanel: (show: boolean) => void;
  setSelectedMessageForTrust: (id: string | null) => void;
  setDislikeModalMessageId: (id: string | null) => void;
  setEditingMessage: (id: string | null, value?: string) => void;
  setEditValue: (value: string) => void;
  setIsAutoFixing: (fixing: boolean) => void;
  setError: (error: AppError | null) => void;
  clearError: () => void;
  setHighlightedText: (text: string | null, messageId: string | null) => void;
  clearHighlight: () => void;
  // JioSaavn exploration actions
  dismissExploration: (messageId: string) => void;
  isExplorationDismissed: (messageId: string) => boolean;
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  // initial state
  activeView: 'main',
  chatMode: (() => {
    try {
      const stored = localStorage.getItem(CHAT_MODE_STORAGE_KEY);
      return (stored === 'voice' || stored === 'copy') ? stored : 'copy';
    } catch {
      return 'copy';
    }
  })() as ChatMode,
  isConfigPanelCollapsed: true,
  showOnboarding: !getDeviceId(),
  showTrustPanel: false,
  selectedMessageForTrust: null,
  dislikeModalMessageId: null,
  editingMessageId: null,
  editValue: '',
  isAutoFixing: false,
  error: null,
  highlightedText: null,
  highlightedMessageId: null,
  dismissedExplorations: (() => {
    try {
      const stored = localStorage.getItem(DISMISSED_EXPLORATIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return new Set<string>(parsed.slice(-MAX_DISMISSED_EXPLORATIONS));
        }
      }
    } catch { /* noop */ }
    return new Set<string>();
  })(),

  // actions
  setActiveView: (view) => set({ activeView: view }),
  setChatMode: (mode) => {
    try { localStorage.setItem(CHAT_MODE_STORAGE_KEY, mode); } catch { /* noop */ }
    set({ chatMode: mode });
  },
  setConfigPanelCollapsed: (collapsed) => set({ isConfigPanelCollapsed: collapsed }),
  setShowOnboarding: (show) => set({ showOnboarding: show }),
  setShowTrustPanel: (show) => set({ showTrustPanel: show }),
  setSelectedMessageForTrust: (id) => set({ selectedMessageForTrust: id }),
  setDislikeModalMessageId: (id) => set({ dislikeModalMessageId: id }),
  setEditingMessage: (id, value = '') => set({ editingMessageId: id, editValue: value }),
  setEditValue: (value) => set({ editValue: value }),
  setIsAutoFixing: (fixing) => set({ isAutoFixing: fixing }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setHighlightedText: (text, messageId) => set({ highlightedText: text, highlightedMessageId: messageId }),
  clearHighlight: () => set({ highlightedText: null, highlightedMessageId: null }),
  dismissExploration: (messageId) => set((state) => {
    const newDismissed = new Set(state.dismissedExplorations);
    newDismissed.add(messageId);
    // Limit size to prevent unbounded growth
    const limitedArray = Array.from(newDismissed).slice(-MAX_DISMISSED_EXPLORATIONS);
    const limitedSet = new Set(limitedArray);
    // Persist to localStorage
    try {
      localStorage.setItem(DISMISSED_EXPLORATIONS_KEY, JSON.stringify(limitedArray));
    } catch { /* noop */ }
    return { dismissedExplorations: limitedSet };
  }),
  isExplorationDismissed: (messageId) => {
    // This is a selector, not an action - access via useUIStore.getState()
    return false; // Placeholder - actual check done via state access
  },
}));
