/**
 * Cultural Sensitivity Agent
 */

import type { ValidationAgent, PatternRule } from '../types';
import { runPatterns, calculateScore } from './helpers';

const CULTURAL_PATTERNS: PatternRule[] = [
  { id: 'cs-001', pattern: /\b(madrasi|bhaiya|chinki|mallu)\b/gi, severity: 'error', rule: 'Avoid regional slurs', suggestion: 'Use proper regional terms', category: 'slurs' },
  { id: 'cs-002', pattern: /\b(caste|untouchable)\b/gi, severity: 'error', rule: 'Avoid caste references', suggestion: 'Remove term', category: 'caste' },
  { id: 'cs-003', pattern: /\b(fair\s+skin|dark\s+skin|gora|kaala)\b/gi, severity: 'error', rule: 'Avoid colorism', suggestion: 'Remove skin color reference', category: 'colorism' },
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
