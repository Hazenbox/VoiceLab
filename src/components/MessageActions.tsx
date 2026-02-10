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
import { Button } from '@marcelinodzn/ds-react';
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
  
  // Icon components with grey color styling
  const CopyIcon = () => (
    <span style={{ color: theme.text.low }}>
      <DSIcon name="IcCopyDocument" size="XS" attention="low" />
    </span>
  );
  
  const CopyDoneIcon = () => (
    <span style={{ color: theme.text.low }}>
      <DSIcon name="IcCheck" size="XS" attention="low" />
    </span>
  );
  
  const LikeIcon = () => (
    <span style={{ transform: 'scale(-1, -1)', display: 'inline-flex', color: theme.text.low }}>
      <DSIcon name="IcDislike" size="XS" attention="low" />
    </span>
  );
  
  const DislikeIcon = () => (
    <span style={{ color: theme.text.low }}>
      <DSIcon name="IcDislike" size="XS" attention="low" />
    </span>
  );
  
  const RefreshIcon = () => (
    <span style={{ color: theme.text.low }}>
      <DSIcon name="IcRefresh" size="XS" attention="low" />
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <Button
        onPress={handleCopy}
        isDisabled={disabled}
        aria-label={isCopied ? "copied" : "copy"}
        appearance="ghost"
        size="XS"
        style={{ 
          width: '32px', 
          height: '32px', 
          minHeight: '32px',
          padding: '0',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isCopied ? <CopyDoneIcon /> : <CopyIcon />}
      </Button>
      <Button
        onPress={handleLike}
        isDisabled={disabled || !!feedbackGiven}
        aria-label="good response"
        appearance="ghost"
        size="XS"
        style={{ 
          width: '32px', 
          height: '32px', 
          minHeight: '32px',
          padding: '0',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: feedbackGiven === 'like' ? '1' : undefined,
        }}
      >
        <LikeIcon />
      </Button>
      <Button
        onPress={handleDislike}
        isDisabled={disabled || !!feedbackGiven}
        aria-label="bad response"
        appearance="ghost"
        size="XS"
        style={{ 
          width: '32px', 
          height: '32px', 
          minHeight: '32px',
          padding: '0',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: feedbackGiven === 'dislike' ? '1' : undefined,
        }}
      >
        <DislikeIcon />
      </Button>
      <Button
        onPress={handleTryAgain}
        isDisabled={disabled}
        aria-label="try again"
        appearance="ghost"
        size="XS"
        style={{ 
          width: '32px', 
          height: '32px', 
          minHeight: '32px',
          padding: '0',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RefreshIcon />
      </Button>
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
      <DSIcon name="IcCopyDocument" size="XS" attention="low" />
    </span>
  );
  
  const CopyDoneIcon = () => (
    <span style={{ color: theme.text.low }}>
      <DSIcon name="IcCheck" size="XS" attention="low" />
    </span>
  );
  
  const EditIcon = () => (
    <span style={{ color: theme.text.low }}>
      <DSIcon name="IcEdit" size="XS" attention="low" />
    </span>
  );
  
  const handleCopy = useCallback(() => {
    copyToClipboard(content);
  }, [content, copyToClipboard]);
  
  const handleEdit = useCallback(() => {
    onEdit(messageId, content);
  }, [messageId, content, onEdit]);
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <Button
        onPress={handleCopy}
        isDisabled={disabled}
        aria-label={isCopied ? "copied" : "copy"}
        appearance="ghost"
        size="XS"
        style={{ 
          width: '32px', 
          height: '32px', 
          minHeight: '32px',
          padding: '0',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isCopied ? <CopyDoneIcon /> : <CopyIcon />}
      </Button>
      {!hideEdit && (
        <Button
          onPress={handleEdit}
          isDisabled={disabled}
          aria-label="edit"
          appearance="ghost"
          size="XS"
          style={{ 
            width: '32px', 
            height: '32px', 
            minHeight: '32px',
            padding: '0',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EditIcon />
        </Button>
      )}
    </div>
  );
});
