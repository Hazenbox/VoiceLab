/**
 * Pipeline Step: Safety Check (hard stop)
 *
 * Pre-generation safety gate. If safety fails, pipeline stops -- no regeneration.
 * Pure function -- no side effects.
 */

import { checkSafetyGate, type SafetyGateResult } from '../../safety';
import type { PipelineInput } from '../types';

export interface SafetyCheckResult {
  passed: boolean;
  result: SafetyGateResult | null;
  routing?: string;
  emergencyResponse?: string;
  blockedReason?: string;
  modifications?: string[];
}

export function safetyCheck(input: PipelineInput): SafetyCheckResult {
  if (!input.featureFlags.safetyGate) {
    return { passed: true, result: null };
  }

  const result = checkSafetyGate(input.message, {
    ecosystem: input.ecosystem,
    channel: input.contentChannel,
  });

  if (result.routing === 'emergency_response' && result.emergencyResponse) {
    return {
      passed: false,
      result,
      routing: result.routing,
      emergencyResponse: result.emergencyResponse.message,
    };
  }

  if (result.routing === 'block_and_log') {
    return {
      passed: false,
      result,
      routing: result.routing,
      blockedReason: result.classification.domain,
    };
  }

  // proceed or proceed_modified
  return {
    passed: true,
    result,
    routing: result.routing,
    modifications: result.routing === 'proceed_modified' ? result.modifications : undefined,
  };
}
