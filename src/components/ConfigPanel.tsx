import React, { memo, useCallback } from 'react';
import type { ConversationConfig, VoiceGender, ColorMode, Pace, ResponseLength, Vibe } from '../types';
import { VoiceSelector } from './VoiceSelector';
import { CustomSelect } from './CustomSelect';
import { LabeledSlider } from './LabeledSlider';
import { VIBE_OPTIONS } from '../constants';
import { useThemeColors } from '../theme';
import { useDesignSystem } from '../context/DesignSystemContext';
import { TextArea } from '@marcelinodzn/ds-react';

interface ConfigPanelProps {
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
 * Left sidebar configuration panel
 * Memoized to prevent unnecessary re-renders
 */
export const ConfigPanel = memo(function ConfigPanel({
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
}: ConfigPanelProps) {
  // Theme colors from DS tokens
  const theme = useThemeColors();
  const { toggleDesignSystem, designSystem } = useDesignSystem();
  
  // Helper to update nested config
  const updatePersona = useCallback((key: string, value: unknown) => {
    onConfigChange({
      ...config,
      persona: {
        ...config.persona,
        [key]: value,
      },
    });
  }, [config, onConfigChange]);

  return (
    <aside 
      className="h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out relative"
      style={{ 
        width: isCollapsed ? '48px' : '320px',
        backgroundColor: theme.background.ghost,
        borderLeft: `1px solid ${theme.stroke.low}`,
      }}
    >
      {/* Toggle Button - Positioned right when expanded, left when collapsed */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className={`absolute top-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-70 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 ${isCollapsed ? 'left-2' : 'right-3'}`}
          style={{
            backgroundColor: theme.stroke.low,
            color: theme.text.high,
          }}
          aria-label={isCollapsed ? 'Expand config panel' : 'Collapse config panel'}
        >
          {/* Sidebar toggle icon */}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            {isCollapsed ? (
              // Panel left icon (expand)
              <>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="9" y1="3" x2="9" y2="21" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : (
              // Panel right icon (collapse)
              <>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="15" y1="3" x2="15" y2="21" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
          </svg>
        </button>
      )}

      {/* Scrollable content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
          <div className="scaled-textarea-wrapper">
            <TextArea
              value={config.persona.tone}
              onChange={(value: string) => updatePersona('tone', value)}
              isDisabled={disabled}
              rows={2}
              size="S"
              placeholder="Describe the personality..."
            />
          </div>
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
          <div className="scaled-textarea-wrapper">
            <TextArea
              value={config.greeting}
              onChange={(value: string) => onConfigChange({ ...config, greeting: value })}
              isDisabled={disabled}
              rows={2}
              size="S"
              placeholder="Initial greeting message..."
            />
          </div>
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
      )}

      {/* Footer - Theme & Design System Toggles */}
      {!isCollapsed && (
        <div className="p-3 space-y-2">
        {/* Design System Library Link - Text Link Style */}
        {onShowDesignSystem && (
          <button
            onClick={onShowDesignSystem}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-70 cursor-pointer"
            style={{
              color: theme.text.medium,
              backgroundColor: 'transparent',
            }}
            aria-label="Open Design System Library"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v9a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
            </svg>
            <span>Design System</span>
          </button>
        )}
        
        <div className="flex items-center justify-between">
          {/* Design System Toggle - Text Link Style */}
          <button
            onClick={toggleDesignSystem}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-70 cursor-pointer"
            style={{
              color: theme.text.medium,
              backgroundColor: 'transparent',
            }}
            aria-label={`Switch to ${designSystem === 'jio' ? 'Tailwind' : 'Jio DS'}`}
          >
            <span>{designSystem === 'jio' ? 'Jio DS' : 'Tailwind'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => onColorModeChange(colorMode === 'Light' ? 'Dark' : 'Light')}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
            style={{
              backgroundColor: theme.stroke.low,
              color: theme.text.high,
            }}
            aria-label={`Switch to ${colorMode === 'Light' ? 'dark' : 'light'} mode`}
          >
            {colorMode === 'Light' ? (
              // Moon icon for dark mode
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
              </svg>
            ) : (
              // Sun icon for light mode
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
              </svg>
            )}
          </button>
        </div>
        </div>
      )}
    </aside>
  );
});

export default ConfigPanel;
