/**
 * Trust Settings Hook (Phase 4.1)
 * 
 * Extracts Content Trust System configuration from App.tsx.
 * Manages ecosystem, channel, language, region, and validation settings.
 * 
 * @module hooks/useTrustSettings
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { 
  EcosystemType, 
  ContentChannelType, 
  SupportedLanguage, 
  RegionType,
  ValidationStrictness,
  TrustSettings as BaseTrustSettings,
} from '../types';
import { logger } from '../utils/logger';

// =============================================================================
// Types
// =============================================================================

export interface TrustSettings extends BaseTrustSettings {
  // Content context
  ecosystem: EcosystemType;
  channel: ContentChannelType;
  language: SupportedLanguage;
  region: RegionType;
  
  // Validation settings
  validationStrictness: ValidationStrictness;
  enableValidation: boolean;
  enableAutoFix: boolean;
  showValidationPanel: boolean;
  
  // Generation settings
  conversationalMode: boolean;
  enableKnowledgeRetrieval: boolean;
  enablePersonalization: boolean;
}

export interface UseTrustSettingsOptions {
  /** Storage key for persistence */
  storageKey?: string;
  /** Project-level defaults */
  projectDefaults?: {
    ecosystem?: EcosystemType;
    channel?: ContentChannelType;
    language?: SupportedLanguage;
    region?: RegionType;
  };
  /** Callback when settings change */
  onChange?: (settings: TrustSettings) => void;
}

export interface UseTrustSettingsReturn {
  settings: TrustSettings;
  
  // Setters for individual fields
  setEcosystem: (ecosystem: EcosystemType) => void;
  setChannel: (channel: ContentChannelType) => void;
  setLanguage: (language: SupportedLanguage) => void;
  setRegion: (region: RegionType) => void;
  setValidationStrictness: (strictness: ValidationStrictness) => void;
  setEnableValidation: (enabled: boolean) => void;
  setEnableAutoFix: (enabled: boolean) => void;
  setShowValidationPanel: (show: boolean) => void;
  setConversationalMode: (enabled: boolean) => void;
  
  // Bulk update
  updateSettings: (updates: Partial<TrustSettings>) => void;
  
  // Reset to defaults
  resetSettings: () => void;
  
  // Computed values
  isConfigured: boolean;
  validationEnabled: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY_PREFIX = 'voiceDesigner_trust_';

const DEFAULT_SETTINGS: TrustSettings = {
  ecosystem: 'jio_mobility',
  channel: 'customer_care_chat',
  language: 'en',
  region: 'north',
  validationStrictness: 'standard',
  enableValidation: true,
  enableAutoFix: true,
  showValidationPanel: true,
  conversationalMode: true,
  enableKnowledgeRetrieval: true,
  enablePersonalization: true,
};

// =============================================================================
// Storage Helpers
// =============================================================================

function loadFromStorage(key: string): Partial<TrustSettings> | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${key}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.warn('[TrustSettings] Failed to load from storage', e);
  }
  return null;
}

function saveToStorage(key: string, settings: TrustSettings): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${key}`, JSON.stringify(settings));
  } catch (e) {
    logger.warn('[TrustSettings] Failed to save to storage', e);
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useTrustSettings(options: UseTrustSettingsOptions = {}): UseTrustSettingsReturn {
  const { storageKey = 'default', projectDefaults, onChange } = options;
  
  // Initialize state from storage, project defaults, or default values
  const [settings, setSettings] = useState<TrustSettings>(() => {
    const stored = loadFromStorage(storageKey);
    
    return {
      ...DEFAULT_SETTINGS,
      ...projectDefaults,
      ...stored,
    };
  });
  
  // Save to storage when settings change
  useEffect(() => {
    saveToStorage(storageKey, settings);
    onChange?.(settings);
  }, [settings, storageKey, onChange]);
  
  // Individual setters
  const setEcosystem = useCallback((ecosystem: EcosystemType) => {
    setSettings(prev => ({ ...prev, ecosystem }));
    logger.debug('[TrustSettings] Ecosystem changed', { ecosystem });
  }, []);
  
  const setChannel = useCallback((channel: ContentChannelType) => {
    setSettings(prev => ({ ...prev, channel }));
    logger.debug('[TrustSettings] Channel changed', { channel });
  }, []);
  
  const setLanguage = useCallback((language: SupportedLanguage) => {
    setSettings(prev => ({ ...prev, language }));
    logger.debug('[TrustSettings] Language changed', { language });
  }, []);
  
  const setRegion = useCallback((region: RegionType) => {
    setSettings(prev => ({ ...prev, region }));
    logger.debug('[TrustSettings] Region changed', { region });
  }, []);
  
  const setValidationStrictness = useCallback((validationStrictness: ValidationStrictness) => {
    setSettings(prev => ({ ...prev, validationStrictness }));
    logger.debug('[TrustSettings] Strictness changed', { validationStrictness });
  }, []);
  
  const setEnableValidation = useCallback((enableValidation: boolean) => {
    setSettings(prev => ({ ...prev, enableValidation }));
    logger.debug('[TrustSettings] Validation enabled', { enableValidation });
  }, []);
  
  const setEnableAutoFix = useCallback((enableAutoFix: boolean) => {
    setSettings(prev => ({ ...prev, enableAutoFix }));
    logger.debug('[TrustSettings] Auto-fix enabled', { enableAutoFix });
  }, []);
  
  const setShowValidationPanel = useCallback((showValidationPanel: boolean) => {
    setSettings(prev => ({ ...prev, showValidationPanel }));
  }, []);
  
  const setConversationalMode = useCallback((conversationalMode: boolean) => {
    setSettings(prev => ({ ...prev, conversationalMode }));
    logger.debug('[TrustSettings] Conversational mode', { conversationalMode });
  }, []);
  
  // Bulk update
  const updateSettings = useCallback((updates: Partial<TrustSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    logger.debug('[TrustSettings] Bulk update', { fields: Object.keys(updates) });
  }, []);
  
  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings({
      ...DEFAULT_SETTINGS,
      ...projectDefaults,
    });
    logger.info('[TrustSettings] Reset to defaults');
  }, [projectDefaults]);
  
  // Computed values
  const isConfigured = useMemo(() => {
    return Boolean(settings.ecosystem && settings.channel);
  }, [settings.ecosystem, settings.channel]);
  
  const validationEnabled = useMemo(() => {
    return settings.enableValidation && settings.validationStrictness !== 'off';
  }, [settings.enableValidation, settings.validationStrictness]);
  
  return {
    settings,
    setEcosystem,
    setChannel,
    setLanguage,
    setRegion,
    setValidationStrictness,
    setEnableValidation,
    setEnableAutoFix,
    setShowValidationPanel,
    setConversationalMode,
    updateSettings,
    resetSettings,
    isConfigured,
    validationEnabled,
  };
}

// =============================================================================
// Utility: Get channel constraints
// =============================================================================

export function getChannelConstraints(channel: ContentChannelType): {
  maxLength: number;
  allowsEmoji: boolean;
  allowsFormatting: boolean;
} {
  const constraints: Record<ContentChannelType, { maxLength: number; allowsEmoji: boolean; allowsFormatting: boolean }> = {
    push_notification: { maxLength: 50, allowsEmoji: false, allowsFormatting: false },
    sms: { maxLength: 160, allowsEmoji: false, allowsFormatting: false },
    whatsapp_alert: { maxLength: 500, allowsEmoji: true, allowsFormatting: true },
    customer_care_chat: { maxLength: 1000, allowsEmoji: true, allowsFormatting: true },
    whatsapp_support: { maxLength: 800, allowsEmoji: true, allowsFormatting: true },
    chatbot_faq: { maxLength: 600, allowsEmoji: true, allowsFormatting: true },
    ivr_voice_menu: { maxLength: 200, allowsEmoji: false, allowsFormatting: false },
    voice_assistant: { maxLength: 150, allowsEmoji: false, allowsFormatting: false },
    voice_prompts: { maxLength: 50, allowsEmoji: false, allowsFormatting: false },
    marketing_email: { maxLength: 2000, allowsEmoji: true, allowsFormatting: true },
    transactional_email: { maxLength: 3000, allowsEmoji: false, allowsFormatting: true },
    social_media_post: { maxLength: 280, allowsEmoji: true, allowsFormatting: true },
    digital_ads: { maxLength: 90, allowsEmoji: false, allowsFormatting: false },
    tv_video_ad: { maxLength: 100, allowsEmoji: false, allowsFormatting: false },
    app_notification: { maxLength: 100, allowsEmoji: true, allowsFormatting: false },
    onboarding_screen: { maxLength: 200, allowsEmoji: true, allowsFormatting: true },
    internal_announcement: { maxLength: 1500, allowsEmoji: false, allowsFormatting: true },
    training_module: { maxLength: 2000, allowsEmoji: true, allowsFormatting: true },
  };
  
  return constraints[channel] || constraints.customer_care_chat;
}
