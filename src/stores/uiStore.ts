import { create } from 'zustand';
import type { ActiveView, ChatMode, AppError } from '../types';

/**
 * UI Store -- purely visual/interaction state.
 * No business logic, no service imports.
 *
 * Split rule: if this store exceeds 10 state fields or 10 actions, split it.
 */

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
}

const CHAT_MODE_STORAGE_KEY = 'tone-studio-chat-mode';

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
  showOnboarding: false,
  showTrustPanel: false,
  selectedMessageForTrust: null,
  dislikeModalMessageId: null,
  editingMessageId: null,
  editValue: '',
  isAutoFixing: false,
  error: null,

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
}));
