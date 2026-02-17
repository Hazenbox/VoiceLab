/**
 * Shared Validation Agent Helpers
 * 
 * Common functions used by all pattern-based validation agents.
 */

import type { PatternRule, ValidationViolation, ValidationAgentId } from '../types';

/**
 * Create a violation from a regex match and pattern rule
 */
export function createViolation(
  match: RegExpMatchArray,
  rule: PatternRule,
  agentId: ValidationAgentId
): ValidationViolation | null {
  if (match.index === undefined) return null;
  
  return {
    severity: rule.severity,
    rule: rule.rule,
    text: match[0],
    suggestion: rule.suggestion,
    category: rule.category,
    position: {
      start: match.index,
      end: match.index + match[0].length,
    },
    autoFixable: true,
    agentId,
  };
}

/**
 * Run a set of pattern rules against content and collect violations
 */
export function runPatterns(content: string, patterns: PatternRule[], agentId: ValidationAgentId): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  
  for (const rule of patterns) {
    const matches = content.matchAll(rule.pattern);
    for (const match of matches) {
      const v = createViolation(match, rule, agentId);
      if (v) violations.push(v);
    }
  }
  
  return violations;
}

/**
 * Calculate a score (0-100) based on violations
 */
export function calculateScore(violations: ValidationViolation[]): number {
  if (violations.length === 0) return 100;
  
  let deduction = 0;
  for (const v of violations) {
    deduction += v.severity === 'error' ? 15 : v.severity === 'warning' ? 7 : 2;
  }
  
  return Math.max(0, 100 - deduction);
}
