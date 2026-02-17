/**
 * Generation Pipeline -- Thin Orchestrator
 *
 * Single entry point: pipeline.run(input) -> PipelineResult
 * App.tsx calls this one function. Nothing else.
 *
 * Pipeline flow:
 *   classify -> safetyCheck -> retrieve -> assemble -> generate -> validate -> finalize
 *
 * Rules:
 * - Orchestrator only -- delegates to step modules
 * - Regeneration hard-limited to 1 retry (retryCount < 1), enforced here
 * - Tokens immutable per run
 * - Safety fail = hard stop (no regeneration)
 * - Validation fail = soft stop (one retry allowed)
 */

import type { PipelineInput, PipelineResult, PipelineMetadata, ClassifyResult } from './types';
import { createPipelineTimer, logPipelineRun } from './observability';
import { classify } from './steps/classify';
import { safetyCheck } from './steps/safetyCheck';
import { retrieve } from './steps/retrieve';
import { assemble } from './steps/assemble';
import { generate } from './steps/generate';
import { validate } from './steps/validate';
import { finalize } from './steps/finalize';

const MAX_RETRIES = 1;

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
        retryCount: 0,
        metadata,
        safetyResult: safety.result,
        intent: classification.intent,
      };
      logPipelineRun(input, result);
      return result;
    }

    // 3. Retrieve knowledge context (async: includes RAG semantic search)
    const retrieval = await retrieve(input);

    // 4. Assemble prompt (tokens resolved here, immutable after this point)
    const assembled = assemble(input, classification, retrieval.knowledge);

    // 5. Generate content (supports streaming via callbacks)
    let generated = await generate(input, assembled.systemPrompt, classification);

    // 6. Validate (token enforcement + validation + trust + auto-fix)
    let validation = await validate(input, generated.content, assembled);

    // 7. Regeneration (max 1 retry, enforced here -- pipeline orchestrator controls retry)
    if (!validation.passed && retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`[Pipeline] Validation failed (score below threshold), retrying (${retryCount}/${MAX_RETRIES})`);
      generated = await generate(input, assembled.systemPrompt, classification);
      validation = await validate(input, generated.content, assembled);
    }

    // 8. Finalize (finishing layer + privacy masking)
    const finalized = finalize(validation.content, input, classification, assembled);

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
      evidence: null,
      autoFixPreview: validation.autoFixPreview,
      validationSummary: validation.validationSummary,
      retryCount,
      metadata,
      safetyResult: safety.result,
      intent: classification.intent,
    };

    logPipelineRun(input, result);
    return result;

  } catch (error) {
    const metadata = buildMetadata(input, timer.stop(), startedAt, 'error', 0);
    const result: PipelineResult = {
      success: false,
      output: '',
      pipelinePath: 'content_generation',
      validation: null,
      trustScore: null,
      evidence: null,
      autoFixPreview: null,
      validationSummary: null,
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
