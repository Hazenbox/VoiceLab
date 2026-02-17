/**
 * Token Assembler
 * 
 * Builds the JIO_MESSAGE_FRAME token bundle per turn.
 * Aggregates tokens from all classification services into a unified structure.
 * 
 * @module services/tokens/tokenAssembler
 */

import { type TokenClassification, classifyTokens } from './tokenClassifier';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete message frame with all classified tokens
 */
export interface JioMessageFrame {
  // Core classification
  classification: TokenClassification;
  
  // User context tokens
  user: UserTokens;
  
  // Conversation context tokens
  conversation: ConversationTokens;
  
  // Environment context tokens
  context: ContextTokens;
  
  // Response control tokens
  response: ResponseTokens;
  
  // Metadata
  meta: FrameMetadata;
}

/**
 * User-related tokens
 */
export interface UserTokens {
  /** User's primary goal */
  goal: string;
  /** User segment (new, loyal, premium, etc.) */
  segment: string;
  /** Current plan type */
  plan: string;
  /** Relationship stage with Jio */
  relationshipStage: string;
  /** State/region */
  state: string;
  /** City */
  city: string;
  /** Locale preference */
  locale: string;
  /** Connectivity profile */
  connectivityProfile: string;
}

/**
 * Conversation-related tokens
 */
export interface ConversationTokens {
  /** Current conversation state */
  state: string;
  /** Resolution status */
  resolutionStatus: string;
  /** Turn number */
  turnNumber: number;
  /** Turn phase */
  turnPhase: string;
  /** Journey stage */
  journeyStage: string;
  /** Session urgency level */
  urgency: string;
}

/**
 * Environmental context tokens
 */
export interface ContextTokens {
  /** Current ecosystem */
  ecosystem: string;
  /** Channel type */
  channel: string;
  /** Time of day */
  timeOfDay: string;
  /** Day type (weekday/weekend/holiday) */
  dayType: string;
  /** Any active events */
  activeEvent: string | null;
  /** Session ID */
  sessionId: string;
}

/**
 * Response control tokens
 */
export interface ResponseTokens {
  /** Route mode */
  routeMode: string;
  /** Action type */
  actionType: string;
  /** Nudge permission level */
  nudgePermission: string;
  /** Detail level */
  detailLevel: string;
  /** Max words */
  maxWords: number;
}

/**
 * Frame metadata
 */
export interface FrameMetadata {
  /** Frame version */
  version: string;
  /** Assembly timestamp */
  assembledAt: number;
  /** Token count */
  tokenCount: number;
  /** Confidence score */
  confidence: number;
}

/**
 * Input for frame assembly
 */
export interface AssemblyInput {
  // Required
  userMessage: string;
  ecosystem: string;
  channel: string;
  sessionId: string;
  
  // Optional context
  conversationHistory?: Array<{ role: string; content: string }>;
  turnNumber?: number;
  userProfile?: Partial<UserTokens>;
  conversationState?: string;
  resolutionStatus?: string;
  
  // Optional overrides
  overrides?: Partial<JioMessageFrame>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_USER_TOKENS: UserTokens = {
  goal: 'unknown',
  segment: 'unknown',
  plan: 'unknown',
  relationshipStage: 'unknown',
  state: 'unknown',
  city: 'unknown',
  locale: 'en-IN',
  connectivityProfile: 'standard',
};

const DEFAULT_CONVERSATION_TOKENS: ConversationTokens = {
  state: 'triage',
  resolutionStatus: 'not_started',
  turnNumber: 1,
  turnPhase: 'opening',
  journeyStage: 'discovery',
  urgency: 'normal',
};

const DEFAULT_CONTEXT_TOKENS: ContextTokens = {
  ecosystem: 'jio_telecom',
  channel: 'chatbot',
  timeOfDay: 'day',
  dayType: 'weekday',
  activeEvent: null,
  sessionId: '',
};

const DEFAULT_RESPONSE_TOKENS: ResponseTokens = {
  routeMode: 'jio_task',
  actionType: 'guide',
  nudgePermission: 'blocked',
  detailLevel: 'standard',
  maxWords: 150,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIME UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get time of day classification
 */
function getTimeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Get day type classification
 */
function getDayType(): 'weekday' | 'weekend' | 'holiday' {
  const day = new Date().getDay();
  // 0 = Sunday, 6 = Saturday
  return (day === 0 || day === 6) ? 'weekend' : 'weekday';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSEMBLY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assemble the complete JIO_MESSAGE_FRAME
 */
export function assembleMessageFrame(input: AssemblyInput): JioMessageFrame {
  const now = Date.now();
  
  // Get token classification
  const classification = classifyTokens(
    input.userMessage,
    input.conversationHistory,
    {
      ecosystem: input.ecosystem,
      channel: input.channel,
    }
  );
  
  // Assemble user tokens
  const user: UserTokens = {
    ...DEFAULT_USER_TOKENS,
    ...input.userProfile,
    goal: inferUserGoal(input.userMessage, classification),
  };
  
  // Assemble conversation tokens
  const conversation: ConversationTokens = {
    ...DEFAULT_CONVERSATION_TOKENS,
    state: input.conversationState || inferConversationState(input.turnNumber || 1),
    resolutionStatus: input.resolutionStatus || 'not_started',
    turnNumber: input.turnNumber || 1,
    turnPhase: inferTurnPhase(input.turnNumber || 1),
    urgency: inferUrgency(classification),
  };
  
  // Assemble context tokens
  const context: ContextTokens = {
    ...DEFAULT_CONTEXT_TOKENS,
    ecosystem: input.ecosystem,
    channel: input.channel,
    sessionId: input.sessionId,
    timeOfDay: getTimeOfDay(),
    dayType: getDayType(),
  };
  
  // Assemble response tokens
  const response: ResponseTokens = {
    ...DEFAULT_RESPONSE_TOKENS,
    routeMode: inferRouteMode(classification),
    actionType: inferActionType(classification),
    detailLevel: inferDetailLevel(conversation.turnPhase),
    maxWords: inferMaxWords(conversation.turnPhase, context.channel),
  };
  
  // Apply overrides
  const frame: JioMessageFrame = {
    classification,
    user: { ...user, ...input.overrides?.user },
    conversation: { ...conversation, ...input.overrides?.conversation },
    context: { ...context, ...input.overrides?.context },
    response: { ...response, ...input.overrides?.response },
    meta: {
      version: '1.0',
      assembledAt: now,
      tokenCount: countTokens(classification),
      confidence: calculateConfidence(classification),
    },
  };
  
  return frame;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INFERENCE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Infer user goal from message and classification
 */
function inferUserGoal(message: string, classification: TokenClassification): string {
  const text = message.toLowerCase();
  
  // Map intents to goals
  const intentGoalMap: Record<string, string> = {
    support: 'fix_issue',
    complaint: 'resolve_complaint',
    inquiry: 'understand_topic',
    transaction: 'complete_transaction',
    feedback: 'provide_feedback',
    general: 'get_information',
    greeting: 'start_conversation',
    farewell: 'end_conversation',
  };
  
  // Check for specific patterns
  if (/\b(how (do|can|to)|what is|explain|tell me)\b/i.test(text)) {
    return 'understand_topic';
  }
  if (/\b(not working|problem|issue|error|failed|can't)\b/i.test(text)) {
    return 'fix_issue';
  }
  if (/\b(recharge|payment|buy|purchase|subscribe)\b/i.test(text)) {
    return 'complete_transaction';
  }
  if (/\b(change|update|modify|cancel)\b/i.test(text)) {
    return 'modify_subscription';
  }
  
  return intentGoalMap[classification.intent] || 'unknown';
}

/**
 * Infer conversation state from turn number
 */
function inferConversationState(turnNumber: number): string {
  if (turnNumber <= 1) return 'opening';
  if (turnNumber <= 3) return 'information_gathering';
  if (turnNumber <= 6) return 'processing';
  return 'resolution';
}

/**
 * Infer turn phase from turn number
 */
function inferTurnPhase(turnNumber: number): string {
  if (turnNumber <= 2) return 'opening';
  if (turnNumber <= 5) return 'active';
  if (turnNumber <= 8) return 'extended';
  return 'prolonged';
}

/**
 * Infer urgency from classification
 */
function inferUrgency(classification: TokenClassification): string {
  // High urgency emotions
  const highUrgencyEmotions = ['raudra', 'bhayanaka'];
  if (highUrgencyEmotions.includes(classification.emotion)) {
    return 'high';
  }
  
  // High urgency intents
  if (classification.intent === 'complaint') {
    return 'high';
  }
  
  // Risk-based urgency
  if (classification.risk === 'high') {
    return 'critical';
  }
  if (classification.risk === 'medium') {
    return 'elevated';
  }
  
  return 'normal';
}

/**
 * Infer route mode from classification
 */
function inferRouteMode(classification: TokenClassification): string {
  const jioTaskIntents = ['support', 'complaint', 'transaction'];
  const openChatIntents = ['general', 'greeting', 'farewell'];
  
  if (jioTaskIntents.includes(classification.intent)) {
    return 'jio_task';
  }
  if (openChatIntents.includes(classification.intent)) {
    return 'open_chat';
  }
  return 'mixed';
}

/**
 * Infer action type from classification
 */
function inferActionType(classification: TokenClassification): string {
  switch (classification.intent) {
    case 'inquiry':
      return 'explain';
    case 'support':
      return 'guide';
    case 'complaint':
      return 'reassure';
    case 'transaction':
      return 'transact';
    default:
      return 'guide';
  }
}

/**
 * Infer detail level from turn phase
 */
function inferDetailLevel(turnPhase: string): string {
  switch (turnPhase) {
    case 'opening':
      return 'full';
    case 'active':
      return 'moderate';
    case 'extended':
    case 'prolonged':
      return 'brief';
    default:
      return 'standard';
  }
}

/**
 * Infer max words from turn phase and channel
 */
function inferMaxWords(turnPhase: string, channel: string): number {
  // Channel-based limits
  const channelLimits: Record<string, number> = {
    sms: 80,
    whatsapp: 120,
    chatbot: 150,
    voice: 100,
    ivr: 60,
    email: 300,
  };
  
  const baseLimit = channelLimits[channel] || 150;
  
  // Phase adjustments
  const phaseMultipliers: Record<string, number> = {
    opening: 1.0,
    active: 0.9,
    extended: 0.7,
    prolonged: 0.6,
  };
  
  const multiplier = phaseMultipliers[turnPhase] || 1.0;
  
  return Math.round(baseLimit * multiplier);
}

/**
 * Count total tokens in classification
 */
function countTokens(classification: TokenClassification): number {
  // Count non-null/non-default tokens
  let count = 0;
  if (classification.intent) count++;
  if (classification.emotion) count++;
  if (classification.language) count++;
  if (classification.ecosystem) count++;
  if (classification.channel) count++;
  if (classification.topic) count++;
  if (classification.sentiment) count++;
  if (classification.risk) count++;
  if (classification.persona) count++;
  return count;
}

/**
 * Calculate confidence score for the frame
 */
function calculateConfidence(classification: TokenClassification): number {
  // Base confidence from classification scores
  let total = 0;
  let count = 0;
  
  if (classification.intentScore) { total += classification.intentScore; count++; }
  if (classification.emotionScore) { total += classification.emotionScore; count++; }
  if (classification.sentimentScore) { total += classification.sentimentScore; count++; }
  
  if (count === 0) return 0.5;
  return total / count;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serialize frame to prompt format
 */
export function frameToPrompt(frame: JioMessageFrame): string {
  const lines: string[] = [
    '# JIO_MESSAGE_FRAME',
    '',
    '## classification',
    `intent: ${frame.classification.intent}`,
    `emotion: ${frame.classification.emotion}`,
    `sentiment: ${frame.classification.sentiment}`,
    `language: ${frame.classification.language}`,
    `topic: ${frame.classification.topic}`,
    `risk: ${frame.classification.risk}`,
    '',
    '## user context',
    `goal: ${frame.user.goal}`,
    `segment: ${frame.user.segment}`,
    `relationship: ${frame.user.relationshipStage}`,
    '',
    '## conversation context',
    `state: ${frame.conversation.state}`,
    `resolution: ${frame.conversation.resolutionStatus}`,
    `turn: ${frame.conversation.turnNumber} (${frame.conversation.turnPhase})`,
    `urgency: ${frame.conversation.urgency}`,
    '',
    '## response control',
    `route: ${frame.response.routeMode}`,
    `action: ${frame.response.actionType}`,
    `detail: ${frame.response.detailLevel}`,
    `max_words: ${frame.response.maxWords}`,
    '',
    `[confidence: ${(frame.meta.confidence * 100).toFixed(0)}%]`,
  ];
  
  return lines.join('\n');
}

/**
 * Get compact frame summary for logging
 */
export function getFrameSummary(frame: JioMessageFrame): string {
  return [
    `intent=${frame.classification.intent}`,
    `emotion=${frame.classification.emotion}`,
    `turn=${frame.conversation.turnNumber}`,
    `route=${frame.response.routeMode}`,
    `conf=${(frame.meta.confidence * 100).toFixed(0)}%`,
  ].join(' | ');
}
