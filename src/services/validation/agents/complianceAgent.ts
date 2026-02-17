/**
 * Compliance Agent
 */

import type { ValidationAgent, PatternRule } from '../types';
import { runPatterns, calculateScore } from './helpers';

const COMPLIANCE_PATTERNS: PatternRule[] = [
  { id: 'cp-001', pattern: /\b(guaranteed|100%|always|never\s+fails)\b/gi, severity: 'error', rule: 'Avoid absolute claims', suggestion: 'Use qualified language', category: 'claims' },
  { id: 'cp-002', pattern: /\b(free|unlimited)\b(?!\s*\*)/gi, severity: 'warning', rule: 'Add terms and conditions', suggestion: 'Add asterisk and T&C reference', category: 'claims' },
  { id: 'cp-003', pattern: /\b(best\s+in\s+India|number\s+one|#1)\b/gi, severity: 'warning', rule: 'Substantiate superlatives', suggestion: 'Add source citation', category: 'superlatives' },
];

export const complianceAgent: ValidationAgent = {
  id: 'compliance',
  name: 'Compliance',
  description: 'Ensures regulatory compliance',
  weight: 15,
  patterns: COMPLIANCE_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, COMPLIANCE_PATTERNS, 'compliance'),
  calculateScore,
};
