/**
 * DislikeFeedbackModal Component
 * 
 * ChatGPT-style modal for collecting structured dislike feedback.
 * Opens when user clicks dislike button on an assistant message.
 * 
 * Features:
 * - DS Chip for reason selection
 * - DS TextArea for comment
 * - DS Button for actions
 * - DS Title/Label for typography
 * - Backdrop overlay with click-to-close
 * 
 * Note: DS Dialog not yet available in package; using custom modal container.
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { useThemeColors } from '../theme';
import { Button, Chip, TextArea, Title, Label, Divider } from '@marcelinodzn/ds-react';
import { DSIcon } from './DSIcon';

// ============================================================================
// Types
// ============================================================================

export interface DislikeFeedbackModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback when user submits feedback with reasons and optional comment */
  onSubmit: (reasons: string[], comment: string) => void;
  /** Callback when user closes modal without providing detailed feedback */
  onClose: () => void;
}

// ============================================================================
// Predefined Reason Options (platform-relevant)
// ============================================================================

const REASON_OPTIONS = [
  { id: 'not-accurate', label: 'not accurate' },
  { id: 'not-relevant', label: 'not relevant' },
  { id: 'length', label: 'too long or too short' },
  { id: 'guidelines', label: 'missed brand guidelines' },
  { id: 'tone', label: 'wrong tone or style' },
  { id: 'formatting', label: 'formatting issues' },
] as const;

// ============================================================================
// Component
// ============================================================================

export const DislikeFeedbackModal = memo(function DislikeFeedbackModal({
  isOpen,
  onSubmit,
  onClose,
}: DislikeFeedbackModalProps) {
  const theme = useThemeColors();
  
  // Local state for selected reasons and comment
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  
  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedReasons([]);
      setComment('');
    }
  }, [isOpen]);
  
  // Toggle reason selection
  const handleReasonToggle = useCallback((reasonId: string) => {
    setSelectedReasons(prev => {
      if (prev.includes(reasonId)) {
        return prev.filter(id => id !== reasonId);
      } else {
        return [...prev, reasonId];
      }
    });
  }, []);
  
  // Handle submit
  const handleSubmit = useCallback(() => {
    // Map selected reason IDs to their labels
    const reasonLabels = selectedReasons.map(id => {
      const option = REASON_OPTIONS.find(opt => opt.id === id);
      return option ? option.label : id;
    });
    
    onSubmit(reasonLabels, comment.trim());
  }, [selectedReasons, comment, onSubmit]);
  
  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);
  
  // Keyboard handlers
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
    >
      {/* Modal Card */}
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: theme.background.ghost }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <Title size="S" as="h2" weight="high" color="high">
              provide additional feedback
            </Title>
            <Button
              appearance="ghost"
              size="S"
              onPress={onClose}
              aria-label="close"
            >
              <DSIcon name="IcClose" size="S" attention="medium" />
            </Button>
          </div>
        </div>
        <Divider />
        
        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Reason Chips */}
          <div>
            <div className="mb-2">
              <Label size="S" weight="medium" attention="medium" as="p">
                what was the issue? (select all that apply)
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              {REASON_OPTIONS.map(option => {
                const isSelected = selectedReasons.includes(option.id);
                return (
                  <Chip
                    key={option.id}
                    size="S"
                    appearance={isSelected ? 'primary' : 'neutral'}
                    onClick={() => handleReasonToggle(option.id)}
                  >
                    {option.label}
                  </Chip>
                );
              })}
            </div>
          </div>
          
          {/* Optional Comment -- DS TextArea */}
          <div>
            <TextArea
              label="additional details (optional)"
              value={comment}
              onChange={(val: string) => setComment(val)}
              placeholder="tell us more about what went wrong..."
              rows={3}
            />
          </div>
        </div>
        
        {/* Footer */}
        <Divider />
        <div className="px-6 py-4 flex items-center justify-end gap-3">
          <Button
            appearance="ghost"
            size="S"
            onPress={onClose}
          >
            skip
          </Button>
          <Button
            appearance="primary"
            size="S"
            onPress={handleSubmit}
            isDisabled={selectedReasons.length === 0 && comment.trim() === ''}
          >
            submit feedback
          </Button>
        </div>
      </div>
    </div>
  );
});

export default DislikeFeedbackModal;
