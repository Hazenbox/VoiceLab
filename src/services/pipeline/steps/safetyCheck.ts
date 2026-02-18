/**
 * Pipeline Step: Safety Check (hard stop)
 *
 * Pre-generation safety gate. If safety fails, pipeline stops -- no regeneration.
 * Pure function -- no side effects.
 * 
 * Error handling: FAIL-CLOSED approach. If safety classification throws an error,
 * we block the request rather than allowing potentially unsafe content through.
 * This is the security-first approach - a bug in safety classification should NOT
 * result in bypassing safety entirely.
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

  try {
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
        emergencyResponse: result.emergencyResponse?.message,
      };
    }

    // proceed or proceed_modified
    return {
      passed: true,
      result,
      routing: result.routing,
      modifications: result.routing === 'proceed_modified' ? result.modifications : undefined,
    };
  } catch (error) {
    // FAIL-CLOSED: Block the request if safety check fails
    // A bug in safety classification should NOT bypass safety entirely
    console.error('[Pipeline:SafetyCheck] Safety check failed, BLOCKING request for safety:', error);
    return {
      passed: false,
      result: null,
      routing: 'block_and_log',
      blockedReason: 'safety_check_error',
    };
  }
}
