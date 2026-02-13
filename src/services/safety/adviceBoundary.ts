/**
 * Advice Boundary System
 * 
 * 6-level advice boundary from Constitutional OS.
 * Determines how to handle different types of advice/information requests
 * based on topic sensitivity, legal implications, and safety concerns.
 * 
 * @module services/safety/adviceBoundary
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 6-level advice boundary hierarchy
 */
export type AdviceBoundaryLevel =
  | 'normal_information'       // Standard factual info - proceed normally
  | 'guidance_with_disclaimer' // Advice with "consult professional" disclaimer
  | 'redirect_to_official'     // Point to official Jio channels/documentation
  | 'soft_block'               // "I shouldn't answer, but here's who can"
  | 'hard_block'               // Cannot answer, period
  | 'refuse_and_redirect';     // Safety concern, immediate redirect to emergency/professional

export interface AdviceBoundaryResult {
  /** The determined boundary level */
  level: AdviceBoundaryLevel;
  /** Reason for this boundary level */
  reason: string;
  /** Domain that triggered this boundary */
  domain: string;
  /** Required disclaimer if any */
  disclaimer?: string;
  /** Redirect target if applicable */
  redirectTo?: string;
  /** Whether response can include any information */
  canProvideInfo: boolean;
  /** Suggested response template key */
  responseTemplate?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Medical/Health topic patterns
 */
const MEDICAL_PATTERNS = {
  emergency: /\b(heart attack|stroke|bleeding|unconscious|can't breathe|choking|seizure|overdose|poisoning|suicid|self.?harm)\b/i,
  diagnosis: /\b(what (disease|condition|illness)|do i have|diagnos|symptoms of|is it (cancer|diabetes|covid))\b/i,
  treatment: /\b(how to treat|cure for|medication for|should i take|dosage|prescription)\b/i,
  general: /\b(health|medical|doctor|hospital|medicine|symptom|illness|disease|treatment|therapy)\b/i,
};

/**
 * Financial advice patterns
 */
const FINANCIAL_PATTERNS = {
  investment: /\b(should i invest|best stock|crypto advice|where to invest|investment tips|portfolio|mutual fund recommendation)\b/i,
  tax: /\b(tax advice|tax planning|avoid tax|tax saving|how to file tax|tax deduction)\b/i,
  loan: /\b(should i take loan|loan advice|debt management|mortgage advice|interest rate recommendation)\b/i,
  general: /\b(financial advice|money management|wealth|retirement planning|insurance advice)\b/i,
};

/**
 * Legal advice patterns
 */
const LEGAL_PATTERNS = {
  litigation: /\b(should i sue|legal action|court case|lawyer advice|file complaint|legal rights)\b/i,
  contract: /\b(contract advice|sign this|legal document|terms (and|&) conditions advice|agreement review)\b/i,
  criminal: /\b(arrest|police|crime|illegal|fraud case|legal trouble)\b/i,
  general: /\b(legal advice|law question|legally|lawyer|attorney|court)\b/i,
};

/**
 * Safety/Emergency patterns
 */
const SAFETY_PATTERNS = {
  selfHarm: /\b(kill myself|suicide|end my life|want to die|hurt myself|self.?harm|cutting myself)\b/i,
  violence: /\b(hurt someone|kill someone|attack|revenge|weapon|bomb|threat)\b/i,
  abuse: /\b(being abused|domestic violence|child abuse|trafficking|exploitation)\b/i,
  emergency: /\b(emergency|911|ambulance|fire|flood|earthquake|accident)\b/i,
};

/**
 * Compliance/Regulatory patterns
 */
const COMPLIANCE_PATTERNS = {
  identity: /\b(verify identity|kyc|aadhaar verification|pan verification|identity fraud)\b/i,
  fraud: /\b(fraud|scam|stolen|hacked|unauthorized|suspicious activity)\b/i,
  privacy: /\b(data breach|privacy violation|leaked data|personal information exposed)\b/i,
};

// ═══════════════════════════════════════════════════════════════════════════════
// DISCLAIMERS
// ═══════════════════════════════════════════════════════════════════════════════

export const DISCLAIMERS = {
  medical: 'this is general information only. please consult a qualified healthcare professional for medical advice.',
  financial: 'this is general information only. please consult a certified financial advisor for personalized advice.',
  legal: 'this is general information only. please consult a qualified legal professional for legal advice.',
  tax: 'this is general information only. please consult a tax professional or chartered accountant for specific tax advice.',
  investment: 'investments are subject to market risks. please read all scheme-related documents carefully before investing.',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// REDIRECT TARGETS
// ═══════════════════════════════════════════════════════════════════════════════

export const REDIRECT_TARGETS = {
  jioCustomerCare: 'Jio Customer Care at 199 or visit jio.com/support',
  jioStore: 'your nearest Jio Store',
  jioApp: 'the MyJio app',
  emergencyServices: '112 (emergency) or local emergency services',
  mentalHealth: 'iCall at 9152987821 or NIMHANS at 080-46110007',
  police: '100 (police) or your local police station',
  hospital: '108 (ambulance) or your nearest hospital',
  financialRegulator: 'SEBI at 1800-266-7575 or RBI at 14440',
  cyberCell: 'the Cyber Crime helpline at 1930 or cybercrime.gov.in',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNDARY DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if text matches any pattern in a pattern group
 */
function matchesPatterns(text: string, patterns: Record<string, RegExp>): string | null {
  for (const [key, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return key;
    }
  }
  return null;
}

/**
 * Determine the advice boundary level for a given input
 */
export function determineAdviceBoundary(
  input: string,
  context?: {
    ecosystem?: string;
    channel?: string;
    userEmotion?: string;
    previousTurns?: number;
  }
): AdviceBoundaryResult {
  const text = input.toLowerCase();
  
  // ── LEVEL 6: REFUSE AND REDIRECT (Safety Critical) ───────────────
  
  // Self-harm/suicide
  if (SAFETY_PATTERNS.selfHarm.test(text)) {
    return {
      level: 'refuse_and_redirect',
      reason: 'Self-harm or suicide-related content detected',
      domain: 'mental_health_crisis',
      redirectTo: REDIRECT_TARGETS.mentalHealth,
      canProvideInfo: false,
      responseTemplate: 'emergency_mental_health',
    };
  }
  
  // Violence threats
  if (SAFETY_PATTERNS.violence.test(text)) {
    return {
      level: 'refuse_and_redirect',
      reason: 'Violence-related content detected',
      domain: 'violence_threat',
      redirectTo: REDIRECT_TARGETS.police,
      canProvideInfo: false,
      responseTemplate: 'emergency_violence',
    };
  }
  
  // Medical emergency
  if (MEDICAL_PATTERNS.emergency.test(text)) {
    return {
      level: 'refuse_and_redirect',
      reason: 'Medical emergency detected',
      domain: 'medical_emergency',
      redirectTo: REDIRECT_TARGETS.hospital,
      canProvideInfo: false,
      responseTemplate: 'emergency_medical',
    };
  }
  
  // Abuse situations
  if (SAFETY_PATTERNS.abuse.test(text)) {
    return {
      level: 'refuse_and_redirect',
      reason: 'Abuse situation detected',
      domain: 'abuse_crisis',
      redirectTo: REDIRECT_TARGETS.emergencyServices,
      canProvideInfo: false,
      responseTemplate: 'emergency_abuse',
    };
  }
  
  // ── LEVEL 5: HARD BLOCK ──────────────────────────────────────────
  
  // Medical diagnosis requests
  if (MEDICAL_PATTERNS.diagnosis.test(text)) {
    return {
      level: 'hard_block',
      reason: 'Medical diagnosis request - cannot provide',
      domain: 'medical_diagnosis',
      redirectTo: 'a qualified healthcare professional',
      canProvideInfo: false,
      responseTemplate: 'block_medical_diagnosis',
    };
  }
  
  // Specific investment advice
  if (FINANCIAL_PATTERNS.investment.test(text)) {
    return {
      level: 'hard_block',
      reason: 'Specific investment advice request - cannot provide',
      domain: 'investment_advice',
      redirectTo: 'a SEBI-registered investment advisor',
      canProvideInfo: false,
      disclaimer: DISCLAIMERS.investment,
      responseTemplate: 'block_investment',
    };
  }
  
  // Legal litigation advice
  if (LEGAL_PATTERNS.litigation.test(text)) {
    return {
      level: 'hard_block',
      reason: 'Legal litigation advice request - cannot provide',
      domain: 'legal_litigation',
      redirectTo: 'a qualified legal professional',
      canProvideInfo: false,
      responseTemplate: 'block_legal',
    };
  }
  
  // ── LEVEL 4: SOFT BLOCK ──────────────────────────────────────────
  
  // Tax advice
  if (FINANCIAL_PATTERNS.tax.test(text)) {
    return {
      level: 'soft_block',
      reason: 'Tax advice request - limited information only',
      domain: 'tax_advice',
      redirectTo: 'a chartered accountant or tax professional',
      canProvideInfo: true, // Can provide general info
      disclaimer: DISCLAIMERS.tax,
      responseTemplate: 'soft_block_tax',
    };
  }
  
  // Medical treatment advice
  if (MEDICAL_PATTERNS.treatment.test(text)) {
    return {
      level: 'soft_block',
      reason: 'Medical treatment advice request - limited information only',
      domain: 'medical_treatment',
      redirectTo: 'a qualified healthcare professional',
      canProvideInfo: true,
      disclaimer: DISCLAIMERS.medical,
      responseTemplate: 'soft_block_medical',
    };
  }
  
  // Contract/legal document review
  if (LEGAL_PATTERNS.contract.test(text)) {
    return {
      level: 'soft_block',
      reason: 'Legal document advice request - limited information only',
      domain: 'legal_contract',
      redirectTo: 'a qualified legal professional',
      canProvideInfo: true,
      disclaimer: DISCLAIMERS.legal,
      responseTemplate: 'soft_block_legal',
    };
  }
  
  // ── LEVEL 3: REDIRECT TO OFFICIAL ────────────────────────────────
  
  // Identity verification issues
  if (COMPLIANCE_PATTERNS.identity.test(text)) {
    return {
      level: 'redirect_to_official',
      reason: 'Identity verification requires official channels',
      domain: 'identity_verification',
      redirectTo: REDIRECT_TARGETS.jioStore,
      canProvideInfo: true,
      responseTemplate: 'redirect_identity',
    };
  }
  
  // Fraud/scam reports
  if (COMPLIANCE_PATTERNS.fraud.test(text)) {
    return {
      level: 'redirect_to_official',
      reason: 'Fraud cases require official investigation',
      domain: 'fraud_report',
      redirectTo: REDIRECT_TARGETS.cyberCell,
      canProvideInfo: true,
      responseTemplate: 'redirect_fraud',
    };
  }
  
  // Privacy breach
  if (COMPLIANCE_PATTERNS.privacy.test(text)) {
    return {
      level: 'redirect_to_official',
      reason: 'Privacy concerns require official handling',
      domain: 'privacy_breach',
      redirectTo: REDIRECT_TARGETS.jioCustomerCare,
      canProvideInfo: true,
      responseTemplate: 'redirect_privacy',
    };
  }
  
  // ── LEVEL 2: GUIDANCE WITH DISCLAIMER ────────────────────────────
  
  // General financial topics
  if (FINANCIAL_PATTERNS.general.test(text) || FINANCIAL_PATTERNS.loan.test(text)) {
    return {
      level: 'guidance_with_disclaimer',
      reason: 'General financial topic - can provide info with disclaimer',
      domain: 'general_financial',
      canProvideInfo: true,
      disclaimer: DISCLAIMERS.financial,
      responseTemplate: 'guidance_financial',
    };
  }
  
  // General medical topics
  if (MEDICAL_PATTERNS.general.test(text)) {
    return {
      level: 'guidance_with_disclaimer',
      reason: 'General medical topic - can provide info with disclaimer',
      domain: 'general_medical',
      canProvideInfo: true,
      disclaimer: DISCLAIMERS.medical,
      responseTemplate: 'guidance_medical',
    };
  }
  
  // General legal topics
  if (LEGAL_PATTERNS.general.test(text) || LEGAL_PATTERNS.criminal.test(text)) {
    return {
      level: 'guidance_with_disclaimer',
      reason: 'General legal topic - can provide info with disclaimer',
      domain: 'general_legal',
      canProvideInfo: true,
      disclaimer: DISCLAIMERS.legal,
      responseTemplate: 'guidance_legal',
    };
  }
  
  // ── LEVEL 1: NORMAL INFORMATION ──────────────────────────────────
  
  return {
    level: 'normal_information',
    reason: 'No sensitive topics detected',
    domain: 'general',
    canProvideInfo: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the appropriate response template for a boundary result
 */
export function getAdviceBoundaryResponse(result: AdviceBoundaryResult): string {
  switch (result.level) {
    case 'refuse_and_redirect':
      if (result.domain === 'mental_health_crisis') {
        return `i'm concerned about what you've shared. please reach out to ${result.redirectTo} right away - they're trained to help and are available 24/7. you matter, and there are people who want to support you.`;
      }
      if (result.domain === 'medical_emergency') {
        return `this sounds like a medical emergency. please call ${result.redirectTo} immediately. your health and safety are the priority.`;
      }
      return `this is beyond what i can help with. please contact ${result.redirectTo} right away for immediate assistance.`;
    
    case 'hard_block':
      return `i'm not able to provide ${result.domain.replace('_', ' ')} advice as it requires professional expertise. i'd recommend speaking with ${result.redirectTo} who can give you personalized guidance.${result.disclaimer ? `\n\n${result.disclaimer}` : ''}`;
    
    case 'soft_block':
      return `i can share some general information, but for specific advice on this, you'll want to consult ${result.redirectTo}.${result.disclaimer ? `\n\n${result.disclaimer}` : ''}`;
    
    case 'redirect_to_official':
      return `for this, you'll need to connect with ${result.redirectTo}. they have the tools and access to help you properly.`;
    
    case 'guidance_with_disclaimer':
      return result.disclaimer || '';
    
    default:
      return '';
  }
}

/**
 * Check if a response needs a disclaimer appended
 */
export function needsDisclaimer(result: AdviceBoundaryResult): boolean {
  return result.level === 'guidance_with_disclaimer' && !!result.disclaimer;
}

/**
 * Append disclaimer to a response if needed
 */
export function appendDisclaimer(response: string, result: AdviceBoundaryResult): string {
  if (!needsDisclaimer(result)) return response;
  
  // Don't double-add disclaimer
  if (result.disclaimer && response.toLowerCase().includes(result.disclaimer.toLowerCase().slice(0, 30))) {
    return response;
  }
  
  return `${response}\n\n*${result.disclaimer}*`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  MEDICAL_PATTERNS,
  FINANCIAL_PATTERNS,
  LEGAL_PATTERNS,
  SAFETY_PATTERNS,
  COMPLIANCE_PATTERNS,
};
