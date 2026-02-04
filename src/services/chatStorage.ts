/**
 * Chat Storage Service
 * 
 * Handles persistent storage of chat messages with:
 * - Debounced writes to avoid excessive localStorage updates
 * - Maximum message limits per project
 * - Automatic cleanup of old messages
 * - Storage usage tracking and warnings
 * - Separate audio data storage with LRU eviction
 */

import type { ChatMessage, ChatMode } from '../types';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEYS = {
  CHAT_HISTORY: 'voicelab_chat_history',
  AUDIO_DATA: 'voicelab_chat_audio',
} as const;

const MAX_MESSAGES_PER_PROJECT = 100;
const MAX_AUDIO_ENTRIES = 50;
const MAX_TOTAL_STORAGE_MB = 4; // localStorage limit is usually 5MB, leave buffer
const DEBOUNCE_MS = 300;

// =============================================================================
// Types
// =============================================================================

interface ChatHistoryStore {
  [projectId: string]: StoredChatMessage[];
}

interface AudioDataStore {
  entries: AudioDataEntry[];
  totalSize: number;
}

interface AudioDataEntry {
  messageId: string;
  projectId: string;
  data: string; // base64
  size: number;
  accessedAt: number;
}

// Stored message excludes audioData (stored separately for LRU management)
interface StoredChatMessage extends Omit<ChatMessage, 'audioData'> {
  hasAudio?: boolean;
}

interface StorageUsage {
  used: number;       // bytes
  limit: number;      // bytes
  percentage: number; // 0-100
  warning: string | null;
}

// =============================================================================
// Debounce Utility
// =============================================================================

function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
      lastArgs = null;
    }, delay);
  }) as T & { cancel: () => void; flush: () => void };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
    }
  };

  debounced.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      fn(...lastArgs);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return debounced;
}

// =============================================================================
// Internal Helpers
// =============================================================================

function getStorageSize(): number {
  let total = 0;
  for (const key of Object.keys(localStorage)) {
    const item = localStorage.getItem(key);
    if (item) {
      total += key.length + item.length;
    }
  }
  return total * 2; // UTF-16 uses 2 bytes per character
}

function loadChatHistory(): ChatHistoryStore {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('[ChatStorage] Failed to load chat history:', error);
    return {};
  }
}

function saveChatHistoryDirect(store: ChatHistoryStore): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(store));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('[ChatStorage] Storage quota exceeded');
      // Try to free up space by removing oldest entries
      evictOldestMessages(store, 10);
      try {
        localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(store));
      } catch {
        console.error('[ChatStorage] Still cannot save after eviction');
      }
    } else {
      console.error('[ChatStorage] Failed to save chat history:', error);
    }
  }
}

function loadAudioStore(): AudioDataStore {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.AUDIO_DATA);
    return data ? JSON.parse(data) : { entries: [], totalSize: 0 };
  } catch (error) {
    console.error('[ChatStorage] Failed to load audio store:', error);
    return { entries: [], totalSize: 0 };
  }
}

function saveAudioStore(store: AudioDataStore): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIO_DATA, JSON.stringify(store));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('[ChatStorage] Audio storage quota exceeded, evicting oldest');
      evictOldestAudio(store, 5);
      try {
        localStorage.setItem(STORAGE_KEYS.AUDIO_DATA, JSON.stringify(store));
      } catch {
        console.error('[ChatStorage] Still cannot save audio after eviction');
      }
    } else {
      console.error('[ChatStorage] Failed to save audio store:', error);
    }
  }
}

function evictOldestMessages(store: ChatHistoryStore, count: number): void {
  const allMessages: Array<{ projectId: string; message: StoredChatMessage; index: number }> = [];
  
  for (const [projectId, messages] of Object.entries(store)) {
    messages.forEach((message, index) => {
      allMessages.push({ projectId, message, index });
    });
  }
  
  // Sort by timestamp (oldest first)
  allMessages.sort((a, b) => a.message.timestamp - b.message.timestamp);
  
  // Remove oldest
  const toRemove = allMessages.slice(0, count);
  for (const item of toRemove) {
    const projectMessages = store[item.projectId];
    if (projectMessages) {
      const idx = projectMessages.findIndex(m => m.id === item.message.id);
      if (idx !== -1) {
        projectMessages.splice(idx, 1);
      }
    }
  }
}

function evictOldestAudio(store: AudioDataStore, count: number): void {
  // Sort by access time (oldest first)
  store.entries.sort((a, b) => a.accessedAt - b.accessedAt);
  
  // Remove oldest
  const removed = store.entries.splice(0, count);
  for (const entry of removed) {
    store.totalSize -= entry.size;
  }
}

// Debounced save function
const debouncedSave = debounce(saveChatHistoryDirect, DEBOUNCE_MS);

// =============================================================================
// Public API
// =============================================================================

export const chatStorage = {
  /**
   * Save chat messages for a project (debounced)
   */
  save(projectId: string, messages: ChatMessage[]): void {
    const store = loadChatHistory();
    const audioStore = loadAudioStore();
    
    // Separate audio data from messages
    const storedMessages: StoredChatMessage[] = messages.map(msg => {
      if (msg.type === 'audio' && msg.audioData) {
        // Store audio separately
        const existingIndex = audioStore.entries.findIndex(e => e.messageId === msg.id);
        const audioEntry: AudioDataEntry = {
          messageId: msg.id,
          projectId,
          data: msg.audioData,
          size: msg.audioData.length * 2, // UTF-16
          accessedAt: Date.now(),
        };
        
        if (existingIndex >= 0) {
          // Update existing
          audioStore.totalSize -= audioStore.entries[existingIndex].size;
          audioStore.entries[existingIndex] = audioEntry;
        } else {
          audioStore.entries.push(audioEntry);
        }
        audioStore.totalSize += audioEntry.size;
        
        // Enforce audio limit
        while (audioStore.entries.length > MAX_AUDIO_ENTRIES) {
          evictOldestAudio(audioStore, 1);
        }
        
        // Return message without inline audioData
        const { audioData: _, ...rest } = msg;
        return { ...rest, hasAudio: true };
      }
      return msg;
    });
    
    // Enforce message limit per project
    if (storedMessages.length > MAX_MESSAGES_PER_PROJECT) {
      storedMessages.splice(0, storedMessages.length - MAX_MESSAGES_PER_PROJECT);
    }
    
    store[projectId] = storedMessages;
    
    // Save audio store immediately (not debounced - smaller updates)
    saveAudioStore(audioStore);
    
    // Debounce chat history save
    debouncedSave(store);
  },

  /**
   * Load chat messages for a project
   */
  load(projectId: string): ChatMessage[] {
    const store = loadChatHistory();
    const audioStore = loadAudioStore();
    const storedMessages = store[projectId] || [];
    
    // Rehydrate audio data
    return storedMessages.map(msg => {
      if (msg.hasAudio) {
        const audioEntry = audioStore.entries.find(e => e.messageId === msg.id);
        if (audioEntry) {
          // Update access time for LRU
          audioEntry.accessedAt = Date.now();
          return {
            ...msg,
            audioData: audioEntry.data,
          } as ChatMessage;
        }
        // Audio was evicted - mark as unavailable
        console.warn(`[ChatStorage] Audio data for message ${msg.id} was evicted`);
      }
      return msg as ChatMessage;
    });
  },

  /**
   * Clear chat history for a project
   */
  clear(projectId: string): void {
    const store = loadChatHistory();
    const audioStore = loadAudioStore();
    
    // Remove project messages
    delete store[projectId];
    
    // Remove associated audio
    const projectAudio = audioStore.entries.filter(e => e.projectId === projectId);
    for (const entry of projectAudio) {
      audioStore.totalSize -= entry.size;
    }
    audioStore.entries = audioStore.entries.filter(e => e.projectId !== projectId);
    
    saveChatHistoryDirect(store);
    saveAudioStore(audioStore);
  },

  /**
   * Clear all chat history
   */
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.AUDIO_DATA);
  },

  /**
   * Get storage usage information
   */
  getStorageUsage(): StorageUsage {
    const used = getStorageSize();
    const limit = MAX_TOTAL_STORAGE_MB * 1024 * 1024;
    const percentage = Math.round((used / limit) * 100);
    
    let warning: string | null = null;
    if (percentage > 90) {
      warning = 'Storage almost full. Old messages may be deleted automatically.';
    } else if (percentage > 75) {
      warning = 'Storage is getting full. Consider clearing old chat history.';
    }
    
    return { used, limit, percentage, warning };
  },

  /**
   * Get message count for a project
   */
  getMessageCount(projectId: string): number {
    const store = loadChatHistory();
    return (store[projectId] || []).length;
  },

  /**
   * Get all project IDs with chat history
   */
  getProjectIds(): string[] {
    const store = loadChatHistory();
    return Object.keys(store);
  },

  /**
   * Filter messages by mode
   */
  filterByMode(messages: ChatMessage[], mode: ChatMode): ChatMessage[] {
    return messages.filter(m => m.sourceMode === mode);
  },

  /**
   * Flush any pending debounced saves
   */
  flush(): void {
    debouncedSave.flush();
  },

  /**
   * Cancel any pending debounced saves
   */
  cancel(): void {
    debouncedSave.cancel();
  },
};

export type { StorageUsage };
