/**
 * Validation Agents Module
 * 
 * Post-generation validation agents for Constitutional AI compliance.
 * 
 * @module services/validation/agents
 */

// Voice Traits Agent
export {
  validateVoiceTraits,
  hasTraitViolations,
  getTraitSuggestions,
  type VoiceTraitValidation,
  type VoiceTraitsResult,
} from './voiceTraitsAgent';

// Emotion Response Agent
export {
  validateEmotionResponse,
  respectsEmotionalContext,
  getEmotionSuggestions,
  type EmotionValidation,
} from './emotionResponseAgent';

// Pattern Block Agent
export {
  validatePatternBlocks,
  hasBasicStructure,
  getPatternTemplate,
  suggestBlocks,
  type PatternBlockValidation,
  type PatternValidationResult,
} from './patternBlockAgent';

// Handoff Trigger Agent
export {
  detectHandoffTriggers,
  mightNeedHandoff,
  getHandoffMessage,
  type HandoffTrigger,
  type HandoffResult,
  type HandoffReason,
} from './handoffTriggerAgent';

// Consolidated Agents
export {
  validateSafetyPrivacy,
  validateInclusivity,
  validateBrandStyle,
  validateCommerce,
  runConsolidatedValidation,
  type AgentValidation,
  type ConsolidatedValidation,
} from './consolidatedAgents';

// Self-Check Agent
export {
  runSelfCheck,
  hasCriticalFailures,
  getSelfCheckSummary,
  type SelfCheckQuestion,
  type SelfCheckResult,
  type SelfCheckContext,
} from './selfCheckAgent';
