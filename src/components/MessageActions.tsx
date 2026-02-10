/**
 * MessageActions Component
 * 
 * Chat message action buttons for both assistant and user messages.
 * Replaces the old MessageFeedback component with ChatGPT-style actions.
 * 
 * Assistant Messages: copy, like, dislike, try again
 * User Messages: copy, edit
 * 
 * Features:
 * - Uses ActionButton for consistent 32px circular buttons
 * - Uses existing useCopyToClipboard hook for clipboard
 * - Single row layout with consistent spacing
 * - Delayed tooltips on all buttons
 */

import { memo, useCallback } from 'react';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { ActionButton } from './ActionButton';
import { DSIcon } from './DSIcon';

// ============================================================================
// Types (exported for external use)
// ============================================================================

export interface AssistantActionsProps {
  /** Message ID */
  messageId: string;
  /** Message content for copy */
  content: string;
  /** Like callback */
  onLike: (messageId: string) => void;
  /** Dislike callback */
  onDislike: (messageId: string) => void;
  /** Try again/regenerate callback */
  onTryAgain: (messageId: string) => void;
  /** Whether actions are disabled (e.g., during loading) */
  disabled?: boolean;
  /** Feedback state from parent (persisted in message) */
  feedbackGiven?: 'like' | 'dislike' | null;
}

export interface UserActionsProps {
  /** Message ID */
  messageId: string;
  /** Message content for copy */
  content: string;
  /** Edit callback - receives messageId and current content */
  onEdit: (messageId: string, content: string) => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Hide edit for audio messages */
  hideEdit?: boolean;
}

// ============================================================================
// Icons
// ============================================================================

const CopyIcon = () => <DSIcon name="IcCopyDocument" size="S" attention="medium" />;
const CopyDoneIcon = () => <DSIcon name="IcCheck" size="S" attention="high" />;

const LikeIcon = ({ filled }: { filled?: boolean }) => (
  <span style={{ transform: 'scale(-1, -1)', display: 'inline-flex' }}>
    <DSIcon name="IcDislike" size="S" attention={filled ? "high" : "medium"} />
  </span>
);

const DislikeIcon = ({ filled }: { filled?: boolean }) => (
  <DSIcon name="IcDislike" size="S" attention={filled ? "high" : "medium"} />
);

const RefreshIcon = () => <DSIcon name="IcRefresh" size="S" attention="medium" />;
const EditIcon = () => <DSIcon name="IcEdit" size="S" attention="medium" />;

// ============================================================================
// Assistant Message Actions: copy, like, dislike, try again
// ============================================================================

export const AssistantMessageActions = memo(function AssistantMessageActions({
  messageId,
  content,
  onLike,
  onDislike,
  onTryAgain,
  disabled = false,
  feedbackGiven,
}: AssistantActionsProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard(2000);
  
  const handleCopy = useCallback(() => {
    copyToClipboard(content);
  }, [content, copyToClipboard]);
  
  const handleLike = useCallback(() => {
    if (!feedbackGiven) onLike(messageId);
  }, [messageId, onLike, feedbackGiven]);
  
  const handleDislike = useCallback(() => {
    if (!feedbackGiven) onDislike(messageId);
  }, [messageId, onDislike, feedbackGiven]);
  
  const handleTryAgain = useCallback(() => {
    onTryAgain(messageId);
  }, [messageId, onTryAgain]);
  
  return (
    <div className="flex items-center gap-1">
      <ActionButton
        icon={isCopied ? <CopyDoneIcon /> : <CopyIcon />}
        label={isCopied ? "copied" : "copy"}
        onClick={handleCopy}
        disabled={disabled}
        isActive={isCopied}
      />
      <ActionButton
        icon={<LikeIcon filled={feedbackGiven === 'like'} />}
        label="good response"
        onClick={handleLike}
        disabled={disabled || !!feedbackGiven}
        isActive={feedbackGiven === 'like'}
        activeColor="#22c55e"
      />
      <ActionButton
        icon={<DislikeIcon filled={feedbackGiven === 'dislike'} />}
        label="bad response"
        onClick={handleDislike}
        disabled={disabled || !!feedbackGiven}
        isActive={feedbackGiven === 'dislike'}
        activeColor="#ef4444"
      />
      <ActionButton
        icon={<RefreshIcon />}
        label="try again"
        onClick={handleTryAgain}
        disabled={disabled}
      />
    </div>
  );
});

// ============================================================================
// User Message Actions: copy, edit
// ============================================================================

export const UserMessageActions = memo(function UserMessageActions({
  messageId,
  content,
  onEdit,
  disabled = false,
  hideEdit = false,
}: UserActionsProps) {
  const { isCopied, copyToClipboard } = useCopyToClipboard(2000);
  
  const handleCopy = useCallback(() => {
    copyToClipboard(content);
  }, [content, copyToClipboard]);
  
  const handleEdit = useCallback(() => {
    onEdit(messageId, content);
  }, [messageId, content, onEdit]);
  
  return (
    <div className="flex items-center gap-1">
      <ActionButton
        icon={isCopied ? <CopyDoneIcon /> : <CopyIcon />}
        label={isCopied ? "copied" : "copy"}
        onClick={handleCopy}
        disabled={disabled}
        isActive={isCopied}
      />
      {!hideEdit && (
        <ActionButton
          icon={<EditIcon />}
          label="edit"
          onClick={handleEdit}
          disabled={disabled}
        />
      )}
    </div>
  );
});
