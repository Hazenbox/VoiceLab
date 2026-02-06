import React from 'react';
import { RadioGroup, Radio } from '@marcelinodzn/ds-react';
import { VoiceGender } from '../types';
import { useThemeColors } from '../theme';

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
