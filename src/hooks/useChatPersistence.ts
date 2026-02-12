/**
 * useChatPersistence Hook
 * 
 * Manages chat message persistence with localStorage (text) + IndexedDB (audio).
 * 
 * Features:
 * - Auto-load messages on project switch
 * - Auto-save on message changes (debounced)
 * - Large audio storage via IndexedDB (supports 5+ mins per chat)
 * - Storage usage warnings
 * - Project-scoped storage
 * - Multi-tab synchronization (Phase 4: Reliability)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatStorage, type StorageUsage } from '../services/chatStorage';
import type { ChatMessage, ChatMode } from '../types';
import { migrateMessageVersion } from '../types';
import { subscribeToStorageChanges } from '../services/reliability';

// Storage key constant (must match chatStorage)
const CHAT_HISTORY_KEY = 'voicelab_chat_history';

// =============================================================================
// Types
// =============================================================================

interface UseChatPersistenceOptions {
  /** Enable auto-save (default: true) */
  autoSave?: boolean;
  /** Filter messages by mode */
  filterMode?: ChatMode;
}

interface UseChatPersistenceReturn {
  /** Current messages */
  messages: ChatMessage[];
  /** Set messages (also persists if autoSave enabled) */
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  /** Add a single message */
  addMessage: (message: ChatMessage) => void;
  /** Remove a message by ID */
  removeMessage: (messageId: string) => void;
  /** Update a specific message by ID with an updater function */
  updateMessage: (messageId: string, updater: (message: ChatMessage) => ChatMessage) => void;
  /** Replace a message entirely (for regeneration) */
  replaceMessage: (messageId: string, newMessage: ChatMessage) => void;
  /** Clear all messages for the project */
  clearHistory: () => void;
  /** Storage usage info */
  storageUsage: StorageUsage;
  /** Storage warning message (if any) */
  storageWarning: string | null;
  /** Whether initial load is complete */
  isLoaded: boolean;
  /** Force save (flushes debounce) */
  forceSave: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useChatPersistence(
  projectId: string | null,
  options: UseChatPersistenceOptions = {}
): UseChatPersistenceReturn {
  const { autoSave = true, filterMode } = options;
  
  // State
  const [messages, setMessagesInternal] = useState<ChatMessage[]>([]);
  const [storageUsage, setStorageUsage] = useState<StorageUsage>({
    used: 0,
    limit: 4 * 1024 * 1024,
    percentage: 0,
    warning: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Refs for avoiding stale closures
  const projectIdRef = useRef(projectId);
  const messagesRef = useRef(messages);
  
  // Update refs
  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  // Load messages when project changes
  useEffect(() => {
    if (!projectId) {
      setMessagesInternal([]);
      setIsLoaded(true);
      return;
    }
    
    // Load text messages immediately (synchronous)
    const loadedMessages = chatStorage.load(projectId);
    // Apply migration for backward compatibility with existing messages
    const migratedMessages = loadedMessages.map(migrateMessageVersion);
    setMessagesInternal(migratedMessages);
    setIsLoaded(true);
    
    // Update storage usage
    setStorageUsage(chatStorage.getStorageUsage());
    
    // Load audio data asynchronously in background
    chatStorage.loadWithAudio(projectId).then(messagesWithAudio => {
      // Only update if we're still on the same project
      if (projectIdRef.current === projectId) {
        // Also apply migration to audio messages
        const migratedWithAudio = messagesWithAudio.map(migrateMessageVersion);
        setMessagesInternal(migratedWithAudio);
      }
    }).catch(err => {
      console.error('[useChatPersistence] Failed to load audio data:', err);
    });
    
    // Cleanup on project change
    return () => {
      if (autoSave) {
        chatStorage.flush();
      }
    };
  }, [projectId, autoSave]);
  
  // Auto-save when messages change
  useEffect(() => {
    if (!projectId || !autoSave || !isLoaded) return;
    
    chatStorage.save(projectId, messages);
    setStorageUsage(chatStorage.getStorageUsage());
  }, [messages, projectId, autoSave, isLoaded]);
  
  // Multi-tab synchronization: Listen for changes from other tabs
  useEffect(() => {
    if (!projectId) return;
    
    const unsubscribe = subscribeToStorageChanges(CHAT_HISTORY_KEY, (_key, newValue) => {
      if (!newValue || !projectIdRef.current) return;
      
      try {
        const allProjectMessages = JSON.parse(newValue);
        const projectMessages = allProjectMessages[projectIdRef.current];
        
        if (projectMessages && Array.isArray(projectMessages)) {
          // Only update if different from current state (avoid infinite loops)
          const currentIds = new Set(messagesRef.current.map(m => m.id));
          const newIds = new Set(projectMessages.map((m: ChatMessage) => m.id));
          
          // Check if there are actual differences
          const hasNewMessages = projectMessages.some((m: ChatMessage) => !currentIds.has(m.id));
          const hasRemovedMessages = messagesRef.current.some(m => !newIds.has(m.id));
          
          if (hasNewMessages || hasRemovedMessages) {
            console.log('[useChatPersistence] Syncing messages from another tab');
            const migratedMessages = projectMessages.map(migrateMessageVersion);
            setMessagesInternal(migratedMessages);
          }
        }
      } catch (error) {
        console.error('[useChatPersistence] Failed to sync from other tab:', error);
      }
    });
    
    return unsubscribe;
  }, [projectId]);
  
  // Set messages wrapper
  const setMessages = useCallback<React.Dispatch<React.SetStateAction<ChatMessage[]>>>(
    (action) => {
      setMessagesInternal(prev => {
        const next = typeof action === 'function' ? action(prev) : action;
        return next;
      });
    },
    []
  );
  
  // Add a single message
  const addMessage = useCallback((message: ChatMessage) => {
    setMessagesInternal(prev => [...prev, message]);
  }, []);
  
  // Remove a message by ID
  const removeMessage = useCallback((messageId: string) => {
    setMessagesInternal(prev => prev.filter(m => m.id !== messageId));
  }, []);
  
  // Update a specific message by ID with an updater function
  const updateMessage = useCallback((
    messageId: string, 
    updater: (message: ChatMessage) => ChatMessage
  ) => {
    setMessagesInternal(prev => 
      prev.map(m => m.id === messageId ? updater(m) : m)
    );
  }, []);
  
  // Replace a message entirely (for regeneration)
  const replaceMessage = useCallback((
    messageId: string,
    newMessage: ChatMessage
  ) => {
    setMessagesInternal(prev =>
      prev.map(m => m.id === messageId ? newMessage : m)
    );
  }, []);
  
  // Clear history
  const clearHistory = useCallback(async () => {
    if (!projectIdRef.current) return;
    
    await chatStorage.clear(projectIdRef.current);
    setMessagesInternal([]);
    setStorageUsage(chatStorage.getStorageUsage());
  }, []);
  
  // Force save
  const forceSave = useCallback(() => {
    if (!projectIdRef.current) return;
    chatStorage.flush();
  }, []);
  
  // Filter messages if mode filter is specified
  const filteredMessages = filterMode
    ? messages.filter(m => m.sourceMode === filterMode)
    : messages;
  
  return {
    messages: filteredMessages,
    setMessages,
    addMessage,
    removeMessage,
    updateMessage,
    replaceMessage,
    clearHistory,
    storageUsage,
    storageWarning: storageUsage.warning,
    isLoaded,
    forceSave,
  };
}

export default useChatPersistence;
