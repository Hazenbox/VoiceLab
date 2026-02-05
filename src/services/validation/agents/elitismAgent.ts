/**
 * Elitism Validation Agent
 * 
 * Ensures content does not use elitist language or make assumptions about
 * users' education, income, or social status.
 * 
 * @module services/validation/agents/elitismAgent
 */

import type { ValidationAgent, PatternRule, ValidationViolation } from '../types';
import { v4 as uuid } from 'uuid';

/**
 * Pattern rules for elitism detection
 */
const ELITISM_PATTERNS: PatternRule[] = [
  // Educational assumptions
  {
    id: 'el-001',
    pattern: /\b(obviously|clearly|simply|just|easily)\s+(you|anyone|everyone)\s+(can|should|would|could)\b/gi,
    severity: 'warning',
    message: 'Avoid assuming tasks are simple for everyone',
    suggestion: 'Remove qualifiers like "obviously" or "simply"',
    category: 'assumptions',
  },
  {
    id: 'el-002',
    pattern: /\b(any\s+educated\s+person|educated\s+people|literate\s+person)\b/gi,
    severity: 'critical',
    message: 'Avoid references to education level',
    suggestion: 'Remove education-based qualifiers',
    category: 'education',
  },
  {
    id: 'el-003',
    pattern: /\b(common\s+sense|basic\s+knowledge|everyone\s+knows)\b/gi,
    severity: 'warning',
    message: 'What seems obvious may not be for all users',
    suggestion: 'Explain clearly without assuming prior knowledge',
    category: 'assumptions',
  },
  // Economic assumptions
  {
    id: 'el-004',
    pattern: /\b(affordable|cheap|budget|economical)\s+(option|choice|plan)\b/gi,
    severity: 'info',
    message: 'Consider neutral pricing language',
    suggestion: 'Use "value" or specific price instead',
    category: 'economic',
  },
  {
    id: 'el-005',
    pattern: /\b(premium|elite|exclusive|luxury)\s+(customer|user|member)\b/gi,
    severity: 'warning',
    message: 'Avoid creating class distinctions among users',
    suggestion: 'Use plan or tier names without elitist language',
    category: 'economic',
  },
  {
    id: 'el-006',
    pattern: /\b(for\s+those\s+who\s+can\s+afford|rich|wealthy)\b/gi,
    severity: 'error',
    message: 'Avoid wealth-based language',
    suggestion: 'Focus on features, not affordability',
    category: 'economic',
  },
  // Tech elitism
  {
    id: 'el-007',
    pattern: /\b(tech[-\s]?savvy|digital[-\s]?native|power[-\s]?user)\b/gi,
    severity: 'warning',
    message: 'Avoid assuming tech literacy',
    suggestion: 'Write instructions for all skill levels',
    category: 'tech',
  },
  {
    id: 'el-008',
    pattern: /\b(even\s+a\s+child|monkey\s+could|blind\s+could)\b/gi,
    severity: 'critical',
    message: 'Demeaning comparison - remove immediately',
    suggestion: 'Remove the entire phrase',
    category: 'demeaning',
  },
  // Language elitism
  {
    id: 'el-009',
    pattern: /\b(proper\s+English|good\s+English|correct\s+grammar)\b/gi,
    severity: 'warning',
    message: 'Avoid language superiority attitudes',
    suggestion: 'Accept language diversity',
    category: 'language',
  },
  {
    id: 'el-010',
    pattern: /\b(sophisticated|refined|cultured)\s+(user|customer|person)\b/gi,
    severity: 'warning',
    message: 'Avoid cultural elitism',
    suggestion: 'Remove sophistication qualifiers',
    category: 'cultural',
  },
  // Urban bias
  {
    id: 'el-011',
    pattern: /\b(urban|metro|city)\s+(lifestyle|living|dweller)\b/gi,
    severity: 'info',
    message: 'Consider rural users as well',
    suggestion: 'Use location-neutral language',
    category: 'urban_bias',
  },
  {
    id: 'el-012',
    pattern: /\b(tier[-\s]?1\s+city|metro\s+city)\s+residents?\b/gi,
    severity: 'warning',
    message: 'Avoid implying tier differences in users',
    suggestion: 'Specify cities by name if needed',
    category: 'urban_bias',
  },
  // Condescending
  {
    id: 'el-013',
    pattern: /\b(let\s+me\s+explain\s+in\s+simple\s+terms|in\s+layman['']s\s+terms)\b/gi,
    severity: 'warning',
    message: 'Condescending tone - just explain clearly',
    suggestion: 'Simply explain without the qualifier',
    category: 'condescending',
  },
  {
    id: 'el-014',
    pattern: /\b(as\s+you\s+probably\s+know|you\s+must\s+know)\b/gi,
    severity: 'info',
    message: 'Avoid assumptions about user knowledge',
    suggestion: 'State information directly',
    category: 'assumptions',
  },
];

/**
 * Elitism Validation Agent
 */
export const elitismAgent: ValidationAgent = {
  id: 'elitism',
  name: 'Elitism Check',
  description: 'Ensures content does not use elitist language or make assumptions',
  weight: 15,
  patterns: ELITISM_PATTERNS,
  
  runPatternValidation(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    
    for (const rule of ELITISM_PATTERNS) {
      const matches = content.matchAll(rule.pattern);
      
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            id: uuid(),
            agentId: 'elitism',
            severity: rule.severity,
            message: rule.message,
            suggestion: rule.suggestion,
            location: {
              start: match.index,
              end: match.index + match[0].length,
              text: match[0],
            },
            category: rule.category,
            confidence: 85,
          });
        }
      }
    }
    
    return violations;
  },
  
  calculateScore(violations: ValidationViolation[]): number {
    if (violations.length === 0) return 100;
    
    let deduction = 0;
    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          deduction += 35;
          break;
        case 'error':
          deduction += 20;
          break;
        case 'warning':
          deduction += 8;
          break;
        case 'info':
          deduction += 2;
          break;
      }
    }
    
    return Math.max(0, 100 - deduction);
  },
};
