/**
 * Chat Storage Service
 * 
 * Handles persistent storage of chat messages with:
 * - Debounced writes to avoid excessive localStorage updates
 * - Maximum message limits per project
 * - Automatic cleanup of old messages
 * - Storage usage tracking and warnings
 * - Audio data stored in IndexedDB for large capacity (supports 5+ mins per chat)
 * - Text messages stored in localStorage for quick access
 */

import type { ChatMessage, ChatMode } from '../types';
import { audioIndexedDB, type AudioEntry } from './audioIndexedDB';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEYS = {
  CHAT_HISTORY: 'voicelab_chat_history',
  // Audio now stored in IndexedDB, not localStorage
} as const;

const MAX_MESSAGES_PER_PROJECT = 100;
const MAX_TOTAL_STORAGE_MB = 4; // localStorage limit for text messages only
const DEBOUNCE_MS = 300;

// =============================================================================
// Types
// =============================================================================

interface ChatHistoryStore {
  [projectId: string]: StoredChatMessage[];
}

// Stored message excludes audioData (stored separately in IndexedDB)
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
      fn(...(lastArgs as Parameters<T>));
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

// Audio storage is now handled by IndexedDB (audioIndexedDB.ts)
// This provides 50MB+ capacity instead of localStorage's 5MB limit

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

// Debounced save function
const debouncedSave = debounce(saveChatHistoryDirect, DEBOUNCE_MS);

// =============================================================================
// Public API
// =============================================================================

// =============================================================================
// Migration: Move old localStorage audio to IndexedDB (one-time)
// =============================================================================

const MIGRATION_KEY = 'voicelab_audio_migrated_to_indexeddb';
const OLD_AUDIO_DATA_KEY = 'voicelab_chat_audio';

interface OldAudioDataStore {
  entries: Array<{
    messageId: string;
    projectId: string;
    data: string; // base64
    size: number;
    accessedAt: number;
  }>;
  totalSize: number;
}

async function migrateOldAudioToIndexedDB(): Promise<void> {
  // Check if migration already done
  if (localStorage.getItem(MIGRATION_KEY)) {
    return;
  }

  try {
    const oldAudioData = localStorage.getItem(OLD_AUDIO_DATA_KEY);
    if (!oldAudioData) {
      // No old data to migrate
      localStorage.setItem(MIGRATION_KEY, 'true');
      return;
    }

    const oldStore: OldAudioDataStore = JSON.parse(oldAudioData);
    console.log(`[ChatStorage] Migrating ${oldStore.entries.length} audio entries from localStorage to IndexedDB...`);

    for (const entry of oldStore.entries) {
      try {
        const audioBlob = audioIndexedDB.base64ToBlob(entry.data);
        const audioEntry: AudioEntry = {
          id: entry.messageId,
          projectId: entry.projectId,
          data: audioBlob,
          size: audioBlob.size,
          duration: 0, // Unknown from old format
          sampleRate: 24000, // Default
          accessedAt: entry.accessedAt,
          createdAt: entry.accessedAt,
        };
        await audioIndexedDB.save(audioEntry);
      } catch (err) {
        console.error(`[ChatStorage] Failed to migrate audio entry ${entry.messageId}:`, err);
      }
    }

    // Remove old localStorage data to free up space
    localStorage.removeItem(OLD_AUDIO_DATA_KEY);
    localStorage.setItem(MIGRATION_KEY, 'true');
    console.log('[ChatStorage] Audio migration complete');
  } catch (err) {
    console.error('[ChatStorage] Audio migration failed:', err);
  }
}

// Run migration on module load (async, non-blocking)
migrateOldAudioToIndexedDB();

// =============================================================================
// Public API
// =============================================================================

export const chatStorage = {
  /**
   * Save chat messages for a project (debounced)
   * Text messages go to localStorage, audio data goes to IndexedDB
   */
  async save(projectId: string, messages: ChatMessage[]): Promise<void> {
    const store = loadChatHistory();
    
    // Separate audio data from messages and save to IndexedDB
    const storedMessages: StoredChatMessage[] = [];
    
    for (const msg of messages) {
      if (msg.type === 'audio' && msg.audioData) {
        // Save audio to IndexedDB (async)
        const audioBlob = audioIndexedDB.base64ToBlob(msg.audioData);
        const audioEntry: AudioEntry = {
          id: msg.id,
          projectId,
          data: audioBlob,
          size: audioBlob.size,
          duration: msg.audioDuration || 0,
          sampleRate: msg.audioSampleRate || 24000,
          accessedAt: Date.now(),
          createdAt: msg.timestamp,
        };
        
        // Save audio asynchronously (don't await to avoid blocking)
        audioIndexedDB.save(audioEntry).catch(err => {
          console.error('[ChatStorage] Failed to save audio to IndexedDB:', err);
        });
        
        // Return message without inline audioData
        const { audioData: _, ...rest } = msg;
        storedMessages.push({ ...rest, hasAudio: true });
      } else {
        storedMessages.push(msg);
      }
    }
    
    // Enforce message limit per project
    if (storedMessages.length > MAX_MESSAGES_PER_PROJECT) {
      storedMessages.splice(0, storedMessages.length - MAX_MESSAGES_PER_PROJECT);
    }
    
    store[projectId] = storedMessages;
    
    // Debounce chat history save (localStorage - small)
    debouncedSave(store);
    
    // Ensure IndexedDB storage limits are maintained (async, non-blocking)
    audioIndexedDB.ensureLimit().catch(err => {
      console.warn('[ChatStorage] Failed to enforce storage limit:', err);
    });
  },

  /**
   * Load chat messages for a project
   * Returns synchronously with text, audio loaded async
   */
  load(projectId: string): ChatMessage[] {
    const store = loadChatHistory();
    const storedMessages = store[projectId] || [];
    
    // Return messages immediately (audio will be loaded on-demand)
    return storedMessages.map(msg => msg as ChatMessage);
  },

  /**
   * Load chat messages with audio data (async)
   * Use this when you need the actual audio data
   */
  async loadWithAudio(projectId: string): Promise<ChatMessage[]> {
    const store = loadChatHistory();
    const storedMessages = store[projectId] || [];
    
    // Rehydrate audio data from IndexedDB
    const messagesWithAudio = await Promise.all(
      storedMessages.map(async (msg) => {
        if (msg.hasAudio) {
          try {
            const audioEntry = await audioIndexedDB.get(msg.id);
            if (audioEntry) {
              const audioData = await audioIndexedDB.blobToBase64(audioEntry.data);
              return {
                ...msg,
                audioData,
              } as ChatMessage;
            }
            // Audio was evicted or not found
            console.warn(`[ChatStorage] Audio data for message ${msg.id} not found in IndexedDB`);
          } catch (err) {
            console.error(`[ChatStorage] Failed to load audio for message ${msg.id}:`, err);
          }
        }
        return msg as ChatMessage;
      })
    );
    
    return messagesWithAudio;
  },

  /**
   * Load audio for a specific message
   */
  async loadMessageAudio(messageId: string): Promise<string | null> {
    try {
      const audioEntry = await audioIndexedDB.get(messageId);
      if (audioEntry) {
        return await audioIndexedDB.blobToBase64(audioEntry.data);
      }
      return null;
    } catch (err) {
      console.error(`[ChatStorage] Failed to load audio for message ${messageId}:`, err);
      return null;
    }
  },

  /**
   * Clear chat history for a project
   */
  async clear(projectId: string): Promise<void> {
    const store = loadChatHistory();
    
    // Remove project messages from localStorage
    delete store[projectId];
    saveChatHistoryDirect(store);
    
    // Remove associated audio from IndexedDB
    try {
      await audioIndexedDB.deleteProject(projectId);
    } catch (err) {
      console.error('[ChatStorage] Failed to delete project audio:', err);
    }
  },

  /**
   * Clear all chat history
   */
  async clearAll(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    
    // Clear all audio from IndexedDB
    try {
      await audioIndexedDB.clearAll();
    } catch (err) {
      console.error('[ChatStorage] Failed to clear audio IndexedDB:', err);
    }
  },

  /**
   * Get storage usage information (localStorage only - text messages)
   */
  getStorageUsage(): StorageUsage {
    const used = getStorageSize();
    const limit = MAX_TOTAL_STORAGE_MB * 1024 * 1024;
    const percentage = Math.round((used / limit) * 100);
    
    let warning: string | null = null;
    if (percentage > 90) {
      warning = 'Text storage almost full. Old messages may be deleted automatically.';
    } else if (percentage > 75) {
      warning = 'Text storage is getting full. Consider clearing old chat history.';
    }
    
    return { used, limit, percentage, warning };
  },

  /**
   * Get audio storage usage information (IndexedDB)
   */
  async getAudioStorageUsage(): Promise<{
    entryCount: number;
    totalSize: number;
    maxSize: number;
    usagePercent: number;
    isNearQuota: boolean;
  }> {
    try {
      return await audioIndexedDB.getStats();
    } catch (err) {
      console.error('[ChatStorage] Failed to get audio storage stats:', err);
      return {
        entryCount: 0,
        totalSize: 0,
        maxSize: 100 * 1024 * 1024, // 100MB
        usagePercent: 0,
        isNearQuota: false,
      };
    }
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
