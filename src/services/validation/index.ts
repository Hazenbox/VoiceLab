/**
 * Validation Services
 * 
 * Exports all validation functionality for the Content Trust System.
 * 
 * @module services/validation
 */

// Types
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

// Agents
export {
  VALIDATION_AGENTS,
  getValidationAgent,
  getAllValidationAgents,
  getEnabledAgents,
  genderNeutralityAgent,
  elitismAgent,
  culturalSensitivityAgent,
  disabilityInclusionAgent,
  complianceAgent,
  styleGrammarAgent,
  accessibilityAgent,
  calculateReadingLevel,
} from './agents';

// Pipeline
export {
  runValidationPipeline,
  runQuickValidation,
  validateAspect,
  getViolationSummary,
  getViolationsByAgent,
} from './validationPipeline';
