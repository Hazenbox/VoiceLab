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

/** Custom copy icon component using the provided SVG design */
const CopyIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <path 
      d="M13 8H5C4.20435 8 3.44129 8.31607 2.87868 8.87868C2.31607 9.44129 2 10.2044 2 11V19C2 19.7956 2.31607 20.5587 2.87868 21.1213C3.44129 21.6839 4.20435 22 5 22H13C13.7956 22 14.5587 21.6839 15.1213 21.1213C15.6839 20.5587 16 19.7956 16 19V11C16 10.2044 15.6839 9.44129 15.1213 8.87868C14.5587 8.31607 13.7956 8 13 8ZM19 2H11C10.2044 2 9.44129 2.31607 8.87868 2.87868C8.31607 3.44129 8 4.20435 8 5V6H13C14.3261 6 15.5979 6.52678 16.5355 7.46447C17.4732 8.40215 18 9.67392 18 11V16H19C19.7956 16 20.5587 15.6839 21.1213 15.1213C21.6839 14.5587 22 13.7956 22 13V5C22 4.20435 21.6839 3.44129 21.1213 2.87868C20.5587 2.31607 19.7956 2 19 2Z" 
      fill="currentColor"
    />
  </svg>
);

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
  
  // Consistent icon color for all action buttons
  const iconColor = theme.text.low;
  
  return (
    <div className="flex items-center gap-0">
      <ActionButton
        icon={isCopied 
          ? <span style={{ color: iconColor, display: 'inline-flex' }}><DSIcon name="IcConfirm" size="S" attention="low" appearance="neutral" /></span>
          : <CopyIcon style={{ color: iconColor }} />
        }
        label={isCopied ? "Copied" : "Copy"}
        onClick={handleCopy}
        disabled={disabled}
        isActive={isCopied}
      />
      {showLike && (
        <ActionButton
          icon={
            <span style={{ transform: 'scale(-1, -1)', display: 'inline-flex', color: iconColor }}>
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
          icon={<span style={{ color: iconColor, display: 'inline-flex' }}><DSIcon name="IcDislike" size="S" attention="low" appearance="neutral" /></span>}
          label="Bad response"
          onClick={handleDislike}
          disabled={disabled}
          isActive={feedbackGiven === 'dislike'}
        />
      )}
      <ActionButton
        icon={<span style={{ color: iconColor, display: 'inline-flex' }}><DSIcon name="IcRefresh" size="S" attention="low" appearance="neutral" /></span>}
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
  const theme = useThemeColors();
  const { isCopied, copyToClipboard } = useCopyToClipboard(2000);
  
  // Consistent icon color for all action buttons
  const iconColor = theme.text.low;
  
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
        icon={isCopied 
          ? <span style={{ color: iconColor, display: 'inline-flex' }}><DSIcon name="IcConfirm" size="S" attention="low" appearance="neutral" /></span>
          : <CopyIcon style={{ color: iconColor }} />
        }
        label={isCopied ? "Copied" : "Copy"}
        onClick={handleCopy}
        disabled={disabled}
        isActive={isCopied}
      />
      {!hideEdit && (
        <ActionButton
          icon={<span style={{ color: iconColor, display: 'inline-flex' }}><DSIcon name="IcEdit" size="S" attention="low" appearance="neutral" /></span>}
          label="Edit"
          onClick={handleEdit}
          disabled={disabled}
        />
      )}
    </div>
  );
});
