/**
 * Pipeline Step: Classify
 *
 * Classifies user intent into content_generation, general_chat, or jio_inquiry.
 * Pure function -- no side effects.
 * 
 * Error handling: Falls back to general_chat on classification failure
 * to ensure pipeline continues gracefully.
 */

import { classifyIntent } from '../../intent';
import type { PipelineInput, ClassifyResult } from '../types';

/** Map string confidence levels to numeric values */
const CONFIDENCE_MAP: Record<string, number> = {
  high: 1.0,
  medium: 0.8,
  low: 0.5,
};

export function classify(input: PipelineInput): ClassifyResult {
  // When conversationalMode is disabled, all messages become content_generation
  // This effectively disables the general_chat optimization
  if (!input.featureFlags.conversationalMode) {
    return {
      intent: 'content_generation',
      confidence: 1,
    };
  }

  try {
    const result = classifyIntent(input.message, {
      profileEcosystem: input.ecosystem,
      profileChannel: input.contentChannel,
    });

    // Convert string confidence to numeric
    const numericConfidence = typeof result.confidence === 'string'
      ? CONFIDENCE_MAP[result.confidence] ?? 0.8
      : result.confidence ?? 0.8;

    return {
      intent: result.intent as ClassifyResult['intent'],
      detectedEcosystem: result.detectedEcosystem?.ecosystem,
      detectedChannel: result.detectedChannel?.channel,
      confidence: numericConfidence,
    };
  } catch (error) {
    // Graceful fallback: treat as general_chat on classification failure
    // This ensures the pipeline continues even if classification has issues
    console.warn('[Pipeline:Classify] Classification failed, falling back to general_chat:', error);
    return {
      intent: 'general_chat',
      confidence: 0.5,
    };
  }
}
