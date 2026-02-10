import React from 'react';
import type { ConversationConfig, VoiceGender, ColorMode, Pace, ResponseLength, Vibe } from '../../types';
import { TwVoiceSelector } from './TwVoiceSelector';
import { TwCustomSelect } from './TwCustomSelect';
import { TwLabeledSlider } from './TwLabeledSlider';
import { TwTextArea } from './TwTextArea';
import { VIBE_OPTIONS } from '../../constants';
import { useDesignSystem } from '../../context/DesignSystemContext';
import { DSIcon } from '../DSIcon';

interface TwConfigPanelProps {
  voiceGender: VoiceGender;
  onVoiceGenderChange: (gender: VoiceGender) => void;
  config: ConversationConfig;
  onConfigChange: (config: ConversationConfig) => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  onShowDocs: () => void;
  onShowDesignSystem?: () => void;
  disabled?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  onShowDocs: _onShowDocs, // Prefix with _ to indicate intentionally unused
  onShowDesignSystem,
  disabled = false,
  isCollapsed = false,
  onToggleCollapse,
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
    <aside 
      className="h-full flex flex-col overflow-hidden bg-white dark:bg-zinc-950 border-l-2 border-zinc-400 dark:border-zinc-600 transition-all duration-300 ease-in-out relative"
      style={{ width: isCollapsed ? '48px' : '320px' }}
    >
      {/* Toggle Button */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-70 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-50"
          aria-label={isCollapsed ? 'Expand config panel' : 'Collapse config panel'}
        >
          {isCollapsed ? (
            <DSIcon name="IcChevronLeft" size="XS" attention="high" />
          ) : (
            <DSIcon name="IcChevronRight" size="XS" attention="high" />
          )}
        </button>
      )}

      {/* Scrollable content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollable-container">
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
      )}

      {/* Footer - Theme & Design System Toggles */}
      {!isCollapsed && (
        <div className="p-3 space-y-2 border-t border-zinc-200 dark:border-zinc-800">
        {/* Design System Library Link */}
        {onShowDesignSystem && (
          <button
            onClick={onShowDesignSystem}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            aria-label="Open Design System Library"
          >
            <DSIcon name="IcLayout" size="XS" attention="medium" />
            <span>Design System</span>
          </button>
        )}
        
        <div className="flex items-center justify-between">
          {/* Design System Toggle */}
          <button
            onClick={toggleDesignSystem}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            aria-label={`Switch to ${designSystem === 'jio' ? 'Tailwind' : 'Jio DS'}`}
          >
            <span className="flex items-center gap-1">{designSystem === 'jio' ? <><DSIcon name="IcPalette" size="XS" attention="medium" /> Jio DS</> : <><DSIcon name="IcCode" size="XS" attention="medium" /> Tailwind</>}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => onColorModeChange(colorMode === 'Light' ? 'Dark' : 'Light')}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-50"
            aria-label={`Switch to ${colorMode === 'Light' ? 'dark' : 'light'} mode`}
          >
            {colorMode === 'Light' ? (
              <DSIcon name="IcMoonFull" size="XS" attention="high" />
            ) : (
              <DSIcon name="IcSunnyClear" size="XS" attention="high" />
            )}
          </button>
        </div>
        </div>
      )}
    </aside>
  );
};

export default TwConfigPanel;
