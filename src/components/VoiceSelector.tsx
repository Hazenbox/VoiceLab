import React from 'react';
import { VoiceGender } from '../types';

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
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        Voice Model
      </label>
      <div className="flex flex-col gap-2">
        <label
          className={`
            flex items-center gap-2 cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            type="radio"
            name="voice-gender"
            value={VoiceGender.FEMALE}
            checked={value === VoiceGender.FEMALE}
            onChange={() => onChange(VoiceGender.FEMALE)}
            disabled={disabled}
            className="w-4 h-4 text-orange-500 border-zinc-300 dark:border-zinc-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Female</span>
        </label>

        <label
          className={`
            flex items-center gap-2 cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            type="radio"
            name="voice-gender"
            value={VoiceGender.MALE}
            checked={value === VoiceGender.MALE}
            onChange={() => onChange(VoiceGender.MALE)}
            disabled={disabled}
            className="w-4 h-4 text-orange-500 border-zinc-300 dark:border-zinc-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Male</span>
        </label>
      </div>
    </div>
  );
};

export default VoiceSelector;
