/**
 * Gender Neutrality Validation Agent
 * 
 * Ensures content uses gender-neutral language and avoids gender stereotypes.
 * 
 * @module services/validation/agents/genderNeutralityAgent
 */

import type { ValidationAgent, PatternRule, ValidationViolation } from '../types';
import { v4 as uuid } from 'uuid';

/**
 * Pattern rules for gender neutrality
 */
const GENDER_PATTERNS: PatternRule[] = [
  // Gendered pronouns in generic context
  {
    id: 'gn-001',
    pattern: /\b(he|him|his)\b(?!\s+(or\s+she|\/\s*she))/gi,
    severity: 'warning',
    message: 'Consider using gender-neutral pronouns (they/them/their)',
    suggestion: 'Replace with "they/them/their" or rephrase to avoid pronouns',
    category: 'pronouns',
  },
  {
    id: 'gn-002',
    pattern: /\b(she|her|hers)\b(?!\s+(or\s+he|\/\s*he))/gi,
    severity: 'warning',
    message: 'Consider using gender-neutral pronouns (they/them/their)',
    suggestion: 'Replace with "they/them/their" or rephrase to avoid pronouns',
    category: 'pronouns',
  },
  // Gendered job titles
  {
    id: 'gn-003',
    pattern: /\b(chairman|chairwoman)\b/gi,
    severity: 'error',
    message: 'Use gender-neutral term "chairperson" or "chair"',
    suggestion: 'chairperson',
    category: 'job_titles',
  },
  {
    id: 'gn-004',
    pattern: /\b(businessman|businesswoman)\b/gi,
    severity: 'error',
    message: 'Use gender-neutral term "businessperson" or "professional"',
    suggestion: 'businessperson',
    category: 'job_titles',
  },
  {
    id: 'gn-005',
    pattern: /\b(fireman|policeman|mailman)\b/gi,
    severity: 'error',
    message: 'Use gender-neutral job title',
    suggestion: 'firefighter, police officer, mail carrier',
    category: 'job_titles',
  },
  {
    id: 'gn-006',
    pattern: /\b(stewardess|steward)\b/gi,
    severity: 'error',
    message: 'Use "flight attendant"',
    suggestion: 'flight attendant',
    category: 'job_titles',
  },
  {
    id: 'gn-007',
    pattern: /\b(salesgirl|salesman|saleswoman)\b/gi,
    severity: 'error',
    message: 'Use "salesperson" or "sales representative"',
    suggestion: 'salesperson',
    category: 'job_titles',
  },
  // Gendered terms
  {
    id: 'gn-008',
    pattern: /\b(mankind)\b/gi,
    severity: 'warning',
    message: 'Consider using "humankind" or "humanity"',
    suggestion: 'humankind',
    category: 'generic_terms',
  },
  {
    id: 'gn-009',
    pattern: /\b(manpower)\b/gi,
    severity: 'warning',
    message: 'Consider using "workforce" or "human resources"',
    suggestion: 'workforce',
    category: 'generic_terms',
  },
  {
    id: 'gn-010',
    pattern: /\b(man-made)\b/gi,
    severity: 'warning',
    message: 'Consider using "artificial" or "synthetic"',
    suggestion: 'artificial',
    category: 'generic_terms',
  },
  // Gender stereotypes
  {
    id: 'gn-011',
    pattern: /\b(like a girl|throws like a girl|runs like a girl)\b/gi,
    severity: 'critical',
    message: 'Avoid gender-based stereotypes',
    suggestion: 'Remove the phrase',
    category: 'stereotypes',
  },
  {
    id: 'gn-012',
    pattern: /\b(man up|be a man|grow a pair)\b/gi,
    severity: 'critical',
    message: 'Avoid toxic masculinity phrases',
    suggestion: 'Use "be brave" or "show courage"',
    category: 'stereotypes',
  },
  // Titles
  {
    id: 'gn-013',
    pattern: /\b(Mrs|Miss)\.?\s+[A-Z]/g,
    severity: 'info',
    message: 'Consider using "Ms." which does not indicate marital status',
    suggestion: 'Ms.',
    category: 'titles',
  },
  // Assumptions
  {
    id: 'gn-014',
    pattern: /\b(husband|wife)\s+(and\s+)?children\b/gi,
    severity: 'info',
    message: 'Consider using "family" or "partner and children"',
    suggestion: 'family',
    category: 'assumptions',
  },
];

/**
 * Gender Neutrality Validation Agent
 */
export const genderNeutralityAgent: ValidationAgent = {
  id: 'gender_neutrality',
  name: 'Gender Neutrality',
  description: 'Ensures content uses gender-neutral language and avoids stereotypes',
  weight: 15,
  patterns: GENDER_PATTERNS,
  
  runPatternValidation(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    
    for (const rule of GENDER_PATTERNS) {
      const matches = content.matchAll(rule.pattern);
      
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            id: uuid(),
            agentId: 'gender_neutrality',
            severity: rule.severity,
            message: rule.message,
            suggestion: rule.suggestion,
            location: {
              start: match.index,
              end: match.index + match[0].length,
              text: match[0],
            },
            category: rule.category,
            confidence: 90,
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
          deduction += 30;
          break;
        case 'error':
          deduction += 15;
          break;
        case 'warning':
          deduction += 7;
          break;
        case 'info':
          deduction += 2;
          break;
      }
    }
    
    return Math.max(0, 100 - deduction);
  },
};
