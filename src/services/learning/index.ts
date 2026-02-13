/**
 * Learning Module
 * 
 * User feedback and correction processing for adaptive learning.
 * 
 * @module services/learning
 */

// Correction Weighting
export {
  weightCorrection,
  weightAndSortCorrections,
  groupSimilarCorrections,
  getTopWeightedCorrections,
  filterLowWeightCorrections,
  getTopCorrectionGroups,
  calculateRecencyWeight,
  calculateFrequencyBoost,
  calculateFeedbackTypeWeight,
  getDecayFactor,
  WEIGHTING_CONFIG,
  type WeightedCorrection,
  type CorrectionGroup,
} from './correctionWeighting';
