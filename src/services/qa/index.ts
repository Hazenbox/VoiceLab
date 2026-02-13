/**
 * QA module exports
 * @module services/qa
 */

// QA Scoring
export {
  // Types
  type QADimension,
  type ScoreLevel,
  type DimensionScore,
  type QAScore,
  type QAScoringContext,
  // Constants
  DIMENSION_WEIGHTS,
  // Functions
  scoreResponse,
  formatQAScore,
  meetsThreshold,
  getImprovementSuggestions,
  getDimensionDescription,
} from './qaScoring';

// Anti-Pattern Detector
export {
  // Types
  type AntiPatternCategory,
  type PatternSeverity,
  type DetectedAntiPattern,
  type AntiPatternResult,
  type AntiPatternContext,
  // Functions
  detectAntiPatterns,
  formatAntiPatternResult,
  getPatternsByCategory,
  getFixSuggestions,
  hasCriticalAntiPatterns,
  getAntiPatternSummary,
} from './antiPatternDetector';
