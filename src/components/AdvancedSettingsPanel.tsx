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
} from '../types';
import { DEFAULT_TRUST_SETTINGS } from '../types';
import { VoiceSelector } from './VoiceSelector';
import { useThemeColors } from '../theme';
import { useDesignSystem } from '../context/DesignSystemContext';
import { getEcosystemOptions, getChannelOptions, getLanguageOptions, getRegionOptions } from '../services/guidelines';

// =============================================================================
// Types
// =============================================================================

interface AdvancedSettingsPanelProps {
  // Voice settings
  voiceGender: VoiceGender;
  onVoiceGenderChange: (gender: VoiceGender) => void;
  
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
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: theme.stroke.low }}
    >
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

// =============================================================================
// Select Component (Styled)
// =============================================================================

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: SelectProps<T>) {
  const theme = useThemeColors();
  
  return (
    <div className="space-y-1">
      <label
        className="block text-[10px] font-medium uppercase tracking-wider"
        style={{ color: theme.text.low }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className="w-full px-2 py-1.5 rounded text-xs appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
        style={{
          backgroundColor: theme.background.ghost,
          color: theme.text.high,
          border: `1px solid ${theme.stroke.low}`,
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// =============================================================================
// Slider Component (for thresholds)
// =============================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  onChange,
  disabled = false,
}) => {
  const theme = useThemeColors();
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: theme.text.low }}
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
        className="text-[10px] font-medium uppercase tracking-wider"
        style={{ color: theme.text.low }}
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

const AppearanceIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

// =============================================================================
// Main Component
// =============================================================================

export const AdvancedSettingsPanel = memo(function AdvancedSettingsPanel({
  voiceGender,
  onVoiceGenderChange,
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
  colorMode,
  onColorModeChange,
  disabled = false,
  isCollapsed = false,
  onToggleCollapse,
  onShowDesignSystem,
}: AdvancedSettingsPanelProps) {
  const theme = useThemeColors();
  const { toggleDesignSystem, designSystem } = useDesignSystem();
  
  // Get options
  const ecosystemOptions = getEcosystemOptions().map(o => ({ value: o.value, label: o.label }));
  const channelOptions = getChannelOptions().map(o => ({ value: o.value, label: o.label }));
  const languageOptions = getLanguageOptions().map(o => ({ value: o.value, label: o.label }));
  const regionOptions = getRegionOptions().map(o => ({ value: o.value, label: o.label }));
  
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
      className="h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out relative"
      style={{
        width: isCollapsed ? '48px' : '320px',
        backgroundColor: theme.background.ghost,
        borderLeft: `1px solid ${theme.stroke.low}`,
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
          className="px-3 py-3 border-b"
          style={{ borderColor: theme.stroke.low }}
        >
          <h2
            className="text-sm font-semibold"
            style={{ color: theme.text.high }}
          >
            Advanced Settings
          </h2>
          <p
            className="text-[10px] mt-0.5"
            style={{ color: theme.text.low }}
          >
            Project & trust configuration
          </p>
        </div>
      )}
      
      {/* Scrollable content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Voice & TTS Section */}
          <Section title="Voice & TTS" icon={<VoiceIcon />} defaultOpen>
            <VoiceSelector
              value={voiceGender}
              onChange={onVoiceGenderChange}
              disabled={disabled}
            />
          </Section>
          
          {/* Project Defaults Section */}
          <Section title="Project Defaults" icon={<ProjectIcon />}>
            <Select
              label="Default Ecosystem"
              value={defaultEcosystem}
              options={ecosystemOptions}
              onChange={onDefaultEcosystemChange}
              disabled={disabled}
            />
            <Select
              label="Default Channel"
              value={defaultChannel}
              options={channelOptions}
              onChange={onDefaultChannelChange}
              disabled={disabled}
            />
            <Select
              label="Default Language"
              value={defaultLanguage}
              options={languageOptions}
              onChange={onDefaultLanguageChange}
              disabled={disabled}
            />
            <Select
              label="Default Region"
              value={defaultRegion}
              options={regionOptions}
              onChange={onDefaultRegionChange}
              disabled={disabled}
            />
          </Section>
          
          {/* Trust Settings Section */}
          <Section title="Trust Settings" icon={<TrustIcon />}>
            <Slider
              label="Certification Threshold"
              value={trustSettings.certificationThreshold}
              min={70}
              max={100}
              onChange={(value) => updateTrustSetting('certificationThreshold', value)}
              disabled={disabled}
            />
            <Slider
              label="Blocking Threshold"
              value={trustSettings.blockingThreshold}
              min={50}
              max={90}
              onChange={(value) => updateTrustSetting('blockingThreshold', value)}
              disabled={disabled}
            />
            <Toggle
              label="Block Below Threshold"
              checked={trustSettings.blockBelowThreshold}
              onChange={(checked) => updateTrustSetting('blockBelowThreshold', checked)}
              disabled={disabled}
            />
            <Toggle
              label="Auto-Fix Enabled"
              checked={trustSettings.autoFixEnabled}
              onChange={(checked) => updateTrustSetting('autoFixEnabled', checked)}
              disabled={disabled}
            />
            <Toggle
              label="Show Violations in Chat"
              checked={trustSettings.showViolations}
              onChange={(checked) => updateTrustSetting('showViolations', checked)}
              disabled={disabled}
            />
          </Section>
          
          {/* Appearance Section */}
          <Section title="Appearance" icon={<AppearanceIcon />}>
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: theme.text.low }}
              >
                Theme
              </span>
              <button
                onClick={() => onColorModeChange(colorMode === 'Light' ? 'Dark' : 'Light')}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
                style={{
                  backgroundColor: theme.background.ghost,
                  color: theme.text.medium,
                }}
              >
                {colorMode === 'Light' ? '🌙 Dark' : '☀️ Light'}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{ color: theme.text.low }}
              >
                Design System
              </span>
              <button
                onClick={toggleDesignSystem}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors hover:opacity-80"
                style={{
                  backgroundColor: theme.background.ghost,
                  color: theme.text.medium,
                }}
              >
                {designSystem === 'jio' ? 'Jio DS' : 'Tailwind'}
              </button>
            </div>
            
            {onShowDesignSystem && (
              <button
                onClick={onShowDesignSystem}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  backgroundColor: theme.stroke.low,
                  color: theme.text.medium,
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v9a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                </svg>
                Open Design System Library
              </button>
            )}
          </Section>
        </div>
      )}
    </aside>
  );
});

export default AdvancedSettingsPanel;
