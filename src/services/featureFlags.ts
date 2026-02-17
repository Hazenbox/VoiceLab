/**
 * Feature Flags
 * 
 * Centralized feature flag checks for Phase 0-5 features.
 * Reads from VITE_ENABLE_* environment variables.
 * 
 * When a flag is disabled (missing or !== 'true'), the feature gracefully
 * falls back to defaults or is skipped entirely -- no crashes.
 * 
 * NOTE: Uses isomorphic env helpers to work in both browser and server contexts.
 */

import { getEnv, isServer } from './env';

/**
 * Get a feature flag from environment (isomorphic).
 * Handles VITE_ prefix automatically.
 */
function getFlag(key: string, defaultEnabled: boolean = true): boolean {
  // Use getEnv which handles VITE_ prefix and server/client differences
  const value = getEnv(`ENABLE_${key}`, defaultEnabled ? 'true' : 'false');
  if (defaultEnabled) {
    return value !== 'false'; // Opt-out: enabled unless explicitly 'false'
  } else {
    return value === 'true'; // Opt-in: disabled unless explicitly 'true'
  }
}

/**
 * Get a debug flag (opt-in by default).
 */
function getDebugFlag(key: string): boolean {
  const value = getEnv(`DEBUG_${key}`, 'false');
  return value === 'true';
}

export const featureFlags = {
  /** Background sync of profiles, analytics, corrections to Convex (always enabled) */
  get convexSync(): boolean {
    return true;  // Always enabled for production
  },

  /** 
   * Role-based persona auto-configuration (channel, warmth, prompt personality)
   * Default: true (core intelligence feature, opt-out)
   * Set VITE_ENABLE_PERSONA=false to disable
   */
  get persona(): boolean {
    return getFlag('PERSONA', true);
  },

  /** 
   * Dynamic knowledge retrieval from Convex (avoid words, vocabulary, auto-fix)
   * Default: true (core intelligence feature, opt-out)
   * Set VITE_ENABLE_KNOWLEDGE_BASE=false to disable
   */
  get knowledgeBase(): boolean {
    return getFlag('KNOWLEDGE_BASE', true);
  },

  /** 
   * Learning from user feedback (edits, thumbs down, comments injected into prompt)
   * Default: true (core intelligence feature, opt-out)
   * Set VITE_ENABLE_LEARNING=false to disable
   */
  get learning(): boolean {
    return getFlag('LEARNING', true);
  },

  /** 
   * Conversational-first mode: general-purpose assistant with conditional Jio guardrails
   * Default: true (core intelligence feature, opt-out)
   * Set VITE_ENABLE_CONVERSATIONAL_MODE=false to disable
   */
  get conversationalMode(): boolean {
    return getFlag('CONVERSATIONAL_MODE', true);
  },

  // ── Analytics Feature Flags ──────────────────────────────────────────

  /** 
   * Session-level analytics tracking (conversation sessions, metrics)
   * Default: true for comprehensive analytics
   */
  get sessionAnalytics(): boolean {
    return getFlag('SESSION_ANALYTICS', true);
  },

  /**
   * Interaction event tracking (copy, regenerate, like, dislike, etc.)
   * Default: true for user behavior insights
   */
  get interactionTracking(): boolean {
    return getFlag('INTERACTION_TRACKING', true);
  },

  /**
   * Response time measurement for AI responses
   * Default: true for performance monitoring
   */
  get responseTimeTracking(): boolean {
    return getFlag('RESPONSE_TIME_TRACKING', true);
  },

  // ── Learning & Memory Flags ──────────────────────────────────────────

  /**
   * Auto-approve user corrections/feedback for immediate learning
   * Default: true (auto-approve all corrections)
   * Set VITE_AUTO_APPROVE_CORRECTIONS=false to require manual admin approval
   */
  get autoApproveCorrections(): boolean {
    // Special case: different env var pattern (no ENABLE_ prefix)
    const value = getEnv('AUTO_APPROVE_CORRECTIONS', 'true');
    return value !== 'false';
  },

  // ── Validation Flags ──────────────────────────────────────────────────

  /**
   * P0-FIX: Validate conversational content (general_chat, jio_inquiry)
   * Previously, conversational path bypassed ALL validation - this is a security risk.
   * Default: true (validate all content)
   * Set VITE_VALIDATE_CONVERSATIONAL=false to disable (not recommended)
   */
  get validateConversational(): boolean {
    // Special case: different env var pattern (no ENABLE_ prefix)
    const value = getEnv('VALIDATE_CONVERSATIONAL', 'true');
    return value !== 'false';
  },

  // ── Constitutional AI Flags ────────────────────────────────────────────

  /**
   * Enable safety gate pre-generation check
   * Checks user input for safety concerns before LLM generation
   * Default: true (safety first)
   */
  get safetyGate(): boolean {
    return getFlag('SAFETY_GATE', true);
  },

  /**
   * Enable constitutional wrapper for generation
   * Applies token classification, directive loading, state management
   * Default: true
   */
  get constitutionalWrapper(): boolean {
    return getFlag('CONSTITUTIONAL_WRAPPER', true);
  },

  /**
   * Enable post-generation validation agents
   * Runs voice traits, emotion, pattern block, and self-check validations
   * Default: true
   */
  get validationAgents(): boolean {
    return getFlag('VALIDATION_AGENTS', true);
  },

  /**
   * Enable conversation state machine
   * Tracks multi-turn conversation state and provides state-aware suggestions
   * Default: true
   */
  get conversationState(): boolean {
    return getFlag('CONVERSATION_STATE', true);
  },

  /**
   * Enable handoff trigger detection
   * Detects when conversation should escalate to human support
   * Default: true
   */
  get handoffDetection(): boolean {
    return getFlag('HANDOFF_DETECTION', true);
  },

  // ── RAG Enhancement Flags ──────────────────────────────────────────────

  /**
   * Enable query expansion with Jio synonyms
   * Expands search queries with related terms for better recall
   * Default: true
   */
  get ragQueryExpansion(): boolean {
    return getFlag('RAG_QUERY_EXPANSION', true);
  },

  /**
   * Enable result ranking with recency/relevance scoring
   * Re-ranks vector search results based on multiple factors
   * Default: true
   */
  get ragResultRanking(): boolean {
    return getFlag('RAG_RESULT_RANKING', true);
  },

  /**
   * Enable RAG resilience (retry, circuit breaker)
   * Adds fault tolerance to RAG operations
   * Default: true
   */
  get ragResilience(): boolean {
    return getFlag('RAG_RESILIENCE', true);
  },

  // ── Learning Enhancement Flags ─────────────────────────────────────────

  /**
   * Enable correction weighting (recency + frequency decay)
   * Weights corrections by age and frequency for smarter learning
   * Default: true
   */
  get correctionWeighting(): boolean {
    return getFlag('CORRECTION_WEIGHTING', true);
  },

  /**
   * Enable user learning profiles
   * Aggregates user preferences across sessions for personalization
   * Default: true
   */
  get userLearningProfiles(): boolean {
    return getFlag('USER_LEARNING_PROFILES', true);
  },

  /**
   * Enable admin rejection sync
   * Syncs admin-rejected corrections to local cache to prevent re-use
   * Default: true
   */
  get adminRejectionSync(): boolean {
    return getFlag('ADMIN_REJECTION_SYNC', true);
  },

  // ── Token Management Flags ─────────────────────────────────────────────

  /**
   * Enable token classification
   * Classifies user input into 14 token categories
   * Default: true
   */
  get tokenClassification(): boolean {
    return getFlag('TOKEN_CLASSIFICATION', true);
  },

  /**
   * Enable selective directive loading
   * Loads only relevant directives (5-10) instead of full rule set
   * Default: true (reduces prompt size)
   */
  get selectiveDirectives(): boolean {
    return getFlag('SELECTIVE_DIRECTIVES', true);
  },

  // ── Emergency & Safety Flags ───────────────────────────────────────────

  /**
   * Enable emergency response templates
   * Uses pre-defined responses for critical safety situations
   * Default: true (NEVER disable in production)
   */
  get emergencyResponses(): boolean {
    return getFlag('EMERGENCY_RESPONSES', true);
  },

  /**
   * Log safety events for review
   * Logs detected safety concerns for admin review
   * Default: true
   */
  get safetyLogging(): boolean {
    return getFlag('SAFETY_LOGGING', true);
  },

  // ── Server-Side Pipeline Flags ──────────────────────────────────────────

  /**
   * Run the generation pipeline server-side via /api/generate.
   * When enabled, the pipeline executes on Vercel serverless instead of client.
   * Default: false (client-side pipeline)
   * Set VITE_SERVER_SIDE_PIPELINE=true to enable
   * 
   * Phase 6: Gradual rollout capability for server-side migration
   */
  get serverSidePipeline(): boolean {
    return getFlag('SERVER_SIDE_PIPELINE', false);
  },

  // ── Debug & Development Flags ──────────────────────────────────────────

  /**
   * Show token classification debug info in console
   * Default: false (only enable in development)
   */
  get debugTokens(): boolean {
    return getDebugFlag('TOKENS');
  },

  /**
   * Show validation agent results in console
   * Default: false (only enable in development)
   */
  get debugValidation(): boolean {
    return getDebugFlag('VALIDATION');
  },

  /**
   * Show state machine transitions in console
   * Default: false (only enable in development)
   */
  get debugStateMachine(): boolean {
    return getDebugFlag('STATE_MACHINE');
  },

  // ── Helper Methods ───────────────────────────────────────────────────

  /**
   * Generic flag getter with default value support (using isomorphic env)
   * @deprecated Use specific flag properties instead for type safety
   */
  getFlag(key: string, defaultValue: boolean = false): boolean {
    return getFlag(key.toUpperCase(), defaultValue);
  },
} as const;
