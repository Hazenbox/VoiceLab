/**
 * ChatControlButton Component
 * 
 * Standardized button/trigger for chat panel controls (model selector, context selector, settings).
 * 
 * Features:
 * - Fixed 28px height
 * - Transparent background by default
 * - Pill-shaped with stroke.low background on hover/active
 * - Consistent text styling (text-xs, font-normal, text.medium)
 * - Supports icon + text or text-only
 * - Accessibility features (aria-label, disabled states)
 */

import React, { forwardRef } from 'react';
import { useThemeColors } from '../theme';

export interface ChatControlButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Whether the control is in active state (e.g., dropdown is open) */
  isActive?: boolean;
  className?: string;
  /** Optional icon element to display before text */
  icon?: React.ReactNode;
  /** Accessibility label */
  ariaLabel?: string;
  /** Additional aria attributes */
  ariaExpanded?: boolean;
  ariaHasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Standardized chat control button component
 * Used for all controls in the chat panel control bar (below input)
 */
export const ChatControlButton = forwardRef<HTMLButtonElement, ChatControlButtonProps>(
  function ChatControlButton(
    {
      children,
      onClick,
      disabled = false,
      isActive = false,
      className = '',
      icon,
      ariaLabel,
      ariaExpanded,
      ariaHasPopup,
      type = 'button',
    },
    ref
  ) {
    const theme = useThemeColors();

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`
          h-[28px] px-3 rounded-full
          flex items-center gap-1.5
          text-xs font-normal
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}
          ${className}
        `}
        style={{
          backgroundColor: isActive ? theme.stroke.low : 'transparent',
          color: theme.text.medium,
        }}
        aria-label={ariaLabel}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = theme.stroke.low;
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="truncate">{children}</span>
      </button>
    );
  }
);

export default ChatControlButton;
