/**
 * Style & Grammar Validation Agent
 * 
 * Ensures content follows Jio style guidelines, proper grammar,
 * and maintains brand voice consistency.
 * 
 * @module services/validation/agents/styleGrammarAgent
 */

import type { ValidationAgent, PatternRule, ValidationViolation } from '../types';
import { v4 as uuid } from 'uuid';

/**
 * Pattern rules for style and grammar
 */
const STYLE_PATTERNS: PatternRule[] = [
  // Jio brand consistency
  {
    id: 'sg-001',
    pattern: /\bjio\b/g,
    severity: 'warning',
    message: 'Jio should be capitalized as "Jio"',
    suggestion: 'Jio',
    category: 'brand',
  },
  {
    id: 'sg-002',
    pattern: /\bJIO\b/g,
    severity: 'warning',
    message: 'Avoid all-caps "JIO"',
    suggestion: 'Jio',
    category: 'brand',
  },
  {
    id: 'sg-003',
    pattern: /\b(Jio\s+Fiber|JioFiber|jio\s+fiber)\b/g,
    severity: 'info',
    message: 'Use consistent product name: JioFiber',
    suggestion: 'JioFiber',
    category: 'brand',
  },
  // Common grammar issues
  {
    id: 'sg-004',
    pattern: /\b(your|you're)\b.*\b(your|you're)\b/gi,
    severity: 'info',
    message: 'Check your/you\'re usage',
    suggestion: 'Verify correct usage of your vs you\'re',
    category: 'grammar',
  },
  {
    id: 'sg-005',
    pattern: /\b(its|it's)\b.*\b(its|it's)\b/gi,
    severity: 'info',
    message: 'Check its/it\'s usage',
    suggestion: 'Verify correct usage of its vs it\'s',
    category: 'grammar',
  },
  {
    id: 'sg-006',
    pattern: /\s{2,}/g,
    severity: 'info',
    message: 'Multiple consecutive spaces detected',
    suggestion: 'Use single space',
    category: 'formatting',
  },
  // Corporate jargon (Jio Brand Rule: No Corporate Jargon)
  {
    id: 'sg-007',
    pattern: /\b(synergy|leverage|paradigm|proactive|holistic|scalable|robust)\b/gi,
    severity: 'warning',
    message: 'Corporate jargon - use simpler language',
    suggestion: 'Use everyday language',
    category: 'jargon',
  },
  {
    id: 'sg-008',
    pattern: /\b(utilize|facilitate|optimize|streamline|operationalize)\b/gi,
    severity: 'warning',
    message: 'Formal word - consider simpler alternative',
    suggestion: 'use, help, improve, simplify',
    category: 'jargon',
  },
  {
    id: 'sg-009',
    pattern: /\b(going\s+forward|at\s+the\s+end\s+of\s+the\s+day|think\s+outside\s+the\s+box)\b/gi,
    severity: 'warning',
    message: 'Cliché - use more direct language',
    suggestion: 'Remove or rephrase',
    category: 'cliches',
  },
  // Passive voice
  {
    id: 'sg-010',
    pattern: /\b(was|were|been|being)\s+(done|made|created|sent|received)\b/gi,
    severity: 'info',
    message: 'Passive voice detected - consider active voice',
    suggestion: 'Use active voice for more direct communication',
    category: 'voice',
  },
  // Wordiness
  {
    id: 'sg-011',
    pattern: /\b(in\s+order\s+to)\b/gi,
    severity: 'info',
    message: 'Wordy phrase',
    suggestion: 'Use "to" instead',
    category: 'wordiness',
  },
  {
    id: 'sg-012',
    pattern: /\b(due\s+to\s+the\s+fact\s+that)\b/gi,
    severity: 'info',
    message: 'Wordy phrase',
    suggestion: 'Use "because" instead',
    category: 'wordiness',
  },
  {
    id: 'sg-013',
    pattern: /\b(at\s+this\s+point\s+in\s+time)\b/gi,
    severity: 'info',
    message: 'Wordy phrase',
    suggestion: 'Use "now" instead',
    category: 'wordiness',
  },
  // Tone issues
  {
    id: 'sg-014',
    pattern: /\b(must|required\s+to|mandatory|compulsory)\b/gi,
    severity: 'warning',
    message: 'Demanding tone - soften if possible',
    suggestion: 'Use "please" or "we recommend"',
    category: 'tone',
  },
  {
    id: 'sg-015',
    pattern: /\b(cannot|won't|don't|can't)\s+(be\s+able\s+to|do)\b/gi,
    severity: 'info',
    message: 'Negative framing - consider positive alternative',
    suggestion: 'Rephrase positively if possible',
    category: 'tone',
  },
  // Punctuation
  {
    id: 'sg-016',
    pattern: /[!]{2,}/g,
    severity: 'warning',
    message: 'Multiple exclamation marks',
    suggestion: 'Use single exclamation mark',
    category: 'punctuation',
  },
  {
    id: 'sg-017',
    pattern: /[?]{2,}/g,
    severity: 'warning',
    message: 'Multiple question marks',
    suggestion: 'Use single question mark',
    category: 'punctuation',
  },
  {
    id: 'sg-018',
    pattern: /\.{4,}/g,
    severity: 'info',
    message: 'Use proper ellipsis (three dots)',
    suggestion: '...',
    category: 'punctuation',
  },
  // Capitalization
  {
    id: 'sg-019',
    pattern: /\b[A-Z]{5,}\b/g,
    severity: 'warning',
    message: 'Excessive capitalization (shouting)',
    suggestion: 'Use sentence case or title case',
    category: 'capitalization',
  },
  // Abbreviations
  {
    id: 'sg-020',
    pattern: /\b(ASAP|FYI|TBD|TBA)\b/g,
    severity: 'info',
    message: 'Abbreviation - spell out for clarity',
    suggestion: 'Use full form for better understanding',
    category: 'abbreviations',
  },
];

/**
 * Style & Grammar Validation Agent
 */
export const styleGrammarAgent: ValidationAgent = {
  id: 'style_grammar',
  name: 'Style & Grammar',
  description: 'Ensures content follows Jio style guidelines and proper grammar',
  weight: 15,
  patterns: STYLE_PATTERNS,
  
  runPatternValidation(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    
    for (const rule of STYLE_PATTERNS) {
      const matches = content.matchAll(rule.pattern);
      
      for (const match of matches) {
        if (match.index !== undefined) {
          violations.push({
            id: uuid(),
            agentId: 'style_grammar',
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
          deduction += 25;
          break;
        case 'error':
          deduction += 12;
          break;
        case 'warning':
          deduction += 5;
          break;
        case 'info':
          deduction += 1;
          break;
      }
    }
    
    return Math.max(0, 100 - deduction);
  },
};
