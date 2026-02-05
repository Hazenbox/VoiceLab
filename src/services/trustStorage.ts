/**
 * Trust Storage Service
 * 
 * Handles persistence for the Content Trust System:
 * - Project trust settings
 * - User preferences for trust features
 * - Validation cache for performance
 * 
 * @module services/trustStorage
 */

import type { 
  TrustSettings, 
  TrustScore,
  EcosystemType, 
  ContentChannelType,
  SupportedLanguage,
  IndianRegion,
  UserProfile,
} from '../types';
import { DEFAULT_TRUST_SETTINGS } from '../types';

// =============================================================================
// Storage Keys
// =============================================================================

export const TRUST_STORAGE_KEYS = {
  TRUST_SETTINGS: 'voicelab_trust_settings',
  PROJECT_DEFAULTS: 'voicelab_project_defaults',
  VALIDATION_CACHE: 'voicelab_validation_cache',
  USER_PREFERENCES: 'voicelab_user_preferences',
} as const;

// =============================================================================
// Types
// =============================================================================

/**
 * Project defaults stored in LocalStorage
 */
export interface ProjectDefaults {
  ecosystem: EcosystemType;
  channel: ContentChannelType;
  language: SupportedLanguage;
  region: IndianRegion;
  userProfile?: Partial<UserProfile>;
}

/**
 * User preferences for trust features
 */
export interface TrustUserPreferences {
  showTrustBadges: boolean;
  showViolationHighlights: boolean;
  autoFixOnPaste: boolean;
  validationStrictness: 'strict' | 'balanced' | 'lenient';
  dismissedTips: string[];
}

/**
 * Validation cache entry
 */
export interface ValidationCacheEntry {
  contentHash: string;
  trustScore: TrustScore;
  timestamp: number;
  expiresAt: number;
}

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_PROJECT_DEFAULTS: ProjectDefaults = {
  ecosystem: 'connectivity',
  channel: 'push_notification',
  language: 'english',
  region: 'pan_india',
};

export const DEFAULT_USER_PREFERENCES: TrustUserPreferences = {
  showTrustBadges: true,
  showViolationHighlights: true,
  autoFixOnPaste: false,
  validationStrictness: 'balanced',
  dismissedTips: [],
};

// Cache duration: 1 hour
const CACHE_DURATION_MS = 60 * 60 * 1000;

// =============================================================================
// Trust Settings Storage
// =============================================================================

export const storageTrustSettings = {
  /**
   * Get trust settings, merging with defaults
   */
  get: (): TrustSettings => {
    try {
      const data = localStorage.getItem(TRUST_STORAGE_KEYS.TRUST_SETTINGS);
      if (data) {
        return { ...DEFAULT_TRUST_SETTINGS, ...JSON.parse(data) };
      }
      return { ...DEFAULT_TRUST_SETTINGS };
    } catch (error) {
      console.error('Error reading trust settings:', error);
      return { ...DEFAULT_TRUST_SETTINGS };
    }
  },
  
  /**
   * Save trust settings
   */
  save: (settings: TrustSettings): void => {
    try {
      localStorage.setItem(
        TRUST_STORAGE_KEYS.TRUST_SETTINGS,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error('Error saving trust settings:', error);
      throw error;
    }
  },
  
  /**
   * Update specific trust setting
   */
  update: <K extends keyof TrustSettings>(key: K, value: TrustSettings[K]): void => {
    const settings = storageTrustSettings.get();
    settings[key] = value;
    storageTrustSettings.save(settings);
  },
  
  /**
   * Reset to defaults
   */
  reset: (): void => {
    localStorage.removeItem(TRUST_STORAGE_KEYS.TRUST_SETTINGS);
  },
};

// =============================================================================
// Project Defaults Storage
// =============================================================================

export const storageProjectDefaults = {
  /**
   * Get project defaults, merging with defaults
   */
  get: (): ProjectDefaults => {
    try {
      const data = localStorage.getItem(TRUST_STORAGE_KEYS.PROJECT_DEFAULTS);
      if (data) {
        return { ...DEFAULT_PROJECT_DEFAULTS, ...JSON.parse(data) };
      }
      return { ...DEFAULT_PROJECT_DEFAULTS };
    } catch (error) {
      console.error('Error reading project defaults:', error);
      return { ...DEFAULT_PROJECT_DEFAULTS };
    }
  },
  
  /**
   * Save project defaults
   */
  save: (defaults: ProjectDefaults): void => {
    try {
      localStorage.setItem(
        TRUST_STORAGE_KEYS.PROJECT_DEFAULTS,
        JSON.stringify(defaults)
      );
    } catch (error) {
      console.error('Error saving project defaults:', error);
      throw error;
    }
  },
  
  /**
   * Update specific default
   */
  update: <K extends keyof ProjectDefaults>(key: K, value: ProjectDefaults[K]): void => {
    const defaults = storageProjectDefaults.get();
    defaults[key] = value;
    storageProjectDefaults.save(defaults);
  },
  
  /**
   * Reset to defaults
   */
  reset: (): void => {
    localStorage.removeItem(TRUST_STORAGE_KEYS.PROJECT_DEFAULTS);
  },
};

// =============================================================================
// User Preferences Storage
// =============================================================================

export const storageUserPreferences = {
  /**
   * Get user preferences, merging with defaults
   */
  get: (): TrustUserPreferences => {
    try {
      const data = localStorage.getItem(TRUST_STORAGE_KEYS.USER_PREFERENCES);
      if (data) {
        return { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(data) };
      }
      return { ...DEFAULT_USER_PREFERENCES };
    } catch (error) {
      console.error('Error reading user preferences:', error);
      return { ...DEFAULT_USER_PREFERENCES };
    }
  },
  
  /**
   * Save user preferences
   */
  save: (preferences: TrustUserPreferences): void => {
    try {
      localStorage.setItem(
        TRUST_STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw error;
    }
  },
  
  /**
   * Update specific preference
   */
  update: <K extends keyof TrustUserPreferences>(key: K, value: TrustUserPreferences[K]): void => {
    const preferences = storageUserPreferences.get();
    preferences[key] = value;
    storageUserPreferences.save(preferences);
  },
  
  /**
   * Dismiss a tip
   */
  dismissTip: (tipId: string): void => {
    const preferences = storageUserPreferences.get();
    if (!preferences.dismissedTips.includes(tipId)) {
      preferences.dismissedTips.push(tipId);
      storageUserPreferences.save(preferences);
    }
  },
  
  /**
   * Reset to defaults
   */
  reset: (): void => {
    localStorage.removeItem(TRUST_STORAGE_KEYS.USER_PREFERENCES);
  },
};

// =============================================================================
// Validation Cache Storage
// =============================================================================

/**
 * Simple hash function for content
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

export const storageValidationCache = {
  /**
   * Get all cache entries
   */
  getAll: (): ValidationCacheEntry[] => {
    try {
      const data = localStorage.getItem(TRUST_STORAGE_KEYS.VALIDATION_CACHE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading validation cache:', error);
      return [];
    }
  },
  
  /**
   * Get cached validation for content
   */
  get: (content: string): TrustScore | null => {
    const hash = hashContent(content);
    const entries = storageValidationCache.getAll();
    const entry = entries.find(e => e.contentHash === hash);
    
    if (entry && entry.expiresAt > Date.now()) {
      return entry.trustScore;
    }
    
    return null;
  },
  
  /**
   * Cache validation result
   */
  set: (content: string, trustScore: TrustScore): void => {
    try {
      const hash = hashContent(content);
      const entries = storageValidationCache.getAll();
      
      // Remove existing entry for same content
      const filtered = entries.filter(e => e.contentHash !== hash);
      
      // Add new entry
      const newEntry: ValidationCacheEntry = {
        contentHash: hash,
        trustScore,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION_MS,
      };
      
      filtered.push(newEntry);
      
      // Keep only last 100 entries
      const trimmed = filtered.slice(-100);
      
      localStorage.setItem(
        TRUST_STORAGE_KEYS.VALIDATION_CACHE,
        JSON.stringify(trimmed)
      );
    } catch (error) {
      console.error('Error saving validation cache:', error);
      // Don't throw - caching is non-critical
    }
  },
  
  /**
   * Clear expired entries
   */
  cleanup: (): void => {
    try {
      const entries = storageValidationCache.getAll();
      const now = Date.now();
      const valid = entries.filter(e => e.expiresAt > now);
      
      localStorage.setItem(
        TRUST_STORAGE_KEYS.VALIDATION_CACHE,
        JSON.stringify(valid)
      );
    } catch (error) {
      console.error('Error cleaning validation cache:', error);
    }
  },
  
  /**
   * Clear all cache
   */
  clear: (): void => {
    localStorage.removeItem(TRUST_STORAGE_KEYS.VALIDATION_CACHE);
  },
};

// =============================================================================
// Migration Helper
// =============================================================================

/**
 * Migrate old project settings to new format
 */
export function migrateProjectSettings(project: {
  channel?: string;
  platform?: string;
  defaultEcosystem?: EcosystemType;
  defaultChannel?: ContentChannelType;
}): {
  ecosystem: EcosystemType;
  channel: ContentChannelType;
} {
  // If already has new format, use it
  if (project.defaultEcosystem && project.defaultChannel) {
    return {
      ecosystem: project.defaultEcosystem,
      channel: project.defaultChannel,
    };
  }
  
  // Migrate from old format
  const defaults = storageProjectDefaults.get();
  
  // Map old platform to ecosystem (best effort)
  let ecosystem: EcosystemType = defaults.ecosystem;
  if (project.platform === 'notifications' || project.platform === 'banner') {
    ecosystem = 'connectivity';
  } else if (project.platform === 'ads') {
    ecosystem = 'entertainment';
  }
  
  // Map old channel to new channel (best effort)
  let channel: ContentChannelType = defaults.channel;
  if (project.channel === 'sms') {
    channel = 'sms';
  } else if (project.channel === 'whatsapp') {
    channel = 'whatsapp_alert';
  } else if (project.channel === 'email') {
    channel = 'marketing_email';
  }
  
  return { ecosystem, channel };
}

export default {
  trustSettings: storageTrustSettings,
  projectDefaults: storageProjectDefaults,
  userPreferences: storageUserPreferences,
  validationCache: storageValidationCache,
  migrateProjectSettings,
};
