import React from 'react';
import { useThemeColors } from '../theme';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  tooltip?: string;
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
  tooltip,
}) => {
  const theme = useThemeColors();
  const [showTooltip, setShowTooltip] = React.useState(false);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 relative">
        <label
          className="text-xs font-normal"
          style={{ color: theme.text.medium }}
        >
          {label}
        </label>
        {tooltip && (
          <>
            <div
              className="cursor-help"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 16 16" 
                fill="none"
                style={{ opacity: 0.5 }}
              >
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M8 12V8M8 5.5V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            {showTooltip && (
              <div
                className="absolute left-0 top-full mt-1 z-50 px-2 py-1.5 rounded text-xs whitespace-normal max-w-xs"
                style={{
                  backgroundColor: theme.isLight ? '#262626' : '#f5f5f5',
                  color: theme.isLight ? '#ffffff' : '#000000',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
              >
                {tooltip}
              </div>
            )}
          </>
        )}
      </div>
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
