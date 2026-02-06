import React from 'react';
import { RadioGroup, Radio } from '@marcelinodzn/ds-react';
import { VoiceGender } from '../types';
import { useThemeColors } from '../theme';

interface VoiceSelectorProps {
  value: VoiceGender;
  onChange: (value: VoiceGender) => void;
  disabled?: boolean;
}

/**
 * Radio group for selecting voice gender (Female/Male)
 */
export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const theme = useThemeColors();
  
  const handleChange = (val: string) => {
    onChange(val as VoiceGender);
  };

  return (
    <div className="flex items-center justify-between">
      <label 
        className="text-xs font-normal"
        style={{ color: theme.text.medium }}
      >
        Voice Model
      </label>
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
            gap: 12px !important;
          }
        `}</style>
      </div>
    </div>
  );
};

export default VoiceSelector;
