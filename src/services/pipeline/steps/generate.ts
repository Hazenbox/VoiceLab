/**
 * Pipeline Step: Generate
 *
 * Calls the LLM to generate content.
 * Calls: llm/ only
 */

import { getOrchestratorInstance } from '../../llm/orchestrator';
import type { PipelineInput, GenerateResult } from '../types';

export async function generate(
  input: PipelineInput,
  systemPrompt: string,
): Promise<GenerateResult> {
  const orchestrator = getOrchestratorInstance();

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...input.conversationHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: input.message },
  ];

  const result = await orchestrator.generate({
    messages,
    providerType: input.llmProvider,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    stream: false,
    abortSignal: input.abortSignal,
  });

  return {
    content: result.content,
    model: result.model || input.llmProvider,
    usage: result.usage ? {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
    } : undefined,
  };
}
