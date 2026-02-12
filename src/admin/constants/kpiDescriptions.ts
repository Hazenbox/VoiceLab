/**
 * KPI Descriptions - explains why each metric matters for system improvement
 */

export interface KPIDescription {
  label: string;
  description: string;
  target?: string;
  importance: 'critical' | 'high' | 'medium';
}

export const KPI_DESCRIPTIONS: Record<string, KPIDescription> = {
  // Generation Metrics
  totalGenerations: {
    label: 'total generations',
    description: 'Measures overall system usage and adoption. Higher numbers indicate active usage; sudden drops may signal issues or reduced team engagement.',
    importance: 'high',
  },
  avgTrustScore: {
    label: 'avg trust score',
    description: 'Content quality score (0-100) measuring how well outputs follow brand guidelines. Low scores indicate the model needs more training data or prompt refinement. This is the primary quality metric.',
    target: '>90',
    importance: 'critical',
  },
  regenerationRate: {
    label: 'regeneration rate',
    description: 'Percentage of responses users asked to regenerate. High rates suggest outputs aren\'t meeting expectations—used to identify prompts or contexts needing improvement.',
    target: '<15%',
    importance: 'high',
  },

  // Performance Metrics
  avgResponseTime: {
    label: 'avg response time',
    description: 'Average time to generate a response. Directly affects user experience. Used to monitor LLM provider performance and identify slow contexts.',
    target: '<3s',
    importance: 'critical',
  },
  p50: {
    label: 'p50 (median)',
    description: '50% of responses are faster than this. More stable than average—not skewed by outliers. Shows typical user experience.',
    importance: 'medium',
  },
  p95: {
    label: 'p95',
    description: '95% of responses are faster than this. Shows worst-case experience for most users.',
    target: '<8s',
    importance: 'high',
  },
  p99: {
    label: 'p99',
    description: '99% of responses are faster than this. Identifies extreme outliers that may indicate infrastructure issues requiring attention.',
    importance: 'medium',
  },

  // Session Metrics
  activeSessions: {
    label: 'active sessions',
    description: 'Users currently interacting with the system. Real-time engagement indicator. High counts during work hours indicate healthy adoption.',
    importance: 'high',
  },
  completedSessions: {
    label: 'completed sessions',
    description: 'Sessions that ended normally. Healthy sessions complete naturally—users got what they needed.',
    importance: 'medium',
  },
  abandonedSessions: {
    label: 'abandoned sessions',
    description: 'Sessions that timed out without user action. High abandonment may indicate UX issues or slow responses causing users to leave.',
    target: '<20%',
    importance: 'high',
  },
  avgSessionDuration: {
    label: 'avg session duration',
    description: 'Average time users spend per session. Longer sessions suggest deeper engagement. Very short sessions (<1min) may indicate users aren\'t finding value.',
    importance: 'medium',
  },
  avgMessagesPerSession: {
    label: 'avg messages/session',
    description: 'Average conversation length. More messages indicate iterative refinement. Very high (>10) may suggest users struggle to get good outputs initially.',
    importance: 'medium',
  },

  // Interaction Metrics
  copyCount: {
    label: 'copy count',
    description: 'Times users copied AI responses. Key value indicator—users copy content they plan to use. High copy rates = high value delivery.',
    importance: 'critical',
  },
  likeCount: {
    label: 'like count',
    description: 'Positive feedback on responses. Explicit signal that output met expectations. Used to identify successful prompt patterns for training.',
    importance: 'high',
  },
  dislikeCount: {
    label: 'dislike count',
    description: 'Negative feedback on responses. Critical training signal. Each dislike generates a correction record for model learning.',
    importance: 'critical',
  },
  errorCount: {
    label: 'error count',
    description: 'System errors encountered. Spikes indicate infrastructure issues requiring immediate attention.',
    target: 'near zero',
    importance: 'critical',
  },

  // Context Metrics
  byEcosystem: {
    label: 'by ecosystem',
    description: 'Usage breakdown by product (JioMart, JioCinema, etc.). Identifies which products have highest adoption and which need promotion or training.',
    importance: 'medium',
  },
  byChannel: {
    label: 'by channel',
    description: 'Usage breakdown by channel (Push, SMS, Email, etc.). Shows which content types are most requested.',
    importance: 'medium',
  },
  trustScoreByContext: {
    label: 'trust score by context',
    description: 'Quality score per ecosystem/channel combination. Identifies contexts where the model struggles and needs more training examples.',
    importance: 'high',
  },
};

/**
 * Tab descriptions for analytics sections
 */
export const TAB_DESCRIPTIONS: Record<string, string> = {
  overview: 'System health at a glance. Key metrics showing overall usage, quality, and performance. Use this to quickly assess if the system is performing well.',
  performance: 'Response time and quality metrics. Monitor how fast the AI responds and how often users regenerate. Slow responses and high regeneration rates indicate areas for optimization.',
  sessions: 'User engagement patterns. Track how users interact over time. Session duration and message counts reveal whether users find value in the tool.',
  interactions: 'User actions and feedback signals. Every copy, like, and dislike is a learning opportunity. High copy rates mean outputs are useful. Dislikes generate training data.',
  context: 'Performance across products and channels. Identify which ecosystem/channel combinations perform well and which need more training examples.',
};
