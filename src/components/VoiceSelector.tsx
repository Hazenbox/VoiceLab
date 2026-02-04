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
    <div className="space-y-1.5">
      <label 
        className="block text-xs font-medium"
        style={{ color: theme.text.medium }}
      >
        Voice Model
      </label>
      <div style={{ transform: 'scale(0.85)', transformOrigin: 'left top' }}>
        <RadioGroup
          name="voice-gender"
          value={value}
          onChange={handleChange}
          orientation="vertical"
          size="S"
          appearance="secondary"
          isDisabled={disabled}
        >
          <Radio value={VoiceGender.FEMALE} label="Female" />
          <Radio value={VoiceGender.MALE} label="Male" />
        </RadioGroup>
      </div>
    </div>
  );
};

export default VoiceSelector;
