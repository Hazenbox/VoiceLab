/**
 * Pipeline Step: Safety Check (hard stop)
 *
 * Pre-generation safety gate. If safety fails, pipeline stops -- no regeneration.
 * Calls: safety/ module only
 */

import { checkSafetyGate, type SafetyGateResult } from '../../safety';
import type { PipelineInput } from '../types';

export interface SafetyCheckResult {
  passed: boolean;
  result: SafetyGateResult | null;
  emergencyResponse?: string;
  blockedReason?: string;
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
      emergencyResponse: result.emergencyResponse.message,
    };
  }

  if (result.routing === 'block_and_log') {
    return {
      passed: false,
      result,
      blockedReason: result.classification.domain,
    };
  }

  return { passed: true, result };
}
