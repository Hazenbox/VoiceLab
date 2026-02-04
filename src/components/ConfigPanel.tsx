import React from 'react';
import type { ConversationConfig, VoiceGender, ColorMode, Pace, ResponseLength, Vibe } from '../types';
import { VoiceSelector } from './VoiceSelector';
import { CustomSelect } from './CustomSelect';
import { LabeledSlider } from './LabeledSlider';
import { VIBE_OPTIONS } from '../constants';
import { useThemeColors } from '../theme';

interface ConfigPanelProps {
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
 * Left sidebar configuration panel
 */
export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  voiceGender,
  onVoiceGenderChange,
  config,
  onConfigChange,
  colorMode,
  onColorModeChange,
  onShowDocs,
  disabled = false,
}) => {
  // Theme colors from DS tokens
  const theme = useThemeColors();
  
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
    <aside 
      className="w-[320px] h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: theme.background.subtle }}
    >
      {/* Header */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <img 
            src="/jio-voice-lab.svg" 
            alt="Jio Voice Lab" 
            className="h-8"
          />
          <button
            onClick={onShowDocs}
            className="p-1.5 rounded-full transition-colors"
            style={{ color: theme.text.medium }}
            title="Documentation"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Voice Selection */}
        <VoiceSelector
          value={voiceGender}
          onChange={onVoiceGenderChange}
          disabled={disabled}
        />

        {/* Tone Definition */}
        <div className="space-y-1.5">
          <label 
            className="block text-xs font-medium"
            style={{ color: theme.text.medium }}
          >
            Tone Definition
          </label>
          <textarea
            value={config.persona.tone}
            onChange={(e) => updatePersona('tone', e.target.value)}
            disabled={disabled}
            rows={2}
            className="w-full px-2.5 py-1.5 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            style={{
              backgroundColor: theme.background.moderate,
              border: `1px solid ${theme.stroke.low}`,
              color: theme.text.high,
            }}
            placeholder="Describe the personality..."
          />
        </div>

        {/* Vibe Select */}
        <CustomSelect
          label="Vibe"
          value={config.persona.vibe}
          options={VIBE_OPTIONS}
          onChange={(value) => updatePersona('vibe', value as Vibe)}
          disabled={disabled}
        />

        {/* Greeting */}
        <div className="space-y-1.5">
          <label 
            className="block text-xs font-medium"
            style={{ color: theme.text.medium }}
          >
            Greeting
          </label>
          <input
            type="text"
            value={config.greeting}
            onChange={(e) => onConfigChange({ ...config, greeting: e.target.value })}
            disabled={disabled}
            className="w-full px-2.5 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
            style={{
              backgroundColor: theme.background.moderate,
              border: `1px solid ${theme.stroke.low}`,
              color: theme.text.high,
            }}
            placeholder="Initial greeting message..."
          />
        </div>

        {/* Pace Slider */}
        <LabeledSlider
          label="Pace"
          value={config.persona.pace}
          options={['slow', 'medium', 'fast']}
          onChange={(value) => updatePersona('pace', value as Pace)}
          disabled={disabled}
        />

        {/* Response Length Slider */}
        <LabeledSlider
          label="Response Length"
          value={config.maxResponseLength}
          options={['short', 'medium', 'long']}
          onChange={(value) => onConfigChange({ ...config, maxResponseLength: value as ResponseLength })}
          disabled={disabled}
        />
      </div>

      {/* Footer - Theme Toggle */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span 
            className="text-xs"
            style={{ color: theme.text.medium }}
          >
            Theme
          </span>
          <button
            onClick={() => onColorModeChange(colorMode === 'Light' ? 'Dark' : 'Light')}
            className="relative w-10 h-5 rounded-full transition-colors"
            style={{ backgroundColor: theme.background.moderate }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
              style={{
                right: colorMode === 'Dark' ? '2px' : 'auto',
                left: colorMode === 'Dark' ? 'auto' : '2px',
                backgroundColor: colorMode === 'Dark' ? '#f97316' : '#ffffff',
                boxShadow: colorMode === 'Light' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
              }}
            />
            <span className="sr-only">Toggle theme</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <svg
            className="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 24 24"
            style={{ color: colorMode === 'Light' ? '#f97316' : theme.text.low }}
          >
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
          </svg>
          <span className="text-xs" style={{ color: theme.text.low }}>Light</span>
          <span className="text-xs" style={{ color: theme.text.low }}>/</span>
          <svg
            className="w-3 h-3"
            fill="currentColor"
            viewBox="0 0 24 24"
            style={{ color: colorMode === 'Dark' ? '#f97316' : theme.text.low }}
          >
            <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
          </svg>
          <span className="text-xs" style={{ color: theme.text.low }}>Dark</span>
        </div>
      </div>
    </aside>
  );
};

export default ConfigPanel;
