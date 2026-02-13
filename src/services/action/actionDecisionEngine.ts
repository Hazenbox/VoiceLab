/**
 * Action Decision Engine
 * 
 * Determines the appropriate action type for each turn.
 * 7 action types: guide, explain, transact, reassure, escalate, clarify, resolve.
 * 
 * @module services/action/actionDecisionEngine
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Action types available for response generation
 */
export type ActionType =
  | 'guide'      // Step-by-step guidance
  | 'explain'    // Provide explanation/information
  | 'transact'   // Execute a transaction/action
  | 'reassure'   // Calm and reassure user
  | 'escalate'   // Hand off to human agent
  | 'clarify'    // Ask for more information
  | 'resolve';   // Confirm resolution

/**
 * Action decision result
 */
export interface ActionDecision {
  /** Primary action to take */
  action: ActionType;
  /** Confidence in this decision */
  confidence: number;
  /** Secondary action if appropriate */
  secondaryAction?: ActionType;
  /** Reason for this action */
  reason: string;
  /** Specific guidance for executing this action */
  guidance: string[];
  /** Maximum words for this action type */
  maxWords: number;
  /** Whether to include a CTA */
  includeCTA: boolean;
}

/**
 * Input for action decision
 */
export interface ActionDecisionInput {
  userMessage: string;
  intent: string;
  emotion: string;
  sentiment: string;
  resolutionStatus: string;
  turnNumber: number;
  previousAction?: ActionType;
  hasProvidedSolution: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for each action type
 */
export const ACTION_CONFIG: Record<ActionType, {
  description: string;
  maxWords: number;
  includeCTA: boolean;
  applicableIntents: string[];
  applicableEmotions: string[];
}> = {
  guide: {
    description: 'provide step-by-step guidance to complete a task',
    maxWords: 150,
    includeCTA: true,
    applicableIntents: ['support', 'transaction', 'inquiry'],
    applicableEmotions: ['neutral', 'shant', 'adbhut'],
  },
  explain: {
    description: 'provide clear explanation or information',
    maxWords: 120,
    includeCTA: false,
    applicableIntents: ['inquiry', 'general'],
    applicableEmotions: ['neutral', 'shant', 'adbhut'],
  },
  transact: {
    description: 'help user complete a transaction',
    maxWords: 100,
    includeCTA: true,
    applicableIntents: ['transaction'],
    applicableEmotions: ['neutral', 'shant'],
  },
  reassure: {
    description: 'calm the user and provide emotional support',
    maxWords: 120,
    includeCTA: false,
    applicableIntents: ['complaint', 'support'],
    applicableEmotions: ['raudra', 'bhayanak', 'karun', 'bibhatsa'],
  },
  escalate: {
    description: 'transfer to human agent',
    maxWords: 80,
    includeCTA: true,
    applicableIntents: ['complaint', 'support'],
    applicableEmotions: ['raudra', 'bhayanak'],
  },
  clarify: {
    description: 'ask for more information',
    maxWords: 80,
    includeCTA: true,
    applicableIntents: ['support', 'inquiry', 'general'],
    applicableEmotions: ['neutral', 'shant'],
  },
  resolve: {
    description: 'confirm resolution and close',
    maxWords: 100,
    includeCTA: true,
    applicableIntents: ['support', 'complaint', 'transaction'],
    applicableEmotions: ['neutral', 'shant', 'hasya'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns that indicate need for clarification
 */
const CLARIFY_INDICATORS = [
  /\b(problem|issue|error|not working)\b.*\b(with|on|in)\b(?!.*\b(my|the)\s+\w+)/i,
  /^(help|please|can you)\b/i,
  /\?$/,
];

/**
 * Patterns that indicate emotional distress requiring reassurance
 */
const REASSURE_INDICATORS = [
  /\b(frustrated|angry|upset|worried|scared|confused|lost)\b/i,
  /\b(worst|terrible|horrible|ruined|disaster)\b/i,
  /!{2,}/,
  /\b(please help|need help urgently|emergency)\b/i,
];

/**
 * Patterns that indicate readiness for resolution
 */
const RESOLVE_INDICATORS = [
  /\b(worked|fixed|solved|resolved|thanks|thank you|perfect|great|awesome)\b/i,
  /\b(that('s| is) (it|all|good|perfect))\b/i,
];

/**
 * Patterns indicating escalation request
 */
const ESCALATE_INDICATORS = [
  /\b(speak|talk)\s+(to|with)\s+(human|person|agent|someone|representative)\b/i,
  /\b(escalate|supervisor|manager|higher authority)\b/i,
  /\b(not (helping|useful)|can't understand|useless)\b/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Decide the appropriate action for the current turn
 */
export function decideAction(input: ActionDecisionInput): ActionDecision {
  const {
    userMessage,
    intent,
    emotion,
    sentiment,
    resolutionStatus,
    turnNumber,
    previousAction,
    hasProvidedSolution,
  } = input;
  
  const text = userMessage.toLowerCase();
  let action: ActionType;
  let confidence = 0.7;
  let reason = '';
  let secondaryAction: ActionType | undefined;
  
  // Rule 1: Check for explicit escalation request
  if (ESCALATE_INDICATORS.some(p => p.test(text))) {
    action = 'escalate';
    confidence = 0.95;
    reason = 'user explicitly requested human assistance';
    return buildDecision(action, confidence, reason, secondaryAction, turnNumber);
  }
  
  // Rule 2: Check for resolution confirmation
  if (RESOLVE_INDICATORS.some(p => p.test(text)) && hasProvidedSolution) {
    action = 'resolve';
    confidence = 0.9;
    reason = 'user indicated issue is resolved';
    return buildDecision(action, confidence, reason, secondaryAction, turnNumber);
  }
  
  // Rule 3: High emotion - prioritize reassurance
  const highEmotions = ['raudra', 'bhayanak', 'karun'];
  if (highEmotions.includes(emotion) || REASSURE_INDICATORS.some(p => p.test(text))) {
    action = 'reassure';
    confidence = 0.85;
    reason = 'user shows emotional distress';
    secondaryAction = intent === 'support' ? 'guide' : 'explain';
    return buildDecision(action, confidence, reason, secondaryAction, turnNumber);
  }
  
  // Rule 4: Resolution status considerations
  if (resolutionStatus === 'blocked') {
    // We're waiting for info, might need to clarify again
    if (turnNumber > 1 && previousAction !== 'clarify') {
      action = 'clarify';
      confidence = 0.8;
      reason = 'resolution blocked, need more information';
      return buildDecision(action, confidence, reason, secondaryAction, turnNumber);
    }
  }
  
  // Rule 5: Too many turns without resolution - suggest escalation
  if (turnNumber >= 8 && resolutionStatus !== 'resolved') {
    action = 'escalate';
    confidence = 0.75;
    reason = 'extended conversation without resolution';
    return buildDecision(action, confidence, reason, secondaryAction, turnNumber);
  }
  
  // Rule 6: Need clarification
  if (CLARIFY_INDICATORS.some(p => p.test(text)) && turnNumber <= 2) {
    action = 'clarify';
    confidence = 0.75;
    reason = 'message lacks specifics needed for resolution';
    return buildDecision(action, confidence, reason, secondaryAction, turnNumber);
  }
  
  // Rule 7: Intent-based action selection
  switch (intent) {
    case 'transaction':
      action = 'transact';
      confidence = 0.85;
      reason = 'user wants to complete a transaction';
      break;
    
    case 'inquiry':
      action = 'explain';
      confidence = 0.8;
      reason = 'user is seeking information';
      break;
    
    case 'complaint':
      action = 'reassure';
      confidence = 0.75;
      reason = 'user has a complaint - address emotional state first';
      secondaryAction = 'guide';
      break;
    
    case 'support':
      // Check if we need to guide or clarify
      if (hasProvidedSolution) {
        action = 'resolve';
        confidence = 0.7;
        reason = 'solution provided, checking for resolution';
      } else {
        action = 'guide';
        confidence = 0.8;
        reason = 'user needs support - provide guidance';
      }
      break;
    
    case 'feedback':
      action = 'explain';
      confidence = 0.7;
      reason = 'acknowledging feedback';
      break;
    
    default:
      // Fallback to guide for general cases
      action = 'guide';
      confidence = 0.6;
      reason = 'general assistance mode';
  }
  
  return buildDecision(action, confidence, reason, secondaryAction, turnNumber);
}

/**
 * Build the complete action decision
 */
function buildDecision(
  action: ActionType,
  confidence: number,
  reason: string,
  secondaryAction: ActionType | undefined,
  turnNumber: number
): ActionDecision {
  const config = ACTION_CONFIG[action];
  
  // Adjust maxWords based on turn number
  let maxWords = config.maxWords;
  if (turnNumber > 5) {
    maxWords = Math.round(maxWords * 0.8);
  }
  if (turnNumber > 8) {
    maxWords = Math.round(maxWords * 0.7);
  }
  
  return {
    action,
    confidence,
    secondaryAction,
    reason,
    guidance: getActionGuidance(action),
    maxWords,
    includeCTA: config.includeCTA,
  };
}

/**
 * Get specific guidance for an action type
 */
function getActionGuidance(action: ActionType): string[] {
  const guidance: Record<ActionType, string[]> = {
    guide: [
      'provide clear, numbered steps',
      'one instruction per step',
      'verify understanding at end',
      'include specific details (app names, menu paths)',
    ],
    explain: [
      'start with the core answer',
      'use simple language',
      'provide relevant context',
      'avoid unnecessary technical details',
    ],
    transact: [
      'confirm transaction details',
      'mention any charges/validity',
      'provide confirmation method',
      'include cancellation info if relevant',
    ],
    reassure: [
      'acknowledge the emotion first',
      'express understanding',
      'commit to resolution',
      'then provide practical help',
    ],
    escalate: [
      'acknowledge the request',
      'explain what will happen next',
      'provide expected wait time',
      'summarize issue for handoff',
    ],
    clarify: [
      'ask one specific question',
      'explain why information is needed',
      'provide examples if helpful',
      'keep it brief',
    ],
    resolve: [
      'confirm what was achieved',
      'mention any follow-up if needed',
      'offer additional help',
      'end warmly',
    ],
  };
  
  return guidance[action];
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get action prompt context for injection
 */
export function getActionPromptContext(decision: ActionDecision): string {
  const lines = [
    `## action decision`,
    `action: ${decision.action}`,
    `confidence: ${(decision.confidence * 100).toFixed(0)}%`,
    `reason: ${decision.reason}`,
    `max_words: ${decision.maxWords}`,
    `include_cta: ${decision.includeCTA}`,
    '',
    '### guidance:',
    ...decision.guidance.map(g => `- ${g}`),
  ];
  
  if (decision.secondaryAction) {
    lines.push('');
    lines.push(`secondary action: ${decision.secondaryAction} (apply after primary)`);
  }
  
  return lines.join('\n');
}

/**
 * Check if action is compatible with current state
 */
export function isActionCompatible(
  action: ActionType,
  intent: string,
  emotion: string
): boolean {
  const config = ACTION_CONFIG[action];
  return (
    config.applicableIntents.includes(intent) ||
    config.applicableEmotions.includes(emotion)
  );
}

/**
 * Get recommended action for intent/emotion combination
 */
export function getRecommendedAction(
  intent: string,
  emotion: string
): ActionType {
  // Emotion takes priority for high-intensity emotions
  const highEmotions = ['raudra', 'bhayanak', 'karun'];
  if (highEmotions.includes(emotion)) {
    return 'reassure';
  }
  
  // Intent-based mapping
  const intentMap: Record<string, ActionType> = {
    inquiry: 'explain',
    transaction: 'transact',
    complaint: 'reassure',
    support: 'guide',
    feedback: 'explain',
    greeting: 'explain',
    farewell: 'resolve',
  };
  
  return intentMap[intent] || 'guide';
}
