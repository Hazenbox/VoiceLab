/**
 * Trust Services
 */

export {
  calculateTrustScore,
  getCertificationBadge,
  formatScore,
  getScoreColor,
  getScoreExplanation,
  shouldBlockContent,
} from './trustScoreCalculator';

export type {
  AutoFixResult,
} from './autoFixEngine';

export {
  generateAutoFixes,
  applyAutoFixes,
  previewAutoFixes,
} from './autoFixEngine';

export type {
  TrustErrorType,
  TrustError,
} from './errorHandler';

export {
  createTrustError,
  handleValidationTimeout,
  createFallbackTrustScore,
  canProceedWithError,
  getErrorSummary,
  logTrustError,
} from './errorHandler';
