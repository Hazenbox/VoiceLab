/**
 * Content Quality Agents
 * 
 * Agents focused on content quality and readability:
 * - Readability metrics
 * - Glossary/terminology
 * - Avoid words enforcement
 * 
 * @module services/validation/agents/categories/contentAgents
 */

import type { ValidationAgent, ValidationAgentId } from '../../types';
import { readabilityAgent } from '../readabilityAgent';
import { glossaryAgent } from '../glossaryAgent';
import { avoidWordsAgent } from '../avoidWordsAgent';

/**
 * Content quality validation agents
 */
export const CONTENT_AGENTS: Record<string, ValidationAgent> = {
  readability: readabilityAgent,
  glossary: glossaryAgent,
  avoid_words: avoidWordsAgent,
};

/**
 * Agent IDs in this category
 */
export const CONTENT_AGENT_IDS: ValidationAgentId[] = [
  'readability',
  'glossary',
  'avoid_words',
];

/**
 * Get all content agents as an array
 */
export function getContentAgents(): ValidationAgent[] {
  return Object.values(CONTENT_AGENTS);
}

/**
 * Total weight of content category
 */
export const CONTENT_CATEGORY_WEIGHT = Object.values(CONTENT_AGENTS)
  .reduce((sum, agent) => sum + agent.weight, 0);
