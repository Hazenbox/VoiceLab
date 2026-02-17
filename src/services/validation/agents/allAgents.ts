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
 * All validation agents keyed by their ID
 */
export const ALL_AGENTS: Record<ValidationAgentId, ValidationAgent> = {
  gender_neutrality: genderNeutralityAgent,
  inclusivity: inclusivityAgent,
  cultural_sensitivity: culturalSensitivityAgent,
  accessibility: accessibilityAgent,
  compliance: complianceAgent,
  style_consistency: styleConsistencyAgent,
  brand_alignment: brandAlignmentAgent,
  readability: readabilityAgent,
  avoid_words: avoidWordsAgent,
  commercial_sensitivity: commercialSensitivityAgent,
  ux_microcopy: uxMicrocopyAgent,
  glossary: glossaryAgent,
};
