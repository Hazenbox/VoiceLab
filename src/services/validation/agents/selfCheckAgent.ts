/**
 * Self-Check Validation Agent
 * 
 * Implements the 7 mandatory self-check questions from the
 * Constitutional AI framework that must be answered before
 * delivering any response.
 * 
 * Questions:
 * 1. Is this response safe and legal?
 * 2. Does it respect user emotion and dignity?
 * 3. Does it move the conversation forward?
 * 4. Is it on-brand for Jio?
 * 5. Is cross-sell appropriate right now?
 * 6. Have I verified facts?
 * 7. Should this go to a human?
 * 
 * @module services/validation/agents/selfCheckAgent
 */

import type { SafetyDomain } from '../../constitutional/coreRules';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SelfCheckQuestion {
  id: number;
  question: string;
  shortName: string;
  passed: boolean;
  confidence: number;
  evidence: string[];
  action?: string;
}

export interface SelfCheckResult {
  /** All 7 questions passed */
  allPassed: boolean;
  /** Number of questions passed */
  passedCount: number;
  /** Individual question results */
  questions: SelfCheckQuestion[];
  /** Critical failures (must fix) */
  criticalFailures: SelfCheckQuestion[];
  /** Warnings (should fix) */
  warnings: SelfCheckQuestion[];
  /** Overall confidence score */
  confidence: number;
  /** Summary for logging */
  summary: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELF-CHECK QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const SELF_CHECK_DEFINITIONS = [
  {
    id: 1,
    question: 'Is this response safe and legal?',
    shortName: 'safe_legal',
    critical: true,
    description: 'Response must not contain harmful, illegal, or unsafe content',
  },
  {
    id: 2,
    question: 'Does it respect user emotion and dignity?',
    shortName: 'emotion_dignity',
    critical: true,
    description: 'Response must acknowledge emotion and maintain user dignity',
  },
  {
    id: 3,
    question: 'Does it move the conversation forward?',
    shortName: 'forward_momentum',
    critical: false,
    description: 'Response should progress toward resolution or clarity',
  },
  {
    id: 4,
    question: 'Is it on-brand for Jio?',
    shortName: 'on_brand',
    critical: false,
    description: 'Response follows Jio voice traits and brand guidelines',
  },
  {
    id: 5,
    question: 'Is cross-sell appropriate right now?',
    shortName: 'cross_sell_timing',
    critical: false,
    description: 'Promotional content only after resolution and positive emotion',
  },
  {
    id: 6,
    question: 'Have I verified facts?',
    shortName: 'facts_verified',
    critical: true,
    description: 'No fabricated information or unverified claims',
  },
  {
    id: 7,
    question: 'Should this go to a human?',
    shortName: 'human_handoff',
    critical: true,
    description: 'Complex, sensitive, or escalation-requiring cases need humans',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check 1: Is this response safe and legal?
 */
function checkSafetyLegal(
  content: string,
  safetyDomains: SafetyDomain[]
): SelfCheckQuestion {
  const evidence: string[] = [];
  let passed = true;
  
  // Check for harmful patterns
  const harmfulPatterns = [
    { pattern: /\bhow to (make|create|build)\s+(bomb|weapon|drug)/i, issue: 'Dangerous instructions' },
    { pattern: /\billegal\s+(way|method|approach)/i, issue: 'Illegal advice' },
    { pattern: /\bkill|attack|harm\s+(yourself|someone|people)/i, issue: 'Violence promotion' },
  ];
  
  for (const { pattern, issue } of harmfulPatterns) {
    if (pattern.test(content)) {
      passed = false;
      evidence.push(issue);
    }
  }
  
  // Check if critical safety domains lack appropriate handling
  const criticalDomains = safetyDomains.filter(d => 
    ['self_harm', 'suicide_risk', 'violence', 'child_safety'].includes(d)
  );
  
  if (criticalDomains.length > 0) {
    const hasEmergencyInfo = /helpline|emergency|crisis|professional|immediate/i.test(content);
    if (!hasEmergencyInfo) {
      passed = false;
      evidence.push('Critical safety topic without emergency resources');
    }
  }
  
  if (passed) {
    evidence.push('No harmful content detected');
  }
  
  return {
    id: 1,
    question: 'Is this response safe and legal?',
    shortName: 'safe_legal',
    passed,
    confidence: passed ? 0.9 : 0.3,
    evidence,
    action: passed ? undefined : 'Remove harmful content or add safety resources',
  };
}

/**
 * Check 2: Does it respect user emotion and dignity?
 */
function checkEmotionDignity(
  content: string,
  userEmotion?: string
): SelfCheckQuestion {
  const evidence: string[] = [];
  let passed = true;
  
  // Check for dismissive language
  const dismissivePatterns = [
    /that's (not|no) (big deal|important)/i,
    /just (calm down|relax)/i,
    /don't be (dramatic|silly)/i,
    /you're (overreacting|wrong)/i,
    /whatever/i,
  ];
  
  for (const pattern of dismissivePatterns) {
    if (pattern.test(content)) {
      passed = false;
      evidence.push('Contains dismissive language');
      break;
    }
  }
  
  // Check for blame language
  if (/your fault|you should have|why didn't you/i.test(content)) {
    passed = false;
    evidence.push('Contains blame language');
  }
  
  // Check emotion-specific dignity
  if (userEmotion === 'raudra' || userEmotion === 'karuna') {
    const hasEmpathy = /understand|sorry|apologize|frustrating/i.test(content);
    if (!hasEmpathy) {
      evidence.push('Missing empathy for distressed user');
      // Not a failure, but noted
    }
  }
  
  if (passed) {
    evidence.push('Respects user dignity');
  }
  
  return {
    id: 2,
    question: 'Does it respect user emotion and dignity?',
    shortName: 'emotion_dignity',
    passed,
    confidence: passed ? 0.85 : 0.4,
    evidence,
    action: passed ? undefined : 'Remove dismissive or blame language',
  };
}

/**
 * Check 3: Does it move the conversation forward?
 */
function checkForwardMomentum(content: string): SelfCheckQuestion {
  const evidence: string[] = [];
  let passed = true;
  
  // Check for actionable content
  const hasAction = /you can|here's how|step|next|try|let me know/i.test(content);
  const hasQuestion = /\?/.test(content);
  const hasInfo = /because|this means|the reason/i.test(content);
  
  if (!hasAction && !hasQuestion && !hasInfo) {
    passed = false;
    evidence.push('No clear next step or information');
  }
  
  // Check for circular/unhelpful responses
  if (/i don't know|i can't help|not sure/i.test(content) && 
      !/but.*can|however.*try|alternatively/i.test(content)) {
    passed = false;
    evidence.push('Unhelpful response without alternative');
  }
  
  if (passed) {
    if (hasAction) evidence.push('Provides actionable guidance');
    if (hasQuestion) evidence.push('Asks clarifying question');
    if (hasInfo) evidence.push('Provides useful information');
  }
  
  return {
    id: 3,
    question: 'Does it move the conversation forward?',
    shortName: 'forward_momentum',
    passed,
    confidence: passed ? 0.8 : 0.5,
    evidence,
    action: passed ? undefined : 'Add next step or clarifying question',
  };
}

/**
 * Check 4: Is it on-brand for Jio?
 */
function checkOnBrand(content: string): SelfCheckQuestion {
  const evidence: string[] = [];
  let passed = true;
  
  // Check for off-brand language
  const offBrandPatterns = [
    { pattern: /\bJIO\b/, issue: 'Incorrect Jio capitalization' },
    { pattern: /competitor/i, issue: 'Competitor mention' },
    { pattern: /\bairtel\b|\bvodafone\b/i, issue: 'Competitor brand' },
    { pattern: /\!\!\!|\?\?\?/, issue: 'Excessive punctuation' },
  ];
  
  for (const { pattern, issue } of offBrandPatterns) {
    if (pattern.test(content)) {
      evidence.push(issue);
      // Minor violations don't fail
    }
  }
  
  // Check for brand-positive indicators
  const hasPersonalTone = /you|your|we|our/i.test(content);
  const isSimple = content.split(/\s+/).length / content.split(/[.!?]+/).length < 20; // Avg <20 words/sentence
  
  if (!hasPersonalTone) {
    evidence.push('Missing personal tone (you/we)');
    passed = false;
  }
  
  if (passed && evidence.length === 0) {
    evidence.push('Follows Jio brand voice');
  }
  
  return {
    id: 4,
    question: 'Is it on-brand for Jio?',
    shortName: 'on_brand',
    passed,
    confidence: passed ? 0.85 : 0.6,
    evidence,
    action: passed ? undefined : 'Use personal tone (you/we)',
  };
}

/**
 * Check 5: Is cross-sell appropriate right now?
 */
function checkCrossSellTiming(
  content: string,
  context: { hasUnresolvedIssue?: boolean; userEmotion?: string; isSupport?: boolean }
): SelfCheckQuestion {
  const evidence: string[] = [];
  let passed = true;
  
  // Detect promotional content
  const hasPromotion = /upgrade|offer|deal|discount|plan|subscribe|you might also/i.test(content);
  
  if (!hasPromotion) {
    evidence.push('No promotional content (appropriate)');
    return {
      id: 5,
      question: 'Is cross-sell appropriate right now?',
      shortName: 'cross_sell_timing',
      passed: true,
      confidence: 1.0,
      evidence,
    };
  }
  
  // If there's promotion, check timing
  if (context.hasUnresolvedIssue) {
    passed = false;
    evidence.push('Cross-sell before issue resolution');
  }
  
  if (context.isSupport) {
    evidence.push('Cross-sell in support context (caution)');
    // Warning but not failure
  }
  
  const negativeEmotions = ['raudra', 'karuna', 'bhayanaka', 'bibhatsa'];
  if (context.userEmotion && negativeEmotions.includes(context.userEmotion)) {
    passed = false;
    evidence.push('Cross-sell during negative emotional state');
  }
  
  if (passed) {
    evidence.push('Cross-sell timing appropriate');
  }
  
  return {
    id: 5,
    question: 'Is cross-sell appropriate right now?',
    shortName: 'cross_sell_timing',
    passed,
    confidence: passed ? 0.8 : 0.4,
    evidence,
    action: passed ? undefined : 'Remove promotion until issue resolved',
  };
}

/**
 * Check 6: Have I verified facts?
 */
function checkFactsVerified(content: string): SelfCheckQuestion {
  const evidence: string[] = [];
  let passed = true;
  
  // Check for hedging that suggests uncertainty
  const uncertaintyPatterns = [
    /i think|i believe|probably|maybe|might be|could be|perhaps/i,
    /not sure but|i guess|it seems/i,
  ];
  
  let uncertaintyCount = 0;
  for (const pattern of uncertaintyPatterns) {
    if (pattern.test(content)) {
      uncertaintyCount++;
    }
  }
  
  if (uncertaintyCount > 2) {
    evidence.push('Multiple uncertain statements detected');
    // Note: uncertainty is sometimes appropriate, but multiple instances suggest unverified info
  }
  
  // Check for fabrication indicators
  const fabricationPatterns = [
    /\d{10,}(?![@.])/,  // Very long numbers (might be made up)
    /www\.[a-z]+\.(fake|test|example)/i, // Test URLs
  ];
  
  for (const pattern of fabricationPatterns) {
    if (pattern.test(content)) {
      passed = false;
      evidence.push('Potential fabricated information');
    }
  }
  
  // Check for qualified statements (good sign)
  if (/according to|as of|based on|per the/i.test(content)) {
    evidence.push('Uses qualified statements');
  }
  
  if (passed && evidence.length === 0) {
    evidence.push('No fabrication indicators');
  }
  
  return {
    id: 6,
    question: 'Have I verified facts?',
    shortName: 'facts_verified',
    passed,
    confidence: passed ? 0.75 : 0.3,
    evidence,
    action: passed ? undefined : 'Verify or remove unsubstantiated claims',
  };
}

/**
 * Check 7: Should this go to a human?
 */
function checkHumanHandoff(
  content: string,
  context: {
    safetyDomains?: SafetyDomain[];
    hasUnresolvedIssue?: boolean;
    turnCount?: number;
    errorCount?: number;
  }
): SelfCheckQuestion {
  const evidence: string[] = [];
  let shouldHandoff = false;
  
  // Critical safety domains
  const criticalDomains = ['self_harm', 'suicide_risk', 'violence', 'child_safety'];
  if (context.safetyDomains?.some(d => criticalDomains.includes(d))) {
    shouldHandoff = true;
    evidence.push('Critical safety domain requires human support');
  }
  
  // High turn count
  if (context.turnCount && context.turnCount > 6) {
    evidence.push(`High turn count (${context.turnCount})`);
    if (context.hasUnresolvedIssue) {
      shouldHandoff = true;
    }
  }
  
  // Multiple errors
  if (context.errorCount && context.errorCount >= 2) {
    shouldHandoff = true;
    evidence.push(`Multiple errors (${context.errorCount})`);
  }
  
  // Response indicates need for human
  if (/contact support|speak to (agent|representative)|call us/i.test(content)) {
    evidence.push('Response mentions human contact');
    // This is appropriate
  }
  
  // Check if handoff is offered when needed
  const passed = !shouldHandoff || /human|agent|representative|support team|specialist/i.test(content);
  
  if (!shouldHandoff) {
    evidence.push('No handoff indicators detected');
  }
  
  return {
    id: 7,
    question: 'Should this go to a human?',
    shortName: 'human_handoff',
    passed,
    confidence: passed ? 0.85 : 0.4,
    evidence,
    action: passed ? undefined : 'Offer human support option',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SELF-CHECK FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface SelfCheckContext {
  userEmotion?: string;
  safetyDomains?: SafetyDomain[];
  hasUnresolvedIssue?: boolean;
  isSupport?: boolean;
  turnCount?: number;
  errorCount?: number;
}

/**
 * Run all 7 self-check questions
 */
export function runSelfCheck(
  content: string,
  context: SelfCheckContext = {}
): SelfCheckResult {
  const questions: SelfCheckQuestion[] = [
    checkSafetyLegal(content, context.safetyDomains || []),
    checkEmotionDignity(content, context.userEmotion),
    checkForwardMomentum(content),
    checkOnBrand(content),
    checkCrossSellTiming(content, {
      hasUnresolvedIssue: context.hasUnresolvedIssue,
      userEmotion: context.userEmotion,
      isSupport: context.isSupport,
    }),
    checkFactsVerified(content),
    checkHumanHandoff(content, {
      safetyDomains: context.safetyDomains,
      hasUnresolvedIssue: context.hasUnresolvedIssue,
      turnCount: context.turnCount,
      errorCount: context.errorCount,
    }),
  ];
  
  const passedCount = questions.filter(q => q.passed).length;
  const criticalQuestions = [1, 2, 6, 7]; // safe_legal, emotion_dignity, facts_verified, human_handoff
  
  const criticalFailures = questions.filter(
    q => !q.passed && criticalQuestions.includes(q.id)
  );
  
  const warnings = questions.filter(
    q => !q.passed && !criticalQuestions.includes(q.id)
  );
  
  // Calculate overall confidence
  const confidence = questions.reduce((sum, q) => sum + q.confidence, 0) / questions.length;
  
  // Build summary
  const summary = criticalFailures.length > 0
    ? `FAIL: ${criticalFailures.map(q => q.shortName).join(', ')}`
    : warnings.length > 0
    ? `WARN: ${warnings.map(q => q.shortName).join(', ')}`
    : 'PASS: All 7 checks passed';
  
  return {
    allPassed: passedCount === 7,
    passedCount,
    questions,
    criticalFailures,
    warnings,
    confidence,
    summary,
  };
}

/**
 * Quick check for critical failures only
 */
export function hasCriticalFailures(
  content: string,
  context: SelfCheckContext = {}
): boolean {
  const result = runSelfCheck(content, context);
  return result.criticalFailures.length > 0;
}

/**
 * Get self-check summary for logging
 */
export function getSelfCheckSummary(result: SelfCheckResult): string {
  const lines = [
    `Self-Check: ${result.passedCount}/7 passed (${Math.round(result.confidence * 100)}% confidence)`,
    result.summary,
  ];
  
  if (result.criticalFailures.length > 0) {
    lines.push('\nCritical Failures:');
    for (const q of result.criticalFailures) {
      lines.push(`  - ${q.question}`);
      lines.push(`    Evidence: ${q.evidence.join(', ')}`);
      if (q.action) lines.push(`    Action: ${q.action}`);
    }
  }
  
  return lines.join('\n');
}
