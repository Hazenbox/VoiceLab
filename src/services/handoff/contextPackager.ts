/**
 * Context Packager
 * 
 * Packages conversation context for human agent handoff.
 * Creates structured summary for seamless transition.
 * 
 * @module services/handoff/contextPackager
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Packaged context for handoff
 */
export interface PackagedContext {
  /** Unique handoff ID */
  handoffId: string;
  /** Timestamp */
  timestamp: number;
  
  // Customer identification
  customer: CustomerContext;
  
  // Issue summary
  issue: IssueContext;
  
  // Conversation summary
  conversation: ConversationContext;
  
  // Resolution attempts
  resolution: ResolutionContext;
  
  // Emotional state
  emotional: EmotionalContext;
  
  // Recommended actions
  recommendations: string[];
  
  // Full conversation (optional)
  transcriptIncluded: boolean;
  transcript?: ConversationMessage[];
}

/**
 * Customer context
 */
export interface CustomerContext {
  identifier: string; // masked phone/account
  segment: string;
  tenure: string;
  isHighValue: boolean;
  preferredLanguage: string;
  region?: string;
}

/**
 * Issue context
 */
export interface IssueContext {
  category: string;
  summary: string;
  keywords: string[];
  ecosystem: string;
  urgency: string;
  firstMentionedAt: number;
}

/**
 * Conversation context
 */
export interface ConversationContext {
  sessionId: string;
  startTime: number;
  duration: string;
  turnCount: number;
  channel: string;
  entryPoint: string;
}

/**
 * Resolution context
 */
export interface ResolutionContext {
  status: string;
  attemptCount: number;
  attemptsSummary: string[];
  blockedBy?: string;
  lastAttemptAt: number;
}

/**
 * Emotional context
 */
export interface EmotionalContext {
  currentEmotion: string;
  intensity: string;
  emotionTrend: 'improving' | 'stable' | 'worsening';
  sentimentScore: number; // -1 to 1
  keyPhrases: string[];
}

/**
 * Conversation message
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/**
 * Input for packaging
 */
export interface PackagingInput {
  sessionId: string;
  conversationHistory: ConversationMessage[];
  
  // Classification
  intent: string;
  topic: string;
  ecosystem: string;
  emotion: string;
  emotionIntensity: string;
  
  // Customer
  customerId?: string;
  segment?: string;
  tenure?: string;
  isHighValue?: boolean;
  preferredLanguage?: string;
  region?: string;
  
  // Resolution
  resolutionStatus: string;
  resolutionAttempts: Array<{ description: string; timestamp: number }>;
  blockedBy?: string;
  
  // Urgency
  urgency: string;
  
  // Entry
  channel: string;
  entryPoint: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PACKAGING_CONFIG = {
  /** Max messages to include in transcript */
  maxTranscriptMessages: 20,
  /** Max key phrases to extract */
  maxKeyPhrases: 5,
  /** Include full transcript by default */
  includeTranscript: true,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract key phrases from conversation
 */
function extractKeyPhrases(messages: ConversationMessage[]): string[] {
  const userMessages = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.toLowerCase());
  
  const phrases: Map<string, number> = new Map();
  
  // Common issue indicators
  const issuePatterns = [
    /\b(not working|doesn't work|can't|cannot|failed|error|problem|issue)\s+\w+/gi,
    /\b(since|from)\s+\w+/gi,
    /\b(urgent|immediately|asap|quickly)\b/gi,
    /\b(already|still|again|yet)\b/gi,
  ];
  
  for (const msg of userMessages) {
    for (const pattern of issuePatterns) {
      const matches = msg.match(pattern);
      if (matches) {
        for (const match of matches) {
          const clean = match.toLowerCase().trim();
          phrases.set(clean, (phrases.get(clean) || 0) + 1);
        }
      }
    }
  }
  
  // Sort by frequency and return top phrases
  return Array.from(phrases.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, PACKAGING_CONFIG.maxKeyPhrases)
    .map(([phrase]) => phrase);
}

/**
 * Extract issue keywords
 */
function extractKeywords(messages: ConversationMessage[]): string[] {
  const text = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ')
    .toLowerCase();
  
  // Jio-specific keywords
  const keywords: string[] = [];
  
  const keywordPatterns: Record<string, RegExp> = {
    recharge: /\b(recharge|top.?up|payment)\b/i,
    network: /\b(network|signal|connectivity|coverage)\b/i,
    speed: /\b(speed|slow|fast|mbps)\b/i,
    billing: /\b(bill|invoice|charge|due)\b/i,
    plan: /\b(plan|pack|validity|offer)\b/i,
    sim: /\b(sim|esim|port|mnp)\b/i,
    app: /\b(app|myjio|application)\b/i,
    account: /\b(account|profile|login|password)\b/i,
  };
  
  for (const [keyword, pattern] of Object.entries(keywordPatterns)) {
    if (pattern.test(text)) {
      keywords.push(keyword);
    }
  }
  
  return keywords;
}

/**
 * Generate issue summary
 */
function generateIssueSummary(messages: ConversationMessage[], topic: string): string {
  // Find first user message about the issue
  const firstIssueMsg = messages.find(m => 
    m.role === 'user' && 
    m.content.length > 10 &&
    !/^(hi|hello|hey|good)/i.test(m.content)
  );
  
  if (firstIssueMsg) {
    // Truncate if too long
    const content = firstIssueMsg.content;
    if (content.length > 100) {
      return content.slice(0, 100) + '...';
    }
    return content;
  }
  
  return `Customer issue related to ${topic}`;
}

/**
 * Calculate sentiment score from conversation
 */
function calculateSentimentScore(messages: ConversationMessage[]): number {
  const userMessages = messages.filter(m => m.role === 'user');
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  const positiveWords = ['thanks', 'great', 'good', 'perfect', 'awesome', 'helpful', 'excellent'];
  const negativeWords = ['frustrated', 'angry', 'upset', 'worst', 'terrible', 'useless', 'disappointed', 'bad'];
  
  for (const msg of userMessages) {
    const text = msg.content.toLowerCase();
    for (const word of positiveWords) {
      if (text.includes(word)) positiveCount++;
    }
    for (const word of negativeWords) {
      if (text.includes(word)) negativeCount++;
    }
  }
  
  const total = positiveCount + negativeCount;
  if (total === 0) return 0;
  
  return (positiveCount - negativeCount) / total;
}

/**
 * Determine emotion trend from conversation
 */
function determineEmotionTrend(messages: ConversationMessage[]): 'improving' | 'stable' | 'worsening' {
  const userMessages = messages.filter(m => m.role === 'user');
  if (userMessages.length < 3) return 'stable';
  
  const early = userMessages.slice(0, Math.ceil(userMessages.length / 2));
  const late = userMessages.slice(Math.ceil(userMessages.length / 2));
  
  const earlySentiment = calculateSentimentScore(early.map(m => ({ ...m, role: 'user' as const })));
  const lateSentiment = calculateSentimentScore(late.map(m => ({ ...m, role: 'user' as const })));
  
  const diff = lateSentiment - earlySentiment;
  
  if (diff > 0.2) return 'improving';
  if (diff < -0.2) return 'worsening';
  return 'stable';
}

/**
 * Format duration
 */
function formatDuration(startTime: number): string {
  const durationMs = Date.now() - startTime;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Mask customer identifier
 */
function maskIdentifier(id: string): string {
  if (!id) return 'Unknown';
  
  // Phone number masking
  if (/^\d{10}$/.test(id)) {
    return `${id.slice(0, 2)}****${id.slice(-2)}`;
  }
  
  // Email masking
  if (id.includes('@')) {
    const [local, domain] = id.split('@');
    return `${local.slice(0, 2)}****@${domain}`;
  }
  
  // Generic masking
  if (id.length > 4) {
    return `${id.slice(0, 2)}****${id.slice(-2)}`;
  }
  
  return id;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PACKAGER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Package context for handoff
 */
export function packageContext(input: PackagingInput): PackagedContext {
  const now = Date.now();
  const handoffId = `HO_${now}_${Math.random().toString(36).slice(2, 8)}`;
  
  const startTime = input.conversationHistory[0]?.timestamp || now;
  
  return {
    handoffId,
    timestamp: now,
    
    customer: {
      identifier: maskIdentifier(input.customerId || ''),
      segment: input.segment || 'unknown',
      tenure: input.tenure || 'unknown',
      isHighValue: input.isHighValue || false,
      preferredLanguage: input.preferredLanguage || 'english',
      region: input.region,
    },
    
    issue: {
      category: input.topic,
      summary: generateIssueSummary(input.conversationHistory, input.topic),
      keywords: extractKeywords(input.conversationHistory),
      ecosystem: input.ecosystem,
      urgency: input.urgency,
      firstMentionedAt: startTime,
    },
    
    conversation: {
      sessionId: input.sessionId,
      startTime,
      duration: formatDuration(startTime),
      turnCount: input.conversationHistory.length,
      channel: input.channel,
      entryPoint: input.entryPoint,
    },
    
    resolution: {
      status: input.resolutionStatus,
      attemptCount: input.resolutionAttempts.length,
      attemptsSummary: input.resolutionAttempts.map(a => a.description),
      blockedBy: input.blockedBy,
      lastAttemptAt: input.resolutionAttempts[input.resolutionAttempts.length - 1]?.timestamp || now,
    },
    
    emotional: {
      currentEmotion: input.emotion,
      intensity: input.emotionIntensity,
      emotionTrend: determineEmotionTrend(input.conversationHistory),
      sentimentScore: calculateSentimentScore(input.conversationHistory),
      keyPhrases: extractKeyPhrases(input.conversationHistory),
    },
    
    recommendations: generateRecommendations(input),
    
    transcriptIncluded: PACKAGING_CONFIG.includeTranscript,
    transcript: PACKAGING_CONFIG.includeTranscript 
      ? input.conversationHistory.slice(-PACKAGING_CONFIG.maxTranscriptMessages)
      : undefined,
  };
}

/**
 * Generate recommendations for agent
 */
function generateRecommendations(input: PackagingInput): string[] {
  const recommendations: string[] = [];
  
  // Emotion-based recommendations
  const highEmotions = ['raudra', 'bhayanak'];
  if (highEmotions.includes(input.emotion)) {
    recommendations.push('Start with empathy and acknowledgment');
    recommendations.push('Avoid defensive language');
  }
  
  // Multiple attempts
  if (input.resolutionAttempts.length >= 2) {
    recommendations.push('Review previous resolution attempts to avoid repetition');
  }
  
  // Blocked resolution
  if (input.blockedBy) {
    recommendations.push(`Resolution was blocked by: ${input.blockedBy}`);
  }
  
  // High value customer
  if (input.isHighValue) {
    recommendations.push('High-value customer - prioritize retention');
  }
  
  // Long conversation
  if (input.conversationHistory.length >= 8) {
    recommendations.push('Extended conversation - customer may be frustrated by length');
  }
  
  // Urgency
  if (input.urgency === 'high' || input.urgency === 'critical') {
    recommendations.push('High urgency - expedite resolution');
  }
  
  return recommendations;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format packaged context as text for agent
 */
export function formatForAgent(pkg: PackagedContext): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════');
  lines.push(`HANDOFF: ${pkg.handoffId}`);
  lines.push('═══════════════════════════════════════════');
  lines.push('');
  
  // Customer
  lines.push('CUSTOMER');
  lines.push(`  ID: ${pkg.customer.identifier}`);
  lines.push(`  Segment: ${pkg.customer.segment}${pkg.customer.isHighValue ? ' ⭐ HIGH VALUE' : ''}`);
  lines.push(`  Tenure: ${pkg.customer.tenure}`);
  lines.push(`  Language: ${pkg.customer.preferredLanguage}`);
  lines.push('');
  
  // Issue
  lines.push('ISSUE');
  lines.push(`  Category: ${pkg.issue.category}`);
  lines.push(`  Summary: ${pkg.issue.summary}`);
  lines.push(`  Keywords: ${pkg.issue.keywords.join(', ')}`);
  lines.push(`  Urgency: ${pkg.issue.urgency}`);
  lines.push('');
  
  // Conversation
  lines.push('CONVERSATION');
  lines.push(`  Session: ${pkg.conversation.sessionId}`);
  lines.push(`  Duration: ${pkg.conversation.duration}`);
  lines.push(`  Turns: ${pkg.conversation.turnCount}`);
  lines.push(`  Channel: ${pkg.conversation.channel}`);
  lines.push('');
  
  // Resolution
  lines.push('RESOLUTION STATUS');
  lines.push(`  Status: ${pkg.resolution.status}`);
  lines.push(`  Attempts: ${pkg.resolution.attemptCount}`);
  if (pkg.resolution.attemptsSummary.length > 0) {
    lines.push('  Previous attempts:');
    pkg.resolution.attemptsSummary.forEach(a => lines.push(`    - ${a}`));
  }
  if (pkg.resolution.blockedBy) {
    lines.push(`  Blocked by: ${pkg.resolution.blockedBy}`);
  }
  lines.push('');
  
  // Emotional
  lines.push('EMOTIONAL STATE');
  lines.push(`  Emotion: ${pkg.emotional.currentEmotion} (${pkg.emotional.intensity})`);
  lines.push(`  Trend: ${pkg.emotional.emotionTrend}`);
  if (pkg.emotional.keyPhrases.length > 0) {
    lines.push(`  Key phrases: ${pkg.emotional.keyPhrases.join(', ')}`);
  }
  lines.push('');
  
  // Recommendations
  if (pkg.recommendations.length > 0) {
    lines.push('RECOMMENDATIONS');
    pkg.recommendations.forEach(r => lines.push(`  ⚡ ${r}`));
    lines.push('');
  }
  
  // Transcript
  if (pkg.transcriptIncluded && pkg.transcript) {
    lines.push('═══════════════════════════════════════════');
    lines.push('RECENT CONVERSATION');
    lines.push('═══════════════════════════════════════════');
    for (const msg of pkg.transcript.slice(-10)) {
      const role = msg.role === 'user' ? 'CUSTOMER' : 'AI';
      const content = msg.content.length > 150 ? msg.content.slice(0, 150) + '...' : msg.content;
      lines.push(`[${role}] ${content}`);
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

/**
 * Format as JSON for API
 */
export function formatForAPI(pkg: PackagedContext): string {
  return JSON.stringify(pkg, null, 2);
}

/**
 * Get compact summary for quick view
 */
export function getCompactSummary(pkg: PackagedContext): string {
  return [
    `ID: ${pkg.handoffId}`,
    `Issue: ${pkg.issue.summary}`,
    `Emotion: ${pkg.emotional.currentEmotion} (${pkg.emotional.emotionTrend})`,
    `Attempts: ${pkg.resolution.attemptCount}`,
    pkg.customer.isHighValue ? '⭐ High Value' : '',
  ].filter(Boolean).join(' | ');
}
