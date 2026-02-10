import React from 'react';
import { useThemeColors } from '../theme';
import { DSIcon } from './DSIcon';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  formatValue?: (value: number) => string;
  tooltip?: string;
}

/**
 * Continuous slider component for numeric ranges.
 * Matches LabeledSlider visual style with filled track and visible knob.
 * 
 * Design System Integration:
 * - Uses HTML range input with custom styling
 * - Track background: #F5F5F5 (light) / #262626 (dark) to match LabeledSlider
 * - Filled track color: orange (#fa7d19 light / #ea580c dark)
 * - Knob: 8px white circle at end of filled track
 * - Text: theme.text.medium (DS tokens)
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
  tooltip,
}) => {
  const theme = useThemeColors();
  const [showTooltip, setShowTooltip] = React.useState(false);
  
  // Smart width calculation based on content length
  const getTooltipWidth = (text: string) => {
    const length = text.length;
    if (length < 40) return '180px';      // Short text
    if (length < 80) return '240px';      // Medium text
    if (length < 120) return '280px';     // Long text
    return '320px';                        // Very long text
  };
  
  // Calculate fill percentage for visual feedback
  const fillPercentage = ((value - min) / (max - min)) * 100;
  
  // Format the displayed value
  const displayValue = formatValue ? formatValue(value) : value.toString();
  
  // Surface-Minimal: Match LabeledSlider colors
  const inactiveBg = theme.isLight ? '#F5F5F5' : '#262626';
  const activeBg = theme.isLight ? '#fa7d19' : '#ea580c';

  return (
    <div className="space-y-2">
      {/* Label and Value */}
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
                className="cursor-help opacity-50"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <DSIcon name="IcInfo" size="XS" attention="low" />
              </div>
              {showTooltip && (
                <div
                  className="absolute left-0 top-full mt-1 z-50 px-2 py-1.5 rounded text-xs whitespace-normal"
                  style={{
                    backgroundColor: theme.isLight ? '#262626' : '#f5f5f5',
                    color: theme.isLight ? '#ffffff' : '#000000',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    width: getTooltipWidth(tooltip),
                    maxWidth: '95vw',
                  }}
                >
                  {tooltip}
                </div>
              )}
            </>
          )}
        </div>
        <span
          className="text-xs font-mono font-normal"
          style={{ color: theme.text.medium }}
        >
          {displayValue}
        </span>
      </div>
      
      {/* Slider Track - Match LabeledSlider style */}
      <div className="relative -mr-0.5">
        <div className="relative h-3">
          {/* Background track - inactive color */}
          <div 
            className="absolute left-0 right-0 top-0 rounded-full pointer-events-none"
            style={{
              background: inactiveBg,
              height: '12px',
            }}
          />
          
          {/* Active portion overlay with knob at right edge */}
          <div 
            className="absolute left-0 top-0 rounded-full pointer-events-none flex items-center justify-end"
            style={{
              width: `${fillPercentage}%`,
              minWidth: '12px',
              background: activeBg,
              height: '12px',
            }}
          >
            {/* Knob positioned inside at right edge of active track */}
            <div 
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'white',
                marginRight: '2px',
              }}
            />
          </div>
          
          {/* Actual range input - transparent background */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className={`
              relative w-full h-3 rounded-full appearance-none cursor-pointer
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            style={{
              background: 'transparent',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Slider;
