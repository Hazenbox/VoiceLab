import React from 'react';
import { useThemeColors } from '../theme';
import { Label } from '@marcelinodzn/ds-react';
import { DSIcon } from './DSIcon';

/** Slider track colors */
const TRACK_ACTIVE_LIGHT = '#fa7d19';
const TRACK_ACTIVE_DARK = '#fa7d19';

interface LabeledSliderProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  tooltip?: string;
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
  tooltip,
}) => {
  const currentIndex = options.indexOf(value);
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
  
  // Surface-Minimal: Use theme background.bold for inactive track
  const inactiveBg = theme.background.bold;
  
  // Active color: bright orange in light mode, darker orange in dark mode
  const activeBg = theme.isLight ? TRACK_ACTIVE_LIGHT : TRACK_ACTIVE_DARK;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 relative">
        <Label size="XS" weight="low" attention="high" as="label">
          {label}
        </Label>
        {tooltip && (
          <>
            <div
              className="cursor-help flex items-center"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <DSIcon name="IcInfo" size="XS" attention="low" appearance="neutral" />
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
      <div className="space-y-0.5 overflow-visible">
        {/* Slider track */}
        <div className="relative -mr-0.5 overflow-visible">
          <div className="relative h-3 overflow-visible">
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
                width: `${(currentIndex / (options.length - 1)) * 100}%`,
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
              min={0}
              max={options.length - 1}
              step={1}
              value={currentIndex}
              onChange={(e) => onChange(options[parseInt(e.target.value)])}
              disabled={disabled}
              data-at-zero={currentIndex === 0 ? "true" : "false"}
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
