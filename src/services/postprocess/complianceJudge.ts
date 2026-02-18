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
  naturalness: boolean;
  simplicity: boolean;
  forwardMomentum: boolean;
  brandAlignment: boolean;
  emotionalCorrectness: boolean;
  serviceFirst: boolean;
  inclusivity: boolean;
}

// ── Judge Prompt ─────────────────────────────────────────────────────────

function buildJudgePrompt(content: string, userMessage: string): string {
  return `You are a quality reviewer for Jio's AI assistant responses. Review the response below and answer YES or NO for each check:

1. EMPATHY: If the user expressed negative emotion, does the response acknowledge their feeling in the FIRST sentence before offering solutions? (If no negative emotion, answer YES)
2. TURN DISCIPLINE: Does the response contain at most 1 question AND at most 1 call-to-action?
3. STRUCTURE: Does the response follow this order: acknowledge → empathize (if needed) → guide/explain → next step?
4. WARMTH: Does the response sound like a caring elder sibling — warm but genuine, not robotic or overly formal?
5. RESPONSIBILITY: When mentioning errors or issues, does the response use "we" language (taking responsibility) rather than blaming the user or "the system"?
6. NATURALNESS: Does it read like a real person wrote it, not a template engine? No "dear valued customer", no "we regret to inform you", no corporate filler.
7. SIMPLICITY: Is the language simple enough for a Grade 8 student? No jargon, no complex sentence structures, short sentences preferred.
8. FORWARD MOMENTUM: Does the response move the conversation forward with a clear, actionable next step (not just information)?
9. BRAND ALIGNMENT: Does it feel like Jio -- Indian, inclusive, warm, tech-forward -- not like a generic Western chatbot?
10. EMOTIONAL CORRECTNESS: Is the emotional tone proportional to the user's state? (No excessive enthusiasm for complaints, no cold efficiency for anxious users)
11. SERVICE FIRST: Is the response focused on helping the user, not selling or promoting? (Suggestions OK, but help comes first)
12. INCLUSIVITY: Is the language gender-neutral, accessible, and free from assumptions about the user's background?

Format your answer EXACTLY like this (no extra text):
1. YES/NO
2. YES/NO
3. YES/NO
4. YES/NO
5. YES/NO
6. YES/NO
7. YES/NO
8. YES/NO
9. YES/NO
10. YES/NO
11. YES/NO
12. YES/NO

If ANY answer is NO, add a section starting with "REWRITE:" and provide the corrected response fixing ONLY the failed checks. Keep everything else identical. If all YES, just output the 12 answers.

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
    naturalness: true,
    simplicity: true,
    forwardMomentum: true,
    brandAlignment: true,
    emotionalCorrectness: true,
    serviceFirst: true,
    inclusivity: true,
  };

  const checkKeys: (keyof JudgeCheckResult)[] = [
    'empathy', 'turnDiscipline', 'structure', 'warmth', 'responsibility',
    'naturalness', 'simplicity', 'forwardMomentum', 'brandAlignment',
    'emotionalCorrectness', 'serviceFirst', 'inclusivity',
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
    const checkNameMap: Record<keyof JudgeCheckResult, string> = {
      empathy: 'empathy',
      turnDiscipline: 'turn_discipline',
      structure: 'structure',
      warmth: 'warmth',
      responsibility: 'responsibility',
      naturalness: 'naturalness',
      simplicity: 'simplicity',
      forwardMomentum: 'forward_momentum',
      brandAlignment: 'brand_alignment',
      emotionalCorrectness: 'emotional_correctness',
      serviceFirst: 'service_first',
      inclusivity: 'inclusivity',
    };
    for (const [key, label] of Object.entries(checkNameMap)) {
      if (!parsed.checks[key as keyof JudgeCheckResult]) {
        failedChecks.push(label);
      }
    }

    const allPassed = failedChecks.length === 0;

    // Use rewrite if available and checks failed, otherwise keep original
    const finalContent = (!allPassed && parsed.rewrite) ? parsed.rewrite : content;

    if (!allPassed) {
      console.log(`[ComplianceJudge] Failed checks: ${failedChecks.join(', ')}. ${parsed.rewrite ? 'Rewrite applied.' : 'No rewrite provided.'}`);
    } else {
      console.log('[ComplianceJudge] All 12 checks passed.');
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
