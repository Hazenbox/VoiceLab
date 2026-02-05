/**
 * Trust System Error Handler
 * 
 * Handles errors in the validation and trust scoring pipeline.
 * Provides graceful degradation and user-friendly error messages.
 * 
 * @module services/trust/errorHandler
 */

import type { TrustScore, TrustCertification, GenerationContext } from '../../types';
import type { PipelineValidationResult, ValidationAgentId } from '../validation/types';

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
  agentId?: ValidationAgentId;
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
    agentId?: ValidationAgentId;
    recoverable?: boolean;
  }
): TrustError {
  const errorMessages: Record<TrustErrorType, string> = {
    validation_timeout: 'Content validation took too long. Please try again.',
    agent_failure: 'One of our validation checks failed. The content may still be usable.',
    score_calculation_error: 'Unable to calculate trust score. Please try again.',
    autofix_failure: 'Auto-fix could not be applied. Please fix manually.',
    content_blocked: 'Content does not meet brand guidelines and cannot be used.',
    network_error: 'Network error occurred. Please check your connection.',
    unknown: 'An unexpected error occurred. Please try again.',
  };

  return {
    type,
    message,
    details: options?.details,
    agentId: options?.agentId,
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
  // Return partial results with warning
  return {
    passed: true, // Allow content through on timeout
    overallScore: 75, // Assume medium score
    certification: 'review',
    agentResults: partialResults.agentResults || [],
    totalViolations: partialResults.totalViolations || 0,
    criticalViolations: partialResults.criticalViolations || 0,
    executionTime: partialResults.executionTime || 10000,
    timestamp: new Date(),
  };
}

/**
 * Handle agent failure
 */
export function handleAgentFailure(
  agentId: ValidationAgentId,
  error: Error,
  otherResults: PipelineValidationResult
): PipelineValidationResult {
  // Log the error
  console.error(`Validation agent ${agentId} failed:`, error);
  
  // Return results without failed agent
  // Adjust weights accordingly
  return {
    ...otherResults,
    passed: otherResults.passed,
    // Slightly reduce confidence when agent fails
    overallScore: Math.max(0, otherResults.overallScore - 5),
  };
}

/**
 * Handle content blocked scenario
 */
export function handleContentBlocked(
  trustScore: TrustScore,
  context: GenerationContext
): {
  error: TrustError;
  alternatives: string[];
  canOverride: boolean;
} {
  const criticalViolations = trustScore.violations.filter(v => v.severity === 'critical');
  
  // Generate alternative suggestions
  const alternatives: string[] = [
    'Review and fix the highlighted violations',
    'Use the auto-fix feature to correct common issues',
    'Rephrase the content following brand guidelines',
  ];
  
  if (criticalViolations.length > 0) {
    alternatives.unshift(`Fix ${criticalViolations.length} critical issue(s) first`);
  }
  
  return {
    error: createTrustError('content_blocked', 'Content blocked due to violations', {
      details: `Score: ${trustScore.overall}, Critical: ${criticalViolations.length}`,
      recoverable: true,
    }),
    alternatives,
    canOverride: false, // Critical violations cannot be overridden
  };
}

/**
 * Handle auto-fix regression (fix made score worse)
 */
export function handleAutoFixRegression(
  originalScore: number,
  newScore: number,
  originalContent: string
): {
  error: TrustError;
  recommendation: string;
  shouldRevert: boolean;
} {
  return {
    error: createTrustError('autofix_failure', 'Auto-fix reduced content quality', {
      details: `Score dropped from ${originalScore} to ${newScore}`,
      recoverable: true,
    }),
    recommendation: 'The automatic fix reduced the trust score. We recommend reverting to the original content.',
    shouldRevert: true,
  };
}

/**
 * Create fallback trust score when calculation fails
 */
export function createFallbackTrustScore(): TrustScore {
  return {
    overall: 50,
    breakdown: {
      genderNeutrality: 50,
      elitism: 50,
      culturalSensitivity: 50,
      disabilityInclusion: 50,
      compliance: 50,
      styleGrammar: 50,
      accessibility: 50,
    },
    certification: 'review',
    isCertified: false,
    violations: [],
    timestamp: new Date().toISOString(),
    executionTime: 0,
  };
}

/**
 * Determine if error allows content to proceed
 */
export function canProceedWithError(error: TrustError): boolean {
  // Only content_blocked is a hard stop
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
      message: 'Content validation completed successfully.',
      severity: 'info',
      canProceed: true,
    };
  }
  
  const hasBlocking = errors.some(e => e.type === 'content_blocked');
  const hasNonRecoverable = errors.some(e => !e.recoverable);
  
  if (hasBlocking || hasNonRecoverable) {
    return {
      title: 'Content Blocked',
      message: errors.find(e => e.type === 'content_blocked')?.userMessage || 
               'Content cannot be used due to serious issues.',
      severity: 'error',
      canProceed: false,
    };
  }
  
  return {
    title: 'Validation Issues',
    message: `${errors.length} issue(s) occurred but content can still be used with caution.`,
    severity: 'warning',
    canProceed: true,
  };
}

/**
 * Log error for debugging
 */
export function logTrustError(error: TrustError, context?: GenerationContext): void {
  console.error('[Trust System Error]', {
    type: error.type,
    message: error.message,
    details: error.details,
    agentId: error.agentId,
    recoverable: error.recoverable,
    context: context ? {
      ecosystem: context.ecosystem,
      channel: context.channel,
    } : undefined,
    timestamp: new Date().toISOString(),
  });
}

export default {
  createTrustError,
  handleValidationTimeout,
  handleAgentFailure,
  handleContentBlocked,
  handleAutoFixRegression,
  createFallbackTrustScore,
  canProceedWithError,
  getErrorSummary,
  logTrustError,
};
