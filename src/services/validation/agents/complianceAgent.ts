/**
 * Compliance Agent
 */

import type { ValidationAgent, PatternRule } from '../types';
import { runPatterns, calculateScore } from './helpers';

const COMPLIANCE_PATTERNS: PatternRule[] = [
  { id: 'cp-001', pattern: /\b(guaranteed|100%|always|never\s+fails)\b/gi, severity: 'error', rule: 'Avoid absolute claims', suggestion: 'Use qualified language', category: 'claims' },
  { id: 'cp-002', pattern: /\b(free|unlimited)\b(?!\s*\*)/gi, severity: 'warning', rule: 'Add terms and conditions', suggestion: 'Add asterisk and T&C reference', category: 'claims' },
  { id: 'cp-003', pattern: /\b(best\s+in\s+India|number\s+one|#1|market\s+leader)\b/gi, severity: 'warning', rule: 'Substantiate superlatives', suggestion: 'Add source citation', category: 'superlatives' },
  { id: 'cp-004', pattern: /\b(risk[\s-]?free|zero[\s-]?risk|no[\s-]?risk)\b/gi, severity: 'error', rule: 'Avoid risk elimination claims', suggestion: 'Qualify the statement', category: 'claims' },
  { id: 'cp-005', pattern: /\b(fastest|cheapest|lowest\s+price|unbeatable)\b/gi, severity: 'warning', rule: 'Avoid unsubstantiated superlatives', suggestion: 'Substantiate or remove', category: 'superlatives' },
  { id: 'cp-006', pattern: /\b(act\s+now|hurry|limited\s+time|offer\s+expires|last\s+chance|don'?t\s+miss)\b/gi, severity: 'warning', rule: 'Avoid urgency pressure tactics', suggestion: 'Remove urgency language', category: 'pressure' },
  { id: 'cp-007', pattern: /\b(no\s+strings\s+attached|completely\s+free|absolutely\s+free)\b/gi, severity: 'warning', rule: 'Avoid misleading free claims', suggestion: 'Add conditions', category: 'claims' },
  { id: 'cp-008', pattern: /\b(invest|investment|returns|profit|earn\s+money)\b/gi, severity: 'warning', rule: 'Avoid financial advice language', suggestion: 'Rephrase without financial advice', category: 'financial' },
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
