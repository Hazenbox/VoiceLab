/**
 * All Validation Agents
 * 
 * Simplified validation agents matching the existing type definitions.
 */

import type { ValidationAgent, PatternRule, ValidationViolation, ValidationAgentId } from '../types';

// =============================================================================
// Helper
// =============================================================================

function createViolation(
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

function runPatterns(content: string, patterns: PatternRule[], agentId: ValidationAgentId): ValidationViolation[] {
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

function calculateScore(violations: ValidationViolation[]): number {
  if (violations.length === 0) return 100;
  
  let deduction = 0;
  for (const v of violations) {
    deduction += v.severity === 'error' ? 15 : v.severity === 'warning' ? 7 : 2;
  }
  
  return Math.max(0, 100 - deduction);
}

// =============================================================================
// Gender Neutrality Agent
// =============================================================================

const GENDER_PATTERNS: PatternRule[] = [
  { id: 'gn-001', pattern: /\b(chairman|chairwoman)\b/gi, severity: 'error', rule: 'Use gender-neutral job titles', suggestion: 'chairperson', category: 'job_titles' },
  { id: 'gn-002', pattern: /\b(businessman|businesswoman)\b/gi, severity: 'error', rule: 'Use gender-neutral job titles', suggestion: 'businessperson', category: 'job_titles' },
  { id: 'gn-003', pattern: /\b(fireman|policeman|mailman)\b/gi, severity: 'error', rule: 'Use gender-neutral job titles', suggestion: 'firefighter, police officer, mail carrier', category: 'job_titles' },
  { id: 'gn-004', pattern: /\b(mankind)\b/gi, severity: 'warning', rule: 'Use inclusive terms', suggestion: 'humankind', category: 'generic_terms' },
  { id: 'gn-005', pattern: /\b(manpower)\b/gi, severity: 'warning', rule: 'Use inclusive terms', suggestion: 'workforce', category: 'generic_terms' },
];

export const genderNeutralityAgent: ValidationAgent = {
  id: 'gender_neutrality',
  name: 'Gender Neutrality',
  description: 'Ensures gender-neutral language',
  weight: 15,
  patterns: GENDER_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, GENDER_PATTERNS, 'gender_neutrality'),
  calculateScore,
};

// =============================================================================
// Inclusivity Agent (replaces Elitism + Disability)
// =============================================================================

const INCLUSIVITY_PATTERNS: PatternRule[] = [
  { id: 'in-001', pattern: /\b(obviously|clearly|simply)\s+(you|anyone)\s+(can|should)\b/gi, severity: 'warning', rule: 'Avoid assumptions', suggestion: 'Remove qualifiers', category: 'assumptions' },
  { id: 'in-002', pattern: /\b(wheelchair[-\s]?bound)\b/gi, severity: 'error', rule: 'Use person-first language', suggestion: 'wheelchair user', category: 'disability' },
  { id: 'in-003', pattern: /\b(the disabled)\b/gi, severity: 'error', rule: 'Use person-first language', suggestion: 'people with disabilities', category: 'disability' },
  { id: 'in-004', pattern: /\b(suffers from|afflicted with)\b/gi, severity: 'warning', rule: 'Use neutral language', suggestion: 'has, lives with', category: 'disability' },
  { id: 'in-005', pattern: /\b(tech[-\s]?savvy|power[-\s]?user)\b/gi, severity: 'warning', rule: 'Avoid tech elitism', suggestion: 'Remove term', category: 'elitism' },
];

export const inclusivityAgent: ValidationAgent = {
  id: 'inclusivity',
  name: 'Inclusivity',
  description: 'Ensures inclusive language',
  weight: 15,
  patterns: INCLUSIVITY_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, INCLUSIVITY_PATTERNS, 'inclusivity'),
  calculateScore,
};

// =============================================================================
// Cultural Sensitivity Agent
// =============================================================================

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

// =============================================================================
// Accessibility Agent
// =============================================================================

const ACCESSIBILITY_PATTERNS: PatternRule[] = [
  { id: 'ac-001', pattern: /\b(click\s+here|tap\s+here)\b/gi, severity: 'warning', rule: 'Use descriptive link text', suggestion: 'Describe the action', category: 'links' },
  { id: 'ac-002', pattern: /\b(the\s+red|the\s+green|the\s+blue)\s+(button|text)\b/gi, severity: 'warning', rule: 'Avoid color-only references', suggestion: 'Add label in addition to color', category: 'color' },
  { id: 'ac-003', pattern: /\b(see\s+the\s+image|as\s+shown)\b/gi, severity: 'warning', rule: 'Provide text alternatives', suggestion: 'Describe visual content', category: 'visual' },
];

export const accessibilityAgent: ValidationAgent = {
  id: 'accessibility',
  name: 'Accessibility',
  description: 'Ensures content accessibility',
  weight: 10,
  patterns: ACCESSIBILITY_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, ACCESSIBILITY_PATTERNS, 'accessibility'),
  calculateScore,
};

// =============================================================================
// Compliance Agent
// =============================================================================

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

// =============================================================================
// Style Consistency Agent
// =============================================================================

const STYLE_PATTERNS: PatternRule[] = [
  { id: 'st-001', pattern: /\bjio\b/g, severity: 'warning', rule: 'Capitalize Jio', suggestion: 'Jio', category: 'brand' },
  { id: 'st-002', pattern: /\bJIO\b/g, severity: 'warning', rule: 'Avoid all-caps', suggestion: 'Jio', category: 'brand' },
  { id: 'st-003', pattern: /\b(utilize|facilitate|leverage|synergy)\b/gi, severity: 'warning', rule: 'Avoid corporate jargon', suggestion: 'Use simpler language', category: 'jargon' },
  { id: 'st-004', pattern: /\b(in\s+order\s+to)\b/gi, severity: 'info', rule: 'Simplify phrase', suggestion: 'to', category: 'wordiness' },
  { id: 'st-005', pattern: /[!]{2,}/g, severity: 'warning', rule: 'Avoid multiple exclamations', suggestion: 'Use single !', category: 'punctuation' },
];

export const styleConsistencyAgent: ValidationAgent = {
  id: 'style_consistency',
  name: 'Style Consistency',
  description: 'Maintains brand voice',
  weight: 15,
  patterns: STYLE_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, STYLE_PATTERNS, 'style_consistency'),
  calculateScore,
};

// =============================================================================
// Brand Alignment Agent
// =============================================================================

const BRAND_PATTERNS: PatternRule[] = [
  { id: 'ba-001', pattern: /\b(must|required|mandatory|compulsory)\b/gi, severity: 'warning', rule: 'Soften demanding tone', suggestion: 'please, we recommend', category: 'tone' },
  { id: 'ba-002', pattern: /\b(cannot|won\'t|don\'t)\b/gi, severity: 'info', rule: 'Consider positive framing', suggestion: 'Rephrase positively', category: 'tone' },
];

export const brandAlignmentAgent: ValidationAgent = {
  id: 'brand_alignment',
  name: 'Brand Alignment',
  description: 'Aligns with Jio brand values',
  weight: 15,
  patterns: BRAND_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, BRAND_PATTERNS, 'brand_alignment'),
  calculateScore,
};

// =============================================================================
// All Agents Export
// =============================================================================

export const ALL_AGENTS: Record<ValidationAgentId, ValidationAgent> = {
  gender_neutrality: genderNeutralityAgent,
  inclusivity: inclusivityAgent,
  cultural_sensitivity: culturalSensitivityAgent,
  accessibility: accessibilityAgent,
  compliance: complianceAgent,
  style_consistency: styleConsistencyAgent,
  brand_alignment: brandAlignmentAgent,
};
