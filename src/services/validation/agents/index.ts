/**
 * Validation Agents Module
 * 
 * Post-generation validation agents for Constitutional AI compliance.
 * 
 * @module services/validation/agents
 */

import type { ValidationAgentId, ValidationAgent } from '../types';
import { ALL_AGENTS } from './allAgents';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION AGENTS REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All validation agents available in the pipeline
 */
export const VALIDATION_AGENTS: Record<ValidationAgentId, ValidationAgent> = ALL_AGENTS;

/**
 * Get a specific validation agent by ID
 */
export function getValidationAgent(agentId: ValidationAgentId): ValidationAgent | undefined {
  return VALIDATION_AGENTS[agentId];
}

/**
 * Get all validation agents as an array
 */
export function getAllValidationAgents(): ValidationAgent[] {
  return Object.values(VALIDATION_AGENTS);
}

/**
 * Get enabled agents filtered by IDs
 */
export function getEnabledAgents(agentIds: ValidationAgentId[]): ValidationAgent[] {
  return agentIds
    .map(id => VALIDATION_AGENTS[id])
    .filter((agent): agent is ValidationAgent => agent !== undefined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Forbidden Phrase Checker (used by constitutionalWrapper)
export {
  checkForbiddenPhrases,
  hasCriticalIssues,
  getViolationsByCategory,
} from './forbiddenPhraseChecker';


// All Agents (individual exports)
export { ALL_AGENTS } from './allAgents';
