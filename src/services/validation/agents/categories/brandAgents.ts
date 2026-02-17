/**
 * Brand & Style Agents
 * 
 * Agents focused on brand consistency and tone:
 * - Brand alignment with Jio voice
 * - Style consistency
 * - UX microcopy standards
 * 
 * @module services/validation/agents/categories/brandAgents
 */

import type { ValidationAgent, ValidationAgentId } from '../../types';
import { brandAlignmentAgent } from '../brandAlignmentAgent';
import { styleConsistencyAgent } from '../styleConsistencyAgent';
import { uxMicrocopyAgent } from '../uxMicrocopyAgent';

/**
 * Brand & style validation agents
 */
export const BRAND_AGENTS: Record<string, ValidationAgent> = {
  brand_alignment: brandAlignmentAgent,
  style_consistency: styleConsistencyAgent,
  ux_microcopy: uxMicrocopyAgent,
};

/**
 * Agent IDs in this category
 */
export const BRAND_AGENT_IDS: ValidationAgentId[] = [
  'brand_alignment',
  'style_consistency',
  'ux_microcopy',
];

/**
 * Get all brand agents as an array
 */
export function getBrandAgents(): ValidationAgent[] {
  return Object.values(BRAND_AGENTS);
}

/**
 * Total weight of brand category
 */
export const BRAND_CATEGORY_WEIGHT = Object.values(BRAND_AGENTS)
  .reduce((sum, agent) => sum + agent.weight, 0);
