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
