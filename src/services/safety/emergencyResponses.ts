/**
 * Emergency Response Templates
 * 
 * Pre-defined responses for critical safety scenarios.
 * These bypass normal generation when immediate action is needed.
 * 
 * Based on Constitutional Document Section 1.3:
 * - Escalation to human support when emotional distress detected
 * - Safety-first responses for critical domains
 * 
 * @module services/safety/emergencyResponses
 */

import type { SafetyDomain, AdvisoryBoundary } from '../constitutional/coreRules';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmergencyResponse {
  /** Main response message */
  message: string;
  /** Resources to provide (hotlines, links, etc.) */
  resources?: Array<{
    name: string;
    contact: string;
    description?: string;
  }>;
  /** Follow-up suggestion */
  followUp?: string;
  /** Whether to completely block further interaction */
  blockFurtherInteraction: boolean;
  /** Whether to log this for review */
  requiresLogging: boolean;
  /** Internal notes for logging */
  internalNotes?: string;
}

export interface EmergencyResponseConfig {
  /** Language for response */
  language?: 'en' | 'hi';
  /** User's detected emotional state */
  userEmotion?: string;
  /** Whether user explicitly asked for help */
  explicitHelpRequest?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDIA-SPECIFIC CRISIS RESOURCES
// ═══════════════════════════════════════════════════════════════════════════════

export const CRISIS_RESOURCES = {
  mental_health: [
    {
      name: 'AASRA',
      contact: '9820466726',
      description: '24/7 crisis helpline',
    },
    {
      name: 'iCall',
      contact: '9152987821',
      description: 'Psychosocial helpline (Mon-Sat, 8am-10pm)',
    },
    {
      name: 'Vandrevala Foundation',
      contact: '1860-2662-345',
      description: '24/7 mental health support',
    },
    {
      name: 'NIMHANS',
      contact: '080-46110007',
      description: 'National mental health helpline',
    },
  ],
  medical_emergency: [
    {
      name: 'Emergency Ambulance',
      contact: '108',
      description: 'Pan-India emergency medical services',
    },
    {
      name: 'Medical Emergency',
      contact: '102',
      description: 'Alternate ambulance service',
    },
    {
      name: 'National Emergency',
      contact: '112',
      description: 'Unified emergency number',
    },
  ],
  police_emergency: [
    {
      name: 'Police',
      contact: '100',
      description: 'Emergency police assistance',
    },
    {
      name: 'Women Helpline',
      contact: '1091',
      description: 'Women in distress',
    },
    {
      name: 'Child Helpline',
      contact: '1098',
      description: 'Children in need of care',
    },
  ],
  cyber_crime: [
    {
      name: 'Cyber Crime Helpline',
      contact: '1930',
      description: 'National cyber crime reporting',
    },
    {
      name: 'Cyber Crime Portal',
      contact: 'cybercrime.gov.in',
      description: 'Online reporting portal',
    },
  ],
  financial_fraud: [
    {
      name: 'RBI Helpline',
      contact: '14440',
      description: 'Banking ombudsman',
    },
    {
      name: 'Cyber Crime',
      contact: '1930',
      description: 'Report financial fraud',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMERGENCY RESPONSE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const EMERGENCY_TEMPLATES: Record<string, EmergencyResponse> = {
  // ── Suicide / Self-Harm ────────────────────────────────────────────
  suicide_risk: {
    message: `I'm really concerned about what you're sharing. Your life matters, and there are people who want to help.

Please reach out to a crisis helpline right now:
- AASRA: 9820466726 (24/7)
- iCall: 9152987821 (Mon-Sat, 8am-10pm)
- Vandrevala Foundation: 1860-2662-345 (24/7)

You don't have to face this alone. These trained counselors are ready to listen and support you.

Is there someone you trust who could be with you right now?`,
    resources: CRISIS_RESOURCES.mental_health,
    followUp: 'Would you like me to share more information about mental health support services?',
    blockFurtherInteraction: false,
    requiresLogging: true,
    internalNotes: 'Suicide risk detected - crisis resources provided',
  },
  
  self_harm: {
    message: `I hear that you're going through a really difficult time. What you're feeling matters, and I want you to know that support is available.

Please consider reaching out to someone who can help:
- AASRA: 9820466726 (24/7)
- iCall: 9152987821 (Mon-Sat, 8am-10pm)

These helplines are confidential and staffed by trained listeners who understand what you're going through.

Is there anything immediate I can help you with right now?`,
    resources: CRISIS_RESOURCES.mental_health,
    followUp: 'Remember, asking for help is a sign of strength, not weakness.',
    blockFurtherInteraction: false,
    requiresLogging: true,
    internalNotes: 'Self-harm concern detected - crisis resources provided',
  },

  // ── Medical Emergency ──────────────────────────────────────────────
  health_emergency: {
    message: `This sounds like a medical emergency. Please call for help immediately:

- Emergency Ambulance: 108
- Medical Emergency: 102  
- National Emergency: 112

If someone is unconscious, not breathing, or having severe chest pain, call 108 right away.

While waiting for help:
- Stay calm and keep the person comfortable
- Don't move them unless they're in immediate danger
- Stay on the line with emergency services

Are you able to call for emergency help?`,
    resources: CRISIS_RESOURCES.medical_emergency,
    blockFurtherInteraction: false,
    requiresLogging: true,
    internalNotes: 'Medical emergency detected - emergency services directed',
  },

  // ── Violence / Threats ─────────────────────────────────────────────
  violence: {
    message: `I'm not able to help with anything that could cause harm to others.

If you or someone else is in immediate danger, please contact:
- Police: 100
- National Emergency: 112

If you're experiencing thoughts that concern you, speaking with a mental health professional can help:
- AASRA: 9820466726 (24/7)`,
    resources: [...CRISIS_RESOURCES.police_emergency, ...CRISIS_RESOURCES.mental_health.slice(0, 1)],
    blockFurtherInteraction: true,
    requiresLogging: true,
    internalNotes: 'Violence/threat content detected - blocked and logged',
  },

  // ── Child Safety ───────────────────────────────────────────────────
  child_safety: {
    message: `I cannot assist with this request.

If you have concerns about a child's safety, please contact:
- Child Helpline: 1098 (24/7, free, confidential)
- Police: 100

Child safety is taken very seriously, and trained professionals are available to help.`,
    resources: CRISIS_RESOURCES.police_emergency,
    blockFurtherInteraction: true,
    requiresLogging: true,
    internalNotes: 'Child safety concern - blocked, logged for review',
  },

  // ── Fraud / Scam ───────────────────────────────────────────────────
  fraud_scam: {
    message: `I'm sorry to hear you may be dealing with a fraud situation. Here's what you should do immediately:

1. **Don't share any more information** with the suspected fraudster
2. **Contact your bank** to block any compromised accounts
3. **Report the fraud**:
   - Cyber Crime Helpline: 1930
   - Report online: cybercrime.gov.in

For Jio-related fraud concerns, you can also reach Jio customer care.

What specific type of fraud are you experiencing? I can guide you to the right resources.`,
    resources: [...CRISIS_RESOURCES.cyber_crime, ...CRISIS_RESOURCES.financial_fraud],
    blockFurtherInteraction: false,
    requiresLogging: true,
    internalNotes: 'Fraud/scam situation - guidance provided',
  },

  // ── Identity Theft ─────────────────────────────────────────────────
  identity_theft: {
    message: `Identity theft is serious, and acting quickly is important. Here's what to do:

1. **Report to Cyber Crime**: Call 1930 or visit cybercrime.gov.in
2. **Alert your bank**: Request to freeze accounts if financial info is compromised
3. **Check your credit**: Review recent transactions and credit reports
4. **File a police report**: This creates an official record

If your Aadhaar has been compromised, you can lock it at uidai.gov.in

Would you like specific guidance on any of these steps?`,
    resources: CRISIS_RESOURCES.cyber_crime,
    blockFurtherInteraction: false,
    requiresLogging: true,
    internalNotes: 'Identity theft concern - guidance provided',
  },

  // ── Mental Health (Non-Crisis) ─────────────────────────────────────
  mental_health: {
    message: `Thank you for sharing what you're going through. Your mental health matters, and it's okay to seek support.

Here are some resources that might help:
- iCall: 9152987821 (Mon-Sat, 8am-10pm) - Free counseling
- Vandrevala Foundation: 1860-2662-345 (24/7)

These are confidential services with trained counselors who can listen and provide guidance.

Is there anything specific I can help you with today?`,
    resources: CRISIS_RESOURCES.mental_health,
    followUp: 'Remember, reaching out for support is a positive step.',
    blockFurtherInteraction: false,
    requiresLogging: false,
  },

  // ── Generic Refusal ────────────────────────────────────────────────
  refuse_generic: {
    message: `I'm not able to help with this particular request.

Is there something else I can assist you with today?`,
    blockFurtherInteraction: false,
    requiresLogging: true,
    internalNotes: 'Request refused - generic safety concern',
  },

  // ── Political Content ──────────────────────────────────────────────
  political_persuasion: {
    message: `I'm here to help with practical questions, but I can't share political opinions or recommendations.

As a Jio assistant, I focus on providing helpful, factual information. For political matters, I'd encourage looking at official sources and forming your own views.

Is there something else I can help you with?`,
    blockFurtherInteraction: false,
    requiresLogging: false,
  },

  // ── Professional Referral ──────────────────────────────────────────
  refer_professional: {
    message: `This is an important question that would benefit from professional advice.

For the most accurate and personalized guidance, I'd recommend consulting with a qualified professional who can review your specific situation.

I can help with general information, but for decisions that could significantly impact your health, finances, or legal situation, professional advice is the safest approach.

Is there any general information I can provide while you seek professional guidance?`,
    blockFurtherInteraction: false,
    requiresLogging: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMERGENCY RESPONSE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get emergency response for a safety domain
 */
export function getEmergencyResponse(
  domain: SafetyDomain | 'none',
  advisoryBoundary: AdvisoryBoundary,
  config: EmergencyResponseConfig = {}
): EmergencyResponse | null {
  // No emergency response needed for normal information
  if (domain === 'none' || advisoryBoundary === 'normal_information') {
    return null;
  }
  
  // Check for domain-specific template
  if (domain in EMERGENCY_TEMPLATES) {
    return EMERGENCY_TEMPLATES[domain];
  }
  
  // Fall back based on advisory boundary
  switch (advisoryBoundary) {
    case 'emergency_redirect':
      // Use generic emergency if no specific template
      return EMERGENCY_TEMPLATES.health_emergency;
    
    case 'refuse_and_redirect':
      return EMERGENCY_TEMPLATES.refuse_generic;
    
    case 'refer_professional':
      return EMERGENCY_TEMPLATES.refer_professional;
    
    case 'limited_guidance':
    case 'precautionary_guidance':
      // These don't require emergency responses, just modified generation
      return null;
    
    default:
      return null;
  }
}

/**
 * Format crisis resources as a simple list
 */
export function formatCrisisResources(
  resources: Array<{ name: string; contact: string; description?: string }>
): string {
  return resources
    .map(r => `- ${r.name}: ${r.contact}${r.description ? ` (${r.description})` : ''}`)
    .join('\n');
}

/**
 * Get resources for a specific category
 */
export function getResourcesByCategory(
  category: keyof typeof CRISIS_RESOURCES
): Array<{ name: string; contact: string; description?: string }> {
  return CRISIS_RESOURCES[category] || [];
}

/**
 * Check if a domain requires immediate emergency response
 */
export function requiresEmergencyResponse(domain: SafetyDomain | 'none'): boolean {
  const emergencyDomains: SafetyDomain[] = [
    'suicide_risk',
    'self_harm',
    'health_emergency',
    'violence',
    'child_safety',
    'sexual_minors',
  ];
  
  return domain !== 'none' && emergencyDomains.includes(domain as SafetyDomain);
}

/**
 * Get disclaimer text for advisory responses
 */
export function getAdvisoryDisclaimer(advisoryBoundary: AdvisoryBoundary): string | null {
  switch (advisoryBoundary) {
    case 'precautionary_guidance':
      return 'Note: For personalized advice on this topic, please consult a qualified professional.';
    
    case 'limited_guidance':
      return 'Important: I can provide general information, but this topic requires professional guidance for your specific situation.';
    
    case 'refer_professional':
      return 'I strongly recommend consulting a qualified professional before making any decisions on this matter.';
    
    default:
      return null;
  }
}
