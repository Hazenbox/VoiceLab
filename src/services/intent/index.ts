/**
 * Intent Classification Module
 * 
 * Exports the intent classifier and related types for the
 * conversational-first architecture.
 * 
 * @module services/intent
 */

export { classifyIntent } from './intentClassifier';
export type {
  MessageIntent,
  IntentClassification,
  ClassifyIntentOptions,
  DetectedChannel,
  DetectedEcosystem,
  IntentConfidence,
} from './types';
