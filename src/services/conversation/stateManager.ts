/**
 * State Manager
 * 
 * Manages conversation state persistence and provides
 * state-aware suggestions for the generation process.
 * 
 * Integrates with:
 * - Convex conversationStates table for persistence
 * - Constitutional rules for behavior
 * - Safety gate for risk-aware state management
 * 
 * @module services/conversation/stateManager
 */

import {
  ConversationStateMachine,
  createInitialContext,
  inferTriggerFromMessage,
  type ConversationState,
  type ConversationContext,
  type TransitionTrigger,
  STATE_DEFINITIONS,
} from './stateMachine';
import { 
  NAVARASA, 
  PATTERN_BLOCKS, 
  WARMTH_SCALE,
  type NavarasaEmotion,
  type PatternBlock,
} from '../constitutional/coreRules';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StateSuggestions {
  /** Recommended pattern blocks for this state */
  patternBlocks: PatternBlock[];
  /** Recommended warmth level (1-4) */
  warmthLevel: number;
  /** Recommended detail level (1-3) */
  detailLevel: number;
  /** Target emotion to guide user toward */
  targetEmotion: NavarasaEmotion;
  /** Specific action suggestions */
  actions: string[];
  /** Opening phrase suggestions */
  openingPhrases: string[];
  /** Closing phrase suggestions */
  closingPhrases: string[];
  /** Whether to offer escalation */
  offerEscalation: boolean;
  /** Whether to include nudge (ecosystem suggestion) */
  includeNudge: boolean;
}

export interface StateManagerConfig {
  /** Session ID for persistence */
  sessionId?: string;
  /** User ID for personalization */
  userId?: string;
  /** Ecosystem context */
  ecosystem?: string;
  /** Channel context */
  channel?: string;
  /** Enable auto-persistence */
  autoPersist?: boolean;
  /** Persistence callback */
  onPersist?: (context: ConversationContext) => Promise<void>;
  /** State change callback */
  onStateChange?: (from: ConversationState, to: ConversationState, trigger: TransitionTrigger) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE SUGGESTIONS MAP
// ═══════════════════════════════════════════════════════════════════════════════

const STATE_SUGGESTIONS: Record<ConversationState, Partial<StateSuggestions>> = {
  opening: {
    patternBlocks: ['acknowledge'],
    warmthLevel: 3,
    detailLevel: 2,
    targetEmotion: 'shanta',
    openingPhrases: [
      'Hello! How can I help you today?',
      'Welcome! What can I assist you with?',
      'Hi there! I\'m here to help.',
    ],
    includeNudge: false,
    offerEscalation: false,
  },
  information_gathering: {
    patternBlocks: ['acknowledge', 'clarify'],
    warmthLevel: 2,
    detailLevel: 2,
    targetEmotion: 'shanta',
    actions: ['ask_clarifying_question', 'confirm_understanding'],
    openingPhrases: [
      'To help you better, could you tell me...',
      'I want to make sure I understand correctly...',
      'Just to clarify...',
    ],
    includeNudge: false,
    offerEscalation: false,
  },
  processing: {
    patternBlocks: ['empathize'],
    warmthLevel: 2,
    detailLevel: 1,
    targetEmotion: 'shanta',
    actions: ['acknowledge_processing', 'set_expectations'],
    openingPhrases: [
      'Let me look into that for you.',
      'I\'m checking on this now.',
      'Give me a moment to find the best solution.',
    ],
    includeNudge: false,
    offerEscalation: false,
  },
  resolution: {
    patternBlocks: ['inform', 'guide', 'reassure'],
    warmthLevel: 3,
    detailLevel: 2,
    targetEmotion: 'veera',
    actions: ['provide_solution', 'explain_steps', 'confirm_action'],
    openingPhrases: [
      'Here\'s what I found...',
      'I have a solution for you.',
      'You can resolve this by...',
    ],
    closingPhrases: [
      'Does this help?',
      'Is there anything else you\'d like to know?',
      'Let me know if you need any clarification.',
    ],
    includeNudge: false,
    offerEscalation: false,
  },
  confirmation: {
    patternBlocks: ['nextStep'],
    warmthLevel: 3,
    detailLevel: 1,
    targetEmotion: 'shanta',
    actions: ['ask_satisfaction', 'offer_more_help'],
    openingPhrases: [
      'Did that solve your issue?',
      'Was this helpful?',
      'Is there anything else I can help with?',
    ],
    includeNudge: true,
    offerEscalation: true,
  },
  escalation: {
    patternBlocks: ['acknowledge', 'empathize', 'reassure', 'inform'],
    warmthLevel: 3,
    detailLevel: 2,
    targetEmotion: 'shanta',
    actions: ['explain_handoff', 'collect_contact', 'set_expectations'],
    openingPhrases: [
      'I understand this needs more attention.',
      'Let me connect you with someone who can help better.',
      'I want to make sure you get the best support.',
    ],
    includeNudge: false,
    offerEscalation: false,
  },
  closing: {
    patternBlocks: ['nextStep', 'nudge'],
    warmthLevel: 4,
    detailLevel: 1,
    targetEmotion: 'hasya',
    actions: ['thank_user', 'summarize', 'offer_future_help'],
    openingPhrases: [
      'Great! I\'m glad I could help.',
      'Happy to assist!',
      'Wonderful! Take care.',
    ],
    closingPhrases: [
      'Feel free to reach out anytime.',
      'We\'re always here to help.',
      'Have a great day!',
    ],
    includeNudge: true,
    offerEscalation: false,
  },
  error: {
    patternBlocks: ['acknowledge', 'empathize', 'reassure'],
    warmthLevel: 3,
    detailLevel: 2,
    targetEmotion: 'shanta',
    actions: ['apologize', 'explain_issue', 'offer_alternatives'],
    openingPhrases: [
      'I apologize for the inconvenience.',
      'I\'m sorry that didn\'t work as expected.',
      'Let me try a different approach.',
    ],
    includeNudge: false,
    offerEscalation: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION-AWARE ADJUSTMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adjust suggestions based on detected user emotion
 */
function adjustForEmotion(
  suggestions: StateSuggestions,
  emotion: NavarasaEmotion
): StateSuggestions {
  const emotionConfig = NAVARASA[emotion];
  const adjusted = { ...suggestions };

  switch (emotion) {
    case 'raudra': // Angry/frustrated
      adjusted.warmthLevel = 3; // Reassuring
      adjusted.targetEmotion = 'shanta';
      adjusted.patternBlocks = ['acknowledge', 'empathize', ...suggestions.patternBlocks];
      adjusted.openingPhrases = [
        'I understand your frustration.',
        'I apologize for any inconvenience.',
        'Let me help resolve this for you.',
      ];
      break;

    case 'karuna': // Sad/compassionate
      adjusted.warmthLevel = 3; // Reassuring
      adjusted.detailLevel = Math.max(1, suggestions.detailLevel - 1); // Simpler
      adjusted.targetEmotion = 'shanta';
      adjusted.openingPhrases = [
        'I\'m sorry you\'re going through this.',
        'I understand, and I\'m here to help.',
        'Let\'s work through this together.',
      ];
      break;

    case 'bhayanaka': // Fear/anxiety
      adjusted.warmthLevel = 3; // Reassuring
      adjusted.targetEmotion = 'shanta';
      adjusted.patternBlocks = ['reassure', ...suggestions.patternBlocks];
      adjusted.openingPhrases = [
        'Don\'t worry, we\'ll get this sorted out.',
        'Your data is safe, let me explain...',
        'I understand your concern. Here\'s what we can do...',
      ];
      break;

    case 'hasya': // Joy/playfulness
      adjusted.warmthLevel = 4; // Celebratory
      adjusted.targetEmotion = 'hasya';
      break;

    case 'veera': // Confidence/ambition
      adjusted.targetEmotion = 'veera';
      adjusted.detailLevel = 2; // Standard detail
      break;

    case 'adbhuta': // Curiosity/wonder
      adjusted.detailLevel = 3; // More detail for curious users
      adjusted.targetEmotion = 'adbhuta';
      break;

    default:
      // shanta, bibhatsa, shringara - keep defaults
      break;
  }

  return adjusted;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class StateManager {
  private machine: ConversationStateMachine;
  private config: StateManagerConfig;
  private persistTimer: NodeJS.Timeout | null = null;

  constructor(config: StateManagerConfig = {}, initialContext?: Partial<ConversationContext>) {
    this.config = config;
    this.machine = new ConversationStateMachine(initialContext);

    // Set up state change listener
    this.machine.onTransition((from, to, trigger) => {
      if (this.config.onStateChange) {
        this.config.onStateChange(from, to, trigger);
      }
      if (this.config.autoPersist) {
        this.schedulePersist();
      }
    });
  }

  /**
   * Get current state
   */
  getState(): ConversationState {
    return this.machine.getState();
  }

  /**
   * Get full context
   */
  getContext(): ConversationContext {
    return this.machine.getContext();
  }

  /**
   * Get suggestions for current state
   */
  getSuggestions(): StateSuggestions {
    const state = this.machine.getState();
    const context = this.machine.getContext();
    const baseSuggestions = STATE_SUGGESTIONS[state];

    // Build full suggestions with defaults
    let suggestions: StateSuggestions = {
      patternBlocks: (baseSuggestions.patternBlocks || ['acknowledge', 'inform', 'nextStep']) as PatternBlock[],
      warmthLevel: baseSuggestions.warmthLevel ?? 2,
      detailLevel: baseSuggestions.detailLevel ?? 2,
      targetEmotion: (baseSuggestions.targetEmotion ?? 'shanta') as NavarasaEmotion,
      actions: baseSuggestions.actions || STATE_DEFINITIONS[state].requiredActions,
      openingPhrases: baseSuggestions.openingPhrases || [],
      closingPhrases: baseSuggestions.closingPhrases || [],
      offerEscalation: baseSuggestions.offerEscalation ?? this.machine.shouldEscalate(),
      includeNudge: baseSuggestions.includeNudge ?? false,
    };

    // Adjust for user emotion
    if (context.userEmotion) {
      suggestions = adjustForEmotion(suggestions, context.userEmotion);
    }

    // Adjust for safety level
    if (context.safetyLevel === 'high' || context.safetyLevel === 'critical') {
      suggestions.warmthLevel = Math.min(2, suggestions.warmthLevel); // Cap warmth
      suggestions.includeNudge = false; // No nudging in sensitive situations
      suggestions.offerEscalation = true;
    }

    return suggestions;
  }

  /**
   * Process user message and transition state
   */
  processMessage(analysis: {
    isQuestion: boolean;
    isConfirmation: boolean;
    isRejection: boolean;
    isEscalationRequest: boolean;
    hasSafetyConcern: boolean;
    detectedEmotion?: NavarasaEmotion;
    safetyLevel?: ConversationContext['safetyLevel'];
  }): { transitioned: boolean; newState: ConversationState; suggestions: StateSuggestions } {
    // Update emotion if detected
    if (analysis.detectedEmotion) {
      this.machine.setUserEmotion(analysis.detectedEmotion);
    }

    // Update safety level
    if (analysis.safetyLevel) {
      this.machine.setSafetyLevel(analysis.safetyLevel);
    }

    // Infer trigger from analysis
    const trigger = inferTriggerFromMessage(analysis);

    // Attempt transition
    const result = this.machine.transition(trigger);

    // Increment turn
    this.machine.incrementTurn();

    return {
      transitioned: result.success,
      newState: this.machine.getState(),
      suggestions: this.getSuggestions(),
    };
  }

  /**
   * Handle system events
   */
  handleSystemEvent(event: 'ready' | 'error' | 'timeout' | 'max_turns'): void {
    const triggerMap: Record<string, TransitionTrigger> = {
      ready: 'system_ready',
      error: 'system_error',
      timeout: 'timeout',
      max_turns: 'max_turns_reached',
    };

    const trigger = triggerMap[event];
    if (trigger) {
      this.machine.transition(trigger);
    }

    if (event === 'error') {
      this.machine.incrementErrorCount();
    }
  }

  /**
   * Record user satisfaction
   */
  recordSatisfaction(signal: 'positive' | 'negative' | 'neutral'): void {
    this.machine.addSatisfactionSignal(signal);
    
    if (signal === 'negative') {
      this.machine.transition('user_rejection');
    } else if (signal === 'positive') {
      this.machine.transition('user_confirmation');
    }
  }

  /**
   * Check if should escalate
   */
  shouldEscalate(): boolean {
    return this.machine.shouldEscalate();
  }

  /**
   * Mark escalation as offered
   */
  markEscalationOffered(): void {
    this.machine.markEscalationOffered();
  }

  /**
   * Force transition to a specific state (admin override)
   */
  forceState(state: ConversationState): void {
    // Direct context manipulation for forced transitions
    const context = this.machine.getContext();
    const newMachine = new ConversationStateMachine({
      ...context,
      previousState: context.state,
      state,
      stateEnteredAt: Date.now(),
      stateTurnCount: 0,
    });
    this.machine = newMachine;
  }

  /**
   * Get prompt context string for LLM
   */
  getPromptContext(): string {
    const context = this.machine.getContext();
    const suggestions = this.getSuggestions();
    const stateMetadata = STATE_DEFINITIONS[context.state];

    return `## Conversation State Context

Current State: ${context.state}
Turn Count: ${context.turnCount}
User Emotion: ${context.userEmotion || 'neutral'}
Safety Level: ${context.safetyLevel}

### State Guidelines
${stateMetadata.description}

### Recommended Approach
- Pattern Blocks: ${suggestions.patternBlocks.join(', ')}
- Warmth Level: ${WARMTH_SCALE[Object.keys(WARMTH_SCALE)[suggestions.warmthLevel - 1] as keyof typeof WARMTH_SCALE]?.name || 'friendly'}
- Target Emotion: ${suggestions.targetEmotion}
${suggestions.offerEscalation ? '- Should offer escalation to human support' : ''}
${suggestions.includeNudge ? '- Can include ecosystem suggestion after resolution' : ''}

### Required Actions
${suggestions.actions.map(a => `- ${a}`).join('\n')}`;
  }

  /**
   * Serialize for persistence
   */
  serialize(): string {
    return this.machine.serialize();
  }

  /**
   * Restore from serialized state
   * Returns null if serialized data is corrupted
   */
  static restore(serialized: string, config: StateManagerConfig = {}): StateManager | null {
    try {
      const context = JSON.parse(serialized) as ConversationContext;
      return new StateManager(config, context);
    } catch (error) {
      console.error('[StateManager] Failed to restore state from corrupted data:', error);
      return null;
    }
  }

  /**
   * Schedule persistence (debounced)
   */
  private schedulePersist(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    
    this.persistTimer = setTimeout(async () => {
      if (this.config.onPersist) {
        try {
          await this.config.onPersist(this.machine.getContext());
        } catch (e) {
          console.error('[StateManager] Persist failed:', e);
        }
      }
    }, 500); // 500ms debounce
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new StateManager with default config
 */
export function createStateManager(config?: StateManagerConfig): StateManager {
  return new StateManager(config);
}

/**
 * Analyze message for state transition triggers
 * (Basic implementation - should be enhanced with NLP)
 */
export function analyzeMessageForTransition(message: string): {
  isQuestion: boolean;
  isConfirmation: boolean;
  isRejection: boolean;
  isEscalationRequest: boolean;
  hasSafetyConcern: boolean;
} {
  const lower = message.toLowerCase();
  
  return {
    isQuestion: /\?|how|what|when|where|why|can you|could you/i.test(message),
    isConfirmation: /yes|ok|sure|thanks|thank you|great|perfect|good|that works|helpful/i.test(lower),
    isRejection: /no|not|wrong|incorrect|doesn't work|didn't help|still|again|try again/i.test(lower),
    isEscalationRequest: /human|agent|person|supervisor|manager|speak to|talk to|escalate|complaint/i.test(lower),
    hasSafetyConcern: /emergency|urgent|help me|danger|unsafe|threat/i.test(lower),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TURN COUNT ADAPTATION (Phase D)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Turn count adaptation guidance per Tokens v2 specification
 * 
 * | Turn Range | What It Signals | How the LLM Should Adapt |
 * |------------|-----------------|--------------------------|
 * | 1–2        | Early interaction | Normal exploratory flow |
 * | 3–5        | Developing interaction | Increase clarity and structure |
 * | 6–8        | Possible friction | Simplify. Summarise. Tighten steps |
 * | 9+         | High friction/fatigue | Offer summarised reset or escalation |
 */
export function getTurnCountAdaptation(turnCount: number): {
  guidance: string;
  responseStyle: 'exploratory' | 'structured' | 'simplified' | 'escalation_ready';
  maxResponseLength: 'full' | 'medium' | 'brief' | 'minimal';
  shouldSummarize: boolean;
  shouldOfferEscalation: boolean;
  shouldReduceCognitiveLoad: boolean;
} {
  if (turnCount <= 2) {
    return {
      guidance: 'Normal exploratory flow. User is just starting. Be welcoming and open.',
      responseStyle: 'exploratory',
      maxResponseLength: 'full',
      shouldSummarize: false,
      shouldOfferEscalation: false,
      shouldReduceCognitiveLoad: false,
    };
  } else if (turnCount <= 5) {
    return {
      guidance: 'Developing interaction. Increase clarity and structure. Avoid redundancy.',
      responseStyle: 'structured',
      maxResponseLength: 'medium',
      shouldSummarize: false,
      shouldOfferEscalation: false,
      shouldReduceCognitiveLoad: false,
    };
  } else if (turnCount <= 8) {
    return {
      guidance: 'Possible friction detected. Simplify language. Summarise key points. Tighten steps.',
      responseStyle: 'simplified',
      maxResponseLength: 'brief',
      shouldSummarize: true,
      shouldOfferEscalation: true,
      shouldReduceCognitiveLoad: true,
    };
  } else {
    return {
      guidance: 'High friction or fatigue likely. Offer summarised reset or escalation. Reduce cognitive load significantly.',
      responseStyle: 'escalation_ready',
      maxResponseLength: 'minimal',
      shouldSummarize: true,
      shouldOfferEscalation: true,
      shouldReduceCognitiveLoad: true,
    };
  }
}

/**
 * Get turn count guidance as a string for prompt injection
 */
export function getTurnCountGuidanceText(turnCount: number): string {
  const adaptation = getTurnCountAdaptation(turnCount);
  
  let text = `## Turn Count Adaptation (Turn ${turnCount})\n\n`;
  text += `${adaptation.guidance}\n\n`;
  text += `Style: ${adaptation.responseStyle}\n`;
  text += `Response Length: ${adaptation.maxResponseLength}\n`;
  
  if (adaptation.shouldSummarize) {
    text += `- SUMMARIZE key points from previous turns\n`;
  }
  if (adaptation.shouldOfferEscalation) {
    text += `- Offer escalation to human support if appropriate\n`;
  }
  if (adaptation.shouldReduceCognitiveLoad) {
    text += `- REDUCE cognitive load: fewer options, simpler language\n`;
  }
  
  return text;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSATION TRANSITION TRACKING (Phase D)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Transition descriptor format
 */
export type TransitionDescriptor = `${ConversationState}_to_${ConversationState}`;

/**
 * Get transition string from two states
 */
export function getConversationTransition(
  previousState: ConversationState,
  currentState: ConversationState
): TransitionDescriptor {
  return `${previousState}_to_${currentState}` as TransitionDescriptor;
}

/**
 * Transition guidance per Tokens v2 specification
 */
const TRANSITION_GUIDANCE: Record<string, string> = {
  // Opening transitions
  'opening_to_information_gathering': 'Moving from greeting to classification. Immediately determine intent and route.',
  'opening_to_processing': 'User provided enough info to start processing. Skip info gathering.',
  
  // Information gathering transitions
  'information_gathering_to_processing': 'Required info received. Execute without repeating old context.',
  'information_gathering_to_resolution': 'Intent clear. Proceed confidently with solution.',
  'information_gathering_to_escalation': 'Escalation requested. Explain handoff calmly.',
  
  // Processing transitions
  'processing_to_resolution': 'Solution found. Deliver structured answer.',
  'processing_to_error': 'Processing failed. Apologize and offer alternatives.',
  
  // Resolution transitions
  'resolution_to_confirmation': 'Solution delivered. Confirm expected result or satisfaction.',
  'resolution_to_error': 'Solution did not work. Refine logically.',
  
  // Confirmation transitions
  'confirmation_to_resolution': 'Not resolved. Provide refined solution.',
  'confirmation_to_closing': 'Resolved. Finalize interaction cleanly.',
  'confirmation_to_escalation': 'User needs more help. Escalate gracefully.',
  
  // Closing transitions
  'closing_to_information_gathering': 'User has follow-up. Re-engage helpfully.',
  
  // Escalation transitions
  'escalation_to_closing': 'Handoff complete. Close gracefully.',
  
  // Error transitions
  'error_to_information_gathering': 'Need more info after error. Ask precisely.',
  'error_to_resolution': 'Found alternative solution. Deliver it.',
  'error_to_escalation': 'Cannot resolve. Hand off to human.',
};

/**
 * Get guidance for a specific transition
 */
export function getTransitionGuidance(
  previousState: ConversationState,
  currentState: ConversationState
): string {
  const transitionKey = `${previousState}_to_${currentState}`;
  return TRANSITION_GUIDANCE[transitionKey] || 
    `Transitioned from ${previousState} to ${currentState}. Adapt response accordingly.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION STATUS INFERENCE (Phase D)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolution status per Tokens v2 specification
 */
export type ResolutionStatus = 
  | 'not_started'
  | 'in_progress'
  | 'blocked_missing_info'
  | 'resolved'
  | 'escalated'
  | 'abandoned';

/**
 * Infer resolution status from conversation context
 */
export function inferResolutionStatus(
  state: ConversationState,
  turnCount: number,
  hasError: boolean,
  isResolved: boolean,
  isEscalated: boolean,
  userAbandoned: boolean
): ResolutionStatus {
  if (userAbandoned) {
    return 'abandoned';
  }
  
  if (isEscalated) {
    return 'escalated';
  }
  
  if (isResolved || state === 'closing') {
    return 'resolved';
  }
  
  if (state === 'information_gathering' && turnCount > 3) {
    return 'blocked_missing_info';
  }
  
  if (state === 'opening' || turnCount <= 1) {
    return 'not_started';
  }
  
  return 'in_progress';
}

/**
 * Get resolution status guidance
 */
export function getResolutionStatusGuidance(status: ResolutionStatus): string {
  const guidance: Record<ResolutionStatus, string> = {
    not_started: 'Move quickly toward triage or act. Identify intent promptly.',
    in_progress: 'Stay structured. Avoid introducing new paths. Focus on resolution.',
    blocked_missing_info: 'Ask precise clarification. Get the minimum info needed to proceed.',
    resolved: 'Confirm clearly and move to close. Avoid extending unnecessarily.',
    escalated: 'Explain next steps calmly. Provide expectations. Maintain trust.',
    abandoned: 'Do not force re-engagement. Offer simple reopening path if user returns.',
  };
  
  return guidance[status];
}

/**
 * Combined conversation state analysis
 * Returns all tokens related to conversation control
 */
export function analyzeConversationState(
  manager: StateManager
): {
  state: ConversationState;
  previousState: ConversationState | undefined;
  transition: TransitionDescriptor | undefined;
  transitionGuidance: string;
  turnCount: number;
  turnAdaptation: ReturnType<typeof getTurnCountAdaptation>;
  resolutionStatus: ResolutionStatus;
  resolutionGuidance: string;
} {
  const context = manager.getContext();
  const state = context.state;
  const previousState = context.previousState;
  const turnCount = context.turnCount;
  
  // Determine transition
  const transition = previousState ? getConversationTransition(previousState, state) : undefined;
  const transitionGuidance = previousState 
    ? getTransitionGuidance(previousState, state) 
    : 'Starting new conversation.';
  
  // Turn adaptation
  const turnAdaptation = getTurnCountAdaptation(turnCount);
  
  // Resolution status
  const resolutionStatus = inferResolutionStatus(
    state,
    turnCount,
    context.errorCount > 0,
    state === 'closing',
    context.escalationOffered || false,
    false // Would need external signal for abandoned
  );
  
  return {
    state,
    previousState,
    transition,
    transitionGuidance,
    turnCount,
    turnAdaptation,
    resolutionStatus,
    resolutionGuidance: getResolutionStatusGuidance(resolutionStatus),
  };
}
