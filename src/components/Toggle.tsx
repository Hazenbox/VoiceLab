import React from 'react';
import { useThemeColors } from '../theme';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * Toggle switch component for boolean settings.
 * Small size optimized for settings panel.
 * 
 * Design System Integration:
 * - Track background: theme.stroke.low (unchecked) / theme.accent (checked)
 * - Thumb: theme.local.white with shadow
 * - Text: theme.text.medium (DS tokens)
 * - Accessible button with proper ARIA attributes
 */
export const Toggle: React.FC<ToggleProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
}) => {
  const theme = useThemeColors();

  return (
    <div className="flex items-center justify-between">
      <label
        className="text-xs font-medium"
        style={{ color: theme.text.medium }}
      >
        {label}
      </label>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`
          relative w-9 h-5 rounded-full transition-colors duration-200 ease-in-out
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
        `}
        style={{
          backgroundColor: checked ? theme.accent : theme.stroke.low,
        }}
      >
        {/* Thumb */}
        <span
          className={`
            absolute top-0.5 left-0.5
            inline-block w-4 h-4 rounded-full
            transform transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-4' : 'translate-x-0'}
          `}
          style={{
            backgroundColor: theme.local.white,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          }}
        />
      </button>
    </div>
  );
};

export default Toggle;
