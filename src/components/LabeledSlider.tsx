import React from 'react';

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

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <div className="space-y-2">
        {/* Slider track */}
        <div className="relative pt-0.5">
          <input
            type="range"
            min={0}
            max={options.length - 1}
            step={1}
            value={currentIndex}
            onChange={(e) => onChange(options[parseInt(e.target.value)])}
            disabled={disabled}
            className={`
              w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer
              accent-orange-500
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            style={{
              background: `linear-gradient(to right, rgb(249, 115, 22) 0%, rgb(249, 115, 22) ${(currentIndex / (options.length - 1)) * 100}%, rgb(228, 228, 231) ${(currentIndex / (options.length - 1)) * 100}%, rgb(228, 228, 231) 100%)`,
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
                ${index === currentIndex
                  ? 'text-orange-600 dark:text-orange-400 font-medium'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }
                ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
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

export default LabeledSlider;
