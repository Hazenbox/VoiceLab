/**
 * Disability Inclusion Validation Agent
 * 
 * Ensures content uses disability-inclusive language and avoids ableist terms.
 * 
 * @module services/validation/agents/disabilityInclusionAgent
 */

import type { ValidationAgent, PatternRule, ValidationViolation } from '../types';
import { v4 as uuid } from 'uuid';

/**
 * Pattern rules for disability inclusion
 */
const DISABILITY_PATTERNS: PatternRule[] = [
  // Ableist language
  {
    id: 'di-001',
    pattern: /\b(crazy|insane|mad|mental|lunatic|psycho)\b/gi,
    severity: 'error',
    message: 'Ableist term - avoid mental health slurs',
    suggestion: 'Use "unusual", "remarkable", or specific description',
    category: 'mental_health',
  },
  {
    id: 'di-002',
    pattern: /\b(retard|retarded|moron|idiot|stupid|dumb)\b/gi,
    severity: 'critical',
    message: 'Ableist slur - remove immediately',
    suggestion: 'Remove the term entirely',
    category: 'intellectual',
  },
  {
    id: 'di-003',
    pattern: /\b(crippled|cripple|lame|gimp)\b/gi,
    severity: 'critical',
    message: 'Disability slur - remove immediately',
    suggestion: 'Use person-first language',
    category: 'physical',
  },
  {
    id: 'di-004',
    pattern: /\b(deaf\s+to|blind\s+to|turn\s+a\s+blind\s+eye)\b/gi,
    severity: 'warning',
    message: 'Disability-related idiom - consider alternatives',
    suggestion: 'Use "ignoring" or "unaware of"',
    category: 'idioms',
  },
  {
    id: 'di-005',
    pattern: /\b(fall\s+on\s+deaf\s+ears)\b/gi,
    severity: 'warning',
    message: 'Disability-related idiom',
    suggestion: 'Use "was ignored" or "wasn\'t heard"',
    category: 'idioms',
  },
  // Person-first language violations
  {
    id: 'di-006',
    pattern: /\b(disabled\s+person|handicapped\s+person|the\s+disabled)\b/gi,
    severity: 'warning',
    message: 'Consider person-first language',
    suggestion: 'Use "person with a disability" or "people with disabilities"',
    category: 'person_first',
  },
  {
    id: 'di-007',
    pattern: /\b(wheelchair[-\s]?bound|confined\s+to\s+a\s+wheelchair)\b/gi,
    severity: 'error',
    message: 'Negative framing of mobility aid',
    suggestion: 'Use "wheelchair user" or "person who uses a wheelchair"',
    category: 'mobility',
  },
  {
    id: 'di-008',
    pattern: /\b(suffers\s+from|afflicted\s+with|victim\s+of)\s+\w+/gi,
    severity: 'warning',
    message: 'Victimizing language - use neutral terms',
    suggestion: 'Use "has" or "lives with"',
    category: 'framing',
  },
  // Inspiration porn
  {
    id: 'di-009',
    pattern: /\b(special\s+needs|differently\s+abled|specially\s+abled)\b/gi,
    severity: 'warning',
    message: 'Euphemism that can be patronizing',
    suggestion: 'Use "disability" or specific condition name',
    category: 'euphemisms',
  },
  {
    id: 'di-010',
    pattern: /\b(brave|inspiring|courageous)\s+(despite|for\s+someone\s+with)\b/gi,
    severity: 'warning',
    message: 'Inspiration porn - avoid patronizing framing',
    suggestion: 'Remove disability-conditional praise',
    category: 'framing',
  },
  // Accessibility assumptions
  {
    id: 'di-011',
    pattern: /\b(just\s+look\s+at|as\s+you\s+can\s+see|obviously\s+visible)\b/gi,
    severity: 'info',
    message: 'Visual assumption - consider screen reader users',
    suggestion: 'Describe visual elements for accessibility',
    category: 'accessibility',
  },
  {
    id: 'di-012',
    pattern: /\b(click\s+here|tap\s+here)\b/gi,
    severity: 'info',
    message: 'Consider adding descriptive link text',
    suggestion: 'Use descriptive link text for screen readers',
    category: 'accessibility',
  },
  // Outdated terms
  {
    id: 'di-013',
    pattern: /\b(mentally\s+ill|mentally\s+challenged)\b/gi,
    severity: 'warning',
    message: 'Outdated terminology',
    suggestion: 'Use "person with a mental health condition"',
    category: 'outdated',
  },
  {
    id: 'di-014',
    pattern: /\b(normal\s+people|normal\s+person)\b/gi,
    severity: 'warning',
    message: 'Implies disability is abnormal',
    suggestion: 'Use "non-disabled" or remove comparison',
    category: 'framing',
  },
];

/**
 * Disability Inclusion Validation Agent
 */
export const disabilityInclusionAgent: ValidationAgent = {
  id: 'disability_inclusion',
  name: 'Disability Inclusion',
  description: 'Ensures content uses disability-inclusive language',
  weight: 15,
  patterns: DISABILITY_PATTERNS,
  
  runPatternValidation(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    
    for (const rule of DISABILITY_PATTERNS) {
      const matches = content.matchAll(rule.pattern);
      
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            id: uuid(),
            agentId: 'disability_inclusion',
            severity: rule.severity,
            message: rule.message,
            suggestion: rule.suggestion,
            location: {
              start: match.index,
              end: match.index + match[0].length,
              text: match[0],
            },
            category: rule.category,
            confidence: 88,
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
          deduction += 40;
          break;
        case 'error':
          deduction += 20;
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
