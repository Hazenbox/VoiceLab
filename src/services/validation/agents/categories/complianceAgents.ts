/**
 * Compliance & Legal Agents
 * 
 * Agents focused on regulatory and legal compliance:
 * - Legal/regulatory language
 * - Commercial sensitivity
 * 
 * @module services/validation/agents/categories/complianceAgents
 */

import type { ValidationAgent, ValidationAgentId } from '../../types';
import { complianceAgent } from '../complianceAgent';
import { commercialSensitivityAgent } from '../commercialSensitivityAgent';

/**
 * Compliance & legal validation agents
 */
export const COMPLIANCE_AGENTS: Record<string, ValidationAgent> = {
  compliance: complianceAgent,
  commercial_sensitivity: commercialSensitivityAgent,
};

/**
 * Agent IDs in this category
 */
export const COMPLIANCE_AGENT_IDS: ValidationAgentId[] = [
  'compliance',
  'commercial_sensitivity',
];

/**
 * Get all compliance agents as an array
 */
export function getComplianceAgents(): ValidationAgent[] {
  return Object.values(COMPLIANCE_AGENTS);
}

/**
 * Total weight of compliance category
 */
export const COMPLIANCE_CATEGORY_WEIGHT = Object.values(COMPLIANCE_AGENTS)
  .reduce((sum, agent) => sum + agent.weight, 0);
