/**
 * Tokens Module
 * 
 * Token classification and directive loading for Constitutional AI.
 * Includes comprehensive token types from Tokens v2 specification.
 * 
 * @module services/tokens
 */

// Token Types (Tokens v2 Specification)
export {
  type RouteMode,
  type RouteConfidence,
  type RouteTrigger,
  type SafetyDomain,
  type SafetyLevel,
  type AdvisoryBoundary,
  type NudgePermission,
  type NudgeRelevance,
  type NudgeSensitivityOverride,
  type UserIntent,
  type UserGoal,
  type ContextTime,
  type ContextEvent,
  type ContextSession,
  type ContextUrgency,
  type ContextJourneyStage,
  type NavarasaEmotion,
  type EmotionIntensity,
  type EmotionIntensityNumeric,
  type EmotionTarget,
  type ProfileSegment,
  type ProfilePlan,
  type ProfileRelationshipStage,
  type RegionLocale,
  type RegionConnectivityProfile,
  type ConversationState,
  type ResolutionStatus,
  type Persona,
  type Ecosystem,
  type Channel,
  type Pattern,
  type PatternSequence,
  type RiskCategory,
  type Signature,
  type SmallJoy,
  type ActiveTokens,
  type SessionMemory,
  type MidTermMemory,
  TOKEN_GROUPS,
  ALL_TOKEN_KEYS,
  TOKEN_COUNTS,
  TOTAL_TOKEN_COUNT,
} from './tokenTypes';

// Token Serializer
export {
  serializeTokensToPromptBlock,
  serializeTokensCompact,
  serializeTokensToObject,
  getTokensByGroup,
  countActiveTokens,
  generateTokenSignature,
  mergeTokens,
  validateTokens,
  parseCompactTokens,
} from './tokenSerializer';

// Token Rules
export {
  TOKEN_RULES,
  getTokenRule,
  getActiveTokenRules,
  getTokenRulesSection,
  getCriticalRules,
  getTurnCountGuidance,
} from './tokenRules';

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

// Token Gate - Pre-generation blocking
export {
  checkTokenGate,
  formatGateDecision,
  hasBlockingTokens,
  DEFAULT_GATE_RULES,
  type GateDecision,
  type GateRule,
} from './tokenGate';
