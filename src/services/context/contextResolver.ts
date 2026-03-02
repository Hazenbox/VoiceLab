/**
 * Context Resolver
 * 
 * Resolves contextual tokens: time, event, session, urgency, journey_stage.
 * Provides environmental awareness for response generation.
 * 
 * @module services/context/contextResolver
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Time context tokens
 */
export interface TimeContext {
  /** Hour of day (0-23) */
  hour: number;
  /** Time period */
  period: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night';
  /** Day of week */
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  /** Day type */
  dayType: 'weekday' | 'weekend' | 'holiday';
  /** Is it business hours (9am-6pm Mon-Sat) */
  isBusinessHours: boolean;
  /** Is it peak hours (typically 6pm-10pm) */
  isPeakHours: boolean;
}

/**
 * Event context tokens
 */
export interface EventContext {
  /** Active event type */
  eventType: string | null;
  /** Event name */
  eventName: string | null;
  /** Event priority */
  eventPriority: 'normal' | 'high' | 'critical';
  /** Associated offers */
  associatedOffers: string[];
  /** Event-specific greeting */
  eventGreeting: string | null;
}

/**
 * Session context tokens
 */
export interface SessionContext {
  /** Session ID */
  sessionId: string;
  /** Session duration in minutes */
  durationMinutes: number;
  /** Number of interactions */
  interactionCount: number;
  /** Is session stale (no activity for 5+ min) */
  isStale: boolean;
  /** Session source channel */
  sourceChannel: string;
  /** Entry point */
  entryPoint: string;
}

/**
 * Urgency context tokens
 */
export interface UrgencyContext {
  /** Overall urgency level */
  level: 'low' | 'normal' | 'elevated' | 'high' | 'critical';
  /** Urgency factors present */
  factors: string[];
  /** Time pressure indicator */
  timePressure: boolean;
  /** Recommended response time */
  targetResponseTimeMs: number;
}

/**
 * Journey stage tokens
 */
export type JourneyStage =
  | 'discovery'        // User learning about options
  | 'consideration'    // User comparing/deciding
  | 'purchase'         // User making transaction
  | 'onboarding'       // User just purchased/activated
  | 'active_usage'     // User actively using service
  | 'support'          // User needs help
  | 'retention'        // User showing churn signals
  | 'win_back';        // User has churned, returning

/**
 * Complete resolved context
 */
export interface ResolvedContext {
  time: TimeContext;
  event: EventContext;
  session: SessionContext;
  urgency: UrgencyContext;
  journeyStage: JourneyStage;
}

/**
 * Input for context resolution
 */
export interface ContextResolutionInput {
  sessionId: string;
  sessionStartTime?: number;
  interactionCount?: number;
  sourceChannel?: string;
  entryPoint?: string;
  
  // For urgency calculation
  emotion?: string;
  intent?: string;
  resolutionStatus?: string;
  turnNumber?: number;
  
  // For journey stage
  isNewUser?: boolean;
  daysSinceActivation?: number;
  hasPurchasedRecently?: boolean;
  showingChurnSignals?: boolean;
  
  // Time override (for testing)
  timestamp?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENTS DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Indian holidays and events
 */
const INDIAN_EVENTS: Array<{
  name: string;
  type: 'national_holiday' | 'festival' | 'sale_event' | 'cricket' | 'promotion';
  months: number[]; // 0-indexed
  dates?: number[]; // Specific dates if fixed
  priority: 'normal' | 'high' | 'critical';
  greeting?: string;
  offers?: string[];
}> = [
  // Fixed national holidays
  { name: 'republic_day', type: 'national_holiday', months: [0], dates: [26], priority: 'high', greeting: 'Happy Republic Day.' },
  { name: 'independence_day', type: 'national_holiday', months: [7], dates: [15], priority: 'high', greeting: 'Happy Independence Day.' },
  { name: 'gandhi_jayanti', type: 'national_holiday', months: [9], dates: [2], priority: 'normal', greeting: 'Remembering the Mahatma' },
  
  // Major festivals (approximate dates vary yearly)
  { name: 'diwali', type: 'festival', months: [9, 10], priority: 'critical', greeting: 'Happy Diwali.', offers: ['diwali_data_pack', 'festive_recharge'] },
  { name: 'holi', type: 'festival', months: [2, 3], priority: 'high', greeting: 'Happy Holi.', offers: ['holi_special'] },
  { name: 'eid', type: 'festival', months: [3, 4, 5], priority: 'high', greeting: 'Eid Mubarak.' },
  { name: 'christmas', type: 'festival', months: [11], dates: [25], priority: 'high', greeting: 'Merry Christmas.' },
  { name: 'new_year', type: 'festival', months: [0], dates: [1], priority: 'high', greeting: 'Happy New Year.' },
  
  // Sale events
  { name: 'big_billion_days', type: 'sale_event', months: [9], priority: 'high', offers: ['bbd_special', 'cashback_offer'] },
  { name: 'great_indian_festival', type: 'sale_event', months: [9], priority: 'high', offers: ['gif_special'] },
  
  // Cricket events
  { name: 'ipl', type: 'cricket', months: [3, 4, 5], priority: 'normal', offers: ['ipl_data_pack', 'jiocinema_premium'] },
  { name: 'world_cup', type: 'cricket', months: [9, 10, 11], priority: 'high', offers: ['cricket_pack'] },
];

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve time context
 */
export function resolveTimeContext(timestamp?: number): TimeContext {
  const date = timestamp ? new Date(timestamp) : new Date();
  const hour = date.getHours();
  const day = date.getDay();
  
  // Determine period
  let period: TimeContext['period'];
  if (hour >= 5 && hour < 9) period = 'early_morning';
  else if (hour >= 9 && hour < 12) period = 'morning';
  else if (hour >= 12 && hour < 17) period = 'afternoon';
  else if (hour >= 17 && hour < 21) period = 'evening';
  else if (hour >= 21 && hour < 24) period = 'night';
  else period = 'late_night';
  
  // Day of week
  const daysOfWeek: TimeContext['dayOfWeek'][] = [
    'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
  ];
  const dayOfWeek = daysOfWeek[day];
  
  // Day type (simplified - would need holiday calendar for full accuracy)
  const dayType: TimeContext['dayType'] = (day === 0 || day === 6) ? 'weekend' : 'weekday';
  
  // Business hours: 9am-6pm, Mon-Sat
  const isBusinessHours = hour >= 9 && hour < 18 && day >= 1 && day <= 6;
  
  // Peak hours: 6pm-10pm
  const isPeakHours = hour >= 18 && hour < 22;
  
  return {
    hour,
    period,
    dayOfWeek,
    dayType,
    isBusinessHours,
    isPeakHours,
  };
}

/**
 * Resolve event context
 */
export function resolveEventContext(timestamp?: number): EventContext {
  const date = timestamp ? new Date(timestamp) : new Date();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Find matching events
  const matchingEvents = INDIAN_EVENTS.filter(event => {
    if (!event.months.includes(month)) return false;
    if (event.dates && !event.dates.includes(day)) return false;
    return true;
  });
  
  // Sort by priority and return highest
  const priorityOrder = { critical: 3, high: 2, normal: 1 };
  matchingEvents.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  
  const activeEvent = matchingEvents[0];
  
  if (!activeEvent) {
    return {
      eventType: null,
      eventName: null,
      eventPriority: 'normal',
      associatedOffers: [],
      eventGreeting: null,
    };
  }
  
  return {
    eventType: activeEvent.type,
    eventName: activeEvent.name,
    eventPriority: activeEvent.priority,
    associatedOffers: activeEvent.offers || [],
    eventGreeting: activeEvent.greeting || null,
  };
}

/**
 * Resolve session context
 */
export function resolveSessionContext(input: ContextResolutionInput): SessionContext {
  const now = Date.now();
  const sessionStart = input.sessionStartTime || now;
  const durationMs = now - sessionStart;
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  
  // Session is stale if no interaction for 5+ minutes
  const isStale = durationMinutes > 5 && (input.interactionCount || 0) < 2;
  
  return {
    sessionId: input.sessionId,
    durationMinutes,
    interactionCount: input.interactionCount || 0,
    isStale,
    sourceChannel: input.sourceChannel || 'unknown',
    entryPoint: input.entryPoint || 'direct',
  };
}

/**
 * Resolve urgency context
 */
export function resolveUrgencyContext(input: ContextResolutionInput): UrgencyContext {
  const factors: string[] = [];
  let score = 0;
  
  // Emotion-based urgency
  const highUrgencyEmotions = ['raudra', 'bhayanak'];
  const mediumUrgencyEmotions = ['karun', 'bibhatsa'];
  
  if (input.emotion) {
    if (highUrgencyEmotions.includes(input.emotion)) {
      factors.push('high_emotion');
      score += 3;
    } else if (mediumUrgencyEmotions.includes(input.emotion)) {
      factors.push('elevated_emotion');
      score += 2;
    }
  }
  
  // Intent-based urgency
  if (input.intent === 'complaint') {
    factors.push('complaint_intent');
    score += 2;
  } else if (input.intent === 'support') {
    factors.push('support_needed');
    score += 1;
  }
  
  // Resolution status
  if (input.resolutionStatus === 'blocked') {
    factors.push('blocked_resolution');
    score += 2;
  } else if (input.resolutionStatus === 'in_progress' && (input.turnNumber || 0) > 5) {
    factors.push('extended_unresolved');
    score += 1;
  }
  
  // Turn count
  if ((input.turnNumber || 0) >= 8) {
    factors.push('many_turns');
    score += 1;
  }
  
  // Determine level
  let level: UrgencyContext['level'];
  if (score >= 5) level = 'critical';
  else if (score >= 3) level = 'high';
  else if (score >= 2) level = 'elevated';
  else if (score >= 1) level = 'normal';
  else level = 'low';
  
  // Target response time
  const responseTimeMap: Record<UrgencyContext['level'], number> = {
    low: 5000,
    normal: 3000,
    elevated: 2000,
    high: 1500,
    critical: 1000,
  };
  
  return {
    level,
    factors,
    timePressure: level === 'high' || level === 'critical',
    targetResponseTimeMs: responseTimeMap[level],
  };
}

/**
 * Resolve journey stage
 */
export function resolveJourneyStage(input: ContextResolutionInput): JourneyStage {
  // Check for churn/win-back
  if (input.showingChurnSignals) {
    return 'retention';
  }
  
  // Check for new user
  if (input.isNewUser || (input.daysSinceActivation !== undefined && input.daysSinceActivation < 7)) {
    return 'onboarding';
  }
  
  // Check intent-based stage
  if (input.intent === 'support' || input.intent === 'complaint') {
    return 'support';
  }
  
  if (input.intent === 'transaction') {
    return 'purchase';
  }
  
  if (input.intent === 'inquiry') {
    return input.hasPurchasedRecently ? 'active_usage' : 'consideration';
  }
  
  // Default based on days since activation
  if (input.daysSinceActivation !== undefined) {
    if (input.daysSinceActivation < 30) return 'onboarding';
    if (input.daysSinceActivation > 180) return 'active_usage';
  }
  
  return 'active_usage';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve all context tokens
 */
export function resolveContext(input: ContextResolutionInput): ResolvedContext {
  return {
    time: resolveTimeContext(input.timestamp),
    event: resolveEventContext(input.timestamp),
    session: resolveSessionContext(input),
    urgency: resolveUrgencyContext(input),
    journeyStage: resolveJourneyStage(input),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format context for prompt injection
 */
export function formatContextForPrompt(context: ResolvedContext): string {
  const lines = [
    '## environmental context',
    '',
    '### time',
    `period: ${context.time.period}`,
    `day: ${context.time.dayOfWeek} (${context.time.dayType})`,
    `business_hours: ${context.time.isBusinessHours}`,
    `peak_hours: ${context.time.isPeakHours}`,
  ];
  
  if (context.event.eventName) {
    lines.push('');
    lines.push('### active event');
    lines.push(`event: ${context.event.eventName}`);
    if (context.event.eventGreeting) {
      lines.push(`greeting: "${context.event.eventGreeting}"`);
    }
    if (context.event.associatedOffers.length > 0) {
      lines.push(`offers: ${context.event.associatedOffers.join(', ')}`);
    }
  }
  
  lines.push('');
  lines.push('### session');
  lines.push(`duration: ${context.session.durationMinutes} minutes`);
  lines.push(`interactions: ${context.session.interactionCount}`);
  if (context.session.isStale) {
    lines.push('⚠️ session may be stale');
  }
  
  lines.push('');
  lines.push('### urgency');
  lines.push(`level: ${context.urgency.level}`);
  if (context.urgency.factors.length > 0) {
    lines.push(`factors: ${context.urgency.factors.join(', ')}`);
  }
  if (context.urgency.timePressure) {
    lines.push('⚡ time pressure - respond promptly');
  }
  
  lines.push('');
  lines.push('### journey');
  lines.push(`stage: ${context.journeyStage}`);
  lines.push(`guidance: ${getJourneyStageGuidance(context.journeyStage)}`);
  
  return lines.join('\n');
}

/**
 * Get guidance for journey stage
 */
function getJourneyStageGuidance(stage: JourneyStage): string {
  const guidance: Record<JourneyStage, string> = {
    discovery: 'educate and inform, no hard sell',
    consideration: 'help compare, highlight differentiators',
    purchase: 'streamline transaction, reduce friction',
    onboarding: 'welcome warmly, guide first steps',
    active_usage: 'maintain satisfaction, suggest optimizations',
    support: 'prioritize resolution, show empathy',
    retention: 'understand concerns, offer value',
    win_back: 'acknowledge return, special offers ok',
  };
  return guidance[stage];
}

/**
 * Get time-appropriate greeting
 */
export function getTimeAppropriateGreeting(time: TimeContext): string {
  const greetings: Record<TimeContext['period'], string> = {
    early_morning: 'good morning',
    morning: 'good morning',
    afternoon: 'good afternoon',
    evening: 'good evening',
    night: 'good evening',
    late_night: 'hello',
  };
  return greetings[time.period];
}
