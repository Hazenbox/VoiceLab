/**
 * UsageModal Component
 * 
 * Accessible modal for displaying usage statistics using Jio Design System.
 * 
 * Features:
 * - Focus trap (Tab/Shift+Tab cycles within modal)
 * - ARIA dialog role and labeling
 * - Returns focus to trigger element on close
 * - Escape key to close
 * - Click outside to close
 * - Displays full UsageDashboard component
 */

import React, { useEffect, useRef, useCallback, memo } from 'react';
import { UsageDashboard } from './UsageDashboard';
import { useThemeColors } from '../theme';

// =============================================================================
// Types
// =============================================================================

interface UsageModalProps {
  isOpen: boolean;
  onClose: () => void;
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
      focusableElements[0].focus();
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

export const UsageModal = memo(function UsageModal({
  isOpen,
  onClose,
}: UsageModalProps) {
  const theme = useThemeColors();
  const modalRef = useFocusTrap(isOpen);
  
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
        aria-labelledby="usage-modal-title"
        aria-describedby="usage-modal-description"
        className="w-full max-w-2xl rounded-xl shadow-xl p-5 space-y-4"
        style={{
          backgroundColor: theme.isLight ? '#FFFFFF' : theme.background.ghost,
          border: `1px solid ${theme.stroke.low}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 
              id="usage-modal-title"
              className="text-base font-semibold"
              style={{ color: theme.text.high }}
            >
              Usage Statistics
            </h2>
            <p 
              id="usage-modal-description"
              className="text-xs mt-0.5"
              style={{ color: theme.text.medium }}
            >
              Monitor your LLM usage, costs, and performance
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors hover:opacity-70 cursor-pointer"
            style={{
              backgroundColor: theme.stroke.low,
              color: theme.text.medium,
            }}
            aria-label="Close usage statistics"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Usage Dashboard */}
        <UsageDashboard compact={false} />
      </div>
    </div>
  );
});

export default UsageModal;
