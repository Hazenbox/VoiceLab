/**
 * SettingsModal Component
 * 
 * Modal dialog containing model selection and advanced settings.
 * Opened from the user menu "Settings" option.
 */

import { memo, useCallback } from 'react';
import { useThemeColors } from '../theme';
import { Title, Button, Divider } from '@marcelinodzn/ds-react';
import { DSIcon } from './DSIcon';
import { ModelSelector, type TTSProviderType } from './ModelSelector';
import { VoiceSelector } from './VoiceSelector';
import { LabeledSlider } from './LabeledSlider';
import { Slider } from './Slider';
import { Toggle } from './Toggle';
import { SearchableDropdown } from './SearchableDropdown';
import { TooltipIcon } from './TooltipIcon';
import { TextArea } from '@marcelinodzn/ds-react';
import { Accordion } from './ui/Accordion';
import type { 
  VoiceGender, 
  TrustSettings,
  ValidationStrictness,
  ConversationConfig,
  Pace,
  ResponseLength,
} from '../types';
import type { LLMProviderType } from '../services/providers/llm';

// =============================================================================
// Types
// =============================================================================

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
// Icons
// =============================================================================

const VoiceIcon = () => <DSIcon name="IcMic" size="S" attention="medium" appearance="neutral" />;
const TrustIcon = () => <DSIcon name="IcProtection" size="S" attention="medium" appearance="neutral" />;
const ModelIcon = () => <DSIcon name="IcCode" size="S" attention="medium" appearance="neutral" />;

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
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
        style={{
          backgroundColor: theme.background.ghost,
          border: `1px solid ${theme.stroke.medium}`,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: `1px solid ${theme.stroke.low}` }}
        >
          <Title size="M" as="h2" weight="high" color="high" id="settings-modal-title">
            settings
          </Title>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: theme.text.medium,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.stroke.low}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Close settings"
          >
            <DSIcon name="IcClose" size="S" attention="medium" />
          </button>
        </div>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollable-container">
          {/* Model Selection Section */}
          <Accordion title="Model selection" icon={<ModelIcon />} defaultOpen>
            <div className="py-2">
              <ModelSelector
                value={selectedLLMProvider}
                onChange={onLLMProviderChange}
                ttsValue={selectedTTSProvider}
                onTTSChange={onTTSProviderChange}
                showHealth={false}
                disabled={disabled}
              />
            </div>
          </Accordion>
          
          {/* Voice Settings Section */}
          <Accordion title="Voice settings" icon={<VoiceIcon />}>
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
        </div>
        
        {/* Footer */}
        <div
          className="px-6 py-4 flex justify-end shrink-0"
          style={{ borderTop: `1px solid ${theme.stroke.low}` }}
        >
          <Button
            onPress={onClose}
            appearance="primary"
            size="M"
          >
            done
          </Button>
        </div>
      </div>
    </>
  );
});

export default SettingsModal;
