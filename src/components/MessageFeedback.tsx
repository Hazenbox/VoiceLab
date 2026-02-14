/**
 * MessageFeedback Component
 * 
 * @deprecated This component is deprecated. Use AssistantMessageActions and 
 * UserMessageActions from './MessageActions' instead, which provide ChatGPT-style
 * inline actions (copy, like, dislike, try again for assistant messages;
 * copy, edit for user messages).
 * 
 * This component is kept for backward compatibility but will be removed in a future version.
 * 
 * Feedback actions for AI-generated messages:
 * - Thumbs up (positive signal, optional save as example)
 * - Thumbs down (negative signal + optional reason)
 * - Edit (inline edit the content)
 * - Comment (free-text feedback)
 * 
 * Appears below each assistant message in the chat.
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useThemeColors, SEMANTIC_COLORS } from '../theme';
import { DSIcon } from './DSIcon';

// ── Types (DEPRECATED - use types from '../types' instead) ───────

/**
 * @deprecated Import FeedbackType from '../types' instead
 */
export type FeedbackType = 'thumbs_up' | 'thumbs_down' | 'edit' | 'comment';

/**
 * @deprecated Import FeedbackPayload from '../types' instead
 */
export interface FeedbackPayload {
  messageId: string;
  feedbackType: FeedbackType;
  originalContent: string;
  editedContent?: string;
  comment?: string;
}

interface MessageFeedbackProps {
  messageId: string;
  messageContent: string;
  onFeedback: (payload: FeedbackPayload) => void;
  /** If true, show a "Save as Example" option after thumbs up */
  onSaveAsExample?: (content: string) => void;
}

// ── Icons - Using DSIcon wrapper ──────────────────────────────────

// Note: Thumbs up uses IcDislike with vertical flip, thumbs down uses IcDislike as-is
const ThumbsUpIcon = ({ filled }: { filled: boolean }) => (
  <span style={{ opacity: filled ? 1 : 0.7, transform: 'scaleY(-1)', display: 'inline-block' }}>
    <DSIcon name="IcDislike" size="XS" attention={filled ? "high" : "medium"} />
  </span>
);

const ThumbsDownIcon = ({ filled }: { filled: boolean }) => (
  <span style={{ opacity: filled ? 1 : 0.7 }}>
    <DSIcon name="IcDislike" size="XS" attention={filled ? "high" : "medium"} />
  </span>
);

const EditIcon = () => <DSIcon name="IcEdit" size="XS" attention="medium" />;

const CommentIcon = () => <DSIcon name="IcChat" size="XS" attention="medium" />;

const BookmarkIcon = () => <DSIcon name="IcBookmark" size="XS" attention="medium" />;

const CheckIcon = () => <DSIcon name="IcCheck" size="XS" attention="medium" />;

const CloseIcon = () => <DSIcon name="IcClose" size="XS" attention="medium" />;

// ── Component (DEPRECATED) ───────────────────────────────────────

/**
 * @deprecated Use AssistantMessageActions/UserMessageActions from MessageActions.tsx instead
 */
export const MessageFeedback = memo(function MessageFeedback({
  messageId,
  messageContent,
  onFeedback,
  onSaveAsExample,
}: MessageFeedbackProps) {
  const theme = useThemeColors();
  const [activeAction, setActiveAction] = useState<FeedbackType | 'save' | null>(null);
  const [submitted, setSubmitted] = useState<FeedbackType | 'save' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [commentValue, setCommentValue] = useState('');
  const [thumbsDownReason, setThumbsDownReason] = useState('');
  const editRef = useRef<HTMLTextAreaElement>(null);
  const commentRef = useRef<HTMLInputElement>(null);

  // Auto-focus expanded inputs
  useEffect(() => {
    if (activeAction === 'edit' && editRef.current) {
      editRef.current.focus();
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length);
    }
    if (activeAction === 'comment' && commentRef.current) {
      commentRef.current.focus();
    }
  }, [activeAction]);

  // ── Handlers ─────────────────────────────────────────────────

  const handleThumbsUp = useCallback(() => {
    if (submitted) return;
    onFeedback({
      messageId,
      feedbackType: 'thumbs_up',
      originalContent: messageContent,
    });
    setSubmitted('thumbs_up');
    setActiveAction(null);
  }, [messageId, messageContent, onFeedback, submitted]);

  const handleThumbsDown = useCallback(() => {
    if (submitted) return;
    if (activeAction === 'thumbs_down') {
      // Submit with reason
      onFeedback({
        messageId,
        feedbackType: 'thumbs_down',
        originalContent: messageContent,
        comment: thumbsDownReason || undefined,
      });
      setSubmitted('thumbs_down');
      setActiveAction(null);
    } else {
      setActiveAction('thumbs_down');
      setThumbsDownReason('');
    }
  }, [messageId, messageContent, onFeedback, submitted, activeAction, thumbsDownReason]);

  const handleEditStart = useCallback(() => {
    if (submitted) return;
    setEditValue(messageContent);
    setActiveAction('edit');
  }, [messageContent, submitted]);

  const handleEditSubmit = useCallback(() => {
    if (editValue.trim() === messageContent.trim()) {
      setActiveAction(null);
      return;
    }
    onFeedback({
      messageId,
      feedbackType: 'edit',
      originalContent: messageContent,
      editedContent: editValue,
    });
    setSubmitted('edit');
    setActiveAction(null);
  }, [messageId, messageContent, editValue, onFeedback]);

  const handleCommentStart = useCallback(() => {
    if (submitted) return;
    setActiveAction('comment');
    setCommentValue('');
  }, [submitted]);

  const handleCommentSubmit = useCallback(() => {
    if (!commentValue.trim()) {
      setActiveAction(null);
      return;
    }
    onFeedback({
      messageId,
      feedbackType: 'comment',
      originalContent: messageContent,
      comment: commentValue,
    });
    setSubmitted('comment');
    setActiveAction(null);
  }, [messageId, messageContent, commentValue, onFeedback]);

  const handleSaveAsExample = useCallback(() => {
    if (submitted) return;
    onSaveAsExample?.(messageContent);
    setSubmitted('save');
  }, [messageContent, onSaveAsExample, submitted]);

  const handleCancel = useCallback(() => {
    setActiveAction(null);
    setEditValue('');
    setCommentValue('');
    setThumbsDownReason('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, submitFn: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitFn();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleCancel]);

  // ── Render ───────────────────────────────────────────────────

  // After any submission, show a confirmation
  if (submitted && !activeAction) {
    const labels: Record<string, string> = {
      thumbs_up: 'Thanks for the feedback',
      thumbs_down: 'Feedback recorded',
      edit: 'Edit saved',
      comment: 'Comment saved',
      save: 'Saved as example',
    };
    return (
      <div
        className="flex items-center gap-1.5 mt-1 text-xs transition-all duration-200"
        style={{ color: theme.text.low }}
      >
        <CheckIcon />
        <span>{labels[submitted] || 'Feedback saved'}</span>
      </div>
    );
  }

  return (
    <div className="mt-1.5 space-y-2">
      {/* Action Buttons Row */}
      <div className="flex items-center gap-0.5">
        {/* Thumbs Up */}
        <button
          onClick={handleThumbsUp}
          disabled={!!submitted}
          aria-label="Thumbs up"
          title="Good response"
          className="p-1.5 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
          style={{ color: activeAction === 'thumbs_up' ? '#22c55e' : theme.text.low }}
        >
          <ThumbsUpIcon filled={submitted === 'thumbs_up'} />
        </button>

        {/* Thumbs Down */}
        <button
          onClick={handleThumbsDown}
          disabled={!!submitted}
          aria-label="Thumbs down"
          title="Bad response"
          className="p-1.5 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
          style={{ color: activeAction === 'thumbs_down' ? SEMANTIC_COLORS.negative : theme.text.low }}
        >
          <ThumbsDownIcon filled={submitted === 'thumbs_down'} />
        </button>

        {/* Edit */}
        <button
          onClick={handleEditStart}
          disabled={!!submitted}
          aria-label="Edit response"
          title="Edit this response"
          className="p-1.5 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
          style={{ color: activeAction === 'edit' ? theme.accent : theme.text.low }}
        >
          <EditIcon />
        </button>

        {/* Comment */}
        <button
          onClick={handleCommentStart}
          disabled={!!submitted}
          aria-label="Add comment"
          title="Add a comment"
          className="p-1.5 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
          style={{ color: activeAction === 'comment' ? theme.accent : theme.text.low }}
        >
          <CommentIcon />
        </button>

        {/* Save as Example */}
        {onSaveAsExample && (
          <button
            onClick={handleSaveAsExample}
            disabled={!!submitted}
            aria-label="Save as example"
            title="Save as approved example"
            className="p-1.5 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
            style={{ color: theme.text.low }}
          >
            <BookmarkIcon />
          </button>
        )}
      </div>

      {/* Expanded: Thumbs Down Reason */}
      {activeAction === 'thumbs_down' && (
        <div className="flex items-center gap-2" style={{ animation: 'fadeIn 150ms ease-in-out' }}>
          <input
            value={thumbsDownReason}
            onChange={(e) => setThumbsDownReason(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleThumbsDown)}
            placeholder="What was wrong? (optional)"
            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-transparent outline-none"
            style={{
              border: `1px solid ${theme.stroke.low}`,
              color: theme.text.high,
            }}
          />
          <button
            onClick={handleThumbsDown}
            aria-label="Submit feedback"
            className="p-1 rounded-md transition-colors hover:bg-black/5"
            style={{ color: SEMANTIC_COLORS.negative }}
          >
            <CheckIcon />
          </button>
          <button
            onClick={handleCancel}
            aria-label="Cancel"
            className="p-1 rounded-md transition-colors hover:bg-black/5"
            style={{ color: theme.text.low }}
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {/* Expanded: Edit */}
      {activeAction === 'edit' && (
        <div className="space-y-1.5" style={{ animation: 'fadeIn 150ms ease-in-out' }}>
          <textarea
            ref={editRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleEditSubmit)}
            className="w-full text-xs px-3 py-2 rounded-lg bg-transparent outline-none resize-y"
            rows={4}
            style={{
              border: `1px solid ${theme.stroke.low}`,
              color: theme.text.high,
              minHeight: '80px',
              maxHeight: '200px',
            }}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleCancel}
              className="text-xs px-3 py-1 rounded-md transition-colors hover:bg-black/5"
              style={{ color: theme.text.low }}
            >
              Cancel
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={editValue.trim() === messageContent.trim()}
              className="text-xs px-3 py-1 rounded-md transition-colors disabled:opacity-40"
              style={{
                backgroundColor: theme.accent,
                color: '#fff',
              }}
            >
              Save Edit
            </button>
          </div>
        </div>
      )}

      {/* Expanded: Comment */}
      {activeAction === 'comment' && (
        <div className="flex items-center gap-2" style={{ animation: 'fadeIn 150ms ease-in-out' }}>
          <input
            ref={commentRef}
            value={commentValue}
            onChange={(e) => setCommentValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleCommentSubmit)}
            placeholder="Your feedback..."
            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-transparent outline-none"
            style={{
              border: `1px solid ${theme.stroke.low}`,
              color: theme.text.high,
            }}
          />
          <button
            onClick={handleCommentSubmit}
            disabled={!commentValue.trim()}
            aria-label="Submit comment"
            className="p-1 rounded-md transition-colors hover:bg-black/5 disabled:opacity-40"
            style={{ color: theme.accent }}
          >
            <CheckIcon />
          </button>
          <button
            onClick={handleCancel}
            aria-label="Cancel"
            className="p-1 rounded-md transition-colors hover:bg-black/5"
            style={{ color: theme.text.low }}
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </div>
  );
});

export default MessageFeedback;
