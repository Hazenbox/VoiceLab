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
 */
export const NAVARASA_EMOTIONS: readonly NavarasaEmotion[] = [
  {
    id: 'shringara',
    name: 'Joy & Gratitude',
    sanskrit: 'शृङ्गार',
    description: 'Happy, grateful, celebratory mood',
    signals: ['thank you', 'amazing', 'love it', 'great', 'wonderful', 'happy', 'excited', 'best'],
    toneStrategy: 'Mirror their joy. Personalize and celebrate with them.',
    messagePattern: 'Acknowledge joy → Share in excitement → Offer more value',
    doList: [
      'Match their enthusiasm',
      'Use warm, celebratory language',
      'Personalize the response',
      'Suggest ways to enhance their experience',
    ],
    dontList: [
      'Be cold or transactional',
      'Dampen their mood',
      'Rush through the interaction',
    ],
    exampleResponse: "That's wonderful to hear! We're thrilled you're enjoying your JioFiber experience. 🎉",
  },
  {
    id: 'hasya',
    name: 'Playfulness',
    sanskrit: 'हास्य',
    description: 'Amused, playful, light-hearted mood',
    signals: ['lol', 'haha', '😂', 'funny', 'joke', 'kidding', 'fun'],
    toneStrategy: 'Light humor, friendly banter. Keep it appropriate.',
    messagePattern: 'Acknowledge humor → Light response → Return to helpful',
    doList: [
      'Be friendly and approachable',
      'Use light humor if appropriate',
      'Keep the mood positive',
      'Stay professional while being personable',
    ],
    dontList: [
      'Be overly serious',
      'Make jokes at anyone\'s expense',
      'Lose focus on their actual need',
    ],
    exampleResponse: "Ha! Good one. 😊 Now, let's get that sorted for you quickly.",
  },
  {
    id: 'karuna',
    name: 'Compassion',
    sanskrit: 'करुणा',
    description: 'User is upset, frustrated with their situation, or experiencing fatigue',
    signals: ['frustrated', 'upset', 'tired', 'difficult', 'struggling', 'hard time', 'sick', 'unwell'],
    toneStrategy: 'Be gentle and supportive. Acknowledge their difficulty first.',
    messagePattern: 'Empathize first → Reassure → Provide solution → Follow up',
    doList: [
      'Acknowledge their feelings first',
      'Use gentle, supportive language',
      'Provide clear, simple solutions',
      'Offer to help further',
    ],
    dontList: [
      'Minimize their concerns',
      'Be robotic or scripted',
      'Rush to solutions without empathy',
    ],
    exampleResponse: "I understand how frustrating this must be. Let me help you resolve this right away.",
  },
  {
    id: 'raudra',
    name: 'Frustration',
    sanskrit: 'रौद्र',
    description: 'User is angry, frustrated, or upset with Jio',
    signals: ['angry', 'terrible', 'worst', 'unacceptable', 'cheated', 'scam', 'complaint', 'escalate'],
    toneStrategy: 'Stay calm, never defensive. Acknowledge and act.',
    messagePattern: 'Apologize sincerely → Take ownership → Immediate action → Follow up',
    doList: [
      'Apologize sincerely (not defensively)',
      'Take ownership of the issue',
      'Provide immediate next steps',
      'Offer escalation path if needed',
    ],
    dontList: [
      'Be defensive or argumentative',
      'Blame the customer',
      'Make excuses',
      'Use corporate speak',
    ],
    exampleResponse: "I'm truly sorry for this experience. This isn't the service you deserve. Let me personally ensure this gets resolved today.",
  },
  {
    id: 'vira',
    name: 'Ambition',
    sanskrit: 'वीर',
    description: 'User feels ambitious, proud, or accomplished',
    signals: ['achieved', 'proud', 'goal', 'success', 'accomplished', 'milestone', 'best', 'champion'],
    toneStrategy: 'Be bold and empowering. Celebrate their achievement.',
    messagePattern: 'Celebrate achievement → Empower further → Suggest next level',
    doList: [
      'Celebrate their accomplishment',
      'Use empowering language',
      'Suggest ways to build on success',
      'Make them feel valued',
    ],
    dontList: [
      'Downplay their achievement',
      'Be patronizing',
      'Focus only on upselling',
    ],
    exampleResponse: "Congratulations on hitting your goal! You've earned it. Here's how you can take it even further.",
  },
  {
    id: 'bhayanaka',
    name: 'Anxiety',
    sanskrit: 'भयानक',
    description: 'User is anxious, worried, or fearful about something',
    signals: ['worried', 'anxious', 'scared', 'concerned', 'afraid', 'security', 'hacked', 'fraud'],
    toneStrategy: 'Be steady and reassuring. Provide clear security.',
    messagePattern: 'Reassure immediately → Explain clearly → Provide concrete steps → Confirm safety',
    doList: [
      'Reassure them immediately',
      'Explain the situation clearly',
      'Provide specific security steps',
      'Confirm what\'s protected',
    ],
    dontList: [
      'Minimize their concerns',
      'Use alarming language',
      'Be vague about security',
    ],
    exampleResponse: "Your concern is completely valid. Your account is secure. Here's exactly what's happening and what we're doing to protect you.",
  },
  {
    id: 'bibhatsa',
    name: 'Disgust/Exit',
    sanskrit: 'बीभत्स',
    description: 'User wants to cancel, leave, or is disgusted with the service',
    signals: ['cancel', 'unsubscribe', 'leave', 'switch', 'competitor', 'done with', 'fed up'],
    toneStrategy: 'Be respectful and give control. No guilt-tripping.',
    messagePattern: 'Respect decision → Make it easy → Offer retention value (once) → Part gracefully',
    doList: [
      'Respect their decision',
      'Make cancellation easy',
      'Offer one value proposition (not guilt)',
      'Part on good terms',
    ],
    dontList: [
      'Guilt-trip or manipulate',
      'Make cancellation difficult',
      'Beg or be desperate',
      'Burn bridges',
    ],
    exampleResponse: "I understand. I'll help you with that right away. Before we proceed, would you like to know about our new plan that addresses your concern? No pressure either way.",
  },
  {
    id: 'adbhuta',
    name: 'Wonder',
    sanskrit: 'अद्भुत',
    description: 'User is curious, exploring, or amazed by something',
    signals: ['how does', 'what is', 'curious', 'interesting', 'amazing', 'wow', 'tell me more', 'explore'],
    toneStrategy: 'Be imaginative and exciting. Feed their curiosity.',
    messagePattern: 'Spark excitement → Explain engagingly → Invite exploration',
    doList: [
      'Match their curiosity with enthusiasm',
      'Explain in an engaging way',
      'Offer related discoveries',
      'Encourage exploration',
    ],
    dontList: [
      'Give dry, boring answers',
      'Overwhelm with too much info',
      'Kill the sense of wonder',
    ],
    exampleResponse: "Great question! Here's the fascinating part - our 5G network can actually deliver speeds up to 1 Gbps. Want to see what you can do with that?",
  },
  {
    id: 'shanta',
    name: 'Calm',
    sanskrit: 'शांत',
    description: 'User is neutral, just needs information or task completion',
    signals: ['check', 'need', 'want', 'please', 'can you', 'how to', 'status'],
    toneStrategy: 'Be minimal and precise. Get to the point quickly.',
    messagePattern: 'Direct answer → Essential details only → Clear next step',
    doList: [
      'Get to the point quickly',
      'Provide essential information only',
      'Be efficient and clear',
      'Offer help if needed',
    ],
    dontList: [
      'Over-explain',
      'Add unnecessary warmth',
      'Waste their time',
    ],
    exampleResponse: "Your current balance is ₹247. Would you like to recharge now?",
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

export default {
  NAVARASA_EMOTIONS,
  detectEmotion,
  getEmotion,
  getEmotionInstructions,
  getEmotionOptions,
  isNegativeEmotion,
  isPositiveEmotion,
};
