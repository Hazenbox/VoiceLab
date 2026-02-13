/**
 * Tokens Module
 * 
 * Token classification and directive loading for Constitutional AI.
 * 
 * @module services/tokens
 */

// Token Classifier
export {
  classifyTokens,
  getTokenSummary,
  type TokenClassification,
  type ClassificationInput,
  type UserProfile,
  type Language,
  type Script,
  type LanguageMixLevel,
  type LiteracyLevel,
  type PersonaType,
  type ToneGuardrail,
  type ContextType,
  type StructureType,
  type RiskLevel,
} from './tokenClassifier';

// Selective Loader
export {
  loadDirectives,
  buildDirectivesPrompt,
  getDirectiveSummary,
  type LoadedDirectives,
} from './selectiveLoader';

// Token Estimation
export {
  estimateTokens,
  estimateConversationTokens,
  estimateRequestTokens,
  getContextLimit,
  calculateAvailableTokens,
  calculateMessagesToKeep,
  truncateConversationHistory,
  suggestOptimalConfig,
  TOKEN_LIMITS,
  ESTIMATION_CONFIG,
  type TokenEstimate,
  type EstimationInput,
  type ModelType,
} from './tokenEstimator';
