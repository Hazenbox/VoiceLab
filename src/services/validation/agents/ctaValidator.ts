/**
 * CTA Validator
 * 
 * Validates Call-to-Action usage in responses.
 * Ensures one primary CTA per turn with clear actionability.
 * 
 * @module services/validation/agents/ctaValidator
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CTA types
 */
export type CTAType =
  | 'action'       // Direct action (click, tap, call)
  | 'navigation'   // Go somewhere (open app, visit site)
  | 'communication'// Contact (call helpline)
  | 'confirmation' // Confirm something
  | 'information'  // Soft CTA (learn more)
  | 'none';

/**
 * Detected CTA
 */
export interface DetectedCTA {
  type: CTAType;
  text: string;
  isPrimary: boolean;
  actionVerb: string;
  target?: string;
  position: number; // Character position
}

/**
 * Validation result
 */
export interface CTAValidationResult {
  isValid: boolean;
  totalCTAs: number;
  primaryCTAs: number;
  secondaryCTAs: number;
  ctas: DetectedCTA[];
  severity: 'ok' | 'warning' | 'error';
  message: string;
  suggestions: string[];
}

/**
 * Context for validation
 */
export interface CTAValidationContext {
  intent: string;
  resolutionStatus: string;
  turnNumber: number;
  channel: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Primary action verbs (strong CTAs)
 */
const PRIMARY_CTA_VERBS = [
  'click', 'tap', 'press', 'select', 'choose',
  'call', 'dial', 'contact',
  'download', 'install', 'update',
  'open', 'visit', 'go to',
  'recharge', 'pay', 'subscribe',
  'confirm', 'verify', 'submit',
];

/**
 * Secondary action verbs (soft CTAs)
 */
const SECONDARY_CTA_VERBS = [
  'try', 'check', 'look',
  'learn', 'explore', 'discover',
  'see', 'view', 'review',
  'consider', 'think about',
];

/**
 * CTA target patterns
 */
const CTA_TARGETS = {
  app: /\b(myjio|my\s+jio|jiocinema|jiosaavn|jiomart)\s+(app)?\b/gi,
  website: /\b(jio\.com|website|site|portal)\b/gi,
  helpline: /\b(199|198|100|112|1800[- ]?\d+)\b/gi,
  store: /\b(jio\s+store|nearest\s+store|retail\s+outlet)\b/gi,
  url: /https?:\/\/[^\s]+/gi,
};

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect CTAs in response
 */
export function detectCTAs(response: string): DetectedCTA[] {
  const ctas: DetectedCTA[] = [];
  const text = response.toLowerCase();
  
  // Check for primary CTA verbs
  for (const verb of PRIMARY_CTA_VERBS) {
    const pattern = new RegExp(`\\b${verb}\\s+(?:the\\s+)?(?:on\\s+)?([\\w\\s]+?)(?:[.,!?]|$)`, 'gi');
    let match;
    
    while ((match = pattern.exec(response)) !== null) {
      const ctaText = match[0].trim();
      const target = detectTarget(ctaText);
      
      ctas.push({
        type: categorizeAction(verb),
        text: ctaText,
        isPrimary: true,
        actionVerb: verb,
        target,
        position: match.index,
      });
    }
  }
  
  // Check for secondary CTA verbs
  for (const verb of SECONDARY_CTA_VERBS) {
    const pattern = new RegExp(`\\b${verb}\\s+(?:the\\s+)?(?:out\\s+)?([\\w\\s]+?)(?:[.,!?]|$)`, 'gi');
    let match;
    
    while ((match = pattern.exec(response)) !== null) {
      const ctaText = match[0].trim();
      
      // Skip if already detected as primary
      if (ctas.some(c => c.text.toLowerCase() === ctaText.toLowerCase())) {
        continue;
      }
      
      ctas.push({
        type: 'information',
        text: ctaText,
        isPrimary: false,
        actionVerb: verb,
        position: match.index,
      });
    }
  }
  
  // Check for URL CTAs
  const urlPattern = /https?:\/\/[^\s]+/gi;
  let urlMatch;
  while ((urlMatch = urlPattern.exec(response)) !== null) {
    if (!ctas.some(c => c.text.includes(urlMatch[0]))) {
      ctas.push({
        type: 'navigation',
        text: urlMatch[0],
        isPrimary: true,
        actionVerb: 'visit',
        target: urlMatch[0],
        position: urlMatch.index,
      });
    }
  }
  
  // Check for helpline numbers
  const helplinePattern = /\b(call|dial)?\s*(199|198|1800[- ]?\d+)\b/gi;
  let helpMatch;
  while ((helpMatch = helplinePattern.exec(response)) !== null) {
    if (!ctas.some(c => c.text.includes(helpMatch[2]))) {
      ctas.push({
        type: 'communication',
        text: helpMatch[0],
        isPrimary: true,
        actionVerb: 'call',
        target: helpMatch[2],
        position: helpMatch.index,
      });
    }
  }
  
  // Sort by position
  return ctas.sort((a, b) => a.position - b.position);
}

/**
 * Detect target of CTA
 */
function detectTarget(ctaText: string): string | undefined {
  for (const [targetType, pattern] of Object.entries(CTA_TARGETS)) {
    const match = ctaText.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return undefined;
}

/**
 * Categorize action type
 */
function categorizeAction(verb: string): CTAType {
  const navigationVerbs = ['open', 'visit', 'go'];
  const communicationVerbs = ['call', 'dial', 'contact'];
  const confirmationVerbs = ['confirm', 'verify', 'submit'];
  
  if (navigationVerbs.includes(verb)) return 'navigation';
  if (communicationVerbs.includes(verb)) return 'communication';
  if (confirmationVerbs.includes(verb)) return 'confirmation';
  return 'action';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate CTA usage
 */
export function validateCTAs(
  response: string,
  context: Partial<CTAValidationContext> = {}
): CTAValidationResult {
  const ctas = detectCTAs(response);
  
  const primaryCTAs = ctas.filter(c => c.isPrimary);
  const secondaryCTAs = ctas.filter(c => !c.isPrimary);
  
  let isValid = true;
  let severity: CTAValidationResult['severity'] = 'ok';
  let message = 'CTA usage is appropriate';
  const suggestions: string[] = [];
  
  // Check for too many primary CTAs
  if (primaryCTAs.length > 1) {
    isValid = false;
    severity = 'error';
    message = `Found ${primaryCTAs.length} primary CTAs - only 1 allowed`;
    suggestions.push('keep only the most important CTA');
    suggestions.push('convert secondary CTAs to mentions without action verbs');
  } else if (primaryCTAs.length === 0 && context.resolutionStatus !== 'resolved') {
    // Warning if no CTA when one might be expected
    if (context.intent === 'support' || context.intent === 'transaction') {
      severity = 'warning';
      message = 'no primary CTA found - consider adding one';
      suggestions.push('add a clear next step for the user');
    }
  }
  
  // Check for too many total CTAs
  if (ctas.length > 3) {
    if (severity !== 'error') {
      severity = 'warning';
    }
    message = `${ctas.length} CTAs may overwhelm user`;
    suggestions.push('reduce total CTAs to 1-2 maximum');
  }
  
  // Check CTA clarity
  for (const cta of primaryCTAs) {
    if (!cta.target) {
      suggestions.push(`make CTA "${cta.text}" more specific with a clear target`);
    }
  }
  
  return {
    isValid,
    totalCTAs: ctas.length,
    primaryCTAs: primaryCTAs.length,
    secondaryCTAs: secondaryCTAs.length,
    ctas,
    severity,
    message,
    suggestions,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format validation for prompt injection
 */
export function formatCTAValidationForPrompt(result: CTAValidationResult): string {
  const lines = [
    '## CTA validation',
    `status: ${result.severity}`,
    `total_ctas: ${result.totalCTAs}`,
    `primary: ${result.primaryCTAs}`,
    `secondary: ${result.secondaryCTAs}`,
  ];
  
  if (result.ctas.length > 0) {
    lines.push('');
    lines.push('detected CTAs:');
    for (const cta of result.ctas) {
      const marker = cta.isPrimary ? '[PRIMARY]' : '[secondary]';
      lines.push(`- ${marker} ${cta.actionVerb}: "${cta.text.slice(0, 50)}..."`);
    }
  }
  
  if (result.suggestions.length > 0) {
    lines.push('');
    lines.push('suggestions:');
    result.suggestions.forEach(s => lines.push(`- ${s}`));
  }
  
  return lines.join('\n');
}

/**
 * Get recommended CTA for context
 */
export function getRecommendedCTA(context: Partial<CTAValidationContext>): {
  type: CTAType;
  verb: string;
  example: string;
} | null {
  if (context.resolutionStatus === 'resolved') {
    return null; // No CTA needed for resolved
  }
  
  switch (context.intent) {
    case 'support':
      return {
        type: 'navigation',
        verb: 'open',
        example: 'open the MyJio app to check status',
      };
    case 'transaction':
      return {
        type: 'action',
        verb: 'tap',
        example: 'tap on "Recharge Now" to proceed',
      };
    case 'inquiry':
      return {
        type: 'information',
        verb: 'check',
        example: 'check our website for more details',
      };
    default:
      return null;
  }
}

/**
 * Check if CTA is actionable
 */
export function isCTAActionable(cta: DetectedCTA): boolean {
  // Actionable CTAs have clear targets
  if (cta.target) return true;
  
  // Or use specific action verbs
  const actionableVerbs = ['click', 'tap', 'press', 'call', 'dial', 'download', 'install'];
  return actionableVerbs.includes(cta.actionVerb);
}

/**
 * Generate CTA text
 */
export function generateCTAText(
  verb: string,
  target: string,
  channel: string = 'chatbot'
): string {
  // Channel-specific formatting
  if (channel === 'sms' || channel === 'whatsapp') {
    return `${verb} ${target}`;
  }
  
  return `you can ${verb} ${target} to proceed`;
}
