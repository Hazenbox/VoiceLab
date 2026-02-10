/**
 * ActionButton Component
 * 
 * Reusable circular 32px action button with built-in delayed tooltip.
 * Used for chat message actions (copy, like, dislike, edit, try again).
 * 
 * Features:
 * - Fixed 32px circular shape
 * - Transparent background with hover state
 * - Built-in delayed tooltip
 * - Active/selected state with custom color
 * - Disabled state with reduced opacity
 * - Focus ring for accessibility
 */

import { memo, type ReactNode } from 'react';
import { useThemeColors } from '../theme';
import { DelayedTooltip } from './DelayedTooltip';

interface ActionButtonProps {
  /** Icon to display */
  icon: ReactNode;
  /** Accessible label (also used for tooltip) */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Active/selected state (changes color) */
  isActive?: boolean;
  /** Custom active color (default: theme.accent) */
  activeColor?: string;
  /** Tooltip delay in ms (default: 500) */
  tooltipDelay?: number;
  /** Size in px (default: 32) */
  size?: number;
  /** Additional class names */
  className?: string;
}

export const ActionButton = memo(function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  isActive = false,
  activeColor,
  tooltipDelay = 500,
  size = 32,
  className = '',
}: ActionButtonProps) {
  const theme = useThemeColors();
  
  const buttonColor = isActive 
    ? (activeColor || theme.accent) 
    : theme.text.low;
  
  return (
    <DelayedTooltip content={label} delay={tooltipDelay} disabled={disabled}>
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`rounded-full flex items-center justify-center transition-colors
          hover:bg-black/5 dark:hover:bg-white/10 
          disabled:opacity-40 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1
          ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          color: buttonColor,
        }}
      >
        {icon}
      </button>
    </DelayedTooltip>
  );
});

export default ActionButton;
