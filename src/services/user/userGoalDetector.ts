/**
 * User Goal Detector
 * 
 * Detects the user's underlying goal from their message.
 * 25 goal types based on Constitutional OS specification.
 * 
 * @module services/user/userGoalDetector
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All possible user goals (25 types)
 */
export type UserGoal =
  // Information goals
  | 'understand_topic'          // Learn about something
  | 'compare_options'           // Compare products/plans
  | 'find_information'          // Find specific information
  | 'check_status'              // Check order/request status
  | 'verify_details'            // Confirm account/plan details
  
  // Problem resolution goals
  | 'fix_issue'                 // Fix a technical problem
  | 'resolve_complaint'         // Get complaint addressed
  | 'recover_account'           // Regain access to account
  | 'troubleshoot_problem'      // Diagnose and fix issue
  | 'get_refund'                // Request money back
  
  // Transaction goals
  | 'complete_transaction'      // Finish a purchase/payment
  | 'modify_subscription'       // Change plan/subscription
  | 'cancel_service'            // Cancel a service
  | 'activate_service'          // Start using a service
  | 'upgrade_plan'              // Move to higher tier
  
  // Account management goals
  | 'update_profile'            // Change account details
  | 'manage_settings'           // Adjust preferences
  | 'link_accounts'             // Connect services
  | 'transfer_service'          // Port/transfer service
  
  // Communication goals
  | 'provide_feedback'          // Share opinion/feedback
  | 'request_callback'          // Ask for call back
  | 'escalate_issue'            // Talk to human/supervisor
  | 'start_conversation'        // Begin interaction
  | 'end_conversation'          // Finish interaction
  
  // General
  | 'unknown';                  // Cannot determine goal

/**
 * Goal detection result
 */
export interface GoalDetection {
  /** Primary detected goal */
  goal: UserGoal;
  /** Confidence score 0-1 */
  confidence: number;
  /** Secondary goal if applicable */
  secondaryGoal?: UserGoal;
  /** What triggered this detection */
  trigger: 'pattern' | 'keyword' | 'context' | 'fallback';
  /** Detected sub-intent or specifics */
  specifics?: string;
  /** Urgency level */
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Input for goal detection
 */
export interface GoalDetectionInput {
  message: string;
  intent?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  previousGoal?: UserGoal;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Goal patterns - mapping patterns to goals
 */
const GOAL_PATTERNS: Array<{
  goal: UserGoal;
  patterns: RegExp[];
  keywords: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}> = [
  // Information goals
  {
    goal: 'understand_topic',
    patterns: [
      /\b(what is|what('s| are)|how does|explain|tell me about|help me understand)\b/i,
      /\b(learn|know|understand) (about|more)\b/i,
    ],
    keywords: ['explain', 'what', 'how', 'why', 'learn', 'understand'],
    urgency: 'low',
  },
  {
    goal: 'compare_options',
    patterns: [
      /\b(compare|which is better|difference between|vs|versus)\b/i,
      /\b(best|recommend|suggest)\s+(plan|option|package)\b/i,
    ],
    keywords: ['compare', 'better', 'difference', 'recommend', 'best'],
    urgency: 'low',
  },
  {
    goal: 'find_information',
    patterns: [
      /\b(where (can|do) i find|how (do|can) i (get|find|see))\b/i,
      /\b(looking for|need to know|tell me)\b/i,
    ],
    keywords: ['find', 'where', 'looking', 'search', 'locate'],
    urgency: 'low',
  },
  {
    goal: 'check_status',
    patterns: [
      /\b(status|track|where is|when will)\b/i,
      /\b(order|request|complaint|application) (status|number)\b/i,
    ],
    keywords: ['status', 'track', 'where', 'when', 'order'],
    urgency: 'medium',
  },
  {
    goal: 'verify_details',
    patterns: [
      /\b(confirm|verify|check)\s+(my|the)\b/i,
      /\b(what('s| is) my|do i have)\b/i,
    ],
    keywords: ['confirm', 'verify', 'check', 'correct', 'accurate'],
    urgency: 'low',
  },
  
  // Problem resolution goals
  {
    goal: 'fix_issue',
    patterns: [
      /\b(not working|doesn't work|problem with|issue with|can't|cannot)\b/i,
      /\b(fix|solve|repair|help with)\s+(this|my|the)\b/i,
      /\b(error|failed|failing|broken)\b/i,
    ],
    keywords: ['problem', 'issue', 'error', 'fix', 'not working', 'broken'],
    urgency: 'high',
  },
  {
    goal: 'resolve_complaint',
    patterns: [
      /\b(complaint|frustrated|angry|unacceptable|worst)\b/i,
      /\b(not happy|dissatisfied|disappointed)\b/i,
    ],
    keywords: ['complaint', 'frustrated', 'unacceptable', 'disappointed'],
    urgency: 'high',
  },
  {
    goal: 'recover_account',
    patterns: [
      /\b(forgot|reset|recover|locked out|can't (login|log in|access))\b/i,
      /\b(account|password) (recovery|reset)\b/i,
    ],
    keywords: ['forgot', 'reset', 'recover', 'locked', 'access', 'password'],
    urgency: 'high',
  },
  {
    goal: 'troubleshoot_problem',
    patterns: [
      /\b(diagnose|troubleshoot|figure out|why is|why does)\b/i,
      /\b(keeps? (happening|crashing|failing))\b/i,
    ],
    keywords: ['troubleshoot', 'diagnose', 'why', 'keeps', 'happening'],
    urgency: 'medium',
  },
  {
    goal: 'get_refund',
    patterns: [
      /\b(refund|money back|charge back|reverse|wrong charge)\b/i,
      /\b(charged (wrongly|incorrectly)|didn't (receive|get))\b/i,
    ],
    keywords: ['refund', 'money back', 'wrong charge', 'reverse'],
    urgency: 'high',
  },
  
  // Transaction goals
  {
    goal: 'complete_transaction',
    patterns: [
      /\b(buy|purchase|pay|recharge|subscribe)\b/i,
      /\b(want to|need to|how (do|can) i)\s+(buy|pay|recharge|purchase)\b/i,
    ],
    keywords: ['buy', 'purchase', 'pay', 'recharge', 'subscribe'],
    urgency: 'medium',
  },
  {
    goal: 'modify_subscription',
    patterns: [
      /\b(change|modify|update|switch)\s+(my|the)?\s*(plan|subscription|package)\b/i,
      /\b(different|another) (plan|package)\b/i,
    ],
    keywords: ['change', 'modify', 'switch', 'different', 'another'],
    urgency: 'medium',
  },
  {
    goal: 'cancel_service',
    patterns: [
      /\b(cancel|stop|end|discontinue|terminate)\s+(my|the)?\s*(service|subscription|plan)\b/i,
      /\b(don't want|no longer (need|want))\b/i,
    ],
    keywords: ['cancel', 'stop', 'end', 'discontinue', 'terminate'],
    urgency: 'medium',
  },
  {
    goal: 'activate_service',
    patterns: [
      /\b(activate|start|begin|enable|turn on)\s+(my|the)?\s*(service|plan|sim)\b/i,
      /\b(new|just (got|bought))\s+(sim|connection|plan)\b/i,
    ],
    keywords: ['activate', 'start', 'enable', 'new', 'begin'],
    urgency: 'medium',
  },
  {
    goal: 'upgrade_plan',
    patterns: [
      /\b(upgrade|higher|better|more (data|speed))\s*(plan|package)?\b/i,
      /\b(want more|need more|increase)\b/i,
    ],
    keywords: ['upgrade', 'higher', 'better', 'more', 'increase'],
    urgency: 'low',
  },
  
  // Account management goals
  {
    goal: 'update_profile',
    patterns: [
      /\b(update|change|edit)\s+(my)?\s*(profile|details|name|email|phone|address)\b/i,
      /\b(wrong|incorrect)\s*(name|email|address|number)\b/i,
    ],
    keywords: ['update', 'change', 'edit', 'profile', 'details'],
    urgency: 'low',
  },
  {
    goal: 'manage_settings',
    patterns: [
      /\b(settings|preferences|notifications|alerts)\b/i,
      /\b(turn (on|off)|enable|disable)\b/i,
    ],
    keywords: ['settings', 'preferences', 'notifications', 'turn'],
    urgency: 'low',
  },
  {
    goal: 'link_accounts',
    patterns: [
      /\b(link|connect|merge|combine)\s+(my)?\s*(accounts?)\b/i,
      /\b(add|associate)\s+(to my account)\b/i,
    ],
    keywords: ['link', 'connect', 'merge', 'combine', 'associate'],
    urgency: 'low',
  },
  {
    goal: 'transfer_service',
    patterns: [
      /\b(port|transfer|move)\s+(my)?\s*(number|service|connection)\b/i,
      /\b(mnp|mobile number portability)\b/i,
    ],
    keywords: ['port', 'transfer', 'move', 'mnp'],
    urgency: 'medium',
  },
  
  // Communication goals
  {
    goal: 'provide_feedback',
    patterns: [
      /\b(feedback|suggestion|review|opinion)\b/i,
      /\b(want to (say|share|tell))\b/i,
    ],
    keywords: ['feedback', 'suggestion', 'review', 'opinion'],
    urgency: 'low',
  },
  {
    goal: 'request_callback',
    patterns: [
      /\b(call (me|back)|callback|phone me)\b/i,
      /\b(schedule|request) (a )?(call|callback)\b/i,
    ],
    keywords: ['call', 'callback', 'phone'],
    urgency: 'medium',
  },
  {
    goal: 'escalate_issue',
    patterns: [
      /\b(speak|talk)\s+(to|with)\s+(human|person|agent|supervisor|manager)\b/i,
      /\b(escalate|higher authority|senior)\b/i,
    ],
    keywords: ['human', 'person', 'agent', 'supervisor', 'escalate'],
    urgency: 'high',
  },
  {
    goal: 'start_conversation',
    patterns: [
      /^(hi|hello|hey|good\s+(morning|afternoon|evening)|namaste)\b/i,
    ],
    keywords: ['hi', 'hello', 'hey', 'namaste'],
    urgency: 'low',
  },
  {
    goal: 'end_conversation',
    patterns: [
      /^(bye|goodbye|thanks|thank you|that('s| is) (all|it))\b/i,
      /\b(no\s+)?(more|further) (help|questions|issues)\b/i,
    ],
    keywords: ['bye', 'goodbye', 'thanks', 'done'],
    urgency: 'low',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect user goal from message
 */
export function detectUserGoal(input: GoalDetectionInput): GoalDetection {
  const { message, intent, conversationHistory, previousGoal } = input;
  const text = message.toLowerCase();
  
  let bestMatch: {
    goal: UserGoal;
    score: number;
    trigger: 'pattern' | 'keyword' | 'context' | 'fallback';
    urgency: 'low' | 'medium' | 'high' | 'critical';
  } | null = null;
  
  let secondaryMatch: UserGoal | undefined;
  
  // Check patterns first
  for (const entry of GOAL_PATTERNS) {
    let score = 0;
    
    // Pattern matching (high confidence)
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) {
        score += 0.4;
        break;
      }
    }
    
    // Keyword matching (medium confidence)
    for (const keyword of entry.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 0.1;
      }
    }
    
    // Boost if matches previous goal (continuation)
    if (previousGoal === entry.goal) {
      score += 0.15;
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      if (bestMatch) {
        secondaryMatch = bestMatch.goal;
      }
      bestMatch = {
        goal: entry.goal,
        score,
        trigger: score >= 0.4 ? 'pattern' : 'keyword',
        urgency: entry.urgency,
      };
    } else if (score > 0 && bestMatch && score > 0.2 && entry.goal !== bestMatch.goal) {
      secondaryMatch = entry.goal;
    }
  }
  
  // Intent-based fallback
  if (!bestMatch && intent) {
    const intentGoalMap: Partial<Record<string, UserGoal>> = {
      inquiry: 'understand_topic',
      support: 'fix_issue',
      complaint: 'resolve_complaint',
      transaction: 'complete_transaction',
      feedback: 'provide_feedback',
      greeting: 'start_conversation',
      farewell: 'end_conversation',
    };
    
    const mappedGoal = intentGoalMap[intent];
    if (mappedGoal) {
      bestMatch = {
        goal: mappedGoal,
        score: 0.5,
        trigger: 'context',
        urgency: GOAL_PATTERNS.find(p => p.goal === mappedGoal)?.urgency || 'medium',
      };
    }
  }
  
  // Context-based inference from history
  if (!bestMatch && conversationHistory && conversationHistory.length > 0) {
    const lastUserMessage = conversationHistory
      .filter(m => m.role === 'user')
      .slice(-1)[0];
    
    if (lastUserMessage) {
      // Try to detect from recent history
      const historyResult = detectUserGoal({
        message: lastUserMessage.content,
      });
      
      if (historyResult.goal !== 'unknown') {
        bestMatch = {
          goal: historyResult.goal,
          score: historyResult.confidence * 0.7,
          trigger: 'context',
          urgency: historyResult.urgency,
        };
      }
    }
  }
  
  // Final fallback
  if (!bestMatch) {
    return {
      goal: 'unknown',
      confidence: 0,
      trigger: 'fallback',
      urgency: 'low',
    };
  }
  
  return {
    goal: bestMatch.goal,
    confidence: Math.min(bestMatch.score, 1),
    secondaryGoal: secondaryMatch,
    trigger: bestMatch.trigger,
    urgency: bestMatch.urgency,
    specifics: extractGoalSpecifics(message, bestMatch.goal),
  };
}

/**
 * Extract specific details about the goal
 */
function extractGoalSpecifics(message: string, goal: UserGoal): string | undefined {
  const text = message.toLowerCase();
  
  // Extract what they want to understand
  if (goal === 'understand_topic') {
    const match = text.match(/(?:what is|explain|tell me about)\s+(.+?)(?:\?|$)/i);
    return match ? match[1].trim() : undefined;
  }
  
  // Extract what's not working
  if (goal === 'fix_issue') {
    const match = text.match(/(?:not working|problem with|issue with)\s+(.+?)(?:\.|$)/i);
    return match ? match[1].trim() : undefined;
  }
  
  // Extract what they want to buy
  if (goal === 'complete_transaction') {
    const match = text.match(/(?:buy|purchase|recharge)\s+(.+?)(?:\.|$)/i);
    return match ? match[1].trim() : undefined;
  }
  
  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get goal prompt context
 */
export function getGoalPromptContext(detection: GoalDetection): string {
  const lines = [
    `## user goal`,
    `goal: ${detection.goal}`,
    `confidence: ${(detection.confidence * 100).toFixed(0)}%`,
    `urgency: ${detection.urgency}`,
  ];
  
  if (detection.specifics) {
    lines.push(`specifics: ${detection.specifics}`);
  }
  
  if (detection.secondaryGoal) {
    lines.push(`secondary goal: ${detection.secondaryGoal}`);
  }
  
  // Goal-specific guidance
  lines.push('');
  lines.push(`**guidance**: ${getGoalGuidance(detection.goal)}`);
  
  return lines.join('\n');
}

/**
 * Get guidance for a specific goal
 */
export function getGoalGuidance(goal: UserGoal): string {
  const guidance: Record<UserGoal, string> = {
    understand_topic: 'explain clearly and comprehensively',
    compare_options: 'present objective comparison with pros/cons',
    find_information: 'provide direct answer or guide to source',
    check_status: 'provide status update or guide how to check',
    verify_details: 'confirm details or show how to view them',
    fix_issue: 'diagnose problem and provide step-by-step solution',
    resolve_complaint: 'acknowledge frustration, apologize, and resolve',
    recover_account: 'guide through secure recovery process',
    troubleshoot_problem: 'systematic diagnosis and solution',
    get_refund: 'verify eligibility and process or explain policy',
    complete_transaction: 'guide through transaction smoothly',
    modify_subscription: 'explain options and execute change',
    cancel_service: 'understand reason, offer alternatives, then process',
    activate_service: 'complete activation steps',
    upgrade_plan: 'present options with clear benefits',
    update_profile: 'guide through update process',
    manage_settings: 'help adjust settings as requested',
    link_accounts: 'guide through linking process',
    transfer_service: 'explain process and requirements',
    provide_feedback: 'acknowledge and thank for feedback',
    request_callback: 'schedule callback or provide direct contact',
    escalate_issue: 'acknowledge and initiate handoff',
    start_conversation: 'greet warmly and offer assistance',
    end_conversation: 'confirm satisfaction and close warmly',
    unknown: 'ask clarifying question to understand need',
  };
  
  return guidance[goal];
}

/**
 * Check if goal requires human handoff
 */
export function goalRequiresHandoff(goal: UserGoal): boolean {
  const handoffGoals: UserGoal[] = ['escalate_issue', 'request_callback'];
  return handoffGoals.includes(goal);
}

/**
 * Check if goal is transactional
 */
export function isTransactionalGoal(goal: UserGoal): boolean {
  const transactional: UserGoal[] = [
    'complete_transaction',
    'modify_subscription',
    'cancel_service',
    'activate_service',
    'upgrade_plan',
  ];
  return transactional.includes(goal);
}

/**
 * Get all goal categories
 */
export function getGoalCategories(): Record<string, UserGoal[]> {
  return {
    information: ['understand_topic', 'compare_options', 'find_information', 'check_status', 'verify_details'],
    resolution: ['fix_issue', 'resolve_complaint', 'recover_account', 'troubleshoot_problem', 'get_refund'],
    transaction: ['complete_transaction', 'modify_subscription', 'cancel_service', 'activate_service', 'upgrade_plan'],
    account: ['update_profile', 'manage_settings', 'link_accounts', 'transfer_service'],
    communication: ['provide_feedback', 'request_callback', 'escalate_issue', 'start_conversation', 'end_conversation'],
  };
}
