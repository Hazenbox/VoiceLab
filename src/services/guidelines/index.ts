/**
 * Guidelines Module
 * 
 * Content Trust System - Guidelines Data Layer
 * Exports ecosystems, channels, user profiles, emotions, and guardrails.
 * 
 * @module services/guidelines
 */

// Ecosystem Registry
export {
  ECOSYSTEMS,
  getEcosystem,
  detectEcosystem,
  getEcosystemOptions,
  type Ecosystem,
} from './ecosystems';

// Product Detection (for transparency layer)
export {
  JIO_PRODUCTS,
  detectProduct,
  getProduct,
  getProductsByEcosystem,
  type JioProduct,
  type ProductDetectionResult,
} from './ecosystems';

// Channel Registry
export {
  CONTENT_CHANNELS,
  getChannel,
  getChannelsByGroup,
  getChannelGroups,
  getChannelOptions,
  getChannelDefaults,
  type ContentChannel,
  type ChannelGroup,
} from './channels';

// User Profile Engine
export {
  LANGUAGES,
  REGIONS,
  getToneAdjustments,
  getToneInstructions,
  getLanguage,
  getRegion,
  getLanguageOptions,
  getRegionOptions,
  getAgeGroupOptions,
  getLiteracyOptions,
  createDefaultProfile,
  DEFAULT_TONE_ADJUSTMENTS,
  type ToneAdjustments,
  type LanguageConfig,
  type RegionConfig,
} from './userProfile';

// Navarasa Emotion Engine
export {
  NAVARASA_EMOTIONS,
  detectEmotion,
  getEmotion,
  getEmotionInstructions,
  getEmotionOptions,
  isNegativeEmotion,
  isPositiveEmotion,
  type NavarasaEmotion,
} from './navarasa';
