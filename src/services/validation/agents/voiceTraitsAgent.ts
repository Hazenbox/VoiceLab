/**
 * Voice Traits Validation Agent
 * 
 * Validates that generated content adheres to all 14 Jio voice traits.
 * Checks for trait violations and suggests improvements.
 * 
 * @module services/validation/agents/voiceTraitsAgent
 */

import { VOICE_TRAITS, type VoiceTrait, checkVoiceTraitViolations } from '../../constitutional/coreRules';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface VoiceTraitValidation {
  trait: VoiceTrait;
  passed: boolean;
  score: number; // 0-1
  violations: string[];
  suggestions: string[];
}

export interface VoiceTraitsResult {
  /** Overall pass/fail */
  passed: boolean;
  /** Overall score (0-1) */
  overallScore: number;
  /** Individual trait results */
  traits: VoiceTraitValidation[];
  /** Traits that failed */
  failedTraits: VoiceTrait[];
  /** Top suggestions */
  topSuggestions: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRAIT-SPECIFIC PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const TRAIT_PATTERNS: Record<VoiceTrait, {
  positive: RegExp[];
  negative: RegExp[];
  suggestions: string[];
}> = {
  direct: {
    positive: [/here's what/, /the answer is/, /you can/, /to do this/],
    negative: [/perhaps maybe/, /it might be possible/, /one could say/],
    suggestions: ['Get to the point quickly', 'Lead with the main answer'],
  },
  caring: {
    positive: [/i understand/, /let me help/, /i'm here/, /we're here/],
    negative: [/that's your problem/, /not my concern/, /deal with it/],
    suggestions: ['Show empathy for the user\'s situation', 'Use supportive language'],
  },
  positive: {
    positive: [/great news/, /you can/, /here's how/, /let's/, /happy to/],
    negative: [/unfortunately you can't/, /there's no way/, /impossible/, /never/],
    suggestions: ['Focus on solutions, not problems', 'Use forward-looking language'],
  },
  personal: {
    positive: [/you/, /your/, /we'll/, /we can/],
    negative: [/the user/, /customers must/, /one should/],
    suggestions: ['Address the user as "you"', 'Speak as "we" for Jio'],
  },
  simple: {
    positive: [],
    negative: [/leverage/, /synergy/, /paradigm/, /holistic/, /utilize/, /facilitate/],
    suggestions: ['Use everyday words', 'Keep sentences short'],
  },
  modest: {
    positive: [],
    negative: [/best in the world/, /unbelievable/, /amazing deal/, /incredible offer/],
    suggestions: ['Avoid superlatives', 'Let quality speak for itself'],
  },
  inspirational: {
    positive: [/you can/, /you've got this/, /great choice/, /well done/],
    negative: [/you're amazing/, /superstar/, /hero/, /legend/],
    suggestions: ['Encourage without over-the-top praise', 'Support user confidence'],
  },
  inviting: {
    positive: [/would you like/, /feel free/, /you're welcome to/, /let me know if/],
    negative: [/you must/, /you have to/, /do this now/, /immediately/],
    suggestions: ['Invite rather than command', 'Offer choices'],
  },
  nonJudgmental: {
    positive: [/i understand/, /that's okay/, /it happens/, /no worries/],
    negative: [/why didn't you/, /you should have/, /your fault/, /you failed/],
    suggestions: ['Avoid blame language', 'Don\'t assume user error'],
  },
  focused: {
    positive: [],
    negative: [/by the way,.*by the way/, /also.*also.*also/],
    suggestions: ['Stay on topic', 'Address the immediate need first'],
  },
  inclusive: {
    positive: [/everyone/, /all users/, /accessible/],
    negative: [/obviously/, /as you know/, /normal people/],
    suggestions: ['Use inclusive language', 'Don\'t assume knowledge'],
  },
  grounded: {
    positive: [/for example/, /specifically/, /in practice/],
    negative: [/theoretically/, /in principle/, /conceptually speaking/],
    suggestions: ['Give practical examples', 'Be concrete'],
  },
  respectful: {
    positive: [/thank you/, /appreciate/, /i understand/],
    negative: [/whatever/, /calm down/, /relax/, /don't be/],
    suggestions: ['Maintain dignity', 'Validate concerns'],
  },
  trustBuilding: {
    positive: [/here's exactly/, /this will/, /you'll see/],
    negative: [/probably/, /maybe/, /might/, /hopefully/],
    suggestions: ['Be clear and confident', 'Set accurate expectations'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a single trait
 */
function validateTrait(content: string, trait: VoiceTrait): VoiceTraitValidation {
  const patterns = TRAIT_PATTERNS[trait];
  const traitConfig = VOICE_TRAITS[trait];
  const lowerContent = content.toLowerCase();
  
  const violations: string[] = [];
  let positiveScore = 0;
  let negativeScore = 0;
  
  // Check positive patterns
  for (const pattern of patterns.positive) {
    if (pattern.test(lowerContent)) {
      positiveScore++;
    }
  }
  
  // Check negative patterns
  for (const pattern of patterns.negative) {
    if (pattern.test(lowerContent)) {
      negativeScore++;
      violations.push(`Contains pattern that violates ${trait}: ${pattern.source}`);
    }
  }
  
  // Also use the built-in violation checker
  const builtInViolations = checkVoiceTraitViolations(content)
    .filter(v => v.trait === trait);
  
  for (const v of builtInViolations) {
    if (!violations.includes(v.violation)) {
      violations.push(v.violation);
      negativeScore++;
    }
  }
  
  // Calculate score
  const baseScore = 1.0;
  const positiveBonus = Math.min(0.2, positiveScore * 0.05);
  const negativePenalty = Math.min(1.0, negativeScore * 0.3);
  const score = Math.max(0, Math.min(1, baseScore + positiveBonus - negativePenalty));
  
  const passed = score >= 0.7 && violations.length === 0;
  
  return {
    trait,
    passed,
    score,
    violations,
    suggestions: passed ? [] : patterns.suggestions,
  };
}

/**
 * Validate all 14 voice traits
 */
export function validateVoiceTraits(
  content: string,
  priorityTraits?: VoiceTrait[]
): VoiceTraitsResult {
  const allTraits = Object.keys(VOICE_TRAITS) as VoiceTrait[];
  const results: VoiceTraitValidation[] = [];
  
  for (const trait of allTraits) {
    results.push(validateTrait(content, trait));
  }
  
  // Calculate weighted score (priority traits count more)
  let totalWeight = 0;
  let weightedScore = 0;
  
  for (const result of results) {
    const weight = priorityTraits?.includes(result.trait) ? 2 : 1;
    totalWeight += weight;
    weightedScore += result.score * weight;
  }
  
  const overallScore = weightedScore / totalWeight;
  const failedTraits = results.filter(r => !r.passed).map(r => r.trait);
  
  // Collect top suggestions (max 3)
  const allSuggestions = results
    .filter(r => !r.passed)
    .flatMap(r => r.suggestions);
  const topSuggestions = [...new Set(allSuggestions)].slice(0, 3);
  
  return {
    passed: failedTraits.length === 0,
    overallScore,
    traits: results,
    failedTraits,
    topSuggestions,
  };
}

/**
 * Quick check for critical trait violations
 */
export function hasTraitViolations(content: string): boolean {
  const violations = checkVoiceTraitViolations(content);
  return violations.length > 0;
}

/**
 * Get trait improvement suggestions
 */
export function getTraitSuggestions(
  content: string,
  traits?: VoiceTrait[]
): string[] {
  const targetTraits = traits || (Object.keys(VOICE_TRAITS) as VoiceTrait[]);
  const suggestions: string[] = [];
  
  for (const trait of targetTraits) {
    const result = validateTrait(content, trait);
    if (!result.passed) {
      suggestions.push(...result.suggestions);
    }
  }
  
  return [...new Set(suggestions)];
}
