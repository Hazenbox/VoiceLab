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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Voice Model
      </label>
      <div className="flex gap-4">
        <label
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer
            transition-all duration-200
            ${value === VoiceGender.FEMALE
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
            }
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
            className="sr-only"
          />
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="font-medium">Female</span>
        </label>

        <label
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer
            transition-all duration-200
            ${value === VoiceGender.MALE
              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
            }
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
            className="sr-only"
          />
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="font-medium">Male</span>
        </label>
      </div>
    </div>
  );
};

export default VoiceSelector;
