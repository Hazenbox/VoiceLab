/**
 * Risk Classifier
 * 
 * Classifies operational and regulatory risk within conversations
 * per the Tokens v2 specification (Section 13).
 * 
 * Risk awareness controls procedural caution, not safety (which is separate).
 * 
 * @module services/risk/riskClassifier
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Risk categories per Tokens v2 spec
 */
export type RiskCategory = 
  | 'none'
  | 'account_security'
  | 'finance_regulatory'
  | 'privacy'
  | 'fraud_scam'
  | 'cybersecurity'
  | 'contractual'
  | 'legal_sensitive';

/**
 * Risk levels
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Risk classification result
 */
export interface RiskClassification {
  category: RiskCategory;
  level: RiskLevel;
  triggers: string[];
  guidance: string;
  blockedActions: string[];
  requiredConfirmations: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns that trigger risk categories
 */
const RISK_PATTERNS: Record<RiskCategory, {
  keywords: RegExp[];
  contexts: string[];
  defaultLevel: RiskLevel;
}> = {
  none: {
    keywords: [],
    contexts: [],
    defaultLevel: 'low',
  },
  
  account_security: {
    keywords: [
      /password/i,
      /login/i,
      /otp/i,
      /one.?time.?password/i,
      /verification.?code/i,
      /kyc/i,
      /identity.?verification/i,
      /two.?factor/i,
      /2fa/i,
      /authentication/i,
      /account.?access/i,
      /reset.?password/i,
      /forgot.?password/i,
      /unlock.?account/i,
      /suspicious.?activity/i,
      /unauthorized.?access/i,
    ],
    contexts: ['jio_account', 'login', 'authentication'],
    defaultLevel: 'medium',
  },
  
  finance_regulatory: {
    keywords: [
      /payment/i,
      /refund/i,
      /billing/i,
      /transaction/i,
      /recharge/i,
      /₹|rs\.?|rupee/i,
      /amount/i,
      /charge/i,
      /deduct/i,
      /credit/i,
      /debit/i,
      /bank/i,
      /upi/i,
      /wallet/i,
      /money/i,
      /balance/i,
      /invoice/i,
      /receipt/i,
    ],
    contexts: ['jio_billing_payment', 'finance'],
    defaultLevel: 'medium',
  },
  
  privacy: {
    keywords: [
      /personal.?data/i,
      /privacy/i,
      /delete.?my.?data/i,
      /data.?request/i,
      /gdpr/i,
      /data.?protection/i,
      /my.?information/i,
      /customer.?records/i,
      /sensitive.?information/i,
      /share.?my.?details/i,
      /who.?has.?access/i,
    ],
    contexts: ['privacy_personal_data'],
    defaultLevel: 'medium',
  },
  
  fraud_scam: {
    keywords: [
      /fraud/i,
      /scam/i,
      /fake/i,
      /phishing/i,
      /suspicious/i,
      /stolen/i,
      /hacked/i,
      /compromised/i,
      /unauthorized/i,
      /someone.?using/i,
      /didn'?t.?make.?this/i,
      /not.?my.?transaction/i,
      /fake.?call/i,
      /fake.?sms/i,
      /lottery/i,
      /prize.?money/i,
    ],
    contexts: ['fraud_scam', 'cybersecurity'],
    defaultLevel: 'high',
  },
  
  cybersecurity: {
    keywords: [
      /hacked/i,
      /malware/i,
      /virus/i,
      /compromised/i,
      /data.?breach/i,
      /security.?incident/i,
      /cyber.?attack/i,
      /ransomware/i,
      /phishing/i,
      /spyware/i,
      /suspicious.?link/i,
      /clicked.?link/i,
    ],
    contexts: ['cybersecurity'],
    defaultLevel: 'high',
  },
  
  contractual: {
    keywords: [
      /contract/i,
      /agreement/i,
      /terms/i,
      /conditions/i,
      /sla/i,
      /service.?level/i,
      /enterprise/i,
      /corporate/i,
      /business.?plan/i,
      /legal.?binding/i,
      /penalty/i,
      /commitment/i,
      /lock.?in/i,
    ],
    contexts: ['enterprise', 'contractual'],
    defaultLevel: 'medium',
  },
  
  legal_sensitive: {
    keywords: [
      /legal/i,
      /lawsuit/i,
      /sue/i,
      /lawyer/i,
      /court/i,
      /compensation/i,
      /damages/i,
      /liability/i,
      /negligence/i,
      /consumer.?forum/i,
      /trai/i,
      /regulatory/i,
      /complaint.?to.?authorities/i,
    ],
    contexts: ['legal_general', 'legal_advice'],
    defaultLevel: 'high',
  },
};

/**
 * Level escalation triggers
 */
const LEVEL_ESCALATORS: Array<{
  pattern: RegExp;
  boost: number;
}> = [
  { pattern: /urgent|immediately|emergency/i, boost: 1 },
  { pattern: /lost.?money|money.?gone|deducted/i, boost: 1 },
  { pattern: /hacked|compromised|stolen/i, boost: 1 },
  { pattern: /legal.?action|sue|lawyer/i, boost: 1 },
  { pattern: /multiple.?times|again.?and.?again|repeatedly/i, boost: 1 },
  { pattern: /large.?amount|significant.?sum/i, boost: 1 },
  { pattern: /\d{5,}|₹\s*\d{4,}/i, boost: 1 }, // Large numbers (5+ digits or ₹ amounts)
];

// ═══════════════════════════════════════════════════════════════════════════════
// RISK CLASSIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classify risk from text message
 */
export function classifyRisk(
  text: string,
  context?: {
    safetyDomain?: string;
    intent?: string;
    ecosystem?: string;
  }
): RiskClassification {
  const triggers: string[] = [];
  let category: RiskCategory = 'none';
  let level: RiskLevel = 'low';
  let maxScore = 0;
  
  // Check each risk category
  for (const [cat, config] of Object.entries(RISK_PATTERNS)) {
    if (cat === 'none') continue;
    
    let score = 0;
    const matchedTriggers: string[] = [];
    
    // Check keyword patterns
    for (const pattern of config.keywords) {
      const match = text.match(pattern);
      if (match) {
        score += 1;
        matchedTriggers.push(match[0]);
      }
    }
    
    // Check context matches
    if (context) {
      if (context.safetyDomain && config.contexts.includes(context.safetyDomain)) {
        score += 2;
        matchedTriggers.push(`context:${context.safetyDomain}`);
      }
      if (context.intent && config.contexts.includes(context.intent)) {
        score += 1;
        matchedTriggers.push(`intent:${context.intent}`);
      }
      if (context.ecosystem && config.contexts.includes(context.ecosystem)) {
        score += 1;
        matchedTriggers.push(`ecosystem:${context.ecosystem}`);
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      category = cat as RiskCategory;
      level = config.defaultLevel;
      triggers.length = 0;
      triggers.push(...matchedTriggers);
    }
  }
  
  // Apply level escalators
  if (category !== 'none') {
    let levelBoost = 0;
    for (const { pattern, boost } of LEVEL_ESCALATORS) {
      if (pattern.test(text)) {
        levelBoost += boost;
      }
    }
    
    // Escalate level
    const levels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(level);
    const newIndex = Math.min(levels.length - 1, currentIndex + levelBoost);
    level = levels[newIndex];
  }
  
  return {
    category,
    level,
    triggers,
    guidance: getRiskGuidance(category, level),
    blockedActions: getBlockedActions(category, level),
    requiredConfirmations: getRequiredConfirmations(category, level),
  };
}

/**
 * Get guidance for risk category and level
 */
export function getRiskGuidance(category: RiskCategory, level: RiskLevel): string {
  const categoryGuidance: Record<RiskCategory, string> = {
    none: 'No operational risk. Proceed normally.',
    account_security: 'Do not expose sensitive data. Confirm identity steps carefully.',
    finance_regulatory: 'Use precise language. Avoid guarantees. Confirm amounts clearly.',
    privacy: 'Avoid storing or exposing extra data. Encourage safe handling.',
    fraud_scam: 'Provide protective guidance. Avoid alarming tone.',
    cybersecurity: 'Provide containment steps. Maintain calm authority.',
    contractual: 'Be precise. Avoid casual phrasing.',
    legal_sensitive: 'Avoid advisory beyond general information.',
  };
  
  const levelGuidance: Record<RiskLevel, string> = {
    low: 'Standard clarity.',
    medium: 'Increase precision and confirmation.',
    high: 'Slow down. Confirm before action.',
    critical: 'Stabilise. Provide containment steps first.',
  };
  
  return `${categoryGuidance[category]} ${levelGuidance[level]}`;
}

/**
 * Get blocked actions for risk level
 */
export function getBlockedActions(category: RiskCategory, level: RiskLevel): string[] {
  const blocked: string[] = [];
  
  // High/critical level restrictions
  if (level === 'high' || level === 'critical') {
    blocked.push('no_humor');
    blocked.push('no_nudging');
    blocked.push('no_casual_language');
  }
  
  // Category-specific blocks
  switch (category) {
    case 'account_security':
      blocked.push('no_password_display');
      blocked.push('no_otp_storage');
      blocked.push('no_identity_assumption');
      break;
    case 'finance_regulatory':
      blocked.push('no_amount_guarantees');
      blocked.push('no_timeline_promises');
      blocked.push('no_investment_advice');
      break;
    case 'fraud_scam':
      blocked.push('no_click_links');
      blocked.push('no_share_credentials');
      break;
    case 'legal_sensitive':
      blocked.push('no_legal_advice');
      blocked.push('no_liability_admission');
      break;
    default:
      break;
  }
  
  return blocked;
}

/**
 * Get required confirmations for risk level
 */
export function getRequiredConfirmations(category: RiskCategory, level: RiskLevel): string[] {
  const confirmations: string[] = [];
  
  // Medium+ level confirmations
  if (level !== 'low') {
    confirmations.push('confirm_understanding');
  }
  
  // High+ level confirmations
  if (level === 'high' || level === 'critical') {
    confirmations.push('confirm_action');
    confirmations.push('verify_identity');
  }
  
  // Category-specific confirmations
  switch (category) {
    case 'account_security':
      confirmations.push('verify_account_ownership');
      break;
    case 'finance_regulatory':
      confirmations.push('confirm_amount');
      confirmations.push('confirm_transaction');
      break;
    case 'fraud_scam':
      confirmations.push('report_to_authorities');
      break;
    default:
      break;
  }
  
  return [...new Set(confirmations)]; // Dedupe
}

/**
 * Get risk prompt section for LLM
 */
export function getRiskPromptSection(classification: RiskClassification): string {
  if (classification.category === 'none') {
    return '';
  }
  
  let section = `## Risk Awareness\n\n`;
  section += `**Category**: ${classification.category}\n`;
  section += `**Level**: ${classification.level}\n`;
  section += `**Guidance**: ${classification.guidance}\n\n`;
  
  if (classification.blockedActions.length > 0) {
    section += `### Blocked Actions\n`;
    section += classification.blockedActions.map(a => `- ${a}`).join('\n');
    section += '\n\n';
  }
  
  if (classification.requiredConfirmations.length > 0) {
    section += `### Required Confirmations\n`;
    section += classification.requiredConfirmations.map(c => `- ${c}`).join('\n');
    section += '\n';
  }
  
  return section;
}

/**
 * Check if risk level allows certain actions
 */
export function isActionAllowed(
  classification: RiskClassification,
  action: 'nudge' | 'humor' | 'casual_language' | 'skip_confirmation'
): boolean {
  // Critical level blocks almost everything
  if (classification.level === 'critical') {
    return false;
  }
  
  // High level is restrictive
  if (classification.level === 'high') {
    if (action === 'nudge' || action === 'humor' || action === 'skip_confirmation') {
      return false;
    }
  }
  
  // Check specific blocks
  const blockMap: Record<string, string> = {
    nudge: 'no_nudging',
    humor: 'no_humor',
    casual_language: 'no_casual_language',
  };
  
  return !classification.blockedActions.includes(blockMap[action] || '');
}

export default {
  classifyRisk,
  getRiskGuidance,
  getBlockedActions,
  getRequiredConfirmations,
  getRiskPromptSection,
  isActionAllowed,
};
