import React from 'react';

interface TwLabeledSliderProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Tailwind-styled discrete slider with labeled options
 */
export const TwLabeledSlider: React.FC<TwLabeledSliderProps> = ({
  label,
  value,
  options,
  onChange,
  disabled = false,
}) => {
  const currentIndex = options.indexOf(value);

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </label>
      <div className="space-y-0.5">
        {/* Slider track */}
        <div className="relative">
          <input
            type="range"
            min={0}
            max={options.length - 1}
            step={1}
            value={currentIndex}
            onChange={(e) => onChange(options[parseInt(e.target.value)])}
            disabled={disabled}
            className={`
              w-full cursor-pointer
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
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
                ${index === currentIndex
                  ? 'text-zinc-900 dark:text-zinc-50 font-medium'
                  : 'text-zinc-400 dark:text-zinc-500 font-normal'
                }
              `}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TwLabeledSlider;
