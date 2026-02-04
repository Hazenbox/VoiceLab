import React from 'react';
import { TwRadioGroup, TwRadio } from './TwRadioGroup';
import { VoiceGender } from '../../types';

interface TwVoiceSelectorProps {
  value: VoiceGender;
  onChange: (value: VoiceGender) => void;
  disabled?: boolean;
}

/**
 * Tailwind-styled voice selector component
 * Uses TwRadioGroup to match the Jio DS VoiceSelector
 */
export const TwVoiceSelector: React.FC<TwVoiceSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const handleChange = (val: string) => {
    onChange(val as VoiceGender);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Voice Model
      </label>
      <TwRadioGroup
        name="voice-gender"
        value={value}
        onChange={handleChange}
        orientation="horizontal"
        size="S"
        appearance="secondary"
        isDisabled={disabled}
      >
        <TwRadio value={VoiceGender.FEMALE} label="Female" checked={false} onChange={() => {}} />
        <TwRadio value={VoiceGender.MALE} label="Male" checked={false} onChange={() => {}} />
      </TwRadioGroup>
    </div>
  );
};

export default TwVoiceSelector;
