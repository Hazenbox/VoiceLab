/**
 * Generation Pipeline -- Thin Orchestrator
 *
 * Single entry point: pipeline.run(input) -> PipelineResult
 * App.tsx calls this one function. Nothing else.
 *
 * Pipeline flow:
 *   classify -> safetyCheck -> retrieve -> assemble -> generate -> validate -> complianceJudge -> finalize
 *
 * Rules:
 * - Orchestrator only -- delegates to step modules
 * - Regeneration hard-limited to 1 retry (retryCount < 1), enforced here
 * - Tokens immutable per run
 * - Safety fail = hard stop (no regeneration)
 * - Validation fail = soft stop (one retry allowed)
 */

import type { PipelineInput, PipelineResult, PipelineMetadata, ClassifyResult, RetrieveResult, ValidateResult } from './types';
import type { GenerationEvidence } from '../../types';
import { createPipelineTimer, logPipelineRun } from './observability';
import { classify } from './steps/classify';
import { safetyCheck } from './steps/safetyCheck';
import { retrieve } from './steps/retrieve';
import { assemble } from './steps/assemble';
import { generate } from './steps/generate';
import { validate } from './steps/validate';
import { finalize } from './steps/finalize';
import { runComplianceJudge } from '../postprocess/complianceJudge';
import { runComplianceVerifier, type ComplianceReport } from '../postprocess/complianceVerifier';

const MAX_RETRIES = 1;

/**
 * KB-compliant fallback response when LLM fails entirely.
 * Uses Jio's voice (warm, helpful, transparent) per KB constitution.
 */
const LLM_FAILURE_FALLBACK = "I'm having a bit of trouble right now, but I'm here for you. Could you try again in a moment? If this keeps happening, our team is always available to help at jio.com/support.";

export async function run(input: PipelineInput): Promise<PipelineResult> {
  const timer = createPipelineTimer();
  const startedAt = Date.now();
  let retryCount = 0;

  try {
    // 1. Classify intent
    const classification = classify(input);

    // 2. Safety check (hard stop)
    const safety = safetyCheck(input);
    if (!safety.passed) {
      const metadata = buildMetadata(input, timer.stop(), startedAt, 'unknown', 0, classification);
      const result: PipelineResult = {
        success: true,
        output: safety.emergencyResponse || "I'm sorry, but I'm not able to help with that request.",
        pipelinePath: safety.emergencyResponse ? 'emergency_response' : 'safety_blocked',
        validation: null,
        trustScore: null,
        evidence: null,
        autoFixPreview: null,
        validationSummary: null,
        generationContext: null,
        retryCount: 0,
        metadata,
        safetyResult: safety.result,
        intent: classification.intent,
      };
      logPipelineRun(input, result);
      return result;
    }

    // Check if this is general chat (skip heavy processing)
    const isGeneralChat = classification.intent === 'general_chat';

    // 3. Retrieve knowledge context (skip for general_chat - no brand rules needed)
    const retrieval = isGeneralChat
      ? { knowledge: null, retrievalCount: 0 }
      : await retrieve(input);

    // 4. Assemble prompt (tokens resolved here, immutable after this point)
    const assembled = assemble(input, classification, retrieval.knowledge);

    // 5. Generate content (supports streaming via callbacks)
    let generated = await generate(input, assembled.systemPrompt, classification);

    // 6-10: For general_chat, skip validation/trust/auto-fix/compliance.
    //        These are content-trust features for branded content only.
    if (isGeneralChat) {
      const finalized = finalize(generated.content, input, classification, assembled);
      const metadata = buildMetadata(
        input,
        timer.stop(),
        startedAt,
        generated.model,
        retrieval.retrievalCount,
        classification,
        generated.usage,
      );

      const result: PipelineResult = {
        success: true,
        output: finalized.content,
        pipelinePath: 'general_chat',
        validation: null,
        trustScore: null,
        evidence: null,
        autoFixPreview: null,
        validationSummary: null,
        generationContext: null,
        retryCount: 0,
        metadata,
        safetyResult: safety.result,
        intent: 'general_chat',
      };

      logPipelineRun(input, result);
      return result;
    }

    // 6. Validate (content_generation and jio_inquiry only)
    let validation = await validate(input, generated.content, assembled);

    // 7. Smart retry with failure feedback (max 1 retry)
    if (!validation.passed && retryCount < MAX_RETRIES) {
      retryCount++;
      const retryFeedback = buildRetryFeedback(validation);
      const retryPrompt = retryFeedback
        ? `${assembled.systemPrompt}\n\n---\n\n${retryFeedback}`
        : assembled.systemPrompt;
      console.log(`[Pipeline] Validation failed, retrying with feedback (${retryCount}/${MAX_RETRIES})`);
      generated = await generate(input, retryPrompt, classification);
      validation = await validate(input, generated.content, assembled);
    }

    // 8. LLM-as-judge compliance check (only for content_generation intent)
    let judgedContent = validation.content;
    if (classification.intent === 'content_generation' && validation.passed) {
      try {
        const judgeResult = await runComplianceJudge(
          validation.content,
          input.message,
          input.llmProvider,
          input.createLLMProvider,
          input.abortSignal,
        );
        judgedContent = judgeResult.content;
        if (judgeResult.wasRewritten) {
          console.log(`[Pipeline] Compliance judge rewrote content (failed: ${judgeResult.failedChecks.join(', ')})`);
        }
      } catch (judgeError) {
        console.warn('[Pipeline] Compliance judge failed, using original:', judgeError);
      }
    }

    // 9. Post-generation compliance verifier (AD-2: user never sees errors)
    let verifiedContent = judgedContent;
    let complianceReport: ComplianceReport | null = null;
    const complianceFixesApplied: string[] = [];

    try {
      complianceReport = runComplianceVerifier(judgedContent, {
        emotion: assembled.constitutionalContext?.tokens?.userEmotion,
        channel: input.contentChannel,
        ecosystem: input.ecosystem,
        literacy: assembled.constitutionalContext?.tokens?.literacy,
        timing: assembled.constitutionalContext?.tokens?.timing?.period,
        isComplaint: !!assembled.constitutionalContext?.stateContext?.requestsEscalation,
      });

      if (complianceReport.violations.length > 0) {
        // Step 1: Apply all auto-fixable violations
        for (const v of complianceReport.violations) {
          if (v.autoFixable && v.fix) {
            const before = verifiedContent;
            verifiedContent = v.fix;
            if (verifiedContent !== before) {
              complianceFixesApplied.push(v.id);
            }
          }
        }

        // Step 2: If non-fixable errors remain and we haven't retried yet, retry
        const nonFixableErrors = complianceReport.violations
          .filter(v => !v.autoFixable && v.severity === 'error');
        if (nonFixableErrors.length > 0 && retryCount < MAX_RETRIES) {
          retryCount++;
          const feedback = nonFixableErrors.slice(0, 3)
            .map(v => `- ${v.description}`)
            .join('\n');
          const retryPrompt = `${assembled.systemPrompt}\n\n---\n\n## previous attempt feedback\nfix these issues:\n${feedback}`;
          console.log(`[Pipeline] Compliance verifier triggered retry (${retryCount}/${MAX_RETRIES})`);
          generated = await generate(input, retryPrompt, classification);
          verifiedContent = generated.content;
          // Re-run verifier on retried content
          complianceReport = runComplianceVerifier(verifiedContent, {
            emotion: assembled.constitutionalContext?.tokens?.userEmotion,
            channel: input.contentChannel,
            ecosystem: input.ecosystem,
          });
          // Apply auto-fixes on retried content too
          for (const v of complianceReport.violations) {
            if (v.autoFixable && v.fix) {
              verifiedContent = v.fix;
              complianceFixesApplied.push(v.id);
            }
          }
        }

        if (complianceFixesApplied.length > 0) {
          console.log(`[Pipeline] Compliance verifier auto-fixed: ${complianceFixesApplied.join(', ')}`);
        }
      }
    } catch (verifierError) {
      console.warn('[Pipeline] Compliance verifier failed, using judged content:', verifierError);
    }

    // 10. Finalize (finishing layer + privacy masking)
    const finalized = finalize(verifiedContent, input, classification, assembled);

    // 11. Build evidence for transparency panel
    const evidence = buildEvidence(retrieval, validation, input);

    const metadata = buildMetadata(
      input,
      timer.stop(),
      startedAt,
      generated.model,
      retrieval.retrievalCount,
      classification,
      generated.usage,
    );

    const result: PipelineResult = {
      success: true,
      output: finalized.content,
      pipelinePath: classification.intent,
      validation: validation.validation,
      trustScore: validation.trustScore,
      evidence,
      autoFixPreview: validation.autoFixPreview,
      validationSummary: validation.validationSummary,
      generationContext: assembled.generationContext,
      retryCount,
      metadata,
      safetyResult: safety.result,
      intent: classification.intent,
      complianceReport,
      complianceFixesApplied,
    };

    logPipelineRun(input, result);
    return result;

  } catch (error) {
    const metadata = buildMetadata(input, timer.stop(), startedAt, 'error', 0);
    const result: PipelineResult = {
      success: false,
      output: LLM_FAILURE_FALLBACK,
      pipelinePath: 'content_generation',
      validation: null,
      trustScore: null,
      evidence: null,
      autoFixPreview: null,
      validationSummary: null,
      generationContext: null,
      retryCount,
      metadata,
      safetyResult: null,
      intent: null,
      error: error instanceof Error ? error.message : String(error),
    };

    logPipelineRun(input, result);
    return result;
  }
}

/**
 * Build a short feedback section for retry (max 3 bullets, ~100 tokens).
 * Tells the LLM what went wrong so it can self-correct.
 */
function buildRetryFeedback(validation: ValidateResult): string | null {
  if (!validation.validation) return null;

  const issues: string[] = [];

  // Extract top violations (max 3, most severe first)
  const allViolations = (validation.validation.agentResults || [])
    .flatMap((r: { violations: Array<{ severity: string; rule?: string; text?: string }> }) => r.violations)
    .filter((v: { severity: string }) => v.severity === 'error' || v.severity === 'critical')
    .slice(0, 3);

  for (const v of allViolations) {
    const text = (v as { rule?: string; text?: string }).rule || (v as { text?: string }).text || 'compliance issue';
    issues.push(`- ${text}`);
  }

  // Check if trust score was low
  if (validation.trustScore && validation.trustScore.overall < 70) {
    issues.push(`- overall quality score was ${validation.trustScore.overall}/100`);
  }

  if (issues.length === 0) return null;

  return `## previous attempt feedback\nyour previous response had these issues. fix them this time:\n${issues.slice(0, 3).join('\n')}`;
}

function buildMetadata(
  input: PipelineInput,
  latencyMs: number,
  startedAt: number,
  model: string,
  retrievalCount: number,
  classification?: ClassifyResult,
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number },
): PipelineMetadata {
  return {
    model,
    latencyMs,
    retrievalCount,
    tokensUsed: {
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      totalTokens: usage?.totalTokens,
    },
    effectiveEcosystem: (classification?.detectedEcosystem || input.ecosystem) as PipelineMetadata['effectiveEcosystem'],
    effectiveChannel: (classification?.detectedChannel || input.contentChannel) as PipelineMetadata['effectiveChannel'],
    startedAt,
    completedAt: Date.now(),
  };
}

/**
 * Build evidence object for transparency panel
 * Assembles data from retrieval and validation steps
 */
function buildEvidence(
  retrieval: RetrieveResult,
  validation: ValidateResult,
  input: PipelineInput,
): GenerationEvidence | null {
  // Only build evidence if we have meaningful data
  const hasKnowledge = retrieval.evidenceMetadata && (
    retrieval.evidenceMetadata.avoidWordsCount > 0 ||
    retrieval.evidenceMetadata.preferredWordsCount > 0 ||
    retrieval.evidenceMetadata.autoFixRulesCount > 0
  );
  const hasAutoFixes = validation.autoFixEvidence && validation.autoFixEvidence.totalCount > 0;
  const hasLearnings = input.externalData?.userLearningProfile && (
    (input.externalData.userLearningProfile.correctionCount ?? 0) > 0 ||
    (input.externalData.userLearningProfile.avoidPatterns?.length ?? 0) > 0
  );

  // Return null if no evidence to show
  if (!hasKnowledge && !hasAutoFixes && !hasLearnings) {
    return null;
  }

  return {
    knowledgeUsed: {
      avoidWordsMatched: [], // Would need to track during validation which words matched
      preferredWordsUsed: [], // Would need to track during generation
      autoFixRulesCount: retrieval.evidenceMetadata?.autoFixRulesCount ?? 0,
      source: retrieval.evidenceMetadata?.source ?? 'code_defaults',
    },
    learningsApplied: {
      correctionsCount: input.externalData?.userLearningProfile?.correctionCount ?? 0,
      avoidPatterns: input.externalData?.userLearningProfile?.avoidPatterns ?? [],
      stylePreferences: input.externalData?.userLearningProfile?.traitPreferences ?? [],
    },
    autoFixes: validation.autoFixEvidence ?? {
      applied: [],
      totalCount: 0,
    },
  };
}
