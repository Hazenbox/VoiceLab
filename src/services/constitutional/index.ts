/**
 * Constitutional Module
 * 
 * Core rules and governance for the Jio Conversational AI.
 * 
 * @module services/constitutional
 */

export {
  // Authority & Governance
  AUTHORITY_ORDER,
  type AuthorityLevel,
  
  // Voice Traits
  VOICE_TRAITS,
  type VoiceTrait,
  
  // Emotions
  NAVARASA,
  type NavarasaEmotion,
  
  // Safety
  SAFETY_DOMAINS,
  type SafetyDomain,
  type SafetyLevel,
  type AdvisoryBoundary,
  
  // Patterns
  PATTERN_BLOCKS,
  type PatternBlock,
  
  // Limits
  HARD_LIMITS,
  
  // Tone
  WARMTH_SCALE,
  DETAIL_SCALE,
  RISK_TONE_OVERRIDES,
  
  // Intents
  INTENT_TYPES,
  type IntentType,
  
  // Token Order
  JIO_MESSAGE_FRAME_ORDER,
  
  // Helper Functions
  getSafetyLevel,
  getAdvisoryBoundary,
  isValidEmotionTransition,
  getForbiddenToneShifts,
  checkVoiceTraitViolations,
  getMaxWarmthForRisk,
  isNudgingAllowed,
  validateAuthorityOrder,
} from './coreRules';
