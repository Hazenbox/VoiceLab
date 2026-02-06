/**
 * Trust System Error Handler
 * 
 * Handles errors in the validation and trust scoring pipeline.
 */

import type { TrustScore, TrustScoreBreakdown } from '../../types';
import type { PipelineValidationResult } from '../validation/types';

/**
 * Error types in the trust system
 */
export type TrustErrorType = 
  | 'validation_timeout'
  | 'agent_failure'
  | 'score_calculation_error'
  | 'autofix_failure'
  | 'content_blocked'
  | 'network_error'
  | 'unknown';

/**
 * Trust system error
 */
export interface TrustError {
  type: TrustErrorType;
  message: string;
  details?: string;
  recoverable: boolean;
  userMessage: string;
}

/**
 * Create error object
 */
export function createTrustError(
  type: TrustErrorType,
  message: string,
  options?: {
    details?: string;
    recoverable?: boolean;
  }
): TrustError {
  const errorMessages: Record<TrustErrorType, string> = {
    validation_timeout: 'Content validation took too long. Please try again.',
    agent_failure: 'One of our validation checks failed.',
    score_calculation_error: 'Unable to calculate trust score.',
    autofix_failure: 'Auto-fix could not be applied.',
    content_blocked: 'Content does not meet brand guidelines.',
    network_error: 'Network error occurred.',
    unknown: 'An unexpected error occurred.',
  };

  return {
    type,
    message,
    details: options?.details,
    recoverable: options?.recoverable ?? true,
    userMessage: errorMessages[type],
  };
}

/**
 * Handle validation timeout
 */
export function handleValidationTimeout(
  partialResults: Partial<PipelineValidationResult>
): PipelineValidationResult {
  return {
    passed: true,
    overallScore: 75,
    certification: 'review_recommended',
    agentResults: partialResults.agentResults || [],
    totalViolations: partialResults.totalViolations || 0,
    autoFixableCount: partialResults.autoFixableCount || 0,
    processingTimeMs: partialResults.processingTimeMs || 10000,
    timestamp: new Date(),
  };
}

/**
 * Create fallback trust score
 */
export function createFallbackTrustScore(): TrustScore {
  const breakdown: TrustScoreBreakdown = {
    genderNeutrality: 50,
    inclusivity: 50,
    culturalSensitivity: 50,
    accessibility: 50,
    compliance: 50,
    styleConsistency: 50,
    brandAlignment: 50,
    readability: 50,
  };

  return {
    overall: 50,
    breakdown,
    confidence: 'low',
    certified: false,
    certification: 'review_recommended',
    validationResults: [],
    totalViolations: 0,
    autoFixableCount: 0,
    processingTimeMs: 0,
  };
}

/**
 * Determine if error allows content to proceed
 */
export function canProceedWithError(error: TrustError): boolean {
  return error.type !== 'content_blocked';
}

/**
 * Get user-friendly error summary
 */
export function getErrorSummary(errors: TrustError[]): {
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  canProceed: boolean;
} {
  if (errors.length === 0) {
    return {
      title: 'No errors',
      message: 'Validation completed successfully.',
      severity: 'info',
      canProceed: true,
    };
  }
  
  const hasBlocking = errors.some(e => e.type === 'content_blocked');
  
  if (hasBlocking) {
    return {
      title: 'Content Blocked',
      message: 'Content cannot be used due to serious issues.',
      severity: 'error',
      canProceed: false,
    };
  }
  
  return {
    title: 'Validation Issues',
    message: `${errors.length} issue(s) occurred but content can still be used.`,
    severity: 'warning',
    canProceed: true,
  };
}

/**
 * Log error for debugging
 */
export function logTrustError(error: TrustError): void {
  console.error('[Trust System Error]', {
    type: error.type,
    message: error.message,
    details: error.details,
    recoverable: error.recoverable,
    timestamp: new Date().toISOString(),
  });
}

export default {
  createTrustError,
  handleValidationTimeout,
  createFallbackTrustScore,
  canProceedWithError,
  getErrorSummary,
  logTrustError,
};
