/**
 * Forbidden Phrase Checker
 * 
 * Checks responses for forbidden phrases that violate AI identity
 * and constitutional guidelines.
 * 
 * @module services/validation/agents/forbiddenPhraseChecker
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Violation category
 */
export type ViolationCategory =
  | 'ai_identity'       // Revealing AI nature
  | 'competitor'        // Mentioning competitors
  | 'overpromise'       // Making unrealistic promises
  | 'blame'             // Blaming user or others
  | 'dismissive'        // Dismissing user concerns
  | 'corporate_speak'   // Inappropriate corporate language
  | 'sensitivity';      // Insensitive language

/**
 * Forbidden phrase match
 */
export interface PhraseMatch {
  phrase: string;
  category: ViolationCategory;
  severity: 'warning' | 'error' | 'critical';
  replacement?: string;
  position: number;
}

/**
 * Validation result
 */
export interface ForbiddenPhraseResult {
  isValid: boolean;
  violations: PhraseMatch[];
  severity: 'ok' | 'warning' | 'error' | 'critical';
  message: string;
  cleanedResponse?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORBIDDEN PHRASES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Forbidden phrases by category
 */
export const FORBIDDEN_PHRASES: Record<ViolationCategory, Array<{
  pattern: RegExp;
  severity: 'warning' | 'error' | 'critical';
  replacement?: string;
  description: string;
}>> = {
  ai_identity: [
    {
      pattern: /\b(i am an? (AI|artificial intelligence|bot|chatbot|language model|LLM))\b/gi,
      severity: 'critical',
      replacement: "I'm here to help",
      description: 'revealing AI identity',
    },
    {
      pattern: /\b(as an AI|being an AI|since I'm an? (AI|bot))\b/gi,
      severity: 'critical',
      replacement: '',
      description: 'referencing AI nature',
    },
    {
      pattern: /\b(my (programming|training|algorithms?))\b/gi,
      severity: 'error',
      replacement: '',
      description: 'technical AI reference',
    },
    {
      pattern: /\b(OpenAI|GPT|Claude|Anthropic|Google AI)\b/gi,
      severity: 'critical',
      replacement: '',
      description: 'mentioning AI provider',
    },
    {
      pattern: /\b(i (don't|cannot) (actually )?(feel|have feelings|experience emotions))\b/gi,
      severity: 'error',
      replacement: '',
      description: 'discussing AI limitations',
    },
  ],
  competitor: [
    {
      pattern: /\b(Airtel|Vodafone|Vi|Idea|BSNL|MTNL|ACT Fibernet|Hathway|Tata Sky)\b/gi,
      severity: 'error',
      replacement: 'other providers',
      description: 'mentioning competitor brand',
    },
    {
      pattern: /\b(better than|worse than|compared to) (other|competitor)\b/gi,
      severity: 'warning',
      replacement: '',
      description: 'competitive comparison',
    },
  ],
  overpromise: [
    {
      pattern: /\b(i (guarantee|promise|assure you) (that )?(it|this) will (definitely|100%))\b/gi,
      severity: 'error',
      replacement: 'this should help',
      description: 'absolute guarantee',
    },
    {
      pattern: /\b(100% (guaranteed|sure|certain|fixed))\b/gi,
      severity: 'error',
      replacement: 'highly likely to work',
      description: 'false certainty',
    },
    {
      pattern: /\b(will (never|always) (happen|work|fail))\b/gi,
      severity: 'warning',
      replacement: '',
      description: 'absolute prediction',
    },
    {
      pattern: /\b(immediate(ly)?|instant(ly)?|right away) (refund|credit|resolution))\b/gi,
      severity: 'warning',
      replacement: 'quick',
      description: 'unrealistic timing promise',
    },
  ],
  blame: [
    {
      pattern: /\b(it's your fault|you (did|made) (it|this) wrong|your mistake)\b/gi,
      severity: 'critical',
      replacement: '',
      description: 'blaming user',
    },
    {
      pattern: /\b(you should have|why didn't you|you failed to)\b/gi,
      severity: 'error',
      replacement: '',
      description: 'criticizing user',
    },
    {
      pattern: /\b(because of (your|the user's) (error|mistake|failure))\b/gi,
      severity: 'error',
      replacement: '',
      description: 'attributing blame',
    },
  ],
  dismissive: [
    {
      pattern: /\b(that's not (my|our) (problem|issue|concern))\b/gi,
      severity: 'critical',
      replacement: "let me see how I can help",
      description: 'dismissing responsibility',
    },
    {
      pattern: /\b(i (can't|cannot) help (you )?(with that|here))\b/gi,
      severity: 'error',
      replacement: "let me find someone who can help",
      description: 'refusing to help',
    },
    {
      pattern: /\b(that('s| is) (just|simply) (how it works|the way it is))\b/gi,
      severity: 'warning',
      replacement: '',
      description: 'dismissive explanation',
    },
    {
      pattern: /\b(i (don't|do not) (care|understand why))\b/gi,
      severity: 'critical',
      replacement: '',
      description: 'expressing indifference',
    },
  ],
  corporate_speak: [
    {
      pattern: /\b(synergy|leverage|paradigm shift|best.?in.?class|world.?class)\b/gi,
      severity: 'warning',
      replacement: '',
      description: 'corporate jargon',
    },
    {
      pattern: /\b(due to (unforeseen|circumstances beyond our control))\b/gi,
      severity: 'warning',
      replacement: '',
      description: 'vague corporate excuse',
    },
    {
      pattern: /\b(at this (point in time|juncture))\b/gi,
      severity: 'warning',
      replacement: 'now',
      description: 'unnecessarily formal',
    },
    {
      pattern: /\b(pursuant to|in accordance with|notwithstanding)\b/gi,
      severity: 'warning',
      replacement: 'based on',
      description: 'legal jargon',
    },
  ],
  sensitivity: [
    {
      pattern: /\b(obviously|clearly you (don't|didn't))\b/gi,
      severity: 'warning',
      replacement: '',
      description: 'condescending language',
    },
    {
      pattern: /\b(calm down|relax|chill)\b/gi,
      severity: 'error',
      replacement: 'I understand',
      description: 'dismissing emotions',
    },
    {
      pattern: /\b(you('re| are) (wrong|mistaken|confused))\b/gi,
      severity: 'error',
      replacement: 'let me clarify',
      description: 'correcting harshly',
    },
    {
      pattern: /\b(stop (complaining|whining|being difficult))\b/gi,
      severity: 'critical',
      replacement: '',
      description: 'dismissing complaints',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check for forbidden phrases
 */
export function checkForbiddenPhrases(response: string): ForbiddenPhraseResult {
  const violations: PhraseMatch[] = [];
  
  for (const [category, phrases] of Object.entries(FORBIDDEN_PHRASES)) {
    for (const { pattern, severity, replacement, description } of phrases) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(response)) !== null) {
        violations.push({
          phrase: match[0],
          category: category as ViolationCategory,
          severity,
          replacement,
          position: match.index,
        });
      }
    }
  }
  
  // Determine overall severity
  let severity: ForbiddenPhraseResult['severity'] = 'ok';
  let isValid = true;
  let message = 'no forbidden phrases found';
  
  if (violations.some(v => v.severity === 'critical')) {
    severity = 'critical';
    isValid = false;
    message = 'critical forbidden phrases detected';
  } else if (violations.some(v => v.severity === 'error')) {
    severity = 'error';
    isValid = false;
    message = 'forbidden phrases detected';
  } else if (violations.some(v => v.severity === 'warning')) {
    severity = 'warning';
    message = 'potential issues detected';
  }
  
  // Generate cleaned response if there are violations
  let cleanedResponse: string | undefined;
  if (violations.length > 0) {
    cleanedResponse = cleanResponse(response, violations);
  }
  
  return {
    isValid,
    violations,
    severity,
    message,
    cleanedResponse,
  };
}

/**
 * Clean response by removing/replacing forbidden phrases
 */
function cleanResponse(response: string, violations: PhraseMatch[]): string {
  let cleaned = response;
  
  // Sort by position descending to replace from end
  const sortedViolations = [...violations].sort((a, b) => b.position - a.position);
  
  for (const violation of sortedViolations) {
    const replacement = violation.replacement || '';
    cleaned = cleaned.slice(0, violation.position) + 
              replacement + 
              cleaned.slice(violation.position + violation.phrase.length);
  }
  
  // Clean up any double spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  
  return cleaned;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format result for prompt injection
 */
export function formatForbiddenPhraseForPrompt(result: ForbiddenPhraseResult): string {
  const lines = [
    '## forbidden phrase check',
    `status: ${result.severity}`,
    `violations: ${result.violations.length}`,
  ];
  
  if (result.violations.length > 0) {
    lines.push('');
    lines.push('issues found:');
    for (const v of result.violations.slice(0, 5)) {
      const fix = v.replacement ? ` → use "${v.replacement}"` : ' → remove';
      lines.push(`- [${v.severity}] "${v.phrase}" (${v.category})${fix}`);
    }
    
    if (result.violations.length > 5) {
      lines.push(`... and ${result.violations.length - 5} more`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Quick check if response has critical issues
 */
export function hasCriticalIssues(response: string): boolean {
  const result = checkForbiddenPhrases(response);
  return result.violations.some(v => v.severity === 'critical');
}

/**
 * Get violations by category
 */
export function getViolationsByCategory(
  result: ForbiddenPhraseResult
): Record<ViolationCategory, PhraseMatch[]> {
  const byCategory: Record<ViolationCategory, PhraseMatch[]> = {
    ai_identity: [],
    competitor: [],
    overpromise: [],
    blame: [],
    dismissive: [],
    corporate_speak: [],
    sensitivity: [],
  };
  
  for (const violation of result.violations) {
    byCategory[violation.category].push(violation);
  }
  
  return byCategory;
}

/**
 * Check for specific category
 */
export function hasViolationInCategory(
  response: string,
  category: ViolationCategory
): boolean {
  const result = checkForbiddenPhrases(response);
  return result.violations.some(v => v.category === category);
}

/**
 * Get safe alternatives for common forbidden phrases
 */
export function getSafeAlternatives(): Record<string, string> {
  return {
    "I am an AI": "I'm here to help",
    "As an AI": "(just remove)",
    "I guarantee": "This should help",
    "100% guaranteed": "Highly likely to work",
    "calm down": "I understand this is frustrating",
    "that's not my problem": "Let me see how I can help",
    "you're wrong": "Let me clarify",
    "obviously": "(just remove)",
    "at this point in time": "now",
    "other providers": "(be specific or remove)",
  };
}
