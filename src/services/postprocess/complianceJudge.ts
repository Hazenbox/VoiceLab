/**
 * LLM-as-Judge Compliance Check
 *
 * After the primary LLM generates content and it passes hard stops,
 * this module sends the output to a second, fast LLM call with 5
 * targeted yes/no compliance checks.
 *
 * If any check fails, the judge rewrites the response fixing ONLY
 * the failed checks. If all pass, the original content is returned.
 *
 * Catches subjective rules that regex can't:
 * - False empathy detection
 * - Turn discipline (max 1 question + 1 CTA)
 * - Structure sequencing (acknowledge -> empathize -> guide -> next step)
 * - Warmth calibration
 * - Responsibility language ("we" not "the system")
 *
 * Design rules:
 * - Only runs for content_generation intent
 * - Uses cheapest/fastest available model
 * - If judge call fails, silently passes through original content
 * - Tracked for monitoring: if judge rewrites >30%, prompt needs improvement
 */

import { getOrchestratorInstance } from '../llm/orchestrator';
import { createLLMProvider as defaultCreateLLMProvider } from '../providers/llm';

// ── Types ────────────────────────────────────────────────────────────────

export interface JudgeResult {
  content: string;
  wasRewritten: boolean;
  failedChecks: string[];
  allPassed: boolean;
  error: string | null;
}

interface JudgeCheckResult {
  empathy: boolean;
  turnDiscipline: boolean;
  structure: boolean;
  warmth: boolean;
  responsibility: boolean;
}

// ── Judge Prompt ─────────────────────────────────────────────────────────

function buildJudgePrompt(content: string, userMessage: string): string {
  return `You are a quality reviewer for Jio's AI assistant responses. Review the response below and answer YES or NO for each check:

1. EMPATHY: If the user expressed negative emotion, does the response acknowledge their feeling in the FIRST sentence before offering solutions? (If no negative emotion, answer YES)
2. TURN DISCIPLINE: Does the response contain at most 1 question AND at most 1 call-to-action?
3. STRUCTURE: Does the response follow this order: acknowledge → empathize (if needed) → guide/explain → next step?
4. WARMTH: Does the response sound like a caring elder sibling — warm but genuine, not robotic or overly formal?
5. RESPONSIBILITY: When mentioning errors or issues, does the response use "we" language (taking responsibility) rather than blaming the user or "the system"?

Format your answer EXACTLY like this (no extra text):
1. YES/NO
2. YES/NO
3. YES/NO
4. YES/NO
5. YES/NO

If ANY answer is NO, add a section starting with "REWRITE:" and provide the corrected response fixing ONLY the failed checks. Keep everything else identical. If all YES, just output the 5 answers.

User message: "${userMessage}"

Response to review:
${content}`;
}

// ── Response Parser ──────────────────────────────────────────────────────

function parseJudgeResponse(response: string): { checks: JudgeCheckResult; rewrite: string | null } {
  const lines = response.trim().split('\n');
  const checks: JudgeCheckResult = {
    empathy: true,
    turnDiscipline: true,
    structure: true,
    warmth: true,
    responsibility: true,
  };

  const checkKeys: (keyof JudgeCheckResult)[] = [
    'empathy', 'turnDiscipline', 'structure', 'warmth', 'responsibility',
  ];

  let lineIdx = 0;
  for (const key of checkKeys) {
    // Find the next line with a YES or NO
    while (lineIdx < lines.length) {
      const line = lines[lineIdx].trim();
      lineIdx++;

      if (/^\d+\.\s*(YES|NO)/i.test(line)) {
        checks[key] = /YES/i.test(line);
        break;
      }
    }
  }

  // Look for rewrite section
  let rewrite: string | null = null;
  const rewriteIdx = response.indexOf('REWRITE:');
  if (rewriteIdx !== -1) {
    rewrite = response.substring(rewriteIdx + 'REWRITE:'.length).trim();
    // Clean up any trailing whitespace or formatting
    if (rewrite.length === 0) rewrite = null;
  }

  return { checks, rewrite };
}

// ── Main Judge ───────────────────────────────────────────────────────────

export async function runComplianceJudge(
  content: string,
  userMessage: string,
  llmProvider: string,
  createProvider?: typeof defaultCreateLLMProvider,
  abortSignal?: AbortSignal,
): Promise<JudgeResult> {
  try {
    const orchestrator = getOrchestratorInstance();
    const providerFactory = createProvider || defaultCreateLLMProvider;

    const judgePrompt = buildJudgePrompt(content, userMessage);

    const result = await orchestrator.generate(
      llmProvider,
      {
        messages: [
          { role: 'system', content: 'You are a precise quality reviewer. Follow the format exactly.' },
          { role: 'user', content: judgePrompt },
        ],
        maxTokens: 1024,
        temperature: 0.1, // low temperature for deterministic judging
        stream: false,
        signal: abortSignal,
      },
      providerFactory,
      ['intent:compliance_judge'],
    );

    const parsed = parseJudgeResponse(result.content);

    const failedChecks: string[] = [];
    if (!parsed.checks.empathy) failedChecks.push('empathy');
    if (!parsed.checks.turnDiscipline) failedChecks.push('turn_discipline');
    if (!parsed.checks.structure) failedChecks.push('structure');
    if (!parsed.checks.warmth) failedChecks.push('warmth');
    if (!parsed.checks.responsibility) failedChecks.push('responsibility');

    const allPassed = failedChecks.length === 0;

    // Use rewrite if available and checks failed, otherwise keep original
    const finalContent = (!allPassed && parsed.rewrite) ? parsed.rewrite : content;

    if (!allPassed) {
      console.log(`[ComplianceJudge] Failed checks: ${failedChecks.join(', ')}. ${parsed.rewrite ? 'Rewrite applied.' : 'No rewrite provided.'}`);
    } else {
      console.log('[ComplianceJudge] All 5 checks passed.');
    }

    return {
      content: finalContent,
      wasRewritten: !allPassed && !!parsed.rewrite,
      failedChecks,
      allPassed,
      error: null,
    };
  } catch (error) {
    // Judge failure is NOT a gate -- silently pass through original content
    console.warn('[ComplianceJudge] Judge call failed, passing through original:', error);
    return {
      content,
      wasRewritten: false,
      failedChecks: [],
      allPassed: true, // treat as passed on error
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
