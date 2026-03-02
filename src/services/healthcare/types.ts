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

/**
 * Healthcare action configuration
 */
export interface HealthcareAction {
  /** Action type */
  type: 'connect_doctor' | 'book_appointment';
  /** Display label for button */
  label: string;
  /** URL to open (web or deep link) */
  url: string;
  /** Whether this is the primary action */
  isPrimary: boolean;
}

/**
 * Healthcare action card data
 */
export interface HealthcareActionCard {
  /** Contextual message to display */
  message: string;
  /** Available actions */
  actions: HealthcareAction[];
  /** Health category for styling/context */
  category: HealthCategory;
}
