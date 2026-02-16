/**
 * Messages Hook (Phase 4.1)
 * 
 * Extracts message management from App.tsx.
 * Handles chat history, message operations, and persistence.
 * 
 * @module hooks/useMessages
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { logger } from '../utils/logger';

// =============================================================================
// Types
// =============================================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  
  // Metadata
  ecosystem?: string;
  channel?: string;
  trustScore?: number;
  violations?: Array<{ rule: string; severity: string }>;
  wasRegenerated?: boolean;
  regenerationCount?: number;
  
  // Voice-specific
  isVoiceInput?: boolean;
  audioUrl?: string;
  transcriptionConfidence?: number;
  
  // Feedback
  feedbackType?: 'thumbs_up' | 'thumbs_down' | 'edit';
  feedbackComment?: string;
  editedContent?: string;
}

export interface MessagesState {
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  lastMessageId: string | null;
}

export interface UseMessagesOptions {
  maxMessages?: number;
  persistKey?: string;
  onMessageAdded?: (message: Message) => void;
  onMessageUpdated?: (message: Message) => void;
  onMessageDeleted?: (messageId: string) => void;
}

export interface UseMessagesReturn {
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Message;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;
  
  // Bulk operations
  setMessages: (messages: Message[]) => void;
  appendMessages: (messages: Message[]) => void;
  
  // Queries
  getLastMessage: () => Message | null;
  getLastUserMessage: () => Message | null;
  getLastAssistantMessage: () => Message | null;
  getMessageById: (id: string) => Message | null;
  getMessageCount: () => number;
  
  // Feedback
  addFeedback: (messageId: string, feedback: { type: 'thumbs_up' | 'thumbs_down' | 'edit'; comment?: string; editedContent?: string }) => void;
  
  // Utilities
  exportMessages: () => string;
  importMessages: (json: string) => boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_MESSAGES = 100;
const STORAGE_PREFIX = 'voiceDesigner_messages_';

// =============================================================================
// Helpers
// =============================================================================

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function loadMessagesFromStorage(key: string): Message[] {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    logger.warn('[Messages] Failed to load from storage', e);
  }
  return [];
}

function saveMessagesToStorage(key: string, messages: Message[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(messages));
  } catch (e) {
    logger.warn('[Messages] Failed to save to storage', e);
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useMessages(options: UseMessagesOptions = {}): UseMessagesReturn {
  const {
    maxMessages = DEFAULT_MAX_MESSAGES,
    persistKey,
    onMessageAdded,
    onMessageUpdated,
    onMessageDeleted,
  } = options;
  
  // State - initialize from storage if persistKey provided
  const [messages, setMessagesState] = useState<Message[]>(() => {
    if (persistKey) {
      return loadMessagesFromStorage(persistKey);
    }
    return [];
  });
  
  // Ref for callbacks to avoid stale closures
  const callbacksRef = useRef({ onMessageAdded, onMessageUpdated, onMessageDeleted });
  callbacksRef.current = { onMessageAdded, onMessageUpdated, onMessageDeleted };
  
  /**
   * Save to storage when messages change
   */
  const saveToStorage = useCallback((msgs: Message[]) => {
    if (persistKey) {
      saveMessagesToStorage(persistKey, msgs);
    }
  }, [persistKey]);
  
  /**
   * Set messages (replace all)
   */
  const setMessages = useCallback((newMessages: Message[]) => {
    const trimmed = newMessages.slice(-maxMessages);
    setMessagesState(trimmed);
    saveToStorage(trimmed);
  }, [maxMessages, saveToStorage]);
  
  /**
   * Add a new message
   */
  const addMessage = useCallback((messageData: Omit<Message, 'id' | 'timestamp'>): Message => {
    const message: Message = {
      ...messageData,
      id: generateMessageId(),
      timestamp: Date.now(),
    };
    
    setMessagesState(prev => {
      const updated = [...prev, message].slice(-maxMessages);
      saveToStorage(updated);
      return updated;
    });
    
    callbacksRef.current.onMessageAdded?.(message);
    logger.debug('[Messages] Added', { id: message.id, role: message.role });
    
    return message;
  }, [maxMessages, saveToStorage]);
  
  /**
   * Update an existing message
   */
  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessagesState(prev => {
      const index = prev.findIndex(m => m.id === id);
      if (index === -1) {
        logger.warn('[Messages] Message not found for update', { id });
        return prev;
      }
      
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      saveToStorage(updated);
      
      callbacksRef.current.onMessageUpdated?.(updated[index]);
      
      return updated;
    });
  }, [saveToStorage]);
  
  /**
   * Delete a message
   */
  const deleteMessage = useCallback((id: string) => {
    setMessagesState(prev => {
      const filtered = prev.filter(m => m.id !== id);
      if (filtered.length === prev.length) {
        logger.warn('[Messages] Message not found for deletion', { id });
        return prev;
      }
      
      saveToStorage(filtered);
      callbacksRef.current.onMessageDeleted?.(id);
      
      return filtered;
    });
  }, [saveToStorage]);
  
  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessagesState([]);
    saveToStorage([]);
    logger.info('[Messages] Cleared all messages');
  }, [saveToStorage]);
  
  /**
   * Append messages (for loading history)
   */
  const appendMessages = useCallback((newMessages: Message[]) => {
    setMessagesState(prev => {
      const combined = [...prev, ...newMessages].slice(-maxMessages);
      saveToStorage(combined);
      return combined;
    });
  }, [maxMessages, saveToStorage]);
  
  /**
   * Get last message of any type
   */
  const getLastMessage = useCallback((): Message | null => {
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }, [messages]);
  
  /**
   * Get last user message
   */
  const getLastUserMessage = useCallback((): Message | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i];
      }
    }
    return null;
  }, [messages]);
  
  /**
   * Get last assistant message
   */
  const getLastAssistantMessage = useCallback((): Message | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        return messages[i];
      }
    }
    return null;
  }, [messages]);
  
  /**
   * Get message by ID
   */
  const getMessageById = useCallback((id: string): Message | null => {
    return messages.find(m => m.id === id) || null;
  }, [messages]);
  
  /**
   * Get message count
   */
  const getMessageCount = useCallback((): number => {
    return messages.length;
  }, [messages]);
  
  /**
   * Add feedback to a message
   */
  const addFeedback = useCallback((
    messageId: string,
    feedback: { type: 'thumbs_up' | 'thumbs_down' | 'edit'; comment?: string; editedContent?: string },
  ) => {
    updateMessage(messageId, {
      feedbackType: feedback.type,
      feedbackComment: feedback.comment,
      editedContent: feedback.editedContent,
    });
    
    logger.info('[Messages] Feedback added', { messageId, type: feedback.type });
  }, [updateMessage]);
  
  /**
   * Export messages to JSON
   */
  const exportMessages = useCallback((): string => {
    return JSON.stringify(messages, null, 2);
  }, [messages]);
  
  /**
   * Import messages from JSON
   */
  const importMessages = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        logger.warn('[Messages] Invalid import format - not an array');
        return false;
      }
      
      // Validate message structure
      const valid = parsed.every(m => 
        m && typeof m.id === 'string' && 
        typeof m.role === 'string' &&
        typeof m.content === 'string'
      );
      
      if (!valid) {
        logger.warn('[Messages] Invalid import format - message structure');
        return false;
      }
      
      setMessages(parsed);
      logger.info('[Messages] Imported', { count: parsed.length });
      return true;
      
    } catch (e) {
      logger.error('[Messages] Import failed', e);
      return false;
    }
  }, [setMessages]);
  
  return {
    messages,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    setMessages,
    appendMessages,
    getLastMessage,
    getLastUserMessage,
    getLastAssistantMessage,
    getMessageById,
    getMessageCount,
    addFeedback,
    exportMessages,
    importMessages,
  };
}
