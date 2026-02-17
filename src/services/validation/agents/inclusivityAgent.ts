/**
 * Inclusivity Agent
 * Training 1.pdf - Elitism + Disability, lines 1786-1838
 */

import type { ValidationAgent, PatternRule } from '../types';
import { runPatterns, calculateScore } from './helpers';

const INCLUSIVITY_PATTERNS: PatternRule[] = [
  // Assumptions
  { id: 'in-001', pattern: /\b(obviously|clearly|simply)\s+(you|anyone)\s+(can|should)\b/gi, severity: 'warning', rule: 'Avoid assumptions', suggestion: 'Remove qualifiers', category: 'assumptions' },
  
  // Disability-inclusive language
  { id: 'in-002', pattern: /\b(wheelchair[-\s]?bound)\b/gi, severity: 'error', rule: 'Use person-first language', suggestion: 'wheelchair user', category: 'disability' },
  { id: 'in-003', pattern: /\b(the disabled)\b/gi, severity: 'error', rule: 'Use person-first language', suggestion: 'people with disabilities', category: 'disability' },
  { id: 'in-004', pattern: /\b(suffers from|afflicted with)\b/gi, severity: 'warning', rule: 'Use neutral language', suggestion: 'has, lives with', category: 'disability' },
  { id: 'in-005', pattern: /\b(handicapped)\b/gi, severity: 'error', rule: 'Use person-first language', suggestion: 'person with a disability', category: 'disability' },
  { id: 'in-006', pattern: /\b(crippled)\b/gi, severity: 'error', rule: 'Use respectful language', suggestion: 'person with mobility difference', category: 'disability' },
  { id: 'in-007', pattern: /\b(deaf and dumb)\b/gi, severity: 'error', rule: 'Use respectful language', suggestion: 'Deaf person or non-speaking person', category: 'disability' },
  { id: 'in-008', pattern: /\b(mentally retarded)\b/gi, severity: 'error', rule: 'Use respectful language', suggestion: 'person with intellectual disability', category: 'disability' },
  { id: 'in-009', pattern: /\b(normal person)\b/gi, severity: 'warning', rule: 'Avoid normalizing language', suggestion: 'non-disabled person', category: 'disability' },
  
  // Anti-elitism patterns
  { id: 'in-010', pattern: /\b(tech[-\s]?savvy|power[-\s]?user)\b/gi, severity: 'warning', rule: 'Avoid tech elitism', suggestion: 'Remove term or use "user"', category: 'elitism' },
  { id: 'in-011', pattern: /\b(ping us)\b/gi, severity: 'warning', rule: 'Use everyday language', suggestion: 'message us', category: 'elitism' },
  { id: 'in-012', pattern: /\b(\d+)\s*bucks\b/gi, severity: 'warning', rule: 'Use Indian currency format', suggestion: '₹[amount]', category: 'elitism' },
  { id: 'in-013', pattern: /\bon[-\s]?the[-\s]?go\b/gi, severity: 'info', rule: 'Use simpler language', suggestion: 'anytime, anywhere', category: 'elitism' },
  { id: 'in-014', pattern: /\b(go to your dashboard)\b/gi, severity: 'warning', rule: 'Use simpler language', suggestion: 'open your account', category: 'elitism' },
  { id: 'in-015', pattern: /\b(premium living|luxury lifestyle)\b/gi, severity: 'warning', rule: 'Avoid aspirational elitism', suggestion: 'useful features, smart tools', category: 'elitism' },
  { id: 'in-016', pattern: /\b(offer drops)\b/gi, severity: 'info', rule: 'Use clearer language', suggestion: 'offer available now', category: 'elitism' },
  { id: 'in-017', pattern: /\b(steal deal|a steal)\b/gi, severity: 'info', rule: 'Use clearer language', suggestion: 'great value, ₹X off', category: 'elitism' },
  { id: 'in-018', pattern: /\b(initiate onboarding)\b/gi, severity: 'warning', rule: 'Use everyday language', suggestion: "let's get started", category: 'elitism' },
  { id: 'in-019', pattern: /\b(invite[-\s]?only)\b/gi, severity: 'warning', rule: 'Make inclusive', suggestion: 'everyone can try it', category: 'elitism' },
  { id: 'in-020', pattern: /\b(\d{2}):(\d{2})\s*hrs\b/gi, severity: 'info', rule: 'Use 12-hour time format', suggestion: 'X:XX AM/PM', category: 'elitism' },
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
