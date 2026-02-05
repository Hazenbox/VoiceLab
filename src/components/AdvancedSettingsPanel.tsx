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

import React, { memo, useCallback, useState } from 'react';
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
import { SearchableDropdown } from './SearchableDropdown';
import { useThemeColors } from '../theme';
// Design system context removed - now using single Jio DS
import { getEcosystemOptions, getChannelOptions, getLanguageOptions, getRegionOptions } from '../services/guidelines';
import { TextArea } from '@marcelinodzn/ds-react';

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

// =============================================================================
// Collapsible Section
// =============================================================================

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, icon, children, defaultOpen = false }) => {
  const theme = useThemeColors();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:opacity-80"
        style={{ color: theme.text.high }}
      >
        <div className="flex items-center gap-2">
          <span className="w-4 h-4">{icon}</span>
          <span className="text-xs font-semibold">{title}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};

// Select component removed - replaced with SearchableDropdown

// =============================================================================
// Slider Component (for thresholds)
// =============================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
}) => {
  const theme = useThemeColors();
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          className="text-xs font-medium"
          style={{ color: theme.text.medium }}
        >
          {label}
        </label>
        <span
          className="text-xs font-mono"
          style={{ color: theme.text.medium }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          backgroundColor: theme.stroke.low,
          accentColor: theme.accent,
        }}
      />
    </div>
  );
};

// =============================================================================
// Toggle Component
// =============================================================================

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
}) => {
  const theme = useThemeColors();
  
  return (
    <div className="flex items-center justify-between">
      <label
        className="text-xs font-medium"
        style={{ color: theme.text.medium }}
      >
        {label}
      </label>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`
          w-9 h-5 rounded-full transition-colors relative
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          backgroundColor: checked ? theme.accent : theme.stroke.low,
        }}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`
            absolute top-0.5 w-4 h-4 rounded-full bg-white shadow
            transition-transform
            ${checked ? 'translate-x-4' : 'translate-x-0.5'}
          `}
        />
      </button>
    </div>
  );
};

// =============================================================================
// Icons
// =============================================================================

const VoiceIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2M12 19v3" />
  </svg>
);

const ProjectIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const TrustIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ConversationIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ChatIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
  </svg>
);

// AppearanceIcon removed - no longer needed after removing Appearance section

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
  
  return (
    <aside
      className="h-full flex flex-col overflow-hidden relative"
      style={{
        width: isCollapsed ? '48px' : '320px',
        backgroundColor: theme.background.ghost,
        borderLeft: `1px solid ${theme.stroke.low}`,
        transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1), transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isCollapsed ? 'translateX(0)' : 'translateX(0)',
      }}
    >
      {/* Toggle Button */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className={`
            absolute top-3 z-10 w-8 h-8 rounded-full flex items-center justify-center
            transition-colors hover:opacity-70 cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1
            ${isCollapsed ? 'left-2' : 'right-3'}
          `}
          style={{
            backgroundColor: theme.stroke.low,
            color: theme.text.high,
          }}
          aria-label={isCollapsed ? 'Expand settings panel' : 'Collapse settings panel'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            {isCollapsed ? (
              <>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </>
            ) : (
              <>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </>
            )}
          </svg>
        </button>
      )}
      
      {/* Header */}
      {!isCollapsed && (
        <div
          className="px-3 py-3 border-b flex items-center justify-between"
          style={{ borderColor: theme.stroke.low }}
        >
          <h2
            className="text-sm font-semibold"
            style={{ color: theme.text.high }}
          >
            Advanced Settings
          </h2>
          <button
            onClick={onToggleCollapse}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:opacity-70 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
            style={{
              backgroundColor: theme.stroke.low,
              color: theme.text.high,
            }}
            aria-label="Close settings panel"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Scrollable content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-0">
          {/* Voice Settings Section - Merged Voice & TTS with Conversation Settings */}
          <Section title="Voice Settings" icon={<VoiceIcon />} defaultOpen>
            <VoiceSelector
              value={voiceGender}
              onChange={onVoiceGenderChange}
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
            
            {/* Pace */}
            <LabeledSlider
              label="Pace"
              value={config.persona.pace}
              options={['slow', 'medium', 'fast']}
              onChange={(value) => updatePersona('pace', value as Pace)}
              disabled={disabled}
            />
            
            {/* Response Length */}
            <LabeledSlider
              label="Response Length"
              value={config.maxResponseLength}
              options={['short', 'medium', 'long']}
              onChange={(value) => onConfigChange({ ...config, maxResponseLength: value as ResponseLength })}
              disabled={disabled}
            />
          </Section>
          
          {/* Separator */}
          <div className="py-3">
            <div style={{ borderBottom: `1px solid ${theme.stroke.low}` }} />
          </div>
          
          {/* Chat Settings Section */}
          <Section title="Chat Settings" icon={<ChatIcon />}>
            {/* Temperature */}
            <Slider
              label="Temperature"
              value={temperature}
              min={0}
              max={1}
              step={0.1}
              onChange={(value) => onTemperatureChange?.(value)}
              disabled={disabled}
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
            />
            
            {/* Stream Response */}
            <Toggle
              label="Stream Response"
              checked={streamResponse}
              onChange={(checked) => onStreamResponseChange?.(checked)}
              disabled={disabled}
            />
          </Section>
          
          {/* Separator */}
          <div className="py-3">
            <div style={{ borderBottom: `1px solid ${theme.stroke.low}` }} />
          </div>
          
          {/* Project Defaults Section */}
          <Section title="Project Defaults" icon={<ProjectIcon />}>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: theme.text.medium }}>
                Default Ecosystem
              </label>
              <SearchableDropdown
                value={defaultEcosystem}
                onChange={(v) => onDefaultEcosystemChange(v as EcosystemType)}
                options={ecosystemOptions}
                placeholder="Select ecosystem"
                disabled={disabled}
                compact={true}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: theme.text.medium }}>
                Default Channel
              </label>
              <SearchableDropdown
                value={defaultChannel}
                onChange={(v) => onDefaultChannelChange(v as ContentChannelType)}
                options={channelOptions}
                placeholder="Select channel"
                disabled={disabled}
                compact={true}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: theme.text.medium }}>
                Default Language
              </label>
              <SearchableDropdown
                value={defaultLanguage}
                onChange={(v) => onDefaultLanguageChange(v as SupportedLanguage)}
                options={languageOptions}
                placeholder="Select language"
                disabled={disabled}
                compact={true}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: theme.text.medium }}>
                Default Region
              </label>
              <SearchableDropdown
                value={defaultRegion}
                onChange={(v) => onDefaultRegionChange(v as IndianRegion)}
                options={regionOptions}
                placeholder="Select region"
                disabled={disabled}
                compact={true}
              />
            </div>
          </Section>
          
          {/* Separator */}
          <div className="py-3">
            <div style={{ borderBottom: `1px solid ${theme.stroke.low}` }} />
          </div>
          
          {/* Trust Settings Section */}
          <Section title="Trust Settings" icon={<TrustIcon />}>
            <Slider
              label="Minimum Score"
              value={trustSettings.minimumScore}
              min={70}
              max={100}
              onChange={(value) => updateTrustSetting('minimumScore', value)}
              disabled={disabled}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: theme.text.medium }}>
                Validation Strictness
              </label>
              <SearchableDropdown
                value={trustSettings.validationStrictness}
                onChange={(v) => updateTrustSetting('validationStrictness', v as ValidationStrictness)}
                options={strictnessOptions}
                placeholder="Select strictness"
                disabled={disabled}
                compact={true}
              />
            </div>
            <Toggle
              label="Block Below Threshold"
              checked={trustSettings.blockBelowThreshold}
              onChange={(checked) => updateTrustSetting('blockBelowThreshold', checked)}
              disabled={disabled}
            />
            <Toggle
              label="Auto-fix Minor Issues"
              checked={trustSettings.autoFixMinorIssues}
              onChange={(checked) => updateTrustSetting('autoFixMinorIssues', checked)}
              disabled={disabled}
            />
            <Toggle
              label="Show Detailed Breakdown"
              checked={trustSettings.showDetailedBreakdown}
              onChange={(checked) => updateTrustSetting('showDetailedBreakdown', checked)}
              disabled={disabled}
            />
          </Section>
          
          {/* Appearance Section removed - Theme and Design System moved to navigation */}
        </div>
      )}
    </aside>
  );
});

export default AdvancedSettingsPanel;
