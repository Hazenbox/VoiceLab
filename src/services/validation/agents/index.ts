/**
 * Validation Agents Index
 */

import type { ValidationAgent, ValidationAgentId } from '../types';
import {
  ALL_AGENTS,
  genderNeutralityAgent,
  inclusivityAgent,
  culturalSensitivityAgent,
  accessibilityAgent,
  complianceAgent,
  styleConsistencyAgent,
  brandAlignmentAgent,
} from './allAgents';

export {
  genderNeutralityAgent,
  inclusivityAgent,
  culturalSensitivityAgent,
  accessibilityAgent,
  complianceAgent,
  styleConsistencyAgent,
  brandAlignmentAgent,
};

export const VALIDATION_AGENTS = ALL_AGENTS;

export function getValidationAgent(id: ValidationAgentId): ValidationAgent {
  const agent = VALIDATION_AGENTS[id];
  if (!agent) throw new Error(`Unknown validation agent: ${id}`);
  return agent;
}

export function getAllValidationAgents(): ValidationAgent[] {
  return Object.values(VALIDATION_AGENTS);
}

export function getEnabledAgents(enabledIds: ValidationAgentId[]): ValidationAgent[] {
  return enabledIds
    .map(id => VALIDATION_AGENTS[id])
    .filter((agent): agent is ValidationAgent => agent !== undefined);
}
