/**
 * Token Enforcement Validation Agent
 * 
 * Validates content against token-based enforcement rules.
 * Integrates with the validation pipeline to check content compliance
 * based on active token values and their associated rules.
 * 
 * @module services/validation/tokenEnforcementAgent
 */

import type { ValidationAgent, ValidationResult, Violation } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Token enforcement rule from Convex
 */
export interface TokenEnforcementRule {
  _id: string;
  tokenKey: string;
  tokenValue: string;
  ruleType: 'must_contain' | 'must_not_contain' | 'pattern_required' | 'pattern_forbidden' | 'max_length' | 'min_empathy';
  patterns: string[];
  autoFixAction?: 'remove' | 'replace' | 'add_disclaimer' | 'truncate' | 'rephrase';
  autoFixValue?: string;
  severity: 'error' | 'warning' | 'info';
  errorMessage: string;
  category?: string;
  priority: number;
}

/**
 * Active tokens for validation
 */
export interface ActiveTokens {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Token enforcement context
 */
export interface TokenEnforcementContext {
  activeTokens: ActiveTokens;
  rules: TokenEnforcementRule[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE CHECKING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if content contains all required patterns
 */
function checkMustContain(content: string, patterns: string[]): { passed: boolean; missing: string[] } {
  const missing: string[] = [];
  const contentLower = content.toLowerCase();
  
  for (const pattern of patterns) {
    if (!contentLower.includes(pattern.toLowerCase())) {
      missing.push(pattern);
    }
  }
  
  return { passed: missing.length === 0, missing };
}

/**
 * Check if content contains any forbidden patterns
 */
function checkMustNotContain(content: string, patterns: string[]): { passed: boolean; found: string[] } {
  const found: string[] = [];
  const contentLower = content.toLowerCase();
  
  for (const pattern of patterns) {
    if (contentLower.includes(pattern.toLowerCase())) {
      found.push(pattern);
    }
  }
  
  return { passed: found.length === 0, found };
}

/**
 * Check if content matches required regex patterns
 */
function checkPatternRequired(content: string, patterns: string[]): { passed: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, 'i');
      if (!regex.test(content)) {
        missing.push(pattern);
      }
    } catch {
      console.warn(`[TokenEnforcement] Invalid regex pattern: ${pattern}`);
    }
  }
  
  return { passed: missing.length === 0, missing };
}

/**
 * Check if content contains forbidden regex patterns
 */
function checkPatternForbidden(content: string, patterns: string[]): { passed: boolean; matched: string[] } {
  const matched: string[] = [];
  
  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, 'gi');
      const match = content.match(regex);
      if (match) {
        matched.push(...match);
      }
    } catch {
      console.warn(`[TokenEnforcement] Invalid regex pattern: ${pattern}`);
    }
  }
  
  return { passed: matched.length === 0, matched };
}

/**
 * Check content length against maximum
 */
function checkMaxLength(content: string, patterns: string[]): { passed: boolean; length: number; max: number } {
  const max = parseInt(patterns[0], 10) || 160;
  return { passed: content.length <= max, length: content.length, max };
}

/**
 * Simple empathy score calculation
 */
function calculateEmpathyScore(content: string): number {
  const empathyPhrases = [
    'understand', 'sorry', 'apologize', 'here for you', 'help',
    'feel', 'concern', 'care', 'appreciate', 'thank you',
    'i hear you', 'that sounds', 'must be', 'frustrating',
  ];
  
  const contentLower = content.toLowerCase();
  let matches = 0;
  
  for (const phrase of empathyPhrases) {
    if (contentLower.includes(phrase)) {
      matches++;
    }
  }
  
  // Score 0-10 based on empathy phrase density
  return Math.min(10, matches * 2);
}

/**
 * Check minimum empathy score
 */
function checkMinEmpathy(content: string, patterns: string[]): { passed: boolean; score: number; min: number } {
  const min = parseInt(patterns[0], 10) || 3;
  const score = calculateEmpathyScore(content);
  return { passed: score >= min, score, min };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION AGENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check a single rule against content
 */
function checkRule(content: string, rule: TokenEnforcementRule): Violation | null {
  let passed = true;
  let details = '';
  
  switch (rule.ruleType) {
    case 'must_contain': {
      const result = checkMustContain(content, rule.patterns);
      passed = result.passed;
      if (!passed) {
        details = `Missing required: ${result.missing.join(', ')}`;
      }
      break;
    }
    
    case 'must_not_contain': {
      const result = checkMustNotContain(content, rule.patterns);
      passed = result.passed;
      if (!passed) {
        details = `Contains forbidden: ${result.found.join(', ')}`;
      }
      break;
    }
    
    case 'pattern_required': {
      const result = checkPatternRequired(content, rule.patterns);
      passed = result.passed;
      if (!passed) {
        details = `Missing required patterns`;
      }
      break;
    }
    
    case 'pattern_forbidden': {
      const result = checkPatternForbidden(content, rule.patterns);
      passed = result.passed;
      if (!passed) {
        details = `Contains forbidden patterns: ${result.matched.slice(0, 3).join(', ')}`;
      }
      break;
    }
    
    case 'max_length': {
      const result = checkMaxLength(content, rule.patterns);
      passed = result.passed;
      if (!passed) {
        details = `Length ${result.length} exceeds max ${result.max}`;
      }
      break;
    }
    
    case 'min_empathy': {
      const result = checkMinEmpathy(content, rule.patterns);
      passed = result.passed;
      if (!passed) {
        details = `Empathy score ${result.score} below min ${result.min}`;
      }
      break;
    }
  }
  
  if (passed) {
    return null;
  }
  
  return {
    rule: `token:${rule.tokenKey}=${rule.tokenValue}`,
    type: 'content_policy',
    severity: rule.severity,
    term: rule.patterns[0] || rule.ruleType,
    context: details,
    suggestion: rule.autoFixValue || rule.errorMessage,
    autoFixable: !!rule.autoFixAction,
    autoFixAction: rule.autoFixAction as 'remove' | 'replace' | undefined,
    autoFixValue: rule.autoFixValue,
  };
}

/**
 * Get rules that apply to active tokens
 */
function getApplicableRules(rules: TokenEnforcementRule[], activeTokens: ActiveTokens): TokenEnforcementRule[] {
  return rules.filter(rule => {
    const tokenValue = activeTokens[rule.tokenKey];
    
    // Exact match
    if (String(tokenValue) === rule.tokenValue) {
      return true;
    }
    
    // Wildcard match (rule applies to any value of this token)
    if (rule.tokenValue === '*' && tokenValue !== undefined) {
      return true;
    }
    
    return false;
  });
}

/**
 * Create Token Enforcement validation agent
 */
export function createTokenEnforcementAgent(context: TokenEnforcementContext): ValidationAgent {
  return {
    name: 'TokenEnforcementAgent',
    description: 'Validates content against token-based enforcement rules',
    priority: 95, // High priority - run early
    
    validate: async (content: string): Promise<ValidationResult> => {
      const violations: Violation[] = [];
      const applicableRules = getApplicableRules(context.rules, context.activeTokens);
      
      // Sort by priority (higher first)
      const sortedRules = applicableRules.sort((a, b) => b.priority - a.priority);
      
      for (const rule of sortedRules) {
        const violation = checkRule(content, rule);
        if (violation) {
          violations.push(violation);
        }
      }
      
      return {
        passed: violations.filter(v => v.severity === 'error').length === 0,
        violations,
        metadata: {
          rulesChecked: sortedRules.length,
          activeTokenCount: Object.keys(context.activeTokens).length,
          categories: [...new Set(sortedRules.map(r => r.category).filter(Boolean))],
        },
      };
    },
  };
}

export default createTokenEnforcementAgent;
