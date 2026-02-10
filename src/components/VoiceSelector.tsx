import React from 'react';
import { RadioGroup, Radio } from '@marcelinodzn/ds-react';
import { VoiceGender } from '../types';
import { useThemeColors } from '../theme';
import { DSIcon } from './DSIcon';

interface VoiceSelectorProps {
  value: VoiceGender;
  onChange: (value: VoiceGender) => void;
  disabled?: boolean;
  tooltip?: string;
}

/**
 * Radio group for selecting voice gender (Female/Male)
 */
export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  value,
  onChange,
  disabled = false,
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
  
  const handleChange = (val: string) => {
    onChange(val as VoiceGender);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 relative">
        <label 
          className="text-xs font-normal"
          style={{ color: theme.text.medium }}
        >
          Voice Model
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
      <div className="voice-selector-radio-group" style={{ transform: 'scale(0.85)', transformOrigin: 'right top' }}>
        <RadioGroup
          name="voice-gender"
          value={value}
          onChange={handleChange}
          orientation="horizontal"
          size="S"
          appearance="secondary"
          isDisabled={disabled}
        >
          <Radio value={VoiceGender.FEMALE} label="Female" />
          <Radio value={VoiceGender.MALE} label="Male" />
        </RadioGroup>
        <style>{`
          .voice-selector-radio-group [role="radiogroup"] > div {
            gap: 16px !important;
            justify-content: center !important;
            align-items: flex-start !important;
          }
          .voice-selector-radio-group [role="radiogroup"] span {
            font-size: 14px !important;
            font-weight: 400 !important;
          }
        `}</style>
      </div>
    </div>
  );
};

export default VoiceSelector;
