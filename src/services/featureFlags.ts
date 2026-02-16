/**
 * Feature Flags
 * 
 * Centralized feature flag checks for Phase 0-5 features.
 * Reads from VITE_ENABLE_* environment variables.
 * 
 * When a flag is disabled (missing or !== 'true'), the feature gracefully
 * falls back to defaults or is skipped entirely -- no crashes.
 */

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
    const env = import.meta.env.VITE_ENABLE_PERSONA;
    return env !== 'false';
  },

  /** 
   * Dynamic knowledge retrieval from Convex (avoid words, vocabulary, auto-fix)
   * Default: true (core intelligence feature, opt-out)
   * Set VITE_ENABLE_KNOWLEDGE_BASE=false to disable
   */
  get knowledgeBase(): boolean {
    const env = import.meta.env.VITE_ENABLE_KNOWLEDGE_BASE;
    return env !== 'false';
  },

  /** 
   * Learning from user feedback (edits, thumbs down, comments injected into prompt)
   * Default: true (core intelligence feature, opt-out)
   * Set VITE_ENABLE_LEARNING=false to disable
   */
  get learning(): boolean {
    const env = import.meta.env.VITE_ENABLE_LEARNING;
    return env !== 'false';
  },

  /** 
   * Conversational-first mode: general-purpose assistant with conditional Jio guardrails
   * Default: true (core intelligence feature, opt-out)
   * Set VITE_ENABLE_CONVERSATIONAL_MODE=false to disable
   */
  get conversationalMode(): boolean {
    const env = import.meta.env.VITE_ENABLE_CONVERSATIONAL_MODE;
    return env !== 'false';
  },

  // ── Analytics Feature Flags ──────────────────────────────────────────

  /** 
   * Session-level analytics tracking (conversation sessions, metrics)
   * Default: true for comprehensive analytics
   */
  get sessionAnalytics(): boolean {
    const env = import.meta.env.VITE_ENABLE_SESSION_ANALYTICS;
    // Default to true unless explicitly disabled
    return env !== 'false';
  },

  /**
   * Interaction event tracking (copy, regenerate, like, dislike, etc.)
   * Default: true for user behavior insights
   */
  get interactionTracking(): boolean {
    const env = import.meta.env.VITE_ENABLE_INTERACTION_TRACKING;
    // Default to true unless explicitly disabled
    return env !== 'false';
  },

  /**
   * Response time measurement for AI responses
   * Default: true for performance monitoring
   */
  get responseTimeTracking(): boolean {
    const env = import.meta.env.VITE_ENABLE_RESPONSE_TIME_TRACKING;
    // Default to true unless explicitly disabled
    return env !== 'false';
  },

  // ── Learning & Memory Flags ──────────────────────────────────────────

  /**
   * Auto-approve user corrections/feedback for immediate learning
   * Default: true (auto-approve all corrections)
   * Set VITE_AUTO_APPROVE_CORRECTIONS=false to require manual admin approval
   */
  get autoApproveCorrections(): boolean {
    const env = import.meta.env.VITE_AUTO_APPROVE_CORRECTIONS;
    // Default to true unless explicitly disabled
    return env !== 'false';
  },

  // ── Validation Flags ──────────────────────────────────────────────────

  /**
   * P0-FIX: Validate conversational content (general_chat, jio_inquiry)
   * Previously, conversational path bypassed ALL validation - this is a security risk.
   * Default: true (validate all content)
   * Set VITE_VALIDATE_CONVERSATIONAL=false to disable (not recommended)
   */
  get validateConversational(): boolean {
    const env = import.meta.env.VITE_VALIDATE_CONVERSATIONAL;
    // Default to true unless explicitly disabled
    return env !== 'false';
  },

  // ── Constitutional AI Flags ────────────────────────────────────────────

  /**
   * Enable safety gate pre-generation check
   * Checks user input for safety concerns before LLM generation
   * Default: true (safety first)
   */
  get safetyGate(): boolean {
    const env = import.meta.env.VITE_ENABLE_SAFETY_GATE;
    return env !== 'false';
  },

  /**
   * Enable constitutional wrapper for generation
   * Applies token classification, directive loading, state management
   * Default: true
   */
  get constitutionalWrapper(): boolean {
    const env = import.meta.env.VITE_ENABLE_CONSTITUTIONAL_WRAPPER;
    return env !== 'false';
  },

  /**
   * Enable post-generation validation agents
   * Runs voice traits, emotion, pattern block, and self-check validations
   * Default: true
   */
  get validationAgents(): boolean {
    const env = import.meta.env.VITE_ENABLE_VALIDATION_AGENTS;
    return env !== 'false';
  },

  /**
   * Enable conversation state machine
   * Tracks multi-turn conversation state and provides state-aware suggestions
   * Default: true
   */
  get conversationState(): boolean {
    const env = import.meta.env.VITE_ENABLE_CONVERSATION_STATE;
    return env !== 'false';
  },

  /**
   * Enable handoff trigger detection
   * Detects when conversation should escalate to human support
   * Default: true
   */
  get handoffDetection(): boolean {
    const env = import.meta.env.VITE_ENABLE_HANDOFF_DETECTION;
    return env !== 'false';
  },

  // ── RAG Enhancement Flags ──────────────────────────────────────────────

  /**
   * Enable query expansion with Jio synonyms
   * Expands search queries with related terms for better recall
   * Default: true
   */
  get ragQueryExpansion(): boolean {
    const env = import.meta.env.VITE_ENABLE_RAG_QUERY_EXPANSION;
    return env !== 'false';
  },

  /**
   * Enable result ranking with recency/relevance scoring
   * Re-ranks vector search results based on multiple factors
   * Default: true
   */
  get ragResultRanking(): boolean {
    const env = import.meta.env.VITE_ENABLE_RAG_RESULT_RANKING;
    return env !== 'false';
  },

  /**
   * Enable RAG resilience (retry, circuit breaker)
   * Adds fault tolerance to RAG operations
   * Default: true
   */
  get ragResilience(): boolean {
    const env = import.meta.env.VITE_ENABLE_RAG_RESILIENCE;
    return env !== 'false';
  },

  // ── Learning Enhancement Flags ─────────────────────────────────────────

  /**
   * Enable correction weighting (recency + frequency decay)
   * Weights corrections by age and frequency for smarter learning
   * Default: true
   */
  get correctionWeighting(): boolean {
    const env = import.meta.env.VITE_ENABLE_CORRECTION_WEIGHTING;
    return env !== 'false';
  },

  /**
   * Enable user learning profiles
   * Aggregates user preferences across sessions for personalization
   * Default: true
   */
  get userLearningProfiles(): boolean {
    const env = import.meta.env.VITE_ENABLE_USER_LEARNING_PROFILES;
    return env !== 'false';
  },

  /**
   * Enable admin rejection sync
   * Syncs admin-rejected corrections to local cache to prevent re-use
   * Default: true
   */
  get adminRejectionSync(): boolean {
    const env = import.meta.env.VITE_ENABLE_ADMIN_REJECTION_SYNC;
    return env !== 'false';
  },

  // ── Token Management Flags ─────────────────────────────────────────────

  /**
   * Enable token classification
   * Classifies user input into 14 token categories
   * Default: true
   */
  get tokenClassification(): boolean {
    const env = import.meta.env.VITE_ENABLE_TOKEN_CLASSIFICATION;
    return env !== 'false';
  },

  /**
   * Enable selective directive loading
   * Loads only relevant directives (5-10) instead of full rule set
   * Default: true (reduces prompt size)
   */
  get selectiveDirectives(): boolean {
    const env = import.meta.env.VITE_ENABLE_SELECTIVE_DIRECTIVES;
    return env !== 'false';
  },

  // ── Emergency & Safety Flags ───────────────────────────────────────────

  /**
   * Enable emergency response templates
   * Uses pre-defined responses for critical safety situations
   * Default: true (NEVER disable in production)
   */
  get emergencyResponses(): boolean {
    const env = import.meta.env.VITE_ENABLE_EMERGENCY_RESPONSES;
    return env !== 'false';
  },

  /**
   * Log safety events for review
   * Logs detected safety concerns for admin review
   * Default: true
   */
  get safetyLogging(): boolean {
    const env = import.meta.env.VITE_ENABLE_SAFETY_LOGGING;
    return env !== 'false';
  },

  // ── Debug & Development Flags ──────────────────────────────────────────

  /**
   * Show token classification debug info in console
   * Default: false (only enable in development)
   */
  get debugTokens(): boolean {
    return import.meta.env.VITE_DEBUG_TOKENS === 'true';
  },

  /**
   * Show validation agent results in console
   * Default: false (only enable in development)
   */
  get debugValidation(): boolean {
    return import.meta.env.VITE_DEBUG_VALIDATION === 'true';
  },

  /**
   * Show state machine transitions in console
   * Default: false (only enable in development)
   */
  get debugStateMachine(): boolean {
    return import.meta.env.VITE_DEBUG_STATE_MACHINE === 'true';
  },

  // ── Helper Methods ───────────────────────────────────────────────────

  /**
   * Generic flag getter with default value support
   */
  getFlag(key: string, defaultValue: boolean = false): boolean {
    const envKey = `VITE_ENABLE_${key.toUpperCase()}`;
    const env = import.meta.env[envKey];
    
    if (env === undefined) return defaultValue;
    if (env === 'true') return true;
    if (env === 'false') return false;
    return defaultValue;
  },
} as const;
