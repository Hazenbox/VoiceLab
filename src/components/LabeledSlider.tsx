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
              accent-orange-500
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            style={{
              background: `linear-gradient(to right, rgb(249, 115, 22) 0%, rgb(249, 115, 22) ${(currentIndex / (options.length - 1)) * 100}%, ${theme.background.minimal} ${(currentIndex / (options.length - 1)) * 100}%, ${theme.background.minimal} 100%)`,
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
