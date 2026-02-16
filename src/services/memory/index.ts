/**
 * Memory Services
 * Exports session and mid-term memory management
 */

// Session Memory (short-term, single session)
export {
  getSessionMemory,
  initSessionMemory,
  updateSessionMemory,
  clearSessionMemory,
  getSessionMemoryTokens,
  formatSessionMemoryForPrompt,
  hasActiveSession,
  getSessionAge,
  extractPrimaryEntity,
  type SessionMemoryTokens,
  type SessionMemoryContext,
} from './sessionMemory';

// Mid-term Memory (cross-session, 7-day)
export {
  createEmptyMemory,
  updateMemory,
  extractMemoryContext,
  formatMemoryForPrompt,
  getContinuationGreeting,
  getMemoryInsights,
  MEMORY_CONFIG,
  type MidTermMemory,
  type JourneyMemory,
  type IntentFrequency,
  type TopicFrequency,
  type EcosystemFrequency,
  type ResolutionMemory,
  type MemoryContext,
} from './midTermMemory';

// Long-Term Memory (Phase 3.3 - 6-12 months, opt-in, Convex-backed)
export {
  createLongTermMemory,
  getLongTermMemory,
  hasOptedIn,
  optIn,
  optOut,
  updateLongTermMemory,
  extractMemoryContext as extractLongTermContext,
  getMemoryPromptSection,
  isStale,
  pruneStaleData,
  fromConvexLearningProfile,
  toConvexUpdate,
  clearCache as clearLongTermCache,
  type LongTermMemory,
  type LongTermMemoryInput,
  type LongTermMemoryContext,
} from './longTermMemory';
