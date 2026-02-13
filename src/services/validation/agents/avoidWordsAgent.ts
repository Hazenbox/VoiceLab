/**
 * Avoid Words Validation Agent
 * 
 * Validates content against the comprehensive avoid words library.
 * Uses word-boundary matching to avoid false positives.
 * 
 * This agent covers ~350 words across 10 categories:
 * - Complex words (jargon, unnecessary complexity)
 * - Robotic words (automated-sounding, impersonal)
 * - Fear-based words (urgency pressure, FOMO triggers)
 * - Bureaucratic words (legal-sounding, process-heavy)
 * - Technical words (dev jargon, system terms)
 * - Shame-inducing words (blame, judgment)
 * - Elitist words (tech elitism, exclusionary)
 * - Marketing jargon (buzzwords)
 * - American spellings (should use British)
 * - Incorrect formats (currency, numbers)
 * 
 * Now supports dynamic avoid words from Convex knowledge base.
 * 
 * Note: Deduplication of violations (when the same word is caught by both
 * this agent and a regex agent like style_consistency) is handled at the
 * pipeline level, not in this agent.
 */

import { scanForAvoidWords } from '../../guidelines/avoidWords';
import { SIMPLE_ALTERNATIVES, GENDER_NEUTRAL_ALTERNATIVES } from '../../guidelines/vocabulary';
import type { ValidationAgent, ValidationViolation } from '../types';

/**
 * Dynamic avoid words injected from Convex (set at runtime)
 * This allows admin-added rules to be used in validation
 */
let dynamicAvoidWords: Array<{ word: string; category: string; severity: 'error' | 'warning' | 'info' }> = [];

/**
 * Set dynamic avoid words from Convex knowledge base
 * Called from App.tsx before validation runs
 */
export function setDynamicAvoidWords(
  words: Array<{ content: string; category: string; severity?: string }>
): void {
  dynamicAvoidWords = words.map(w => ({
    word: w.content,
    category: w.category || 'dynamic',
    severity: (w.severity as 'error' | 'warning' | 'info') || 'warning',
  }));
  console.log(`[AvoidWordsAgent] Loaded ${dynamicAvoidWords.length} dynamic avoid words from Convex`);
}

/**
 * Clear dynamic avoid words (for testing/cleanup)
 */
export function clearDynamicAvoidWords(): void {
  dynamicAvoidWords = [];
}

/**
 * Scan content for dynamic avoid words (from Convex)
 */
function scanForDynamicAvoidWords(text: string): Array<{
  word: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  position: { start: number; end: number };
}> {
  if (dynamicAvoidWords.length === 0) return [];
  
  const results: Array<{
    word: string;
    category: string;
    severity: 'error' | 'warning' | 'info';
    position: { start: number; end: number };
  }> = [];
  
  for (const avoidWord of dynamicAvoidWords) {
    // Use word boundary regex to avoid false positives
    const escapedWord = avoidWord.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      results.push({
        word: match[0],
        category: avoidWord.category,
        severity: avoidWord.severity,
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    }
  }
  
  return results;
}

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
 * 
 * MERGED FROM:
 * 1. SIMPLE_ALTERNATIVES from vocabulary.ts (24 terms)
 * 2. GENDER_NEUTRAL_ALTERNATIVES from vocabulary.ts (17 terms)
 * 3. Agent-specific alternatives below (for terms not in vocabulary)
 */
const WORD_ALTERNATIVES: Record<string, string> = {
  // === Import all alternatives from vocabulary.ts (SINGLE SOURCE OF TRUTH) ===
  ...SIMPLE_ALTERNATIVES,
  ...GENDER_NEUTRAL_ALTERNATIVES,
  
  // === Agent-specific alternatives (not in vocabulary.ts) ===
  
  // Complex words (additional)
  'avail': 'get, claim, or use',
  'availing': 'getting, claiming, or using',
  'availed': 'got, claimed, or used',
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
    // Scan for static avoid words (from code defaults)
    const staticDetected = scanForAvoidWords(content);
    
    // Scan for dynamic avoid words (from Convex)
    const dynamicDetected = scanForDynamicAvoidWords(content);
    
    // Combine results, avoiding duplicates based on position
    const seenPositions = new Set<string>();
    const allViolations: ValidationViolation[] = [];
    
    // Process static detections first
    for (const item of staticDetected) {
      const posKey = `${item.position.start}-${item.position.end}`;
      if (!seenPositions.has(posKey)) {
        seenPositions.add(posKey);
        allViolations.push({
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
        });
      }
    }
    
    // Process dynamic detections (from Convex)
    for (const item of dynamicDetected) {
      const posKey = `${item.position.start}-${item.position.end}`;
      if (!seenPositions.has(posKey)) {
        seenPositions.add(posKey);
        allViolations.push({
          severity: item.severity,
          rule: `Avoid "${item.word}" (${item.category} - dynamic)`,
          text: item.word,
          suggestion: getSuggestion(item.word, item.category),
          category: item.category.toLowerCase().replace(/\s+/g, '_'),
          position: {
            start: item.position.start,
            end: item.position.end,
          },
          autoFixable: hasKnownAlternative(item.word),
          agentId: 'avoid_words' as const,
        });
      }
    }
    
    return allViolations;
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

// Export functions for external use
export { setDynamicAvoidWords, clearDynamicAvoidWords };
