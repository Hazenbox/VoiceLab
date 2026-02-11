/**
 * DislikeFeedbackModal Component
 * 
 * ChatGPT-style modal for collecting structured dislike feedback.
 * Opens when user clicks dislike button on an assistant message.
 * 
 * Features:
 * - Platform-relevant reason chips (clickable to toggle)
 * - Optional free-text comment field
 * - Submit and close buttons
 * - Backdrop overlay with click-to-close
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { useThemeColors } from '../theme';
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
        <div
          className="px-6 py-4 border-b"
          style={{ borderColor: theme.stroke.low }}
        >
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-semibold"
              style={{ color: theme.text.high }}
            >
              provide additional feedback
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="close"
            >
              <DSIcon name="IcClose" size="S" attention="medium" />
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Reason Chips */}
          <div>
            <p
              className="text-sm font-medium mb-2"
              style={{ color: theme.text.medium }}
            >
              what was the issue? (select all that apply)
            </p>
            <div className="flex flex-wrap gap-2">
              {REASON_OPTIONS.map(option => {
                const isSelected = selectedReasons.includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => handleReasonToggle(option.id)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isSelected ? '#f97316' : theme.background.subtle,
                      color: isSelected ? '#ffffff' : theme.text.medium,
                      border: `1px solid ${isSelected ? '#f97316' : theme.stroke.low}`,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Optional Comment */}
          <div>
            <label
              htmlFor="feedback-comment"
              className="block text-sm font-medium mb-2"
              style={{ color: theme.text.medium }}
            >
              additional details (optional)
            </label>
            <textarea
              id="feedback-comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="tell us more about what went wrong..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{
                backgroundColor: theme.background.subtle,
                color: theme.text.high,
                border: `1px solid ${theme.stroke.low}`,
              }}
            />
          </div>
        </div>
        
        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-end gap-3"
          style={{ borderColor: theme.stroke.low }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: theme.text.medium,
              backgroundColor: 'transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = theme.background.subtle;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedReasons.length === 0 && comment.trim() === ''}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#f97316',
              color: '#ffffff',
            }}
          >
            submit feedback
          </button>
        </div>
      </div>
    </div>
  );
});

export default DislikeFeedbackModal;
