/**
 * Warm Handoff Templates
 * 
 * Scripts for transitioning users to human agents.
 * Standard, high-sensitivity, and user-requested variants.
 * 
 * @module services/handoff/warmHandoffTemplates
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handoff types
 */
export type HandoffType =
  | 'standard'           // Normal escalation
  | 'high_sensitivity'   // Emotional/complex situations
  | 'user_requested'     // User explicitly asked
  | 'technical'          // Technical specialist needed
  | 'billing'            // Financial/billing specialist
  | 'retention';         // Retention specialist for cancellation

/**
 * Handoff context
 */
export interface HandoffContext {
  type: HandoffType;
  emotion: string;
  intent: string;
  topic: string;
  issueSummary: string;
  turnCount: number;
  resolutionAttempts: number;
  userSentiment: 'positive' | 'neutral' | 'negative';
}

/**
 * Handoff template
 */
export interface HandoffTemplate {
  type: HandoffType;
  userMessage: string;       // What to say to user
  agentBriefing: string;     // What to tell the agent
  expectedWaitTime: string;
  includeSummary: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * User-facing handoff messages
 */
const USER_MESSAGES: Record<HandoffType, string[]> = {
  standard: [
    "i'm connecting you with a specialist who can help you better with this. they'll have more tools to assist you.",
    "let me transfer you to someone who can provide more hands-on support for this issue.",
    "i think a human colleague would be better equipped to help you here. let me connect you.",
  ],
  high_sensitivity: [
    "i can see this has been frustrating for you, and i really want to make sure you get the help you deserve. let me connect you with a senior specialist who can give this the attention it needs.",
    "this deserves more personal attention than i can provide. i'm connecting you with someone who can really focus on resolving this for you.",
    "i understand how important this is to you. let me bring in a specialist who can work with you directly to get this sorted.",
  ],
  user_requested: [
    "absolutely, i'll connect you with a human agent right away.",
    "no problem at all - let me get you connected with one of our team members.",
    "of course. connecting you now.",
  ],
  technical: [
    "this seems to be a technical issue that needs specialist attention. let me connect you with our technical support team.",
    "i'd like to bring in one of our technical specialists who can dig deeper into this.",
    "for this kind of technical issue, our specialist team would be better equipped to help. connecting you now.",
  ],
  billing: [
    "billing matters need special care. let me connect you with our billing specialists who can review your account properly.",
    "for billing-related issues, i want to make sure you speak with someone who has full access to help. transferring you now.",
    "i'll connect you with our billing team - they'll be able to look into this thoroughly.",
  ],
  retention: [
    "before we proceed, i'd like you to speak with someone who can understand your concerns better and see if there's anything we can do.",
    "let me connect you with a specialist who might have some options that could help.",
    "i'd like to bring in someone who can discuss this with you and explore all possibilities.",
  ],
};

/**
 * Agent briefing templates
 */
const AGENT_BRIEFINGS: Record<HandoffType, string> = {
  standard: 'Standard escalation. Issue: {summary}. Turn count: {turns}. Resolution attempts: {attempts}.',
  high_sensitivity: '⚠️ HIGH SENSITIVITY - Customer is {emotion}. Issue: {summary}. Please prioritize empathy. Turn count: {turns}.',
  user_requested: 'User explicitly requested human agent. Issue: {summary}. Turn count: {turns}.',
  technical: 'Technical escalation. Issue: {summary}. Basic troubleshooting attempted. Turn count: {turns}.',
  billing: 'Billing escalation. Issue: {summary}. May need account review. Turn count: {turns}.',
  retention: '⚠️ RETENTION CASE - Customer considering cancellation. Reason: {summary}. Please review retention options.',
};

/**
 * Wait time estimates
 */
const WAIT_TIMES: Record<HandoffType, string> = {
  standard: 'usually 2-3 minutes',
  high_sensitivity: 'priority queue, usually 1-2 minutes',
  user_requested: 'usually 2-3 minutes',
  technical: 'usually 3-5 minutes',
  billing: 'usually 2-4 minutes',
  retention: 'priority queue, usually 1-2 minutes',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine handoff type from context
 */
export function determineHandoffType(context: Partial<HandoffContext>): HandoffType {
  // User explicitly requested
  if (context.intent === 'escalate_issue') {
    return 'user_requested';
  }
  
  // Check for high sensitivity (negative sentiment + high turns or specific emotions)
  const highEmotions = ['raudra', 'bhayanak', 'karun'];
  if (
    context.userSentiment === 'negative' ||
    (context.emotion && highEmotions.includes(context.emotion)) ||
    (context.turnCount && context.turnCount >= 8)
  ) {
    return 'high_sensitivity';
  }
  
  // Technical topics
  const technicalTopics = ['network', 'connectivity', 'speed', 'device', 'setup', 'configuration'];
  if (context.topic && technicalTopics.some(t => context.topic?.includes(t))) {
    return 'technical';
  }
  
  // Billing topics
  const billingTopics = ['billing', 'charge', 'invoice', 'refund', 'payment'];
  if (context.topic && billingTopics.some(t => context.topic?.includes(t))) {
    return 'billing';
  }
  
  // Retention
  if (context.intent === 'cancel_service' || context.topic?.includes('cancel')) {
    return 'retention';
  }
  
  return 'standard';
}

/**
 * Get random message from list
 */
function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Format briefing with context
 */
function formatBriefing(template: string, context: HandoffContext): string {
  return template
    .replace('{summary}', context.issueSummary || 'Not specified')
    .replace('{emotion}', context.emotion || 'neutral')
    .replace('{turns}', String(context.turnCount || 0))
    .replace('{attempts}', String(context.resolutionAttempts || 0));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate handoff template for context
 */
export function generateHandoffTemplate(context: HandoffContext): HandoffTemplate {
  const type = determineHandoffType(context);
  
  return {
    type,
    userMessage: getRandomMessage(USER_MESSAGES[type]),
    agentBriefing: formatBriefing(AGENT_BRIEFINGS[type], context),
    expectedWaitTime: WAIT_TIMES[type],
    includeSummary: type !== 'user_requested',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build complete handoff message for user
 */
export function buildUserHandoffMessage(template: HandoffTemplate, issueSummary?: string): string {
  let message = template.userMessage;
  
  // Add wait time info
  message += `\n\nexpected wait time is ${template.expectedWaitTime}.`;
  
  // Add summary if applicable
  if (template.includeSummary && issueSummary) {
    message += `\n\ni'll make sure they know you're dealing with: ${issueSummary}`;
  }
  
  // Add reassurance for high sensitivity
  if (template.type === 'high_sensitivity') {
    message += `\n\nplease don't worry - this will be handled with priority.`;
  }
  
  return message;
}

/**
 * Format handoff for prompt injection
 */
export function formatHandoffForPrompt(template: HandoffTemplate): string {
  const lines = [
    '## handoff initiated',
    `type: ${template.type}`,
    `wait_time: ${template.expectedWaitTime}`,
    '',
    '### user message to deliver:',
    template.userMessage,
    '',
    '**guidance**: deliver the handoff message, then no further assistance needed',
  ];
  
  return lines.join('\n');
}

/**
 * Get all user messages for type (for testing/preview)
 */
export function getUserMessages(type: HandoffType): string[] {
  return USER_MESSAGES[type];
}

/**
 * Get agent briefing template
 */
export function getAgentBriefingTemplate(type: HandoffType): string {
  return AGENT_BRIEFINGS[type];
}

/**
 * Check if handoff should be prioritized
 */
export function shouldPrioritize(type: HandoffType): boolean {
  const priorityTypes: HandoffType[] = ['high_sensitivity', 'retention'];
  return priorityTypes.includes(type);
}

/**
 * Get handoff type display name
 */
export function getHandoffTypeName(type: HandoffType): string {
  const names: Record<HandoffType, string> = {
    standard: 'standard support',
    high_sensitivity: 'priority support',
    user_requested: 'customer request',
    technical: 'technical specialist',
    billing: 'billing specialist',
    retention: 'retention specialist',
  };
  return names[type];
}
