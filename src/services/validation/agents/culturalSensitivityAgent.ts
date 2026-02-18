/**
 * Cultural Sensitivity Agent
 */

import type { ValidationAgent, PatternRule } from '../types';
import { runPatterns, calculateScore } from './helpers';

const CULTURAL_PATTERNS: PatternRule[] = [
  { id: 'cs-001', pattern: /\b(madrasi|bhaiya|chinki|mallu)\b/gi, severity: 'error', rule: 'Avoid regional slurs', suggestion: 'Use proper regional terms', category: 'slurs' },
  { id: 'cs-002', pattern: /\b(caste|untouchable|dalit|brahmin|kshatriya)\b/gi, severity: 'error', rule: 'Avoid caste references', suggestion: 'Remove term', category: 'caste' },
  { id: 'cs-003', pattern: /\b(fair\s+skin|dark\s+skin|gora|kaala|wheatish)\b/gi, severity: 'error', rule: 'Avoid colorism', suggestion: 'Remove skin color reference', category: 'colorism' },
  { id: 'cs-004', pattern: /\b(beef|pork|halal|haram|non-?veg)\b/gi, severity: 'warning', rule: 'Avoid food sensitivity references', suggestion: 'Use neutral food terms', category: 'food' },
  { id: 'cs-005', pattern: /\b(hindu|muslim|christian|sikh|jain|buddhist)\b/gi, severity: 'warning', rule: 'Avoid religious references', suggestion: 'Remove religious reference', category: 'religion' },
  { id: 'cs-006', pattern: /\b(backward|primitive|third[\s-]?world|uncivilized)\b/gi, severity: 'error', rule: 'Avoid derogatory cultural terms', suggestion: 'Use respectful language', category: 'derogatory' },
  { id: 'cs-007', pattern: /\b(tribal|slum|ghetto)\b/gi, severity: 'warning', rule: 'Avoid socioeconomic stereotypes', suggestion: 'Use neutral terms', category: 'socioeconomic' },
  { id: 'cs-008', pattern: /\b(illiterate|uneducated|ignorant)\b/gi, severity: 'error', rule: 'Avoid literacy shaming', suggestion: 'Rephrase without judgment', category: 'literacy' },
  { id: 'cs-009', pattern: /\b(old\s+age|senior\s+citizen|elderly)\b/gi, severity: 'warning', rule: 'Avoid age-specific labels', suggestion: 'Use inclusive terms', category: 'ageism' },
  { id: 'cs-010', pattern: /\b(housewife|ladylike|man\s+up|boys\s+will\s+be)\b/gi, severity: 'error', rule: 'Avoid gender stereotypes', suggestion: 'Use gender-neutral language', category: 'gender_stereotype' },
  { id: 'cs-011', pattern: /\b(dowry|child\s+marriage|honour\s+killing)\b/gi, severity: 'error', rule: 'Avoid sensitive social practice references', suggestion: 'Remove reference', category: 'social_sensitivity' },
  { id: 'cs-012', pattern: /\b(north\s+indian|south\s+indian|bengali|punjabi|gujarati)\b/gi, severity: 'warning', rule: 'Avoid regional generalizations', suggestion: 'Be specific without stereotyping', category: 'regional' },
  { id: 'cs-013', pattern: /\b(native|vernacular|mother\s+tongue)\b/gi, severity: 'warning', rule: 'Avoid hierarchical language terms', suggestion: 'Use "preferred language"', category: 'language_hierarchy' },
];

export const culturalSensitivityAgent: ValidationAgent = {
  id: 'cultural_sensitivity',
  name: 'Cultural Sensitivity',
  description: 'Respects cultural diversity',
  weight: 15,
  patterns: CULTURAL_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, CULTURAL_PATTERNS, 'cultural_sensitivity'),
  calculateScore,
};
