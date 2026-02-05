/**
 * Validation Agents Index
 * 
 * Exports all validation agents for the Content Trust System.
 * 
 * @module services/validation/agents
 */

import type { ValidationAgent, ValidationAgentId } from '../types';
import { genderNeutralityAgent } from './genderNeutralityAgent';
import { elitismAgent } from './elitismAgent';
import { culturalSensitivityAgent } from './culturalSensitivityAgent';
import { disabilityInclusionAgent } from './disabilityInclusionAgent';
import { complianceAgent } from './complianceAgent';
import { styleGrammarAgent } from './styleGrammarAgent';
import { accessibilityAgent } from './accessibilityAgent';

// Export individual agents
export { genderNeutralityAgent } from './genderNeutralityAgent';
export { elitismAgent } from './elitismAgent';
export { culturalSensitivityAgent } from './culturalSensitivityAgent';
export { disabilityInclusionAgent } from './disabilityInclusionAgent';
export { complianceAgent } from './complianceAgent';
export { styleGrammarAgent } from './styleGrammarAgent';
export { accessibilityAgent, calculateReadingLevel } from './accessibilityAgent';

/**
 * All validation agents keyed by ID
 */
export const VALIDATION_AGENTS: Record<ValidationAgentId, ValidationAgent> = {
  gender_neutrality: genderNeutralityAgent,
  elitism: elitismAgent,
  cultural_sensitivity: culturalSensitivityAgent,
  disability_inclusion: disabilityInclusionAgent,
  compliance: complianceAgent,
  style_grammar: styleGrammarAgent,
  accessibility: accessibilityAgent,
};

/**
 * Get agent by ID
 */
export function getValidationAgent(id: ValidationAgentId): ValidationAgent {
  const agent = VALIDATION_AGENTS[id];
  if (!agent) {
    throw new Error(`Unknown validation agent: ${id}`);
  }
  return agent;
}

/**
 * Get all agents as array
 */
export function getAllValidationAgents(): ValidationAgent[] {
  return Object.values(VALIDATION_AGENTS);
}

/**
 * Get enabled agents based on configuration
 */
export function getEnabledAgents(enabledIds: ValidationAgentId[]): ValidationAgent[] {
  return enabledIds
    .map(id => VALIDATION_AGENTS[id])
    .filter((agent): agent is ValidationAgent => agent !== undefined);
}
