/**
 * Avoid Words Validation Agent
 * 
 * Validates content against the comprehensive avoid words library.
 * Uses word-boundary matching to avoid false positives.
 * 
 * This agent covers ~283 words across 7 categories:
 * - Complex words (jargon, unnecessary complexity)
 * - Robotic words (automated-sounding, impersonal)
 * - Fear-based words (urgency pressure, FOMO triggers)
 * - Bureaucratic words (legal-sounding, process-heavy)
 * - Technical words (dev jargon, system terms)
 * - Shame-inducing words (blame, judgment)
 * - Elitist words (tech elitism, exclusionary)
 * 
 * Note: Deduplication of violations (when the same word is caught by both
 * this agent and a regex agent like style_consistency) is handled at the
 * pipeline level, not in this agent.
 */

import { scanForAvoidWords } from '../../guidelines/avoidWords';
import type { ValidationAgent, ValidationViolation } from '../types';

/**
 * Category-specific suggestions for replacement
 */
const CATEGORY_SUGGESTIONS: Record<string, string> = {
  'Complex Words': 'Use simpler, everyday language',
  'Robotic Words': 'Use more natural, human language',
  'Fear-Based Words': 'Use a calmer, reassuring tone',
  'Bureaucratic Words': 'Use plain, friendly language',
  'Technical Words': 'Use non-technical terms that anyone can understand',
  'Shame-Inducing Words': 'Use encouraging, supportive language',
  'Elitist Words': 'Use inclusive language for all users',
};

/**
 * Specific word replacements for common avoid words
 * These are high-confidence, safe replacements
 */
const WORD_ALTERNATIVES: Record<string, string> = {
  // Complex words
  'avail': 'get, claim, or use',
  'availing': 'getting, claiming, or using',
  'availed': 'got, claimed, or used',
  'utilize': 'use',
  'leverage': 'use, or make the most of',
  'synergy': 'work together, or combine',
  'paradigm': 'approach, or model',
  'bandwidth': 'time, capacity, or internet speed',
  'facilitate': 'help, or enable',
  'deep dive': 'look closely at, or explore',
  'circle back': 'follow up, or check again',
  'touch base': 'connect, or check in',
  'move the needle': 'make progress, or improve',
  'low-hanging fruit': 'easy wins, or quick improvements',
  
  // Robotic words
  'as per our records': 'according to your account',
  'for your reference': 'for you',
  'please note': '(often can be removed entirely)',
  'be advised': '(often can be removed entirely)',
  
  // Fear-based words
  'urgent': 'important',
  'hurry': 'act soon',
  'rush': 'timely',
  'last chance': 'ending soon',
  'final warning': 'reminder',
  'act now': 'get started',
  'limited time': 'available until [date]',
  "don't miss": 'you can enjoy',
  "don't miss out": 'here for you',
  
  // Bureaucratic words
  'terms and conditions apply': '*T&C apply (and link to terms)',
  'subject to': 'based on, or depending on',
  'pursuant to': 'following, or as per',
  'in accordance with': 'following, or as per',
  
  // Technical words
  'backend': 'system',
  'frontend': 'app, or website',
  'API': '(remove or explain)',
  'cache': 'stored data',
  'authenticate': 'sign in, or verify',
  'endpoint': '(remove or explain)',
  
  // Shame-inducing words
  'you forgot': 'reminder:',
  'you missed': 'you can still',
  'you failed': 'something went wrong',
  'your fault': 'something went wrong',
  'your mistake': 'let us help',
  'obviously': '(remove entirely)',
  'clearly': '(remove entirely)',
  'simply': '(remove entirely - often condescending)',
  
  // Elitist words
  'tech-savvy': 'users',
  'power user': 'users',
  'premium': 'special, or exclusive',
  'exclusive': 'special',
  'elite': 'special',
  'VIP': 'valued',
  'invite-only': 'now available to everyone',
};

/**
 * Get the best suggestion for a detected word
 */
function getSuggestion(word: string, category: string): string {
  const lowerWord = word.toLowerCase();
  
  // Check for specific word alternative first
  if (WORD_ALTERNATIVES[lowerWord]) {
    return `Replace "${word}" with: ${WORD_ALTERNATIVES[lowerWord]}`;
  }
  
  // Fall back to category-level suggestion
  return CATEGORY_SUGGESTIONS[category] || 'Use simpler, friendlier language';
}

/**
 * Check if a word has a known alternative (for autoFixable flag)
 */
function hasKnownAlternative(word: string): boolean {
  return word.toLowerCase() in WORD_ALTERNATIVES;
}

/**
 * Avoid Words Validation Agent
 * 
 * Scans content for words that should be avoided per Jio content guidelines.
 * Uses word-boundary matching to prevent false positives.
 */
export const avoidWordsAgent: ValidationAgent = {
  id: 'avoid_words',
  name: 'Avoid Words',
  description: 'Detects words/phrases that should be avoided per content guidelines',
  weight: 10,
  patterns: [], // We use scanForAvoidWords instead of PatternRule[]

  runPatternValidation(content: string): ValidationViolation[] {
    const detected = scanForAvoidWords(content);
    
    return detected.map(item => ({
      severity: item.severity,
      rule: `Avoid "${item.word}" (${item.category})`,
      text: item.word,
      suggestion: getSuggestion(item.word, item.category),
      category: item.category.toLowerCase().replace(/\s+/g, '_'),
      position: {
        start: item.position.start,
        end: item.position.end,
      },
      autoFixable: hasKnownAlternative(item.word),
      agentId: 'avoid_words' as const,
    }));
  },

  calculateScore(violations: ValidationViolation[]): number {
    if (violations.length === 0) return 100;
    
    let deduction = 0;
    for (const v of violations) {
      // Deduction based on severity
      deduction += v.severity === 'error' ? 15 : v.severity === 'warning' ? 7 : 3;
    }
    
    return Math.max(0, 100 - deduction);
  },
};

export default avoidWordsAgent;
