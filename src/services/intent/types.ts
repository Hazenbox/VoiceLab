/**
 * Intent Classification Types
 * 
 * Types for the conversational-first intent detection system.
 * Classifies user messages into general chat, content generation,
 * or Jio inquiry modes to apply appropriate processing pipelines.
 * 
 * @module services/intent/types
 */

import type { ContentChannelType, EcosystemType } from '../../types';

// =============================================================================
// INTENT TYPES
// =============================================================================

/**
 * The three message intent modes
 * 
 * - general_chat: Normal conversation (science, history, curiosity, etc.)
 * - content_generation: User wants to create branded Jio content
 * - jio_inquiry: User asking about Jio products/services (informational)
 */
export type MessageIntent = 'general_chat' | 'content_generation' | 'jio_inquiry';

/**
 * Confidence level for intent classification
 */
export type IntentConfidence = 'high' | 'medium' | 'low';

/**
 * Result of channel auto-detection from user message
 */
export interface DetectedChannel {
  /** The detected channel type */
  channel: ContentChannelType;
  /** Keywords that triggered the detection */
  matchedKeywords: string[];
  /** Detection confidence */
  confidence: IntentConfidence;
}

/**
 * Result of ecosystem auto-detection from user message
 */
export interface DetectedEcosystem {
  /** The detected ecosystem type */
  ecosystem: EcosystemType;
  /** Keywords that triggered the detection */
  matchedKeywords: string[];
}

/**
 * Complete intent classification result
 * Returned by classifyIntent() for each user message
 */
export interface IntentClassification {
  /** The classified intent */
  intent: MessageIntent;
  /** Confidence of the classification */
  confidence: IntentConfidence;
  /** Signals/keywords that triggered this classification */
  signals: string[];

  // Auto-detected entities (populated for content_generation intent)
  /** Auto-detected channel from the message text */
  detectedChannel: DetectedChannel | null;
  /** Auto-detected ecosystem from the message text */
  detectedEcosystem: DetectedEcosystem | null;

  // Pipeline control flags
  /** Whether to run the 9-agent Content Trust validation pipeline */
  shouldValidate: boolean;
  /** Whether to show the trust score badge on the response */
  shouldShowTrust: boolean;
  /** Whether to include brand guardrails in the system prompt */
  shouldApplyGuardrails: boolean;
}

/**
 * Options passed to the intent classifier
 */
export interface ClassifyIntentOptions {
  /** User's default ecosystem from onboarding profile */
  profileEcosystem?: EcosystemType;
  /** User's default channel from onboarding profile */
  profileChannel?: ContentChannelType;
  /** Whether the channel was manually overridden in advanced settings */
  channelManuallySet?: boolean;
  /** Whether the ecosystem was manually overridden in advanced settings */
  ecosystemManuallySet?: boolean;
}
