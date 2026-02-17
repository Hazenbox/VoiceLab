/**
 * Pipeline Step: Generate
 *
 * Calls the LLM orchestrator with retry and fallback support.
 * Supports both streaming and non-streaming modes.
 */

import { getOrchestratorInstance } from '../../llm/orchestrator';
import { createLLMProvider as defaultCreateLLMProvider } from '../../providers/llm';
import type { PipelineInput, GenerateResult, ClassifyResult } from '../types';

export async function generate(
  input: PipelineInput,
  systemPrompt: string,
  classification?: ClassifyResult,
): Promise<GenerateResult> {
  const orchestrator = getOrchestratorInstance();
  const createProvider = input.createLLMProvider || defaultCreateLLMProvider;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...input.conversationHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: input.message },
  ];

  const tags = classification
    ? [`intent:${classification.intent}`]
    : ['intent:content_generation'];

  if (input.stream && input.callbacks?.onStreamChunk) {
    // Streaming mode
    let accumulatedText = '';
    try {
      const streamResult = await orchestrator.generateStream(
        input.llmProvider,
        {
          messages,
          maxTokens: input.maxTokens,
          temperature: input.temperature,
          signal: input.abortSignal,
        },
        createProvider,
        (chunk: string) => {
          accumulatedText += chunk;
          input.callbacks!.onStreamChunk!(accumulatedText);
        },
      );

      return {
        content: streamResult.content,
        model: input.llmProvider,
        usage: streamResult.usage ? {
          promptTokens: streamResult.usage.promptTokens,
          completionTokens: streamResult.usage.completionTokens,
          totalTokens: streamResult.usage.totalTokens,
        } : undefined,
      };
    } finally {
      input.callbacks.onStreamEnd?.();
    }
  }

  // Non-streaming mode
  const result = await orchestrator.generate(
    input.llmProvider,
    {
      messages,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
      stream: false,
      signal: input.abortSignal,
    },
    createProvider,
    tags,
  );

  return {
    content: result.content,
    model: input.llmProvider,
    usage: result.usage ? {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
    } : undefined,
  };
}
