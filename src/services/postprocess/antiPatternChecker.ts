/**
 * Anti-Pattern Checker
 *
 * Detects KB-violating response patterns that the LLM tends to generate.
 * Each pattern has a severity and a short description for retry feedback.
 *
 * @module services/postprocess/antiPatternChecker
 */

export interface AntiPatternViolation {
  id: string;
  pattern: string;
  severity: 'error' | 'warning';
  shortDescription: string;
  autoFixable: boolean;
}

const ANTI_PATTERNS: Array<{
  id: string;
  regex: RegExp;
  severity: 'error' | 'warning';
  shortDescription: string;
  autoFixable: boolean;
}> = [
  // KB/13 avoid patterns
  {
    id: 'ap-01',
    regex: /^(I understand|I hear you|I get it)[.,!]?\s/im,
    severity: 'warning',
    shortDescription: 'starts with generic empathy opener',
    autoFixable: false,
  },
  {
    id: 'ap-02',
    regex: /\b(as (a|an) (AI|artificial intelligence|language model))\b/gi,
    severity: 'warning',
    shortDescription: 'unnecessary AI self-reference mid-response',
    autoFixable: false,
  },
  {
    id: 'ap-03',
    regex: /(?:^|\n)\s*\d+[\.\)].+(?:\n\s*\d+[\.\)].+){7,}/m,
    severity: 'warning',
    shortDescription: 'more than 7 numbered steps (max 7 per KB/11)',
    autoFixable: false,
  },
  {
    id: 'ap-04',
    regex: /(.{300,})[.!?]\s/,
    severity: 'warning',
    shortDescription: 'sentence exceeds 300 characters (readability)',
    autoFixable: false,
  },
  {
    id: 'ap-05',
    regex: /\b(please note|kindly note|be advised|it is important to note)\b/gi,
    severity: 'warning',
    shortDescription: 'institutional advisory phrasing',
    autoFixable: true,
  },
  {
    id: 'ap-06',
    regex: /\b(unfortunately|regrettably|sadly)\b/gi,
    severity: 'warning',
    shortDescription: 'negative framing opener (reframe positively)',
    autoFixable: true,
  },
  {
    id: 'ap-07',
    regex: /\b(dear (customer|user|sir|madam|valued))\b/gi,
    severity: 'error',
    shortDescription: 'formal salutation (never use per KB/02)',
    autoFixable: true,
  },
  {
    id: 'ap-08',
    regex: /\b(we regret to inform|we are sorry to|we apologize for the inconvenience)\b/gi,
    severity: 'warning',
    shortDescription: 'corporate apology template',
    autoFixable: true,
  },
  {
    id: 'ap-09',
    regex: /\b(for (more|further) (information|details|assistance),?\s*(please\s+)?(contact|call|visit|reach))\b/gi,
    severity: 'warning',
    shortDescription: 'generic sign-off deflection',
    autoFixable: false,
  },
  {
    id: 'ap-10',
    regex: /\*{2,}[^*]+\*{2,}/g,
    severity: 'warning',
    shortDescription: 'excessive bold/markdown formatting in chat',
    autoFixable: true,
  },
  {
    id: 'ap-11',
    regex: /\b(here's what you need to do|you need to follow these steps)\b/gi,
    severity: 'warning',
    shortDescription: 'directive phrasing (use collaborative tone)',
    autoFixable: false,
  },
  {
    id: 'ap-12',
    regex: /\b(i hope (this|that|i) (helps?|was helpful|resolved))\b/gi,
    severity: 'warning',
    shortDescription: 'generic hope-based closing',
    autoFixable: true,
  },
  // Gap #16: Over-promising and speculative timelines
  {
    id: 'ap-13',
    regex: /\b(within\s+\d+\s+(minutes?|hours?|days?)\s+(your|the)\s+(issue|problem|request)\s+(will be|should be)\s+(resolved|fixed|completed))\b/gi,
    severity: 'error',
    shortDescription: 'speculative resolution timeline',
    autoFixable: false,
  },
  {
    id: 'ap-14',
    regex: /\b(i (can )?guarantee|this will (definitely|surely|certainly) (work|fix|resolve))\b/gi,
    severity: 'error',
    shortDescription: 'over-promising outcome',
    autoFixable: false,
  },
  {
    id: 'ap-15',
    regex: /\b(by (tomorrow|tonight|end of day|next week)\s+(it|this|everything)\s+(will|should))\b/gi,
    severity: 'warning',
    shortDescription: 'speculative timeline commitment',
    autoFixable: false,
  },
];

export interface AntiPatternResult {
  violations: AntiPatternViolation[];
  passedCount: number;
  totalChecks: number;
}

/**
 * Run all anti-pattern checks on content.
 */
export function checkAntiPatterns(content: string): AntiPatternResult {
  const violations: AntiPatternViolation[] = [];

  for (const { id, regex, severity, shortDescription, autoFixable } of ANTI_PATTERNS) {
    const re = new RegExp(regex.source, regex.flags);
    if (re.test(content)) {
      violations.push({ id, pattern: regex.source, severity, shortDescription, autoFixable });
    }
  }

  return {
    violations,
    passedCount: ANTI_PATTERNS.length - violations.length,
    totalChecks: ANTI_PATTERNS.length,
  };
}

/**
 * Get only the violations suitable for retry feedback
 * (non-autoFixable ones that need LLM re-generation).
 */
export function getRetryFeedback(violations: AntiPatternViolation[]): string[] {
  return violations
    .filter(v => !v.autoFixable)
    .slice(0, 3)
    .map(v => v.shortDescription);
}
