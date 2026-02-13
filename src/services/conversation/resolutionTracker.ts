/**
 * Resolution Tracker
 * 
 * Tracks user issue resolution status throughout a conversation.
 * Monitors progress from initial contact to resolution or escalation.
 * 
 * @module services/conversation/resolutionTracker
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolution status values
 */
export type ResolutionStatus =
  | 'not_started'  // Just opened conversation
  | 'in_progress'  // Actively working on issue
  | 'blocked'      // Need more info/action from user
  | 'resolved'     // Issue fixed
  | 'escalated'    // Handed to human
  | 'abandoned';   // User left mid-conversation

/**
 * Resolution tracker state
 */
export interface ResolutionTracker {
  /** Current status */
  status: ResolutionStatus;
  /** Number of resolution attempts */
  attempts: number;
  /** What the resolution is blocked on (if blocked) */
  blockedOn?: string;
  /** Reason for escalation (if escalated) */
  escalationReason?: string;
  /** Timestamp when resolved */
  resolvedAt?: number;
  /** User satisfaction signal (if provided) */
  userSatisfaction?: 'satisfied' | 'unsatisfied' | 'unknown';
  /** History of status changes */
  history: ResolutionEvent[];
}

/**
 * Resolution event for history tracking
 */
export interface ResolutionEvent {
  fromStatus: ResolutionStatus;
  toStatus: ResolutionStatus;
  trigger: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Actions that can affect resolution status
 */
export interface ResolutionAction {
  type: ResolutionActionType;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export type ResolutionActionType =
  | 'start_resolution'
  | 'provide_solution'
  | 'request_info'
  | 'user_confirms_resolved'
  | 'user_still_has_issue'
  | 'user_provides_info'
  | 'handoff_initiated'
  | 'user_leaves'
  | 'timeout'
  | 'retry_solution';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const RESOLUTION_CONFIG = {
  /** Maximum attempts before suggesting escalation */
  maxAttemptsBeforeEscalation: 3,
  /** Timeout in ms before marking as abandoned */
  abandonmentTimeoutMs: 30 * 60 * 1000, // 30 minutes
  /** Minimum turns before resolution can be confirmed */
  minTurnsForResolution: 2,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valid transitions between resolution statuses
 */
const VALID_TRANSITIONS: Record<ResolutionStatus, ResolutionStatus[]> = {
  not_started: ['in_progress', 'abandoned'],
  in_progress: ['blocked', 'resolved', 'escalated', 'abandoned'],
  blocked: ['in_progress', 'escalated', 'abandoned'],
  resolved: ['in_progress'], // Can reopen if user reports new issue
  escalated: [], // Terminal state
  abandoned: ['in_progress'], // Can resume
};

/**
 * Check if a transition is valid
 */
export function isValidTransition(from: ResolutionStatus, to: ResolutionStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new resolution tracker
 */
export function createResolutionTracker(): ResolutionTracker {
  return {
    status: 'not_started',
    attempts: 0,
    history: [],
  };
}

/**
 * Update resolution status based on an action
 */
export function updateResolutionStatus(
  current: ResolutionTracker,
  action: ResolutionAction
): ResolutionTracker {
  const now = Date.now();
  let newStatus: ResolutionStatus = current.status;
  let blockedOn: string | undefined = current.blockedOn;
  let escalationReason: string | undefined = current.escalationReason;
  let resolvedAt: number | undefined = current.resolvedAt;
  let attempts = current.attempts;
  let userSatisfaction = current.userSatisfaction;
  
  switch (action.type) {
    case 'start_resolution':
      if (current.status === 'not_started' || current.status === 'abandoned') {
        newStatus = 'in_progress';
        attempts = 1;
      }
      break;
    
    case 'provide_solution':
      if (current.status === 'in_progress' || current.status === 'blocked') {
        newStatus = 'in_progress';
        attempts += 1;
        blockedOn = undefined;
      }
      break;
    
    case 'request_info':
      if (current.status === 'in_progress') {
        newStatus = 'blocked';
        blockedOn = action.reason || 'awaiting user information';
      }
      break;
    
    case 'user_provides_info':
      if (current.status === 'blocked') {
        newStatus = 'in_progress';
        blockedOn = undefined;
      }
      break;
    
    case 'user_confirms_resolved':
      newStatus = 'resolved';
      resolvedAt = now;
      userSatisfaction = 'satisfied';
      break;
    
    case 'user_still_has_issue':
      if (current.status === 'in_progress') {
        attempts += 1;
        if (attempts >= RESOLUTION_CONFIG.maxAttemptsBeforeEscalation) {
          newStatus = 'blocked';
          blockedOn = 'multiple resolution attempts failed';
        }
        userSatisfaction = 'unsatisfied';
      }
      break;
    
    case 'retry_solution':
      if (current.status === 'blocked' || current.status === 'in_progress') {
        newStatus = 'in_progress';
        attempts += 1;
      }
      break;
    
    case 'handoff_initiated':
      newStatus = 'escalated';
      escalationReason = action.reason || 'user requested human assistance';
      break;
    
    case 'user_leaves':
    case 'timeout':
      if (current.status !== 'resolved' && current.status !== 'escalated') {
        newStatus = 'abandoned';
      }
      break;
  }
  
  // Only record history if status actually changed
  const history = [...current.history];
  if (newStatus !== current.status) {
    history.push({
      fromStatus: current.status,
      toStatus: newStatus,
      trigger: action.type,
      timestamp: now,
      metadata: action.metadata,
    });
  }
  
  return {
    status: newStatus,
    attempts,
    blockedOn,
    escalationReason,
    resolvedAt,
    userSatisfaction,
    history,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect resolution signals in user message
 */
export function detectResolutionSignals(
  message: string
): {
  isResolved: boolean;
  isStillIssue: boolean;
  providesInfo: boolean;
  requestsEscalation: boolean;
} {
  const text = message.toLowerCase();
  
  // Resolution signals
  const resolvedPatterns = [
    /\b(thanks?|thank you|worked|working|fixed|solved|great|perfect|awesome|done)\b/i,
    /\b(that('s| is) (it|all|perfect|great))\b/i,
    /\b(problem (is )?solved|issue (is )?fixed)\b/i,
  ];
  
  // Still has issue signals
  const stillIssuePatterns = [
    /\b(still|again|not working|doesn't work|didn't work|same (problem|issue))\b/i,
    /\b(no|nope|didn't (help|work|fix))\b/i,
    /\b(that's not|that isn't|wrong|incorrect)\b/i,
  ];
  
  // Providing info signals
  const providesInfoPatterns = [
    /\b(my (number|account|email|id) is|here('s| is))\b/i,
    /\b(the (error|message|code) (is|says|shows))\b/i,
    /^[0-9]{10}$/, // Phone number
    /^[A-Z0-9]{6,}$/i, // ID/code
  ];
  
  // Escalation signals
  const escalationPatterns = [
    /\b(speak to|talk to|connect (me )?(to|with)) (a )?(human|person|agent|representative|someone)\b/i,
    /\b(escalate|supervisor|manager)\b/i,
    /\b(enough|frustrated|fed up|useless)\b/i,
  ];
  
  return {
    isResolved: resolvedPatterns.some(p => p.test(text)),
    isStillIssue: stillIssuePatterns.some(p => p.test(text)),
    providesInfo: providesInfoPatterns.some(p => p.test(message)), // Use original case
    requestsEscalation: escalationPatterns.some(p => p.test(text)),
  };
}

/**
 * Infer resolution action from user message and context
 */
export function inferResolutionAction(
  message: string,
  currentStatus: ResolutionStatus,
  turnCount: number
): ResolutionAction | null {
  const signals = detectResolutionSignals(message);
  
  // Check for escalation request first (highest priority)
  if (signals.requestsEscalation) {
    return { type: 'handoff_initiated', reason: 'user requested human agent' };
  }
  
  // Check for resolution confirmation
  if (signals.isResolved && turnCount >= RESOLUTION_CONFIG.minTurnsForResolution) {
    return { type: 'user_confirms_resolved' };
  }
  
  // Check for still having issue
  if (signals.isStillIssue) {
    return { type: 'user_still_has_issue' };
  }
  
  // Check for providing info (when blocked)
  if (signals.providesInfo && currentStatus === 'blocked') {
    return { type: 'user_provides_info' };
  }
  
  // Start resolution if not started
  if (currentStatus === 'not_started') {
    return { type: 'start_resolution' };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get resolution context for prompt injection
 */
export function getResolutionPromptContext(tracker: ResolutionTracker): string {
  const lines: string[] = [];
  
  lines.push(`resolution status: ${tracker.status}`);
  lines.push(`resolution attempts: ${tracker.attempts}`);
  
  if (tracker.blockedOn) {
    lines.push(`blocked on: ${tracker.blockedOn}`);
  }
  
  if (tracker.attempts >= RESOLUTION_CONFIG.maxAttemptsBeforeEscalation - 1) {
    lines.push('note: approaching escalation threshold - consider offering human handoff');
  }
  
  // Status-specific guidance
  switch (tracker.status) {
    case 'not_started':
      lines.push('guidance: understand the issue before attempting resolution');
      break;
    case 'in_progress':
      lines.push('guidance: work towards resolution, verify if solution helped');
      break;
    case 'blocked':
      lines.push('guidance: wait for user input before proceeding');
      break;
    case 'resolved':
      lines.push('guidance: confirm satisfaction, offer next opportunity if appropriate');
      break;
  }
  
  return lines.join('\n');
}

/**
 * Check if escalation should be suggested
 */
export function shouldSuggestEscalation(tracker: ResolutionTracker): boolean {
  return (
    tracker.attempts >= RESOLUTION_CONFIG.maxAttemptsBeforeEscalation ||
    tracker.status === 'blocked' && tracker.attempts >= 2 ||
    tracker.userSatisfaction === 'unsatisfied'
  );
}

/**
 * Get resolution summary for analytics/logging
 */
export function getResolutionSummary(tracker: ResolutionTracker): {
  status: ResolutionStatus;
  attempts: number;
  durationMs: number | null;
  wasEscalated: boolean;
  wasAbandoned: boolean;
  transitionCount: number;
} {
  const firstEvent = tracker.history[0];
  const lastEvent = tracker.history[tracker.history.length - 1];
  
  return {
    status: tracker.status,
    attempts: tracker.attempts,
    durationMs: firstEvent && lastEvent 
      ? lastEvent.timestamp - firstEvent.timestamp 
      : null,
    wasEscalated: tracker.status === 'escalated',
    wasAbandoned: tracker.status === 'abandoned',
    transitionCount: tracker.history.length,
  };
}
