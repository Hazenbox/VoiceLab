/**
 * Trust Services
 * 
 * Exports all trust-related functionality for the Content Trust System.
 * 
 * @module services/trust
 */

// Trust Score Calculator
export {
  calculateTrustScore,
  getCertificationBadge,
  getScoreExplanation,
  formatScore,
  getScoreColor,
  shouldBlockContent,
  getTopViolations,
} from './trustScoreCalculator';

// Auto-Fix Engine
export type {
  AutoFixResult,
  AppliedFix,
  SkippedFix,
  AutoFixConfig,
} from './autoFixEngine';

export {
  generateAutoFixes,
  applyAutoFixes,
  previewAutoFixes,
  getFixPreview,
  applySingleFix,
  undoFix,
} from './autoFixEngine';

// Error Handler
export type {
  TrustErrorType,
  TrustError,
} from './errorHandler';

export {
  createTrustError,
  handleValidationTimeout,
  handleAgentFailure,
  handleContentBlocked,
  handleAutoFixRegression,
  createFallbackTrustScore,
  canProceedWithError,
  getErrorSummary,
  logTrustError,
} from './errorHandler';
