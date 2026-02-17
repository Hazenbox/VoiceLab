/**
 * Validation Services
 */

export type {
  ValidationAgentId,
  ValidationViolation,
  PatternRule,
  AgentValidationResult,
  PipelineValidationResult,
  ValidationConfig,
  ValidationAgent,
} from './types';

export {
  DEFAULT_VALIDATION_CONFIG,
  AGENT_WEIGHTS,
} from './types';

export {
  VALIDATION_AGENTS,
  getValidationAgent,
  getAllValidationAgents,
  getEnabledAgents,
} from './agents';

export {
  runValidationPipeline,
  runQuickValidation,
  getViolationSummary,
} from './validationPipeline';

// Dynamic avoid words support (for Convex integration)
export {
  setDynamicAvoidWords,
  clearDynamicAvoidWords,
} from './agents/avoidWordsAgent';

// Token Enforcement Agent
export {
  createTokenEnforcementAgent,
} from './tokenEnforcementAgent';

export type {
  TokenEnforcementRule,
  ActiveTokens,
  TokenEnforcementContext,
} from './tokenEnforcementAgent';
