import React from 'react';
import { useThemeColors } from '../theme';

interface LabeledSliderProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Discrete slider with labeled options (e.g., Slow/Medium/Fast)
 * 
 * Design System Integration:
 * - Uses HTML range input (no DS Slider component available yet)
 * - Filled track color: LOCAL_COLORS.accent (matches Radio appearance="secondary")
 * - Background: theme.background.minimal (DS token)
 * - Knob: theme.local.white via CSS variable (local token)
 * - Text: theme.text.high/medium/low (DS tokens)
 * 
 * Future Migration:
 * When Jio Design System adds a Slider component, replace with:
 * <Slider appearance="secondary" size="M" />
 */
export const LabeledSlider: React.FC<LabeledSliderProps> = ({
  label,
  value,
  options,
  onChange,
  disabled = false,
}) => {
  const currentIndex = options.indexOf(value);
  const theme = useThemeColors();

  return (
    <div className="space-y-1.5">
      <label 
        className="block text-xs font-medium"
        style={{ color: theme.text.medium }}
      >
        {label}
      </label>
      <div className="space-y-0.5">
        {/* Slider track */}
        <div className="relative pt-0.5 -mr-0.5">
          <input
            type="range"
            min={0}
            max={options.length - 1}
            step={1}
            value={currentIndex}
            onChange={(e) => onChange(options[parseInt(e.target.value)])}
            disabled={disabled}
            data-at-zero={currentIndex === 0 ? "true" : "false"}
            className={`
              w-full h-3 rounded-full appearance-none cursor-pointer
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            style={{
              background: `linear-gradient(to right, ${theme.accent} 0%, ${theme.accent} ${(currentIndex / (options.length - 1)) * 100}%, ${theme.background.minimal} ${(currentIndex / (options.length - 1)) * 100}%, ${theme.background.minimal} 100%)`,
            }}
          />
        </div>

        {/* Option labels */}
        <div className="flex justify-between text-xs">
          {options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => !disabled && onChange(option)}
              disabled={disabled}
              className={`
                px-1.5 py-0.5 rounded transition-colors duration-200
                ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
              style={{
                color: index === currentIndex ? theme.text.high : theme.text.low,
                fontWeight: index === currentIndex ? 500 : 400,
              }}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LabeledSlider;
