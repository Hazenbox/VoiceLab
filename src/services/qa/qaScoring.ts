/**
 * QA Scoring Service
 * 
 * 5-dimension QA rubric for response quality assessment.
 * Dimensions: resolution, language, governance, experience, trust.
 * 
 * @module services/qa/qaScoring
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * QA dimensions
 */
export type QADimension =
  | 'resolution'    // Did it solve the problem?
  | 'language'      // Is the language appropriate?
  | 'governance'    // Does it follow constitutional rules?
  | 'experience'    // Is the UX good?
  | 'trust';        // Does it build trust?

/**
 * Score level
 */
export type ScoreLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Dimension score
 */
export interface DimensionScore {
  dimension: QADimension;
  score: ScoreLevel;
  maxScore: 5;
  weight: number;
  feedback: string;
  violations: string[];
  improvements: string[];
}

/**
 * Complete QA score
 */
export interface QAScore {
  overallScore: number; // 0-100
  overallLevel: 'poor' | 'fair' | 'good' | 'excellent' | 'perfect';
  dimensions: Record<QADimension, DimensionScore>;
  totalWeightedScore: number;
  maxPossibleScore: number;
  summary: string;
  topIssues: string[];
  topStrengths: string[];
}

/**
 * Context for scoring
 */
export interface QAScoringContext {
  response: string;
  userMessage: string;
  intent: string;
  emotion: string;
  resolutionStatus: string;
  turnNumber: number;
  wasEscalated: boolean;
  previousResponses?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING RUBRIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Dimension weights
 */
export const DIMENSION_WEIGHTS: Record<QADimension, number> = {
  resolution: 0.30,    // 30% - most important
  language: 0.20,      // 20%
  governance: 0.20,    // 20%
  experience: 0.15,    // 15%
  trust: 0.15,         // 15%
};

/**
 * Scoring criteria by dimension
 */
interface ScoringCriteria {
  description: string;
  levels: Record<ScoreLevel, string>;
  checks: Array<{
    name: string;
    check: (context: QAScoringContext) => boolean;
    impact: number; // Positive or negative impact on score
    feedback: string;
  }>;
}

const SCORING_CRITERIA: Record<QADimension, ScoringCriteria> = {
  resolution: {
    description: 'effectiveness in resolving the user issue',
    levels: {
      1: 'no attempt at resolution',
      2: 'partial attempt, missing key info',
      3: 'adequate attempt, some gaps',
      4: 'good resolution, minor improvements possible',
      5: 'complete resolution with clear steps',
    },
    checks: [
      {
        name: 'provides_actionable_steps',
        check: (ctx) => /\d+\.\s+|\bstep\b|first.*then|•/i.test(ctx.response),
        impact: 1,
        feedback: 'provides actionable steps',
      },
      {
        name: 'addresses_user_query',
        check: (ctx) => {
          const userKeywords = ctx.userMessage.toLowerCase().split(/\s+/).filter(w => w.length > 4);
          return userKeywords.some(kw => ctx.response.toLowerCase().includes(kw));
        },
        impact: 1,
        feedback: 'addresses user query directly',
      },
      {
        name: 'offers_alternative',
        check: (ctx) => /\b(alternatively|another option|you can also|if that doesn't work)\b/i.test(ctx.response),
        impact: 0.5,
        feedback: 'offers alternative solutions',
      },
      {
        name: 'avoids_deflection',
        check: (ctx) => !/\b(can't help|unable to|not possible|beyond my)\b/i.test(ctx.response),
        impact: 1,
        feedback: 'avoids deflection',
      },
    ],
  },
  language: {
    description: 'quality and appropriateness of language',
    levels: {
      1: 'confusing, grammatically poor',
      2: 'understandable but awkward',
      3: 'clear, some room for improvement',
      4: 'well-written, natural flow',
      5: 'excellent, warm, professional',
    },
    checks: [
      {
        name: 'appropriate_length',
        check: (ctx) => {
          const words = ctx.response.split(/\s+/).length;
          return words >= 30 && words <= 200;
        },
        impact: 0.5,
        feedback: 'appropriate response length',
      },
      {
        name: 'no_jargon',
        check: (ctx) => !/\b(synergy|leverage|paradigm|pursuant)\b/i.test(ctx.response),
        impact: 0.5,
        feedback: 'avoids unnecessary jargon',
      },
      {
        name: 'lowercase_convention',
        check: (ctx) => {
          // Check if labels/important words aren't all caps
          const allCapsWords = ctx.response.match(/\b[A-Z]{4,}\b/g) || [];
          return allCapsWords.length < 3;
        },
        impact: 0.5,
        feedback: 'follows lowercase convention',
      },
      {
        name: 'natural_tone',
        check: (ctx) => /\b(let me|i can|here's|happy to)\b/i.test(ctx.response),
        impact: 0.5,
        feedback: 'uses natural, warm tone',
      },
    ],
  },
  governance: {
    description: 'adherence to constitutional AI rules',
    levels: {
      1: 'critical governance violations',
      2: 'multiple minor violations',
      3: 'mostly compliant, few issues',
      4: 'good compliance, minor tweaks',
      5: 'full compliance with all rules',
    },
    checks: [
      {
        name: 'no_ai_identity',
        check: (ctx) => !/\b(i am an? (AI|bot)|as an AI|my programming)\b/i.test(ctx.response),
        impact: 2,
        feedback: 'maintains appropriate identity',
      },
      {
        name: 'no_overpromise',
        check: (ctx) => !/\b(guarantee|100%|definitely will|promise)\b/i.test(ctx.response),
        impact: 1,
        feedback: 'avoids overpromising',
      },
      {
        name: 'no_blame',
        check: (ctx) => !/\b(your fault|you should have|you failed)\b/i.test(ctx.response),
        impact: 2,
        feedback: 'avoids blaming user',
      },
      {
        name: 'single_question',
        check: (ctx) => (ctx.response.match(/\?/g) || []).length <= 1,
        impact: 0.5,
        feedback: 'asks only one question per turn',
      },
    ],
  },
  experience: {
    description: 'overall user experience quality',
    levels: {
      1: 'frustrating experience',
      2: 'mediocre, forgettable',
      3: 'satisfactory experience',
      4: 'pleasant, efficient',
      5: 'delightful, memorable',
    },
    checks: [
      {
        name: 'empathy_shown',
        check: (ctx) => {
          const highEmotions = ['raudra', 'bhayanak', 'karun'];
          if (!highEmotions.includes(ctx.emotion)) return true;
          return /\b(understand|frustrating|concern|help|here for you)\b/i.test(ctx.response);
        },
        impact: 1,
        feedback: 'shows appropriate empathy',
      },
      {
        name: 'clear_structure',
        check: (ctx) => ctx.response.includes('\n') || ctx.response.length < 100,
        impact: 0.5,
        feedback: 'has clear structure',
      },
      {
        name: 'has_cta',
        check: (ctx) => /\b(click|tap|open|call|visit|check)\b/i.test(ctx.response),
        impact: 0.5,
        feedback: 'includes clear call-to-action',
      },
      {
        name: 'forward_momentum',
        check: (ctx) => /\b(let me|i('ll| will)|next|here's)\b/i.test(ctx.response),
        impact: 0.5,
        feedback: 'maintains forward momentum',
      },
    ],
  },
  trust: {
    description: 'trust-building elements',
    levels: {
      1: 'trust-breaking',
      2: 'neutral, no trust building',
      3: 'some trust elements',
      4: 'good trust building',
      5: 'strong trust and rapport',
    },
    checks: [
      {
        name: 'transparency',
        check: (ctx) => !/\b(hidden|secret|undisclosed|small print)\b/i.test(ctx.response),
        impact: 1,
        feedback: 'maintains transparency',
      },
      {
        name: 'acknowledgment',
        check: (ctx) => /\b(i see|i understand|thank you|appreciate)\b/i.test(ctx.response),
        impact: 0.5,
        feedback: 'acknowledges user input',
      },
      {
        name: 'commitment',
        check: (ctx) => /\b(will|can|here to help|happy to)\b/i.test(ctx.response),
        impact: 0.5,
        feedback: 'shows commitment to help',
      },
      {
        name: 'no_dismissiveness',
        check: (ctx) => !/\b(can't help|not my|that's just how)\b/i.test(ctx.response),
        impact: 1,
        feedback: 'avoids dismissive language',
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Score a single dimension
 */
function scoreDimension(
  dimension: QADimension,
  context: QAScoringContext
): DimensionScore {
  const criteria = SCORING_CRITERIA[dimension];
  const weight = DIMENSION_WEIGHTS[dimension];
  
  let rawScore = 3; // Start at middle
  const violations: string[] = [];
  const improvements: string[] = [];
  
  // Run all checks
  for (const check of criteria.checks) {
    const passed = check.check(context);
    if (passed) {
      rawScore += check.impact;
    } else {
      rawScore -= check.impact * 0.5;
      violations.push(check.name);
      improvements.push(check.feedback);
    }
  }
  
  // Clamp to 1-5
  const score = Math.max(1, Math.min(5, Math.round(rawScore))) as ScoreLevel;
  
  return {
    dimension,
    score,
    maxScore: 5,
    weight,
    feedback: criteria.levels[score],
    violations,
    improvements,
  };
}

/**
 * Score a response
 */
export function scoreResponse(context: QAScoringContext): QAScore {
  const dimensions: Record<QADimension, DimensionScore> = {
    resolution: scoreDimension('resolution', context),
    language: scoreDimension('language', context),
    governance: scoreDimension('governance', context),
    experience: scoreDimension('experience', context),
    trust: scoreDimension('trust', context),
  };
  
  // Calculate weighted score
  let totalWeightedScore = 0;
  let maxPossibleScore = 0;
  
  for (const [_, dimScore] of Object.entries(dimensions)) {
    totalWeightedScore += dimScore.score * dimScore.weight;
    maxPossibleScore += dimScore.maxScore * dimScore.weight;
  }
  
  const overallScore = Math.round((totalWeightedScore / maxPossibleScore) * 100);
  
  // Determine level
  let overallLevel: QAScore['overallLevel'];
  if (overallScore >= 95) overallLevel = 'perfect';
  else if (overallScore >= 80) overallLevel = 'excellent';
  else if (overallScore >= 65) overallLevel = 'good';
  else if (overallScore >= 50) overallLevel = 'fair';
  else overallLevel = 'poor';
  
  // Collect issues and strengths
  const topIssues: string[] = [];
  const topStrengths: string[] = [];
  
  for (const dimScore of Object.values(dimensions)) {
    if (dimScore.score <= 2) {
      topIssues.push(`${dimScore.dimension}: ${dimScore.feedback}`);
    }
    if (dimScore.score >= 4) {
      topStrengths.push(`${dimScore.dimension}: ${dimScore.feedback}`);
    }
  }
  
  // Generate summary
  const summary = generateSummary(overallScore, overallLevel, topIssues, topStrengths);
  
  return {
    overallScore,
    overallLevel,
    dimensions,
    totalWeightedScore,
    maxPossibleScore,
    summary,
    topIssues,
    topStrengths,
  };
}

/**
 * Generate score summary
 */
function generateSummary(
  score: number,
  level: QAScore['overallLevel'],
  issues: string[],
  strengths: string[]
): string {
  const levelText = {
    poor: 'needs significant improvement',
    fair: 'acceptable but can improve',
    good: 'solid response quality',
    excellent: 'high quality response',
    perfect: 'exceptional response',
  };
  
  let summary = `score: ${score}/100 (${level}) - ${levelText[level]}`;
  
  if (issues.length > 0) {
    summary += `. main issue: ${issues[0]}`;
  }
  if (strengths.length > 0 && issues.length === 0) {
    summary += `. strength: ${strengths[0]}`;
  }
  
  return summary;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format QA score for prompt/logging
 */
export function formatQAScore(score: QAScore): string {
  const lines = [
    '## QA Score',
    `overall: ${score.overallScore}/100 (${score.overallLevel})`,
    '',
    '### dimension scores',
  ];
  
  for (const [dim, dimScore] of Object.entries(score.dimensions)) {
    lines.push(`${dim}: ${dimScore.score}/5 - ${dimScore.feedback}`);
  }
  
  if (score.topIssues.length > 0) {
    lines.push('');
    lines.push('### areas to improve');
    score.topIssues.forEach(i => lines.push(`- ${i}`));
  }
  
  if (score.topStrengths.length > 0) {
    lines.push('');
    lines.push('### strengths');
    score.topStrengths.forEach(s => lines.push(`- ${s}`));
  }
  
  return lines.join('\n');
}

/**
 * Check if score meets threshold
 */
export function meetsThreshold(score: QAScore, threshold: number = 65): boolean {
  return score.overallScore >= threshold;
}

/**
 * Get improvement suggestions
 */
export function getImprovementSuggestions(score: QAScore): string[] {
  const suggestions: string[] = [];
  
  for (const dimScore of Object.values(score.dimensions)) {
    if (dimScore.score <= 3) {
      suggestions.push(...dimScore.improvements);
    }
  }
  
  return [...new Set(suggestions)];
}

/**
 * Get dimension description
 */
export function getDimensionDescription(dimension: QADimension): string {
  return SCORING_CRITERIA[dimension].description;
}
