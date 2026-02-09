/**
 * MessageFeedback Component
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
import { useThemeColors } from '../theme';

// ── Types ────────────────────────────────────────────────────────

export type FeedbackType = 'thumbs_up' | 'thumbs_down' | 'edit' | 'comment';

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

// ── Icons ────────────────────────────────────────────────────────

const ThumbsUpIcon = ({ filled }: { filled: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10v12" />
    <path d="M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
);

const ThumbsDownIcon = ({ filled }: { filled: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 14V2" />
    <path d="M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CommentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const BookmarkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── Component ────────────────────────────────────────────────────

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
          style={{ color: activeAction === 'thumbs_down' ? '#ef4444' : theme.text.low }}
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
            style={{ color: '#ef4444' }}
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
