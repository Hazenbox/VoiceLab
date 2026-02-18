/**
 * Accessibility Agent
 */

import type { ValidationAgent, PatternRule } from '../types';
import { runPatterns, calculateScore } from './helpers';

const ACCESSIBILITY_PATTERNS: PatternRule[] = [
  { id: 'ac-001', pattern: /\b(click\s+here|tap\s+here)\b/gi, severity: 'warning', rule: 'Use descriptive link text', suggestion: 'Describe the action', category: 'links' },
  { id: 'ac-002', pattern: /\b(the\s+red|the\s+green|the\s+blue)\s+(button|text|icon|link)\b/gi, severity: 'warning', rule: 'Avoid color-only references', suggestion: 'Add label in addition to color', category: 'color' },
  { id: 'ac-003', pattern: /\b(see\s+the\s+image|as\s+shown|look\s+at\s+the\s+picture)\b/gi, severity: 'warning', rule: 'Provide text alternatives', suggestion: 'Describe visual content', category: 'visual' },
  { id: 'ac-004', pattern: /\b(simply|just|easy|obvious)\b/gi, severity: 'warning', rule: 'Avoid minimizing complexity', suggestion: 'Remove minimizing word', category: 'minimizing' },
  { id: 'ac-005', pattern: /[A-Z]{5,}/g, severity: 'warning', rule: 'Avoid all-caps text (hard to read)', suggestion: 'Use sentence case', category: 'readability' },
  { id: 'ac-006', pattern: /[!?]{2,}/g, severity: 'warning', rule: 'Avoid multiple exclamation/question marks', suggestion: 'Use single punctuation', category: 'punctuation' },
  { id: 'ac-007', pattern: /\b(swipe|drag|pinch|long[\s-]?press)\b/gi, severity: 'warning', rule: 'Describe action outcome, not gesture', suggestion: 'Describe what happens, not gesture', category: 'gesture' },
  { id: 'ac-008', pattern: /\b(above|below|left|right)\s+(section|panel|area)\b/gi, severity: 'warning', rule: 'Avoid spatial references', suggestion: 'Use element name instead', category: 'spatial' },
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
