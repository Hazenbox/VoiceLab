/**
 * Turn Counter
 * 
 * Tracks conversation turn count and adapts behavior based on
 * turn thresholds (1-2, 3-5, 6-8, 9+).
 * 
 * @module services/conversation/turnCounter
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Turn phase based on conversation length
 */
export type TurnPhase = 
  | 'opening'      // Turns 1-2: Initial engagement
  | 'active'       // Turns 3-5: Active problem solving
  | 'extended'     // Turns 6-8: Extended conversation
  | 'prolonged';   // Turns 9+: Conversation going long

/**
 * Behavior configuration for a turn phase
 */
export interface TurnBehavior {
  /** Maximum questions to ask per turn */
  maxQuestions: number;
  /** Maximum CTAs per turn */
  maxCTAs: number;
  /** Whether to include progress summary */
  shouldSummarize: boolean;
  /** Whether to hint at escalation option */
  escalationHint: boolean;
  /** Patience level affects tone */
  patience: 'high' | 'medium' | 'low';
  /** Whether to show micro-plan */
  showMicroPlan: boolean;
  /** Detail level for responses */
  detailLevel: 'full' | 'moderate' | 'brief';
  /** Proactive suggestions allowed */
  allowProactiveSuggestions: boolean;
}

/**
 * Turn counter state
 */
export interface TurnCounterState {
  /** Current turn number (1-indexed) */
  turnNumber: number;
  /** User message count */
  userTurns: number;
  /** Assistant message count */
  assistantTurns: number;
  /** Current phase */
  phase: TurnPhase;
  /** Timestamp of first turn */
  startedAt: number;
  /** Timestamp of last turn */
  lastTurnAt: number;
  /** Average time between turns (ms) */
  avgTurnIntervalMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Turn thresholds for phase transitions
 */
export const TURN_THRESHOLDS = {
  opening: { min: 1, max: 2 },
  active: { min: 3, max: 5 },
  extended: { min: 6, max: 8 },
  prolonged: { min: 9, max: Infinity },
} as const;

/**
 * Default behavior configuration per phase
 */
export const PHASE_BEHAVIORS: Record<TurnPhase, TurnBehavior> = {
  opening: {
    maxQuestions: 1,
    maxCTAs: 1,
    shouldSummarize: false,
    escalationHint: false,
    patience: 'high',
    showMicroPlan: false,
    detailLevel: 'full',
    allowProactiveSuggestions: true,
  },
  active: {
    maxQuestions: 1,
    maxCTAs: 1,
    shouldSummarize: false,
    escalationHint: false,
    patience: 'medium',
    showMicroPlan: true,
    detailLevel: 'moderate',
    allowProactiveSuggestions: true,
  },
  extended: {
    maxQuestions: 1,
    maxCTAs: 1,
    shouldSummarize: true,
    escalationHint: true,
    patience: 'low',
    showMicroPlan: true,
    detailLevel: 'brief',
    allowProactiveSuggestions: false,
  },
  prolonged: {
    maxQuestions: 0, // Stop asking questions
    maxCTAs: 1,
    shouldSummarize: true,
    escalationHint: true,
    patience: 'low',
    showMicroPlan: true,
    detailLevel: 'brief',
    allowProactiveSuggestions: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new turn counter
 */
export function createTurnCounter(): TurnCounterState {
  const now = Date.now();
  return {
    turnNumber: 0,
    userTurns: 0,
    assistantTurns: 0,
    phase: 'opening',
    startedAt: now,
    lastTurnAt: now,
    avgTurnIntervalMs: 0,
  };
}

/**
 * Get turn phase from turn number
 */
export function getTurnPhase(turnNumber: number): TurnPhase {
  if (turnNumber <= TURN_THRESHOLDS.opening.max) return 'opening';
  if (turnNumber <= TURN_THRESHOLDS.active.max) return 'active';
  if (turnNumber <= TURN_THRESHOLDS.extended.max) return 'extended';
  return 'prolonged';
}

/**
 * Get behavior configuration for turn number
 */
export function getTurnBehavior(turnNumber: number): TurnBehavior {
  const phase = getTurnPhase(turnNumber);
  return { ...PHASE_BEHAVIORS[phase] };
}

/**
 * Increment turn counter
 */
export function incrementTurn(
  state: TurnCounterState,
  role: 'user' | 'assistant'
): TurnCounterState {
  const now = Date.now();
  const turnInterval = now - state.lastTurnAt;
  
  // Update average turn interval
  const totalTurns = state.userTurns + state.assistantTurns;
  const newAvg = totalTurns > 0
    ? (state.avgTurnIntervalMs * totalTurns + turnInterval) / (totalTurns + 1)
    : turnInterval;
  
  const newTurnNumber = state.turnNumber + 1;
  
  return {
    turnNumber: newTurnNumber,
    userTurns: role === 'user' ? state.userTurns + 1 : state.userTurns,
    assistantTurns: role === 'assistant' ? state.assistantTurns + 1 : state.assistantTurns,
    phase: getTurnPhase(newTurnNumber),
    startedAt: state.startedAt,
    lastTurnAt: now,
    avgTurnIntervalMs: newAvg,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIOR HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if we should ask a clarifying question
 */
export function canAskQuestion(state: TurnCounterState): boolean {
  const behavior = getTurnBehavior(state.turnNumber);
  return behavior.maxQuestions > 0;
}

/**
 * Check if we should summarize progress
 */
export function shouldSummarizeProgress(state: TurnCounterState): boolean {
  const behavior = getTurnBehavior(state.turnNumber);
  return behavior.shouldSummarize;
}

/**
 * Check if we should hint at escalation
 */
export function shouldHintEscalation(state: TurnCounterState): boolean {
  const behavior = getTurnBehavior(state.turnNumber);
  return behavior.escalationHint;
}

/**
 * Check if conversation is going too long
 */
export function isConversationProlonged(state: TurnCounterState): boolean {
  return state.phase === 'prolonged';
}

/**
 * Check if this is still the opening phase
 */
export function isOpeningPhase(state: TurnCounterState): boolean {
  return state.phase === 'opening';
}

/**
 * Get patience level guidance
 */
export function getPatienceGuidance(state: TurnCounterState): string {
  const behavior = getTurnBehavior(state.turnNumber);
  
  switch (behavior.patience) {
    case 'high':
      return 'take time to understand fully, ask clarifying questions if needed';
    case 'medium':
      return 'be efficient but thorough, focus on resolution';
    case 'low':
      return 'prioritize quick resolution or escalation, minimize back-and-forth';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build turn context for prompt injection
 */
export function buildTurnContextPrompt(state: TurnCounterState): string {
  const behavior = getTurnBehavior(state.turnNumber);
  const lines: string[] = [];
  
  lines.push(`## conversation turn context`);
  lines.push(`turn number: ${state.turnNumber}`);
  lines.push(`phase: ${state.phase}`);
  lines.push(`patience level: ${behavior.patience}`);
  lines.push('');
  
  // Phase-specific instructions
  lines.push('### turn behavior rules:');
  
  if (behavior.maxQuestions === 0) {
    lines.push('- do NOT ask questions - focus on resolution or escalation');
  } else {
    lines.push(`- maximum ${behavior.maxQuestions} question per response`);
  }
  
  lines.push(`- maximum ${behavior.maxCTAs} call-to-action per response`);
  
  if (behavior.shouldSummarize) {
    lines.push('- include brief progress summary');
  }
  
  if (behavior.escalationHint) {
    lines.push('- offer human handoff option');
  }
  
  if (!behavior.allowProactiveSuggestions) {
    lines.push('- do NOT make proactive suggestions - focus on current issue');
  }
  
  lines.push(`- detail level: ${behavior.detailLevel}`);
  lines.push('');
  
  // Phase-specific guidance
  switch (state.phase) {
    case 'opening':
      lines.push('**phase guidance**: establish understanding, be welcoming and thorough');
      break;
    case 'active':
      lines.push('**phase guidance**: actively work towards resolution, verify progress');
      break;
    case 'extended':
      lines.push('**phase guidance**: conversation is extending, prioritize efficiency');
      break;
    case 'prolonged':
      lines.push('**phase guidance**: conversation is too long, push for resolution or escalation');
      break;
  }
  
  return lines.join('\n');
}

/**
 * Get turn statistics summary
 */
export function getTurnStats(state: TurnCounterState): {
  totalTurns: number;
  userTurns: number;
  assistantTurns: number;
  phase: TurnPhase;
  durationMs: number;
  avgTurnIntervalMs: number;
  isHealthy: boolean;
} {
  const durationMs = state.lastTurnAt - state.startedAt;
  
  // Conversation is "healthy" if not prolonged and reasonable pace
  const isHealthy = 
    state.phase !== 'prolonged' &&
    state.avgTurnIntervalMs < 5 * 60 * 1000; // Less than 5 min between turns
  
  return {
    totalTurns: state.turnNumber,
    userTurns: state.userTurns,
    assistantTurns: state.assistantTurns,
    phase: state.phase,
    durationMs,
    avgTurnIntervalMs: state.avgTurnIntervalMs,
    isHealthy,
  };
}

/**
 * Estimate remaining turns to resolution
 */
export function estimateRemainingTurns(
  currentTurn: number,
  hasProvidedSolution: boolean
): number {
  if (hasProvidedSolution) {
    return 1; // Just need confirmation
  }
  
  if (currentTurn <= 2) {
    return 3; // Typical: understand + solve + confirm
  }
  
  if (currentTurn <= 5) {
    return 2; // Should be close
  }
  
  return 1; // Push for quick resolution
}
