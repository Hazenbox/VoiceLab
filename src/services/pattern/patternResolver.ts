/**
 * Pattern Resolver
 * 
 * Resolves response pattern sequences per Tokens v2 specification (Section 12).
 * Patterns define how responses are assembled - not what they say.
 * 
 * Ensures:
 * - Consistency
 * - Reusability  
 * - Emotional sequencing
 * - Resolution-first discipline
 * 
 * @module services/pattern/patternResolver
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pattern building blocks per Tokens v2 spec
 */
export type Pattern = 
  | 'empathy.acknowledge'
  | 'clarify.ask'
  | 'explain.why'
  | 'guide.next_step'
  | 'guide.multi_step'
  | 'confirm.action'
  | 'confirm.done'
  | 'summarise.status'
  | 'handoff.warm'
  | 'offer.option'
  | 'reassure.safety'
  | 'proactive.suggest';

/**
 * Pattern sequence types
 */
export type PatternSequenceType = 
  | 'acknowledge_clarify_act_verify'
  | 'direct_answer_explain_option'
  | 'guide_multi_step_confirm'
  | 'acknowledge_act_summarise'
  | 'act_verify_close'
  | 'resolve_next_opportunity';

/**
 * Pattern definition
 */
export interface PatternDefinition {
  id: Pattern;
  name: string;
  description: string;
  guidance: string;
  examples: string[];
}

/**
 * Pattern sequence definition
 */
export interface PatternSequence {
  type: PatternSequenceType;
  patterns: Pattern[];
  useCase: string;
  structureGuidance: string;
}

/**
 * Context for pattern resolution
 */
export interface PatternContext {
  intent?: string;
  conversationState?: string;
  emotionRasa?: string;
  emotionIntensity?: number | string;
  isComplaint?: boolean;
  hasError?: boolean;
  safetyLevel?: string;
  riskLevel?: string;
  turnCount?: number;
  isResolved?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN DEFINITIONS (12 patterns)
// ═══════════════════════════════════════════════════════════════════════════════

export const PATTERN_DEFINITIONS: Record<Pattern, PatternDefinition> = {
  'empathy.acknowledge': {
    id: 'empathy.acknowledge',
    name: 'Empathy Acknowledge',
    description: 'Emotional alignment when emotion detected',
    guidance: 'Briefly recognise user state. Keep it grounded. No exaggerated empathy.',
    examples: [
      'I understand this is frustrating.',
      'I can see why this concerns you.',
      'Thank you for your patience.',
    ],
  },
  
  'clarify.ask': {
    id: 'clarify.ask',
    name: 'Clarify Ask',
    description: 'Unlocking clarity when missing information',
    guidance: 'Ask one focused question that moves conversation forward.',
    examples: [
      'To help you better, could you share your mobile number?',
      'Which plan are you currently on?',
      'When did this issue first occur?',
    ],
  },
  
  'explain.why': {
    id: 'explain.why',
    name: 'Explain Why',
    description: 'Transparency when user needs reasoning',
    guidance: 'Provide simple cause-effect explanation. Avoid jargon.',
    examples: [
      'This happens because your data limit resets monthly.',
      'The delay is due to high network traffic in your area.',
      'We verify your identity to keep your account safe.',
    ],
  },
  
  'guide.next_step': {
    id: 'guide.next_step',
    name: 'Guide Next Step',
    description: 'Forward movement when action required',
    guidance: 'Provide structured next step. Keep steps short and clear.',
    examples: [
      'To fix this, go to Settings > Network > Reset.',
      'Your next step is to restart your router.',
      'Please check your email for the verification link.',
    ],
  },
  
  'guide.multi_step': {
    id: 'guide.multi_step',
    name: 'Guide Multi-Step',
    description: 'Structured flow when process requires multiple steps',
    guidance: 'Present steps sequentially. Avoid cognitive overload.',
    examples: [
      'Here\'s how to set up: 1. Open the app. 2. Go to Settings. 3. Tap Add Device.',
      'Follow these steps: First... Then... Finally...',
    ],
  },
  
  'confirm.action': {
    id: 'confirm.action',
    name: 'Confirm Action',
    description: 'Consent check before transaction or irreversible step',
    guidance: 'Confirm parameters clearly before proceeding.',
    examples: [
      'I\'ll recharge ₹199 to your number ending in 4567. Should I proceed?',
      'This will change your plan. Are you sure you want to continue?',
    ],
  },
  
  'confirm.done': {
    id: 'confirm.done',
    name: 'Confirm Done',
    description: 'Closure validation after execution',
    guidance: 'Confirm what was completed and what changed.',
    examples: [
      'Done! Your plan has been upgraded.',
      'I\'ve processed your refund. It will reflect in 3-5 days.',
      'Your complaint has been registered. Reference: JIO123456',
    ],
  },
  
  'summarise.status': {
    id: 'summarise.status',
    name: 'Summarise Status',
    description: 'Clarity reset at mid or late-stage conversation',
    guidance: 'Provide short recap to reduce confusion.',
    examples: [
      'So far: We\'ve identified the issue is with your SIM. Next: We\'ll process a replacement.',
      'To recap: Your bill shows ₹499 due on 15th.',
    ],
  },
  
  'handoff.warm': {
    id: 'handoff.warm',
    name: 'Handoff Warm',
    description: 'Human continuity when escalation required',
    guidance: 'Explain next process calmly. Maintain trust.',
    examples: [
      'I\'ll connect you with a specialist who can help better. They\'ll call within 2 hours.',
      'This needs expert attention. I\'m raising a priority ticket.',
    ],
  },
  
  'offer.option': {
    id: 'offer.option',
    name: 'Offer Option',
    description: 'User agency when multiple paths available',
    guidance: 'Present clear structured options. Avoid too many.',
    examples: [
      'You have two options: 1. Wait for auto-renewal, or 2. Recharge now.',
      'Would you like to troubleshoot yourself or get a callback?',
    ],
  },
  
  'reassure.safety': {
    id: 'reassure.safety',
    name: 'Reassure Safety',
    description: 'Calm stabilisation in safety-sensitive context',
    guidance: 'Provide steady factual reassurance. Avoid dramatic tone.',
    examples: [
      'Your account is secure. No unauthorized access was detected.',
      'Your payment is protected by bank-level encryption.',
    ],
  },
  
  'proactive.suggest': {
    id: 'proactive.suggest',
    name: 'Proactive Suggest',
    description: 'Controlled expansion in next-opportunity state',
    guidance: 'Offer one optional relevant suggestion only.',
    examples: [
      'By the way, did you know you can save ₹50/month with our annual plan?',
      'Since you use JioFiber, you might enjoy free JioCinema Premium.',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN SEQUENCES (6 sequences)
// ═══════════════════════════════════════════════════════════════════════════════

export const PATTERN_SEQUENCES: Record<PatternSequenceType, PatternSequence> = {
  acknowledge_clarify_act_verify: {
    type: 'acknowledge_clarify_act_verify',
    patterns: ['empathy.acknowledge', 'clarify.ask', 'guide.next_step', 'confirm.done'],
    useCase: 'Troubleshooting',
    structureGuidance: 'Emotional alignment → unlock info → structured solution → confirm',
  },
  
  direct_answer_explain_option: {
    type: 'direct_answer_explain_option',
    patterns: ['guide.next_step', 'explain.why', 'offer.option'],
    useCase: 'Knowledge / comparison',
    structureGuidance: 'Clear answer → reasoning → optional paths',
  },
  
  guide_multi_step_confirm: {
    type: 'guide_multi_step_confirm',
    patterns: ['guide.multi_step', 'confirm.done'],
    useCase: 'Setup / onboarding',
    structureGuidance: 'Structured guidance → confirmation',
  },
  
  acknowledge_act_summarise: {
    type: 'acknowledge_act_summarise',
    patterns: ['empathy.acknowledge', 'guide.next_step', 'summarise.status'],
    useCase: 'Complaint handling',
    structureGuidance: 'Validate → resolve → recap',
  },
  
  act_verify_close: {
    type: 'act_verify_close',
    patterns: ['guide.next_step', 'confirm.done'],
    useCase: 'Transaction flows',
    structureGuidance: 'Execute → confirm → finish cleanly',
  },
  
  resolve_next_opportunity: {
    type: 'resolve_next_opportunity',
    patterns: ['confirm.done', 'proactive.suggest'],
    useCase: 'Post-resolution expansion',
    structureGuidance: 'Only after confirmed success',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN RESOLUTION LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve pattern sequence based on context
 */
export function resolvePatternSequence(context: PatternContext): {
  sequence: PatternSequence;
  patterns: Pattern[];
  adjustments: string[];
} {
  const adjustments: string[] = [];
  let sequenceType: PatternSequenceType;
  
  // 1. Determine base sequence from context
  if (context.isComplaint || context.emotionRasa === 'raudra') {
    sequenceType = 'acknowledge_act_summarise';
    adjustments.push('Using complaint handling pattern due to detected frustration');
  } else if (context.intent === 'solve_problem' || context.hasError) {
    sequenceType = 'acknowledge_clarify_act_verify';
    adjustments.push('Using troubleshooting pattern');
  } else if (context.intent === 'ask_information' || context.intent === 'make_decision') {
    sequenceType = 'direct_answer_explain_option';
    adjustments.push('Using knowledge/comparison pattern');
  } else if (context.intent === 'perform_action' || context.intent === 'jio_device_setup') {
    if (context.conversationState === 'resolution' || context.conversationState === 'closing') {
      sequenceType = 'act_verify_close';
    } else {
      sequenceType = 'guide_multi_step_confirm';
    }
    adjustments.push('Using setup/onboarding pattern');
  } else if (context.isResolved && context.conversationState === 'closing') {
    sequenceType = 'resolve_next_opportunity';
    adjustments.push('Using post-resolution pattern');
  } else {
    // Default fallback
    sequenceType = 'acknowledge_clarify_act_verify';
  }
  
  // 2. Get base sequence
  const sequence = PATTERN_SEQUENCES[sequenceType];
  let patterns = [...sequence.patterns];
  
  // 3. Apply adjustments based on context
  
  // High emotion - always start with empathy
  const intensityNum = typeof context.emotionIntensity === 'number' 
    ? context.emotionIntensity 
    : context.emotionIntensity === 'high' ? 7 : context.emotionIntensity === 'extreme' ? 9 : 5;
    
  if (intensityNum >= 7 && !patterns.includes('empathy.acknowledge')) {
    patterns = ['empathy.acknowledge', ...patterns];
    adjustments.push('Added empathy.acknowledge due to high emotion intensity');
  }
  
  // Safety/risk concerns - add reassurance
  if ((context.safetyLevel === 'high' || context.safetyLevel === 'critical' ||
       context.riskLevel === 'high' || context.riskLevel === 'critical') &&
      !patterns.includes('reassure.safety')) {
    // Insert after empathy if present, otherwise at start
    const empathyIndex = patterns.indexOf('empathy.acknowledge');
    if (empathyIndex >= 0) {
      patterns.splice(empathyIndex + 1, 0, 'reassure.safety');
    } else {
      patterns = ['reassure.safety', ...patterns];
    }
    adjustments.push('Added reassure.safety due to safety/risk level');
  }
  
  // Long conversations - add summary
  if ((context.turnCount || 0) >= 6 && !patterns.includes('summarise.status')) {
    patterns.push('summarise.status');
    adjustments.push('Added summarise.status due to long conversation');
  }
  
  // Block proactive suggestions in sensitive contexts
  if ((context.safetyLevel === 'high' || context.safetyLevel === 'critical' ||
       context.riskLevel === 'high' || context.riskLevel === 'critical' ||
       context.isComplaint) && patterns.includes('proactive.suggest')) {
    patterns = patterns.filter(p => p !== 'proactive.suggest');
    adjustments.push('Removed proactive.suggest due to sensitive context');
  }
  
  return {
    sequence,
    patterns,
    adjustments,
  };
}

/**
 * Get pattern guidance text
 */
export function getPatternGuidance(pattern: Pattern): string {
  return PATTERN_DEFINITIONS[pattern]?.guidance || 'Follow standard response pattern.';
}

/**
 * Build pattern prompt section
 */
export function buildPatternPromptSection(
  patterns: Pattern[],
  sequenceType?: PatternSequenceType
): string {
  const sequence = sequenceType ? PATTERN_SEQUENCES[sequenceType] : null;
  
  let section = `## Response Structure\n\n`;
  
  if (sequence) {
    section += `**Pattern**: ${sequence.useCase}\n`;
    section += `**Structure**: ${sequence.structureGuidance}\n\n`;
  }
  
  section += `Follow this pattern sequence:\n\n`;
  
  patterns.forEach((p, i) => {
    const def = PATTERN_DEFINITIONS[p];
    section += `${i + 1}. **${def.name}**\n`;
    section += `   - ${def.guidance}\n`;
    if (def.examples.length > 0) {
      section += `   - Example: "${def.examples[0]}"\n`;
    }
    section += '\n';
  });
  
  section += `\n**Important**: Pattern sequencing must move forward. Avoid repetition. Never skip emotional alignment when needed. Align with conversation state.`;
  
  return section;
}

/**
 * Validate pattern sequence (no duplicates, proper flow)
 */
export function validatePatternSequence(patterns: Pattern[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check for duplicates
  const seen = new Set<Pattern>();
  for (const p of patterns) {
    if (seen.has(p)) {
      issues.push(`Duplicate pattern: ${p}`);
    }
    seen.add(p);
  }
  
  // Check for proper flow (empathy should come early if present)
  const empathyIndex = patterns.indexOf('empathy.acknowledge');
  if (empathyIndex > 1) {
    issues.push('empathy.acknowledge should be near the start');
  }
  
  // Check proactive.suggest is at end if present
  const proactiveIndex = patterns.indexOf('proactive.suggest');
  if (proactiveIndex >= 0 && proactiveIndex !== patterns.length - 1) {
    issues.push('proactive.suggest should be at the end');
  }
  
  // Check confirm.done is near end if present
  const confirmDoneIndex = patterns.indexOf('confirm.done');
  if (confirmDoneIndex >= 0 && confirmDoneIndex < patterns.length - 2) {
    issues.push('confirm.done should be near the end');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Get all patterns as list for UI display
 */
export function getAllPatterns(): PatternDefinition[] {
  return Object.values(PATTERN_DEFINITIONS);
}

/**
 * Get all sequences as list for UI display
 */
export function getAllSequences(): PatternSequence[] {
  return Object.values(PATTERN_SEQUENCES);
}

export default {
  PATTERN_DEFINITIONS,
  PATTERN_SEQUENCES,
  resolvePatternSequence,
  getPatternGuidance,
  buildPatternPromptSection,
  validatePatternSequence,
  getAllPatterns,
  getAllSequences,
};
