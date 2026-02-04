/**
 * SaveAudioModal Component
 * 
 * Accessible modal for saving audio to the library using Jio Design System.
 * 
 * Features:
 * - Focus trap (Tab/Shift+Tab cycles within modal)
 * - ARIA dialog role and labeling
 * - Returns focus to trigger element on close
 * - Escape key to close
 * - Click outside to close
 * - Uses Jio DS Button and TextInput components
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Button } from '@marcelinodzn/ds-react';
import { useThemeColors } from '../theme';

// =============================================================================
// Types
// =============================================================================

interface SaveAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName: string;
}

// =============================================================================
// Focus Trap Hook
// =============================================================================

function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  
  useEffect(() => {
    if (!isActive) return;
    
    // Store the previously focused element
    previousActiveElement.current = document.activeElement;
    
    const container = containerRef.current;
    if (!container) return;
    
    // Get all focusable elements
    const getFocusableElements = () => {
      return container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
        'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
    };
    
    // Focus first element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // Focus the first input or the first focusable element
      const firstInput = container.querySelector<HTMLElement>('input, textarea');
      (firstInput || focusableElements[0]).focus();
    }
    
    // Handle Tab key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;
      
      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      
      if (e.shiftKey) {
        // Shift+Tab: if on first element, go to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, go to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup: return focus to previous element
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);
  
  return containerRef;
}

// =============================================================================
// Component
// =============================================================================

export const SaveAudioModal = memo(function SaveAudioModal({
  isOpen,
  onClose,
  onSave,
  defaultName,
}: SaveAudioModalProps) {
  const theme = useThemeColors();
  const [name, setName] = useState(defaultName);
  const modalRef = useFocusTrap(isOpen);
  
  // Reset name when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
    }
  }, [isOpen, defaultName]);
  
  // Handle escape key at document level
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
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleSave = useCallback(() => {
    if (name.trim()) {
      onSave(name.trim());
      // Don't close here - let parent handle closing after async save completes
    }
  }, [name, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);
  
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-audio-title"
        aria-describedby="save-audio-description"
        className="w-full max-w-md rounded-xl shadow-xl p-5 space-y-4"
        style={{
          backgroundColor: theme.isLight ? '#FFFFFF' : theme.background.ghost,
          border: `1px solid ${theme.stroke.low}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="space-y-0.5">
          <h2 
            id="save-audio-title"
            className="text-base font-semibold"
            style={{ color: theme.text.high }}
          >
            Save Audio to Library
          </h2>
          <p 
            id="save-audio-description"
            className="text-xs"
            style={{ color: theme.text.medium }}
          >
            Give your audio a memorable name
          </p>
        </div>

        {/* Input Field */}
        <div className="space-y-1.5">
          <label 
            htmlFor="audio-name-input"
            className="block text-xs font-medium"
            style={{ color: theme.text.high }}
          >
            Audio Name
          </label>
          <input
            id="audio-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter audio name..."
            className="w-full px-2.5 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-colors"
            style={{
              backgroundColor: theme.isLight ? '#FFFFFF' : theme.background.ghost,
              borderColor: theme.stroke.medium,
              color: theme.text.high,
            }}
            aria-required="true"
            autoFocus
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            onPress={onClose}
            appearance="secondary"
            size="S"
            style={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            onPress={handleSave}
            appearance="primary"
            size="S"
            isDisabled={!name.trim()}
            style={{ flex: 1 }}
          >
            Save to Library
          </Button>
        </div>
      </div>
    </div>
  );
});

export default SaveAudioModal;
