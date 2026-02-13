/**
 * Anti-Pattern Detector
 * 
 * Detects structural, language, trust, and emotional anti-patterns
 * in AI responses for quality assurance.
 * 
 * @module services/qa/antiPatternDetector
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Anti-pattern categories
 */
export type AntiPatternCategory =
  | 'structural'   // Response structure issues
  | 'language'     // Language and tone issues
  | 'trust'        // Trust-breaking patterns
  | 'emotional';   // Emotional intelligence failures

/**
 * Anti-pattern severity
 */
export type PatternSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Detected anti-pattern
 */
export interface DetectedAntiPattern {
  id: string;
  category: AntiPatternCategory;
  name: string;
  description: string;
  severity: PatternSeverity;
  matchedText?: string;
  position?: number;
  fix: string;
}

/**
 * Detection result
 */
export interface AntiPatternResult {
  hasAntiPatterns: boolean;
  totalCount: number;
  bySeverity: Record<PatternSeverity, number>;
  byCategory: Record<AntiPatternCategory, number>;
  patterns: DetectedAntiPattern[];
  overallSeverity: PatternSeverity;
  isAcceptable: boolean;
}

/**
 * Context for detection
 */
export interface AntiPatternContext {
  response: string;
  userEmotion?: string;
  intent?: string;
  turnNumber?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-PATTERN DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface AntiPatternDefinition {
  id: string;
  category: AntiPatternCategory;
  name: string;
  description: string;
  severity: PatternSeverity;
  pattern: RegExp;
  fix: string;
  contextual?: (context: AntiPatternContext) => boolean;
}

const ANTI_PATTERNS: AntiPatternDefinition[] = [
  // ═════════════════════════════════════════════════════════════
  // STRUCTURAL ANTI-PATTERNS
  // ═════════════════════════════════════════════════════════════
  {
    id: 'multiple_questions',
    category: 'structural',
    name: 'multiple questions',
    description: 'asking more than one question per turn',
    severity: 'medium',
    pattern: /\?[^?]*\?/g,
    fix: 'ask only one question per turn',
  },
  {
    id: 'wall_of_text',
    category: 'structural',
    name: 'wall of text',
    description: 'response over 200 words without structure',
    severity: 'medium',
    pattern: /^[^•\n\d.]{500,}$/g,
    fix: 'break into paragraphs or use bullet points',
  },
  {
    id: 'no_clear_cta',
    category: 'structural',
    name: 'missing call-to-action',
    description: 'no clear next step for user',
    severity: 'low',
    pattern: /^(?!.*\b(click|tap|open|call|visit|try|check)\b).*$/gi,
    fix: 'add a clear action for the user to take',
    contextual: (ctx) => ctx.intent === 'support',
  },
  {
    id: 'incomplete_sentence',
    category: 'structural',
    name: 'incomplete sentence',
    description: 'sentence trailing off without completion',
    severity: 'medium',
    pattern: /\.\.\.$|…$/g,
    fix: 'complete all sentences',
  },
  {
    id: 'excessive_bullets',
    category: 'structural',
    name: 'excessive bullet points',
    description: 'more than 7 bullet points becomes overwhelming',
    severity: 'low',
    pattern: /(?:^[-•]\s.+$\n?){8,}/gm,
    fix: 'limit to 5-7 bullet points max',
  },
  
  // ═════════════════════════════════════════════════════════════
  // LANGUAGE ANTI-PATTERNS
  // ═════════════════════════════════════════════════════════════
  {
    id: 'corporate_speak',
    category: 'language',
    name: 'corporate jargon',
    description: 'using corporate buzzwords',
    severity: 'low',
    pattern: /\b(synergy|leverage|paradigm|best-in-class|world-class|streamline|optimize)\b/gi,
    fix: 'use simple, everyday language',
  },
  {
    id: 'passive_voice_heavy',
    category: 'language',
    name: 'passive voice overuse',
    description: 'too many passive constructions',
    severity: 'low',
    pattern: /\b(was|were|been|being|is|are)\s+\w+ed\b.*\b(was|were|been|being|is|are)\s+\w+ed\b/gi,
    fix: 'use active voice when possible',
  },
  {
    id: 'filler_phrases',
    category: 'language',
    name: 'filler phrases',
    description: 'unnecessary filler text',
    severity: 'low',
    pattern: /\b(basically|actually|literally|honestly|to be honest|in order to|at this point in time)\b/gi,
    fix: 'remove filler phrases for conciseness',
  },
  {
    id: 'negative_framing',
    category: 'language',
    name: 'negative framing',
    description: 'focusing on what cannot be done',
    severity: 'medium',
    pattern: /\b(unfortunately|can't|cannot|won't|unable|impossible|not possible)\b.*\./gi,
    fix: 'reframe positively - focus on what CAN be done',
  },
  {
    id: 'complex_sentences',
    category: 'language',
    name: 'overly complex sentences',
    description: 'sentences too long and complex',
    severity: 'low',
    pattern: /[^.!?]{150,}[.!?]/g,
    fix: 'break long sentences into shorter ones',
  },
  
  // ═════════════════════════════════════════════════════════════
  // TRUST ANTI-PATTERNS
  // ═════════════════════════════════════════════════════════════
  {
    id: 'overpromise',
    category: 'trust',
    name: 'overpromising',
    description: 'making guarantees that may not be kept',
    severity: 'high',
    pattern: /\b(guarantee|promise|definitely|100%|absolutely will|for sure)\b/gi,
    fix: 'use measured language like "should" or "typically"',
  },
  {
    id: 'blame_user',
    category: 'trust',
    name: 'blaming user',
    description: 'attributing fault to the user',
    severity: 'critical',
    pattern: /\b(your fault|you (did|made) it wrong|you should have|your mistake|you failed)\b/gi,
    fix: 'never blame the user - focus on solutions',
  },
  {
    id: 'deflection',
    category: 'trust',
    name: 'deflection',
    description: 'refusing responsibility',
    severity: 'high',
    pattern: /\b(not my (problem|issue)|that's (just )?how it (works|is)|nothing (I|we) can do)\b/gi,
    fix: 'take ownership and offer alternatives',
  },
  {
    id: 'vague_timeline',
    category: 'trust',
    name: 'vague timeline',
    description: 'unclear or overly vague time commitments',
    severity: 'medium',
    pattern: /\b(soon|shortly|in a while|as soon as possible|when possible)\b/gi,
    fix: 'provide specific timeframes when possible',
  },
  {
    id: 'hidden_terms',
    category: 'trust',
    name: 'hidden conditions',
    description: 'burying important conditions',
    severity: 'medium',
    pattern: /\b(subject to|terms apply|conditions apply|restrictions may apply)\b/gi,
    fix: 'be upfront about conditions',
  },
  
  // ═════════════════════════════════════════════════════════════
  // EMOTIONAL ANTI-PATTERNS
  // ═════════════════════════════════════════════════════════════
  {
    id: 'dismissive',
    category: 'emotional',
    name: 'dismissive language',
    description: 'minimizing user concerns',
    severity: 'high',
    pattern: /\b(just|simply|only|easy|no big deal|don't worry about it)\b.*\b(issue|problem|concern)\b/gi,
    fix: 'acknowledge the importance of user concerns',
  },
  {
    id: 'tone_deaf',
    category: 'emotional',
    name: 'tone deaf response',
    description: 'inappropriate cheerfulness during frustration',
    severity: 'high',
    pattern: /\b(great|awesome|wonderful|fantastic|amazing)\b/gi,
    fix: 'match tone to user emotion',
    contextual: (ctx) => ['raudra', 'bhayanak', 'karun'].includes(ctx.userEmotion || ''),
  },
  {
    id: 'over_apologizing',
    category: 'emotional',
    name: 'excessive apologies',
    description: 'apologizing multiple times',
    severity: 'low',
    pattern: /\b(sorry|apolog)\b.*\b(sorry|apolog)\b/gi,
    fix: 'apologize once and move to solution',
  },
  {
    id: 'robotic_empathy',
    category: 'emotional',
    name: 'robotic empathy',
    description: 'formulaic, insincere empathy phrases',
    severity: 'medium',
    pattern: /\bi understand (your|the) (frustration|concern|issue)\.\s*(however|but)/gi,
    fix: 'show genuine empathy without immediately pivoting',
  },
  {
    id: 'ignore_emotion',
    category: 'emotional',
    name: 'ignoring emotion',
    description: 'not acknowledging clear user emotion',
    severity: 'high',
    pattern: /^(?!.*(understand|hear|see|frustrat|concern|worry|help)).*$/gi,
    fix: 'acknowledge the emotion before addressing the issue',
    contextual: (ctx) => ['raudra', 'bhayanak', 'karun'].includes(ctx.userEmotion || ''),
  },
  {
    id: 'condescending',
    category: 'emotional',
    name: 'condescending tone',
    description: 'talking down to user',
    severity: 'high',
    pattern: /\b(obviously|clearly you|as you (should|would) know|it's simple)\b/gi,
    fix: 'treat user as equal partner',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect all anti-patterns in response
 */
export function detectAntiPatterns(context: AntiPatternContext): AntiPatternResult {
  const patterns: DetectedAntiPattern[] = [];
  const { response } = context;
  
  for (const def of ANTI_PATTERNS) {
    // Check contextual condition
    if (def.contextual && !def.contextual(context)) {
      continue;
    }
    
    // Reset regex
    const regex = new RegExp(def.pattern.source, def.pattern.flags);
    let match;
    
    while ((match = regex.exec(response)) !== null) {
      patterns.push({
        id: def.id,
        category: def.category,
        name: def.name,
        description: def.description,
        severity: def.severity,
        matchedText: match[0],
        position: match.index,
        fix: def.fix,
      });
    }
  }
  
  // Calculate counts
  const bySeverity: Record<PatternSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  
  const byCategory: Record<AntiPatternCategory, number> = {
    structural: 0,
    language: 0,
    trust: 0,
    emotional: 0,
  };
  
  for (const pattern of patterns) {
    bySeverity[pattern.severity]++;
    byCategory[pattern.category]++;
  }
  
  // Determine overall severity
  let overallSeverity: PatternSeverity = 'low';
  if (bySeverity.critical > 0) overallSeverity = 'critical';
  else if (bySeverity.high > 0) overallSeverity = 'high';
  else if (bySeverity.medium > 0) overallSeverity = 'medium';
  
  // Determine acceptability
  const isAcceptable = bySeverity.critical === 0 && bySeverity.high === 0;
  
  return {
    hasAntiPatterns: patterns.length > 0,
    totalCount: patterns.length,
    bySeverity,
    byCategory,
    patterns,
    overallSeverity,
    isAcceptable,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format result for prompt injection
 */
export function formatAntiPatternResult(result: AntiPatternResult): string {
  if (!result.hasAntiPatterns) {
    return '## anti-pattern check: passed';
  }
  
  const lines = [
    '## anti-pattern check: issues found',
    `total: ${result.totalCount}`,
    `severity: ${result.overallSeverity}`,
    `acceptable: ${result.isAcceptable}`,
    '',
    '### detected patterns:',
  ];
  
  // Group by severity
  const critical = result.patterns.filter(p => p.severity === 'critical');
  const high = result.patterns.filter(p => p.severity === 'high');
  const medium = result.patterns.filter(p => p.severity === 'medium');
  
  if (critical.length > 0) {
    lines.push('');
    lines.push('**CRITICAL:**');
    critical.forEach(p => lines.push(`- ${p.name}: ${p.fix}`));
  }
  
  if (high.length > 0) {
    lines.push('');
    lines.push('**HIGH:**');
    high.forEach(p => lines.push(`- ${p.name}: ${p.fix}`));
  }
  
  if (medium.length > 0) {
    lines.push('');
    lines.push('**MEDIUM:**');
    medium.forEach(p => lines.push(`- ${p.name}: ${p.fix}`));
  }
  
  return lines.join('\n');
}

/**
 * Get patterns by category
 */
export function getPatternsByCategory(
  result: AntiPatternResult,
  category: AntiPatternCategory
): DetectedAntiPattern[] {
  return result.patterns.filter(p => p.category === category);
}

/**
 * Get all fix suggestions
 */
export function getFixSuggestions(result: AntiPatternResult): string[] {
  const suggestions = new Set<string>();
  
  // Prioritize by severity
  const sorted = [...result.patterns].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  for (const pattern of sorted) {
    suggestions.add(pattern.fix);
  }
  
  return Array.from(suggestions);
}

/**
 * Quick check for critical issues
 */
export function hasCriticalAntiPatterns(response: string): boolean {
  const result = detectAntiPatterns({ response });
  return result.bySeverity.critical > 0;
}

/**
 * Get anti-pattern summary for logging
 */
export function getAntiPatternSummary(result: AntiPatternResult): string {
  if (!result.hasAntiPatterns) {
    return 'no anti-patterns detected';
  }
  
  const parts = [
    `${result.totalCount} pattern(s)`,
    `severity: ${result.overallSeverity}`,
  ];
  
  if (result.bySeverity.critical > 0) {
    parts.push(`${result.bySeverity.critical} critical`);
  }
  if (result.bySeverity.high > 0) {
    parts.push(`${result.bySeverity.high} high`);
  }
  
  return parts.join(' | ');
}
