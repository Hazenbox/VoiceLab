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
// JoyType moved to config/joyTemplates.ts
export type { JoyType } from '../../config/joyTemplates';

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
  // Context-aware reassuring: true when assistant has clear problem understanding + solution
  hasSolutionContext?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOY LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════

// Joy templates and milestone templates are now in shared config
// Edit phrases in config/joyTemplates.ts without touching logic
export { JOY_TEMPLATES, MILESTONE_TEMPLATES } from '../../config/joyTemplates';

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
 * For 'reassuring' type, uses confident phrases only when hasSolutionContext is true
 */
function getJoyText(type: JoyType, domain: string, milestoneType?: string, hasSolutionContext?: boolean): string {
  if (type === 'none') return '';
  
  // Check for milestone templates
  if (milestoneType && MILESTONE_TEMPLATES[milestoneType]) {
    const templates = MILESTONE_TEMPLATES[milestoneType];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  const templates = JOY_TEMPLATES[type];
  
  // For reassuring type with solution context, use confident phrases
  if (type === 'reassuring' && hasSolutionContext) {
    // Try confident domain-specific first
    if (templates.confidentByDomain?.[domain]?.length) {
      const domainTemplates = templates.confidentByDomain[domain];
      return domainTemplates[Math.floor(Math.random() * domainTemplates.length)];
    }
    // Fall back to confident generic
    if (templates.confident?.length) {
      return templates.confident[Math.floor(Math.random() * templates.confident.length)];
    }
  }
  
  // Default: Check domain-specific first (generic/uncertain phrases)
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
  
  // Get text (pass hasSolutionContext for context-aware reassuring phrases)
  const text = getJoyText(type, context.topic, context.milestoneType, context.hasSolutionContext);
  
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
    reason: `${type} joy for ${context.topic} context${context.hasSolutionContext ? ' (with solution)' : ''}`,
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
