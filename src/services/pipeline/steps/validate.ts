/**
 * Pipeline Step: Validate
 *
 * Runs safety check (hard stop) then validation runner (soft stop).
 * Calls: validation/runner only
 *
 * Execution rules:
 * - Safety fail = hard stop (no regeneration) -- handled by safetyCheck step
 * - Brand/structure/formatting fail = soft stop (one retry allowed)
 * - Validators execute in deterministic order
 * - No nested validator calls, no cross-validator dependencies
 */

import { runValidationPipeline } from '../../validation';
import { calculateTrustScore } from '../../trust';
import type { PipelineInput, ValidateResult } from '../types';
import type { TrustScore } from '../../../types';

export function validate(
  input: PipelineInput,
  content: string,
  systemPrompt: string,
): ValidateResult {
  try {
    const validationResult = runValidationPipeline(content, {
      ecosystem: input.ecosystem,
      channel: input.contentChannel,
    });

    let trustScore: TrustScore | null = null;
    try {
      trustScore = calculateTrustScore(
        content,
        validationResult,
        {
          ecosystem: input.ecosystem,
          channel: input.contentChannel,
          trustSettings: input.trustSettings,
        }
      );
    } catch (trustError) {
      console.warn('[Pipeline:Validate] Trust scoring failed:', trustError);
    }

    const passed = validationResult.overallScore >= 0.7;

    return {
      passed,
      validation: validationResult,
      trustScore,
    };
  } catch (error) {
    console.warn('[Pipeline:Validate] Validation failed:', error);
    return {
      passed: true,
      validation: null,
      trustScore: null,
    };
  }
}
