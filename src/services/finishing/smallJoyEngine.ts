/**
 * Small Joy Engine
 * 
 * Adds small moments of delight to responses.
 * 6 joy types with placement rules and domain templates.
 * 
 * @module services/finishing/smallJoyEngine
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Small joy types
 */
export type JoyType =
  | 'celebratory'      // Milestone/achievement celebration
  | 'empathetic'       // Understanding their situation
  | 'reassuring'       // Confidence boosting
  | 'playful'          // Light humor/wit
  | 'insider'          // Making them feel special
  | 'none';            // No joy element

/**
 * Joy placement
 */
export type JoyPlacement =
  | 'opening'    // At start of response
  | 'inline'     // Within the response
  | 'closing';   // At end of response

/**
 * Joy element
 */
export interface JoyElement {
  type: JoyType;
  text: string;
  placement: JoyPlacement;
  domain?: string;
}

/**
 * Joy selection result
 */
export interface JoySelection {
  shouldInclude: boolean;
  element: JoyElement | null;
  reason: string;
}

/**
 * Context for joy selection
 */
export interface JoyContext {
  emotion: string;
  emotionIntensity?: number | string;
  intent: string;
  topic: string;
  ecosystem: string;
  resolutionStatus: string;
  turnNumber: number;
  isMilestone?: boolean;
  milestoneType?: string;
  // Phase F additions per Tokens v2
  safetyDomain?: string;
  riskLevel?: string;
  isComplaint?: boolean;
  isEscalated?: boolean;
  contextEvent?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOY LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Joy templates by type
 */
export const JOY_TEMPLATES: Record<JoyType, {
  generic: string[];
  byDomain: Record<string, string[]>;
}> = {
  celebratory: {
    generic: [
      "congrats on getting this sorted!",
      "great job - you did it!",
      "that's a win!",
      "look at you, crushing it!",
    ],
    byDomain: {
      recharge: [
        "you're all charged up and ready to roll!",
        "your account is topped up and glowing!",
      ],
      activation: [
        "welcome to the Jio family!",
        "your journey with Jio begins now!",
      ],
      upgrade: [
        "welcome to the premium experience!",
        "you've unlocked a whole new level!",
      ],
      porting: [
        "welcome aboard - great choice!",
        "smart move, joining the Jio family!",
      ],
    },
  },
  empathetic: {
    generic: [
      "i totally get it",
      "that sounds frustrating, let's fix it",
      "i hear you",
      "i understand how that feels",
    ],
    byDomain: {
      network: [
        "connection issues are the worst - let's get you back online",
      ],
      billing: [
        "unexpected charges are always stressful - let's clear this up",
      ],
      complaint: [
        "you shouldn't have to deal with this - i'm here to help",
      ],
    },
  },
  reassuring: {
    generic: [
      "don't worry, we'll sort this out",
      "you're in good hands",
      "we've got your back",
      "this is totally fixable",
    ],
    byDomain: {
      payment: [
        "your money is safe - let's track it down",
      ],
      data: [
        "your data isn't going anywhere",
      ],
      account: [
        "your account is secure with us",
      ],
    },
  },
  playful: {
    generic: [
      "easy peasy!",
      "piece of cake!",
      "done and dusted!",
      "simpler than ordering chai!",
    ],
    byDomain: {
      streaming: [
        "now you're ready for your binge session!",
        "grab the popcorn, you're all set!",
      ],
      data: [
        "stream away!",
        "data party incoming!",
      ],
    },
  },
  insider: {
    generic: [
      "pro tip:",
      "here's a little secret:",
      "between you and me:",
      "not everyone knows this, but:",
    ],
    byDomain: {
      plans: [
        "insider tip: this plan gives you the best value for unlimited calling",
      ],
      app: [
        "pro tip: you can do this even faster in the MyJio app",
      ],
      offers: [
        "here's something special just for you:",
      ],
    },
  },
  none: {
    generic: [],
    byDomain: {},
  },
};

/**
 * Milestone joy templates
 */
export const MILESTONE_TEMPLATES: Record<string, string[]> = {
  first_recharge: [
    "your first recharge with us - welcome!",
    "first of many - welcome to the family!",
  ],
  anniversary: [
    "happy anniversary with Jio!",
    "thanks for being with us this year!",
  ],
  loyal_customer: [
    "thanks for being such a valued customer!",
    "we appreciate your loyalty!",
  ],
  issue_resolved: [
    "glad we could sort this out!",
    "happy to have helped!",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// PLACEMENT RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine placement based on type and context
 */
function determinePlacement(type: JoyType, context: JoyContext): JoyPlacement {
  // Empathetic joy goes at opening
  if (type === 'empathetic') {
    return 'opening';
  }
  
  // Celebratory at closing
  if (type === 'celebratory') {
    return 'closing';
  }
  
  // Insider tips inline
  if (type === 'insider') {
    return 'inline';
  }
  
  // Reassuring at opening
  if (type === 'reassuring') {
    return 'opening';
  }
  
  // Playful at closing
  if (type === 'playful') {
    return 'closing';
  }
  
  return 'closing';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTION LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if joy should be included
 * Per Tokens v2 specification (Section 14.2)
 * 
 * Small joy MUST:
 * - Be relevant
 * - Be subtle
 * - NEVER override seriousness
 * - NEVER appear during complaint escalation
 * - NEVER appear in safety-sensitive scenarios
 */
function shouldIncludeJoy(context: JoyContext): boolean {
  // ══════════════════════════════════════════════════════════════════════
  // BLOCKING RULES (Phase F) - These ALWAYS block joy
  // ══════════════════════════════════════════════════════════════════════
  
  // BLOCK: High risk scenarios
  if (context.riskLevel === 'high' || context.riskLevel === 'critical') {
    return false;
  }
  
  // BLOCK: Safety-sensitive domains
  const safetySensitiveDomains = [
    'health_general', 'health_emergency', 'mental_health',
    'self_harm', 'suicide_risk', 'violence',
    'fraud_scam', 'cybersecurity', 'legal_sensitive'
  ];
  if (context.safetyDomain && safetySensitiveDomains.includes(context.safetyDomain)) {
    return false;
  }
  
  // BLOCK: Complaint escalation
  if (context.isComplaint && context.resolutionStatus !== 'resolved') {
    return false;
  }
  
  // BLOCK: Already escalated
  if (context.isEscalated) {
    return false;
  }
  
  // BLOCK: High emotion intensity (7+)
  const intensityNum = typeof context.emotionIntensity === 'number' 
    ? context.emotionIntensity 
    : context.emotionIntensity === 'high' ? 7 : context.emotionIntensity === 'extreme' ? 9 : 5;
  if (intensityNum >= 7) {
    return false;
  }
  
  // BLOCK: Angry/frustrated emotions
  const noJoyEmotions = ['raudra', 'bhayanak', 'bibhatsa'];
  if (noJoyEmotions.includes(context.emotion)) {
    return false;
  }
  
  // ══════════════════════════════════════════════════════════════════════
  // ALLOW RULES
  // ══════════════════════════════════════════════════════════════════════
  
  // ALLOW: Festival context - festival_warmth joy
  if (context.contextEvent === 'festival') {
    return true;
  }
  
  // ALLOW: Cricket match context - cricket_reference joy
  if (context.contextEvent === 'cricket_match') {
    return true;
  }
  
  // ALLOW: Milestones always get joy
  if (context.isMilestone) {
    return true;
  }
  
  // ALLOW: Resolution gets joy
  if (context.resolutionStatus === 'resolved') {
    return true;
  }
  
  // Early turns - maybe empathetic joy only
  if (context.turnNumber <= 1) {
    return context.emotion === 'karuna' || context.emotion === 'karun';
  }
  
  // Random chance for other cases (30%)
  return Math.random() < 0.3;
}

/**
 * Select joy type based on context
 */
function selectJoyType(context: JoyContext): JoyType {
  // Milestone celebration
  if (context.isMilestone) {
    return 'celebratory';
  }
  
  // Resolved issues
  if (context.resolutionStatus === 'resolved') {
    // Playful for easy resolutions
    if (context.turnNumber <= 3) {
      return 'playful';
    }
    return 'celebratory';
  }
  
  // Sad/worried emotions
  if (context.emotion === 'karun' || context.emotion === 'bhayanak') {
    return 'empathetic';
  }
  
  // Unresolved issues
  if (context.resolutionStatus === 'in_progress') {
    return 'reassuring';
  }
  
  // Inquiry intent - share insider tips
  if (context.intent === 'inquiry') {
    return Math.random() < 0.5 ? 'insider' : 'none';
  }
  
  return 'playful';
}

/**
 * Get joy text for type and domain
 */
function getJoyText(type: JoyType, domain: string, milestoneType?: string): string {
  if (type === 'none') return '';
  
  // Check for milestone templates
  if (milestoneType && MILESTONE_TEMPLATES[milestoneType]) {
    const templates = MILESTONE_TEMPLATES[milestoneType];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  const templates = JOY_TEMPLATES[type];
  
  // Check domain-specific first
  if (templates.byDomain[domain]?.length) {
    const domainTemplates = templates.byDomain[domain];
    return domainTemplates[Math.floor(Math.random() * domainTemplates.length)];
  }
  
  // Fall back to generic
  if (templates.generic.length) {
    return templates.generic[Math.floor(Math.random() * templates.generic.length)];
  }
  
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Select joy element for context
 */
export function selectJoy(context: JoyContext): JoySelection {
  // Check if should include
  if (!shouldIncludeJoy(context)) {
    return {
      shouldInclude: false,
      element: null,
      reason: 'joy not appropriate for this context',
    };
  }
  
  // Select type
  const type = selectJoyType(context);
  
  if (type === 'none') {
    return {
      shouldInclude: false,
      element: null,
      reason: 'no suitable joy type found',
    };
  }
  
  // Get text
  const text = getJoyText(type, context.topic, context.milestoneType);
  
  if (!text) {
    return {
      shouldInclude: false,
      element: null,
      reason: 'no text template available',
    };
  }
  
  // Determine placement
  const placement = determinePlacement(type, context);
  
  return {
    shouldInclude: true,
    element: {
      type,
      text,
      placement,
      domain: context.topic,
    },
    reason: `${type} joy for ${context.topic} context`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Inject joy into response
 */
export function injectJoy(response: string, selection: JoySelection): string {
  if (!selection.shouldInclude || !selection.element) {
    return response;
  }
  
  const { text, placement } = selection.element;
  
  switch (placement) {
    case 'opening':
      return `${text}\n\n${response}`;
    
    case 'closing':
      // Find last paragraph
      const paragraphs = response.split('\n\n');
      paragraphs[paragraphs.length - 1] += ` ${text}`;
      return paragraphs.join('\n\n');
    
    case 'inline':
      // Insert after first paragraph
      const parts = response.split('\n\n');
      if (parts.length > 1) {
        parts.splice(1, 0, text);
        return parts.join('\n\n');
      }
      return `${response}\n\n${text}`;
    
    default:
      return `${response}\n\n${text}`;
  }
}

/**
 * Format joy for prompt injection
 */
export function formatJoyForPrompt(selection: JoySelection): string {
  if (!selection.shouldInclude || !selection.element) {
    return '## small joy: none (keep tone neutral)';
  }
  
  return [
    '## small joy opportunity',
    `type: ${selection.element.type}`,
    `placement: ${selection.element.placement}`,
    `suggested text: "${selection.element.text}"`,
    '',
    '**guidance**: naturally weave into response, don\'t force it',
  ].join('\n');
}

/**
 * Get joy type display name
 */
export function getJoyTypeName(type: JoyType): string {
  const names: Record<JoyType, string> = {
    celebratory: 'celebration',
    empathetic: 'empathy',
    reassuring: 'reassurance',
    playful: 'playful touch',
    insider: 'insider tip',
    none: 'none',
  };
  return names[type];
}

/**
 * Check if response already has joy
 */
export function hasJoyElement(response: string): boolean {
  // Check for common joy patterns
  const joyPatterns = [
    /congrats|great job|well done|you did it/i,
    /easy peasy|piece of cake|done and dusted/i,
    /pro tip|here's a secret|insider/i,
    /i totally get it|i hear you|i understand/i,
    /don't worry|we've got|you're in good hands/i,
  ];
  
  return joyPatterns.some(p => p.test(response));
}
