/**
 * Signature Selector
 * 
 * Selects appropriate closing signatures for responses.
 * 6 signature types based on context and conversation state.
 * 
 * @module services/finishing/signatureSelector
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Signature types
 */
export type SignatureType =
  | 'youre_all_set'      // Task completed successfully
  | 'thank_you'          // Gratitude for interaction
  | 'with_love'          // Warm, emotional close
  | 'take_care'          // Caring, personal touch
  | 'reach_out_anytime'  // Open door for future
  | 'none';              // No signature needed

/**
 * Signature definition
 */
export interface Signature {
  type: SignatureType;
  variations: string[];
  emoji?: string;
  tone: 'professional' | 'warm' | 'casual';
}

/**
 * Selection result
 */
export interface SignatureSelection {
  type: SignatureType;
  text: string;
  shouldInclude: boolean;
  reason: string;
}

/**
 * Context for selection
 */
export interface SignatureContext {
  resolutionStatus: string;
  emotion: string;
  intent: string;
  turnNumber: number;
  isLastTurn: boolean;
  wasEscalated: boolean;
  userSatisfaction?: 'satisfied' | 'unsatisfied' | 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNATURE LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All available signatures
 */
export const SIGNATURES: Record<SignatureType, Signature> = {
  youre_all_set: {
    type: 'youre_all_set',
    variations: [
      "you're all set!",
      "all done!",
      "that's taken care of!",
      "you're good to go!",
      "everything is sorted!",
    ],
    tone: 'professional',
  },
  thank_you: {
    type: 'thank_you',
    variations: [
      "thank you for reaching out!",
      "thanks for contacting us!",
      "thank you for your patience!",
      "thanks for giving us the chance to help!",
    ],
    tone: 'professional',
  },
  with_love: {
    type: 'with_love',
    variations: [
      "take care, and stay connected!",
      "wishing you a great day ahead!",
      "here's to smooth connectivity!",
      "stay connected, stay happy!",
    ],
    tone: 'warm',
  },
  take_care: {
    type: 'take_care',
    variations: [
      "take care!",
      "have a great day!",
      "have a wonderful day!",
      "wishing you all the best!",
    ],
    tone: 'warm',
  },
  reach_out_anytime: {
    type: 'reach_out_anytime',
    variations: [
      "feel free to reach out anytime you need help!",
      "i'm here whenever you need assistance!",
      "don't hesitate to reach out if you have more questions!",
      "always happy to help - just reach out!",
    ],
    tone: 'casual',
  },
  none: {
    type: 'none',
    variations: [],
    tone: 'professional',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTION LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine if a signature should be included
 */
function shouldIncludeSignature(context: SignatureContext): boolean {
  // Don't add signature if not last turn and resolution not complete
  if (!context.isLastTurn && context.resolutionStatus !== 'resolved') {
    return false;
  }
  
  // Don't add signature in early turns
  if (context.turnNumber <= 2 && !context.isLastTurn) {
    return false;
  }
  
  // Always include for resolved issues
  if (context.resolutionStatus === 'resolved') {
    return true;
  }
  
  // Include for escalated issues (handoff)
  if (context.wasEscalated) {
    return true;
  }
  
  // Include for farewell intent
  if (context.intent === 'farewell') {
    return true;
  }
  
  return context.isLastTurn;
}

/**
 * Select signature type based on context
 */
function selectSignatureType(context: SignatureContext): SignatureType {
  // Escalated - be professional
  if (context.wasEscalated) {
    return 'reach_out_anytime';
  }
  
  // Resolved successfully
  if (context.resolutionStatus === 'resolved') {
    // Check user satisfaction
    if (context.userSatisfaction === 'satisfied') {
      return 'youre_all_set';
    }
    if (context.userSatisfaction === 'unsatisfied') {
      return 'reach_out_anytime';
    }
    return 'youre_all_set';
  }
  
  // High emotion - warm closing
  const warmEmotions = ['karun', 'bhayanak'];
  if (warmEmotions.includes(context.emotion)) {
    return 'take_care';
  }
  
  // Positive emotion
  const positiveEmotions = ['hasya', 'shant', 'adbhut'];
  if (positiveEmotions.includes(context.emotion)) {
    return 'with_love';
  }
  
  // Complaint context
  if (context.intent === 'complaint') {
    return 'thank_you';
  }
  
  // Farewell
  if (context.intent === 'farewell') {
    return 'take_care';
  }
  
  // Default
  return 'reach_out_anytime';
}

/**
 * Get random variation
 */
function getRandomVariation(type: SignatureType): string {
  const signature = SIGNATURES[type];
  if (!signature.variations.length) return '';
  
  const idx = Math.floor(Math.random() * signature.variations.length);
  return signature.variations[idx];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Select signature for context
 */
export function selectSignature(context: SignatureContext): SignatureSelection {
  // Check if should include
  if (!shouldIncludeSignature(context)) {
    return {
      type: 'none',
      text: '',
      shouldInclude: false,
      reason: 'signature not needed for current turn/state',
    };
  }
  
  // Select type
  const type = selectSignatureType(context);
  
  // Get variation
  const text = getRandomVariation(type);
  
  return {
    type,
    text,
    shouldInclude: true,
    reason: getSelectionReason(context, type),
  };
}

/**
 * Get reason for selection
 */
function getSelectionReason(context: SignatureContext, type: SignatureType): string {
  if (context.wasEscalated) {
    return 'escalated - offering future help';
  }
  if (context.resolutionStatus === 'resolved') {
    return 'issue resolved - confirming completion';
  }
  if (context.intent === 'farewell') {
    return 'user saying goodbye';
  }
  return `selected based on emotion (${context.emotion}) and context`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format signature for appending to response
 */
export function formatSignature(selection: SignatureSelection): string {
  if (!selection.shouldInclude || !selection.text) {
    return '';
  }
  return `\n\n${selection.text}`;
}

/**
 * Append signature to response
 */
export function appendSignature(response: string, selection: SignatureSelection): string {
  if (!selection.shouldInclude || !selection.text) {
    return response;
  }
  
  // Don't double-add signature
  if (SIGNATURES[selection.type].variations.some(v => 
    response.toLowerCase().includes(v.toLowerCase().slice(0, 20))
  )) {
    return response;
  }
  
  return `${response}\n\n${selection.text}`;
}

/**
 * Get all variations for a type
 */
export function getVariations(type: SignatureType): string[] {
  return SIGNATURES[type].variations;
}

/**
 * Get signature tone
 */
export function getSignatureTone(type: SignatureType): 'professional' | 'warm' | 'casual' {
  return SIGNATURES[type].tone;
}

/**
 * Format signature context for prompt
 */
export function formatSignatureForPrompt(selection: SignatureSelection): string {
  if (!selection.shouldInclude) {
    return '## signature: none (continue conversation)';
  }
  
  return [
    '## closing signature',
    `type: ${selection.type}`,
    `text: "${selection.text}"`,
    '',
    '**guidance**: naturally include signature at end of response',
  ].join('\n');
}

/**
 * Check if response already has a closing signature
 */
export function hasSignature(response: string): boolean {
  const allVariations = Object.values(SIGNATURES)
    .flatMap(s => s.variations);
  
  return allVariations.some(v => 
    response.toLowerCase().includes(v.toLowerCase().slice(0, 15))
  );
}
