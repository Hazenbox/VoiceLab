import React from 'react';
import type { ConversationConfig, VoiceGender, ColorMode, Pace, ResponseLength, Vibe } from '../../types';
import { TwVoiceSelector } from './TwVoiceSelector';
import { TwCustomSelect } from './TwCustomSelect';
import { TwLabeledSlider } from './TwLabeledSlider';
import { TwTextArea } from './TwTextArea';
import { VIBE_OPTIONS } from '../../constants';
import { useDesignSystem } from '../../context/DesignSystemContext';

interface TwConfigPanelProps {
  voiceGender: VoiceGender;
  onVoiceGenderChange: (gender: VoiceGender) => void;
  config: ConversationConfig;
  onConfigChange: (config: ConversationConfig) => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  onShowDocs: () => void;
  disabled?: boolean;
}

/**
 * Tailwind-styled configuration panel (left sidebar)
 */
export const TwConfigPanel: React.FC<TwConfigPanelProps> = ({
  voiceGender,
  onVoiceGenderChange,
  config,
  onConfigChange,
  colorMode,
  onColorModeChange,
  onShowDocs,
  disabled = false,
}) => {
  const { toggleDesignSystem, designSystem } = useDesignSystem();
  
  // Helper to update nested config
  const updatePersona = (key: string, value: unknown) => {
    onConfigChange({
      ...config,
      persona: {
        ...config.persona,
        [key]: value,
      },
    });
  };

  return (
    <aside className="w-[320px] h-full flex flex-col overflow-hidden bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="p-3">
        <img 
          src="/jio-voice-lab.svg" 
          alt="Jio Voice Lab" 
          className="h-8"
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Voice Selection */}
        <TwVoiceSelector
          value={voiceGender}
          onChange={onVoiceGenderChange}
          disabled={disabled}
        />

        {/* Tone Definition */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Tone Definition
          </label>
          <TwTextArea
            value={config.persona.tone}
            onChange={(value: string) => updatePersona('tone', value)}
            isDisabled={disabled}
            rows={2}
            size="S"
            placeholder="Describe the personality..."
          />
        </div>

        {/* Vibe Select */}
        <TwCustomSelect
          label="Vibe"
          value={config.persona.vibe}
          options={VIBE_OPTIONS}
          onChange={(value) => updatePersona('vibe', value as Vibe)}
          disabled={disabled}
        />

        {/* Greeting */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Greeting
          </label>
          <TwTextArea
            value={config.greeting}
            onChange={(value: string) => onConfigChange({ ...config, greeting: value })}
            isDisabled={disabled}
            rows={2}
            size="S"
            placeholder="Initial greeting message..."
          />
        </div>

        {/* Pace Slider */}
        <TwLabeledSlider
          label="Pace"
          value={config.persona.pace}
          options={['slow', 'medium', 'fast']}
          onChange={(value) => updatePersona('pace', value as Pace)}
          disabled={disabled}
        />

        {/* Response Length Slider */}
        <TwLabeledSlider
          label="Response Length"
          value={config.maxResponseLength}
          options={['short', 'medium', 'long']}
          onChange={(value) => onConfigChange({ ...config, maxResponseLength: value as ResponseLength })}
          disabled={disabled}
        />
      </div>

      {/* Footer - Theme & Design System Toggles */}
      <div className="p-3 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800">
        {/* Design System Toggle */}
        <button
          onClick={toggleDesignSystem}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          aria-label={`Switch to ${designSystem === 'jio' ? 'Tailwind' : 'Jio DS'}`}
        >
          <span>{designSystem === 'jio' ? '🎨 Jio DS' : '💨 Tailwind'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => onColorModeChange(colorMode === 'Light' ? 'Dark' : 'Light')}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-50"
          aria-label={`Switch to ${colorMode === 'Light' ? 'dark' : 'light'} mode`}
        >
          {colorMode === 'Light' ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
};

export default TwConfigPanel;
