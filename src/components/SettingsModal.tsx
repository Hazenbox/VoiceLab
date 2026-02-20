/**
 * SettingsModal Component
 * 
 * Modal dialog containing model selection and advanced settings.
 * Opened from the user menu "Settings" option.
 * 
 * Redesigned with sidebar navigation layout.
 */

import { memo, useCallback, useState, useMemo } from 'react';
import { useThemeColors } from '../theme';
import { Title, Text } from '@marcelinodzn/ds-react';
import { DSIcon } from './DSIcon';
import { ActionButton } from './ActionButton';
import { type TTSProviderType } from './ModelSelector';
import { VoiceSelector } from './VoiceSelector';
import { LabeledSlider } from './LabeledSlider';
import { Slider } from './Slider';
import { Toggle } from './Toggle';
import { SearchableDropdown } from './SearchableDropdown';
import { TooltipIcon } from './TooltipIcon';
import { TextArea } from '@marcelinodzn/ds-react';
import SearchableCombobox, { type ComboboxOption } from './SearchableCombobox';
import { getAvailableLLMProviders, type LLMProviderType } from '../services/providers/llm';
import type { 
  VoiceGender, 
  TrustSettings,
  ValidationStrictness,
  ConversationConfig,
  Pace,
  ResponseLength,
} from '../types';

// TTS Provider display names
const TTS_PROVIDERS: { type: TTSProviderType; displayName: string }[] = [
  { type: 'dashscope', displayName: 'Alibaba DashScope' },
  { type: 'gemini', displayName: 'Google Gemini' },
  { type: 'elevenlabs', displayName: 'ElevenLabs' },
];

// =============================================================================
// Types
// =============================================================================

type SettingsSection = 'model' | 'voice' | 'trust';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Model selection
  selectedLLMProvider: LLMProviderType;
  onLLMProviderChange: (provider: LLMProviderType) => void;
  selectedTTSProvider?: TTSProviderType;
  onTTSProviderChange?: (provider: TTSProviderType) => void;
  
  // Voice settings
  voiceGender: VoiceGender;
  onVoiceGenderChange: (gender: VoiceGender) => void;
  
  // Conversation config
  config: ConversationConfig;
  onConfigChange: (config: ConversationConfig) => void;
  
  // Trust settings
  trustSettings: TrustSettings;
  onTrustSettingsChange: (settings: TrustSettings) => void;
  
  // Disabled state
  disabled?: boolean;
}

// =============================================================================
// Sidebar Nav Item (compact version)
// =============================================================================

interface SettingsNavItemProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const SettingsNavItem = memo(function SettingsNavItem({
  label,
  isActive,
  onClick,
}: SettingsNavItemProps) {
  const theme = useThemeColors();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '0 8px',
        height: '32px',
        borderRadius: '6px',
        backgroundColor: isActive ? theme.stroke.low : (isHovered ? theme.stroke.low : 'transparent'),
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Text size="S" weight="low">
        {label}
      </Text>
    </button>
  );
});

// =============================================================================
// Component
// =============================================================================

export const SettingsModal = memo(function SettingsModal({
  isOpen,
  onClose,
  selectedLLMProvider,
  onLLMProviderChange,
  selectedTTSProvider,
  onTTSProviderChange,
  voiceGender,
  onVoiceGenderChange,
  config,
  onConfigChange,
  trustSettings,
  onTrustSettingsChange,
  disabled = false,
}: SettingsModalProps) {
  const theme = useThemeColors();
  const [activeSection, setActiveSection] = useState<SettingsSection>('model');
  
  // LLM provider options for SearchableCombobox
  const llmOptions: ComboboxOption[] = useMemo(() => {
    return getAvailableLLMProviders()
      .filter(p => p.type !== 'openai' && p.type !== 'claude' && p.isConfigured)
      .map(p => ({
        id: p.type,
        label: p.displayName,
        searchableText: `${p.displayName} ${p.type}`,
      }));
  }, []);
  
  // TTS provider options for SearchableCombobox
  const ttsOptions: ComboboxOption[] = useMemo(() => {
    return TTS_PROVIDERS.map(p => ({
      id: p.type,
      label: p.displayName,
      searchableText: `${p.displayName} ${p.type}`,
    }));
  }, []);
  
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
  
  if (!isOpen) return null;

  // Section titles
  const sectionTitles: Record<SettingsSection, string> = {
    model: 'Model Selection',
    voice: 'Voice Settings',
    trust: 'Trust Settings',
  };
  
  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        style={{
          position: 'fixed',
          zIndex: 9999,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '650px',
          maxWidth: '95vw',
          height: '500px',
          maxHeight: '85vh',
          backgroundColor: theme.background.ghost,
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Title size="L" as="h2" weight="high" color="high" id="settings-modal-title">
            Settings
          </Title>
          <ActionButton
            icon={<DSIcon name="IcClose" size="S" style={{ color: theme.text.medium }} />}
            label="Close"
            onClick={onClose}
            size={36}
            tooltipDelay={999999}
          />
        </div>
        
        {/* Body - Sidebar + Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div
            style={{
              width: '180px',
              flexShrink: 0,
              padding: '1rem 0.75rem',
              borderRight: `1px solid ${theme.stroke.low}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <SettingsNavItem
              label="Model selection"
              isActive={activeSection === 'model'}
              onClick={() => setActiveSection('model')}
            />
            <SettingsNavItem
              label="Voice settings"
              isActive={activeSection === 'voice'}
              onClick={() => setActiveSection('voice')}
            />
            <SettingsNavItem
              label="Trust settings"
              isActive={activeSection === 'trust'}
              onClick={() => setActiveSection('trust')}
            />
          </div>
          
          {/* Content Area */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '1rem',
            }}
            className="scrollable-container"
          >
            {/* Section Title */}
            <div style={{ marginBottom: '1.5rem' }}>
              <Title size="M" as="h3" weight="high" color="high">
                {sectionTitles[activeSection]}
              </Title>
            </div>
            
            {/* Model Selection Content */}
            {activeSection === 'model' && (
              <div className="space-y-4">
                <SearchableCombobox
                  label="Chat model"
                  placeholder="Select chat model..."
                  options={llmOptions}
                  value={selectedLLMProvider}
                  onChange={(value) => onLLMProviderChange(value as LLMProviderType)}
                />
                {selectedTTSProvider !== undefined && onTTSProviderChange && (
                  <SearchableCombobox
                    label="Voice model"
                    placeholder="Select voice model..."
                    options={ttsOptions}
                    value={selectedTTSProvider}
                    onChange={(value) => onTTSProviderChange(value as TTSProviderType)}
                  />
                )}
              </div>
            )}
            
            {/* Voice Settings Content */}
            {activeSection === 'voice' && (
              <div className="space-y-4">
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
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        lineHeight: 1.3,
                        fontWeight: 500,
                        color: theme.text.high,
                      }}
                    >
                      Greeting
                    </label>
                    <TooltipIcon tooltip="The first message the AI says when starting a conversation" />
                  </div>
                  <div className="scaled-textarea-wrapper-modal">
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
                      .scaled-textarea-wrapper-modal > div > div > div {
                        gap: 16px !important;
                        justify-content: center !important;
                        align-items: flex-start !important;
                        padding: 8px !important;
                        width: 100% !important;
                      }
                      .scaled-textarea-wrapper-modal textarea {
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
                  label="Response length"
                  value={config.maxResponseLength}
                  options={['short', 'medium', 'long']}
                  onChange={(value) => onConfigChange({ ...config, maxResponseLength: value as ResponseLength })}
                  disabled={disabled}
                  tooltip="How long AI responses should be. Short (30 words), Medium (50), Long (100)"
                />
              </div>
            )}
            
            {/* Trust Settings Content */}
            {activeSection === 'trust' && (
              <div className="space-y-4">
                <Slider
                  label="Minimum score"
                  value={trustSettings.minimumScore}
                  min={70}
                  max={100}
                  onChange={(value) => updateTrustSetting('minimumScore', value)}
                  disabled={disabled}
                  tooltip="Content below this trust score gets flagged for review"
                />
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <label 
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        lineHeight: 1.3,
                        fontWeight: 500,
                        color: theme.text.high,
                        flexShrink: 0,
                      }}
                    >
                      Validation strictness
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
                  label="Block below threshold"
                  checked={trustSettings.blockBelowThreshold}
                  onChange={(checked) => updateTrustSetting('blockBelowThreshold', checked)}
                  disabled={disabled}
                  tooltip="Reject content that scores below minimum instead of just flagging"
                />
                <Toggle
                  label="Auto-fix minor issues"
                  checked={trustSettings.autoFixMinorIssues}
                  onChange={(checked) => updateTrustSetting('autoFixMinorIssues', checked)}
                  disabled={disabled}
                  tooltip="Automatically fix small issues like punctuation and capitalization"
                />
                <Toggle
                  label="Show detailed breakdown"
                  checked={trustSettings.showDetailedBreakdown}
                  onChange={(checked) => updateTrustSetting('showDetailedBreakdown', checked)}
                  disabled={disabled}
                  tooltip="Show individual scores from each validation agent"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

export default SettingsModal;
