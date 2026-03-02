/**
 * Health Topic Detector
 * 
 * Detects health-related content in AI responses to determine when to show
 * JioHealthHub action card. Follows the pattern from musicTopicDetector.ts.
 */

import type { HealthTopicResult, HealthCategory } from './types';

const HEALTH_KEYWORDS = {
  high: [
    'doctor', 'doctors', 'medicine', 'medicines', 'medication', 'medications',
    'symptoms', 'symptom', 'diagnosis', 'treatment', 'consultation', 'consult',
    'appointment', 'appointments', 'hospital', 'clinic', 'healthcare',
    'medical', 'physician', 'specialist', 'prescription', 'prescriptions',
    'disease', 'illness', 'condition', 'syndrome', 'disorder',
    'jiohealthhub', 'jiohealth', 'telemedicine', 'teleconsultation',
  ],
  medium: [
    'health', 'wellness', 'fitness', 'nutrition', 'diet', 'exercise',
    'checkup', 'screening', 'test', 'tests', 'report', 'reports',
    'therapy', 'therapist', 'counseling', 'counselor', 'mental health',
    'vaccine', 'vaccination', 'immunization', 'pharmacy', 'pharmacist',
    'surgery', 'operation', 'procedure', 'recovery', 'rehabilitation',
  ],
  low: [
    'headache', 'fever', 'cold', 'cough', 'pain', 'ache', 'sore',
    'tired', 'fatigue', 'dizzy', 'nausea', 'vomit', 'stomach',
    'breathing', 'chest', 'heart', 'blood pressure', 'diabetes',
    'allergy', 'allergies', 'rash', 'infection', 'injury', 'wound',
    'sleep', 'insomnia', 'anxiety', 'stress', 'depression',
  ],
};

const CONFIDENCE_WEIGHTS = {
  high: 0.9,
  medium: 0.6,
  low: 0.3,
};

const MIN_CONFIDENCE_THRESHOLD = 0.3;

const APPOINTMENT_KEYWORDS = [
  'book', 'booking', 'schedule', 'appointment', 'appointments', 'slot',
  'visit', 'consultation', 'consult', 'see a doctor', 'meet doctor',
];

const EMERGENCY_KEYWORDS = [
  'emergency', 'ambulance', '112', 'helpline', 'aasra', 'icall', 'crisis',
  'suicide', 'self-harm', 'self harm',
];

const WELLNESS_KEYWORDS = [
  'fitness', 'exercise', 'workout', 'yoga', 'meditation', 'diet',
  'nutrition', 'weight', 'healthy', 'wellness', 'lifestyle',
  'preventive', 'prevention', 'checkup', 'screening',
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function findMatchedKeywords(text: string): {
  matched: string[];
  confidence: number;
} {
  const normalizedText = normalizeText(text);
  const words = new Set(normalizedText.split(/\s+/));
  
  const matched: string[] = [];
  let totalConfidence = 0;
  
  for (const [level, keywords] of Object.entries(HEALTH_KEYWORDS)) {
    for (const keyword of keywords) {
      const keywordWords = keyword.split(/\s+/);
      
      if (keywordWords.length === 1) {
        if (words.has(keyword)) {
          matched.push(keyword);
          totalConfidence += CONFIDENCE_WEIGHTS[level as keyof typeof CONFIDENCE_WEIGHTS];
        }
      } else {
        if (normalizedText.includes(keyword)) {
          matched.push(keyword);
          totalConfidence += CONFIDENCE_WEIGHTS[level as keyof typeof CONFIDENCE_WEIGHTS];
        }
      }
    }
  }
  
  const confidence = Math.min(totalConfidence / 2, 1.0);
  
  return { matched, confidence };
}

function categorizeHealthTopic(text: string, matchedKeywords: string[]): HealthCategory {
  const normalizedText = normalizeText(text);
  
  const hasEmergency = EMERGENCY_KEYWORDS.some(kw => normalizedText.includes(kw));
  if (hasEmergency) {
    return 'emergency';
  }
  
  const hasAppointment = APPOINTMENT_KEYWORDS.some(kw => normalizedText.includes(kw));
  if (hasAppointment) {
    return 'appointment';
  }
  
  const hasWellness = WELLNESS_KEYWORDS.some(kw => normalizedText.includes(kw));
  const hasMedical = matchedKeywords.some(kw => 
    HEALTH_KEYWORDS.high.includes(kw) || 
    ['symptoms', 'diagnosis', 'treatment', 'medicine', 'medication'].includes(kw)
  );
  
  if (hasMedical && !hasWellness) {
    return 'medical_advice';
  }
  
  if (hasWellness) {
    return 'wellness';
  }
  
  return 'medical_advice';
}

/**
 * Detect health topics in message content
 */
export function detectHealthTopic(
  messageContent: string,
  safetyDomain?: string,
  ecosystem?: string
): HealthTopicResult {
  if (!messageContent || messageContent.trim().length === 0) {
    return {
      detected: false,
      category: 'medical_advice',
      confidence: 0,
      matchedKeywords: [],
    };
  }
  
  const hasHealthSafetyDomain = safetyDomain && (
    safetyDomain.includes('health') || 
    safetyDomain === 'mental_health'
  );
  
  const hasHealthEcosystem = ecosystem === 'health';
  
  const { matched, confidence } = findMatchedKeywords(messageContent);
  
  let finalConfidence = confidence;
  if (hasHealthSafetyDomain) {
    finalConfidence = Math.max(finalConfidence, 0.8);
  }
  if (hasHealthEcosystem) {
    finalConfidence = Math.max(finalConfidence, 0.7);
  }
  
  const detected = finalConfidence >= MIN_CONFIDENCE_THRESHOLD;
  
  if (!detected) {
    return {
      detected: false,
      category: 'medical_advice',
      confidence: finalConfidence,
      matchedKeywords: matched,
    };
  }
  
  const category = categorizeHealthTopic(messageContent, matched);
  
  const shouldSkipEmergency = category === 'emergency' || 
    /AASRA|iCall|9820466726|9152987821|helpline|emergency.*112/i.test(messageContent);
  
  if (shouldSkipEmergency) {
    return {
      detected: false,
      category: 'emergency',
      confidence: finalConfidence,
      matchedKeywords: matched,
    };
  }
  
  return {
    detected: true,
    category,
    confidence: finalConfidence,
    matchedKeywords: matched,
  };
}

/**
 * Get contextual message for healthcare action card
 */
export function getHealthcareMessage(category: HealthCategory): string {
  switch (category) {
    case 'medical_advice':
      return 'Need medical advice?';
    case 'appointment':
      return 'Ready to book an appointment?';
    case 'wellness':
      return 'Want to learn more about staying healthy?';
    case 'emergency':
      return '';
  }
}
