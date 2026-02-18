/**
 * Post-Generation Compliance Verifier
 *
 * Runs ~44 deterministic KB checks in a single pass after generation.
 * Returns a structured ComplianceReport used by the pipeline to:
 *   1. Auto-fix deterministic violations
 *   2. Retry for non-deterministic violations
 *   3. Log evidence for the content trust panel
 *
 * AD-2: user NEVER sees errors. All violations are fixed or retried.
 *
 * @module services/postprocess/complianceVerifier
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ViolationCategory =
  | 'constitutional'
  | 'voice_tone'
  | 'wording'
  | 'structure'
  | 'brand'
  | 'emotion'
  | 'context_aware';

export interface ComplianceViolation {
  id: string;
  category: ViolationCategory;
  severity: 'error' | 'warning';
  description: string;
  match?: string;
  autoFixable: boolean;
  fix?: string;
}

export interface ComplianceReport {
  passed: boolean;
  score: number;
  totalChecks: number;
  passedChecks: number;
  violations: ComplianceViolation[];
  categories: Record<ViolationCategory, { passed: number; failed: number }>;
}

export interface VerifierContext {
  emotion?: string;
  channel?: string;
  ecosystem?: string;
  literacy?: string;
  timing?: string;
  isComplaint?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface Check {
  id: string;
  category: ViolationCategory;
  severity: 'error' | 'warning';
  description: string;
  test: (content: string, ctx: VerifierContext) => string | null;
  autoFixable: boolean;
  fix?: (content: string, match: string) => string;
}

const CHECKS: Check[] = [
  // ── CONSTITUTIONAL (KB/01) ────────────────────────────────────────────
  {
    id: 'c-01',
    category: 'constitutional',
    severity: 'error',
    description: 'human impersonation detected',
    test: (c) => match(c, /\bi am (a )?(human|real person)\b/i),
    autoFixable: true,
    fix: (c, m) => c.replace(m, "i'm jio's AI assistant"),
  },
  {
    id: 'c-02',
    category: 'constitutional',
    severity: 'error',
    description: 'AI provider name leaked',
    test: (c) => match(c, /\b(OpenAI|GPT-?\d*|ChatGPT|Claude|Anthropic|Gemini|Llama|Mistral)\b/i),
    autoFixable: true,
    fix: (c, m) => c.replace(new RegExp(escapeRe(m), 'gi'), ''),
  },
  {
    id: 'c-03',
    category: 'constitutional',
    severity: 'error',
    description: 'competitor brand mentioned',
    test: (c) => match(c, /\b(Airtel|Vodafone|Vi|BSNL|MTNL|ACT Fibernet|Hathway)\b/i),
    autoFixable: true,
    fix: (c, m) => c.replace(new RegExp(escapeRe(m), 'gi'), 'other providers'),
  },
  {
    id: 'c-04',
    category: 'constitutional',
    severity: 'error',
    description: 'blaming the user',
    test: (c) => match(c, /\b(it's your fault|you (did|made) (it )?wrong|your mistake|you failed to)\b/i),
    autoFixable: false,
  },
  {
    id: 'c-05',
    category: 'constitutional',
    severity: 'error',
    description: 'dismissing user concern',
    test: (c) => match(c, /\b(that's not (my|our) (problem|issue|concern))\b/i),
    autoFixable: false,
  },

  // ── VOICE & TONE (KB/02) ──────────────────────────────────────────────
  {
    id: 'v-01',
    category: 'voice_tone',
    severity: 'warning',
    description: 'uses "you should" instead of "you can" or "if helpful"',
    test: (c) => match(c, /\byou should\b/i),
    autoFixable: true,
    fix: (c, m) => c.replace(/\byou should\b/gi, 'you can'),
  },
  {
    id: 'v-02',
    category: 'voice_tone',
    severity: 'warning',
    description: 'formal salutation detected',
    test: (c) => match(c, /\b(dear (customer|user|sir|madam|valued))\b/i),
    autoFixable: true,
    fix: (c, m) => c.replace(new RegExp(escapeRe(m), 'gi'), 'hi there'),
  },
  {
    id: 'v-03',
    category: 'voice_tone',
    severity: 'warning',
    description: 'passive institutional phrasing',
    test: (c) => match(c, /\b(the request has been (logged|noted|recorded|registered))\b/i),
    autoFixable: false,
  },
  {
    id: 'v-04',
    category: 'voice_tone',
    severity: 'warning',
    description: 'hiding behind policy',
    test: (c) => match(c, /\b(as per (our |the )?(policy|guidelines|terms|regulations))\b/i),
    autoFixable: false,
  },
  {
    id: 'v-05',
    category: 'voice_tone',
    severity: 'warning',
    description: 'corporate filler empathy',
    test: (c) => match(c, /\b(we value your|your .+ is important to us|thank you for your patience)\b/i),
    autoFixable: true,
    fix: (c, m) => c.replace(new RegExp(escapeRe(m), 'gi'), ''),
  },
  {
    id: 'v-06',
    category: 'voice_tone',
    severity: 'warning',
    description: 'title case in labels/headings (should be sentence case)',
    test: (c) => {
      const titleCasePattern = /^[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+/m;
      return titleCasePattern.test(c) ? c.match(titleCasePattern)?.[0] || null : null;
    },
    autoFixable: false,
  },

  // ── WORDING (KB/09) ───────────────────────────────────────────────────
  {
    id: 'w-01',
    category: 'wording',
    severity: 'warning',
    description: 'uses "utilize" instead of "use"',
    test: (c) => match(c, /\butiliz(e|ed|es|ing)\b/i),
    autoFixable: true,
    fix: (c) => c.replace(/\butilize\b/gi, 'use').replace(/\butilized\b/gi, 'used').replace(/\butilizes\b/gi, 'uses').replace(/\butilizing\b/gi, 'using'),
  },
  {
    id: 'w-02',
    category: 'wording',
    severity: 'warning',
    description: 'uses "leverage" instead of "use"',
    test: (c) => match(c, /\bleverag(e|ed|es|ing)\b/i),
    autoFixable: true,
    fix: (c) => c.replace(/\bleverage\b/gi, 'use').replace(/\bleveraged\b/gi, 'used').replace(/\bleverages\b/gi, 'uses').replace(/\bleveraging\b/gi, 'using'),
  },
  {
    id: 'w-03',
    category: 'wording',
    severity: 'warning',
    description: 'uses "in order to" instead of "to"',
    test: (c) => match(c, /\bin order to\b/i),
    autoFixable: true,
    fix: (c) => c.replace(/\bin order to\b/gi, 'to'),
  },
  {
    id: 'w-04',
    category: 'wording',
    severity: 'warning',
    description: 'uses American spelling instead of British',
    test: (c) => match(c, /\b(color|favorite|organize|realize|center|behavior|analyze|canceled|honor)\b/i),
    autoFixable: true,
    fix: (c) => c
      .replace(/\bcolor\b/gi, 'colour').replace(/\bcolors\b/gi, 'colours')
      .replace(/\bfavorite\b/gi, 'favourite').replace(/\bfavorites\b/gi, 'favourites')
      .replace(/\borganize\b/gi, 'organise').replace(/\borganized\b/gi, 'organised')
      .replace(/\brealize\b/gi, 'realise').replace(/\brealized\b/gi, 'realised')
      .replace(/\bcenter\b/gi, 'centre').replace(/\bcenters\b/gi, 'centres')
      .replace(/\bbehavior\b/gi, 'behaviour').replace(/\bbehaviors\b/gi, 'behaviours')
      .replace(/\banalyze\b/gi, 'analyse').replace(/\banalyzed\b/gi, 'analysed')
      .replace(/\bcanceled\b/gi, 'cancelled')
      .replace(/\bhonor\b/gi, 'honour'),
  },
  {
    id: 'w-05',
    category: 'wording',
    severity: 'warning',
    description: 'uses Rs./INR instead of ₹ symbol',
    test: (c) => match(c, /\b(Rs\.?|INR)\s*\d/i),
    autoFixable: true,
    fix: (c) => c.replace(/\bRs\.?\s*/g, '₹').replace(/\bINR\s*/g, '₹'),
  },
  {
    id: 'w-06',
    category: 'wording',
    severity: 'warning',
    description: 'Oxford comma detected',
    test: (c) => match(c, /,\s+and\s+/i),
    autoFixable: true,
    fix: (c) => c.replace(/,\s+and\s+/g, ' and '),
  },
  {
    id: 'w-07',
    category: 'wording',
    severity: 'warning',
    description: 'uses AM/PM uppercase instead of lowercase am/pm',
    test: (c) => match(c, /\d{1,2}:\d{2}\s*(AM|PM)/),
    autoFixable: true,
    fix: (c) => c.replace(/(\d{1,2}:\d{2})\s*(AM|PM)/g, (_, t, p) => `${t} ${p.toLowerCase()}`),
  },

  // ── STRUCTURE (KB/05, KB/11) ──────────────────────────────────────────
  {
    id: 's-01',
    category: 'structure',
    severity: 'warning',
    description: 'more than 7 numbered steps',
    test: (c) => {
      const steps = c.match(/(?:^|\n)\s*\d+[\.\)]/gm);
      return steps && steps.length > 7 ? `${steps.length} steps found` : null;
    },
    autoFixable: false,
  },
  {
    id: 's-02',
    category: 'structure',
    severity: 'warning',
    description: 'more than 3 questions in a single response',
    test: (c) => {
      const questions = c.match(/\?/g);
      return questions && questions.length > 3 ? `${questions.length} questions found` : null;
    },
    autoFixable: false,
  },
  {
    id: 's-03',
    category: 'structure',
    severity: 'warning',
    description: 'sentence exceeds 25 words (readability concern)',
    test: (c) => {
      const sentences = c.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const long = sentences.find(s => s.trim().split(/\s+/).length > 25);
      return long ? long.trim().slice(0, 60) + '...' : null;
    },
    autoFixable: false,
  },
  {
    id: 's-04',
    category: 'structure',
    severity: 'warning',
    description: 'missing next step at end of response',
    test: (c, ctx) => {
      if (ctx.channel === 'sms' || ctx.channel === 'push_notification') return null;
      const lastLine = c.trim().split('\n').pop()?.trim() || '';
      const hasNextStep = /\b(you can|try|tap|open|visit|reply|call|check|click|let me know|reach out|i'm here)\b/i.test(lastLine);
      const isClosing = /\b(take care|you're all set|with love|hope this helps)\b/i.test(lastLine);
      return (!hasNextStep && !isClosing) ? 'response may lack a clear next step' : null;
    },
    autoFixable: false,
  },
  {
    id: 's-05',
    category: 'structure',
    severity: 'warning',
    description: 'uses excessive bold/markdown formatting',
    test: (c) => {
      const boldCount = (c.match(/\*{2,}[^*]+\*{2,}/g) || []).length;
      return boldCount > 5 ? `${boldCount} bold sections` : null;
    },
    autoFixable: false,
  },
  {
    id: 's-06',
    category: 'structure',
    severity: 'warning',
    description: 'multiple exclamation marks',
    test: (c) => match(c, /[!]{2,}/),
    autoFixable: true,
    fix: (c) => c.replace(/!{2,}/g, '.'),
  },

  // ── BRAND (KB/07) ─────────────────────────────────────────────────────
  {
    id: 'b-01',
    category: 'brand',
    severity: 'warning',
    description: 'JioFiber written as "Jio Fiber"',
    test: (c) => match(c, /\bJio\s+Fiber\b/),
    autoFixable: true,
    fix: (c) => c.replace(/\bJio\s+Fiber\b/g, 'JioFiber'),
  },
  {
    id: 'b-02',
    category: 'brand',
    severity: 'warning',
    description: 'JioCinema written as "Jio Cinema"',
    test: (c) => match(c, /\bJio\s+Cinema\b/),
    autoFixable: true,
    fix: (c) => c.replace(/\bJio\s+Cinema\b/g, 'JioCinema'),
  },
  {
    id: 'b-03',
    category: 'brand',
    severity: 'warning',
    description: 'JioSaavn written as "Jio Saavn"',
    test: (c) => match(c, /\bJio\s+Saavn\b/),
    autoFixable: true,
    fix: (c) => c.replace(/\bJio\s+Saavn\b/g, 'JioSaavn'),
  },
  {
    id: 'b-04',
    category: 'brand',
    severity: 'warning',
    description: 'JioMart written as "Jio Mart"',
    test: (c) => match(c, /\bJio\s+Mart\b/),
    autoFixable: true,
    fix: (c) => c.replace(/\bJio\s+Mart\b/g, 'JioMart'),
  },
  {
    id: 'b-05',
    category: 'brand',
    severity: 'warning',
    description: '"jio" written in all lowercase or all uppercase',
    test: (c) => match(c, /\b(jio|JIO)\b/),
    autoFixable: true,
    fix: (c) => c.replace(/\bjio\b/g, 'Jio').replace(/\bJIO\b/g, 'Jio'),
  },

  // ── EMOTION (KB/03, KB/04) ────────────────────────────────────────────
  {
    id: 'e-01',
    category: 'emotion',
    severity: 'warning',
    description: 'negative emotion not acknowledged in first sentence',
    test: (c, ctx) => {
      if (!ctx.isComplaint && !['raudra', 'karuna', 'bhayanaka'].includes(ctx.emotion || '')) return null;
      const firstSentence = c.split(/[.!?]/)[0] || '';
      const hasAck = /\b(understand|sorry|hear you|see|frustrat|worr|concern|upset)\b/i.test(firstSentence);
      return hasAck ? null : 'first sentence lacks emotion acknowledgment';
    },
    autoFixable: false,
  },
  {
    id: 'e-02',
    category: 'emotion',
    severity: 'warning',
    description: 'empty empathy without follow-up action',
    test: (c) => match(c, /\bi (completely |totally )?understand your (frustration|concern)\.\s*$/im),
    autoFixable: false,
  },
  {
    id: 'e-03',
    category: 'emotion',
    severity: 'warning',
    description: 'generic hope-based closing',
    test: (c) => match(c, /\bi hope (this|that|i) (helps?|was helpful|resolved)/i),
    autoFixable: true,
    fix: (c, m) => c.replace(new RegExp(escapeRe(m), 'gi'), "i'm here if you need anything else"),
  },

  // ── CONTEXT-AWARE (Gaps #13, #15, #17) ────────────────────────────────
  {
    id: 'x-01',
    category: 'context_aware',
    severity: 'warning',
    description: 'references data without disclosing source (gap #13)',
    test: (c) => {
      const hasStats = /\b(\d+%|\d+ (million|crore|lakh|users|customers))\b/i.test(c);
      const hasSource = /\b(according to|source|as of|data from|based on)\b/i.test(c);
      return (hasStats && !hasSource) ? 'statistical claim without source disclosure' : null;
    },
    autoFixable: false,
  },
  {
    id: 'x-02',
    category: 'context_aware',
    severity: 'warning',
    description: 'readability may exceed Grade 8 ceiling (gap #15)',
    test: (c) => {
      const words = c.split(/\s+/);
      const longWords = words.filter(w => w.length > 10);
      const ratio = longWords.length / words.length;
      return ratio > 0.15 ? `${Math.round(ratio * 100)}% long words (target <15%)` : null;
    },
    autoFixable: false,
  },
  {
    id: 'x-03',
    category: 'context_aware',
    severity: 'warning',
    description: 'asks for personal data without stating reason (gap #17)',
    test: (c) => {
      const asksData = /\b(please (share|provide|send|give) (your|the) (phone|number|email|address|id|aadhaar|pan))\b/i.test(c);
      const statesReason = /\b(so (i|we) can|to help|to verify|for (security|verification|processing))\b/i.test(c);
      return (asksData && !statesReason) ? 'asks for personal data without stating purpose' : null;
    },
    autoFixable: false,
  },
  {
    id: 'x-04',
    category: 'context_aware',
    severity: 'error',
    description: 'over-promising resolution timeline (gap #16)',
    test: (c) => match(c, /\b(within\s+\d+\s+(minutes?|hours?)\s+(your|the)\s+\w+\s+(will be|should be)\s+(resolved|fixed))\b/i),
    autoFixable: false,
  },
  {
    id: 'x-05',
    category: 'context_aware',
    severity: 'warning',
    description: 'low-literacy content has sentences over 15 words',
    test: (c, ctx) => {
      if (ctx.literacy !== 'basic' && ctx.literacy !== 'low') return null;
      const sentences = c.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const long = sentences.find(s => s.trim().split(/\s+/).length > 15);
      return long ? 'sentence too long for low-literacy user' : null;
    },
    autoFixable: false,
  },
  {
    id: 'x-06',
    category: 'context_aware',
    severity: 'warning',
    description: 'promotional content during late night',
    test: (c, ctx) => {
      if (ctx.timing !== 'late_night') return null;
      return match(c, /\b(upgrade|offer|deal|discount|special|limited time|exclusive)\b/i);
    },
    autoFixable: false,
  },
  {
    id: 'x-07',
    category: 'context_aware',
    severity: 'warning',
    description: 'urgency pressure tactics',
    test: (c) => match(c, /\b(act now|hurry|limited time|don'?t miss|last chance|offer expires)\b/i),
    autoFixable: true,
    fix: (c, m) => c.replace(new RegExp(escapeRe(m), 'gi'), ''),
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFIER ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run all compliance checks on content and return a structured report.
 * Also applies all auto-fixable violations progressively and returns `fixedContent`.
 */
export function runComplianceVerifier(
  content: string,
  context: VerifierContext = {},
): ComplianceReport & { fixedContent: string } {
  const violations: ComplianceViolation[] = [];
  const categories: Record<ViolationCategory, { passed: number; failed: number }> = {
    constitutional: { passed: 0, failed: 0 },
    voice_tone: { passed: 0, failed: 0 },
    wording: { passed: 0, failed: 0 },
    structure: { passed: 0, failed: 0 },
    brand: { passed: 0, failed: 0 },
    emotion: { passed: 0, failed: 0 },
    context_aware: { passed: 0, failed: 0 },
  };

  // Collect violations and the check references for progressive fixing
  const fixableChecks: Array<{ id: string; check: Check }> = [];

  for (const check of CHECKS) {
    const result = check.test(content, context);
    if (result !== null) {
      categories[check.category].failed++;
      violations.push({
        id: check.id,
        category: check.category,
        severity: check.severity,
        description: check.description,
        match: result,
        autoFixable: check.autoFixable,
      });
      if (check.autoFixable && check.fix) {
        fixableChecks.push({ id: check.id, check });
      }
    } else {
      categories[check.category].passed++;
    }
  }

  // Apply auto-fixes PROGRESSIVELY (each fix runs on the result of the previous)
  let fixedContent = content;
  const appliedFixIds: string[] = [];
  for (const { id, check } of fixableChecks) {
    if (!check.fix) continue;
    const testResult = check.test(fixedContent, context);
    if (testResult !== null) {
      const before = fixedContent;
      fixedContent = check.fix(fixedContent, testResult);
      if (fixedContent !== before) {
        appliedFixIds.push(id);
      }
    }
  }

  // Update violation records with fix status
  for (const v of violations) {
    if (appliedFixIds.includes(v.id)) {
      v.fix = 'applied';
    }
  }

  const totalChecks = CHECKS.length;
  const passedChecks = totalChecks - violations.length;
  const score = Math.round((passedChecks / totalChecks) * 100);

  return {
    passed: violations.filter(v => v.severity === 'error').length === 0,
    score,
    totalChecks,
    passedChecks,
    violations,
    categories,
    fixedContent,
  };
}

/**
 * Get non-auto-fixable violations for retry feedback.
 * Returns short descriptions (max 3) for the retry prompt.
 */
export function getRetryFeedbackFromReport(report: ComplianceReport): string[] {
  return report.violations
    .filter(v => !v.autoFixable && v.severity === 'error')
    .slice(0, 3)
    .map(v => v.description);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function match(content: string, pattern: RegExp): string | null {
  const m = content.match(pattern);
  return m ? m[0] : null;
}

function escapeRe(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
