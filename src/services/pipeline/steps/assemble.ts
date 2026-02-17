/**
 * Pipeline Step: Assemble
 *
 * Builds the LLM prompt from tokens, context, and knowledge.
 * Calls: prompt/ + tokens/ only
 *
 * Token preservation rules:
 * - Tokens are resolved HERE, before prompt assembly
 * - Token objects are immutable per pipeline run -- never mutated after this step
 */

import { buildPrompt } from '../../prompt';
import { buildGenerationContext } from '../../context';
import type { PipelineInput, ClassifyResult, AssembleResult } from '../types';
import type { RetrievedKnowledge } from '../../knowledge';

export function assemble(
  input: PipelineInput,
  classification: ClassifyResult,
  knowledge: RetrievedKnowledge | null,
): AssembleResult {
  const effectiveEcosystem = classification.detectedEcosystem || input.ecosystem;
  const effectiveChannel = classification.detectedChannel || input.contentChannel;

  const generationContext = buildGenerationContext({
    ecosystem: effectiveEcosystem,
    channel: effectiveChannel,
    userMessage: input.message,
    userProfile: input.userProfile,
    persona: input.featureFlags.persona ? input.userProfile?.role : undefined,
  });

  const systemPrompt = buildPrompt(generationContext, {
    knowledge: knowledge || undefined,
  });

  const tokenSnapshot = {
    ecosystem: effectiveEcosystem,
    channel: effectiveChannel,
    persona: input.userProfile?.role,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
  };

  return {
    systemPrompt,
    tokenSnapshot,
  };
}
