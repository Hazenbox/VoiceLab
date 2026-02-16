/**
 * Long-Term Memory Layer (Phase 3.3)
 * 
 * Convex-backed persistent memory for 6-12 month retention.
 * Opt-in feature that stores summarized user preferences.
 * 
 * Privacy-first design:
 * - No PII storage
 * - User can opt-out and delete anytime
 * - Stores only behavioral patterns, not conversation content
 * 
 * @module services/memory/longTermMemory
 */

import type { EcosystemType, ContentChannelType, SupportedLanguage } from '../../types';

// =============================================================================
// Types
// =============================================================================

export interface LongTermMemory {
  // Identity (device-based, no PII)
  deviceId: string;
  userId?: string; // Convex ID if synced
  
  // Consent & Status
  consent: {
    optedIn: boolean;
    consentedAt: number;
    lastReviewedAt: number;
    retentionMonths: 6 | 12;
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARIZED PREFERENCES (not raw data)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Language & Localization
  language: {
    preferred: SupportedLanguage;
    confidence: number; // 0-1 based on consistency
    hinglishComfort: 'none' | 'light' | 'moderate' | 'heavy';
    formalityPreference: 'casual' | 'balanced' | 'formal';
  };
  
  // Communication Style
  style: {
    warmthPreference: number; // 1-4 scale
    detailPreference: number; // 1-3 scale
    emojiTolerance: 'none' | 'minimal' | 'moderate' | 'high';
    preferredOpeningStyle: 'direct' | 'friendly' | 'formal';
    preferredResponseLength: 'concise' | 'moderate' | 'detailed';
  };
  
  // Service Context
  services: {
    primaryEcosystem: EcosystemType;
    commonEcosystems: Array<{ ecosystem: EcosystemType; frequency: number }>;
    primaryChannel: ContentChannelType;
    commonChannels: Array<{ channel: ContentChannelType; frequency: number }>;
    isPrepaid: boolean | null; // null = unknown
    planTier: 'value' | 'standard' | 'premium' | null;
  };
  
  // Interaction Patterns
  patterns: {
    preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | null;
    averageSessionLength: number; // in minutes
    averageMessagesPerSession: number;
    commonIntents: Array<{ intent: string; frequency: number }>;
    escalationRate: number; // 0-1, how often they escalate
    selfServiceSuccess: number; // 0-1, how often self-service resolves
  };
  
  // Quality Signals
  quality: {
    copyRate: number; // 0-1, how often they copy responses
    regenerationRate: number; // 0-1, how often they regenerate
    correctionRate: number; // 0-1, how often they correct
    satisfactionEstimate: number; // 0-1, inferred from signals
  };
  
  // Learned Preferences from Corrections
  learned: {
    avoidPatterns: string[]; // Patterns that led to negative feedback
    preferPatterns: string[]; // Patterns that led to positive feedback
    topCorrectionReasons: string[];
    lastLearnedAt: number;
  };
  
  // Metadata
  metadata: {
    createdAt: number;
    updatedAt: number;
    lastSyncedAt: number; // Last Convex sync
    totalInteractions: number;
    dataWindowStart: number; // Oldest data point
    version: number; // Schema version for migrations
  };
}

export interface LongTermMemoryInput {
  // From session
  sessionLength: number;
  messageCount: number;
  ecosystem: EcosystemType;
  channel: ContentChannelType;
  intent: string;
  language: SupportedLanguage;
  
  // Quality signals
  copied: boolean;
  regenerated: boolean;
  corrected: boolean;
  escalated: boolean;
  resolved: boolean;
  
  // Optional context
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  correctionReason?: string;
  wasPositiveFeedback?: boolean;
  wasNegativeFeedback?: boolean;
}

export interface LongTermMemoryContext {
  isNew: boolean;
  hasHistory: boolean;
  preferredLanguage: SupportedLanguage;
  warmthLevel: number;
  detailLevel: number;
  primaryEcosystem: EcosystemType | null;
  likelyIntent: string | null;
  satisfactionLevel: 'low' | 'medium' | 'high';
  suggestions: string[];
}

// =============================================================================
// Default Values
// =============================================================================

const DEFAULT_MEMORY: Omit<LongTermMemory, 'deviceId' | 'userId'> = {
  consent: {
    optedIn: false,
    consentedAt: 0,
    lastReviewedAt: 0,
    retentionMonths: 6,
  },
  language: {
    preferred: 'en' as SupportedLanguage,
    confidence: 0,
    hinglishComfort: 'none',
    formalityPreference: 'balanced',
  },
  style: {
    warmthPreference: 3,
    detailPreference: 2,
    emojiTolerance: 'minimal',
    preferredOpeningStyle: 'friendly',
    preferredResponseLength: 'moderate',
  },
  services: {
    primaryEcosystem: 'jio_mobility' as EcosystemType,
    commonEcosystems: [],
    primaryChannel: 'customer_care_chat' as ContentChannelType,
    commonChannels: [],
    isPrepaid: null,
    planTier: null,
  },
  patterns: {
    preferredTimeOfDay: null,
    averageSessionLength: 0,
    averageMessagesPerSession: 0,
    commonIntents: [],
    escalationRate: 0,
    selfServiceSuccess: 0.5,
  },
  quality: {
    copyRate: 0,
    regenerationRate: 0,
    correctionRate: 0,
    satisfactionEstimate: 0.5,
  },
  learned: {
    avoidPatterns: [],
    preferPatterns: [],
    topCorrectionReasons: [],
    lastLearnedAt: 0,
  },
  metadata: {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastSyncedAt: 0,
    totalInteractions: 0,
    dataWindowStart: Date.now(),
    version: 1,
  },
};

// =============================================================================
// In-Memory Cache
// =============================================================================

const memoryCache = new Map<string, LongTermMemory>();
const CACHE_TTL = 60 * 1000; // 1 minute
const cacheTimestamps = new Map<string, number>();

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Create an empty long-term memory for a device
 */
export function createLongTermMemory(deviceId: string): LongTermMemory {
  return {
    ...DEFAULT_MEMORY,
    deviceId,
    consent: { ...DEFAULT_MEMORY.consent },
    language: { ...DEFAULT_MEMORY.language },
    style: { ...DEFAULT_MEMORY.style },
    services: { 
      ...DEFAULT_MEMORY.services,
      commonEcosystems: [],
      commonChannels: [],
    },
    patterns: { 
      ...DEFAULT_MEMORY.patterns,
      commonIntents: [],
    },
    quality: { ...DEFAULT_MEMORY.quality },
    learned: { 
      ...DEFAULT_MEMORY.learned,
      avoidPatterns: [],
      preferPatterns: [],
      topCorrectionReasons: [],
    },
    metadata: {
      ...DEFAULT_MEMORY.metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dataWindowStart: Date.now(),
    },
  };
}

/**
 * Get memory from cache or create new
 */
export function getLongTermMemory(deviceId: string): LongTermMemory {
  const cached = memoryCache.get(deviceId);
  const cachedAt = cacheTimestamps.get(deviceId) || 0;
  
  if (cached && Date.now() - cachedAt < CACHE_TTL) {
    return cached;
  }
  
  // Create new if not cached
  const memory = createLongTermMemory(deviceId);
  memoryCache.set(deviceId, memory);
  cacheTimestamps.set(deviceId, Date.now());
  
  return memory;
}

/**
 * Check if user has opted in to long-term memory
 */
export function hasOptedIn(memory: LongTermMemory): boolean {
  return memory.consent.optedIn;
}

/**
 * Opt in to long-term memory
 */
export function optIn(
  memory: LongTermMemory,
  retentionMonths: 6 | 12 = 6,
): LongTermMemory {
  return {
    ...memory,
    consent: {
      optedIn: true,
      consentedAt: Date.now(),
      lastReviewedAt: Date.now(),
      retentionMonths,
    },
    metadata: {
      ...memory.metadata,
      updatedAt: Date.now(),
    },
  };
}

/**
 * Opt out and clear all memory
 */
export function optOut(deviceId: string): LongTermMemory {
  const cleared = createLongTermMemory(deviceId);
  cleared.consent.optedIn = false;
  cleared.consent.lastReviewedAt = Date.now();
  
  memoryCache.set(deviceId, cleared);
  cacheTimestamps.set(deviceId, Date.now());
  
  return cleared;
}

/**
 * Update memory with new interaction data
 * Uses exponential moving average for smooth updates
 */
export function updateLongTermMemory(
  memory: LongTermMemory,
  input: LongTermMemoryInput,
): LongTermMemory {
  if (!memory.consent.optedIn) {
    return memory; // Don't update if not opted in
  }
  
  const alpha = 0.1; // Learning rate
  const now = Date.now();
  const totalInteractions = memory.metadata.totalInteractions + 1;
  
  // Update language preferences
  const languageMatches = input.language === memory.language.preferred;
  const newLanguageConfidence = languageMatches 
    ? Math.min(1, memory.language.confidence + alpha)
    : Math.max(0, memory.language.confidence - alpha);
  
  // Update service usage
  const ecosystemFreq = updateFrequencyList(
    memory.services.commonEcosystems,
    input.ecosystem,
    10,
  ) as Array<{ ecosystem: EcosystemType; frequency: number }>;
  
  const channelFreq = updateFrequencyList(
    memory.services.commonChannels,
    input.channel,
    10,
  ) as Array<{ channel: ContentChannelType; frequency: number }>;
  
  const intentFreq = updateFrequencyList(
    memory.patterns.commonIntents,
    input.intent,
    10,
  );
  
  // Update quality signals (exponential moving average)
  const newCopyRate = ema(memory.quality.copyRate, input.copied ? 1 : 0, alpha);
  const newRegenRate = ema(memory.quality.regenerationRate, input.regenerated ? 1 : 0, alpha);
  const newCorrectionRate = ema(memory.quality.correctionRate, input.corrected ? 1 : 0, alpha);
  
  // Update escalation and self-service success
  const newEscalationRate = ema(memory.patterns.escalationRate, input.escalated ? 1 : 0, alpha);
  const newSelfServiceSuccess = ema(
    memory.patterns.selfServiceSuccess,
    input.resolved && !input.escalated ? 1 : 0,
    alpha,
  );
  
  // Estimate satisfaction from signals
  let satisfactionDelta = 0;
  if (input.copied) satisfactionDelta += 0.3;
  if (input.wasPositiveFeedback) satisfactionDelta += 0.5;
  if (input.wasNegativeFeedback) satisfactionDelta -= 0.4;
  if (input.regenerated) satisfactionDelta -= 0.2;
  if (input.corrected) satisfactionDelta -= 0.1;
  if (input.escalated) satisfactionDelta -= 0.3;
  
  const newSatisfaction = clamp(
    ema(memory.quality.satisfactionEstimate, 0.5 + satisfactionDelta, alpha),
    0,
    1,
  );
  
  // Update learned patterns
  const learned = { ...memory.learned };
  if (input.correctionReason && !learned.topCorrectionReasons.includes(input.correctionReason)) {
    learned.topCorrectionReasons = [
      input.correctionReason,
      ...learned.topCorrectionReasons.slice(0, 9),
    ];
    learned.lastLearnedAt = now;
  }
  
  // Update time preferences
  let preferredTime = memory.patterns.preferredTimeOfDay;
  if (input.timeOfDay) {
    // Simple majority voting over recent interactions
    preferredTime = input.timeOfDay; // Simplified - could use more sophisticated tracking
  }
  
  // Update average session metrics
  const newAvgSessionLength = ema(memory.patterns.averageSessionLength, input.sessionLength, alpha);
  const newAvgMessages = ema(memory.patterns.averageMessagesPerSession, input.messageCount, alpha);
  
  // Find primary ecosystem and channel
  const primaryEcosystem = ecosystemFreq.length > 0 
    ? ecosystemFreq.reduce((a, b) => a.frequency > b.frequency ? a : b).ecosystem
    : memory.services.primaryEcosystem;
  
  const primaryChannel = channelFreq.length > 0
    ? channelFreq.reduce((a, b) => a.frequency > b.frequency ? a : b).channel
    : memory.services.primaryChannel;
  
  return {
    ...memory,
    language: {
      ...memory.language,
      preferred: languageMatches ? memory.language.preferred : 
        (newLanguageConfidence < 0.3 ? input.language : memory.language.preferred),
      confidence: newLanguageConfidence,
    },
    services: {
      ...memory.services,
      primaryEcosystem,
      commonEcosystems: ecosystemFreq,
      primaryChannel,
      commonChannels: channelFreq,
    },
    patterns: {
      ...memory.patterns,
      preferredTimeOfDay: preferredTime,
      averageSessionLength: newAvgSessionLength,
      averageMessagesPerSession: newAvgMessages,
      commonIntents: intentFreq,
      escalationRate: newEscalationRate,
      selfServiceSuccess: newSelfServiceSuccess,
    },
    quality: {
      copyRate: newCopyRate,
      regenerationRate: newRegenRate,
      correctionRate: newCorrectionRate,
      satisfactionEstimate: newSatisfaction,
    },
    learned,
    metadata: {
      ...memory.metadata,
      updatedAt: now,
      totalInteractions,
    },
  };
}

/**
 * Extract context for prompt injection
 */
export function extractMemoryContext(memory: LongTermMemory): LongTermMemoryContext {
  const isNew = memory.metadata.totalInteractions < 5;
  const hasHistory = memory.consent.optedIn && memory.metadata.totalInteractions > 10;
  
  // Determine satisfaction level
  let satisfactionLevel: 'low' | 'medium' | 'high' = 'medium';
  if (memory.quality.satisfactionEstimate < 0.4) satisfactionLevel = 'low';
  else if (memory.quality.satisfactionEstimate > 0.7) satisfactionLevel = 'high';
  
  // Get likely intent from history
  const likelyIntent = memory.patterns.commonIntents.length > 0
    ? memory.patterns.commonIntents.reduce((a, b) => a.frequency > b.frequency ? a : b).intent
    : null;
  
  // Build suggestions based on history
  const suggestions: string[] = [];
  
  if (memory.quality.regenerationRate > 0.3) {
    suggestions.push('User often regenerates - provide more detailed first responses');
  }
  
  if (memory.patterns.escalationRate > 0.2) {
    suggestions.push('User often escalates - proactively offer escalation path');
  }
  
  if (memory.quality.copyRate > 0.7) {
    suggestions.push('User frequently copies responses - they value ready-to-use content');
  }
  
  if (memory.learned.topCorrectionReasons.includes('too formal')) {
    suggestions.push('User prefers casual tone');
  }
  
  if (memory.learned.topCorrectionReasons.includes('too casual')) {
    suggestions.push('User prefers formal tone');
  }
  
  return {
    isNew,
    hasHistory,
    preferredLanguage: memory.language.preferred,
    warmthLevel: memory.style.warmthPreference,
    detailLevel: memory.style.detailPreference,
    primaryEcosystem: hasHistory ? memory.services.primaryEcosystem : null,
    likelyIntent,
    satisfactionLevel,
    suggestions,
  };
}

/**
 * Generate prompt instructions from memory
 */
export function getMemoryPromptSection(memory: LongTermMemory): string | null {
  if (!memory.consent.optedIn || memory.metadata.totalInteractions < 10) {
    return null; // Not enough data
  }
  
  const context = extractMemoryContext(memory);
  
  const lines: string[] = [
    '## User History Context (Long-Term Memory)',
    '',
  ];
  
  // Language preference
  lines.push(`- Preferred language: ${memory.language.preferred}`);
  lines.push(`- Formality preference: ${memory.language.formalityPreference}`);
  
  // Service context
  if (memory.services.primaryEcosystem) {
    lines.push(`- Primary service: ${memory.services.primaryEcosystem}`);
  }
  
  // Communication style
  lines.push(`- Warmth level: ${memory.style.warmthPreference}/4`);
  lines.push(`- Detail level: ${memory.style.detailPreference}/3`);
  lines.push(`- Response length: ${memory.style.preferredResponseLength}`);
  
  // Add suggestions if any
  if (context.suggestions.length > 0) {
    lines.push('');
    lines.push('**Personalization hints:**');
    context.suggestions.forEach(s => lines.push(`- ${s}`));
  }
  
  return lines.join('\n');
}

/**
 * Check if memory data is stale and should be pruned
 */
export function isStale(memory: LongTermMemory): boolean {
  const retentionMs = memory.consent.retentionMonths * 30 * 24 * 60 * 60 * 1000;
  return Date.now() - memory.metadata.dataWindowStart > retentionMs;
}

/**
 * Prune old data beyond retention window
 */
export function pruneStaleData(memory: LongTermMemory): LongTermMemory {
  if (!isStale(memory)) return memory;
  
  // Reset to defaults but keep consent
  const fresh = createLongTermMemory(memory.deviceId);
  fresh.userId = memory.userId;
  fresh.consent = memory.consent;
  fresh.metadata.dataWindowStart = Date.now();
  
  return fresh;
}

// =============================================================================
// Convex Sync Functions
// =============================================================================

/**
 * Convert Convex userLearningProfile to LongTermMemory
 */
export function fromConvexLearningProfile(
  deviceId: string,
  convexProfile: {
    userId: string;
    preferredWarmth?: number;
    preferredDetail?: number;
    preferredLanguage?: string;
    commonIntents?: Array<{ intent: string; frequency: number }>;
    commonEcosystems?: Array<{ ecosystem: string; frequency: number }>;
    correctionFrequency: number;
    topCorrectionReasons?: string[];
    regenerationRate?: number;
    copyRate?: number;
    totalInteractions: number;
    lastAggregatedAt: number;
  },
): LongTermMemory {
  const memory = createLongTermMemory(deviceId);
  memory.userId = convexProfile.userId;
  memory.consent.optedIn = true; // Assume opted in if profile exists
  
  // Style preferences
  if (convexProfile.preferredWarmth) {
    memory.style.warmthPreference = convexProfile.preferredWarmth;
  }
  if (convexProfile.preferredDetail) {
    memory.style.detailPreference = convexProfile.preferredDetail;
  }
  
  // Language
  if (convexProfile.preferredLanguage) {
    memory.language.preferred = convexProfile.preferredLanguage as SupportedLanguage;
    memory.language.confidence = 0.8;
  }
  
  // Patterns
  if (convexProfile.commonIntents) {
    memory.patterns.commonIntents = convexProfile.commonIntents;
  }
  if (convexProfile.commonEcosystems) {
    memory.services.commonEcosystems = convexProfile.commonEcosystems.map(e => ({
      ecosystem: e.ecosystem as EcosystemType,
      frequency: e.frequency,
    }));
  }
  
  // Quality signals
  memory.quality.correctionRate = convexProfile.correctionFrequency / 100;
  if (convexProfile.regenerationRate) {
    memory.quality.regenerationRate = convexProfile.regenerationRate / 100;
  }
  if (convexProfile.copyRate) {
    memory.quality.copyRate = convexProfile.copyRate / 100;
  }
  
  // Learned
  if (convexProfile.topCorrectionReasons) {
    memory.learned.topCorrectionReasons = convexProfile.topCorrectionReasons;
  }
  
  // Metadata
  memory.metadata.totalInteractions = convexProfile.totalInteractions;
  memory.metadata.lastSyncedAt = convexProfile.lastAggregatedAt;
  memory.metadata.updatedAt = convexProfile.lastAggregatedAt;
  
  return memory;
}

/**
 * Convert LongTermMemory to Convex update format
 */
export function toConvexUpdate(memory: LongTermMemory): Record<string, unknown> {
  return {
    preferredWarmth: memory.style.warmthPreference,
    preferredDetail: memory.style.detailPreference,
    preferredLanguage: memory.language.preferred,
    commonIntents: memory.patterns.commonIntents,
    commonEcosystems: memory.services.commonEcosystems.map(e => ({
      ecosystem: e.ecosystem,
      frequency: e.frequency,
    })),
    correctionFrequency: Math.round(memory.quality.correctionRate * 100),
    topCorrectionReasons: memory.learned.topCorrectionReasons,
    regenerationRate: Math.round(memory.quality.regenerationRate * 100),
    copyRate: Math.round(memory.quality.copyRate * 100),
    totalInteractions: memory.metadata.totalInteractions,
    lastAggregatedAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Exponential moving average
 */
function ema(current: number, newValue: number, alpha: number): number {
  return alpha * newValue + (1 - alpha) * current;
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Update a frequency list with a new value
 */
function updateFrequencyList<T extends { frequency: number } & Record<string, unknown>>(
  list: T[],
  value: string,
  maxItems: number,
): T[] {
  const key = Object.keys(list[0] || {}).find(k => k !== 'frequency') || 'value';
  const existing = list.find(item => (item as Record<string, unknown>)[key] === value);
  
  if (existing) {
    return list.map(item => 
      (item as Record<string, unknown>)[key] === value
        ? { ...item, frequency: item.frequency + 1 }
        : item
    );
  }
  
  // Add new entry
  const newEntry = { [key]: value, frequency: 1 } as T;
  const updated = [...list, newEntry];
  
  // Keep only top N by frequency
  return updated
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, maxItems);
}

/**
 * Clear the in-memory cache
 */
export function clearCache(): void {
  memoryCache.clear();
  cacheTimestamps.clear();
}
