/**
 * Accessibility Agent
 */

import type { ValidationAgent, PatternRule } from '../types';
import { runPatterns, calculateScore } from './helpers';

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
