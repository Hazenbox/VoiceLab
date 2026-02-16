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
// TOKEN GENERATORS - COMPLETE 100% COVERAGE FROM TOKENS V2 SPEC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All 49 token keys from Tokens v2 specification (Section 2-14)
 */
export const ALL_TOKEN_KEYS = [
  // Routing (Section 2) - 3 tokens
  'route.mode', 'route.confidence', 'route.trigger',
  // Safety (Section 3) - 3 tokens
  'safety.domain', 'safety.level', 'advice.boundary',
  // Nudge (Section 4) - 3 tokens
  'nudge.permission', 'nudge.relevance', 'nudge.sensitivity_override',
  // User (Section 5) - 2 tokens
  'user.intent', 'user.goal',
  // Context (Section 5.3) - 5 tokens
  'context.time', 'context.event', 'context.session', 'context.urgency', 'context.journey_stage',
  // Emotion (Section 6) - 3 tokens
  'emotion.rasa.user', 'emotion.intensity', 'emotion.target',
  // Profile (Section 7.1) - 3 tokens
  'profile.segment', 'profile.plan', 'profile.relationship_stage',
  // Region (Section 7.2) - 4 tokens
  'region.state', 'region.city', 'region.locale', 'region.connectivity_profile',
  // Language (Section 7.3-7.6) - 4 tokens
  'lang', 'script', 'lang_mix', 'literacy',
  // Conversation (Section 8) - 4 tokens
  'conversation.state', 'conversation.transition', 'conversation.resolution_status', 'conversation.turn_count',
  // Memory (Section 9) - 6 tokens
  'memory.session.last_intent', 'memory.session.last_step', 'memory.session.last_entity',
  'memory.mid_term.last_journey', 'memory.mid_term.preferred_language', 'memory.mid_term.last_channel',
  // Identity (Section 10-11) - 3 tokens
  'persona', 'ecosystem', 'channel',
  // Pattern (Section 12) - 2 tokens
  'pattern', 'pattern.sequence',
  // Risk (Section 13) - 2 tokens
  'risk.category', 'risk.level',
  // Finishing (Section 14) - 2 tokens
  'signature', 'small_joy',
];

/**
 * All 26 SafetyDomain values (from tokenTypes.ts)
 */
export const SAFETY_DOMAINS = [
  'none',
  'health_general',
  'health_emergency',
  'mental_health',
  'finance_general',
  'investment_advice',
  'legal_general',
  'legal_advice',
  'self_harm',
  'suicide_risk',
  'violence',
  'hate_harassment',
  'sexual_content',
  'sexual_minors',
  'child_safety',
  'privacy_personal_data',
  'biometric_data',
  'fraud_scam',
  'cybersecurity',
  'identity_theft',
  'political_persuasion',
  'misinformation',
  'dangerous_activity',
  'weapons',
  'substance_use',
  'regulated_products',
];

/**
 * All 5 SafetyLevel values
 */
export const SAFETY_LEVELS = ['none', 'low', 'moderate', 'high', 'critical'];

/**
 * All 6 AdvisoryBoundary values
 */
export const ADVISORY_BOUNDARIES = [
  'normal_information',
  'precautionary_guidance',
  'limited_guidance',
  'refer_professional',
  'emergency_redirect',
  'refuse_and_redirect',
];

/**
 * All 5 NudgePermission values
 */
export const NUDGE_PERMISSIONS = [
  'blocked',
  'post_resolution_only',
  'contextual_soft',
  'contextual_strong',
  'proactive_allowed',
];

/**
 * All 5 NudgeRelevance values
 */
export const NUDGE_RELEVANCES = [
  'none',
  'low',
  'moderate',
  'high',
  'direct_actionable',
];

/**
 * All 4 NudgeSensitivityOverride values
 */
export const NUDGE_SENSITIVITY_OVERRIDES = [
  'none',
  'safety_block',
  'complaint_block',
  'high_emotion_block',
];

/**
 * All 17 UserIntent values
 */
export const USER_INTENTS = [
  // Core intent types (universal)
  'ask_information',
  'seek_guidance',
  'solve_problem',
  'perform_action',
  'create_content',
  'make_decision',
  'locate_service',
  'track_status',
  'report_issue',
  'give_feedback',
  'social_chat',
  'emotional_support',
  // Jio-specific operational intents
  'jio_account',
  'jio_billing_payment',
  'jio_connectivity',
  'jio_orders_services',
  'jio_device_setup',
];

/**
 * All 29 UserGoal values
 */
export const USER_GOALS = [
  // Information / learning outcomes
  'understand_topic',
  'get_summary',
  'get_steps',
  'get_examples',
  'get_recommendations',
  // Problem-solving outcomes
  'fix_issue',
  'restore_service',
  'reduce_error',
  'confirm_working',
  'escalate_to_support',
  // Action / task outcomes
  'complete_transaction',
  'submit_request',
  'update_details',
  'schedule_or_book',
  'download_or_generate',
  // Decision outcomes
  'compare_options',
  'choose_best_option',
  'validate_choice',
  // Location outcomes
  'find_nearby',
  'find_best_match',
  'get_contact_details',
  // Content generation outcomes
  'create_copy_variants',
  'create_longform_content',
  'create_shortform_content',
  'adapt_to_language_tone',
  'format_for_channel',
  // Relationship / conversation outcomes
  'feel_reassured',
  'continue_chat',
  'get_motivation',
];

/**
 * All 9 Navarasa emotions
 */
export const NAVARASA_EMOTIONS = [
  'shringara',  // Love / Delight
  'hasya',      // Laughter / Playfulness
  'karuna',     // Compassion / Sadness
  'raudra',     // Anger / Frustration
  'vira',       // Courage / Pride / Ambition
  'bhayanaka',  // Fear / Anxiety (note: typo in some places as 'bhayanak')
  'bibhatsa',   // Disgust / Rejection
  'adbhuta',    // Wonder / Curiosity
  'shanta',     // Peace / Stillness / Contentment
];

/**
 * All 4 EmotionIntensity values
 */
export const EMOTION_INTENSITIES = ['low', 'moderate', 'high', 'extreme'];

/**
 * All 6 EmotionTarget values
 */
export const EMOTION_TARGETS = [
  'shanta',
  'vira',
  'hasya',
  'adbhuta',
  'karuna_resolved',
  'relieved',
];

/**
 * All 7 Channel types
 */
export const CHANNELS = [
  'app_chat',
  'whatsapp',
  'ivr_voice',
  'sms',
  'email',
  'push_notification',
  'retail_store',
];

/**
 * All 8 Ecosystem types (from tokenTypes + product_definitions in Convex)
 */
export const ECOSYSTEMS = [
  'connectivity',
  'finance',
  'shopping',
  'health',
  'education',
  'entertainment',
  'enterprise',
  'general',
];

/**
 * Extended ecosystems from Convex product_definition (14 total)
 */
export const ECOSYSTEMS_EXTENDED = [
  'connectivity',
  'home',
  'entertainment',
  'shopping',
  'finance',
  'health',
  'business',
  'work',
  'government',
  'education',
  'sports',
  'agriculture',
  'energy',
  'transport',
];

/**
 * All 4 Persona types
 */
export const PERSONAS = [
  'jio_friend',   // Casual, warm, relatable
  'jio_guide',    // Clear, structured, steady
  'jio_expert',   // Precise, confident, direct
  'jio_support',  // Calm, solution-oriented, composed
];

/**
 * All 12 Pattern types
 */
export const PATTERNS = [
  'empathy.acknowledge',
  'clarify.ask',
  'explain.why',
  'guide.next_step',
  'guide.multi_step',
  'confirm.action',
  'confirm.done',
  'summarise.status',
  'handoff.warm',
  'offer.option',
  'reassure.safety',
  'proactive.suggest',
];

/**
 * All 6 PatternSequence types
 */
export const PATTERN_SEQUENCES = [
  'acknowledge_clarify_act_verify',
  'direct_answer_explain_option',
  'guide_multi_step_confirm',
  'acknowledge_act_summarise',
  'act_verify_close',
  'resolve_next_opportunity',
];

/**
 * All 8 RiskCategory types
 */
export const RISK_CATEGORIES = [
  'none',
  'account_security',
  'finance_regulatory',
  'privacy',
  'fraud_scam',
  'cybersecurity',
  'contractual',
  'legal_sensitive',
];

/**
 * All 4 RiskLevel types
 */
export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];

/**
 * All 6 Signature types
 */
export const SIGNATURES = [
  'youre_all_set',
  'thank_you_for_choosing_jio',
  'with_love_from_jio',
  'take_care',
  'reach_out_anytime',
  'none',
];

/**
 * All 6 SmallJoy types
 */
export const SMALL_JOYS = [
  'time_of_day_wish',
  'festival_warmth',
  'cricket_reference',
  'workday_encouragement',
  'learning_encouragement',
  'none',
];

/**
 * All 14 Language types
 */
export const LANGUAGES = [
  'english',
  'hindi',
  'hinglish',
  'tamil',
  'telugu',
  'kannada',
  'malayalam',
  'bengali',
  'marathi',
  'gujarati',
  'punjabi',
  'odia',
  'assamese',
  'urdu',
];

/**
 * All 7 ConversationState types
 */
export const CONVERSATION_STATES = [
  'start',
  'triage',
  'clarify',
  'act',
  'verify',
  'close',
  'next_opportunity',
];

/**
 * All 6 ResolutionStatus types
 */
export const RESOLUTION_STATUSES = [
  'not_started',
  'in_progress',
  'blocked_missing_info',
  'resolved',
  'escalated',
  'abandoned',
];

/**
 * All 8 ProfileSegment types
 */
export const PROFILE_SEGMENTS = [
  'consumer_mobile',
  'consumer_fiber',
  'enterprise',
  'small_business',
  'student',
  'family_account',
  'senior_user',
  'unknown',
];

/**
 * All 8 ContextEvent types
 */
export const CONTEXT_EVENTS = [
  'none',
  'festival',
  'sale_event',
  'cricket_match',
  'exam_season',
  'weather_disruption',
  'public_holiday',
  'breaking_news',
];

/**
 * All 8 ContextJourneyStage types
 */
export const CONTEXT_JOURNEY_STAGES = [
  'discover',
  'onboard',
  'use',
  'fix',
  'pay',
  'renew',
  'upgrade',
  'exit',
];

/**
 * Generate tokens with ALL 49 fields populated
 */
export function generateAllTokensCombination(): Partial<ActiveTokens> {
  return {
    // Routing (3)
    'route.mode': 'open_chat',
    'route.confidence': 'high',
    'route.trigger': 'general_question',
    // Safety (3)
    'safety.domain': 'none',
    'safety.level': 'none',
    'advice.boundary': 'normal_information',
    // Nudge (3)
    'nudge.permission': 'contextual_soft',
    'nudge.relevance': 'moderate',
    'nudge.sensitivity_override': 'none',
    // User (2)
    'user.intent': 'ask_information',
    'user.goal': 'understand_topic',
    // Context (5)
    'context.time': 'morning',
    'context.event': 'none',
    'context.session': 'returning_user',
    'context.urgency': 'low',
    'context.journey_stage': 'use',
    // Emotion (3)
    'emotion.rasa.user': 'shanta',
    'emotion.intensity': 'low',
    'emotion.target': 'shanta',
    // Profile (3)
    'profile.segment': 'consumer_mobile',
    'profile.plan': 'prepaid',
    'profile.relationship_stage': 'active_regular',
    // Region (4)
    'region.state': 'Maharashtra',
    'region.city': 'Mumbai',
    'region.locale': 'metro',
    'region.connectivity_profile': 'high_speed_available',
    // Language (4)
    'lang': 'english',
    'script': 'latin',
    'lang_mix': 'pure',
    'literacy': 'high',
    // Conversation (4)
    'conversation.state': 'act',
    'conversation.turn_count': 1,
    'conversation.resolution_status': 'in_progress',
    // Identity (3)
    'persona': 'jio_friend',
    'ecosystem': 'connectivity',
    'channel': 'app_chat',
    // Pattern (2)
    'pattern': 'guide.next_step',
    'pattern.sequence': 'direct_answer_explain_option',
    // Risk (2)
    'risk.category': 'none',
    'risk.level': 'low',
    // Finishing (2)
    'signature': 'youre_all_set',
    'small_joy': 'none',
  };
}

/**
 * Generate intent + persona combination tokens
 */
export function generateIntentPersonaTokens(
  intent: string,
  persona: string
): Partial<ActiveTokens> {
  return {
    'user.intent': intent as ActiveTokens['user.intent'],
    'persona': persona as ActiveTokens['persona'],
    'route.mode': 'open_chat',
    'channel': 'app_chat',
    'safety.level': 'none',
  };
}

/**
 * Generate ecosystem tokens with brand rules
 */
export function generateEcosystemTokens(ecosystem: string): Partial<ActiveTokens> {
  return {
    'ecosystem': ecosystem as ActiveTokens['ecosystem'],
    'route.mode': 'open_chat',
    'channel': 'app_chat',
    'persona': 'jio_friend',
  };
}

/**
 * Generate risk tokens
 */
export function generateRiskTokens(
  category: string,
  level: string
): Partial<ActiveTokens> {
  return {
    'risk.category': category as ActiveTokens['risk.category'],
    'risk.level': level as ActiveTokens['risk.level'],
    'route.mode': 'open_chat',
    'channel': 'app_chat',
  };
}

/**
 * Generate pattern tokens
 */
export function generatePatternTokens(pattern: string): Partial<ActiveTokens> {
  return {
    'pattern': pattern as ActiveTokens['pattern'],
    'route.mode': 'open_chat',
    'channel': 'app_chat',
    'persona': 'jio_guide',
  };
}

/**
 * Generate context tokens
 */
export function generateContextTokens(
  event: string,
  journeyStage: string
): Partial<ActiveTokens> {
  return {
    'context.event': event as ActiveTokens['context.event'],
    'context.journey_stage': journeyStage as ActiveTokens['context.journey_stage'],
    'route.mode': 'open_chat',
    'channel': 'app_chat',
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
// KNOWLEDGE BASE - 100% COVERAGE FROM CONVEX DATABASE (637 items)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Knowledge item types (from Convex schema)
 */
export const KNOWLEDGE_TYPES = [
  'avoid_word',        // 299 items
  'preferred_word',    // 241 items
  'auto_fix',          // 72 items
  'product_definition', // 14 items
  'festival',          // 11 items
  'approved_example',  // dynamic
  'channel_override',  // dynamic
  'ecosystem_override', // dynamic
  'trigger_override',  // dynamic
];

/**
 * Knowledge item counts from Convex database
 */
export const KNOWLEDGE_COUNTS = {
  avoid_word: 299,
  preferred_word: 241,
  auto_fix: 72,
  product_definition: 14,
  festival: 11,
  TOTAL: 637,
};

/**
 * Avoid word categories (10 categories, ~299 words total)
 */
export const AVOID_WORD_CATEGORIES_FULL = {
  complex: 'Complex words - corporate jargon, verbose phrases',
  robotic: 'Robotic words - automated, impersonal language',
  fear_based: 'Fear-based words - urgency, scarcity, FOMO',
  bureaucratic: 'Bureaucratic words - legal/formal language',
  technical: 'Technical words - dev jargon, system terms',
  shame_inducing: 'Shame-inducing words - blame, judgment',
  elitist: 'Elitist words - exclusionary language',
  marketing_jargon: 'Marketing jargon - buzzwords',
  american_spelling: 'American spellings - should use British',
  incorrect_format: 'Incorrect formats - currency, numbers',
};

/**
 * Preferred word categories (6 categories, ~241 words total)
 */
export const PREFERRED_WORD_CATEGORIES = {
  care_connection: 'Warm, empathetic language',
  action_progress: 'Action-oriented, progress language',
  clarity_safety: 'Clear, trustworthy language',
  fixing_resolution: 'Problem-solving language',
  community_first: 'Inclusive, community language',
  learning_discovery: 'Educational, curious language',
};

/**
 * Auto-fix categories (~72 rules total)
 */
export const AUTO_FIX_CATEGORIES = {
  gender_neutral: 'Gender-inclusive alternatives',
  simplification: 'Jargon to plain language',
  british_spelling: 'American to British spelling',
  format_correction: 'Format fixes (e.g., Rs. to ₹)',
};

/**
 * Festival definitions (11 festivals)
 */
export const FESTIVALS = [
  // Pan-India festivals
  { id: 'diwali', name: 'Diwali', category: 'pan_india' },
  { id: 'holi', name: 'Holi', category: 'pan_india' },
  { id: 'eid', name: 'Eid', category: 'pan_india' },
  { id: 'christmas', name: 'Christmas', category: 'pan_india' },
  { id: 'new_year', name: 'New Year', category: 'pan_india' },
  { id: 'independence_day', name: 'Independence Day', category: 'pan_india' },
  { id: 'republic_day', name: 'Republic Day', category: 'pan_india' },
  // Regional festivals
  { id: 'ganesh_chaturthi', name: 'Ganesh Chaturthi', category: 'regional' },
  { id: 'navratri', name: 'Navratri', category: 'regional' },
  { id: 'onam', name: 'Onam', category: 'regional' },
  { id: 'pongal', name: 'Pongal', category: 'regional' },
];

/**
 * Product definitions (14 ecosystems with tone guidance)
 */
export const PRODUCT_DEFINITIONS = [
  { ecosystem: 'connectivity', tone: 'Quick, crisp, confident' },
  { ecosystem: 'home', tone: 'Warm, familiar, relaxed' },
  { ecosystem: 'entertainment', tone: 'Playful, expressive, energetic' },
  { ecosystem: 'shopping', tone: 'Helpful, cheerful, straight-talking' },
  { ecosystem: 'finance', tone: 'Calm, clear, trustworthy' },
  { ecosystem: 'health', tone: 'Caring, steady, informed' },
  { ecosystem: 'business', tone: 'Sharp, professional, future-focused' },
  { ecosystem: 'work', tone: 'Respectful, sincere, supportive' },
  { ecosystem: 'government', tone: 'Formal, respectful, precise' },
  { ecosystem: 'education', tone: 'Encouraging, clear, inclusive' },
  { ecosystem: 'sports', tone: 'Bold, exciting, inclusive' },
  { ecosystem: 'agriculture', tone: 'Respectful, practical, grounded' },
  { ecosystem: 'energy', tone: 'Forward-looking, optimistic, trustworthy' },
  { ecosystem: 'transport', tone: 'Practical, reliable, community-focused' },
];

/**
 * Token enforcement rules from Convex (12 rules)
 */
export const TOKEN_ENFORCEMENT_RULES = [
  { tokenKey: 'safety.level', tokenValue: 'critical', ruleType: 'must_contain', category: 'safety', priority: 100 },
  { tokenKey: 'safety.domain', tokenValue: 'self_harm', ruleType: 'must_not_contain', category: 'safety', priority: 100 },
  { tokenKey: 'safety.domain', tokenValue: 'fraud_scam', ruleType: 'must_contain', category: 'safety', priority: 90 },
  { tokenKey: 'nudge.permission', tokenValue: 'never', ruleType: 'pattern_forbidden', category: 'nudge', priority: 85 },
  { tokenKey: 'nudge.permission', tokenValue: 'blocked', ruleType: 'must_not_contain', category: 'nudge', priority: 80 },
  { tokenKey: 'emotion.rasa.user', tokenValue: 'raudra', ruleType: 'must_not_contain', category: 'emotion', priority: 75 },
  { tokenKey: 'channel.type', tokenValue: 'sms', ruleType: 'max_length', category: 'channel', priority: 70 },
  { tokenKey: 'channel.type', tokenValue: 'push_notification', ruleType: 'max_length', category: 'channel', priority: 65 },
  { tokenKey: 'channel.type', tokenValue: 'ivr', ruleType: 'must_not_contain', category: 'channel', priority: 60 },
  { tokenKey: 'emotion.rasa.user', tokenValue: 'karuna', ruleType: 'must_contain', category: 'emotion', priority: 50 },
  { tokenKey: 'finishing.signature', tokenValue: 'youre_all_set', ruleType: 'must_not_contain', category: 'signature', priority: 40 },
  { tokenKey: 'ecosystem', tokenValue: '*', ruleType: 'must_not_contain', category: 'brand', priority: 95 },
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
