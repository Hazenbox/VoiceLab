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
  /** Background sync of profiles, analytics, corrections to Convex */
  get convexSync(): boolean {
    return import.meta.env.VITE_ENABLE_CONVEX_SYNC === 'true';
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
} as const;
