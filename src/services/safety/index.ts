/**
 * Safety Module
 * 
 * Pre-generation safety layer for the Jio Conversational AI.
 * 
 * Usage:
 * ```typescript
 * import { checkSafetyGate, type SafetyGateResult } from '@/services/safety';
 * 
 * const result = checkSafetyGate(userInput);
 * 
 * switch (result.routing) {
 *   case 'proceed_normal':
 *     // Normal generation
 *     break;
 *   case 'proceed_modified':
 *     // Generate with modifications applied
 *     break;
 *   case 'emergency_response':
 *     // Use pre-defined emergency response
 *     return result.emergencyResponse.message;
 *   case 'block_and_log':
 *     // Block and log for review
 *     break;
 * }
 * ```
 * 
 * @module services/safety
 */

// Main entry point
export {
  checkSafetyGate,
  needsSafetyReview,
  getSafetyContext,
  canIncludeNudge,
  applySafetyModifications,
  type SafetyRouting,
  type SafetyGateResult,
  type GenerationModifications,
  type SafetyGateConfig,
} from './safetyGate';

// Classifier (for direct access if needed)
export {
  classifySafety,
  hasCriticalSafetyConcern,
  getDomainPatterns,
  type SafetyClassification,
  type ClassifierConfig,
} from './safetyClassifier';

// Emergency responses
export {
  getEmergencyResponse,
  getAdvisoryDisclaimer,
  requiresEmergencyResponse,
  formatCrisisResources,
  getResourcesByCategory,
  CRISIS_RESOURCES,
  type EmergencyResponse,
  type EmergencyResponseConfig,
} from './emergencyResponses';
