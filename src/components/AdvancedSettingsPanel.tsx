/**
 * AdvancedSettingsPanel Component
 * 
 * Repurposed ConfigPanel for the Content Trust System.
 * Contains advanced settings organized in collapsible sections:
 * 
 * 1. Voice & TTS - Voice selection, TTS provider, preview
 * 2. Project Defaults - Default ecosystem, channel, language, region
 * 3. Trust Settings - Score thresholds, blocking behavior
 * 4. Appearance - Theme, design system
 */

import { memo, useCallback } from 'react';
import { DSIcon } from './DSIcon';
import type { 
  VoiceGender, 
  ColorMode, 
  EcosystemType, 
  ContentChannelType,
  SupportedLanguage,
  IndianRegion,
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
// Design system context removed - now using single Jio DS
import { getEcosystemOptions, getChannelOptions, getLanguageOptions, getRegionOptions } from '../services/guidelines';
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
  
  // Project defaults
  defaultEcosystem: EcosystemType;
  defaultChannel: ContentChannelType;
  defaultLanguage: SupportedLanguage;
  defaultRegion: IndianRegion;
  onDefaultEcosystemChange: (ecosystem: EcosystemType) => void;
  onDefaultChannelChange: (channel: ContentChannelType) => void;
  onDefaultLanguageChange: (language: SupportedLanguage) => void;
  onDefaultRegionChange: (region: IndianRegion) => void;
  
  // Trust settings
  trustSettings: TrustSettings;
  onTrustSettingsChange: (settings: TrustSettings) => void;
  
  // Appearance
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  
  // Chat generation settings
  temperature?: number;
  maxTokens?: number;
  streamResponse?: boolean;
  onTemperatureChange?: (value: number) => void;
  onMaxTokensChange?: (value: number) => void;
  onStreamResponseChange?: (checked: boolean) => void;
  
  // UI state
  disabled?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onShowDesignSystem?: () => void;
}

// Inline components removed - now using dedicated Slider and Toggle components
// Section component replaced with shared Accordion component

// =============================================================================
// Icons - Using DSIcon wrapper
// =============================================================================

const VoiceIcon = () => <DSIcon name="IcMic" size="S" attention="medium" appearance="neutral" />;

const ProjectIcon = () => <DSIcon name="IcFolder" size="S" attention="medium" appearance="neutral" />;

const TrustIcon = () => <DSIcon name="IcProtection" size="S" attention="medium" appearance="neutral" />;

const ChatIcon = () => <DSIcon name="IcChat" size="S" attention="medium" appearance="neutral" />;

// =============================================================================
// Main Component
// =============================================================================

export const AdvancedSettingsPanel = memo(function AdvancedSettingsPanel({
  voiceGender,
  onVoiceGenderChange,
  config,
  onConfigChange,
  defaultEcosystem,
  defaultChannel,
  defaultLanguage,
  defaultRegion,
  onDefaultEcosystemChange,
  onDefaultChannelChange,
  onDefaultLanguageChange,
  onDefaultRegionChange,
  trustSettings,
  onTrustSettingsChange,
  colorMode: _colorMode, // Prefix with _ to indicate intentionally unused
  onColorModeChange: _onColorModeChange, // Prefix with _ to indicate intentionally unused
  temperature = 0.7,
  maxTokens = 2000,
  streamResponse = true,
  onTemperatureChange,
  onMaxTokensChange,
  onStreamResponseChange,
  disabled = false,
  isCollapsed = false,
  onToggleCollapse,
  onShowDesignSystem: _onShowDesignSystem, // Prefix with _ to indicate intentionally unused
}: AdvancedSettingsPanelProps) {
  const theme = useThemeColors();
  // Design system toggle removed - moved to navigation
  
  // Get options
  const ecosystemOptions = getEcosystemOptions().map(o => ({ value: o.value, label: o.label }));
  const channelGroups = getChannelOptions();
  const channelOptions = channelGroups.flatMap(g => g.channels.map(c => ({ value: c.value, label: c.label })));
  const languageOptions = getLanguageOptions().map(o => ({ value: o.value, label: o.label }));
  const regionOptions = getRegionOptions().map(o => ({ value: o.value, label: o.label }));
  
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
        borderLeft: `1px solid ${theme.stroke.low}`,
      }}
    >
      {/* Header */}
      {(
        <div
          className="px-3 py-3 flex items-center justify-between"
        >
          <Title size="M" as="h2" weight="high" color="high">
            Advanced Settings
          </Title>
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollable-container">
          {/* Chat Settings Section */}
          <Accordion title="Chat Settings" icon={<ChatIcon />} defaultOpen>
            {/* Temperature */}
            <Slider
              label="Temperature"
              value={temperature}
              min={0}
              max={1}
              step={0.1}
              onChange={(value) => onTemperatureChange?.(value)}
              disabled={disabled}
              tooltip="Controls randomness. Low (0) = focused/predictable. High (1) = creative/varied"
            />
            
            {/* Max Tokens */}
            <Slider
              label="Max Tokens"
              value={maxTokens}
              min={100}
              max={4000}
              step={100}
              onChange={(value) => onMaxTokensChange?.(value)}
              disabled={disabled}
              tooltip="Maximum response length in tokens. Higher = longer possible responses"
            />
            
            {/* Stream Response */}
            <Toggle
              label="Stream Response"
              checked={streamResponse}
              onChange={(checked) => onStreamResponseChange?.(checked)}
              disabled={disabled}
              tooltip="Show response word-by-word as it generates, instead of all at once"
            />
          </Accordion>
          
          {/* Voice Settings Section - Merged Voice & TTS with Conversation Settings */}
          <Accordion title="Voice Settings" icon={<VoiceIcon />}>
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
          
          {/* Project Defaults Section */}
          <Accordion title="Project Defaults" icon={<ProjectIcon />}>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-normal flex-shrink-0" style={{ color: theme.text.medium }}>
                  Default Ecosystem
                </label>
                <TooltipIcon tooltip="Pre-selects the product category for new content" />
              </div>
              <div className="max-w-[50%] ml-auto">
                <SearchableDropdown
                  value={defaultEcosystem}
                  onChange={(v) => onDefaultEcosystemChange(v as EcosystemType)}
                  options={ecosystemOptions}
                  placeholder="Select ecosystem"
                  disabled={disabled}
                  compact={true}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-normal flex-shrink-0" style={{ color: theme.text.medium }}>
                  Default Channel
                </label>
                <TooltipIcon tooltip="Pre-selects the content format for new content" />
              </div>
              <div className="max-w-[50%] ml-auto">
                <SearchableDropdown
                  value={defaultChannel}
                  onChange={(v) => onDefaultChannelChange(v as ContentChannelType)}
                  options={channelOptions}
                  placeholder="Select channel"
                  disabled={disabled}
                  compact={true}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-normal flex-shrink-0" style={{ color: theme.text.medium }}>
                  Default Language
                </label>
                <TooltipIcon tooltip="Pre-selects the language for content generation" />
              </div>
              <div className="max-w-[50%] ml-auto">
                <SearchableDropdown
                  value={defaultLanguage}
                  onChange={(v) => onDefaultLanguageChange(v as SupportedLanguage)}
                  options={languageOptions}
                  placeholder="Select language"
                  disabled={disabled}
                  compact={true}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-normal flex-shrink-0" style={{ color: theme.text.medium }}>
                  Default Region
                </label>
                <TooltipIcon tooltip="Pre-selects regional preferences for content" />
              </div>
              <div className="max-w-[50%] ml-auto">
                <SearchableDropdown
                  value={defaultRegion}
                  onChange={(v) => onDefaultRegionChange(v as IndianRegion)}
                  options={regionOptions}
                  placeholder="Select region"
                  disabled={disabled}
                  compact={true}
                />
              </div>
            </div>
          </Accordion>
          
          {/* Trust Settings Section */}
          <Accordion title="Trust Settings" icon={<TrustIcon />}>
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
