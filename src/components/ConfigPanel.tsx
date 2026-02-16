import { memo, useCallback } from 'react';
import type { ConversationConfig, VoiceGender, ColorMode, Pace, ResponseLength, Vibe } from '../types';
import { VoiceSelector } from './VoiceSelector';
import { CustomSelect } from './CustomSelect';
import { LabeledSlider } from './LabeledSlider';
import { VIBE_OPTIONS } from '../constants';
import { useThemeColors } from '../theme';
// Design system context removed - now using single Jio DS
import { TextArea, Label } from '@marcelinodzn/ds-react';
import { DSIcon } from './DSIcon';

interface ConfigPanelProps {
  voiceGender: VoiceGender;
  onVoiceGenderChange: (gender: VoiceGender) => void;
  config: ConversationConfig;
  onConfigChange: (config: ConversationConfig) => void;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  onShowDocs: () => void;
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
  colorMode: _colorMode, // Prefix with _ to indicate intentionally unused
  onColorModeChange: _onColorModeChange, // Prefix with _ to indicate intentionally unused
  onShowDocs: _onShowDocs, // Prefix with _ to indicate intentionally unused
  disabled = false,
  isCollapsed = false,
  onToggleCollapse,
}: ConfigPanelProps) {
  // Theme colors from DS tokens
  const theme = useThemeColors();
  
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
          {isCollapsed ? (
            <DSIcon name="IcChevronRight" size="XS" attention="high" />
          ) : (
            <DSIcon name="IcChevronLeft" size="XS" attention="high" />
          )}
        </button>
      )}

      {/* Scrollable content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollable-container">
        {/* Voice Selection */}
        <VoiceSelector
          value={voiceGender}
          onChange={onVoiceGenderChange}
          disabled={disabled}
        />

        {/* Tone Definition */}
        <div className="space-y-1.5">
          <Label size="XS" weight="medium" attention="medium" as="label">
            tone definition
          </Label>
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
          <Label size="XS" weight="medium" attention="medium" as="label">
            greeting
          </Label>
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

      {/* Footer removed - Design System and Dark Mode moved to navigation */}
    </aside>
  );
});

export default ConfigPanel;
