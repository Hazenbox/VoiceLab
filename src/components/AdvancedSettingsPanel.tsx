/**
 * AdvancedSettingsPanel Component
 * 
 * Contains advanced settings organized in collapsible sections:
 * 
 * 1. Voice settings - Voice selection, greeting, pace, response length
 * 2. Trust settings - Score thresholds, blocking behavior
 */

import { memo, useCallback } from 'react';
import { DSIcon } from './DSIcon';
import type { 
  VoiceGender, 
  TrustSettings,
  ValidationStrictness,
  ConversationConfig,
  Pace,
  ResponseLength,
} from '../types';
import { VoiceSelector } from './VoiceSelector';
import { LabeledSlider } from './LabeledSlider';
import { Slider } from './Slider';
import { Toggle } from './Toggle';
import { SearchableDropdown } from './SearchableDropdown';
import { TooltipIcon } from './TooltipIcon';
import { useThemeColors } from '../theme';
import { TextArea, Title } from '@marcelinodzn/ds-react';
import { Accordion } from './ui/Accordion';

// =============================================================================
// Types
// =============================================================================

interface AdvancedSettingsPanelProps {
  // Voice settings
  voiceGender: VoiceGender;
  onVoiceGenderChange: (gender: VoiceGender) => void;
  
  // Conversation config
  config: ConversationConfig;
  onConfigChange: (config: ConversationConfig) => void;
  
  // Trust settings
  trustSettings: TrustSettings;
  onTrustSettingsChange: (settings: TrustSettings) => void;
  
  // UI state
  disabled?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// =============================================================================
// Icons - Using DSIcon wrapper
// =============================================================================

const VoiceIcon = () => <DSIcon name="IcMic" size="S" attention="medium" appearance="neutral" />;

const TrustIcon = () => <DSIcon name="IcProtection" size="S" attention="medium" appearance="neutral" />;

// =============================================================================
// Main Component
// =============================================================================

export const AdvancedSettingsPanel = memo(function AdvancedSettingsPanel({
  voiceGender,
  onVoiceGenderChange,
  config,
  onConfigChange,
  trustSettings,
  onTrustSettingsChange,
  disabled = false,
  isCollapsed = false,
  onToggleCollapse,
}: AdvancedSettingsPanelProps) {
  const theme = useThemeColors();
  
  // Strictness options
  const strictnessOptions = [
    { value: 'lenient' as ValidationStrictness, label: 'Lenient' },
    { value: 'standard' as ValidationStrictness, label: 'Standard' },
    { value: 'strict' as ValidationStrictness, label: 'Strict' },
  ];
  
  // Conversation config updater
  const updatePersona = useCallback((key: string, value: unknown) => {
    onConfigChange({
      ...config,
      persona: {
        ...config.persona,
        [key]: value,
      },
    });
  }, [config, onConfigChange]);
  
  // Trust settings updater
  const updateTrustSetting = useCallback(<K extends keyof TrustSettings>(
    key: K,
    value: TrustSettings[K]
  ) => {
    onTrustSettingsChange({
      ...trustSettings,
      [key]: value,
    });
  }, [trustSettings, onTrustSettingsChange]);
  
  // Don't render if collapsed
  if (isCollapsed) return null;
  
  return (
    <aside
      className="h-full flex flex-col overflow-hidden relative"
      style={{
        width: '380px',
        backgroundColor: theme.background.ghost,
        borderLeft: `1px solid ${theme.stroke.medium}`,
      }}
    >
      {/* Header */}
      {(
        <div
          className="pl-4 pr-4 py-3 flex items-center justify-between"
        >
          <Title size="M" as="h2" weight="high" color="high">
            Advanced settings
          </Title>
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              backgroundColor: theme.background.ghost,
              color: theme.text.medium,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.stroke.low}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.background.ghost}
            aria-label="Close settings panel"
          >
            <DSIcon name="IcClose" size="S" attention="medium" />
          </button>
        </div>
      )}
      
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-0 pb-4 space-y-3 scrollable-container">
          {/* Voice Settings Section */}
          <Accordion title="Voice settings" icon={<VoiceIcon />} defaultOpen>
            <VoiceSelector
              value={voiceGender}
              onChange={onVoiceGenderChange}
              disabled={disabled}
              tooltip="Choose male or female voice for audio generation"
            />
            
            {/* Greeting */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <label 
                  className="block text-xs font-normal"
                  style={{ color: theme.text.medium }}
                >
                  Greeting
                </label>
                <TooltipIcon tooltip="The first message the AI says when starting a conversation" />
              </div>
              <div className="scaled-textarea-wrapper">
                <div style={{ maxHeight: '80px', overflow: 'auto' }}>
                  <TextArea
                    value={config.greeting}
                    onChange={(value: string) => onConfigChange({ ...config, greeting: value })}
                    isDisabled={disabled}
                    rows={2}
                    size="S"
                    placeholder="Initial greeting message..."
                  />
                </div>
                <style>{`
                  .scaled-textarea-wrapper > div > div > div {
                    gap: 16px !important;
                    justify-content: center !important;
                    align-items: flex-start !important;
                    padding: 8px !important;
                    width: 100% !important;
                  }
                  .scaled-textarea-wrapper textarea {
                    font-size: 14px !important;
                    padding: 8px !important;
                    min-height: 56px !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                  }
                `}</style>
              </div>
            </div>
            
            {/* Pace */}
            <LabeledSlider
              label="Pace"
              value={config.persona.pace}
              options={['slow', 'medium', 'fast']}
              onChange={(value) => updatePersona('pace', value as Pace)}
              disabled={disabled}
              tooltip="How the AI structures its responses - slow gives more detail, fast is more concise"
            />
            
            {/* Response Length */}
            <LabeledSlider
              label="Response Length"
              value={config.maxResponseLength}
              options={['short', 'medium', 'long']}
              onChange={(value) => onConfigChange({ ...config, maxResponseLength: value as ResponseLength })}
              disabled={disabled}
              tooltip="How long AI responses should be. Short (30 words), Medium (50), Long (100)"
            />
          </Accordion>
          
          {/* Trust Settings Section */}
          <Accordion title="Trust settings" icon={<TrustIcon />}>
            <Slider
              label="Minimum Score"
              value={trustSettings.minimumScore}
              min={70}
              max={100}
              onChange={(value) => updateTrustSetting('minimumScore', value)}
              disabled={disabled}
              tooltip="Content below this trust score gets flagged for review"
            />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-normal flex-shrink-0" style={{ color: theme.text.medium }}>
                  Validation Strictness
                </label>
                <TooltipIcon tooltip="Lenient = fewer warnings, Strict = catches more potential issues" />
              </div>
              <div className="max-w-[50%] ml-auto">
                <SearchableDropdown
                  value={trustSettings.validationStrictness}
                  onChange={(v) => updateTrustSetting('validationStrictness', v as ValidationStrictness)}
                  options={strictnessOptions}
                  placeholder="Select strictness"
                  disabled={disabled}
                  compact={true}
                />
              </div>
            </div>
            <Toggle
              label="Block Below Threshold"
              checked={trustSettings.blockBelowThreshold}
              onChange={(checked) => updateTrustSetting('blockBelowThreshold', checked)}
              disabled={disabled}
              tooltip="Reject content that scores below minimum instead of just flagging"
            />
            <Toggle
              label="Auto-fix Minor Issues"
              checked={trustSettings.autoFixMinorIssues}
              onChange={(checked) => updateTrustSetting('autoFixMinorIssues', checked)}
              disabled={disabled}
              tooltip="Automatically fix small issues like punctuation and capitalization"
            />
            <Toggle
              label="Show Detailed Breakdown"
              checked={trustSettings.showDetailedBreakdown}
              onChange={(checked) => updateTrustSetting('showDetailedBreakdown', checked)}
              disabled={disabled}
              tooltip="Show individual scores from each validation agent"
            />
          </Accordion>
          
          {/* Appearance Section removed - Theme and Design System moved to navigation */}
      </div>
    </aside>
  );
});

export default AdvancedSettingsPanel;
