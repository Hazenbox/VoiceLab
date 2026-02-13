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
   */
  static restore(serialized: string, config: StateManagerConfig = {}): StateManager {
    const context = JSON.parse(serialized) as ConversationContext;
    return new StateManager(config, context);
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
