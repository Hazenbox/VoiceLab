/**
 * Routing Classifier
 * 
 * Determines route mode (jio_task, open_chat, mixed) for conversations.
 * Classifies whether user intent is Jio-specific or general conversation.
 * 
 * @module services/routing/routingClassifier
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Routing mode types
 */
export type RouteMode = 'jio_task' | 'open_chat' | 'mixed';

/**
 * Trigger types for routing decisions
 */
export type RouteTrigger =
  | 'keyword'           // Jio-specific keyword detected
  | 'intent'            // Intent classification triggered
  | 'context'           // Conversation context triggered
  | 'explicit'          // User explicitly asked
  | 'fallback'          // Default fallback
  | 'continuation';     // Continuing previous route

/**
 * Routing classification result
 */
export interface RoutingResult {
  /** Determined route mode */
  mode: RouteMode;
  /** Confidence score 0-1 */
  confidence: number;
  /** What triggered this routing decision */
  trigger: RouteTrigger;
  /** Primary topic detected */
  topic: string;
  /** Whether handoff might be needed */
  handoffLikely: boolean;
  /** Suggested ecosystem */
  suggestedEcosystem: string;
  /** Matched patterns for debugging */
  matchedPatterns: string[];
}

/**
 * Input for routing classification
 */
export interface RoutingInput {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  currentEcosystem?: string;
  previousRouteMode?: RouteMode;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Jio-specific keyword patterns
 */
const JIO_KEYWORDS = {
  brand: /\b(jio|reliance|myjio|jiosaavn|jiocinema|jiomart|jiofiber|jiocloud)\b/i,
  products: /\b(sim|recharge|prepaid|postpaid|wifi|broadband|dth|set.?top.?box|router|dongle)\b/i,
  services: /\b(data.?pack|validity|plan|caller.?tune|roaming|international|voucher|coupon)\b/i,
  issues: /\b(network|signal|no.?service|slow|speed|not.?working|buffering|loading|error)\b/i,
  actions: /\b(activate|deactivate|port|mnp|kyc|ekyc|trai|aadhar|aadhaar)\b/i,
  billing: /\b(bill|invoice|payment|due|outstanding|balance|usage|consumption)\b/i,
};

/**
 * Open chat / general conversation patterns
 */
const OPEN_CHAT_PATTERNS = {
  greeting: /^(hi|hello|hey|good\s+(morning|afternoon|evening)|namaste|namaskar)\b/i,
  farewell: /\b(bye|goodbye|thanks|thank\s*you|see\s*you|take\s*care)\b$/i,
  general_question: /\b(what\s+is|who\s+is|where\s+is|when\s+is|how\s+does|can\s+you\s+tell\s+me)\b/i,
  chitchat: /\b(how\s+are\s+you|what('s|\s+is)\s+up|what\s+do\s+you\s+think|tell\s+me\s+(about|a)\s+(joke|story))\b/i,
  opinion: /\b(what('s|\s+is)\s+your\s+(opinion|thought|favorite)|do\s+you\s+(like|think|believe))\b/i,
};

/**
 * Ecosystem detection patterns
 */
const ECOSYSTEM_PATTERNS: Record<string, RegExp> = {
  jio_telecom: /\b(mobile|phone|sim|recharge|prepaid|postpaid|network|signal|data|sms|call|voice)\b/i,
  jio_fiber: /\b(fiber|broadband|wifi|router|internet|connection|speed|download|upload|modem)\b/i,
  jio_tv: /\b(tv|television|dth|set.?top|channels|recording|guide|remote)\b/i,
  jio_cinema: /\b(cinema|movie|film|show|series|watch|stream|video|content)\b/i,
  jio_saavn: /\b(saavn|music|song|artist|album|playlist|podcast|audio)\b/i,
  jio_mart: /\b(mart|grocery|shop|order|delivery|product|cart|checkout)\b/i,
  jio_cloud: /\b(cloud|storage|backup|photo|sync|space|file)\b/i,
  jio_payments: /\b(pay|upi|wallet|transfer|money|transaction|payment)\b/i,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if message matches Jio-specific patterns
 */
function matchJioPatterns(message: string): { matched: boolean; patterns: string[]; score: number } {
  const matched: string[] = [];
  let score = 0;
  
  for (const [category, pattern] of Object.entries(JIO_KEYWORDS)) {
    if (pattern.test(message)) {
      matched.push(`jio_${category}`);
      score += 0.2;
    }
  }
  
  return {
    matched: matched.length > 0,
    patterns: matched,
    score: Math.min(score, 1),
  };
}

/**
 * Check if message matches open chat patterns
 */
function matchOpenChatPatterns(message: string): { matched: boolean; patterns: string[]; score: number } {
  const matched: string[] = [];
  let score = 0;
  
  for (const [category, pattern] of Object.entries(OPEN_CHAT_PATTERNS)) {
    if (pattern.test(message)) {
      matched.push(`chat_${category}`);
      score += 0.25;
    }
  }
  
  return {
    matched: matched.length > 0,
    patterns: matched,
    score: Math.min(score, 1),
  };
}

/**
 * Detect most likely ecosystem from message
 */
function detectEcosystem(message: string, defaultEcosystem: string = 'jio_telecom'): string {
  let bestMatch = defaultEcosystem;
  let highestScore = 0;
  
  for (const [ecosystem, pattern] of Object.entries(ECOSYSTEM_PATTERNS)) {
    const matches = message.match(pattern);
    const score = matches ? matches.length * 0.3 : 0;
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = ecosystem;
    }
  }
  
  return bestMatch;
}

/**
 * Extract topic from message
 */
function extractTopic(message: string): string {
  const text = message.toLowerCase();
  
  // Topic patterns in priority order
  const topicPatterns: [RegExp, string][] = [
    [/\b(recharge|topup|top.?up)\b/i, 'recharge'],
    [/\b(bill|invoice|payment)\b/i, 'billing'],
    [/\b(plan|pack|offer)\b/i, 'plans'],
    [/\b(network|signal|connectivity)\b/i, 'network'],
    [/\b(speed|slow|fast)\b/i, 'speed'],
    [/\b(activate|activation)\b/i, 'activation'],
    [/\b(cancel|deactivate)\b/i, 'cancellation'],
    [/\b(port|mnp|switch)\b/i, 'porting'],
    [/\b(complaint|issue|problem)\b/i, 'complaint'],
    [/\b(help|support|assist)\b/i, 'support'],
  ];
  
  for (const [pattern, topic] of topicPatterns) {
    if (pattern.test(text)) {
      return topic;
    }
  }
  
  return 'general';
}

/**
 * Check if handoff is likely needed based on message content
 */
function isHandoffLikely(message: string, jioScore: number): boolean {
  const text = message.toLowerCase();
  
  // High handoff likelihood patterns
  const handoffPatterns = [
    /\b(speak|talk)\s+(to|with)\s+(human|person|agent|someone)\b/i,
    /\b(not\s+)?resolved\b/i,
    /\b(still|same)\s+(issue|problem)\b/i,
    /\b(escalate|supervisor|manager)\b/i,
    /\b(worst|terrible|horrible|disgusting)\b/i,
    /\b(legal|consumer\s+court|trai\s+complaint)\b/i,
  ];
  
  for (const pattern of handoffPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  
  // If it's a Jio task but very negative sentiment
  if (jioScore > 0.5 && /\b(fed\s+up|enough|frustrated|angry)\b/i.test(text)) {
    return true;
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASSIFIER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classify the routing mode for a message
 */
export function classifyRoute(input: RoutingInput): RoutingResult {
  const { message, conversationHistory, currentEcosystem, previousRouteMode } = input;
  
  // Get pattern matches
  const jioMatch = matchJioPatterns(message);
  const chatMatch = matchOpenChatPatterns(message);
  
  // Calculate base scores
  let jioScore = jioMatch.score;
  let chatScore = chatMatch.score;
  
  // Adjust based on conversation history
  if (conversationHistory && conversationHistory.length > 0) {
    // If previous messages were Jio-related, increase Jio score
    const recentHistory = conversationHistory.slice(-3);
    for (const msg of recentHistory) {
      if (matchJioPatterns(msg.content).matched) {
        jioScore += 0.1;
      }
    }
  }
  
  // Adjust based on previous route mode (continuation bias)
  if (previousRouteMode) {
    if (previousRouteMode === 'jio_task') {
      jioScore += 0.15;
    } else if (previousRouteMode === 'open_chat') {
      chatScore += 0.1;
    }
  }
  
  // Determine route mode
  let mode: RouteMode;
  let confidence: number;
  let trigger: RouteTrigger;
  const matchedPatterns = [...jioMatch.patterns, ...chatMatch.patterns];
  
  const scoreDiff = Math.abs(jioScore - chatScore);
  
  if (jioScore > chatScore + 0.1) {
    mode = 'jio_task';
    confidence = Math.min(jioScore + (scoreDiff * 0.5), 1);
    trigger = jioMatch.matched ? 'keyword' : 
              previousRouteMode === 'jio_task' ? 'continuation' : 'context';
  } else if (chatScore > jioScore + 0.1) {
    mode = 'open_chat';
    confidence = Math.min(chatScore + (scoreDiff * 0.5), 1);
    trigger = chatMatch.matched ? 'keyword' :
              previousRouteMode === 'open_chat' ? 'continuation' : 'context';
  } else {
    // Mixed mode when both have similar scores
    mode = 'mixed';
    confidence = Math.max(jioScore, chatScore) * 0.8;
    trigger = matchedPatterns.length > 0 ? 'keyword' : 'fallback';
  }
  
  // Get ecosystem and topic
  const suggestedEcosystem = detectEcosystem(message, currentEcosystem);
  const topic = extractTopic(message);
  
  // Check handoff likelihood
  const handoffLikely = isHandoffLikely(message, jioScore);
  
  return {
    mode,
    confidence,
    trigger,
    topic,
    handoffLikely,
    suggestedEcosystem,
    matchedPatterns,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get routing prompt context
 */
export function getRoutingPromptContext(result: RoutingResult): string {
  const lines = [
    `## routing context`,
    `route: ${result.mode}`,
    `confidence: ${(result.confidence * 100).toFixed(0)}%`,
    `trigger: ${result.trigger}`,
    `topic: ${result.topic}`,
    `ecosystem: ${result.suggestedEcosystem}`,
  ];
  
  if (result.handoffLikely) {
    lines.push('⚠️ handoff likely - be prepared to offer human assistance');
  }
  
  // Mode-specific guidance
  switch (result.mode) {
    case 'jio_task':
      lines.push('');
      lines.push('**guidance**: focus on Jio service resolution, use official processes');
      break;
    case 'open_chat':
      lines.push('');
      lines.push('**guidance**: be conversational but guide towards Jio services if relevant');
      break;
    case 'mixed':
      lines.push('');
      lines.push('**guidance**: balance general conversation with Jio service awareness');
      break;
  }
  
  return lines.join('\n');
}

/**
 * Check if current route should switch
 */
export function shouldSwitchRoute(
  currentMode: RouteMode,
  newResult: RoutingResult
): boolean {
  // Only switch if confidence is high enough
  if (newResult.confidence < 0.6) return false;
  
  // Don't switch away from jio_task unless very confident
  if (currentMode === 'jio_task' && newResult.mode !== 'jio_task') {
    return newResult.confidence > 0.8;
  }
  
  // Can switch to jio_task more easily
  if (newResult.mode === 'jio_task' && currentMode !== 'jio_task') {
    return newResult.confidence > 0.5;
  }
  
  return newResult.mode !== currentMode;
}

/**
 * Get route mode display name
 */
export function getRouteModeDisplayName(mode: RouteMode): string {
  const names: Record<RouteMode, string> = {
    jio_task: 'Jio Service Mode',
    open_chat: 'General Conversation',
    mixed: 'Hybrid Mode',
  };
  return names[mode];
}
