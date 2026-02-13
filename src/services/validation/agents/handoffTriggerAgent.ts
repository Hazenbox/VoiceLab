/**
 * Handoff Trigger Validation Agent
 * 
 * Detects when a conversation should be escalated to human support.
 * Monitors for escalation triggers defined in constitutional rules.
 * 
 * @module services/validation/agents/handoffTriggerAgent
 */

import { HARD_LIMITS, SAFETY_DOMAINS, type SafetyDomain } from '../../constitutional/coreRules';
import type { ConversationContext } from '../../conversation/stateMachine';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type HandoffReason = 
  | 'explicit_request'
  | 'identity_verification_failed'
  | 'backend_intervention_needed'
  | 'emotional_distress'
  | 'regulatory_sensitivity'
  | 'low_confidence'
  | 'safety_critical'
  | 'max_turns_exceeded'
  | 'repeated_failure'
  | 'complex_issue';

export interface HandoffTrigger {
  reason: HandoffReason;
  confidence: number;
  evidence: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: string;
}

export interface HandoffResult {
  /** Whether handoff should be triggered */
  shouldHandoff: boolean;
  /** All detected triggers */
  triggers: HandoffTrigger[];
  /** Highest priority trigger */
  primaryTrigger?: HandoffTrigger;
  /** Recommended handoff type */
  handoffType: 'immediate' | 'offered' | 'suggested' | 'none';
  /** Message to show user */
  userMessage?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const EXPLICIT_REQUEST_PATTERNS = [
  /speak to (a |an )?(human|agent|person|representative)/i,
  /talk to (a |an )?(human|agent|person|representative)/i,
  /connect (me )?(to|with) (a |an )?(human|agent|person)/i,
  /transfer (me )?(to|with)/i,
  /escalate/i,
  /supervisor/i,
  /manager/i,
  /real person/i,
  /not a (robot|bot)/i,
  /human (please|support)/i,
];

const EMOTIONAL_DISTRESS_PATTERNS = [
  /very (frustrated|angry|upset|stressed|anxious|worried)/i,
  /can't take (this|it) anymore/i,
  /losing (my |my )?(patience|mind)/i,
  /(extremely|incredibly|so) (frustrated|angry)/i,
  /this is (ridiculous|unacceptable|outrageous)/i,
  /i('m| am) (done|fed up)/i,
  /been trying for (hours|days|weeks)/i,
  /wasting my time/i,
];

const COMPLEX_ISSUE_PATTERNS = [
  /multiple (issues|problems)/i,
  /tried everything/i,
  /nothing (works|worked)/i,
  /already (tried|called|contacted)/i,
  /been (going on|happening) for/i,
  /same (issue|problem) (again|repeatedly)/i,
  /third (time|attempt)/i,
];

const BACKEND_INTERVENTION_PATTERNS = [
  /refund (not |hasn't |has not )?(received|processed)/i,
  /money (deducted|debited) but/i,
  /payment (failed|stuck)/i,
  /account (blocked|suspended|locked)/i,
  /can't access my account/i,
  /technical (issue|glitch|error)/i,
  /system (error|issue)/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// TRIGGER DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check for explicit handoff requests
 */
function detectExplicitRequest(content: string): HandoffTrigger | null {
  for (const pattern of EXPLICIT_REQUEST_PATTERNS) {
    if (pattern.test(content)) {
      return {
        reason: 'explicit_request',
        confidence: 0.95,
        evidence: [`User explicitly requested: "${content.match(pattern)?.[0]}"`],
        priority: 'high',
        suggestedAction: 'Connect user to human agent immediately',
      };
    }
  }
  return null;
}

/**
 * Check for emotional distress
 */
function detectEmotionalDistress(content: string): HandoffTrigger | null {
  const matches: string[] = [];
  
  for (const pattern of EMOTIONAL_DISTRESS_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  
  if (matches.length > 0) {
    return {
      reason: 'emotional_distress',
      confidence: Math.min(0.9, 0.5 + matches.length * 0.15),
      evidence: matches.map(m => `Emotional indicator: "${m}"`),
      priority: matches.length >= 2 ? 'high' : 'medium',
      suggestedAction: 'Offer human support with empathy',
    };
  }
  return null;
}

/**
 * Check for complex issues
 */
function detectComplexIssue(content: string): HandoffTrigger | null {
  const matches: string[] = [];
  
  for (const pattern of COMPLEX_ISSUE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  
  if (matches.length >= 2) {
    return {
      reason: 'complex_issue',
      confidence: 0.75,
      evidence: matches.map(m => `Complexity indicator: "${m}"`),
      priority: 'medium',
      suggestedAction: 'Offer specialized support',
    };
  }
  return null;
}

/**
 * Check for backend intervention needs
 */
function detectBackendNeed(content: string): HandoffTrigger | null {
  for (const pattern of BACKEND_INTERVENTION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        reason: 'backend_intervention_needed',
        confidence: 0.8,
        evidence: [`Backend issue detected: "${content.match(pattern)?.[0]}"`],
        priority: 'medium',
        suggestedAction: 'Route to operations team',
      };
    }
  }
  return null;
}

/**
 * Check for safety-critical situations
 */
function detectSafetyCritical(safetyDomains: SafetyDomain[]): HandoffTrigger | null {
  const criticalDomains = safetyDomains.filter(d => {
    const config = SAFETY_DOMAINS[d];
    return config.level === 'critical' || config.level === 'high';
  });
  
  if (criticalDomains.length > 0) {
    return {
      reason: 'safety_critical',
      confidence: 0.95,
      evidence: criticalDomains.map(d => `Safety domain: ${d} (${SAFETY_DOMAINS[d].level})`),
      priority: 'critical',
      suggestedAction: criticalDomains.some(d => 
        SAFETY_DOMAINS[d].advisoryBoundary === 'emergency_redirect'
      ) ? 'Provide emergency resources and offer support' : 'Route to specialized team',
    };
  }
  return null;
}

/**
 * Check conversation context for handoff triggers
 */
function detectContextTriggers(context?: ConversationContext): HandoffTrigger[] {
  const triggers: HandoffTrigger[] = [];
  
  if (!context) return triggers;
  
  // Max turns exceeded
  if (context.turnCount >= 8) {
    triggers.push({
      reason: 'max_turns_exceeded',
      confidence: 0.7,
      evidence: [`Conversation has ${context.turnCount} turns`],
      priority: 'low',
      suggestedAction: 'Suggest human support if issue unresolved',
    });
  }
  
  // Repeated failures
  if (context.errorCount >= 2) {
    triggers.push({
      reason: 'repeated_failure',
      confidence: 0.8,
      evidence: [`${context.errorCount} errors in conversation`],
      priority: 'medium',
      suggestedAction: 'Apologize and offer human support',
    });
  }
  
  // Multiple negative signals
  const negativeCount = context.satisfactionSignals.filter(s => s === 'negative').length;
  if (negativeCount >= 2) {
    triggers.push({
      reason: 'emotional_distress',
      confidence: 0.75,
      evidence: [`${negativeCount} negative satisfaction signals`],
      priority: 'medium',
      suggestedAction: 'Address dissatisfaction and offer escalation',
    });
  }
  
  return triggers;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect if handoff should be triggered
 */
export function detectHandoffTriggers(
  userMessage: string,
  options: {
    safetyDomains?: SafetyDomain[];
    conversationContext?: ConversationContext;
    aiConfidence?: number;
  } = {}
): HandoffResult {
  const triggers: HandoffTrigger[] = [];
  
  // Check explicit request first (highest priority)
  const explicitTrigger = detectExplicitRequest(userMessage);
  if (explicitTrigger) triggers.push(explicitTrigger);
  
  // Check safety-critical situations
  if (options.safetyDomains?.length) {
    const safetyTrigger = detectSafetyCritical(options.safetyDomains);
    if (safetyTrigger) triggers.push(safetyTrigger);
  }
  
  // Check emotional distress
  const emotionalTrigger = detectEmotionalDistress(userMessage);
  if (emotionalTrigger) triggers.push(emotionalTrigger);
  
  // Check complex issues
  const complexTrigger = detectComplexIssue(userMessage);
  if (complexTrigger) triggers.push(complexTrigger);
  
  // Check backend needs
  const backendTrigger = detectBackendNeed(userMessage);
  if (backendTrigger) triggers.push(backendTrigger);
  
  // Check conversation context
  const contextTriggers = detectContextTriggers(options.conversationContext);
  triggers.push(...contextTriggers);
  
  // Check low AI confidence
  if (options.aiConfidence !== undefined && options.aiConfidence < 0.5) {
    triggers.push({
      reason: 'low_confidence',
      confidence: 1 - options.aiConfidence,
      evidence: [`AI confidence: ${Math.round(options.aiConfidence * 100)}%`],
      priority: 'medium',
      suggestedAction: 'Acknowledge uncertainty and offer human support',
    });
  }
  
  // Sort triggers by priority
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  triggers.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  
  // Determine result
  if (triggers.length === 0) {
    return {
      shouldHandoff: false,
      triggers: [],
      handoffType: 'none',
    };
  }
  
  const primaryTrigger = triggers[0];
  
  // Determine handoff type
  let handoffType: HandoffResult['handoffType'] = 'none';
  let responseMessage: string | undefined;
  
  if (primaryTrigger.priority === 'critical' || primaryTrigger.reason === 'explicit_request') {
    handoffType = 'immediate';
    responseMessage = 'I\'m connecting you with a human agent who can better assist you.';
  } else if (primaryTrigger.priority === 'high') {
    handoffType = 'offered';
    responseMessage = 'Would you like me to connect you with a human agent who can help with this?';
  } else if (primaryTrigger.confidence >= 0.7) {
    handoffType = 'suggested';
    responseMessage = 'If you\'d like to speak with a human agent, I can connect you.';
  }
  
  return {
    shouldHandoff: handoffType !== 'none',
    triggers,
    primaryTrigger,
    handoffType,
    userMessage: responseMessage,
  };
}

/**
 * Quick check if handoff might be needed
 */
export function mightNeedHandoff(userMessage: string): boolean {
  const quickPatterns = [
    ...EXPLICIT_REQUEST_PATTERNS,
    ...EMOTIONAL_DISTRESS_PATTERNS.slice(0, 3),
  ];
  
  return quickPatterns.some(p => p.test(userMessage));
}

/**
 * Get handoff message based on reason
 */
export function getHandoffMessage(reason: HandoffReason): string {
  const messages: Record<HandoffReason, string> = {
    explicit_request: 'I\'m connecting you with a human agent now.',
    identity_verification_failed: 'For security, we need to verify your identity with a human agent.',
    backend_intervention_needed: 'This requires our operations team. Let me connect you.',
    emotional_distress: 'I understand your frustration. Let me connect you with someone who can help.',
    regulatory_sensitivity: 'For this type of request, our specialized team can assist you better.',
    low_confidence: 'I want to make sure you get the right answer. Let me connect you with an expert.',
    safety_critical: 'Your safety is our priority. Please let me connect you with immediate support.',
    max_turns_exceeded: 'Let me connect you with someone who can resolve this more quickly.',
    repeated_failure: 'I apologize for the difficulties. Let me get you human assistance.',
    complex_issue: 'This seems to need specialized attention. Let me connect you with an expert.',
  };
  
  return messages[reason];
}
