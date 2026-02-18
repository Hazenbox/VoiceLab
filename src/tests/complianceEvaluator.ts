/**
 * Compliance Evaluator
 *
 * Scoring engine that evaluates pipeline output against test expectations.
 * Two modes: "generation" (runs full pipeline) and "checker" (runs deterministic
 * post-processors directly on pre-built test content).
 */

import type { ComplianceTestCase, TestStatus, TestContext } from './complianceTestCases';
import type { PipelineInput, PipelineResult, PipelineFeatureFlags } from '../services/pipeline/types';
import type { EcosystemType, ContentChannelType } from '../types';
import { run as runPipeline } from '../services/pipeline/generationPipeline';
import { normalizeEntities } from '../services/postprocess/entityNormalizer';
import { detectAndMaskPII } from '../services/postprocess/piiDetector';
import { checkForbiddenPhrases } from '../services/validation/agents/forbiddenPhraseChecker';
import { runComplianceVerifier } from '../services/postprocess/complianceVerifier';
import { generateAutoFixes, applyAutoFixes, applyFormatFixes, applyDirectReplacements } from '../services/trust/autoFixEngine';
import { runQuickValidation } from '../services/validation/validationPipeline';
// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TestResult {
  testId: string;
  section: string;
  group: string;
  description: string;
  status: TestStatus;
  /** What the pipeline/checker produced */
  actualOutput: string;
  /** Pattern match results */
  passedPatterns: string[];
  failedPatterns: string[];
  /** Patterns that should NOT appear but did */
  failPatternMatches: string[];
  /** Score: 0-1 */
  score: number;
  /** Duration in ms */
  durationMs: number;
  /** Extra diagnostics */
  notes: string[];
  /** Compliance data (if generation mode) */
  complianceReport?: PipelineResult['complianceReport'];
  /** Pipeline path taken */
  pipelinePath?: string;
  /** Raw error if any */
  error?: string;
}

export interface GroupResult {
  groupId: string;
  groupName: string;
  tests: TestResult[];
  passCount: number;
  failCount: number;
  warnCount: number;
  errorCount: number;
  score: number;
}

export interface FullReport {
  totalTests: number;
  passCount: number;
  failCount: number;
  warnCount: number;
  errorCount: number;
  overallScore: number;
  groups: GroupResult[];
  timestamp: string;
  durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT PIPELINE INPUT FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_FLAGS: PipelineFeatureFlags = {
  conversationalMode: true,
  safetyGate: true,
  constitutionalWrapper: true,
  knowledgeBase: false,
  learning: false,
  persona: true,
  ragQueryExpansion: false,
  ragResultRanking: false,
  conversationState: true,
  validateConversational: true,
  sessionAnalytics: false,
  responseTimeTracking: false,
};

function buildPipelineInput(test: ComplianceTestCase, createLLMProvider: PipelineInput['createLLMProvider']): PipelineInput {
  const ctx = test.context;
  return {
    message: test.prompt,
    ecosystem: (ctx.ecosystem ?? 'connectivity') as EcosystemType,
    contentChannel: (ctx.channel ?? 'customer_care_chat') as ContentChannelType,
    trustSettings: {
      minimumScore: 90,
      blockBelowThreshold: false,
      autoFixMinorIssues: true,
      validationStrictness: 'standard' as const,
      showDetailedBreakdown: true,
    },
    temperature: 0.3,
    maxTokens: 5000,
    stream: false,
    llmProvider: 'openai',
    conversationHistory: [],
    featureFlags: DEFAULT_FLAGS,
    createLLMProvider,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKER MODE: RUN DETERMINISTIC TOOLS ON testContent
// ═══════════════════════════════════════════════════════════════════════════════

function runCheckerMode(test: ComplianceTestCase): string {
  const raw = test.testContent ?? '';
  if (!raw) return '';

  let content = raw;

  // 1. Entity normalizer (brand names, deprecated plans, currency symbols)
  const entityResult = normalizeEntities(content);
  content = entityResult.content;

  // 2. PII detector (mask Aadhaar, PAN, phone, email, etc.)
  const piiResult = detectAndMaskPII(content);
  content = piiResult.content;

  // 3. Format fixes (Indian number format, AM/PM lowercase, Oxford comma, title case, 24hr time)
  content = applyFormatFixes(content);

  // 3.5. Direct replacement scan (bypasses validation agents, catches all REPLACEMENTS keys)
  content = applyDirectReplacements(content);

  // 4. Auto-fix engine (vocabulary replacements: jargon, gender, accessibility, tone)
  const validation = runQuickValidation(content);
  const allViolations = validation.agentResults.flatMap(r => r.violations);
  if (allViolations.length > 0) {
    const fixes = generateAutoFixes(allViolations);
    if (fixes.length > 0) {
      const fixResult = applyAutoFixes(content, fixes);
      content = fixResult.fixedContent;
    }
  }

  // 5. Forbidden phrase checker (clean forbidden phrases via replacement)
  const fpResult = checkForbiddenPhrases(content);
  if (fpResult.cleanedResponse !== undefined) {
    content = fpResult.cleanedResponse;
  }

  // 6. Compliance verifier (final deterministic checks with progressive auto-fixes)
  const cvResult = runComplianceVerifier(content, {
    emotion: test.context.emotion,
    isComplaint: test.context.isComplaint,
    channel: test.context.channel as string | undefined,
    literacy: test.context.literacy,
    timing: test.context.timing,
  });
  content = cvResult.fixedContent;

  return content;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN MATCHING
// ═══════════════════════════════════════════════════════════════════════════════

function matchesAny(output: string, patterns: string[], caseSensitive = false): { matched: string[]; unmatched: string[] } {
  const matched: string[] = [];
  const unmatched: string[] = [];
  for (const p of patterns) {
    try {
      const re = caseSensitive ? new RegExp(p) : new RegExp(p, 'i');
      const target = caseSensitive ? output : output.toLowerCase();
      if (re.test(target)) matched.push(p);
      else unmatched.push(p);
    } catch {
      if (caseSensitive) {
        if (output.includes(p)) matched.push(p);
        else unmatched.push(p);
      } else {
        if (output.toLowerCase().includes(p.toLowerCase())) matched.push(p);
        else unmatched.push(p);
      }
    }
  }
  return { matched, unmatched };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE A SINGLE TEST
// ═══════════════════════════════════════════════════════════════════════════════

function scoreTest(output: string, test: ComplianceTestCase): { status: TestStatus; score: number; passedPatterns: string[]; failedPatterns: string[]; failPatternMatches: string[]; notes: string[] } {
  const notes: string[] = [];

  if (!output || output.trim().length === 0) {
    return { status: 'fail', score: 0, passedPatterns: [], failedPatterns: test.expectedPassPatterns, failPatternMatches: [], notes: ['empty output'] };
  }

  const cs = !!(test as any).caseSensitive;
  const passCheck = matchesAny(output, test.expectedPassPatterns, cs);
  const failCheck = matchesAny(output, test.expectedFailPatterns, cs);

  const passScore = test.expectedPassPatterns.length > 0
    ? passCheck.matched.length / test.expectedPassPatterns.length
    : 1;

  const failScore = test.expectedFailPatterns.length > 0
    ? 1 - (failCheck.matched.length / test.expectedFailPatterns.length)
    : 1;

  const combined = (passScore * 0.5 + failScore * 0.5);

  if (failCheck.matched.length > 0) {
    notes.push(`FAIL patterns found: ${failCheck.matched.join(', ')}`);
  }
  if (passCheck.unmatched.length > 0) {
    notes.push(`missing PASS patterns: ${passCheck.unmatched.join(', ')}`);
  }

  let status: TestStatus;
  if (failCheck.matched.length > 0) {
    status = 'fail';
  } else if (passCheck.unmatched.length > 0 && passScore < 0.5) {
    status = 'fail';
  } else if (passCheck.unmatched.length > 0) {
    status = 'warn';
  } else {
    status = 'pass';
  }

  return {
    status,
    score: Math.round(combined * 100) / 100,
    passedPatterns: passCheck.matched,
    failedPatterns: passCheck.unmatched,
    failPatternMatches: failCheck.matched,
    notes,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN A SINGLE TEST
// ═══════════════════════════════════════════════════════════════════════════════

export async function evaluateTest(
  test: ComplianceTestCase,
  createLLMProvider?: PipelineInput['createLLMProvider'],
): Promise<TestResult> {
  const start = Date.now();

  try {
    let output: string;
    let pipelinePath: string | undefined;
    let complianceReport: PipelineResult['complianceReport'];

    if (test.mode === 'checker') {
      output = runCheckerMode(test);
    } else {
      if (!createLLMProvider) {
        return {
          testId: test.id, section: test.section, group: test.group,
          description: test.description, status: 'error',
          actualOutput: '', passedPatterns: [], failedPatterns: [], failPatternMatches: [],
          score: 0, durationMs: Date.now() - start,
          notes: ['generation mode requires createLLMProvider'],
        };
      }
      const input = buildPipelineInput(test, createLLMProvider);
      const result = await runPipeline(input);
      output = result.output ?? '';
      pipelinePath = result.pipelinePath;
      complianceReport = result.complianceReport;
    }

    const scored = scoreTest(output, test);

    return {
      testId: test.id,
      section: test.section,
      group: test.group,
      description: test.description,
      status: scored.status,
      actualOutput: output,
      passedPatterns: scored.passedPatterns,
      failedPatterns: scored.failedPatterns,
      failPatternMatches: scored.failPatternMatches,
      score: scored.score,
      durationMs: Date.now() - start,
      notes: scored.notes,
      complianceReport,
      pipelinePath,
    };
  } catch (err) {
    return {
      testId: test.id, section: test.section, group: test.group,
      description: test.description, status: 'error',
      actualOutput: '', passedPatterns: [], failedPatterns: [], failPatternMatches: [],
      score: 0, durationMs: Date.now() - start,
      notes: [`error: ${err instanceof Error ? err.message : String(err)}`],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN A GROUP
// ═══════════════════════════════════════════════════════════════════════════════

export async function evaluateGroup(
  groupId: string,
  groupName: string,
  tests: ComplianceTestCase[],
  createLLMProvider?: PipelineInput['createLLMProvider'],
  onTestComplete?: (result: TestResult, index: number, total: number) => void,
): Promise<GroupResult> {
  const results: TestResult[] = [];

  for (let i = 0; i < tests.length; i++) {
    const result = await evaluateTest(tests[i], createLLMProvider);
    results.push(result);
    onTestComplete?.(result, i, tests.length);
  }

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warnCount = results.filter(r => r.status === 'warn').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const avgScore = results.length > 0
    ? results.reduce((s, r) => s + r.score, 0) / results.length
    : 0;

  return {
    groupId,
    groupName,
    tests: results,
    passCount,
    failCount,
    warnCount,
    errorCount,
    score: Math.round(avgScore * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ALL GROUPS
// ═══════════════════════════════════════════════════════════════════════════════

export async function evaluateAll(
  groups: Array<{ id: string; name: string; tests: ComplianceTestCase[] }>,
  createLLMProvider?: PipelineInput['createLLMProvider'],
  onGroupComplete?: (group: GroupResult, index: number, total: number) => void,
  onTestComplete?: (result: TestResult, groupIndex: number, testIndex: number) => void,
): Promise<FullReport> {
  const start = Date.now();
  const groupResults: GroupResult[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    const groupResult = await evaluateGroup(
      g.id, g.name, g.tests, createLLMProvider,
      (result, ti) => onTestComplete?.(result, gi, ti),
    );
    groupResults.push(groupResult);
    onGroupComplete?.(groupResult, gi, groups.length);
  }

  const totals = groupResults.reduce(
    (acc, g) => ({
      pass: acc.pass + g.passCount,
      fail: acc.fail + g.failCount,
      warn: acc.warn + g.warnCount,
      error: acc.error + g.errorCount,
    }),
    { pass: 0, fail: 0, warn: 0, error: 0 },
  );

  const totalTests = groupResults.reduce((s, g) => s + g.tests.length, 0);
  const overallScore = totalTests > 0
    ? groupResults.reduce((s, g) => s + g.tests.reduce((ts, t) => ts + t.score, 0), 0) / totalTests
    : 0;

  return {
    totalTests,
    passCount: totals.pass,
    failCount: totals.fail,
    warnCount: totals.warn,
    errorCount: totals.error,
    overallScore: Math.round(overallScore * 100) / 100,
    groups: groupResults,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
  };
}
