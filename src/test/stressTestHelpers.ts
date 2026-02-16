/**
 * Stress Test Helpers
 * 
 * Generators and utilities for comprehensive stress testing of:
 * - Auto-fix engine
 * - Token enforcement
 * - Knowledge base
 * - Content generation pipeline
 * 
 * @module test/stressTestHelpers
 */

import type { Violation, ViolationSeverity } from '../types';
import type { ActiveTokens } from '../services/tokens/tokenTypes';

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All 157+ replacement keys from autoFixEngine.ts REPLACEMENTS dictionary
 * This is the complete list of words that should be auto-fixable
 */
export const ALL_REPLACEMENT_KEYS = [
  // Gender-neutral terms
  'chairman', 'chairwoman', 'fireman', 'policeman', 'mailman', 'businessman',
  'businesswoman', 'mankind', 'manpower', 'housewife', 'housewives',
  'stewardess', 'steward', 'waitress', 'waiter', 'actress', 'salesman',
  'saleswoman', 'workman', 'craftsman', 'foreman', 'spokesman', 'spokeswoman',
  
  // Disability-inclusive
  'wheelchair-bound', 'wheelchair bound', 'the disabled', 'handicapped',
  
  // Jargon variants
  'utilize', 'utilise', 'avail', 'availing', 'availed',
  
  // Wordy phrases
  'in order to', 'at this point in time', 'due to the fact that',
  'for the purpose of', 'in the event that', 'with regard to',
  'pursuant to', 'in accordance with', 'as a matter of fact',
  'it should be noted that', 'in lieu of', 'with respect to',
  'pertaining to', 'notwithstanding',
  
  // Marketing jargon (compound phrases)
  'best-in-class', 'best in class', 'world-class', 'world class',
  'state-of-the-art', 'state of the art', 'cutting-edge', 'cutting edge',
  'high-end', 'high end', 'tech-savvy', 'tech savvy',
  'low-hanging fruit', 'low hanging fruit',
  
  // Single-word buzzwords
  'synergy', 'paradigm', 'bandwidth', 'seamless', 'frictionless',
  'robust', 'scalable',
  
  // Multi-word phrases
  'deep dive', 'deep-dive', 'circle back', 'circle-back',
  'touch base', 'touch-base', 'move the needle',
  
  // Verb variants - streamline
  'streamline', 'streamlined', 'streamlining', 'streamlines',
  
  // Verb variants - optimize
  'optimize', 'optimized', 'optimizing', 'optimizes',
  
  // Verb variants - leverage
  'leverage', 'leveraged', 'leveraging', 'leverages',
  
  // Verb variants - utilize
  'utilized', 'utilizing', 'utilizes',
  
  // Verb variants - maximize/minimize
  'maximize', 'maximized', 'maximizing', 'maximizes',
  'minimize', 'minimized', 'minimizing', 'minimizes',
  
  // Verb variants - prioritize
  'prioritize', 'prioritized', 'prioritizing', 'prioritizes',
  
  // Verb variants - incentivize
  'incentivize', 'incentivized', 'incentivizing', 'incentivizes',
  
  // Verb variants - onboard
  'onboard', 'onboarded', 'onboarding', 'onboards',
  
  // Verb variants - sync
  'sync', 'synced', 'syncing', 'syncs',
  
  // Robotic phrases
  'please note', 'be advised', 'kindly', 'hereby',
  'furthermore', 'moreover', 'henceforth', 'aforementioned',
  
  // Accessibility
  'click here', 'tap here',
  
  // Brand
  'jio', 'JIO',
  
  // Currency
  'Rs.', 'Rs ', 'INR ',
  
  // British spellings (American -> British)
  'color', 'favorite', 'organize', 'realize', 'recognize',
  'customize', 'center', 'behavior', 'analyze', 'canceled',
];

/**
 * Categories of avoid words (~350 total)
 */
export const AVOID_WORD_CATEGORIES = {
  COMPLEX_WORDS: [
    'utilize', 'facilitate', 'leverage', 'synergy', 'paradigm',
    'optimize', 'streamline', 'maximize', 'incentivize', 'prioritize',
    'bandwidth', 'deliverable', 'actionable', 'scalable', 'robust',
    'holistic', 'proactive', 'disruptive', 'innovative', 'cutting-edge',
    'best-in-class', 'state-of-the-art', 'world-class', 'game-changing',
    'groundbreaking', 'revolutionary', 'unprecedented', 'seamless',
  ],
  ROBOTIC_WORDS: [
    'please note', 'be advised', 'kindly note', 'hereby', 'henceforth',
    'aforementioned', 'herein', 'therein', 'wherein', 'pursuant',
    'notwithstanding', 'in accordance with', 'in compliance with',
    'it should be noted', 'we wish to inform', 'please be informed',
    'for your information', 'as per our records', 'further to',
  ],
  FEAR_BASED: [
    'urgent', 'hurry', 'last chance', 'only X left', 'act now',
    'limited time', 'expires soon', 'don\'t miss out', 'FOMO',
    'final warning', 'immediate action required', 'deadline',
    'running out', 'selling fast', 'almost gone',
  ],
  BUREAUCRATIC: [
    'pursuant to', 'in accordance with', 'notwithstanding',
    'heretofore', 'wherefore', 'thereto', 'herewith',
    'forthwith', 'inasmuch as', 'insofar as',
  ],
  TECHNICAL: [
    'ping us', 'bandwidth', 'sync', 'dashboard', 'interface',
    'algorithm', 'iterate', 'deploy', 'debug', 'optimize',
    'parameter', 'configure', 'initialize', 'cache', 'backend',
  ],
  SHAME_INDUCING: [
    'you forgot', 'you missed', 'you failed to', 'your fault',
    'your mistake', 'you should have', 'why didn\'t you',
    'unfortunately you', 'regrettably you',
  ],
  ELITIST: [
    'tech-savvy', 'power-user', 'premium living', 'luxury lifestyle',
    'discerning customers', 'highly motivated', 'exclusive access',
    'VIP only', 'elite members',
  ],
  MARKETING_JARGON: [
    'synergy', 'leverage', 'disrupt', 'pivot', 'ecosystem',
    'value proposition', 'pain point', 'low-hanging fruit',
    'deep dive', 'circle back', 'touch base', 'move the needle',
  ],
};

/**
 * Generate content with a specific number of violations
 */
export function generateContentWithViolations(count: number): string {
  const words = ALL_REPLACEMENT_KEYS.slice(0, Math.min(count, ALL_REPLACEMENT_KEYS.length));
  
  // Build sentences using the violation words
  const sentences: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Create varied sentence structures
    const templates = [
      `We should ${word} our approach.`,
      `The team will ${word} the process.`,
      `Please ${word} the system.`,
      `Our ${word} strategy is effective.`,
      `We need to ${word} immediately.`,
    ];
    sentences.push(templates[i % templates.length]);
  }
  
  // If we need more violations than unique words, repeat
  while (sentences.length < count) {
    const idx = sentences.length % ALL_REPLACEMENT_KEYS.length;
    sentences.push(`Additionally, we should ${ALL_REPLACEMENT_KEYS[idx]} our efforts.`);
  }
  
  return sentences.join(' ');
}

/**
 * Generate large content of specified size in KB
 */
export function generateLargeContent(sizeKB: number, violationDensity: number = 0.1): string {
  const targetSize = sizeKB * 1024;
  const filler = 'This is sample content for testing purposes. ';
  const violationWords = ALL_REPLACEMENT_KEYS;
  
  let content = '';
  let violationIndex = 0;
  
  while (content.length < targetSize) {
    // Add filler
    content += filler;
    
    // Occasionally add a violation (based on density)
    if (Math.random() < violationDensity && violationIndex < violationWords.length) {
      content += `We should ${violationWords[violationIndex]} this. `;
      violationIndex++;
    }
  }
  
  return content.slice(0, targetSize);
}

/**
 * Generate a batch of violations programmatically
 */
export function generateViolationBatch(count: number): Violation[] {
  const violations: Violation[] = [];
  const severities: ViolationSeverity[] = ['error', 'warning', 'info'];
  
  for (let i = 0; i < count; i++) {
    const word = ALL_REPLACEMENT_KEYS[i % ALL_REPLACEMENT_KEYS.length];
    violations.push({
      severity: severities[i % 3],
      rule: `Avoid "${word}"`,
      text: word,
      suggestion: `Replace with simpler alternative`,
      category: 'avoid_words',
      position: { start: i * 20, end: i * 20 + word.length },
      autoFixable: true,
    });
  }
  
  return violations;
}

/**
 * Generate overlapping violations for dedup testing
 */
export function generateOverlappingViolations(count: number): Violation[] {
  const violations: Violation[] = [];
  
  for (let i = 0; i < count; i++) {
    // Create pairs of overlapping violations at same position
    violations.push({
      severity: i % 2 === 0 ? 'error' : 'warning',
      rule: `Rule A - Position ${i}`,
      text: 'overlap',
      suggestion: 'fix A',
      category: 'category_a',
      position: { start: i * 10, end: i * 10 + 7 },
      autoFixable: true,
    });
    
    violations.push({
      severity: i % 2 === 0 ? 'warning' : 'error',
      rule: `Rule B - Position ${i}`,
      text: 'overlap',
      suggestion: 'fix B',
      category: 'category_b',
      position: { start: i * 10, end: i * 10 + 7 },
      autoFixable: true,
    });
  }
  
  return violations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All possible token keys
 */
export const ALL_TOKEN_KEYS = [
  'route.mode', 'route.confidence', 'route.trigger',
  'safety.domain', 'safety.level', 'advice.boundary',
  'nudge.permission', 'nudge.relevance', 'nudge.sensitivity_override',
  'emotion.rasa.user', 'emotion.intensity', 'emotion.target',
  'channel', 'ecosystem',
  'user.intent', 'user.profile',
  'context.time', 'context.location',
  'conversation.turn_count', 'conversation.state',
  'persona', 'lang',
];

/**
 * Safety domains for testing
 */
export const SAFETY_DOMAINS = [
  'none', 'health_general', 'self_harm', 'suicide_risk', 'violence',
  'health_emergency', 'fraud_scam', 'financial_advice', 'legal_advice',
  'dangerous_activities', 'harassment', 'hate_speech', 'explicit_content',
];

/**
 * Safety levels for testing
 */
export const SAFETY_LEVELS = ['none', 'low', 'moderate', 'high', 'critical'];

/**
 * Navarasa emotions for testing
 */
export const NAVARASA_EMOTIONS = [
  'shringara', 'hasya', 'karuna', 'raudra', 'vira',
  'bhayanak', 'bibhatsa', 'adbhuta', 'shanta',
];

/**
 * Channel types for testing
 */
export const CHANNELS = [
  'app_chat', 'whatsapp', 'sms', 'push_notification',
  'ivr_voice', 'marketing_email', 'transactional_email',
];

/**
 * Generate tokens with all fields populated
 */
export function generateAllTokensCombination(): Partial<ActiveTokens> {
  return {
    'route.mode': 'open_chat',
    'route.confidence': 'high',
    'safety.domain': 'none',
    'safety.level': 'none',
    'nudge.permission': 'contextual_soft',
    'emotion.rasa.user': 'shanta',
    'emotion.intensity': 'low',
    'channel': 'app_chat',
    'ecosystem': 'connectivity',
    'user.intent': 'ask_information',
    'persona': 'jio_friend',
    'lang': 'english',
    'conversation.turn_count': 1,
  };
}

/**
 * Generate conflicting tokens for priority testing
 */
export function generateConflictingTokens(): Partial<ActiveTokens> {
  return {
    'safety.level': 'critical',        // Priority 100
    'safety.domain': 'self_harm',      // Should block
    'emotion.rasa.user': 'raudra',     // Priority 70 (angry)
    'nudge.permission': 'blocked',     // Priority 80
    'channel': 'sms',                  // Length constraint
  };
}

/**
 * Generate safety tokens at specified level
 */
export function generateSafetyTokens(
  domain: string,
  level: string
): Partial<ActiveTokens> {
  return {
    'safety.domain': domain as ActiveTokens['safety.domain'],
    'safety.level': level as ActiveTokens['safety.level'],
    'route.mode': 'open_chat',
    'channel': 'app_chat',
  };
}

/**
 * Generate emotion tokens
 */
export function generateEmotionTokens(
  emotion: string,
  intensity: 'low' | 'moderate' | 'high' = 'moderate'
): Partial<ActiveTokens> {
  return {
    'emotion.rasa.user': emotion as ActiveTokens['emotion.rasa.user'],
    'emotion.intensity': intensity,
    'route.mode': 'open_chat',
    'channel': 'app_chat',
  };
}

/**
 * Generate channel-specific tokens
 */
export function generateChannelTokens(channel: string): Partial<ActiveTokens> {
  return {
    'channel': channel as ActiveTokens['channel'],
    'route.mode': 'open_chat',
    'safety.level': 'none',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Knowledge item types
 */
export const KNOWLEDGE_TYPES = [
  'avoid_word', 'preferred_word', 'auto_fix',
  'approved_example', 'product_definition', 'festival',
];

/**
 * Generate knowledge items for testing
 */
export function generateKnowledgeItems(
  count: number,
  type: string = 'avoid_word'
): Array<{ content: string; category: string; type: string; metadata?: Record<string, string> }> {
  const items: Array<{ content: string; category: string; type: string; metadata?: Record<string, string> }> = [];
  
  for (let i = 0; i < count; i++) {
    if (type === 'avoid_word') {
      items.push({
        content: `dynamic_avoid_word_${i}`,
        category: 'dynamic',
        type: 'avoid_word',
      });
    } else if (type === 'auto_fix') {
      items.push({
        content: `fix_from_${i}`,
        category: 'dynamic',
        type: 'auto_fix',
        metadata: { suggestion: `fix_to_${i}` },
      });
    } else if (type === 'preferred_word') {
      items.push({
        content: `preferred_${i}`,
        category: 'vocabulary',
        type: 'preferred_word',
      });
    } else {
      items.push({
        content: `knowledge_item_${i}`,
        category: type,
        type,
      });
    }
  }
  
  return items;
}

/**
 * Generate dynamic avoid words
 */
export function generateDynamicAvoidWords(count: number): Array<{ content: string; category: string; severity?: string }> {
  return Array.from({ length: count }, (_, i) => ({
    content: `dynamic_avoid_${i}`,
    category: 'dynamic',
    severity: i % 3 === 0 ? 'error' : 'warning',
  }));
}

/**
 * Generate dynamic auto-fix rules
 */
export function generateDynamicAutoFixRules(count: number): Array<{ from: string; to: string }> {
  return Array.from({ length: count }, (_, i) => ({
    from: `dynamic_from_${i}`,
    to: `dynamic_to_${i}`,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Measure execution time of a synchronous function
 */
export function measureTime<T>(fn: () => T): { result: T; timeMs: number } {
  const start = performance.now();
  const result = fn();
  const timeMs = performance.now() - start;
  return { result, timeMs };
}

/**
 * Measure execution time of an async function
 */
export async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
  const start = performance.now();
  const result = await fn();
  const timeMs = performance.now() - start;
  return { result, timeMs };
}

/**
 * Run function multiple times and collect timing stats
 */
export async function benchmarkAsync<T>(
  fn: () => Promise<T>,
  iterations: number = 10
): Promise<{
  results: T[];
  times: number[];
  avgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
}> {
  const results: T[] = [];
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const { result, timeMs } = await measureTimeAsync(fn);
    results.push(result);
    times.push(timeMs);
  }
  
  times.sort((a, b) => a - b);
  
  return {
    results,
    times,
    avgMs: times.reduce((a, b) => a + b, 0) / times.length,
    minMs: times[0],
    maxMs: times[times.length - 1],
    p95Ms: times[Math.floor(times.length * 0.95)],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAP ANALYSIS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface GapFinding {
  area: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  affectedCode?: string;
}

export interface StressTestReport {
  timestamp: Date;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  performance: {
    avgTimeMs: number;
    maxTimeMs: number;
    p95TimeMs: number;
  };
  gaps: GapFinding[];
  coverage: {
    autoFix: { total: number; covered: number };
    tokens: { total: number; covered: number };
    knowledge: { total: number; covered: number };
  };
}
