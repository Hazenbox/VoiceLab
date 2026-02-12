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

  /** Role-based persona auto-configuration (channel, warmth, prompt personality) */
  get persona(): boolean {
    return import.meta.env.VITE_ENABLE_PERSONA === 'true';
  },

  /** Dynamic knowledge retrieval from Convex (avoid words, vocabulary, auto-fix) */
  get knowledgeBase(): boolean {
    return import.meta.env.VITE_ENABLE_KNOWLEDGE_BASE === 'true';
  },

  /** Learning from user feedback (edits, thumbs down, comments injected into prompt) */
  get learning(): boolean {
    return import.meta.env.VITE_ENABLE_LEARNING === 'true';
  },

  /** Conversational-first mode: general-purpose assistant with conditional Jio guardrails */
  get conversationalMode(): boolean {
    return import.meta.env.VITE_ENABLE_CONVERSATIONAL_MODE === 'true';
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
