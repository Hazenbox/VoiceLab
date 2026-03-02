/**
 * JioHealthHub Integration Types
 * 
 * Type definitions for healthcare action card and health topic detection.
 * Follows the pattern established by JioSaavn integration.
 */

/**
 * Health topic categories for contextual messaging
 */
export type HealthCategory = 
  | 'medical_advice'  // Symptoms, medication questions
  | 'appointment'     // Booking, scheduling
  | 'wellness'        // Fitness, nutrition, general health
  | 'emergency';      // Urgent, critical symptoms

/**
 * Health topic detection result
 */
export interface HealthTopicResult {
  /** Whether health content was detected */
  detected: boolean;
  /** Category of health query */
  category: HealthCategory;
  /** Confidence score (0-1) */
  confidence: number;
  /** Keywords that triggered detection */
  matchedKeywords: string[];
}

