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
import { useThemeColors } from '../theme';
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
// Icons (with theme context for grey colors)
// ============================================================================

// Icon components need access to theme, so they're created inside the component scope
// This ensures grey color via theme.text.low instead of purple/indigo from design system

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
  const theme = useThemeColors();
  const { isCopied, copyToClipboard } = useCopyToClipboard(2000);
  
  // Determine what buttons to show based on feedback
  const showLike = !feedbackGiven || feedbackGiven === 'like';
  const showDislike = !feedbackGiven || feedbackGiven === 'dislike';
  
  // Icon colors: orange when active, gray otherwise
  const likeIconColor = feedbackGiven === 'like' ? '#f97316' : theme.text.low;
  const dislikeIconColor = feedbackGiven === 'dislike' ? '#f97316' : theme.text.low;
  
  // Icon components with dynamic color styling
  const CopyIcon = () => (
    <span style={{ color: theme.text.low }}>
      <DSIcon name="IcCopyDocument" size="S" attention="low" />
    </span>
  );
  
  const CopyDoneIcon = () => (
    <span style={{ color: theme.text.low }}>
      <DSIcon name="IcCheck" size="S" attention="low" />
    </span>
  );
  
  const LikeIcon = () => (
    <span style={{ transform: 'scale(-1, -1)', display: 'inline-flex', color: likeIconColor }}>
      <DSIcon name="IcDislike" size="S" />
    </span>
  );
  
  const DislikeIcon = () => (
    <span style={{ color: dislikeIconColor }}>
      <DSIcon name="IcDislike" size="S" />
    </span>
  );
  
  const RefreshIcon = () => (
    <span style={{ color: theme.text.low }}>
      <DSIcon name="IcRefresh" size="S" attention="low" />
    </span>
  );
  
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
      {showLike && (
        <ActionButton
          icon={<LikeIcon />}
          label="good response"
          onClick={handleLike}
          disabled={disabled}
          isActive={feedbackGiven === 'like'}
        />
      )}
      {showDislike && (
        <ActionButton
          icon={<DislikeIcon />}
          label="bad response"
          onClick={handleDislike}
          disabled={disabled}
          isActive={feedbackGiven === 'dislike'}
        />
      )}
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
  const theme = useThemeColors();
  const { isCopied, copyToClipboard } = useCopyToClipboard(2000);
  
  // Icon components with grey color styling
  const CopyIcon = () => (
    <span style={{ color: theme.text.low }}>
      <DSIcon name="IcCopyDocument" size="S" attention="low" />
    </span>
  );
  
  const CopyDoneIcon = () => (
    <span style={{ color: theme.text.low }}>
      <DSIcon name="IcCheck" size="S" attention="low" />
    </span>
  );
  
  const EditIcon = () => (
    <span style={{ color: theme.text.low }}>
      <DSIcon name="IcEdit" size="S" attention="low" />
    </span>
  );
  
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
