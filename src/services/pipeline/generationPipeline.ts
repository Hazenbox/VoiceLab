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

import type { PipelineInput, PipelineResult, PipelineMetadata } from './types';
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
        retryCount: 0,
        metadata,
        safetyResult: safety.result,
        intent: classification.intent,
      };
      logPipelineRun(input, result);
      return result;
    }

    // 3. Retrieve knowledge context
    const retrieval = retrieve(input);

    // 4. Assemble prompt (tokens resolved here, immutable after this point)
    const assembled = assemble(input, classification, retrieval.knowledge);

    // 5. Generate content
    let generated = await generate(input, assembled.systemPrompt);

    // 6. Validate
    let validation = validate(input, generated.content, assembled.systemPrompt);

    // 7. Regeneration (max 1 retry, enforced here -- pipeline orchestrator controls retry)
    if (!validation.passed && retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`[Pipeline] Validation failed, retrying (${retryCount}/${MAX_RETRIES})`);
      generated = await generate(input, assembled.systemPrompt);
      validation = validate(input, generated.content, assembled.systemPrompt);
    }

    // 8. Finalize (privacy masking)
    const finalized = finalize(generated.content);

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
  classification?: { detectedEcosystem?: string; detectedChannel?: string },
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
