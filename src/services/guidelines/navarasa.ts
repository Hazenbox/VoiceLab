/**
 * Navarasa Emotion Engine
 * 
 * The Navarasa (nine emotions) framework from Indian classical aesthetics,
 * adapted for customer communication. Each emotion has specific tone strategies.
 * 
 * @module services/guidelines/navarasa
 */

import type { NavarasaType } from '../../types';

/**
 * Navarasa emotion definition
 */
export interface NavarasaEmotion {
  id: NavarasaType;
  name: string;
  sanskrit: string;
  description: string;
  signals: string[];           // Keywords/patterns that indicate this emotion
  toneStrategy: string;        // How to respond
  messagePattern: string;      // Structure of response
  doList: string[];            // Things to do
  dontList: string[];          // Things to avoid
  exampleResponse: string;
}

/**
 * 9 Navarasa emotions with tone strategies
 * Source: Training 1.pdf, Conversational Engagement 2.pdf (Navarasa Framework)
 * Updated to match exact wording from training documents
 */
export const NAVARASA_EMOTIONS: readonly NavarasaEmotion[] = [
  {
    id: 'shringara',
    name: 'Love & Affection',
    sanskrit: 'शृङ्गार',
    description: 'User expresses gratitude, love, loyalty, or positive connection with Jio',
    signals: ['thank you', 'love', 'love it', 'grateful', 'appreciate', 'wonderful', 'happy', 'loyal customer', 'best'],
    toneStrategy: 'Mirror their warmth. Personalize and celebrate the relationship.',
    messagePattern: 'Acknowledge affection → Express mutual appreciation → Strengthen bond → Offer value',
    doList: [
      'Match their warmth and affection',
      'Thank them genuinely for choosing Jio',
      'Personalise the response',
      'Offer exclusive value as appreciation',
    ],
    dontList: [
      'Be cold or transactional',
      'Take their loyalty for granted',
      'Miss the opportunity to strengthen the bond',
    ],
    exampleResponse: "Thank you for being with us. It means the world to us. Here's a little something to show our appreciation.",
  },
  {
    id: 'hasya',
    name: 'Joy & Amusement',
    sanskrit: 'हास्य',
    description: 'User is in a playful, light-hearted, or humorous mood',
    signals: ['lol', 'haha', '😂', 'funny', 'joke', 'kidding', 'fun', 'hilarious'],
    toneStrategy: 'Match the lightness. Be friendly, but stay helpful.',
    messagePattern: 'Acknowledge the humour → Respond warmly → Gently return to helping',
    doList: [
      'Be friendly and approachable',
      'Use light, warm language',
      'Keep the mood positive',
      'Stay helpful while being personable',
    ],
    dontList: [
      'Be overly serious or stiff',
      'Make inappropriate jokes',
      'Lose focus on their actual need',
    ],
    exampleResponse: "Ha! We like your sense of humour. Now, let's get this sorted for you quickly.",
  },
  {
    id: 'karuna',
    name: 'Compassion & Sadness',
    sanskrit: 'करुणा',
    description: 'User is going through a difficult time, feeling sad, or needs emotional support',
    signals: ['sad', 'upset', 'difficult time', 'lost', 'passed away', 'struggling', 'hard time', 'sick', 'unwell'],
    toneStrategy: 'Lead with empathy. Acknowledge before solving.',
    messagePattern: 'Acknowledge feeling → Express care → Offer support → Follow up gently',
    doList: [
      'Acknowledge their feelings first',
      'Use gentle, caring language',
      'Provide simple, clear help',
      'Offer to do more if needed',
    ],
    dontList: [
      'Minimise their situation',
      'Jump straight to business',
      'Sound robotic or scripted',
    ],
    exampleResponse: "We're sorry to hear you're going through this. Please know we're here for you. Let us help you with whatever you need.",
  },
  {
    id: 'raudra',
    name: 'Anger & Frustration',
    sanskrit: 'रौद्र',
    description: 'User is angry, frustrated, or upset with Jio service or experience',
    signals: ['angry', 'terrible', 'worst', 'unacceptable', 'cheated', 'scam', 'complaint', 'escalate', 'disgusted'],
    toneStrategy: 'Stay calm. Never defensive. Acknowledge, apologise, act.',
    messagePattern: 'Apologise sincerely → Take ownership → Immediate action → Personal follow-up',
    doList: [
      'Apologise sincerely without being defensive',
      'Take full ownership of the issue',
      'Provide immediate, concrete next steps',
      'Offer personal escalation path',
    ],
    dontList: [
      'Be defensive or argumentative',
      'Blame the customer or other departments',
      'Make excuses',
      'Use cold corporate language',
    ],
    exampleResponse: "I'm truly sorry. This is not the experience you deserve. I'm personally going to make sure this is resolved today.",
  },
  {
    id: 'vira',
    name: 'Courage & Pride',
    sanskrit: 'वीर',
    description: 'User feels accomplished, proud, ambitious, or has achieved something',
    signals: ['achieved', 'proud', 'goal', 'success', 'accomplished', 'milestone', 'did it', 'champion', 'winning'],
    toneStrategy: 'Celebrate boldly. Empower them to aim higher.',
    messagePattern: 'Celebrate achievement → Empower further → Inspire next goal',
    doList: [
      'Celebrate their accomplishment enthusiastically',
      'Use bold, empowering language',
      'Suggest ways to build on their success',
      'Make them feel like champions',
    ],
    dontList: [
      'Downplay their achievement',
      'Be patronising',
      'Make it only about selling more',
    ],
    exampleResponse: "You did it! That's amazing. You've earned this. Now, let's help you reach even higher.",
  },
  {
    id: 'bhayanaka',
    name: 'Fear & Anxiety',
    sanskrit: 'भयानक',
    description: 'User is worried, anxious, or fearful about security, money, or outcomes',
    signals: ['worried', 'anxious', 'scared', 'concerned', 'afraid', 'security', 'hacked', 'fraud', 'suspicious'],
    toneStrategy: 'Be calm, steady, and reassuring. Provide certainty.',
    messagePattern: 'Reassure immediately → Explain clearly → Give concrete steps → Confirm safety',
    doList: [
      'Reassure them right away',
      'Explain the situation in simple terms',
      'Provide specific, actionable steps',
      'Confirm exactly what is protected',
    ],
    dontList: [
      'Minimise their fears',
      'Use alarming or technical language',
      'Be vague about what is happening',
    ],
    exampleResponse: "Your concern is valid, and your account is secure. Here's exactly what we've done to protect you.",
  },
  {
    id: 'bibhatsa',
    name: 'Disgust & Aversion',
    sanskrit: 'बीभत्स',
    description: 'User wants to leave, cancel, or has lost faith in Jio',
    signals: ['cancel', 'unsubscribe', 'leave', 'switch', 'competitor', 'done with', 'fed up', 'hate'],
    toneStrategy: 'Respect their choice. Make it easy. No guilt.',
    messagePattern: 'Acknowledge decision → Make process easy → Offer one value (no pressure) → Part gracefully',
    doList: [
      'Respect their decision fully',
      'Make the exit process simple',
      'Offer one alternative (without pressure)',
      'Part on the best possible terms',
    ],
    dontList: [
      'Guilt-trip or manipulate',
      'Make cancellation difficult',
      'Sound desperate or begging',
      'Burn bridges',
    ],
    exampleResponse: "We understand, and we'll make this easy for you. Before you go, is there anything we could have done differently?",
  },
  {
    id: 'adbhuta',
    name: 'Wonder & Curiosity',
    sanskrit: 'अद्भुत',
    description: 'User is curious, exploring, or amazed by something new',
    signals: ['how does', 'what is', 'curious', 'interesting', 'amazing', 'wow', 'tell me more', 'explore', 'discover'],
    toneStrategy: 'Spark excitement. Feed their curiosity. Invite exploration.',
    messagePattern: 'Match excitement → Explain engagingly → Offer more to discover',
    doList: [
      'Match their curiosity with enthusiasm',
      'Explain in an engaging, simple way',
      'Offer related discoveries',
      'Encourage further exploration',
    ],
    dontList: [
      'Give dry, boring answers',
      'Overwhelm with technical details',
      'Kill the sense of wonder',
    ],
    exampleResponse: "Great question! Here's the exciting part—our True 5G can deliver up to 1 Gbps. Want to see what that means for you?",
  },
  {
    id: 'shanta',
    name: 'Peace & Calm',
    sanskrit: 'शांत',
    description: 'User is neutral, just needs information or task completion efficiently',
    signals: ['check', 'need', 'want', 'please', 'can you', 'how to', 'status', 'balance', 'when'],
    toneStrategy: 'Be minimal, precise, and efficient. Respect their time.',
    messagePattern: 'Direct answer → Essential details → Clear next step (if needed)',
    doList: [
      'Get to the point immediately',
      'Provide only essential information',
      'Be clear and efficient',
      'Offer further help briefly',
    ],
    dontList: [
      'Over-explain or pad responses',
      'Add unnecessary warmth or filler',
      'Waste their time',
    ],
    exampleResponse: "Your balance is ₹247. Recharge now?",
  },
] as const;

// =============================================================================
// EMOTION DETECTION
// =============================================================================

/**
 * Detect emotion from text using keyword matching
 * Returns the most likely emotion based on signal keywords
 */
export function detectEmotion(text: string): NavarasaType {
  const lowerText = text.toLowerCase();
  
  let bestMatch: NavarasaType = 'shanta'; // Default to calm/neutral
  let maxScore = 0;
  
  for (const emotion of NAVARASA_EMOTIONS) {
    const score = emotion.signals.filter(signal => 
      lowerText.includes(signal.toLowerCase())
    ).length;
    
    if (score > maxScore) {
      maxScore = score;
      bestMatch = emotion.id;
    }
  }
  
  return bestMatch;
}

/**
 * Get emotion configuration by ID
 */
export function getEmotion(id: NavarasaType): NavarasaEmotion {
  const emotion = NAVARASA_EMOTIONS.find(e => e.id === id);
  if (!emotion) {
    throw new Error(`Unknown emotion: ${id}`);
  }
  return emotion;
}

/**
 * Get prompt instructions for an emotion
 */
export function getEmotionInstructions(id: NavarasaType): string {
  const emotion = getEmotion(id);
  
  return `
DETECTED EMOTION: ${emotion.name} (${emotion.sanskrit})
Signal: ${emotion.description}
Strategy: ${emotion.toneStrategy}

DO:
${emotion.doList.map(item => `- ${item}`).join('\n')}

DON'T:
${emotion.dontList.map(item => `- ${item}`).join('\n')}

MESSAGE PATTERN: ${emotion.messagePattern}
`.trim();
}

/**
 * Get emotions for dropdown
 */
export function getEmotionOptions(): Array<{ 
  value: NavarasaType; 
  label: string; 
  description: string;
  sanskrit: string;
}> {
  return NAVARASA_EMOTIONS.map(e => ({
    value: e.id,
    label: e.name,
    description: e.toneStrategy,
    sanskrit: e.sanskrit,
  }));
}

/**
 * Check if detected emotion is negative (requires extra care)
 */
export function isNegativeEmotion(id: NavarasaType): boolean {
  return ['raudra', 'bhayanaka', 'bibhatsa', 'karuna'].includes(id);
}

/**
 * Check if detected emotion is positive
 */
export function isPositiveEmotion(id: NavarasaType): boolean {
  return ['shringara', 'hasya', 'vira', 'adbhuta'].includes(id);
}

// =============================================================================
// EMOTION INTENSITY DETECTION (Phase C)
// =============================================================================

/**
 * Intensifier patterns that increase emotion strength
 */
const INTENSIFIERS = [
  // Strong intensifiers (+2-3)
  { pattern: /very\s+very/i, boost: 3 },
  { pattern: /extremely/i, boost: 3 },
  { pattern: /absolutely/i, boost: 3 },
  { pattern: /completely/i, boost: 2 },
  { pattern: /totally/i, boost: 2 },
  { pattern: /incredibly/i, boost: 3 },
  { pattern: /unbelievably/i, boost: 3 },
  
  // Moderate intensifiers (+1-2)
  { pattern: /very/i, boost: 2 },
  { pattern: /really/i, boost: 2 },
  { pattern: /so\s+/i, boost: 2 },
  { pattern: /quite/i, boost: 1 },
  { pattern: /pretty\s+/i, boost: 1 },
  
  // Punctuation intensifiers
  { pattern: /!!+/g, boost: 2 },
  { pattern: /\?\?+/g, boost: 1 },
  { pattern: /[A-Z]{3,}/g, boost: 2 }, // ALL CAPS
  
  // Negative intensifiers (strong emotion)
  { pattern: /worst/i, boost: 3 },
  { pattern: /hate/i, boost: 3 },
  { pattern: /never\s+again/i, boost: 3 },
  { pattern: /scam/i, boost: 3 },
  { pattern: /fraud/i, boost: 3 },
  { pattern: /terrible/i, boost: 2 },
  { pattern: /awful/i, boost: 2 },
  { pattern: /horrible/i, boost: 2 },
  { pattern: /disaster/i, boost: 2 },
  
  // Positive intensifiers
  { pattern: /amazing/i, boost: 2 },
  { pattern: /awesome/i, boost: 2 },
  { pattern: /fantastic/i, boost: 2 },
  { pattern: /wonderful/i, boost: 2 },
  { pattern: /brilliant/i, boost: 2 },
  { pattern: /love\s+it/i, boost: 2 },
  { pattern: /best\s+ever/i, boost: 3 },
];

/**
 * Dampeners that reduce emotion strength
 */
const DAMPENERS = [
  { pattern: /a\s+bit/i, reduce: 2 },
  { pattern: /slightly/i, reduce: 2 },
  { pattern: /somewhat/i, reduce: 2 },
  { pattern: /kind\s+of/i, reduce: 1 },
  { pattern: /sort\s+of/i, reduce: 1 },
  { pattern: /maybe/i, reduce: 1 },
  { pattern: /perhaps/i, reduce: 1 },
  { pattern: /not\s+sure/i, reduce: 1 },
];

/**
 * Detect emotion intensity from text on a 1-10 scale
 * 
 * Base intensity is 5 (neutral). Intensifiers add, dampeners subtract.
 * Range: 1 (very mild) to 10 (extreme)
 * 
 * @param text The user message text
 * @param rasa The detected Navarasa emotion
 * @returns Intensity score from 1-10
 */
export function detectEmotionIntensity(text: string, rasa: NavarasaType): number {
  let intensity = 5; // Base intensity
  
  // Check for intensifiers
  for (const { pattern, boost } of INTENSIFIERS) {
    const matches = text.match(pattern);
    if (matches) {
      // If global regex, count matches
      const matchCount = matches.length || 1;
      intensity += boost * Math.min(matchCount, 2); // Cap at 2x effect
    }
  }
  
  // Check for dampeners
  for (const { pattern, reduce } of DAMPENERS) {
    if (pattern.test(text)) {
      intensity -= reduce;
    }
  }
  
  // Emotion-specific modifiers
  // Negative emotions (raudra, bhayanaka, bibhatsa, karuna) tend to be expressed more strongly
  if (isNegativeEmotion(rasa)) {
    // Check for multiple emotional signals as indicator of strong feeling
    const emotion = getEmotion(rasa);
    const signalCount = emotion.signals.filter(s => 
      text.toLowerCase().includes(s.toLowerCase())
    ).length;
    
    if (signalCount >= 3) intensity += 1;
    if (signalCount >= 5) intensity += 1;
  }
  
  // Message length can indicate strong emotion (very long or very short)
  const words = text.split(/\s+/).length;
  if (words > 100) intensity += 1; // Long rant
  if (words <= 3 && words >= 1) {
    // Very short could be dismissive or urgent
    if (text.includes('!')) intensity += 1;
  }
  
  // Clamp to 1-10 range
  return Math.max(1, Math.min(10, Math.round(intensity)));
}

/**
 * Convert numeric intensity to categorical
 */
export function intensityToCategory(intensity: number): 'low' | 'moderate' | 'high' | 'extreme' {
  if (intensity <= 3) return 'low';
  if (intensity <= 6) return 'moderate';
  if (intensity <= 8) return 'high';
  return 'extreme';
}

// =============================================================================
// EMOTION TARGET RESOLUTION (Phase C)
// =============================================================================

/**
 * Target emotion type (expanded from NavarasaType)
 */
export type EmotionTargetType = 
  | NavarasaType 
  | 'karuna_resolved' 
  | 'relieved';

/**
 * Emotion movement mapping - defines what emotional state to guide toward
 * 
 * Based on Tokens v2 specification:
 * - raudra (anger) → shanta (peace)
 * - bhayanaka (fear) → shanta (peace)
 * - karuna (sadness) → karuna_resolved (supported)
 * - bibhatsa (disgust) → relieved (practical calm)
 * - adbhuta (wonder) → adbhuta (sustain curiosity)
 * - shanta → shanta (maintain peace)
 * - hasya → hasya (sustain joy)
 * - shringara → shringara (sustain delight)
 * - vira → vira (sustain confidence)
 */
const EMOTION_TARGET_MAP: Record<NavarasaType, EmotionTargetType> = {
  raudra: 'shanta',       // Anger → Peace
  bhayanaka: 'shanta',    // Fear → Peace
  karuna: 'karuna_resolved', // Sadness → Supported and steadied
  bibhatsa: 'relieved',   // Disgust → Practical calm
  adbhuta: 'adbhuta',     // Wonder → Sustain wonder
  shanta: 'shanta',       // Peace → Maintain peace
  hasya: 'hasya',         // Joy → Sustain joy
  shringara: 'shringara', // Delight → Sustain delight
  vira: 'vira',           // Pride → Sustain confidence
};

/**
 * High-intensity override targets
 * When emotion intensity is very high (>= 8), we always aim for stability first
 */
const HIGH_INTENSITY_OVERRIDE: Record<string, EmotionTargetType> = {
  raudra: 'shanta',
  bhayanaka: 'shanta',
  karuna: 'shanta',
  bibhatsa: 'shanta',
};

/**
 * Resolve the target emotional state based on current emotion and intensity
 * 
 * Rules:
 * 1. Very high intensity (>= 8) for negative emotions → force shanta (stability first)
 * 2. Otherwise, follow the standard emotion movement map
 * 
 * @param currentRasa The detected current Navarasa emotion
 * @param intensity Emotion intensity (1-10 or categorical)
 * @returns Target emotion to guide user toward
 */
export function resolveEmotionTarget(
  currentRasa: NavarasaType, 
  intensity: number | 'low' | 'moderate' | 'high' | 'extreme'
): EmotionTargetType {
  // Convert categorical to numeric if needed
  let numericIntensity: number;
  if (typeof intensity === 'string') {
    numericIntensity = intensity === 'low' ? 2 : 
                       intensity === 'moderate' ? 5 : 
                       intensity === 'high' ? 7 : 9;
  } else {
    numericIntensity = intensity;
  }
  
  // High intensity negative emotions → force shanta
  if (numericIntensity >= 8 && currentRasa in HIGH_INTENSITY_OVERRIDE) {
    return HIGH_INTENSITY_OVERRIDE[currentRasa];
  }
  
  // Standard emotion movement
  return EMOTION_TARGET_MAP[currentRasa] || 'shanta';
}

/**
 * Get guidance text for emotional movement
 */
export function getEmotionMovementGuidance(
  currentRasa: NavarasaType,
  targetEmotion: EmotionTargetType,
  intensity: number
): string {
  const current = getEmotion(currentRasa);
  
  // Same emotion = sustain
  if (currentRasa === targetEmotion) {
    return `Sustain the ${current.name.toLowerCase()} state. Match their energy and be present.`;
  }
  
  // Negative → Positive transition
  if (isNegativeEmotion(currentRasa)) {
    const intensityDesc = intensity >= 7 ? 'Strong' : intensity >= 4 ? 'Moderate' : 'Mild';
    
    return `${intensityDesc} ${current.name.toLowerCase()} detected. ` +
      `Guide gently toward ${targetEmotion === 'shanta' ? 'calm and stability' : 
        targetEmotion === 'karuna_resolved' ? 'feeling supported and steadied' : 
        targetEmotion === 'relieved' ? 'practical calm and resolution' : 
        targetEmotion}. ` +
      `${intensity >= 7 ? 'Prioritize emotional acknowledgment before problem-solving. ' : ''}` +
      `Never force emotional jumps. Progress gradually.`;
  }
  
  // Positive emotions
  return `${current.name} detected. ${targetEmotion === currentRasa ? 
    'Sustain this positive energy.' : 
    `Guide toward ${targetEmotion}.`}`;
}

/**
 * Detect emotion with intensity and target in one call
 * Convenience function that combines detection, intensity, and target resolution
 */
export function analyzeEmotion(text: string): {
  rasa: NavarasaType;
  intensity: number;
  intensityCategory: 'low' | 'moderate' | 'high' | 'extreme';
  target: EmotionTargetType;
  isNegative: boolean;
  isPositive: boolean;
  guidance: string;
} {
  const rasa = detectEmotion(text);
  const intensity = detectEmotionIntensity(text, rasa);
  const target = resolveEmotionTarget(rasa, intensity);
  
  return {
    rasa,
    intensity,
    intensityCategory: intensityToCategory(intensity),
    target,
    isNegative: isNegativeEmotion(rasa),
    isPositive: isPositiveEmotion(rasa),
    guidance: getEmotionMovementGuidance(rasa, target, intensity),
  };
}

export default {
  NAVARASA_EMOTIONS,
  detectEmotion,
  getEmotion,
  getEmotionInstructions,
  getEmotionOptions,
  isNegativeEmotion,
  isPositiveEmotion,
  detectEmotionIntensity,
  intensityToCategory,
  resolveEmotionTarget,
  getEmotionMovementGuidance,
  analyzeEmotion,
};
