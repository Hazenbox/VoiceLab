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
// Types and data moved to config/signatures.ts
export type { SignatureType, Signature } from '../../config/signatures';

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
  emotionIntensity?: number | string;
  intent: string;
  turnNumber: number;
  isLastTurn: boolean;
  wasEscalated: boolean;
  userSatisfaction?: 'satisfied' | 'unsatisfied' | 'unknown';
  // Phase F additions per Tokens v2
  channel?: string;
  safetyDomain?: string;
  riskLevel?: string;
  isComplaint?: boolean;
  isHealthContext?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNATURE LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

// Signatures are now in shared config -- edit phrases in config/signatures.ts
export { SIGNATURES } from '../../config/signatures';

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
 * Per Tokens v2 specification (Section 14.1)
 * 
 * | Signature | When to Use |
 * |-----------|-------------|
 * | youre_all_set | Task completed |
 * | thank_you | General interaction closure |
 * | with_love | Celebration / internal / delight contexts |
 * | take_care | Health or sensitive contexts |
 * | reach_out_anytime | Support contexts |
 * | none | Transactional SMS/brief responses |
 */
function selectSignatureType(context: SignatureContext): SignatureType {
  // RULE: SMS channel = none (brief responses)
  if (context.channel === 'sms' || context.channel === 'push_notification') {
    return 'none';
  }
  
  // RULE: Health contexts = take_care
  if (context.isHealthContext || 
      context.safetyDomain === 'health_general' ||
      context.safetyDomain === 'health_emergency' ||
      context.safetyDomain === 'mental_health') {
    return 'take_care';
  }
  
  // RULE: High risk = reach_out_anytime (reassuring availability)
  if (context.riskLevel === 'high' || context.riskLevel === 'critical') {
    return 'reach_out_anytime';
  }
  
  // RULE: Complaint = reach_out_anytime (don't seem dismissive)
  if (context.isComplaint) {
    return 'reach_out_anytime';
  }
  
  // RULE: Escalated - be professional
  if (context.wasEscalated) {
    return 'reach_out_anytime';
  }
  
  // RULE: Resolved successfully = youre_all_set
  if (context.resolutionStatus === 'resolved') {
    // Check user satisfaction
    if (context.userSatisfaction === 'unsatisfied') {
      return 'reach_out_anytime';
    }
    return 'youre_all_set';
  }
  
  // RULE: High emotion (sad/fearful) - warm closing
  const warmEmotions = ['karuna', 'bhayanaka'];
  if (warmEmotions.includes(context.emotion)) {
    return 'take_care';
  }
  
  // RULE: Positive emotion = with_love
  const positiveEmotions = ['hasya', 'shringara', 'adbhuta', 'shanta'];
  if (positiveEmotions.includes(context.emotion)) {
    return 'with_love';
  }
  
  // RULE: Farewell intent
  if (context.intent === 'farewell') {
    return 'take_care';
  }
  
  // Default for ongoing conversations
  return 'thank_you';
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
