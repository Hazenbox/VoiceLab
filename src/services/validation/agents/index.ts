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
// AGENT CATEGORIES (Semantic Grouping)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  INCLUSIVITY_AGENTS,
  INCLUSIVITY_AGENT_IDS,
  getInclusivityAgents,
  INCLUSIVITY_CATEGORY_WEIGHT,
} from './categories/inclusivityAgents';

export {
  COMPLIANCE_AGENTS,
  COMPLIANCE_AGENT_IDS,
  getComplianceAgents,
  COMPLIANCE_CATEGORY_WEIGHT,
} from './categories/complianceAgents';

export {
  BRAND_AGENTS,
  BRAND_AGENT_IDS,
  getBrandAgents,
  BRAND_CATEGORY_WEIGHT,
} from './categories/brandAgents';

export {
  CONTENT_AGENTS,
  CONTENT_AGENT_IDS,
  getContentAgents,
  CONTENT_CATEGORY_WEIGHT,
} from './categories/contentAgents';

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
