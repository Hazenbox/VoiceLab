/**
 * Guidelines Module
 * 
 * Content Trust System - Guidelines Data Layer
 * Exports ecosystems, channels, user profiles, emotions, vocabulary, and guardrails.
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

// Vocabulary Library (Training 1.pdf Wording Library)
export {
  CARE_CONNECTION_WORDS,
  ACTION_PROGRESS_WORDS,
  CLARITY_SAFETY_WORDS,
  LEARNING_DISCOVERY_WORDS,
  FIXING_RESOLUTION_WORDS,
  COMMUNITY_FIRST_WORDS,
  ALL_PREFERRED_WORDS,
  GENDER_NEUTRAL_ALTERNATIVES,
  SIMPLE_ALTERNATIVES,
  getVocabularyByCategory,
  isPreferredWord,
  getSimplerAlternative,
  getGenderNeutralAlternative,
} from './vocabulary';

// Words to Avoid (Training 1.pdf)
export {
  COMPLEX_WORDS,
  ROBOTIC_WORDS,
  FEAR_BASED_WORDS,
  BUREAUCRATIC_WORDS,
  TECHNICAL_WORDS,
  SHAME_INDUCING_WORDS,
  ELITIST_WORDS,
  AMERICAN_SPELLINGS,
  ALL_WORDS_TO_AVOID,
  WORD_CATEGORIES,
  shouldAvoidWord,
  getWordCategory,
  scanForAvoidWords,
  type WordCategory,
} from './avoidWords';
