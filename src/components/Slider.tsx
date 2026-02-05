import React from 'react';
import { useThemeColors } from '../theme';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  formatValue?: (value: number) => string;
}

/**
 * Continuous slider component for numeric ranges.
 * 
 * Design System Integration:
 * - Uses HTML range input with custom styling
 * - Track background: theme.stroke.low (requested for settings panel)
 * - Filled track color: theme.accent (brand orange)
 * - Thumb: theme.local.white with shadow
 * - Text: theme.text.high/medium (DS tokens)
 */
export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
  formatValue,
}) => {
  const theme = useThemeColors();
  
  // Calculate fill percentage for visual feedback
  const fillPercentage = ((value - min) / (max - min)) * 100;
  
  // Format the displayed value
  const displayValue = formatValue ? formatValue(value) : value.toString();

  return (
    <div className="space-y-2">
      {/* Label and Value */}
      <div className="flex items-center justify-between">
        <label
          className="text-xs font-medium"
          style={{ color: theme.text.high }}
        >
          {label}
        </label>
        <span
          className="text-xs font-mono font-medium"
          style={{ color: theme.text.medium }}
        >
          {displayValue}
        </span>
      </div>
      
      {/* Slider Track */}
      <div className="relative">
        {/* Background track */}
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full pointer-events-none"
          style={{ backgroundColor: theme.stroke.low }}
        />
        
        {/* Active/filled portion */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full pointer-events-none transition-all"
          style={{
            width: `${fillPercentage}%`,
            backgroundColor: theme.accent,
          }}
        />
        
        {/* Actual range input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className={`
            relative w-full h-1.5 appearance-none bg-transparent cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
        />
      </div>
      
      {/* Custom styles for slider thumb */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${theme.local.white};
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          transition: transform 0.15s ease;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover:not(:disabled) {
          transform: scale(1.1);
        }
        
        input[type="range"]::-webkit-slider-thumb:active:not(:disabled) {
          transform: scale(0.95);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${theme.local.white};
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          transition: transform 0.15s ease;
        }
        
        input[type="range"]::-moz-range-thumb:hover:not(:disabled) {
          transform: scale(1.1);
        }
        
        input[type="range"]::-moz-range-thumb:active:not(:disabled) {
          transform: scale(0.95);
        }
        
        input[type="range"]:disabled::-webkit-slider-thumb {
          cursor: not-allowed;
        }
        
        input[type="range"]:disabled::-moz-range-thumb {
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default Slider;
