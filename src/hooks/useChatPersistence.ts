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
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatStorage, type StorageUsage } from '../services/chatStorage';
import type { ChatMessage, ChatMode } from '../types';

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
    setMessagesInternal(loadedMessages);
    setIsLoaded(true);
    
    // Update storage usage
    setStorageUsage(chatStorage.getStorageUsage());
    
    // Load audio data asynchronously in background
    chatStorage.loadWithAudio(projectId).then(messagesWithAudio => {
      // Only update if we're still on the same project
      if (projectIdRef.current === projectId) {
        setMessagesInternal(messagesWithAudio);
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
    clearHistory,
    storageUsage,
    storageWarning: storageUsage.warning,
    isLoaded,
    forceSave,
  };
}

export default useChatPersistence;
