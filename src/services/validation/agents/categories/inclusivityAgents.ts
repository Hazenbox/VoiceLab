/**
 * Inclusivity & Diversity Agents
 * 
 * Agents focused on equity, accessibility, and diversity:
 * - Gender-neutral language
 * - Inclusive terminology
 * - Cultural sensitivity
 * - Accessibility compliance
 * 
 * @module services/validation/agents/categories/inclusivityAgents
 */

import type { ValidationAgent, ValidationAgentId } from '../../types';
import { genderNeutralityAgent } from '../genderNeutralityAgent';
import { inclusivityAgent } from '../inclusivityAgent';
import { culturalSensitivityAgent } from '../culturalSensitivityAgent';
import { accessibilityAgent } from '../accessibilityAgent';

/**
 * Inclusivity & diversity validation agents
 */
export const INCLUSIVITY_AGENTS: Record<string, ValidationAgent> = {
  gender_neutrality: genderNeutralityAgent,
  inclusivity: inclusivityAgent,
  cultural_sensitivity: culturalSensitivityAgent,
  accessibility: accessibilityAgent,
};

/**
 * Agent IDs in this category
 */
export const INCLUSIVITY_AGENT_IDS: ValidationAgentId[] = [
  'gender_neutrality',
  'inclusivity',
  'cultural_sensitivity',
  'accessibility',
];

/**
 * Get all inclusivity agents as an array
 */
export function getInclusivityAgents(): ValidationAgent[] {
  return Object.values(INCLUSIVITY_AGENTS);
}

/**
 * Total weight of inclusivity category
 */
export const INCLUSIVITY_CATEGORY_WEIGHT = Object.values(INCLUSIVITY_AGENTS)
  .reduce((sum, agent) => sum + agent.weight, 0);
