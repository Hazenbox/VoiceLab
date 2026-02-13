/**
 * Correction Weighting
 * 
 * Applies recency and frequency decay to correction scores.
 * More recent and more frequent corrections have higher weight.
 * 
 * @module services/learning/correctionWeighting
 */

import type { CorrectionEntry } from '../knowledge/learningEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const WEIGHTING_CONFIG = {
  /** Recency half-life in days (corrections older than this get 50% weight) */
  recencyHalfLifeDays: 14,
  /** Frequency boost multiplier (max boost for repeated corrections) */
  frequencyBoostMax: 2.0,
  /** Minimum weight (even old corrections have some value) */
  minWeight: 0.1,
  /** Maximum weight (cap to prevent single correction dominating) */
  maxWeight: 1.0,
  /** Feedback type weights */
  feedbackTypeWeights: {
    edit: 1.0,        // Highest: user took time to edit
    thumbs_down: 0.8, // High: explicit negative signal
    comment: 0.6,     // Medium: qualitative feedback
    thumbs_up: 0.4,   // Lower: positive but less learning
    save_example: 0.5,// Medium: marked as good example
  } as Record<string, number>,
  /** Trust score influence (higher trust = higher weight) */
  trustScoreInfluence: 0.2,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WeightedCorrection extends CorrectionEntry {
  /** Combined weight score (0-1) */
  weight: number;
  /** Individual weight components */
  weightBreakdown: {
    recency: number;
    frequency: number;
    feedbackType: number;
    trustScore: number;
  };
}

export interface CorrectionGroup {
  /** Fingerprint for this group */
  fingerprint: string;
  /** All corrections in this group */
  corrections: CorrectionEntry[];
  /** Number of occurrences */
  frequency: number;
  /** Most recent timestamp */
  mostRecent: number;
  /** Combined weight */
  weight: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHT CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate recency weight using exponential decay
 */
export function calculateRecencyWeight(timestamp: number): number {
  const now = Date.now();
  const ageMs = now - timestamp;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  
  // Exponential decay: weight = 0.5^(age/halfLife)
  const halfLife = WEIGHTING_CONFIG.recencyHalfLifeDays;
  const weight = Math.pow(0.5, ageDays / halfLife);
  
  return Math.max(WEIGHTING_CONFIG.minWeight, Math.min(1, weight));
}

/**
 * Calculate frequency boost (more occurrences = higher weight)
 * Uses logarithmic scaling to prevent extreme values
 */
export function calculateFrequencyBoost(frequency: number): number {
  if (frequency <= 1) return 1.0;
  
  // Logarithmic scaling: 1 + log2(frequency) / log2(maxBoost)
  const boost = 1 + (Math.log2(frequency) / Math.log2(WEIGHTING_CONFIG.frequencyBoostMax));
  
  return Math.min(boost, WEIGHTING_CONFIG.frequencyBoostMax);
}

/**
 * Calculate feedback type weight
 */
export function calculateFeedbackTypeWeight(feedbackType: string): number {
  return WEIGHTING_CONFIG.feedbackTypeWeights[feedbackType] ?? 0.5;
}

/**
 * Calculate trust score influence
 */
export function calculateTrustScoreWeight(trustScore?: number): number {
  if (trustScore === undefined) return 1.0;
  
  // Trust score is typically 0-1, apply influence factor
  const influence = WEIGHTING_CONFIG.trustScoreInfluence;
  return 1 + ((trustScore - 0.5) * influence);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WEIGHTING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply weights to a single correction
 */
export function weightCorrection(
  correction: CorrectionEntry,
  frequency: number = 1
): WeightedCorrection {
  const recency = calculateRecencyWeight(correction.timestamp);
  const frequencyBoost = calculateFrequencyBoost(frequency);
  const feedbackType = calculateFeedbackTypeWeight(correction.feedbackType);
  const trustScore = calculateTrustScoreWeight(correction.trustScore);
  
  // Combined weight (normalized)
  const rawWeight = recency * frequencyBoost * feedbackType * trustScore;
  const weight = Math.max(
    WEIGHTING_CONFIG.minWeight,
    Math.min(WEIGHTING_CONFIG.maxWeight, rawWeight)
  );
  
  return {
    ...correction,
    weight,
    weightBreakdown: {
      recency,
      frequency: frequencyBoost,
      feedbackType,
      trustScore,
    },
  };
}

/**
 * Weight and sort corrections by importance
 */
export function weightAndSortCorrections(
  corrections: CorrectionEntry[]
): WeightedCorrection[] {
  // First, group by similar content to calculate frequency
  const groups = groupSimilarCorrections(corrections);
  
  // Weight each correction with frequency context
  const weighted: WeightedCorrection[] = [];
  
  for (const group of groups.values()) {
    for (const correction of group.corrections) {
      weighted.push(weightCorrection(correction, group.frequency));
    }
  }
  
  // Sort by weight (highest first)
  return weighted.sort((a, b) => b.weight - a.weight);
}

/**
 * Group corrections by similar content
 */
export function groupSimilarCorrections(
  corrections: CorrectionEntry[]
): Map<string, CorrectionGroup> {
  const groups = new Map<string, CorrectionGroup>();
  
  for (const correction of corrections) {
    const fingerprint = generateFingerprint(correction);
    
    let group = groups.get(fingerprint);
    if (!group) {
      group = {
        fingerprint,
        corrections: [],
        frequency: 0,
        mostRecent: 0,
        weight: 0,
      };
      groups.set(fingerprint, group);
    }
    
    group.corrections.push(correction);
    group.frequency++;
    group.mostRecent = Math.max(group.mostRecent, correction.timestamp);
  }
  
  // Calculate group weights
  for (const group of groups.values()) {
    group.weight = calculateRecencyWeight(group.mostRecent) * 
                   calculateFrequencyBoost(group.frequency);
  }
  
  return groups;
}

/**
 * Generate a fingerprint for grouping similar corrections
 */
function generateFingerprint(correction: CorrectionEntry): string {
  // Use first 50 chars of original content + feedback type
  const content = correction.originalContent.slice(0, 50).toLowerCase().trim();
  const type = correction.feedbackType;
  
  let hash = 0;
  const str = `${content}|${type}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Get top N corrections by weight
 */
export function getTopWeightedCorrections(
  corrections: CorrectionEntry[],
  limit: number = 10
): WeightedCorrection[] {
  return weightAndSortCorrections(corrections).slice(0, limit);
}

/**
 * Filter corrections that are too old or low weight
 */
export function filterLowWeightCorrections(
  corrections: WeightedCorrection[],
  minWeight: number = 0.2
): WeightedCorrection[] {
  return corrections.filter(c => c.weight >= minWeight);
}

/**
 * Get correction groups sorted by combined weight
 */
export function getTopCorrectionGroups(
  corrections: CorrectionEntry[],
  limit: number = 5
): CorrectionGroup[] {
  const groups = groupSimilarCorrections(corrections);
  const sortedGroups = Array.from(groups.values())
    .sort((a, b) => b.weight - a.weight);
  
  return sortedGroups.slice(0, limit);
}

/**
 * Calculate decay for a time period
 * Useful for understanding how corrections age
 */
export function getDecayFactor(daysSinceCorrection: number): number {
  return calculateRecencyWeight(Date.now() - (daysSinceCorrection * 24 * 60 * 60 * 1000));
}
