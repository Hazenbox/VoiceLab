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
  // Turn count adaptation (Phase D)
  getTurnCountAdaptation,
  getTurnCountGuidanceText,
  // Transition tracking (Phase D)
  getConversationTransition,
  getTransitionGuidance,
  // Resolution status inference (Phase D)
  inferResolutionStatus,
  getResolutionStatusGuidance,
  analyzeConversationState,
  type StateSuggestions,
  type StateManagerConfig,
  type TransitionDescriptor,
  type ResolutionStatus as ManagerResolutionStatus,
} from './stateManager';

// Turn Counter (wiring previously unexported)
export {
  createTurnCounter,
  incrementTurn,
  getTurnBehavior,
  getTurnPhase,
  canAskQuestion,
  shouldSummarizeProgress,
  shouldHintEscalation,
  isConversationProlonged,
  isOpeningPhase,
  getPatienceGuidance,
  buildTurnContextPrompt,
  getTurnStats,
  estimateRemainingTurns,
  TURN_THRESHOLDS,
  PHASE_BEHAVIORS,
  type TurnPhase,
  type TurnBehavior,
  type TurnCounterState,
} from './turnCounter';

// Micro Plan Generator (wiring previously unexported)
export {
  findMatchingTemplate,
  generateMicroPlan,
  createCustomPlan,
  startPlan,
  completeStep,
  skipStep,
  abandonPlan,
  formatPlanForUser,
  formatPlanForPrompt,
  getCurrentStepSummary,
  currentStepNeedsUserAction,
  getPlanProgress,
  PLAN_TEMPLATES,
  type MicroPlan,
  type MicroPlanStep,
  type PlanTemplate,
} from './microPlanGenerator';

// Blocking Info Detector (wiring previously unexported)
export {
  detectBlockingInfo,
  formatBlockingInfoForPrompt,
  isFieldNeeded,
  shouldAskForInfo,
  getNextQuestion,
  type InfoType,
  type BlockingStatus,
  type InfoNeed,
  type BlockingDetectionResult,
  type DetectionContext,
} from './blockingInfoDetector';

// Resolution Tracker (wiring previously unexported)
export {
  createResolutionTracker,
  updateResolutionStatus,
  detectResolutionSignals,
  inferResolutionAction,
  getResolutionPromptContext,
  shouldSuggestEscalation,
  getResolutionSummary,
  isValidTransition,
  RESOLUTION_CONFIG,
  type ResolutionStatus,
  type ResolutionTracker,
  type ResolutionEvent,
  type ResolutionAction,
  type ResolutionActionType,
} from './resolutionTracker';
