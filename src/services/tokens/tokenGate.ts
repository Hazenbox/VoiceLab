/**
 * Token Gate
 * 
 * Pre-generation gating based on token values.
 * Blocks or modifies requests before they reach the LLM based on
 * token classifications and enforcement rules.
 * 
 * @module services/tokens/tokenGate
 */

import type { ActiveTokens as TokenValues } from './tokenTypes';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gate decision result
 */
export interface GateDecision {
  /** Whether generation should proceed */
  shouldProceed: boolean;
  /** Reason for the decision */
  reason: string;
  /** Pre-built response if blocked */
  prebuiltResponse?: string;
  /** Modified prompt injection if proceeding */
  promptInjection?: string;
  /** Tokens that triggered the decision */
  triggeringTokens: string[];
  /** Priority of the decision (higher = more important) */
  priority: number;
}

/**
 * Gate rule definition
 */
export interface GateRule {
  id: string;
  /** Token key to check */
  tokenKey: string;
  /** Token values that trigger this rule (or '*' for any) */
  triggerValues: string[];
  /** Action when triggered */
  action: 'block' | 'modify' | 'require_confirmation' | 'add_warning';
  /** Pre-built response for block action */
  blockResponse?: string;
  /** Prompt injection for modify action */
  promptModification?: string;
  /** Warning text for add_warning action */
  warningText?: string;
  /** Priority (higher = checked first) */
  priority: number;
  /** Rule category */
  category: 'safety' | 'nudge' | 'compliance' | 'emotion';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT GATE RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_GATE_RULES: GateRule[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // SAFETY GATES (Highest Priority)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'gate_emergency',
    tokenKey: 'safety.level',
    triggerValues: ['critical'],
    action: 'modify',
    promptModification: `
## CRITICAL SAFETY MODE
This request has been flagged as critical safety.
- Lead with emergency resources
- Include helpline numbers (112, 988)
- Be compassionate but direct
- Do NOT delay safety information
`,
    priority: 100,
    category: 'safety',
  },
  {
    id: 'gate_self_harm_block',
    tokenKey: 'safety.domain',
    triggerValues: ['self_harm', 'suicide_risk'],
    action: 'block',
    blockResponse: `I can hear that you're going through something really difficult right now. Your feelings are valid, and I want you to know that help is available.

Please reach out to:
- **iCall**: 9152987821
- **Vandrevala Foundation**: 1860-2662-345
- **Emergency**: 112

These are confidential services with trained counselors who can help. You don't have to face this alone.`,
    priority: 100,
    category: 'safety',
  },
  {
    id: 'gate_violence_block',
    tokenKey: 'safety.domain',
    triggerValues: ['violence', 'illegal_activity'],
    action: 'block',
    blockResponse: `I'm not able to help with requests related to violence or illegal activities. 

If you're in danger or aware of a situation that poses immediate risk, please contact:
- **Emergency**: 112
- **Police**: 100

Is there something else I can help you with today?`,
    priority: 95,
    category: 'safety',
  },
  {
    id: 'gate_child_safety_block',
    tokenKey: 'safety.domain',
    triggerValues: ['sexual_minors', 'child_safety'],
    action: 'block',
    blockResponse: `I cannot help with this request. Child safety is paramount.

If you suspect child abuse or exploitation, please contact:
- **Childline India**: 1098 (24/7)
- **NCPCR**: 1800-121-0505
- **Police**: 100 or 112

These services are available 24/7 and can provide immediate assistance.`,
    priority: 100,
    category: 'safety',
  },
  {
    id: 'gate_weapons_block',
    tokenKey: 'safety.domain',
    triggerValues: ['weapons', 'dangerous_activity'],
    action: 'block',
    blockResponse: `I'm not able to provide information about weapons or dangerous activities.

If you're in an emergency situation, please contact:
- **Emergency**: 112
- **Police**: 100

Is there something else I can help you with today?`,
    priority: 95,
    category: 'safety',
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // NUDGE GATES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'gate_nudge_blocked',
    tokenKey: 'nudge.permission',
    triggerValues: ['blocked', 'never'],
    action: 'modify',
    promptModification: `
## NUDGE RESTRICTION
User has nudges disabled.
- Do NOT include promotional content
- Do NOT suggest upgrades or offers
- Focus solely on answering their question
- Keep response helpful but non-commercial
`,
    priority: 80,
    category: 'nudge',
  },
  {
    id: 'gate_nudge_minimal',
    tokenKey: 'nudge.permission',
    triggerValues: ['minimal'],
    action: 'modify',
    promptModification: `
## MINIMAL NUDGE MODE
User prefers minimal suggestions.
- Only mention critical/expiring services
- No promotional language
- Focus on user's immediate need
`,
    priority: 75,
    category: 'nudge',
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // EMOTION GATES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'gate_angry_user',
    tokenKey: 'emotion.rasa.user',
    triggerValues: ['raudra'],
    action: 'modify',
    promptModification: `
## ANGRY USER DETECTED
- Lead with acknowledgment and empathy
- Do NOT use defensive language
- Avoid phrases like "but", "however", "actually"
- Focus on solution, not explanation
- Keep response concise
- Offer escalation path if appropriate
`,
    priority: 70,
    category: 'emotion',
  },
  {
    id: 'gate_sad_user',
    tokenKey: 'emotion.rasa.user',
    triggerValues: ['karuna'],
    action: 'modify',
    promptModification: `
## COMPASSIONATE MODE
User expressing sadness/distress.
- Lead with empathy
- Use warm, caring tone
- Avoid rushed solutions
- Acknowledge their feelings first
- Be patient and supportive
`,
    priority: 65,
    category: 'emotion',
  },
  {
    id: 'gate_fearful_user',
    tokenKey: 'emotion.rasa.user',
    triggerValues: ['bhayanaka'],
    action: 'modify',
    promptModification: `
## REASSURANCE MODE
User expressing fear/anxiety.
- Lead with reassurance
- Explain steps clearly
- Avoid alarming language
- Provide certainty where possible
- Offer to guide through process
`,
    priority: 65,
    category: 'emotion',
  },
  {
    id: 'gate_disgust_user',
    tokenKey: 'emotion.rasa.user',
    triggerValues: ['bibhatsa'],
    action: 'modify',
    promptModification: `
## RESPECTFUL EXIT MODE
User expressing disgust/rejection/aversion.
- Respect their choice immediately
- Do NOT argue or persuade
- Confirm requested action (cancel, pause, opt-out)
- Keep the door open for return without pressure
`,
    priority: 65,
    category: 'emotion',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // NUDGE SENSITIVITY OVERRIDES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'gate_nudge_safety_block',
    tokenKey: 'nudge.sensitivity_override',
    triggerValues: ['safety_block'],
    action: 'modify',
    promptModification: `
## NUDGE SAFETY OVERRIDE
Safety-sensitive domain detected. All nudging blocked.
- ZERO promotional content of any kind
- ZERO upgrade suggestions
- ZERO cross-sell mentions
- Focus entirely on safety and user wellbeing
`,
    priority: 85,
    category: 'nudge',
  },
  {
    id: 'gate_nudge_complaint_block',
    tokenKey: 'nudge.sensitivity_override',
    triggerValues: ['complaint_block'],
    action: 'modify',
    promptModification: `
## NUDGE COMPLAINT OVERRIDE
Active complaint detected. All nudging blocked until fully resolved.
- Do NOT suggest upgrades or new services
- Do NOT mention offers or promotions
- Focus solely on resolving the complaint
- Only after confirmed resolution may a contextual suggestion appear
`,
    priority: 82,
    category: 'nudge',
  },
  {
    id: 'gate_nudge_emotion_block',
    tokenKey: 'nudge.sensitivity_override',
    triggerValues: ['high_emotion_block'],
    action: 'modify',
    promptModification: `
## NUDGE EMOTION OVERRIDE
High/extreme emotion detected. All nudging blocked until emotional state stabilises.
- No promotional content during distress
- No upselling during frustration
- Focus on empathy and resolution
`,
    priority: 82,
    category: 'nudge',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ADVICE BOUNDARY GATES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'gate_advice_refer_professional',
    tokenKey: 'advice.boundary',
    triggerValues: ['refer_professional'],
    action: 'modify',
    promptModification: `
## PROFESSIONAL REFERRAL REQUIRED
This topic requires professional guidance.
- Share only general context and surface-level information
- Explicitly recommend consulting a qualified professional
- Do NOT provide diagnosis, investment advice, or legal strategy
- Add appropriate disclaimer
`,
    priority: 70,
    category: 'compliance',
  },
  {
    id: 'gate_advice_emergency_redirect',
    tokenKey: 'advice.boundary',
    triggerValues: ['emergency_redirect'],
    action: 'modify',
    promptModification: `
## EMERGENCY REDIRECT
Immediate emergency response needed.
- Provide emergency numbers/resources IMMEDIATELY
- Do NOT attempt to resolve the situation yourself
- Be compassionate but direct
- Emergency: 112, Police: 100, Ambulance: 108
`,
    priority: 95,
    category: 'safety',
  },
  {
    id: 'gate_advice_refuse',
    tokenKey: 'advice.boundary',
    triggerValues: ['refuse_and_redirect'],
    action: 'block',
    blockResponse: `I'm not able to help with this request. If you need assistance, please contact the appropriate authority or service.

Is there something else I can help you with?`,
    priority: 95,
    category: 'safety',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RISK GATES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'gate_risk_account_security',
    tokenKey: 'risk.category',
    triggerValues: ['account_security'],
    action: 'modify',
    promptModification: `
## ACCOUNT SECURITY MODE
Identity/security-sensitive operation detected.
- Do NOT expose sensitive data (passwords, OTPs, account numbers)
- Confirm identity steps carefully before proceeding
- Use precise, unambiguous language
- Never display full account details
`,
    priority: 75,
    category: 'compliance',
  },
  {
    id: 'gate_risk_finance',
    tokenKey: 'risk.category',
    triggerValues: ['finance_regulatory'],
    action: 'modify',
    promptModification: `
## FINANCIAL CAUTION MODE
Financial/regulatory context detected.
- Use precise language -- avoid vague guarantees
- Confirm amounts clearly before any action
- Add appropriate disclaimers for financial information
- Never promise specific financial outcomes
`,
    priority: 70,
    category: 'compliance',
  },
  {
    id: 'gate_risk_critical',
    tokenKey: 'risk.level',
    triggerValues: ['critical'],
    action: 'modify',
    promptModification: `
## CRITICAL RISK MODE
Immediate fraud, security, or financial exposure detected.
- Stabilise the situation first
- Provide containment steps before resolution
- No humour, no nudging, no casual tone
- Confirm every action before executing
- Offer escalation path
`,
    priority: 85,
    category: 'safety',
  },
  {
    id: 'gate_risk_high',
    tokenKey: 'risk.level',
    triggerValues: ['high'],
    action: 'modify',
    promptModification: `
## HIGH RISK MODE
Data, money, or trust at stake.
- Slow down -- confirm before every action
- Use precise, unambiguous language
- No casual phrasing or humour
- Increase confirmation checkpoints
`,
    priority: 72,
    category: 'compliance',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // URGENCY GATES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'gate_urgency_critical',
    tokenKey: 'context.urgency',
    triggerValues: ['critical'],
    action: 'modify',
    promptModification: `
## CRITICAL URGENCY
Service down, safety risk, or financial exposure. User needs immediate resolution.
- Maximum brevity -- skip pleasantries
- Lead with the solution or action
- Provide clear, numbered steps if applicable
- Offer escalation immediately if cannot resolve
`,
    priority: 78,
    category: 'compliance',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TURN COUNT FATIGUE GATE
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'gate_high_turn_count',
    tokenKey: 'conversation.turn_count',
    triggerValues: ['9', '10', '11', '12', '13', '14', '15'],
    action: 'modify',
    promptModification: `
## HIGH FRICTION DETECTED
This conversation has been going for many turns (9+).
- Offer a summarised reset of what has been tried
- Suggest escalation to human support if appropriate
- Reduce cognitive load -- shorter responses
- Avoid repeating previously given information
`,
    priority: 55,
    category: 'compliance',
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE GATES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'gate_financial_advice',
    tokenKey: 'safety.domain',
    triggerValues: ['financial_advice', 'investment'],
    action: 'add_warning',
    warningText: 'Note: This is general information only and not financial advice. Please consult a qualified financial advisor for personalized guidance.',
    priority: 60,
    category: 'compliance',
  },
  {
    id: 'gate_health_advice',
    tokenKey: 'safety.domain',
    triggerValues: ['health_general', 'health_emergency'],
    action: 'add_warning',
    warningText: 'Note: This is general health information only. Please consult a healthcare professional for medical advice.',
    priority: 60,
    category: 'compliance',
  },
  {
    id: 'gate_legal_advice',
    tokenKey: 'safety.domain',
    triggerValues: ['legal_sensitive'],
    action: 'add_warning',
    warningText: 'Note: This is general information only and not legal advice. Please consult a legal professional for specific guidance.',
    priority: 60,
    category: 'compliance',
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // BRAND PROTECTION GATES
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'gate_brand_protection',
    tokenKey: 'ecosystem',
    triggerValues: ['*'],  // Apply to all ecosystems - Jio is always the brand
    action: 'modify',
    promptModification: `
## BRAND GUIDELINES - NEUTRAL & OBJECTIVE
You are Jio's assistant. When discussing competitors (Airtel, Vi, BSNL, Vodafone Idea, etc.):
- USE actual competitor names when relevant -- be factual and transparent
- MAINTAIN a neutral, objective tone -- no negative comparisons or dismissive language
- FOCUS on Jio's strengths and value proposition positively:
  - India's largest 4G/5G network coverage
  - True unlimited calling
  - Affordable data plans
  - Exclusive OTT bundles (JioTV, JioCinema)
  - Loyalty rewards and special offers
- When user asks about competitors, provide basic factual information if known
- When user mentions switching, acknowledge their consideration respectfully and highlight Jio's benefits
- NEVER diminish or disparage competitors -- maintain professional respect
- Focus on understanding their needs and showing how Jio can meet them
`,
    priority: 90,
    category: 'compliance',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// GATE CHECK FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check tokens against gate rules
 */
export function checkTokenGate(
  activeTokens: Partial<TokenValues>,
  customRules?: GateRule[]
): GateDecision {
  const rules = customRules || DEFAULT_GATE_RULES;
  
  // Sort rules by priority (higher first)
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
  
  const triggeringTokens: string[] = [];
  let highestPriorityBlock: GateRule | null = null;
  const modifications: string[] = [];
  const warnings: string[] = [];
  
  for (const rule of sortedRules) {
    const tokenValue = activeTokens[rule.tokenKey as keyof TokenValues];
    
    if (tokenValue === undefined) {
      continue;
    }
    
    const matches = rule.triggerValues.includes(String(tokenValue)) || 
                   rule.triggerValues.includes('*');
    
    if (!matches) {
      continue;
    }
    
    triggeringTokens.push(`${rule.tokenKey}=${tokenValue}`);
    
    switch (rule.action) {
      case 'block':
        // Take the highest priority block
        if (!highestPriorityBlock || rule.priority > highestPriorityBlock.priority) {
          highestPriorityBlock = rule;
        }
        break;
        
      case 'modify':
        if (rule.promptModification) {
          modifications.push(rule.promptModification);
        }
        break;
        
      case 'add_warning':
        if (rule.warningText) {
          warnings.push(rule.warningText);
        }
        break;
        
      case 'require_confirmation':
        // Could be implemented with UI interaction
        console.log(`[TokenGate] Confirmation required for: ${rule.id}`);
        break;
    }
  }
  
  // If there's a block, return it
  if (highestPriorityBlock) {
    return {
      shouldProceed: false,
      reason: `Blocked by ${highestPriorityBlock.id}: ${highestPriorityBlock.category}`,
      prebuiltResponse: highestPriorityBlock.blockResponse,
      triggeringTokens,
      priority: highestPriorityBlock.priority,
    };
  }
  
  // Otherwise, allow with modifications
  const combinedInjection = modifications.length > 0 
    ? modifications.join('\n\n---\n\n')
    : undefined;
  
  const combinedWarnings = warnings.length > 0
    ? `\n\n---\n\n## Required Disclaimers\n${warnings.join('\n\n')}`
    : undefined;
  
  return {
    shouldProceed: true,
    reason: modifications.length > 0 
      ? `Proceeding with ${modifications.length} modifications`
      : 'No gate rules triggered',
    promptInjection: combinedInjection 
      ? (combinedWarnings ? `${combinedInjection}${combinedWarnings}` : combinedInjection)
      : combinedWarnings,
    triggeringTokens,
    priority: Math.max(...sortedRules.filter(r => triggeringTokens.some(t => t.startsWith(r.tokenKey))).map(r => r.priority), 0),
  };
}

/**
 * Get gate decision summary for logging
 */
export function formatGateDecision(decision: GateDecision): string {
  if (!decision.shouldProceed) {
    return `[BLOCKED] ${decision.reason}`;
  }
  
  if (decision.promptInjection) {
    return `[MODIFIED] ${decision.reason}, ${decision.triggeringTokens.length} tokens triggered`;
  }
  
  return `[ALLOWED] ${decision.reason}`;
}

/**
 * Quick check if any blocking tokens are present
 */
export function hasBlockingTokens(activeTokens: Partial<TokenValues>): boolean {
  const blockingRules = DEFAULT_GATE_RULES.filter(r => r.action === 'block');
  
  for (const rule of blockingRules) {
    const tokenValue = activeTokens[rule.tokenKey as keyof TokenValues];
    if (tokenValue && rule.triggerValues.includes(String(tokenValue))) {
      return true;
    }
  }
  
  return false;
}

export default checkTokenGate;
