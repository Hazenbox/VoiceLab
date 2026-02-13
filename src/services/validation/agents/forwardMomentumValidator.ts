/**
 * Forward Momentum Validator
 * 
 * Ensures every turn advances the conversation toward resolution.
 * Detects stalling, repetition, and lack of progress.
 * 
 * @module services/validation/agents/forwardMomentumValidator
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Momentum indicators
 */
export type MomentumIndicator =
  | 'new_information'    // Provides new info
  | 'action_step'        // Gives action to take
  | 'progress_update'    // Updates on progress
  | 'clarification'      // Seeks needed clarification
  | 'resolution'         // Moves toward resolution
  | 'transition'         // Moves to next phase
  | 'none';              // No forward momentum

/**
 * Stalling patterns
 */
export type StallingPattern =
  | 'repetition'         // Repeating previous info
  | 'filler'             // Empty pleasantries
  | 'circular'           // Going in circles
  | 'deflection'         // Avoiding the issue
  | 'over_apologizing';  // Excessive apologies

/**
 * Validation result
 */
export interface MomentumValidationResult {
  isValid: boolean;
  hasForwardMomentum: boolean;
  indicators: MomentumIndicator[];
  stallingPatterns: StallingPattern[];
  momentum: number; // 0-1 score
  severity: 'ok' | 'warning' | 'error';
  message: string;
  suggestions: string[];
}

/**
 * Context for validation
 */
export interface MomentumValidationContext {
  previousResponses?: string[];
  turnNumber: number;
  resolutionStatus: string;
  intent: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Forward momentum patterns
 */
const MOMENTUM_PATTERNS: Record<MomentumIndicator, RegExp[]> = {
  new_information: [
    /\b(here's|here is|this means|this includes|you (will|can|should) get)\b/gi,
    /\b(your|the) (plan|balance|status|account) (is|has|shows)\b/gi,
    /\b(i('ve| have) (found|checked|verified))\b/gi,
  ],
  action_step: [
    /\b(step \d|first|next|then|finally)\b.*:/gi,
    /\b(you (can|should|need to)|please|kindly)\b.*\b(open|click|tap|call|visit)\b/gi,
    /^\d+\.\s+/gm,
    /^[-•]\s+/gm,
  ],
  progress_update: [
    /\b(i('m| am) (checking|looking|processing|working on))\b/gi,
    /\b(this (is|has been|will be) (processed|done|completed))\b/gi,
    /\b(in progress|underway|being processed)\b/gi,
  ],
  clarification: [
    /\b(could you (please )?confirm|can you share|what is your)\b/gi,
    /\b(to (help|assist) (you )?better|for me to proceed)\b/gi,
    /\?$/gm,
  ],
  resolution: [
    /\b(resolved|fixed|sorted|done|completed|activated|processed)\b/gi,
    /\b(you('re| are) (all set|good to go))\b/gi,
    /\b(issue has been|problem is now)\b/gi,
  ],
  transition: [
    /\b(now (let's|we can)|the next step|moving (on|forward))\b/gi,
    /\b(once (that's|you've|this is) done)\b/gi,
    /\b(meanwhile|in the meantime|while that)\b/gi,
  ],
  none: [],
};

/**
 * Stalling patterns
 */
const STALLING_PATTERNS: Record<StallingPattern, RegExp[]> = {
  repetition: [
    /\bas (i|we) (mentioned|said) (earlier|before|previously)\b/gi,
    /\b(again|once more|like i said)\b/gi,
  ],
  filler: [
    /\bi (understand|hear you|get it|see)\./gi,
    /\bthank you for (your patience|understanding|reaching out)\./gi,
    /\bi appreciate your patience\./gi,
  ],
  circular: [
    /\bhave you tried\b.*\bthat we already discussed\b/gi,
    /\blet me explain again\b/gi,
  ],
  deflection: [
    /\bunfortunately,? (i|we) (can't|cannot|are unable)\b/gi,
    /\bthis is (not|beyond) (something|what) (i|we) can\b/gi,
    /\bi('m| am) (not sure|unable|limited)\b/gi,
  ],
  over_apologizing: [
    /\b(so sorry|sincerely apologize|deeply regret)\b.*\b(sorry|apologize)\b/gi,
    /\bsorry\b.*\bsorry\b/gi,
    /\bapologize\b.*\bapologize\b/gi,
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect momentum indicators
 */
function detectMomentumIndicators(response: string): MomentumIndicator[] {
  const indicators: MomentumIndicator[] = [];
  
  for (const [indicator, patterns] of Object.entries(MOMENTUM_PATTERNS)) {
    if (indicator === 'none') continue;
    
    for (const pattern of patterns) {
      if (pattern.test(response)) {
        indicators.push(indicator as MomentumIndicator);
        break;
      }
    }
  }
  
  return [...new Set(indicators)];
}

/**
 * Detect stalling patterns
 */
function detectStallingPatterns(response: string): StallingPattern[] {
  const patterns: StallingPattern[] = [];
  
  for (const [pattern, regexes] of Object.entries(STALLING_PATTERNS)) {
    for (const regex of regexes) {
      if (regex.test(response)) {
        patterns.push(pattern as StallingPattern);
        break;
      }
    }
  }
  
  return [...new Set(patterns)];
}

/**
 * Check for repetition against previous responses
 */
function checkRepetition(response: string, previousResponses: string[]): boolean {
  if (!previousResponses.length) return false;
  
  const currentWords = new Set(response.toLowerCase().split(/\s+/));
  
  for (const prev of previousResponses) {
    const prevWords = new Set(prev.toLowerCase().split(/\s+/));
    
    // Calculate overlap
    let overlap = 0;
    for (const word of currentWords) {
      if (prevWords.has(word) && word.length > 4) {
        overlap++;
      }
    }
    
    // More than 50% overlap suggests repetition
    if (overlap / currentWords.size > 0.5) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate momentum score
 */
function calculateMomentumScore(
  indicators: MomentumIndicator[],
  stallingPatterns: StallingPattern[],
  hasRepetition: boolean
): number {
  let score = 0;
  
  // Positive indicators
  const indicatorWeights: Record<MomentumIndicator, number> = {
    new_information: 0.25,
    action_step: 0.30,
    progress_update: 0.20,
    clarification: 0.15,
    resolution: 0.40,
    transition: 0.20,
    none: 0,
  };
  
  for (const indicator of indicators) {
    score += indicatorWeights[indicator];
  }
  
  // Negative patterns
  const stallingWeights: Record<StallingPattern, number> = {
    repetition: -0.25,
    filler: -0.15,
    circular: -0.30,
    deflection: -0.20,
    over_apologizing: -0.15,
  };
  
  for (const pattern of stallingPatterns) {
    score += stallingWeights[pattern];
  }
  
  // Repetition penalty
  if (hasRepetition) {
    score -= 0.30;
  }
  
  return Math.max(0, Math.min(1, score));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate forward momentum
 */
export function validateForwardMomentum(
  response: string,
  context: Partial<MomentumValidationContext> = {}
): MomentumValidationResult {
  // Detect indicators and patterns
  const indicators = detectMomentumIndicators(response);
  const stallingPatterns = detectStallingPatterns(response);
  const hasRepetition = context.previousResponses 
    ? checkRepetition(response, context.previousResponses)
    : false;
  
  if (hasRepetition && !stallingPatterns.includes('repetition')) {
    stallingPatterns.push('repetition');
  }
  
  // Calculate score
  const momentum = calculateMomentumScore(indicators, stallingPatterns, hasRepetition);
  
  // Determine validity
  const hasForwardMomentum = indicators.length > 0 && momentum >= 0.15;
  let isValid = hasForwardMomentum;
  let severity: MomentumValidationResult['severity'] = 'ok';
  let message = 'response advances the conversation';
  const suggestions: string[] = [];
  
  // Check for issues
  if (!hasForwardMomentum) {
    severity = 'warning';
    message = 'response lacks clear forward momentum';
    suggestions.push('add a clear next step or new information');
  }
  
  if (stallingPatterns.length >= 2) {
    isValid = false;
    severity = 'error';
    message = 'response contains multiple stalling patterns';
    suggestions.push('remove filler phrases');
    suggestions.push('provide actionable content');
  }
  
  if (stallingPatterns.includes('deflection')) {
    suggestions.push('instead of saying what you can\'t do, focus on what you can do');
  }
  
  if (stallingPatterns.includes('over_apologizing')) {
    suggestions.push('apologize once and move to solution');
  }
  
  if (hasRepetition) {
    suggestions.push('provide new information instead of repeating previous content');
  }
  
  // Extended conversation check
  if (context.turnNumber && context.turnNumber >= 6 && momentum < 0.25) {
    severity = 'error';
    isValid = false;
    suggestions.push('conversation is extended - prioritize resolution');
  }
  
  return {
    isValid,
    hasForwardMomentum,
    indicators,
    stallingPatterns,
    momentum,
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
export function formatMomentumValidationForPrompt(result: MomentumValidationResult): string {
  const lines = [
    '## forward momentum validation',
    `status: ${result.severity}`,
    `has_momentum: ${result.hasForwardMomentum}`,
    `momentum_score: ${(result.momentum * 100).toFixed(0)}%`,
  ];
  
  if (result.indicators.length > 0) {
    lines.push(`positive indicators: ${result.indicators.join(', ')}`);
  }
  
  if (result.stallingPatterns.length > 0) {
    lines.push(`stalling patterns: ${result.stallingPatterns.join(', ')}`);
  }
  
  if (result.suggestions.length > 0) {
    lines.push('');
    lines.push('suggestions:');
    result.suggestions.forEach(s => lines.push(`- ${s}`));
  }
  
  return lines.join('\n');
}

/**
 * Get momentum improvement suggestions
 */
export function getMomentumImprovements(result: MomentumValidationResult): string[] {
  const improvements: string[] = [];
  
  if (!result.indicators.includes('action_step')) {
    improvements.push('add a clear action step for the user');
  }
  
  if (!result.indicators.includes('new_information')) {
    improvements.push('include new relevant information');
  }
  
  if (result.stallingPatterns.includes('filler')) {
    improvements.push('remove filler phrases like "I understand" without follow-up');
  }
  
  if (result.stallingPatterns.includes('deflection')) {
    improvements.push('focus on what CAN be done, not limitations');
  }
  
  return improvements;
}

/**
 * Check if response would stall
 */
export function wouldStall(response: string): boolean {
  const stallingPatterns = detectStallingPatterns(response);
  const indicators = detectMomentumIndicators(response);
  
  // Stalling if many patterns and few indicators
  return stallingPatterns.length >= 2 && indicators.length <= 1;
}
