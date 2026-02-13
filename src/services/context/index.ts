/**
 * Context Services
 * 
 * Exports all context-related functionality for the Content Trust System.
 * 
 * @module services/context
 */

// Timing Engine
export {
  type TimeOfDay,
  type DayOfWeek,
  type Festival,
  type SpecialEvent,
  type TimeGuidance,
  type DayGuidance,
  FESTIVALS,
  SPECIAL_EVENTS,
  TIME_GUIDANCE,
  DAY_GUIDANCE,
  getTimeOfDay,
  getDayOfWeek,
  detectFestival,
  getTimingContext,
  getTimingGuidance,
  allowsPromotionalContent,
  isOptimalEngagementTime,
} from './timingEngine';

// Context Engine
export {
  type TriggerEvent,
  type ContextBuilderOptions,
  classifyTriggerEvent,
  getTriggerEventGuidance,
  buildGenerationContext,
  getContextSummary,
  validateContext,
} from './contextEngine';

// Context Manager (Token Overflow Prevention)
export {
  ContextManager,
  getContextManager,
  processContext,
  createMessageTruncator,
  CONTEXT_MANAGER_CONFIG,
  type Message,
  type ContextManagerInput,
  type ContextManagerResult,
  type TruncationEvent,
} from './contextManager';
