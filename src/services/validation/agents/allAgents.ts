/**
 * All Validation Agents
 * 
 * Re-exports individual agents and assembles the ALL_AGENTS record.
 */

import type { ValidationAgent, ValidationAgentId } from '../types';

// Individual agent imports
export { genderNeutralityAgent } from './genderNeutralityAgent';
export { inclusivityAgent } from './inclusivityAgent';
export { culturalSensitivityAgent } from './culturalSensitivityAgent';
export { accessibilityAgent } from './accessibilityAgent';
export { complianceAgent } from './complianceAgent';
export { styleConsistencyAgent } from './styleConsistencyAgent';
export { brandAlignmentAgent } from './brandAlignmentAgent';
export { readabilityAgent } from './readabilityAgent';
export { commercialSensitivityAgent } from './commercialSensitivityAgent';
export { uxMicrocopyAgent } from './uxMicrocopyAgent';
export { glossaryAgent } from './glossaryAgent';
export { avoidWordsAgent } from './avoidWordsAgent';

// Re-import for ALL_AGENTS assembly
import { genderNeutralityAgent } from './genderNeutralityAgent';
import { inclusivityAgent } from './inclusivityAgent';
import { culturalSensitivityAgent } from './culturalSensitivityAgent';
import { accessibilityAgent } from './accessibilityAgent';
import { complianceAgent } from './complianceAgent';
import { styleConsistencyAgent } from './styleConsistencyAgent';
import { brandAlignmentAgent } from './brandAlignmentAgent';
import { readabilityAgent } from './readabilityAgent';
import { commercialSensitivityAgent } from './commercialSensitivityAgent';
import { uxMicrocopyAgent } from './uxMicrocopyAgent';
import { glossaryAgent } from './glossaryAgent';
import { avoidWordsAgent } from './avoidWordsAgent';

/**
 * All validation agents keyed by their ID.
 * 
 * KB/10 execution order (safety-first):
 *   1. Compliance (safety/regulatory)
 *   2. Cultural sensitivity (harm prevention)
 *   3. Inclusivity + gender neutrality (harm prevention)
 *   4. Accessibility (usability)
 *   5. Brand alignment + glossary (brand)
 *   6. Style + readability + avoid words (quality)
 *   7. Commercial sensitivity + UX microcopy (polish)
 */
export const ALL_AGENTS: Record<ValidationAgentId, ValidationAgent> = {
  compliance: complianceAgent,
  cultural_sensitivity: culturalSensitivityAgent,
  inclusivity: inclusivityAgent,
  gender_neutrality: genderNeutralityAgent,
  accessibility: accessibilityAgent,
  brand_alignment: brandAlignmentAgent,
  glossary: glossaryAgent,
  style_consistency: styleConsistencyAgent,
  readability: readabilityAgent,
  avoid_words: avoidWordsAgent,
  commercial_sensitivity: commercialSensitivityAgent,
  ux_microcopy: uxMicrocopyAgent,
};

/**
 * Ordered agent IDs for sequential pipeline execution (KB/10 safety-first).
 */
export const AGENT_EXECUTION_ORDER: ValidationAgentId[] = [
  'compliance',
  'cultural_sensitivity',
  'inclusivity',
  'gender_neutrality',
  'accessibility',
  'brand_alignment',
  'glossary',
  'style_consistency',
  'readability',
  'avoid_words',
  'commercial_sensitivity',
  'ux_microcopy',
];
