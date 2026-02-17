/**
 * Pipeline Step: Classify
 *
 * Classifies user intent into content_generation, general_chat, or jio_inquiry.
 * Calls: nothing external (uses intent service)
 */

import { classifyIntent } from '../../intent';
import type { PipelineInput, ClassifyResult } from '../types';

export function classify(input: PipelineInput): ClassifyResult {
  if (!input.featureFlags.conversationalMode) {
    return {
      intent: 'content_generation',
      confidence: 1,
    };
  }

  const result = classifyIntent(input.message, {
    profileEcosystem: input.ecosystem,
    profileChannel: input.contentChannel,
  });

  return {
    intent: result.intent as ClassifyResult['intent'],
    detectedEcosystem: result.detectedEcosystem?.ecosystem,
    detectedChannel: result.detectedChannel?.channel,
    confidence: result.confidence ?? 0.8,
  };
}
