/**
 * Turn Discipline Agent
 * 
 * Validates that each turn follows discipline rules:
 * - One question per turn
 * - One CTA per turn
 * - Clear forward momentum
 * 
 * @module services/validation/agents/turnDisciplineAgent
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Discipline violation types
 */
export type ViolationType =
  | 'multiple_questions'
  | 'multiple_ctas'
  | 'no_forward_momentum'
  | 'mixed_messages'
  | 'unclear_next_step';

/**
 * Validation result
 */
export interface TurnDisciplineResult {
  isValid: boolean;
  violations: DisciplineViolation[];
  questionCount: number;
  ctaCount: number;
  hasForwardMomentum: boolean;
  severity: 'ok' | 'warning' | 'error';
  suggestions: string[];
}

/**
 * Individual violation
 */
export interface DisciplineViolation {
  type: ViolationType;
  message: string;
  location?: string;
  severity: 'warning' | 'error';
}

/**
 * Context for validation
 */
export interface TurnDisciplineContext {
  turnNumber: number;
  intent: string;
  resolutionStatus: string;
  isLastTurn: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Question patterns
 */
const QUESTION_PATTERNS = [
  /\?/g, // Direct question marks
  /\b(could you|can you|would you|will you)\s+(please\s+)?(share|tell|provide|confirm|let me know)\b/gi,
  /\b(what|when|where|which|who|how|why)\s+(is|are|do|does|did|will|would|should|can|could)\b/gi,
  /\bplease\s+(share|tell|provide|confirm|let me know)\b/gi,
];

/**
 * CTA patterns
 */
const CTA_PATTERNS = [
  /\b(click|tap|press|select|open|visit|go to|download|install|call|dial)\s+(here|on|the|this)/gi,
  /\b(you can|please|kindly)\s+(try|check|visit|open|call|dial|download)/gi,
  /\b(try|check out|have a look at|refer to)\b/gi,
  /\bhttps?:\/\/\S+/gi, // URLs as CTAs
  /\b(myjio|myJio)\s+app\b/gi,
  /\b(199|198|100|112)\b/g, // Helpline numbers
];

/**
 * Forward momentum indicators
 */
const MOMENTUM_PATTERNS = [
  /\b(let me|i('ll| will)|here's what|next step|to (fix|resolve|proceed))\b/gi,
  /\b(this (will|should)|once (you|done)|after (that|this))\b/gi,
  /\b(meanwhile|in the meantime|while|as)\b/gi,
  /\b\d+\.\s+/g, // Numbered steps
  /^[-•]\s+/gm, // Bullet points
];

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Count questions in response
 */
export function countQuestions(response: string): { count: number; questions: string[] } {
  const questions: string[] = [];
  
  // Split by sentences
  const sentences = response.split(/(?<=[.!?])\s+/);
  
  for (const sentence of sentences) {
    // Check for question marks
    if (sentence.includes('?')) {
      questions.push(sentence.trim());
      continue;
    }
    
    // Check for implicit questions
    for (const pattern of QUESTION_PATTERNS) {
      if (pattern.test(sentence)) {
        questions.push(sentence.trim());
        break;
      }
    }
  }
  
  return { count: questions.length, questions: [...new Set(questions)] };
}

/**
 * Count CTAs in response
 */
export function countCTAs(response: string): { count: number; ctas: string[] } {
  const ctas: string[] = [];
  
  for (const pattern of CTA_PATTERNS) {
    const matches = response.match(pattern);
    if (matches) {
      ctas.push(...matches);
    }
  }
  
  // Deduplicate
  const uniqueCTAs = [...new Set(ctas)];
  
  return { count: uniqueCTAs.length, ctas: uniqueCTAs };
}

/**
 * Check for forward momentum
 */
export function hasForwardMomentum(response: string): { has: boolean; indicators: string[] } {
  const indicators: string[] = [];
  
  for (const pattern of MOMENTUM_PATTERNS) {
    const matches = response.match(pattern);
    if (matches) {
      indicators.push(...matches);
    }
  }
  
  return {
    has: indicators.length > 0,
    indicators: [...new Set(indicators)],
  };
}

/**
 * Check for mixed messages
 */
export function hasMixedMessages(response: string): boolean {
  // Look for contradictory patterns
  const positivePatterns = /\b(will|can|possible|able to|yes|sure)\b/gi;
  const negativePatterns = /\b(can't|cannot|won't|unable|not possible|no)\b/gi;
  
  const positiveMatches = response.match(positivePatterns) || [];
  const negativeMatches = response.match(negativePatterns) || [];
  
  // Mixed if both positive and negative about same thing
  return positiveMatches.length > 0 && negativeMatches.length > 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate turn discipline
 */
export function validateTurnDiscipline(
  response: string,
  context: Partial<TurnDisciplineContext> = {}
): TurnDisciplineResult {
  const fullContext: TurnDisciplineContext = {
    turnNumber: context.turnNumber || 1,
    intent: context.intent || 'general',
    resolutionStatus: context.resolutionStatus || 'in_progress',
    isLastTurn: context.isLastTurn || false,
  };
  
  const violations: DisciplineViolation[] = [];
  const suggestions: string[] = [];
  
  // Count questions
  const questionResult = countQuestions(response);
  
  // Check multiple questions (error)
  if (questionResult.count > 1) {
    violations.push({
      type: 'multiple_questions',
      message: `Found ${questionResult.count} questions - only 1 allowed per turn`,
      location: questionResult.questions.slice(0, 2).join(' | '),
      severity: 'error',
    });
    suggestions.push('combine questions into one clear question');
    suggestions.push('prioritize the most important question');
  }
  
  // Count CTAs
  const ctaResult = countCTAs(response);
  
  // Check multiple CTAs (warning for 2, error for 3+)
  if (ctaResult.count > 2) {
    violations.push({
      type: 'multiple_ctas',
      message: `Found ${ctaResult.count} CTAs - maximum 1 primary CTA recommended`,
      location: ctaResult.ctas.slice(0, 3).join(', '),
      severity: 'error',
    });
    suggestions.push('reduce to one primary call-to-action');
  } else if (ctaResult.count === 2) {
    violations.push({
      type: 'multiple_ctas',
      message: 'Found 2 CTAs - consider reducing to one primary',
      location: ctaResult.ctas.join(', '),
      severity: 'warning',
    });
    suggestions.push('make one CTA primary, other secondary or remove');
  }
  
  // Check forward momentum (warning if missing and not last turn)
  const momentum = hasForwardMomentum(response);
  if (!momentum.has && !fullContext.isLastTurn && fullContext.resolutionStatus !== 'resolved') {
    violations.push({
      type: 'no_forward_momentum',
      message: 'Response lacks clear forward momentum',
      severity: 'warning',
    });
    suggestions.push('add clear next step or action');
    suggestions.push('indicate what will happen next');
  }
  
  // Check for mixed messages
  if (hasMixedMessages(response)) {
    violations.push({
      type: 'mixed_messages',
      message: 'Response contains potentially contradictory statements',
      severity: 'warning',
    });
    suggestions.push('ensure consistent messaging throughout');
  }
  
  // Determine overall validity and severity
  const hasErrors = violations.some(v => v.severity === 'error');
  const hasWarnings = violations.some(v => v.severity === 'warning');
  
  return {
    isValid: !hasErrors,
    violations,
    questionCount: questionResult.count,
    ctaCount: ctaResult.count,
    hasForwardMomentum: momentum.has,
    severity: hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok',
    suggestions,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format validation result for prompt injection
 */
export function formatTurnDisciplineForPrompt(result: TurnDisciplineResult): string {
  const lines = [
    '## turn discipline validation',
    `status: ${result.severity}`,
    `questions: ${result.questionCount} (max 1)`,
    `ctas: ${result.ctaCount} (max 1 primary)`,
    `forward_momentum: ${result.hasForwardMomentum}`,
  ];
  
  if (result.violations.length > 0) {
    lines.push('');
    lines.push('violations:');
    for (const v of result.violations) {
      lines.push(`- [${v.severity}] ${v.message}`);
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
 * Get turn discipline guidelines for context
 */
export function getTurnDisciplineGuidelines(context: Partial<TurnDisciplineContext>): string[] {
  const guidelines: string[] = [
    'ask maximum ONE question per turn',
    'include ONE primary call-to-action',
    'ensure clear forward momentum',
  ];
  
  if (context.turnNumber && context.turnNumber >= 5) {
    guidelines.push('conversation is extended - prioritize resolution');
  }
  
  if (context.resolutionStatus === 'blocked') {
    guidelines.push('blocked state - ask the ONE needed question');
  }
  
  return guidelines;
}

/**
 * Fix multiple questions - keep most important one
 */
export function reduceToOneQuestion(response: string): string {
  const { questions } = countQuestions(response);
  
  if (questions.length <= 1) {
    return response;
  }
  
  // Keep the first question, remove others
  let result = response;
  for (let i = 1; i < questions.length; i++) {
    // Replace additional questions with statements
    const q = questions[i];
    const statement = q
      .replace(/\?$/, '.')
      .replace(/^(could you|can you|would you)/i, 'please');
    result = result.replace(q, statement);
  }
  
  return result;
}
