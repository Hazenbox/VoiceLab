/**
 * Forbidden Phrase Checker
 * 
 * Checks responses for forbidden phrases that violate AI identity
 * and constitutional guidelines.
 * 
 * @module services/validation/agents/forbiddenPhraseChecker
 */

import { cleanOrphanedPunctuation } from '../../trust/autoFixEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Violation category
 */
export type ViolationCategory =
  | 'ai_identity'       // Human impersonation or inappropriate AI provider disclosure
  | 'competitor'        // Mentioning competitors
  | 'overpromise'       // Making unrealistic promises
  | 'blame'             // Blaming user or others
  | 'dismissive'        // Dismissing user concerns
  | 'corporate_speak'   // Inappropriate corporate language
  | 'sensitivity'       // Insensitive language
  | 'false_empathy'     // Empty empathy without follow-through (KB/13)
  | 'passive_institutional'; // Passive/institutional phrasing (KB/11)

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
    // HUMAN IMPERSONATION -- these are the real violations per KB
    {
      pattern: /\bi am (a )?human\b/gi,
      severity: 'critical',
      replacement: "I'm Jio's AI assistant",
      description: 'impersonating human',
    },
    {
      pattern: /\bi am (a )?(real )?person\b/gi,
      severity: 'critical',
      replacement: "I'm Jio's AI assistant",
      description: 'impersonating human',
    },
    {
      pattern: /\bi (was|am) born\b/gi,
      severity: 'critical',
      replacement: '',
      description: 'claiming human origin',
    },
    {
      pattern: /\bmy (personal |lived )?experience(s)? (as a|growing up|when i was)\b/gi,
      severity: 'critical',
      replacement: '',
      description: 'fabricating personal experience',
    },
    {
      pattern: /\bi (truly |really |actually )?(feel|have feelings|experience emotions)\b/gi,
      severity: 'error',
      replacement: '',
      description: 'claiming human emotions',
    },
    // AI PROVIDER DISCLOSURE -- don't reveal underlying tech
    {
      pattern: /\b(OpenAI|GPT-?\d*|ChatGPT|Claude|Anthropic|Google AI|Gemini|Llama|Mistral)\b/gi,
      severity: 'critical',
      replacement: '',
      description: 'mentioning AI provider',
    },
    // TECHNICAL AI REFERENCES -- keep responses user-friendly
    {
      pattern: /\b(my (programming|training data|algorithms?|neural network))\b/gi,
      severity: 'error',
      replacement: '',
      description: 'technical AI reference',
    },
    // CASUAL BOT REFERENCES -- prefer "AI assistant" over "bot/chatbot"
    {
      pattern: /\bi am (a )?(bot|chatbot|language model|LLM)\b/gi,
      severity: 'warning',
      replacement: "I'm Jio's AI assistant",
      description: 'prefer AI assistant over bot/chatbot',
    },
    // NOTE: "I am an AI", "I'm an AI assistant", "as an AI" are ALLOWED per KB.
    // The KB mandates clear AI self-identification. Do NOT flag these.
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
      pattern: /\b(immediate(ly)?|instant(ly)?|right away) (refund|credit|resolution)\b/gi,
      severity: 'warning',
      replacement: 'quick',
      description: 'unrealistic timing promise',
    },
  ],
  blame: [
    {
      pattern: /\b(it's your fault|you (did|made) (it|this) wrong|your mistake)\b/gi,
      severity: 'critical',
      replacement: 'there seems to be an issue with',
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
      replacement: "let me help with this",
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

  // KB/13: False empathy - empty sympathy without action
  false_empathy: [
    {
      pattern: /\bi (completely |totally |fully )?understand your (frustration|concern|issue|problem)\.\s*$/gim,
      severity: 'warning',
      replacement: "let me look into this and help you.",
      description: 'empathy statement without follow-through action',
    },
    {
      pattern: /\bi('m| am) sorry (to hear|for the|about).*?\.\s*(?!(let me|here|i'll|we can|to help))/gi,
      severity: 'warning',
      replacement: "let me check on this right away.",
      description: 'apology without immediate next step',
    },
    {
      pattern: /\b(we value your|your .+ is important to us|thank you for your patience)\b/gi,
      severity: 'warning',
      replacement: '',
      description: 'corporate filler empathy',
    },
  ],

  // KB/11: Passive/institutional phrasing
  passive_institutional: [
    {
      pattern: /\b(the request has been|your request has been|the issue has been) (logged|noted|recorded|registered)\b/gi,
      severity: 'warning',
      replacement: "i'm looking into this now",
      description: 'passive institutional language',
    },
    {
      pattern: /\b(please be (informed|advised|noted) that)\b/gi,
      severity: 'warning',
      replacement: '',
      description: 'institutional advisory tone',
    },
    {
      pattern: /\b(as per (our |the )?(policy|guidelines|terms|regulations))\b/gi,
      severity: 'warning',
      replacement: "here's how this works",
      description: 'hiding behind policy',
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
  
  // Clean up double spaces and orphaned punctuation
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  cleaned = cleanOrphanedPunctuation(cleaned);
  
  return cleaned;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

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
    false_empathy: [],
    passive_institutional: [],
  };
  
  for (const violation of result.violations) {
    byCategory[violation.category].push(violation);
  }
  
  return byCategory;
}
