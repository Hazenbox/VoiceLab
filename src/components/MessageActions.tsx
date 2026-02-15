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
// v2: Analytics tracking
import { getSessionManager } from '../services/analytics';
import { featureFlags } from '../services/featureFlags';

/** Brand accent for active feedback states */
const BRAND_ACCENT = '#f97316';

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
  
  const handleCopy = useCallback(() => {
    copyToClipboard(content);
    // v2: Track copy action
    if (featureFlags.interactionTracking) {
      const sessionManager = getSessionManager();
      sessionManager.trackCopy(messageId);
    }
  }, [content, copyToClipboard, messageId]);
  
  const handleLike = useCallback(() => {
    if (!feedbackGiven) {
      onLike(messageId);
      // v2: Track like action
      if (featureFlags.interactionTracking) {
        const sessionManager = getSessionManager();
        sessionManager.trackFeedback(messageId, true);
      }
    }
  }, [messageId, onLike, feedbackGiven]);
  
  const handleDislike = useCallback(() => {
    if (!feedbackGiven) {
      onDislike(messageId);
      // v2: Track dislike action
      if (featureFlags.interactionTracking) {
        const sessionManager = getSessionManager();
        sessionManager.trackFeedback(messageId, false);
      }
    }
  }, [messageId, onDislike, feedbackGiven]);
  
  const handleTryAgain = useCallback(() => {
    onTryAgain(messageId);
    // v2: Track regeneration action
    if (featureFlags.interactionTracking) {
      const sessionManager = getSessionManager();
      sessionManager.trackRegeneration();
    }
  }, [messageId, onTryAgain]);
  
  return (
    <div className="flex items-center gap-0">
      <ActionButton
        icon={isCopied 
          ? <DSIcon name="IcCheck" size="S" attention="low" appearance="neutral" />
          : <DSIcon name="IcCopyDocument" size="S" attention="low" appearance="neutral" />
        }
        label={isCopied ? "Copied" : "Copy"}
        onClick={handleCopy}
        disabled={disabled}
        isActive={isCopied}
      />
      {showLike && (
        <ActionButton
          icon={
            <span style={{ transform: 'scale(-1, -1)', display: 'inline-flex' }}>
              <DSIcon name="IcDislike" size="S" attention="low" appearance="neutral" />
            </span>
          }
          label="Good response"
          onClick={handleLike}
          disabled={disabled}
          isActive={feedbackGiven === 'like'}
        />
      )}
      {showDislike && (
        <ActionButton
          icon={<DSIcon name="IcDislike" size="S" attention="low" appearance="neutral" />}
          label="Bad response"
          onClick={handleDislike}
          disabled={disabled}
          isActive={feedbackGiven === 'dislike'}
        />
      )}
      <ActionButton
        icon={<DSIcon name="IcRefresh" size="S" attention="low" appearance="neutral" />}
        label="Try again"
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
  
  // Icon components with grey color styling
  const CopyIcon = () => (
    <DSIcon name="IcCopyDocument" size="S" attention="low" appearance="neutral" />
  );
  
  const CopyDoneIcon = () => (
    <DSIcon name="IcCheck" size="S" attention="low" appearance="neutral" />
  );
  
  const EditIcon = () => (
    <DSIcon name="IcEdit" size="S" attention="low" appearance="neutral" />
  );
  
  const handleCopy = useCallback(() => {
    copyToClipboard(content);
    // v2: Track copy action (user messages)
    if (featureFlags.interactionTracking) {
      const sessionManager = getSessionManager();
      sessionManager.trackCopy(messageId);
    }
  }, [content, copyToClipboard, messageId]);
  
  const handleEdit = useCallback(() => {
    onEdit(messageId, content);
    // v2: Track edit action
    if (featureFlags.interactionTracking) {
      const sessionManager = getSessionManager();
      sessionManager.trackFeatureAccess('user_message_edit');
    }
  }, [messageId, content, onEdit]);
  
  return (
    <div className="flex items-center gap-0">
      <ActionButton
        icon={isCopied ? <CopyDoneIcon /> : <CopyIcon />}
        label={isCopied ? "Copied" : "Copy"}
        onClick={handleCopy}
        disabled={disabled}
        isActive={isCopied}
      />
      {!hideEdit && (
        <ActionButton
          icon={<EditIcon />}
          label="Edit"
          onClick={handleEdit}
          disabled={disabled}
        />
      )}
    </div>
  );
});
