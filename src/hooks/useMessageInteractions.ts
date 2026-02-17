/**
 * useMessageInteractions -- message editing, feedback, version navigation
 *
 * Extracted from App.tsx. Handles:
 * - Edit flow (start, cancel, submit, version change)
 * - Like/Dislike feedback with modal
 * - Try Again (regeneration)
 */

import { useState, useRef, useCallback } from 'react';
import type { PromptVersion, SendMessageOptions, SendMessageResult } from '../types';
import { featureFlags } from '../services/featureFlags';
import { getConstitutionalWrapper } from '../services/generation/constitutionalWrapper';
import type { FeedbackPayload } from '../types';

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  parentMessageId?: string;
  userFeedback?: string;
  promptVersions?: PromptVersion[];
  timestamp?: number;
  [key: string]: unknown;
}

interface UseMessageInteractionsParams {
  chatMessages: ChatMessage[];
  updateMessage: (id: string, updater: (msg: ChatMessage) => ChatMessage) => void;
  handleSendChatMessage: (
    message: string,
    options?: SendMessageOptions
  ) => Promise<(SendMessageResult & { aiMessageId?: string }) | null>;
  handleMessageFeedback: (payload: FeedbackPayload) => void;
}

export function useMessageInteractions({
  chatMessages,
  updateMessage,
  handleSendChatMessage,
  handleMessageFeedback,
}: UseMessageInteractionsParams) {
  // ── Edit Flow State ──────────────────────────────────────────────────
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const editTriggerRef = useRef<string | null>(null);

  // ── Dislike Modal State ──────────────────────────────────────────────
  const [dislikeModalMessageId, setDislikeModalMessageId] = useState<string | null>(null);

  // ── Edit Handlers ────────────────────────────────────────────────────

  const handleStartEdit = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditValue(content);
    editTriggerRef.current = messageId;
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditValue('');
  }, []);

  const handleSubmitEdit = useCallback(async (messageId: string, newContent: string) => {
    const originalMessage = chatMessages.find(m => m.id === messageId);
    if (!originalMessage) return;

    const aiResponseIndex = chatMessages.findIndex(
      m => m.parentMessageId === messageId && m.role === 'assistant'
    );
    const currentAiResponse = aiResponseIndex >= 0 ? chatMessages[aiResponseIndex] : null;

    setEditingMessageId(null);
    setEditValue('');

    const result = await handleSendChatMessage(newContent, {
      parentMessageId: messageId,
      replaceResponseId: currentAiResponse?.id,
      skipUserMessage: true,
    });

    if (result?.success) {
      updateMessage(messageId, (msg) => {
        const existingVersions = msg.promptVersions || [{
          content: msg.content,
          timestamp: msg.timestamp || Date.now(),
          responseId: currentAiResponse?.id || '',
        }];

        const newVersion: PromptVersion = {
          content: newContent,
          timestamp: Date.now(),
          responseId: (result as { aiMessageId?: string }).aiMessageId || '',
        };

        return {
          ...msg,
          content: newContent,
          promptVersions: [...existingVersions, newVersion],
          displayVersion: existingVersions.length + 1,
        };
      });
    }
  }, [chatMessages, handleSendChatMessage, updateMessage]);

  const handleVersionChange = useCallback((messageId: string, newVersion: number) => {
    updateMessage(messageId, (msg) => ({
      ...msg,
      displayVersion: newVersion,
    }));
  }, [updateMessage]);

  // ── Feedback Handlers ────────────────────────────────────────────────

  const handleLike = useCallback((messageId: string) => {
    const message = chatMessages.find(m => m.id === messageId);
    if (!message || message.userFeedback) return;

    updateMessage(messageId, (msg) => ({
      ...msg,
      userFeedback: 'like' as const,
    }));

    if (featureFlags.conversationState) {
      try {
        const wrapper = getConstitutionalWrapper();
        const stateManager = wrapper.getStateManager('default');
        if (stateManager) {
          stateManager.recordSatisfaction('positive');
          console.log('[StateManager] Recorded positive satisfaction');
        }
      } catch (err) {
        console.warn('[StateManager] Failed to record satisfaction:', err);
      }
    }

    handleMessageFeedback({
      messageId,
      feedbackType: 'thumbs_up',
      originalContent: message.content,
    });
  }, [chatMessages, updateMessage, handleMessageFeedback]);

  const handleDislike = useCallback((messageId: string) => {
    const message = chatMessages.find(m => m.id === messageId);
    if (!message || message.userFeedback) return;

    updateMessage(messageId, (msg) => ({
      ...msg,
      userFeedback: 'dislike' as const,
    }));

    setDislikeModalMessageId(messageId);
  }, [chatMessages, updateMessage]);

  const handleDislikeModalSubmit = useCallback((reasons: string[], comment: string) => {
    if (!dislikeModalMessageId) return;

    const message = chatMessages.find(m => m.id === dislikeModalMessageId);
    if (!message) return;

    if (featureFlags.conversationState) {
      try {
        const wrapper = getConstitutionalWrapper();
        const stateManager = wrapper.getStateManager('default');
        if (stateManager) {
          stateManager.recordSatisfaction('negative');
          console.log('[StateManager] Recorded negative satisfaction');
        }
      } catch (err) {
        console.warn('[StateManager] Failed to record satisfaction:', err);
      }
    }

    handleMessageFeedback({
      messageId: dislikeModalMessageId,
      feedbackType: 'thumbs_down',
      originalContent: message.content,
      reasons,
      comment,
    });

    setDislikeModalMessageId(null);
  }, [dislikeModalMessageId, chatMessages, handleMessageFeedback]);

  const handleDislikeModalClose = useCallback(() => {
    if (!dislikeModalMessageId) return;

    const message = chatMessages.find(m => m.id === dislikeModalMessageId);
    if (!message) return;

    handleMessageFeedback({
      messageId: dislikeModalMessageId,
      feedbackType: 'thumbs_down',
      originalContent: message.content,
    });

    setDislikeModalMessageId(null);
  }, [dislikeModalMessageId, chatMessages, handleMessageFeedback]);

  // ── Try Again ────────────────────────────────────────────────────────

  const handleTryAgain = useCallback(async (messageId: string) => {
    const aiMessage = chatMessages.find(m => m.id === messageId);
    if (!aiMessage || aiMessage.role !== 'assistant') return;

    const userMessage = chatMessages.find(m => m.id === aiMessage.parentMessageId);
    if (!userMessage) return;

    await handleSendChatMessage(userMessage.content, {
      parentMessageId: userMessage.id,
      replaceResponseId: messageId,
      skipUserMessage: true,
    });
  }, [chatMessages, handleSendChatMessage]);

  return {
    // edit state
    editingMessageId,
    editValue,
    setEditValue,
    editTriggerRef,
    // dislike modal state
    dislikeModalMessageId,
    // handlers
    handleStartEdit,
    handleCancelEdit,
    handleSubmitEdit,
    handleVersionChange,
    handleLike,
    handleDislike,
    handleDislikeModalSubmit,
    handleDislikeModalClose,
    handleTryAgain,
  };
}
