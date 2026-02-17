/**
 * Readability Agent
 * Training 1.pdf - Grade 8 Readability Requirement
 */

import type { ValidationAgent, PatternRule, ValidationViolation } from '../types';
import { runPatterns } from './helpers';

/**
 * Count syllables in a word (approximate)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  const matches = word.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 1;
  
  if (word.endsWith('e') && count > 1) count--;
  if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) count++;
  
  return Math.max(1, count);
}

/**
 * Calculate Flesch-Kincaid Grade Level
 */
function calculateFleschKincaidGrade(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);
  
  const words = text.split(/\s+/).filter(w => w.replace(/[^a-zA-Z]/g, '').length > 0);
  const wordCount = Math.max(1, words.length);
  
  let syllableCount = 0;
  for (const word of words) {
    syllableCount += countSyllables(word);
  }
  
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;
  
  const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  
  return Math.max(0, Math.round(gradeLevel * 10) / 10);
}

const READABILITY_PATTERNS: PatternRule[] = [
  { id: 'rd-001', pattern: /(?:[^\s.!?]+\s+){25,}[^\s.!?]+[.!?]/g, severity: 'warning', rule: 'Sentence too long', suggestion: 'Break into shorter sentences (max 20 words)', category: 'sentence_length' },
  { id: 'rd-002', pattern: /\b[a-zA-Z]{15,}\b/g, severity: 'info', rule: 'Complex word detected', suggestion: 'Consider simpler alternative', category: 'word_complexity' },
  { id: 'rd-003', pattern: /[^.!?]*,[^.!?]*,[^.!?]*,[^.!?]*[.!?]/g, severity: 'info', rule: 'Complex sentence structure', suggestion: 'Simplify or break into multiple sentences', category: 'sentence_structure' },
];

export const readabilityAgent: ValidationAgent = {
  id: 'readability',
  name: 'Readability',
  description: 'Ensures content is readable at Grade 8 level (Training 1.pdf requirement)',
  weight: 12,
  patterns: READABILITY_PATTERNS,
  
  runPatternValidation: (content: string): ValidationViolation[] => {
    const violations: ValidationViolation[] = [];
    
    const patternViolations = runPatterns(content, READABILITY_PATTERNS, 'readability');
    violations.push(...patternViolations);
    
    const grade = calculateFleschKincaidGrade(content);
    
    if (grade > 8) {
      violations.push({
        severity: grade > 10 ? 'error' : 'warning',
        rule: `Content readability is Grade ${grade} (target: ≤Grade 8)`,
        text: `Readability: Grade ${grade}`,
        suggestion: 'Use shorter sentences and simpler words to reach Grade 8 readability',
        category: 'readability_score',
        position: { start: 0, end: content.length },
        autoFixable: false,
        agentId: 'readability',
      });
    }
    
    return violations;
  },
  
  calculateScore: (violations: ValidationViolation[]): number => {
    if (violations.length === 0) return 100;
    
    let deduction = 0;
    for (const v of violations) {
      if (v.category === 'readability_score') {
        deduction += v.severity === 'error' ? 30 : 15;
      } else {
        deduction += v.severity === 'error' ? 10 : v.severity === 'warning' ? 5 : 2;
      }
    }
    
    return Math.max(0, 100 - deduction);
  },
};
