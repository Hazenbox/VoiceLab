/**
 * Emotion Response Validation Agent
 * 
 * Validates that AI responses appropriately handle the user's
 * emotional state according to Navarasa framework rules.
 * 
 * @module services/validation/agents/emotionResponseAgent
 */

import { 
  NAVARASA, 
  isValidEmotionTransition, 
  getForbiddenToneShifts,
  type NavarasaEmotion 
} from '../../constitutional/coreRules';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmotionValidation {
  /** User's detected emotion */
  userEmotion: NavarasaEmotion;
  /** Target emotion the response aims for */
  targetEmotion: NavarasaEmotion;
  /** Whether transition is valid per Navarasa */
  isValidTransition: boolean;
  /** Detected response emotion */
  detectedResponseEmotion: NavarasaEmotion;
  /** Overall pass/fail */
  passed: boolean;
  /** Score (0-1) */
  score: number;
  /** Violations found */
  violations: string[];
  /** Suggestions for improvement */
  suggestions: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMOTION DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

const RESPONSE_EMOTION_PATTERNS: Record<NavarasaEmotion, RegExp[]> = {
  shanta: [
    /here's what/, /you can/, /the answer is/, /to resolve/,
    /let me explain/, /the process is/, /follow these steps/,
  ],
  hasya: [
    /great!/, /wonderful/, /excellent/, /fantastic/, /happy to/,
    /congratulations/, /well done/, /yay/,
  ],
  veera: [
    /let's do this/, /you've got this/, /go ahead/, /ready to/,
    /you can achieve/, /take action/, /move forward/,
  ],
  karuna: [
    /i'm sorry/, /i understand how/, /that must be/, /it's difficult/,
    /i can see/, /my apologies/, /i feel/,
  ],
  raudra: [
    /unacceptable/, /this is wrong/, /not good enough/,
    /frustrated/, /angry/, /upset about/,
  ],
  bhayanaka: [
    /warning/, /be careful/, /danger/, /risk/, /urgent/,
    /immediately/, /critical/,
  ],
  bibhatsa: [
    /unfortunately/, /regret/, /sad to say/, /can't do/,
    /not possible/, /unable/,
  ],
  adbhuta: [
    /did you know/, /interesting/, /amazing fact/, /discover/,
    /explore/, /learn about/, /fascinating/,
  ],
  shringara: [
    /thank you/, /appreciate/, /grateful/, /kind of you/,
    /lovely/, /wonderful to hear/,
  ],
};

const FORBIDDEN_TONE_PATTERNS: Record<string, RegExp[]> = {
  'sudden urgency': [/urgent!/, /now!/, /immediately!/, /hurry/],
  'celebratory exaggeration': [/amazing!!!/, /incredible!!!/, /best ever/],
  'over-promotional excitement': [/you must try/, /don't miss out/, /limited time/],
  'over-caution': [/be very careful/, /dangerous/, /risky/],
  'discouragement': [/don't bother/, /won't work/, /give up/],
  'humor': [/haha/, /lol/, /joke/, /funny/],
  'urgency pressure': [/act now/, /last chance/, /hurry up/],
  'defensive tone': [/it's not our fault/, /we didn't/, /blame/],
  'blame language': [/your fault/, /you caused/, /you should have/],
  'casual tone': [/whatever/, /no big deal/, /chill/],
  'dismissal': [/not important/, /doesn't matter/, /who cares/],
  'overly technical overload': [/technically speaking/, /in technical terms/],
  'personal emotional bonding language': [/i love you/, /you're special to me/, /my friend/],
};

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect the emotional tone of a response
 */
function detectResponseEmotion(content: string): { emotion: NavarasaEmotion; confidence: number } {
  const lowerContent = content.toLowerCase();
  const scores: Record<NavarasaEmotion, number> = {} as Record<NavarasaEmotion, number>;
  
  for (const [emotion, patterns] of Object.entries(RESPONSE_EMOTION_PATTERNS)) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(lowerContent)) {
        score++;
      }
    }
    scores[emotion as NavarasaEmotion] = score;
  }
  
  // Find highest scoring emotion
  let maxEmotion: NavarasaEmotion = 'shanta';
  let maxScore = 0;
  let totalScore = 0;
  
  for (const [emotion, score] of Object.entries(scores)) {
    totalScore += score;
    if (score > maxScore) {
      maxScore = score;
      maxEmotion = emotion as NavarasaEmotion;
    }
  }
  
  // Default to shanta if no clear emotion
  if (maxScore === 0) {
    return { emotion: 'shanta', confidence: 0.5 };
  }
  
  const confidence = totalScore > 0 ? maxScore / totalScore : 0.5;
  return { emotion: maxEmotion, confidence };
}

/**
 * Check for forbidden tone shifts
 */
function detectForbiddenTones(
  content: string,
  forbiddenShifts: readonly string[]
): string[] {
  const violations: string[] = [];
  const lowerContent = content.toLowerCase();
  
  for (const shift of forbiddenShifts) {
    const patterns = FORBIDDEN_TONE_PATTERNS[shift];
    if (patterns) {
      for (const pattern of patterns) {
        if (pattern.test(lowerContent)) {
          violations.push(`Contains forbidden tone: ${shift}`);
          break;
        }
      }
    }
  }
  
  return violations;
}

/**
 * Validate emotion response appropriateness
 */
export function validateEmotionResponse(
  content: string,
  userEmotion: NavarasaEmotion,
  targetEmotion?: NavarasaEmotion
): EmotionValidation {
  const emotionConfig = NAVARASA[userEmotion];
  const effectiveTarget = targetEmotion || (emotionConfig.allowedTargets[0] as NavarasaEmotion);
  
  // Detect response emotion
  const { emotion: detectedResponseEmotion, confidence } = detectResponseEmotion(content);
  
  // Check if transition is valid
  const isValidTransition = isValidEmotionTransition(userEmotion, effectiveTarget);
  
  // Check for forbidden tone shifts
  const forbiddenShifts = getForbiddenToneShifts(userEmotion);
  const violations = detectForbiddenTones(content, forbiddenShifts);
  
  // Check if response emotion matches target
  const emotionMatch = detectedResponseEmotion === effectiveTarget || 
                       emotionConfig.allowedTargets.includes(detectedResponseEmotion as never);
  
  // Calculate score
  let score = 1.0;
  if (!isValidTransition) score -= 0.3;
  if (!emotionMatch) score -= 0.2;
  score -= violations.length * 0.2;
  score = Math.max(0, score);
  
  // Build suggestions
  const suggestions: string[] = [];
  
  if (!emotionMatch) {
    suggestions.push(`Adjust tone to match target emotion: ${effectiveTarget} (${NAVARASA[effectiveTarget].englishName})`);
  }
  
  if (violations.length > 0) {
    suggestions.push(`Response behavior should be: ${emotionConfig.responseBehavior}`);
  }
  
  if (userEmotion === 'raudra') {
    suggestions.push('Acknowledge frustration before providing solution');
  } else if (userEmotion === 'karuna') {
    suggestions.push('Show empathy and simplify the response');
  } else if (userEmotion === 'bhayanaka') {
    suggestions.push('Provide reassurance and clear information');
  }
  
  const passed = violations.length === 0 && isValidTransition && score >= 0.7;
  
  return {
    userEmotion,
    targetEmotion: effectiveTarget,
    isValidTransition,
    detectedResponseEmotion,
    passed,
    score,
    violations,
    suggestions,
  };
}

/**
 * Quick check if response respects emotional context
 */
export function respectsEmotionalContext(
  content: string,
  userEmotion: NavarasaEmotion
): boolean {
  const forbiddenShifts = getForbiddenToneShifts(userEmotion);
  const violations = detectForbiddenTones(content, forbiddenShifts);
  return violations.length === 0;
}

/**
 * Get emotion-appropriate response suggestions
 */
export function getEmotionSuggestions(userEmotion: NavarasaEmotion): {
  responseBehavior: string;
  targetEmotions: string[];
  avoid: string[];
} {
  const config = NAVARASA[userEmotion];
  
  return {
    responseBehavior: config.responseBehavior,
    targetEmotions: config.allowedTargets.map(t => `${t} (${NAVARASA[t as NavarasaEmotion].englishName})`),
    avoid: [...config.forbiddenToneShifts],
  };
}
