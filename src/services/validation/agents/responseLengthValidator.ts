/**
 * Response Length Validator
 * 
 * Validates response length for cognitive load management.
 * Enforces max 120-180 words based on context.
 * 
 * @module services/validation/agents/responseLengthValidator
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Length validation result
 */
export interface LengthValidationResult {
  isValid: boolean;
  wordCount: number;
  maxAllowed: number;
  minRecommended: number;
  severity: 'ok' | 'warning' | 'error';
  message: string;
  suggestions: string[];
  truncated?: string;
}

/**
 * Context for validation
 */
export interface LengthValidationContext {
  channel: string;
  intent: string;
  turnNumber: number;
  isStepByStep: boolean;
  hasCode: boolean;
  complexity: 'simple' | 'moderate' | 'complex';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Word limits by channel
 */
export const CHANNEL_LIMITS: Record<string, { min: number; max: number; ideal: number }> = {
  sms: { min: 20, max: 80, ideal: 50 },
  whatsapp: { min: 30, max: 120, ideal: 80 },
  chatbot: { min: 40, max: 180, ideal: 120 },
  voice: { min: 30, max: 100, ideal: 60 },
  ivr: { min: 20, max: 60, ideal: 40 },
  email: { min: 100, max: 400, ideal: 250 },
  default: { min: 40, max: 180, ideal: 120 },
};

/**
 * Adjustments based on context
 */
const CONTEXT_ADJUSTMENTS = {
  stepByStep: { multiplier: 1.5, reason: 'step-by-step instructions allowed more words' },
  complex: { multiplier: 1.3, reason: 'complex topic needs more explanation' },
  earlyTurn: { multiplier: 1.2, reason: 'early turns allow more context setting' },
  lateTurn: { multiplier: 0.8, reason: 'late turns should be concise' },
  hasCode: { multiplier: 1.4, reason: 'code samples need additional space' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Count words in text
 */
export function countWords(text: string): number {
  // Remove code blocks for word count
  const withoutCode = text.replace(/```[\s\S]*?```/g, '[CODE]');
  
  // Split by whitespace and filter empty
  const words = withoutCode.trim().split(/\s+/).filter(w => w.length > 0);
  
  return words.length;
}

/**
 * Get limits for channel
 */
function getLimits(channel: string): { min: number; max: number; ideal: number } {
  return CHANNEL_LIMITS[channel] || CHANNEL_LIMITS.default;
}

/**
 * Apply context adjustments to limits
 */
function adjustLimits(
  baseLimits: { min: number; max: number; ideal: number },
  context: LengthValidationContext
): { min: number; max: number; ideal: number } {
  let { min, max, ideal } = baseLimits;
  
  // Step-by-step adjustment
  if (context.isStepByStep) {
    const adj = CONTEXT_ADJUSTMENTS.stepByStep;
    max = Math.round(max * adj.multiplier);
    ideal = Math.round(ideal * adj.multiplier);
  }
  
  // Complexity adjustment
  if (context.complexity === 'complex') {
    const adj = CONTEXT_ADJUSTMENTS.complex;
    max = Math.round(max * adj.multiplier);
    ideal = Math.round(ideal * adj.multiplier);
  }
  
  // Turn number adjustment
  if (context.turnNumber <= 2) {
    const adj = CONTEXT_ADJUSTMENTS.earlyTurn;
    max = Math.round(max * adj.multiplier);
  } else if (context.turnNumber >= 8) {
    const adj = CONTEXT_ADJUSTMENTS.lateTurn;
    max = Math.round(max * adj.multiplier);
    ideal = Math.round(ideal * adj.multiplier);
  }
  
  // Code adjustment
  if (context.hasCode) {
    const adj = CONTEXT_ADJUSTMENTS.hasCode;
    max = Math.round(max * adj.multiplier);
  }
  
  return { min, max, ideal };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate response length
 */
export function validateResponseLength(
  response: string,
  context: Partial<LengthValidationContext> = {}
): LengthValidationResult {
  const fullContext: LengthValidationContext = {
    channel: context.channel || 'chatbot',
    intent: context.intent || 'general',
    turnNumber: context.turnNumber || 1,
    isStepByStep: context.isStepByStep || response.includes('\n1.') || response.includes('\n- '),
    hasCode: context.hasCode || response.includes('```'),
    complexity: context.complexity || 'moderate',
  };
  
  const wordCount = countWords(response);
  const baseLimits = getLimits(fullContext.channel);
  const limits = adjustLimits(baseLimits, fullContext);
  
  const { min, max, ideal } = limits;
  
  // Determine validity and severity
  let isValid = true;
  let severity: LengthValidationResult['severity'] = 'ok';
  let message = 'response length is appropriate';
  const suggestions: string[] = [];
  
  if (wordCount > max) {
    isValid = false;
    severity = 'error';
    message = `response is ${wordCount - max} words over limit`;
    suggestions.push(`reduce response by approximately ${wordCount - max} words`);
    suggestions.push('remove redundant phrases');
    suggestions.push('use shorter sentences');
  } else if (wordCount > ideal) {
    severity = 'warning';
    message = `response is above ideal length (${ideal} words)`;
    suggestions.push('consider condensing for better readability');
  } else if (wordCount < min) {
    isValid = false;
    severity = 'error';
    message = `response is ${min - wordCount} words under minimum`;
    suggestions.push('add more detail or context');
    suggestions.push('ensure the response fully addresses the query');
  }
  
  // Generate truncated version if over limit
  let truncated: string | undefined;
  if (wordCount > max) {
    truncated = truncateResponse(response, max);
  }
  
  return {
    isValid,
    wordCount,
    maxAllowed: max,
    minRecommended: min,
    severity,
    message,
    suggestions,
    truncated,
  };
}

/**
 * Truncate response to target word count
 */
function truncateResponse(response: string, targetWords: number): string {
  const words = response.split(/\s+/);
  
  if (words.length <= targetWords) {
    return response;
  }
  
  // Try to find a natural break point
  let cutPoint = targetWords;
  
  // Look for sentence end near target
  for (let i = targetWords; i > targetWords - 20 && i > 0; i--) {
    const word = words[i - 1];
    if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
      cutPoint = i;
      break;
    }
  }
  
  return words.slice(0, cutPoint).join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get recommended length for context
 */
export function getRecommendedLength(context: Partial<LengthValidationContext>): {
  min: number;
  max: number;
  ideal: number;
} {
  const fullContext: LengthValidationContext = {
    channel: context.channel || 'chatbot',
    intent: context.intent || 'general',
    turnNumber: context.turnNumber || 1,
    isStepByStep: context.isStepByStep || false,
    hasCode: context.hasCode || false,
    complexity: context.complexity || 'moderate',
  };
  
  const baseLimits = getLimits(fullContext.channel);
  return adjustLimits(baseLimits, fullContext);
}

/**
 * Format validation result for prompt injection
 */
export function formatLengthValidationForPrompt(result: LengthValidationResult): string {
  const lines = [
    '## response length validation',
    `word_count: ${result.wordCount}`,
    `max_allowed: ${result.maxAllowed}`,
    `status: ${result.severity}`,
    `message: ${result.message}`,
  ];
  
  if (result.suggestions.length > 0) {
    lines.push('');
    lines.push('suggestions:');
    result.suggestions.forEach(s => lines.push(`- ${s}`));
  }
  
  return lines.join('\n');
}

/**
 * Check if response needs condensing
 */
export function needsCondensing(
  response: string,
  context: Partial<LengthValidationContext> = {}
): boolean {
  const result = validateResponseLength(response, context);
  return result.severity === 'error' || result.severity === 'warning';
}

/**
 * Get condensing suggestions
 */
export function getCondensingSuggestions(response: string): string[] {
  const suggestions: string[] = [];
  
  // Check for redundant phrases
  const redundantPhrases = [
    'in order to',
    'at this point in time',
    'due to the fact that',
    'in the event that',
    'for the purpose of',
    'with regard to',
    'in addition to',
    'as a matter of fact',
  ];
  
  for (const phrase of redundantPhrases) {
    if (response.toLowerCase().includes(phrase)) {
      suggestions.push(`replace "${phrase}" with simpler alternative`);
    }
  }
  
  // Check for very long sentences
  const sentences = response.split(/[.!?]+/);
  const longSentences = sentences.filter(s => s.split(/\s+/).length > 25);
  if (longSentences.length > 0) {
    suggestions.push(`break up ${longSentences.length} long sentence(s)`);
  }
  
  // Check for repetition
  const words = response.toLowerCase().split(/\s+/);
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    if (word.length > 4) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }
  const repeated = Array.from(wordFreq.entries())
    .filter(([_, count]) => count >= 3)
    .map(([word]) => word);
  if (repeated.length > 0) {
    suggestions.push(`reduce repetition of: ${repeated.slice(0, 3).join(', ')}`);
  }
  
  return suggestions;
}
