/**
 * Mid-Term Memory Service
 * 
 * Provides 7-day cross-session continuity.
 * Tracks: last_journey, preferred_language, last_channel, common patterns.
 * 
 * @module services/memory/midTermMemory
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mid-term memory record
 */
export interface MidTermMemory {
  userId: string;
  deviceId: string;
  
  // Last interaction context
  lastJourney: JourneyMemory | null;
  lastChannel: string;
  lastIntent: string;
  lastResolutionStatus: string;
  lastInteractionAt: number;
  
  // Preferences learned over time
  preferredLanguage: string;
  preferredChannel: string;
  preferredTimeOfDay: string;
  
  // Common patterns (sliding window)
  commonIntents: IntentFrequency[];
  commonTopics: TopicFrequency[];
  commonEcosystems: EcosystemFrequency[];
  
  // Resolution history
  recentResolutions: ResolutionMemory[];
  
  // Metadata
  windowStartAt: number; // 7 days ago
  windowEndAt: number;   // now
  totalInteractions: number;
  lastUpdatedAt: number;
}

/**
 * Journey memory from last session
 */
export interface JourneyMemory {
  ecosystem: string;
  intent: string;
  topic: string;
  resolutionStatus: string;
  wasEscalated: boolean;
  turnCount: number;
  timestamp: number;
}

/**
 * Intent frequency tracking
 */
export interface IntentFrequency {
  intent: string;
  count: number;
  lastSeen: number;
}

/**
 * Topic frequency tracking
 */
export interface TopicFrequency {
  topic: string;
  count: number;
  lastSeen: number;
}

/**
 * Ecosystem frequency tracking
 */
export interface EcosystemFrequency {
  ecosystem: string;
  count: number;
  lastSeen: number;
}

/**
 * Resolution memory
 */
export interface ResolutionMemory {
  intent: string;
  topic: string;
  ecosystem: string;
  resolutionStatus: string;
  turnCount: number;
  wasEscalated: boolean;
  timestamp: number;
}

/**
 * Memory context for prompt injection
 */
export interface MemoryContext {
  hasRecentInteraction: boolean;
  daysSinceLastInteraction: number;
  isReturningForSameIssue: boolean;
  preferredLanguage: string;
  topIntents: string[];
  topTopics: string[];
  lastJourneySummary: string | null;
  shouldAcknowledgeReturn: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const MEMORY_CONFIG = {
  /** Memory window in days */
  windowDays: 7,
  /** Max intents to track */
  maxIntents: 10,
  /** Max topics to track */
  maxTopics: 10,
  /** Max ecosystems to track */
  maxEcosystems: 5,
  /** Max resolutions to keep */
  maxResolutions: 20,
  /** Hours threshold for "returning for same issue" */
  sameIssueThresholdHours: 48,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create empty mid-term memory
 */
export function createEmptyMemory(userId: string, deviceId: string): MidTermMemory {
  const now = Date.now();
  const windowStart = now - (MEMORY_CONFIG.windowDays * 24 * 60 * 60 * 1000);
  
  return {
    userId,
    deviceId,
    lastJourney: null,
    lastChannel: 'unknown',
    lastIntent: 'unknown',
    lastResolutionStatus: 'unknown',
    lastInteractionAt: 0,
    preferredLanguage: 'en',
    preferredChannel: 'chatbot',
    preferredTimeOfDay: 'day',
    commonIntents: [],
    commonTopics: [],
    commonEcosystems: [],
    recentResolutions: [],
    windowStartAt: windowStart,
    windowEndAt: now,
    totalInteractions: 0,
    lastUpdatedAt: now,
  };
}

/**
 * Update memory with new interaction
 */
export function updateMemory(
  memory: MidTermMemory,
  interaction: {
    intent: string;
    topic: string;
    ecosystem: string;
    channel: string;
    language: string;
    resolutionStatus?: string;
    turnCount?: number;
    wasEscalated?: boolean;
  }
): MidTermMemory {
  const now = Date.now();
  const hour = new Date().getHours();
  
  // Update last interaction
  const updated: MidTermMemory = {
    ...memory,
    lastIntent: interaction.intent,
    lastChannel: interaction.channel,
    lastInteractionAt: now,
    lastUpdatedAt: now,
    totalInteractions: memory.totalInteractions + 1,
    windowEndAt: now,
  };
  
  // Update language preference (simple majority)
  if (interaction.language) {
    updated.preferredLanguage = interaction.language;
  }
  
  // Update channel preference
  updated.preferredChannel = interaction.channel;
  
  // Update time of day preference
  updated.preferredTimeOfDay = 
    hour >= 5 && hour < 12 ? 'morning' :
    hour >= 12 && hour < 17 ? 'afternoon' :
    hour >= 17 && hour < 21 ? 'evening' : 'night';
  
  // Update intent frequency
  updated.commonIntents = updateFrequency(
    memory.commonIntents,
    interaction.intent,
    MEMORY_CONFIG.maxIntents
  );
  
  // Update topic frequency
  updated.commonTopics = updateFrequency(
    memory.commonTopics,
    interaction.topic,
    MEMORY_CONFIG.maxTopics
  );
  
  // Update ecosystem frequency
  updated.commonEcosystems = updateFrequencyTyped<EcosystemFrequency>(
    memory.commonEcosystems,
    { ecosystem: interaction.ecosystem, count: 1, lastSeen: now },
    MEMORY_CONFIG.maxEcosystems,
    (a, b) => a.ecosystem === b.ecosystem
  );
  
  // Update last journey
  if (interaction.resolutionStatus) {
    updated.lastJourney = {
      ecosystem: interaction.ecosystem,
      intent: interaction.intent,
      topic: interaction.topic,
      resolutionStatus: interaction.resolutionStatus,
      wasEscalated: interaction.wasEscalated || false,
      turnCount: interaction.turnCount || 0,
      timestamp: now,
    };
    updated.lastResolutionStatus = interaction.resolutionStatus;
    
    // Add to resolution history
    updated.recentResolutions = [
      {
        intent: interaction.intent,
        topic: interaction.topic,
        ecosystem: interaction.ecosystem,
        resolutionStatus: interaction.resolutionStatus,
        turnCount: interaction.turnCount || 0,
        wasEscalated: interaction.wasEscalated || false,
        timestamp: now,
      },
      ...memory.recentResolutions,
    ].slice(0, MEMORY_CONFIG.maxResolutions);
  }
  
  return pruneOldData(updated);
}

/**
 * Update frequency list with new item
 */
function updateFrequency<T extends { count: number; lastSeen: number }>(
  list: Array<T & { intent?: string; topic?: string }>,
  item: string,
  maxItems: number
): Array<T & { intent?: string; topic?: string }> {
  const now = Date.now();
  const key = list[0] && 'intent' in list[0] ? 'intent' : 'topic';
  
  const existing = list.find(i => (i as Record<string, unknown>)[key] === item);
  
  if (existing) {
    return list
      .map(i => (i as Record<string, unknown>)[key] === item 
        ? { ...i, count: i.count + 1, lastSeen: now }
        : i
      )
      .sort((a, b) => b.count - a.count);
  }
  
  const newItem = { [key]: item, count: 1, lastSeen: now } as T & { intent?: string; topic?: string };
  return [...list, newItem]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);
}

/**
 * Generic frequency update
 */
function updateFrequencyTyped<T extends { count: number; lastSeen: number }>(
  list: T[],
  item: T,
  maxItems: number,
  isEqual: (a: T, b: T) => boolean
): T[] {
  const now = Date.now();
  const existing = list.find(i => isEqual(i, item));
  
  if (existing) {
    return list
      .map(i => isEqual(i, item) 
        ? { ...i, count: i.count + 1, lastSeen: now }
        : i
      )
      .sort((a, b) => b.count - a.count);
  }
  
  return [...list, { ...item, lastSeen: now }]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);
}

/**
 * Prune data outside the window
 */
function pruneOldData(memory: MidTermMemory): MidTermMemory {
  const windowStart = Date.now() - (MEMORY_CONFIG.windowDays * 24 * 60 * 60 * 1000);
  
  return {
    ...memory,
    windowStartAt: windowStart,
    commonIntents: memory.commonIntents.filter(i => i.lastSeen >= windowStart),
    commonTopics: memory.commonTopics.filter(t => t.lastSeen >= windowStart),
    commonEcosystems: memory.commonEcosystems.filter(e => e.lastSeen >= windowStart),
    recentResolutions: memory.recentResolutions.filter(r => r.timestamp >= windowStart),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract memory context for current session
 */
export function extractMemoryContext(
  memory: MidTermMemory,
  currentIntent?: string,
  currentTopic?: string
): MemoryContext {
  const now = Date.now();
  const daysSinceLastInteraction = memory.lastInteractionAt 
    ? Math.floor((now - memory.lastInteractionAt) / (1000 * 60 * 60 * 24))
    : -1;
  
  const hasRecentInteraction = daysSinceLastInteraction >= 0 && daysSinceLastInteraction <= 7;
  
  // Check if returning for same issue
  const hoursSinceLastInteraction = memory.lastInteractionAt
    ? (now - memory.lastInteractionAt) / (1000 * 60 * 60)
    : Infinity;
  
  const isReturningForSameIssue = 
    hoursSinceLastInteraction <= MEMORY_CONFIG.sameIssueThresholdHours &&
    memory.lastJourney !== null &&
    memory.lastJourney.resolutionStatus !== 'resolved' &&
    (currentIntent === memory.lastIntent || currentTopic === memory.lastJourney.topic);
  
  // Get top intents/topics
  const topIntents = memory.commonIntents
    .slice(0, 3)
    .map(i => i.intent);
  
  const topTopics = memory.commonTopics
    .slice(0, 3)
    .map(t => t.topic);
  
  // Build last journey summary
  let lastJourneySummary: string | null = null;
  if (memory.lastJourney) {
    const journey = memory.lastJourney;
    if (journey.resolutionStatus === 'resolved') {
      lastJourneySummary = `last time: ${journey.topic} (resolved)`;
    } else if (journey.resolutionStatus === 'escalated') {
      lastJourneySummary = `last time: ${journey.topic} (escalated to human)`;
    } else {
      lastJourneySummary = `last time: ${journey.topic} (${journey.resolutionStatus})`;
    }
  }
  
  // Determine if we should acknowledge return
  const shouldAcknowledgeReturn = 
    hasRecentInteraction &&
    daysSinceLastInteraction <= 3 &&
    !isReturningForSameIssue;
  
  return {
    hasRecentInteraction,
    daysSinceLastInteraction,
    isReturningForSameIssue,
    preferredLanguage: memory.preferredLanguage,
    topIntents,
    topTopics,
    lastJourneySummary,
    shouldAcknowledgeReturn,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format memory context for prompt injection
 */
export function formatMemoryForPrompt(context: MemoryContext): string {
  const lines: string[] = ['## mid-term memory (7-day window)'];
  
  if (!context.hasRecentInteraction) {
    lines.push('no recent interaction history');
    return lines.join('\n');
  }
  
  lines.push(`days since last interaction: ${context.daysSinceLastInteraction}`);
  lines.push(`preferred language: ${context.preferredLanguage}`);
  
  if (context.lastJourneySummary) {
    lines.push(`${context.lastJourneySummary}`);
  }
  
  if (context.topIntents.length > 0) {
    lines.push(`common needs: ${context.topIntents.join(', ')}`);
  }
  
  if (context.topTopics.length > 0) {
    lines.push(`common topics: ${context.topTopics.join(', ')}`);
  }
  
  lines.push('');
  
  // Special handling instructions
  if (context.isReturningForSameIssue) {
    lines.push('⚠️ **IMPORTANT**: user may be returning for unresolved issue');
    lines.push('- acknowledge the previous interaction');
    lines.push('- apologize if issue was not resolved');
    lines.push('- prioritize resolution');
  } else if (context.shouldAcknowledgeReturn) {
    lines.push('**note**: returning user - can acknowledge with "welcome back"');
  }
  
  return lines.join('\n');
}

/**
 * Generate continuation greeting based on memory
 */
export function getContinuationGreeting(context: MemoryContext): string | null {
  if (context.isReturningForSameIssue) {
    return 'i see you were here recently about a similar issue. let me help you get this fully sorted out.';
  }
  
  if (context.shouldAcknowledgeReturn) {
    return 'welcome back.';
  }
  
  return null;
}

/**
 * Get memory insights for analytics
 */
export function getMemoryInsights(memory: MidTermMemory): {
  interactionsInWindow: number;
  topIntent: string | null;
  topTopic: string | null;
  topEcosystem: string | null;
  resolutionRate: number;
  escalationRate: number;
} {
  const resolved = memory.recentResolutions.filter(r => r.resolutionStatus === 'resolved').length;
  const escalated = memory.recentResolutions.filter(r => r.wasEscalated).length;
  const total = memory.recentResolutions.length;
  
  return {
    interactionsInWindow: memory.totalInteractions,
    topIntent: memory.commonIntents[0]?.intent || null,
    topTopic: memory.commonTopics[0]?.topic || null,
    topEcosystem: memory.commonEcosystems[0]?.ecosystem || null,
    resolutionRate: total > 0 ? resolved / total : 0,
    escalationRate: total > 0 ? escalated / total : 0,
  };
}
