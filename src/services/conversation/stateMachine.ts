/**
 * Conversation State Machine
 * 
 * Manages conversation flow through 8 defined states with
 * explicit transitions and validation.
 * 
 * States aligned with Jio constitutional framework:
 * - opening: Initial greeting / context setting
 * - information_gathering: Collecting user needs
 * - processing: Analyzing and preparing response
 * - resolution: Providing solution / answer
 * - confirmation: Verifying user satisfaction
 * - escalation: Handling complex cases or handoff
 * - closing: Ending conversation gracefully
 * - error: Handling failures / edge cases
 * 
 * @module services/conversation/stateMachine
 */

import type { NavarasaEmotion } from '../constitutional/coreRules';

// ═══════════════════════════════════════════════════════════════════════════════
// STATE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The 8 conversation states
 */
export type ConversationState = 
  | 'opening'
  | 'information_gathering'
  | 'processing'
  | 'resolution'
  | 'confirmation'
  | 'escalation'
  | 'closing'
  | 'error';

/**
 * Transition triggers
 */
export type TransitionTrigger =
  | 'user_message'
  | 'user_confirmation'
  | 'user_rejection'
  | 'user_question'
  | 'user_escalation_request'
  | 'system_ready'
  | 'system_error'
  | 'timeout'
  | 'max_turns_reached'
  | 'resolution_complete'
  | 'need_more_info'
  | 'safety_concern';

/**
 * State metadata
 */
export interface StateMetadata {
  name: ConversationState;
  description: string;
  allowedTriggers: TransitionTrigger[];
  maxDuration: number; // seconds before auto-transition
  suggestedPatternBlocks: string[];
  requiredActions: string[];
}

/**
 * Full state definitions
 */
export const STATE_DEFINITIONS: Record<ConversationState, StateMetadata> = {
  opening: {
    name: 'opening',
    description: 'Initial greeting and context setting',
    allowedTriggers: ['user_message', 'system_ready'],
    maxDuration: 30,
    suggestedPatternBlocks: ['acknowledge'],
    requiredActions: ['greet', 'set_context'],
  },
  information_gathering: {
    name: 'information_gathering',
    description: 'Collecting user needs and requirements',
    allowedTriggers: ['user_message', 'user_question', 'timeout', 'max_turns_reached'],
    maxDuration: 120,
    suggestedPatternBlocks: ['acknowledge', 'clarify'],
    requiredActions: ['ask_question', 'listen'],
  },
  processing: {
    name: 'processing',
    description: 'Analyzing input and preparing response',
    allowedTriggers: ['system_ready', 'system_error', 'need_more_info'],
    maxDuration: 60,
    suggestedPatternBlocks: ['empathize'],
    requiredActions: ['analyze', 'retrieve_knowledge'],
  },
  resolution: {
    name: 'resolution',
    description: 'Providing solution or answer to user',
    allowedTriggers: ['user_confirmation', 'user_rejection', 'user_question', 'timeout'],
    maxDuration: 90,
    suggestedPatternBlocks: ['inform', 'guide', 'reassure'],
    requiredActions: ['provide_answer', 'explain'],
  },
  confirmation: {
    name: 'confirmation',
    description: 'Verifying user satisfaction',
    allowedTriggers: ['user_confirmation', 'user_rejection', 'user_question', 'timeout'],
    maxDuration: 60,
    suggestedPatternBlocks: ['nextStep'],
    requiredActions: ['ask_satisfaction', 'offer_more_help'],
  },
  escalation: {
    name: 'escalation',
    description: 'Handling complex cases or human handoff',
    allowedTriggers: ['user_confirmation', 'system_ready', 'timeout'],
    maxDuration: 120,
    suggestedPatternBlocks: ['acknowledge', 'reassure', 'inform'],
    requiredActions: ['explain_handoff', 'collect_contact'],
  },
  closing: {
    name: 'closing',
    description: 'Ending conversation gracefully',
    allowedTriggers: ['user_message', 'timeout'],
    maxDuration: 30,
    suggestedPatternBlocks: ['nextStep', 'nudge'],
    requiredActions: ['thank', 'summarize'],
  },
  error: {
    name: 'error',
    description: 'Handling failures and edge cases',
    allowedTriggers: ['user_message', 'system_ready', 'user_escalation_request'],
    maxDuration: 60,
    suggestedPatternBlocks: ['acknowledge', 'empathize', 'reassure'],
    requiredActions: ['apologize', 'offer_alternatives'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valid transitions between states
 */
export const TRANSITION_RULES: Record<ConversationState, Partial<Record<TransitionTrigger, ConversationState>>> = {
  opening: {
    user_message: 'information_gathering',
    system_ready: 'information_gathering',
  },
  information_gathering: {
    user_message: 'processing',
    user_question: 'information_gathering', // Stay for follow-up
    timeout: 'resolution', // Try to resolve with available info
    max_turns_reached: 'resolution',
  },
  processing: {
    system_ready: 'resolution',
    system_error: 'error',
    need_more_info: 'information_gathering',
  },
  resolution: {
    user_confirmation: 'confirmation',
    user_rejection: 'information_gathering', // Retry
    user_question: 'information_gathering', // Need more info
    timeout: 'closing',
  },
  confirmation: {
    user_confirmation: 'closing',
    user_rejection: 'information_gathering',
    user_question: 'information_gathering',
    timeout: 'closing',
  },
  escalation: {
    user_confirmation: 'closing',
    system_ready: 'closing', // Handoff complete
    timeout: 'closing',
  },
  closing: {
    user_message: 'opening', // New conversation
    timeout: 'closing', // Stay closed
  },
  error: {
    user_message: 'information_gathering', // Try again
    system_ready: 'resolution', // Recovered
    user_escalation_request: 'escalation',
  },
};

/**
 * Global triggers that can happen from any state
 */
export const GLOBAL_TRIGGERS: Partial<Record<TransitionTrigger, ConversationState>> = {
  user_escalation_request: 'escalation',
  safety_concern: 'escalation',
  system_error: 'error',
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATE MACHINE CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConversationContext {
  /** Current state */
  state: ConversationState;
  /** Previous state */
  previousState: ConversationState | null;
  /** State entry timestamp */
  stateEnteredAt: number;
  /** Total turns in conversation */
  turnCount: number;
  /** Turns in current state */
  stateTurnCount: number;
  /** Current detected emotion */
  userEmotion: NavarasaEmotion | null;
  /** Safety level of conversation */
  safetyLevel: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  /** Whether escalation has been offered */
  escalationOffered: boolean;
  /** User satisfaction signals */
  satisfactionSignals: Array<'positive' | 'negative' | 'neutral'>;
  /** Current conversation topic */
  topic: string | null;
  /** Error count in this conversation */
  errorCount: number;
  /** Metadata for state-specific data */
  metadata: Record<string, unknown>;
}

/**
 * Create initial context
 */
export function createInitialContext(): ConversationContext {
  return {
    state: 'opening',
    previousState: null,
    stateEnteredAt: Date.now(),
    turnCount: 0,
    stateTurnCount: 0,
    userEmotion: 'shanta',
    safetyLevel: 'none',
    escalationOffered: false,
    satisfactionSignals: [],
    topic: null,
    errorCount: 0,
    metadata: {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE MACHINE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ConversationStateMachine {
  private context: ConversationContext;
  private transitionListeners: Array<(from: ConversationState, to: ConversationState, trigger: TransitionTrigger) => void> = [];

  constructor(initialContext?: Partial<ConversationContext>) {
    this.context = {
      ...createInitialContext(),
      ...initialContext,
    };
  }

  /**
   * Get current state
   */
  getState(): ConversationState {
    return this.context.state;
  }

  /**
   * Get full context
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Get state metadata
   */
  getStateMetadata(): StateMetadata {
    return STATE_DEFINITIONS[this.context.state];
  }

  /**
   * Check if a trigger is valid from current state
   */
  canTransition(trigger: TransitionTrigger): boolean {
    // Check global triggers
    if (GLOBAL_TRIGGERS[trigger]) return true;
    
    // Check state-specific triggers
    return !!TRANSITION_RULES[this.context.state][trigger];
  }

  /**
   * Get next state for a trigger (without transitioning)
   */
  getNextState(trigger: TransitionTrigger): ConversationState | null {
    // Global triggers take precedence
    if (GLOBAL_TRIGGERS[trigger]) {
      return GLOBAL_TRIGGERS[trigger] ?? null;
    }
    
    // State-specific transition
    return TRANSITION_RULES[this.context.state][trigger] ?? null;
  }

  /**
   * Attempt transition
   */
  transition(trigger: TransitionTrigger): { success: boolean; newState: ConversationState | null; error?: string } {
    const nextState = this.getNextState(trigger);
    
    if (!nextState) {
      return {
        success: false,
        newState: null,
        error: `Invalid transition: ${trigger} from state ${this.context.state}`,
      };
    }

    const previousState = this.context.state;
    
    // Update context
    this.context.previousState = previousState;
    this.context.state = nextState;
    this.context.stateEnteredAt = Date.now();
    this.context.stateTurnCount = 0;
    this.context.turnCount++;

    // Notify listeners
    for (const listener of this.transitionListeners) {
      try {
        listener(previousState, nextState, trigger);
      } catch (e) {
        console.error('[StateMachine] Listener error:', e);
      }
    }

    return { success: true, newState: nextState };
  }

  /**
   * Increment turn count
   */
  incrementTurn(): void {
    this.context.turnCount++;
    this.context.stateTurnCount++;
  }

  /**
   * Update user emotion
   */
  setUserEmotion(emotion: NavarasaEmotion): void {
    this.context.userEmotion = emotion;
  }

  /**
   * Update safety level
   */
  setSafetyLevel(level: ConversationContext['safetyLevel']): void {
    this.context.safetyLevel = level;
  }

  /**
   * Record satisfaction signal
   */
  addSatisfactionSignal(signal: 'positive' | 'negative' | 'neutral'): void {
    this.context.satisfactionSignals.push(signal);
  }

  /**
   * Set conversation topic
   */
  setTopic(topic: string): void {
    this.context.topic = topic;
  }

  /**
   * Mark escalation as offered
   */
  markEscalationOffered(): void {
    this.context.escalationOffered = true;
  }

  /**
   * Increment error count
   */
  incrementErrorCount(): void {
    this.context.errorCount++;
  }

  /**
   * Set metadata
   */
  setMetadata(key: string, value: unknown): void {
    this.context.metadata[key] = value;
  }

  /**
   * Get metadata
   */
  getMetadata<T>(key: string): T | undefined {
    return this.context.metadata[key] as T | undefined;
  }

  /**
   * Add transition listener
   */
  onTransition(listener: (from: ConversationState, to: ConversationState, trigger: TransitionTrigger) => void): () => void {
    this.transitionListeners.push(listener);
    return () => {
      const index = this.transitionListeners.indexOf(listener);
      if (index > -1) {
        this.transitionListeners.splice(index, 1);
      }
    };
  }

  /**
   * Check if state has timed out
   */
  isStateTimedOut(): boolean {
    const metadata = this.getStateMetadata();
    const elapsed = (Date.now() - this.context.stateEnteredAt) / 1000;
    return elapsed > metadata.maxDuration;
  }

  /**
   * Get time remaining in current state
   */
  getTimeRemaining(): number {
    const metadata = this.getStateMetadata();
    const elapsed = (Date.now() - this.context.stateEnteredAt) / 1000;
    return Math.max(0, metadata.maxDuration - elapsed);
  }

  /**
   * Get suggested pattern blocks for current state
   */
  getSuggestedPatternBlocks(): string[] {
    return this.getStateMetadata().suggestedPatternBlocks;
  }

  /**
   * Get required actions for current state
   */
  getRequiredActions(): string[] {
    return this.getStateMetadata().requiredActions;
  }

  /**
   * Check if conversation should escalate
   */
  shouldEscalate(): boolean {
    // Escalate if safety concern
    if (this.context.safetyLevel === 'high' || this.context.safetyLevel === 'critical') {
      return true;
    }
    
    // Escalate if too many errors
    if (this.context.errorCount >= 3) {
      return true;
    }
    
    // Escalate if too many negative signals
    const negativeCount = this.context.satisfactionSignals.filter(s => s === 'negative').length;
    if (negativeCount >= 2) {
      return true;
    }
    
    // Escalate if too many turns without resolution
    if (this.context.turnCount >= 10 && this.context.state !== 'closing') {
      return true;
    }
    
    return false;
  }

  /**
   * Serialize context for persistence
   */
  serialize(): string {
    return JSON.stringify(this.context);
  }

  /**
   * Restore from serialized context
   * Returns null if serialized data is corrupted
   */
  static deserialize(serialized: string): ConversationStateMachine | null {
    try {
      const context = JSON.parse(serialized) as ConversationContext;
      return new ConversationStateMachine(context);
    } catch (error) {
      console.error('[ConversationStateMachine] Failed to deserialize corrupted data:', error);
      return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine trigger from user message analysis
 */
export function inferTriggerFromMessage(
  messageAnalysis: {
    isQuestion: boolean;
    isConfirmation: boolean;
    isRejection: boolean;
    isEscalationRequest: boolean;
    hasSafetyConcern: boolean;
  }
): TransitionTrigger {
  if (messageAnalysis.hasSafetyConcern) return 'safety_concern';
  if (messageAnalysis.isEscalationRequest) return 'user_escalation_request';
  if (messageAnalysis.isConfirmation) return 'user_confirmation';
  if (messageAnalysis.isRejection) return 'user_rejection';
  if (messageAnalysis.isQuestion) return 'user_question';
  return 'user_message';
}

/**
 * Get all valid transitions from current state
 */
export function getValidTransitions(state: ConversationState): TransitionTrigger[] {
  const stateTransitions = Object.keys(TRANSITION_RULES[state]) as TransitionTrigger[];
  const globalTransitions = Object.keys(GLOBAL_TRIGGERS) as TransitionTrigger[];
  
  return [...new Set([...stateTransitions, ...globalTransitions])];
}
