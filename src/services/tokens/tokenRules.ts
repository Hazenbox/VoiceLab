/**
 * Token Rules
 * 
 * Maps ALL token values to LLM behavior rules from the Tokens v2 specification.
 * These rules tell the LLM how to interpret and act on each token value.
 * 
 * @module services/tokens/tokenRules
 */

import type { ActiveTokens } from './tokenTypes';

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN BEHAVIOR RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete mapping of token values to LLM behavior rules
 */
export const TOKEN_RULES: Record<string, Record<string, string>> = {
  // ── ROUTING RULES ─────────────────────────────────────────────────────────
  'route.mode': {
    jio_task: 'Enter structured Jio resolution flow. Jio service logic dominates.',
    open_chat: 'Base LLM answers; Jio layer shapes tone only.',
    mixed: 'Answer fully first, then optionally offer one relevant Jio help.',
  },
  
  'route.confidence': {
    high: 'Proceed directly.',
    medium: 'Ask one clarifier if needed.',
    low: 'Clarify before acting.',
  },
  
  'route.trigger': {
    explicit_jio_entity: 'User names Jio product/service directly.',
    implicit_jio_context: 'Context strongly suggests Jio.',
    account_action_request: 'User wants account/service operation.',
    general_question: 'Open knowledge question.',
    safety_sensitive: 'Health, legal, finance, emergency, or self-harm topic detected.',
    ambiguous: 'Not enough clarity to determine routing.',
  },

  // ── SAFETY RULES ──────────────────────────────────────────────────────────
  'safety.domain': {
    none: 'No sensitive domain detected. Proceed normally.',
    health_general: 'Provide general health information. Add disclaimer about consulting doctors.',
    health_emergency: 'Immediate emergency response needed. Provide emergency contacts first.',
    mental_health: 'Be gentle, supportive and non-judgmental. Provide helpline information.',
    finance_general: 'Provide general financial information. Avoid specific investment advice.',
    investment_advice: 'Do NOT provide investment advice. Refer to financial advisors.',
    legal_general: 'Provide general legal information. Add disclaimer about consulting lawyers.',
    legal_advice: 'Do NOT provide legal advice. Refer to legal professionals.',
    self_harm: 'Prioritize safety. Provide crisis helpline. Be calm and supportive.',
    suicide_risk: 'CRITICAL: Provide emergency mental health resources immediately. Stay calm.',
    violence: 'Do NOT engage. Refuse and redirect to appropriate authorities.',
    hate_harassment: 'Do NOT engage. Refuse and redirect.',
    sexual_content: 'Refuse inappropriate requests. Maintain professional tone.',
    sexual_minors: 'CRITICAL: Refuse completely. Report if necessary.',
    child_safety: 'Prioritize child protection. Provide appropriate resources.',
    privacy_personal_data: 'Avoid storing or exposing personal data. Encourage safe handling.',
    biometric_data: 'Handle with extra caution. Follow strict data protection.',
    fraud_scam: 'Provide protective guidance. Avoid alarming tone.',
    cybersecurity: 'Provide containment steps. Maintain calm authority.',
    identity_theft: 'Guide on protective measures. Recommend reporting to authorities.',
    political_persuasion: 'Stay neutral. Provide factual information only.',
    misinformation: 'Correct gently with factual information. Cite reliable sources.',
    dangerous_activity: 'Refuse to assist. Explain risks if appropriate.',
    weapons: 'Refuse to assist with weapons-related requests.',
    substance_use: 'Provide factual information. Avoid judgment. Offer support resources.',
    regulated_products: 'Follow regulatory guidelines. Add appropriate disclaimers.',
  },

  'safety.level': {
    none: 'No safety concerns. Proceed normally.',
    low: 'Minor sensitivity. Add appropriate disclaimers.',
    moderate: 'Increased caution. Limit procedural detail. Add disclaimers.',
    high: 'High sensitivity. Refer to professionals. Minimal direct guidance.',
    critical: 'CRITICAL: Immediate safety response required. Emergency protocols active.',
  },

  'advice.boundary': {
    normal_information: 'Provide full helpful response without restrictions.',
    precautionary_guidance: 'Provide guidance with appropriate warnings.',
    limited_guidance: 'Limit procedural detail. Focus on general information.',
    refer_professional: 'Refer to appropriate professionals. Do NOT provide specific advice.',
    emergency_redirect: 'Provide emergency resources immediately. Stay calm and supportive.',
    refuse_and_redirect: 'Refuse request. Explain why. Redirect to appropriate resources.',
  },

  // ── NUDGE RULES ───────────────────────────────────────────────────────────
  'nudge.permission': {
    blocked: 'NO ecosystem suggestions allowed. Focus only on user request.',
    post_resolution_only: 'Jio suggestions allowed ONLY after issue is fully resolved.',
    contextual_soft: 'Gentle, optional Jio mention allowed if naturally relevant.',
    contextual_strong: 'Clear Jio ecosystem suggestion allowed when directly relevant.',
    proactive_allowed: 'May proactively suggest Jio services (discovery/sales flow).',
  },

  'nudge.relevance': {
    none: 'No relevant Jio ecosystem connection.',
    low: 'Weak connection to Jio ecosystem.',
    moderate: 'Reasonable connection to Jio ecosystem.',
    high: 'Strong relevance to Jio ecosystem.',
    direct_actionable: 'Directly actionable within Jio ecosystem.',
  },

  'nudge.sensitivity_override': {
    none: 'No override active.',
    safety_block: 'Nudging blocked due to safety-sensitive context.',
    complaint_block: 'Nudging blocked during complaint/escalation.',
    high_emotion_block: 'Nudging blocked due to high emotional state.',
  },

  // ── USER INTENT RULES ─────────────────────────────────────────────────────
  'user.intent': {
    ask_information: 'Provide clear, accurate information.',
    seek_guidance: 'Guide with actionable steps. Stay within boundaries.',
    solve_problem: 'Focus on troubleshooting and resolution.',
    perform_action: 'Execute or guide through the action.',
    create_content: 'Generate creative content as requested.',
    make_decision: 'Help compare options. Present balanced view.',
    locate_service: 'Help find relevant service/contact.',
    track_status: 'Provide clear status update.',
    report_issue: 'Acknowledge issue. Begin resolution flow.',
    give_feedback: 'Receive feedback gracefully. Acknowledge.',
    social_chat: 'Engage warmly in conversation.',
    emotional_support: 'Be supportive and reassuring.',
    jio_account: 'Handle Jio account operations carefully.',
    jio_billing_payment: 'Handle billing with precision. Confirm amounts.',
    jio_connectivity: 'Troubleshoot network/connectivity issues.',
    jio_orders_services: 'Handle orders and service requests.',
    jio_device_setup: 'Guide through device setup clearly.',
  },

  // ── CONTEXT RULES ─────────────────────────────────────────────────────────
  'context.time': {
    morning: 'Appropriate morning greeting if needed.',
    afternoon: 'Appropriate afternoon tone.',
    evening: 'Appropriate evening warmth.',
    night: 'Acknowledge late hour if relevant.',
  },

  'context.event': {
    none: 'No special event context.',
    festival: 'Include culturally appropriate festive warmth.',
    sale_event: 'May reference ongoing sale if relevant.',
    cricket_match: 'Light cricket reference allowed if appropriate.',
    exam_season: 'Be mindful of student stress. Supportive tone.',
    weather_disruption: 'Acknowledge weather impact if relevant to service.',
    public_holiday: 'Acknowledge holiday if relevant.',
    breaking_news: 'Be sensitive to current events context.',
  },

  'context.urgency': {
    low: 'Normal pacing. Full explanation allowed.',
    medium: 'Moderate urgency. Stay focused.',
    high: 'High urgency. Be concise and action-oriented.',
    critical: 'CRITICAL: Immediate action required. Minimal preamble.',
  },

  'context.journey_stage': {
    discover: 'User is exploring. Be informative and inviting.',
    onboard: 'User is new. Be welcoming and clear.',
    use: 'User is active. Be helpful and efficient.',
    fix: 'User has a problem. Be solution-focused.',
    pay: 'User is making payment. Be precise and secure.',
    renew: 'User is renewing. Highlight value.',
    upgrade: 'User is considering upgrade. Present options clearly.',
    exit: 'User may be leaving. Be respectful. Understand concerns.',
  },

  // ── EMOTION RULES ─────────────────────────────────────────────────────────
  'emotion.rasa.user': {
    shringara: 'User feels delight/connection. Match warmth. Be personal.',
    hasya: 'User is playful. Lean into humor naturally. Stay human.',
    karuna: 'User feels sad/disappointed. Be gentle and supportive.',
    raudra: 'User is angry. Stay calm. Acknowledge directly. Be solution-focused.',
    vira: 'User feels confident/ambitious. Be bold and empowering.',
    bhayanaka: 'User is anxious/fearful. Be steady and reassuring.',
    bibhatsa: 'User feels disgust/rejection. Acknowledge discomfort. Give control back.',
    adbhuta: 'User feels wonder/curiosity. Spark imagination. Be uplifting.',
    shanta: 'User is calm/peaceful. Respect the quiet. Be minimal and clear.',
  },

  'emotion.intensity': {
    low: 'Mild emotion. Normal pacing.',
    moderate: 'Add acknowledgment before solution.',
    high: 'Lead with empathy. Slow down. Simplify.',
    extreme: 'Prioritize emotional stabilization over resolution.',
    '1': 'Very mild. Normal flow.',
    '2': 'Mild. Normal flow.',
    '3': 'Mild. Normal flow.',
    '4': 'Moderate. Add acknowledgment.',
    '5': 'Moderate. Add acknowledgment.',
    '6': 'Moderate. Add acknowledgment.',
    '7': 'Strong. Lead with empathy.',
    '8': 'Strong. Lead with empathy. Simplify.',
    '9': 'Extreme. Prioritize stabilization.',
    '10': 'Extreme. Prioritize stabilization completely.',
  },

  'emotion.target': {
    shanta: 'Guide toward calm and stability.',
    vira: 'Guide toward confidence.',
    hasya: 'Guide toward light uplift.',
    adbhuta: 'Guide toward inspiration.',
    karuna_resolved: 'Guide toward feeling supported and steadied.',
    relieved: 'Guide toward practical calm after friction.',
  },

  // ── CONVERSATION STATE RULES ──────────────────────────────────────────────
  'conversation.state': {
    start: 'Acknowledge input. Establish presence. Move quickly toward intent recognition.',
    triage: 'Identify route, safety, and intent. Ask one focused clarifier if needed.',
    clarify: 'Ask minimum question required to move forward. Be precise.',
    act: 'Provide structured answer or action. Stay focused. Avoid topic drift.',
    verify: 'Check if issue resolved or answer sufficient.',
    close: 'Confirm completion. Keep it clean and minimal.',
    next_opportunity: 'Offer one contextual next step. Make it optional.',
  },

  'conversation.resolution_status': {
    not_started: 'Move quickly toward triage or act.',
    in_progress: 'Stay structured. Avoid introducing new paths.',
    blocked_missing_info: 'Ask precise clarification.',
    resolved: 'Confirm clearly and move to close.',
    escalated: 'Explain next steps calmly. Provide expectations.',
    abandoned: 'Do not force re-engagement. Offer simple reopening path.',
  },

  // ── PERSONA RULES ─────────────────────────────────────────────────────────
  'persona': {
    jio_friend: 'Warm, relatable, conversational. Natural language. Slight informality allowed.',
    jio_guide: 'Clear, structured, steady. Supportive but focused. Prioritize clarity.',
    jio_expert: 'Precise, confident, direct. Minimal fluff. Speak with authority.',
    jio_support: 'Calm, solution-oriented, composed. Acknowledge first. Resolve quickly.',
  },

  // ── ECOSYSTEM RULES ───────────────────────────────────────────────────────
  'ecosystem': {
    connectivity: 'Use telecom-appropriate language. Be operational.',
    finance: 'Use clarity and precision. Avoid speculation.',
    shopping: 'Structured options, status clarity.',
    health: 'Activate Safety Layer strongly. Calm tone.',
    education: 'Encourage clarity and exploration.',
    entertainment: 'Allow slight expressive tone.',
    enterprise: 'Direct, precise, structured.',
    general: 'Base LLM answers; Jio tone applied.',
  },

  // ── CHANNEL RULES ─────────────────────────────────────────────────────────
  'channel': {
    app_chat: 'Standard tone and formatting. Full structured responses allowed.',
    whatsapp: 'Short paragraphs. Friendly rhythm. Conversational.',
    ivr_voice: 'Short sentences. Clear pacing. No visual references.',
    sms: 'Very concise. No excess context. One-line focus.',
    email: 'Clear headings, complete information. Professional structure.',
    push_notification: 'Extremely brief. One-line actionable clarity.',
    retail_store: 'Direct and operational. Assisted environment.',
  },

  // ── PATTERN RULES ─────────────────────────────────────────────────────────
  'pattern': {
    'empathy.acknowledge': 'Briefly recognise user state. Keep it grounded. No exaggerated empathy.',
    'clarify.ask': 'Ask one focused question that moves conversation forward.',
    'explain.why': 'Provide simple cause-effect explanation. Avoid jargon.',
    'guide.next_step': 'Provide structured next step. Keep steps short and clear.',
    'guide.multi_step': 'Present steps sequentially. Avoid cognitive overload.',
    'confirm.action': 'Confirm parameters clearly before proceeding.',
    'confirm.done': 'Confirm what was completed and what changed.',
    'summarise.status': 'Provide short recap to reduce confusion.',
    'handoff.warm': 'Explain next process calmly. Maintain trust.',
    'offer.option': 'Present clear structured options. Avoid too many.',
    'reassure.safety': 'Provide steady factual reassurance. Avoid dramatic tone.',
    'proactive.suggest': 'Offer one optional relevant suggestion only.',
  },

  // ── RISK RULES ────────────────────────────────────────────────────────────
  'risk.category': {
    none: 'No operational risk. Proceed normally.',
    account_security: 'Do not expose sensitive data. Confirm identity steps carefully.',
    finance_regulatory: 'Use precise language. Avoid guarantees. Confirm amounts clearly.',
    privacy: 'Avoid storing or exposing extra data. Encourage safe handling.',
    fraud_scam: 'Provide protective guidance. Avoid alarming tone.',
    cybersecurity: 'Provide containment steps. Maintain calm authority.',
    contractual: 'Be precise. Avoid casual phrasing.',
    legal_sensitive: 'Avoid advisory beyond general information.',
  },

  'risk.level': {
    low: 'Standard clarity.',
    medium: 'Increase precision and confirmation.',
    high: 'Slow down. Confirm before action.',
    critical: 'Stabilise. Provide containment steps first.',
  },

  // ── FINISHING RULES ───────────────────────────────────────────────────────
  'signature': {
    youre_all_set: 'Clean and confident closure.',
    thank_you_for_choosing_jio: 'Warm but not excessive.',
    with_love_from_jio: 'Emotional warmth allowed.',
    take_care: 'Gentle close.',
    reach_out_anytime: 'Reassuring availability.',
    none: 'Minimal closure.',
  },

  'small_joy': {
    time_of_day_wish: 'Light contextual warmth.',
    festival_warmth: 'Cultural connection.',
    cricket_reference: 'Light excitement.',
    workday_encouragement: 'Gentle positivity.',
    learning_encouragement: 'Motivational tone.',
    none: 'No uplift added.',
  },

  // ── LITERACY RULES ────────────────────────────────────────────────────────
  'literacy': {
    low: 'Use simple language. Short sentences. Clear structure.',
    moderate: 'Standard language. Good structure.',
    high: 'Can use more complex vocabulary and structure.',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// RULE RETRIEVAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the rule for a specific token and value
 */
export function getTokenRule(tokenKey: string, value: unknown): string | undefined {
  const rules = TOKEN_RULES[tokenKey];
  if (!rules) return undefined;
  
  const stringValue = String(value);
  return rules[stringValue];
}

/**
 * Get all applicable rules for a set of active tokens
 */
export function getActiveTokenRules(tokens: Partial<ActiveTokens>): Array<{
  token: string;
  value: string;
  rule: string;
}> {
  const activeRules: Array<{ token: string; value: string; rule: string }> = [];
  
  for (const [key, value] of Object.entries(tokens)) {
    if (value === undefined || value === null || value === '') continue;
    
    const rule = getTokenRule(key, value);
    if (rule) {
      activeRules.push({
        token: key,
        value: String(value),
        rule,
      });
    }
  }
  
  return activeRules;
}

/**
 * Build a prompt section explaining token rules
 */
export function getTokenRulesSection(tokens: Partial<ActiveTokens>): string {
  const activeRules = getActiveTokenRules(tokens);
  
  if (activeRules.length === 0) {
    return '';
  }
  
  // Group by category for readability
  const categories: Record<string, Array<{ token: string; value: string; rule: string }>> = {};
  
  for (const rule of activeRules) {
    const category = rule.token.split('.')[0].toUpperCase();
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(rule);
  }
  
  const sections: string[] = [];
  
  for (const [category, rules] of Object.entries(categories)) {
    const ruleLines = rules.map(r => `- **${r.token}=${r.value}**: ${r.rule}`);
    sections.push(`### ${category}\n${ruleLines.join('\n')}`);
  }
  
  return sections.join('\n\n');
}

/**
 * Get critical rules that MUST be followed
 * (safety, risk, emotion with high intensity)
 */
export function getCriticalRules(tokens: Partial<ActiveTokens>): string[] {
  const critical: string[] = [];
  
  // Safety level high/critical
  const safetyLevel = tokens['safety.level'];
  if (safetyLevel === 'high' || safetyLevel === 'critical') {
    const rule = getTokenRule('safety.level', safetyLevel);
    if (rule) critical.push(`SAFETY: ${rule}`);
  }
  
  // Safety domain (non-none)
  const safetyDomain = tokens['safety.domain'];
  if (safetyDomain && safetyDomain !== 'none') {
    const rule = getTokenRule('safety.domain', safetyDomain);
    if (rule) critical.push(`SAFETY DOMAIN: ${rule}`);
  }
  
  // Risk level high/critical
  const riskLevel = tokens['risk.level'];
  if (riskLevel === 'high' || riskLevel === 'critical') {
    const rule = getTokenRule('risk.level', riskLevel);
    if (rule) critical.push(`RISK: ${rule}`);
  }
  
  // Emotion intensity high/extreme
  const intensity = tokens['emotion.intensity'];
  if (intensity === 'high' || intensity === 'extreme' || 
      (typeof intensity === 'number' && intensity >= 7)) {
    const rule = getTokenRule('emotion.intensity', intensity);
    if (rule) critical.push(`EMOTION: ${rule}`);
  }
  
  // Nudge blocked
  const nudgePermission = tokens['nudge.permission'];
  if (nudgePermission === 'blocked') {
    critical.push('NUDGE: NO ecosystem suggestions allowed.');
  }
  
  return critical;
}

/**
 * Get turn count adaptation guidance
 */
export function getTurnCountGuidance(turnCount: number | undefined): string {
  if (!turnCount || turnCount <= 2) {
    return 'Normal exploratory flow.';
  } else if (turnCount <= 5) {
    return 'Increase clarity and structure. Avoid redundancy.';
  } else if (turnCount <= 8) {
    return 'Simplify. Summarise. Tighten steps.';
  } else {
    return 'Offer summarised reset or escalation. Reduce cognitive load.';
  }
}
