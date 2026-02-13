/**
 * Conversation Module
 * 
 * State machine and management for multi-turn conversations.
 * 
 * @module services/conversation
 */

// State Machine
export {
  ConversationStateMachine,
  createInitialContext,
  inferTriggerFromMessage,
  getValidTransitions,
  STATE_DEFINITIONS,
  TRANSITION_RULES,
  GLOBAL_TRIGGERS,
  type ConversationState,
  type ConversationContext,
  type TransitionTrigger,
  type StateMetadata,
} from './stateMachine';

// State Manager
export {
  StateManager,
  createStateManager,
  analyzeMessageForTransition,
  type StateSuggestions,
  type StateManagerConfig,
} from './stateManager';

// Turn Counter (wiring previously unexported)
export {
  createTurnCounter,
  incrementTurn,
  getTurnBehavior,
  shouldShowMicroPlan,
  shouldOfferEscalation,
  getTurnPromptContext,
  getPhaseFromTurn,
  TURN_THRESHOLDS,
  PHASE_BEHAVIORS,
  type TurnPhase,
  type TurnBehavior,
  type TurnCounterState,
} from './turnCounter';

// Micro Plan Generator (wiring previously unexported)
export {
  generatePlan,
  advanceStep,
  abandonPlan,
  getPlanPromptContext,
  formatPlanForUser,
  PLAN_TEMPLATES,
  type MicroPlan,
  type MicroPlanStep,
  type PlanTemplate,
} from './microPlanGenerator';

// Blocking Info Detector (wiring previously unexported)
export {
  detectBlockingInfo,
  getBlockingInfoPrompt,
  hasBlockingDependencies,
  BLOCKING_INFO_PATTERNS,
  type BlockingInfoType,
  type BlockingInfoResult,
} from './blockingInfoDetector';

// Resolution Tracker (wiring previously unexported)
export {
  createResolutionTracker,
  recordProgress,
  isResolved,
  getResolutionPromptContext,
  type ResolutionStatus,
  type ResolutionProgress,
  type ResolutionTrackerState,
} from './resolutionTracker';
