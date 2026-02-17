/**
 * Gender Neutrality Agent
 * Training 1.pdf lines 1743-1785
 */

import type { ValidationAgent, PatternRule } from '../types';
import { runPatterns, calculateScore } from './helpers';

const GENDER_PATTERNS: PatternRule[] = [
  // Job titles
  { id: 'gn-001', pattern: /\b(chairman|chairwoman)\b/gi, severity: 'error', rule: 'Use gender-neutral job titles', suggestion: 'chairperson', category: 'job_titles' },
  { id: 'gn-002', pattern: /\b(businessman|businesswoman)\b/gi, severity: 'error', rule: 'Use gender-neutral job titles', suggestion: 'businessperson', category: 'job_titles' },
  { id: 'gn-003', pattern: /\b(fireman|policeman|mailman)\b/gi, severity: 'error', rule: 'Use gender-neutral job titles', suggestion: 'firefighter, police officer, mail carrier', category: 'job_titles' },
  { id: 'gn-004', pattern: /\b(mankind)\b/gi, severity: 'warning', rule: 'Use inclusive terms', suggestion: 'humankind', category: 'generic_terms' },
  { id: 'gn-005', pattern: /\b(manpower)\b/gi, severity: 'warning', rule: 'Use inclusive terms', suggestion: 'workforce', category: 'generic_terms' },
  // Greetings
  { id: 'gn-006', pattern: /\bDear Sir\b/gi, severity: 'error', rule: 'Use gender-neutral greetings', suggestion: 'Hello, Welcome, or Namaste', category: 'greetings' },
  { id: 'gn-007', pattern: /\bDear Madam\b/gi, severity: 'error', rule: 'Use gender-neutral greetings', suggestion: 'Hello, Welcome, or Namaste', category: 'greetings' },
  { id: 'gn-008', pattern: /\bDear Sir\/Madam\b/gi, severity: 'warning', rule: 'Use gender-neutral greetings', suggestion: 'Hello, Welcome, or Namaste', category: 'greetings' },
  // Pronouns
  { id: 'gn-009', pattern: /\b(he can now enjoy|she can now enjoy)\b/gi, severity: 'warning', rule: 'Use gender-neutral pronouns', suggestion: 'They can now enjoy', category: 'pronouns' },
  { id: 'gn-010', pattern: /\b(housewives)\b/gi, severity: 'error', rule: 'Use inclusive terms', suggestion: 'caregivers or homemakers', category: 'stereotypes' },
  { id: 'gn-011', pattern: /\b(working woman|working women)\b/gi, severity: 'warning', rule: 'Avoid gendered labels', suggestion: 'professional or working person', category: 'stereotypes' },
  { id: 'gn-012', pattern: /\b(man up)\b/gi, severity: 'error', rule: 'Avoid gendered idioms', suggestion: 'be brave, step up', category: 'idioms' },
  { id: 'gn-013', pattern: /\b(old wives['\u2019] tale)\b/gi, severity: 'warning', rule: 'Avoid gendered idioms', suggestion: 'common myth, misconception', category: 'idioms' },
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
