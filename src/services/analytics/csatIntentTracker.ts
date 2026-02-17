/**
 * CSAT Collection & Intent Accuracy Tracking (Phase 3.4)
 * 
 * Collects customer satisfaction scores post-conversation
 * and logs intent detection accuracy for continuous improvement.
 * 
 * @module services/analytics/csatIntentTracker
 */

import type { EcosystemType, ContentChannelType } from '../../types';

// =============================================================================
// Types
// =============================================================================

export interface CSATScore {
  /** 1-5 rating (1=very unsatisfied, 5=very satisfied) */
  score: 1 | 2 | 3 | 4 | 5;
  /** Optional feedback text */
  feedback?: string;
  /** What aspect they're rating */
  aspect: 'overall' | 'response_quality' | 'resolution_speed' | 'helpfulness';
}

export interface CSATCollection {
  sessionId: string;
  deviceId: string;
  
  // Context
  ecosystem: EcosystemType;
  channel: ContentChannelType;
  turnCount: number;
  wasEscalated: boolean;
  wasResolved: boolean;
  
  // Scores
  scores: CSATScore[];
  aggregateScore: number; // Average of all scores
  
  // Timing
  collectedAt: number;
  conversationEndedAt: number;
  responseDelaySeconds: number; // Time from end to CSAT submission
}

export interface IntentAccuracyLog {
  sessionId: string;
  deviceId: string;
  messageIndex: number;
  
  // Intent detection
  detectedIntent: string;
  detectedConfidence: number;
  
  // Ground truth (from user correction or implicit signals)
  actualIntent?: string;
  wasCorrect: boolean | null; // null = unknown
  
  // Context
  ecosystem: EcosystemType;
  channel: ContentChannelType;
  userMessage: string; // Truncated for privacy
  
  // Correction source
  correctionSource?: 'user_explicit' | 'user_redirect' | 'escalation' | 'inferred';
  
  timestamp: number;
}

export interface CSATPromptConfig {
  /** When to show CSAT prompt */
  trigger: 'resolution' | 'escalation' | 'session_end' | 'turn_threshold';
  /** Minimum turns before prompting */
  minTurns: number;
  /** Skip if user explicitly opted out */
  respectOptOut: boolean;
  /** Cooldown between prompts (hours) */
  cooldownHours: number;
}

export interface IntentAccuracyMetrics {
  totalIntents: number;
  correctIntents: number;
  incorrectIntents: number;
  unknownIntents: number;
  accuracyRate: number;
  topMisclassifications: Array<{
    detected: string;
    actual: string;
    count: number;
  }>;
  byEcosystem: Record<string, { correct: number; total: number; accuracy: number }>;
  byChannel: Record<string, { correct: number; total: number; accuracy: number }>;
}

export interface CSATMetrics {
  totalResponses: number;
  averageScore: number;
  scoreDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  byAspect: Record<string, { average: number; count: number }>;
  byEcosystem: Record<string, { average: number; count: number }>;
  byChannel: Record<string, { average: number; count: number }>;
  npsScore: number; // -100 to 100
  satisfiedRate: number; // % scoring 4-5
  dissatisfiedRate: number; // % scoring 1-2
}

// =============================================================================
// Default Config
// =============================================================================

export const DEFAULT_CSAT_CONFIG: CSATPromptConfig = {
  trigger: 'resolution',
  minTurns: 3,
  respectOptOut: true,
  cooldownHours: 24,
};

// =============================================================================
// In-Memory Storage
// =============================================================================

const csatCollections: CSATCollection[] = [];
const intentLogs: IntentAccuracyLog[] = [];
const lastCSATPrompt = new Map<string, number>(); // deviceId -> timestamp
const csatOptOuts = new Set<string>(); // deviceIds that opted out

// =============================================================================
// CSAT Collection
// =============================================================================

/**
 * Check if we should prompt for CSAT
 */
export function shouldPromptCSAT(
  deviceId: string,
  turnCount: number,
  isResolved: boolean,
  isEscalated: boolean,
  config: CSATPromptConfig = DEFAULT_CSAT_CONFIG,
): boolean {
  // Check opt-out
  if (config.respectOptOut && csatOptOuts.has(deviceId)) {
    return false;
  }
  
  // Check minimum turns
  if (turnCount < config.minTurns) {
    return false;
  }
  
  // Check cooldown
  const lastPrompt = lastCSATPrompt.get(deviceId) || 0;
  const cooldownMs = config.cooldownHours * 60 * 60 * 1000;
  if (Date.now() - lastPrompt < cooldownMs) {
    return false;
  }
  
  // Check trigger condition
  switch (config.trigger) {
    case 'resolution':
      return isResolved;
    case 'escalation':
      return isEscalated;
    case 'session_end':
      return true;
    case 'turn_threshold':
      return turnCount >= config.minTurns;
    default:
      return false;
  }
}

/**
 * Generate CSAT prompt message
 */
export function generateCSATPrompt(
  aspect: CSATScore['aspect'] = 'overall',
): string {
  const prompts: Record<CSATScore['aspect'], string> = {
    overall: 'How would you rate your overall experience? (1-5)',
    response_quality: 'How helpful were my responses? (1-5)',
    resolution_speed: 'How satisfied are you with the resolution time? (1-5)',
    helpfulness: 'Did I answer your questions effectively? (1-5)',
  };
  
  return prompts[aspect];
}

/**
 * Record CSAT response
 */
export function recordCSATResponse(
  collection: Omit<CSATCollection, 'aggregateScore'>,
): CSATCollection {
  const aggregateScore = collection.scores.length > 0
    ? collection.scores.reduce((sum, s) => sum + s.score, 0) / collection.scores.length
    : 0;
  
  const fullCollection: CSATCollection = {
    ...collection,
    aggregateScore,
  };
  
  csatCollections.push(fullCollection);
  lastCSATPrompt.set(collection.deviceId, Date.now());
  
  return fullCollection;
}

/**
 * User opts out of CSAT prompts
 */
export function optOutCSAT(deviceId: string): void {
  csatOptOuts.add(deviceId);
}

/**
 * User opts back in to CSAT prompts
 */
export function optInCSAT(deviceId: string): void {
  csatOptOuts.delete(deviceId);
}

/**
 * Calculate CSAT metrics
 */
export function calculateCSATMetrics(
  collections: CSATCollection[] = csatCollections,
): CSATMetrics {
  if (collections.length === 0) {
    return {
      totalResponses: 0,
      averageScore: 0,
      scoreDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      byAspect: {},
      byEcosystem: {},
      byChannel: {},
      npsScore: 0,
      satisfiedRate: 0,
      dissatisfiedRate: 0,
    };
  }
  
  // Flatten all scores
  const allScores = collections.flatMap(c => c.scores);
  
  // Score distribution
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const s of allScores) {
    distribution[s.score]++;
  }
  
  // Average score
  const averageScore = allScores.reduce((sum, s) => sum + s.score, 0) / allScores.length;
  
  // By aspect
  const byAspect: Record<string, { average: number; count: number }> = {};
  for (const s of allScores) {
    if (!byAspect[s.aspect]) {
      byAspect[s.aspect] = { average: 0, count: 0 };
    }
    byAspect[s.aspect].count++;
    byAspect[s.aspect].average = 
      (byAspect[s.aspect].average * (byAspect[s.aspect].count - 1) + s.score) / byAspect[s.aspect].count;
  }
  
  // By ecosystem
  const byEcosystem: Record<string, { average: number; count: number }> = {};
  for (const c of collections) {
    if (!byEcosystem[c.ecosystem]) {
      byEcosystem[c.ecosystem] = { average: 0, count: 0 };
    }
    byEcosystem[c.ecosystem].count++;
    byEcosystem[c.ecosystem].average = 
      (byEcosystem[c.ecosystem].average * (byEcosystem[c.ecosystem].count - 1) + c.aggregateScore) / byEcosystem[c.ecosystem].count;
  }
  
  // By channel
  const byChannel: Record<string, { average: number; count: number }> = {};
  for (const c of collections) {
    if (!byChannel[c.channel]) {
      byChannel[c.channel] = { average: 0, count: 0 };
    }
    byChannel[c.channel].count++;
    byChannel[c.channel].average = 
      (byChannel[c.channel].average * (byChannel[c.channel].count - 1) + c.aggregateScore) / byChannel[c.channel].count;
  }
  
  // NPS-style calculation (promoters - detractors)
  // CSAT 5 = promoter, 4 = passive, 1-3 = detractor
  const promoters = distribution[5];
  const detractors = distribution[1] + distribution[2] + distribution[3];
  const totalForNPS = allScores.length;
  const npsScore = Math.round(((promoters - detractors) / totalForNPS) * 100);
  
  // Satisfied (4-5) and dissatisfied (1-2) rates
  const satisfied = distribution[4] + distribution[5];
  const dissatisfied = distribution[1] + distribution[2];
  const satisfiedRate = totalForNPS > 0 ? satisfied / totalForNPS : 0;
  const dissatisfiedRate = totalForNPS > 0 ? dissatisfied / totalForNPS : 0;
  
  return {
    totalResponses: collections.length,
    averageScore,
    scoreDistribution: distribution,
    byAspect,
    byEcosystem,
    byChannel,
    npsScore,
    satisfiedRate,
    dissatisfiedRate,
  };
}

// =============================================================================
// Intent Accuracy Logging
// =============================================================================

/**
 * Log detected intent for accuracy tracking
 */
export function logDetectedIntent(
  log: Omit<IntentAccuracyLog, 'wasCorrect'>,
): IntentAccuracyLog {
  const fullLog: IntentAccuracyLog = {
    ...log,
    wasCorrect: null, // Will be updated later if we learn the actual intent
    userMessage: truncateForPrivacy(log.userMessage),
  };
  
  intentLogs.push(fullLog);
  return fullLog;
}

/**
 * Update intent log with actual intent (correction)
 */
export function correctIntentLog(
  sessionId: string,
  messageIndex: number,
  actualIntent: string,
  correctionSource: IntentAccuracyLog['correctionSource'],
): IntentAccuracyLog | null {
  const log = intentLogs.find(
    l => l.sessionId === sessionId && l.messageIndex === messageIndex
  );
  
  if (!log) return null;
  
  log.actualIntent = actualIntent;
  log.wasCorrect = log.detectedIntent.toLowerCase() === actualIntent.toLowerCase();
  log.correctionSource = correctionSource;
  
  return log;
}

/**
 * Infer intent correctness from user behavior
 */
export function inferIntentCorrectness(
  sessionId: string,
  messageIndex: number,
  signals: {
    userRedirected?: boolean;
    userEscalated?: boolean;
    userConfirmed?: boolean;
    responseWasHelpful?: boolean;
  },
): void {
  const log = intentLogs.find(
    l => l.sessionId === sessionId && l.messageIndex === messageIndex
  );
  
  if (!log) return;
  
  // If user confirmed or response was helpful, intent was likely correct
  if (signals.userConfirmed || signals.responseWasHelpful) {
    log.wasCorrect = true;
    log.correctionSource = 'inferred';
  }
  
  // If user redirected or escalated, intent might have been wrong
  if (signals.userRedirected) {
    log.wasCorrect = false;
    log.correctionSource = 'user_redirect';
  }
  
  if (signals.userEscalated && log.detectedIntent !== 'escalation') {
    log.wasCorrect = false;
    log.correctionSource = 'escalation';
  }
}

/**
 * Calculate intent accuracy metrics
 */
export function calculateIntentAccuracyMetrics(
  logs: IntentAccuracyLog[] = intentLogs,
): IntentAccuracyMetrics {
  const total = logs.length;
  const known = logs.filter(l => l.wasCorrect !== null);
  const correct = known.filter(l => l.wasCorrect === true);
  const incorrect = known.filter(l => l.wasCorrect === false);
  const unknown = logs.filter(l => l.wasCorrect === null);
  
  // Top misclassifications
  const misclassMap = new Map<string, number>();
  for (const log of incorrect) {
    if (log.actualIntent) {
      const key = `${log.detectedIntent}::${log.actualIntent}`;
      misclassMap.set(key, (misclassMap.get(key) || 0) + 1);
    }
  }
  
  const topMisclassifications = Array.from(misclassMap.entries())
    .map(([key, count]) => {
      const [detected, actual] = key.split('::');
      return { detected, actual, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // By ecosystem
  const byEcosystem: Record<string, { correct: number; total: number; accuracy: number }> = {};
  for (const log of known) {
    if (!byEcosystem[log.ecosystem]) {
      byEcosystem[log.ecosystem] = { correct: 0, total: 0, accuracy: 0 };
    }
    byEcosystem[log.ecosystem].total++;
    if (log.wasCorrect) byEcosystem[log.ecosystem].correct++;
  }
  for (const eco of Object.keys(byEcosystem)) {
    byEcosystem[eco].accuracy = byEcosystem[eco].total > 0 
      ? byEcosystem[eco].correct / byEcosystem[eco].total 
      : 0;
  }
  
  // By channel
  const byChannel: Record<string, { correct: number; total: number; accuracy: number }> = {};
  for (const log of known) {
    if (!byChannel[log.channel]) {
      byChannel[log.channel] = { correct: 0, total: 0, accuracy: 0 };
    }
    byChannel[log.channel].total++;
    if (log.wasCorrect) byChannel[log.channel].correct++;
  }
  for (const chan of Object.keys(byChannel)) {
    byChannel[chan].accuracy = byChannel[chan].total > 0 
      ? byChannel[chan].correct / byChannel[chan].total 
      : 0;
  }
  
  return {
    totalIntents: total,
    correctIntents: correct.length,
    incorrectIntents: incorrect.length,
    unknownIntents: unknown.length,
    accuracyRate: known.length > 0 ? correct.length / known.length : 0,
    topMisclassifications,
    byEcosystem,
    byChannel,
  };
}

// =============================================================================
// Convex Sync Helpers
// =============================================================================

/**
 * Convert CSAT collection to Convex event format
 */
export function csatToConvexEvent(
  csat: CSATCollection,
  userId: string,
): Record<string, unknown> {
  return {
    userId,
    deviceId: csat.deviceId,
    eventType: 'csat_response',
    ecosystem: csat.ecosystem,
    channel: csat.channel,
    persona: 'jio', // Default
    trustScore: csat.aggregateScore * 20, // Convert 1-5 to 0-100
    timestamp: csat.collectedAt,
    metadata: JSON.stringify({
      scores: csat.scores,
      turnCount: csat.turnCount,
      wasResolved: csat.wasResolved,
      wasEscalated: csat.wasEscalated,
      responseDelaySeconds: csat.responseDelaySeconds,
    }),
  };
}

/**
 * Convert intent log to Convex event format
 */
export function intentLogToConvexEvent(
  log: IntentAccuracyLog,
  userId: string,
): Record<string, unknown> {
  return {
    userId,
    deviceId: log.deviceId,
    eventType: 'intent_accuracy',
    ecosystem: log.ecosystem,
    channel: log.channel,
    persona: 'jio', // Default
    timestamp: log.timestamp,
    metadata: JSON.stringify({
      detectedIntent: log.detectedIntent,
      detectedConfidence: log.detectedConfidence,
      actualIntent: log.actualIntent,
      wasCorrect: log.wasCorrect,
      correctionSource: log.correctionSource,
      messageIndex: log.messageIndex,
    }),
  };
}

/**
 * Get pending logs to sync to Convex
 */
export function getPendingSyncData(): {
  csatCollections: CSATCollection[];
  intentLogs: IntentAccuracyLog[];
} {
  // Return all unsynced data
  // In a real implementation, we'd track which ones have been synced
  return {
    csatCollections: [...csatCollections],
    intentLogs: intentLogs.filter(l => l.wasCorrect !== null), // Only sync confirmed logs
  };
}

/**
 * Clear synced data after successful Convex sync
 */
export function clearSyncedData(): void {
  csatCollections.length = 0;
  // Keep intent logs with unknown status, clear known ones
  const unknown = intentLogs.filter(l => l.wasCorrect === null);
  intentLogs.length = 0;
  intentLogs.push(...unknown);
}

/**
 * Clear ALL data (for testing purposes)
 */
export function clearAllData(): void {
  csatCollections.length = 0;
  intentLogs.length = 0;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Truncate message for privacy (max 100 chars, remove potential PII)
 */
function truncateForPrivacy(message: string): string {
  // Remove potential phone numbers
  let cleaned = message.replace(/\b\d{10,}\b/g, '[REDACTED]');
  // Remove email patterns
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  // Truncate
  if (cleaned.length > 100) {
    cleaned = cleaned.substring(0, 97) + '...';
  }
  return cleaned;
}

/**
 * Get CSAT score label
 */
export function getCSATLabel(score: 1 | 2 | 3 | 4 | 5): string {
  const labels: Record<1 | 2 | 3 | 4 | 5, string> = {
    1: 'very unsatisfied',
    2: 'unsatisfied',
    3: 'neutral',
    4: 'satisfied',
    5: 'very satisfied',
  };
  return labels[score];
}

/**
 * Get intent accuracy summary for prompt context
 */
export function getIntentAccuracySummary(): string {
  const metrics = calculateIntentAccuracyMetrics();
  
  if (metrics.totalIntents < 10) {
    return ''; // Not enough data
  }
  
  const lines: string[] = [];
  
  if (metrics.accuracyRate < 0.8) {
    lines.push('Note: Intent detection accuracy is below target. Be extra careful to confirm user intent.');
  }
  
  if (metrics.topMisclassifications.length > 0) {
    const top = metrics.topMisclassifications[0];
    lines.push(`Common misclassification: "${top.detected}" often confused with "${top.actual}"`);
  }
  
  return lines.join('\n');
}

/**
 * Check if device should be prompted for CSAT based on history
 */
export function getDeviceCSATHistory(deviceId: string): {
  lastPrompted: number | null;
  optedOut: boolean;
  totalResponses: number;
  averageScore: number | null;
} {
  const deviceCollections = csatCollections.filter(c => c.deviceId === deviceId);
  
  return {
    lastPrompted: lastCSATPrompt.get(deviceId) || null,
    optedOut: csatOptOuts.has(deviceId),
    totalResponses: deviceCollections.length,
    averageScore: deviceCollections.length > 0
      ? deviceCollections.reduce((sum, c) => sum + c.aggregateScore, 0) / deviceCollections.length
      : null,
  };
}
