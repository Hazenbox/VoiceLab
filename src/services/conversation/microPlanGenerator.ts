/**
 * Micro Plan Generator
 * 
 * Generates multi-step transparency plans for complex issues.
 * Shows users what steps will be taken to resolve their issue.
 * 
 * @module services/conversation/microPlanGenerator
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Step in a micro plan
 */
export interface MicroPlanStep {
  /** Step number (1-indexed) */
  stepNumber: number;
  /** Short description */
  title: string;
  /** Action verb */
  action: 'check' | 'verify' | 'process' | 'confirm' | 'send' | 'guide' | 'resolve' | 'escalate';
  /** Estimated time (optional) */
  estimatedTime?: string;
  /** Whether this step requires user action */
  requiresUserAction: boolean;
  /** Current status */
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  /** Dependencies on other steps */
  dependsOn?: number[];
}

/**
 * Complete micro plan
 */
export interface MicroPlan {
  /** Unique plan ID */
  planId: string;
  /** Plan title */
  title: string;
  /** Brief description */
  description: string;
  /** List of steps */
  steps: MicroPlanStep[];
  /** Total estimated time */
  totalEstimatedTime: string;
  /** Current step */
  currentStep: number;
  /** Plan status */
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  /** Created timestamp */
  createdAt: number;
  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Plan template definition
 */
export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  intents: string[];
  topics: string[];
  steps: Array<Omit<MicroPlanStep, 'stepNumber' | 'status'>>;
  totalEstimatedTime: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAN TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pre-defined plan templates
 */
export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'recharge_issue',
    name: 'recharge issue resolution',
    description: 'resolving a failed or incorrect recharge',
    intents: ['support', 'complaint'],
    topics: ['recharge', 'payment', 'balance'],
    steps: [
      { title: 'verify account', action: 'verify', requiresUserAction: true, estimatedTime: '1 min' },
      { title: 'check transaction status', action: 'check', requiresUserAction: false, estimatedTime: '1 min' },
      { title: 'verify payment deduction', action: 'verify', requiresUserAction: false, estimatedTime: '1 min' },
      { title: 'process resolution', action: 'process', requiresUserAction: false, estimatedTime: '2 min' },
      { title: 'confirm completion', action: 'confirm', requiresUserAction: true },
    ],
    totalEstimatedTime: '5-7 minutes',
  },
  {
    id: 'network_troubleshoot',
    name: 'network issue troubleshooting',
    description: 'diagnosing and fixing network problems',
    intents: ['support', 'complaint'],
    topics: ['network', 'signal', 'connectivity'],
    steps: [
      { title: 'gather location info', action: 'check', requiresUserAction: true, estimatedTime: '1 min' },
      { title: 'check network status in your area', action: 'check', requiresUserAction: false, estimatedTime: '1 min' },
      { title: 'verify SIM/device settings', action: 'verify', requiresUserAction: true, estimatedTime: '2 min' },
      { title: 'guide through reset steps', action: 'guide', requiresUserAction: true, estimatedTime: '3 min' },
      { title: 'confirm resolution', action: 'confirm', requiresUserAction: true },
    ],
    totalEstimatedTime: '7-10 minutes',
  },
  {
    id: 'plan_change',
    name: 'plan change request',
    description: 'changing your current plan',
    intents: ['transaction'],
    topics: ['plan', 'upgrade', 'change'],
    steps: [
      { title: 'verify your current plan', action: 'check', requiresUserAction: false, estimatedTime: '1 min' },
      { title: 'show available options', action: 'guide', requiresUserAction: false, estimatedTime: '1 min' },
      { title: 'confirm your selection', action: 'confirm', requiresUserAction: true },
      { title: 'process plan change', action: 'process', requiresUserAction: false, estimatedTime: '2 min' },
      { title: 'send confirmation', action: 'send', requiresUserAction: false },
    ],
    totalEstimatedTime: '4-5 minutes',
  },
  {
    id: 'billing_dispute',
    name: 'billing issue investigation',
    description: 'investigating unexpected charges',
    intents: ['complaint', 'support'],
    topics: ['billing', 'charges', 'invoice'],
    steps: [
      { title: 'verify account', action: 'verify', requiresUserAction: true, estimatedTime: '1 min' },
      { title: 'pull billing history', action: 'check', requiresUserAction: false, estimatedTime: '1 min' },
      { title: 'identify disputed charges', action: 'check', requiresUserAction: true, estimatedTime: '2 min' },
      { title: 'investigate charges', action: 'verify', requiresUserAction: false, estimatedTime: '2 min' },
      { title: 'process adjustment if valid', action: 'process', requiresUserAction: false, estimatedTime: '2 min' },
      { title: 'confirm resolution', action: 'confirm', requiresUserAction: true },
    ],
    totalEstimatedTime: '8-10 minutes',
  },
  {
    id: 'sim_activation',
    name: 'new SIM activation',
    description: 'activating your new SIM card',
    intents: ['support', 'transaction'],
    topics: ['activation', 'new_sim', 'sim'],
    steps: [
      { title: 'verify SIM details', action: 'verify', requiresUserAction: true, estimatedTime: '1 min' },
      { title: 'check KYC status', action: 'check', requiresUserAction: false, estimatedTime: '1 min' },
      { title: 'initiate activation', action: 'process', requiresUserAction: false, estimatedTime: '2 min' },
      { title: 'guide first recharge', action: 'guide', requiresUserAction: true, estimatedTime: '2 min' },
      { title: 'confirm service active', action: 'confirm', requiresUserAction: true, estimatedTime: '5 min' },
    ],
    totalEstimatedTime: '10-15 minutes',
  },
  {
    id: 'port_request',
    name: 'number porting (MNP)',
    description: 'porting your number to Jio',
    intents: ['transaction', 'support'],
    topics: ['porting', 'mnp', 'switch'],
    steps: [
      { title: 'verify eligibility', action: 'check', requiresUserAction: true, estimatedTime: '1 min' },
      { title: 'guide UPC generation', action: 'guide', requiresUserAction: true, estimatedTime: '2 min' },
      { title: 'collect UPC code', action: 'verify', requiresUserAction: true },
      { title: 'submit porting request', action: 'process', requiresUserAction: false, estimatedTime: '1 min' },
      { title: 'share tracking details', action: 'send', requiresUserAction: false },
    ],
    totalEstimatedTime: '5 minutes (porting takes 3-7 days)',
  },
  {
    id: 'escalation',
    name: 'escalation to specialist',
    description: 'connecting you with a specialist',
    intents: ['support', 'complaint'],
    topics: ['escalation', 'human', 'agent'],
    steps: [
      { title: 'summarize your issue', action: 'check', requiresUserAction: false, estimatedTime: '1 min' },
      { title: 'prepare context for agent', action: 'process', requiresUserAction: false, estimatedTime: '1 min' },
      { title: 'connect to specialist', action: 'escalate', requiresUserAction: true, estimatedTime: '2-5 min' },
    ],
    totalEstimatedTime: '3-7 minutes',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find matching template for context
 */
export function findMatchingTemplate(
  intent: string,
  topic: string
): PlanTemplate | null {
  // Exact topic match
  const exactMatch = PLAN_TEMPLATES.find(t => 
    t.topics.includes(topic) && t.intents.includes(intent)
  );
  if (exactMatch) return exactMatch;
  
  // Intent only match
  const intentMatch = PLAN_TEMPLATES.find(t => t.intents.includes(intent));
  if (intentMatch) return intentMatch;
  
  return null;
}

/**
 * Generate a micro plan from template
 */
export function generateMicroPlan(
  template: PlanTemplate,
  customTitle?: string
): MicroPlan {
  const now = Date.now();
  const planId = `plan_${now}_${Math.random().toString(36).slice(2, 8)}`;
  
  const steps: MicroPlanStep[] = template.steps.map((step, idx) => ({
    ...step,
    stepNumber: idx + 1,
    status: 'pending',
  }));
  
  return {
    planId,
    title: customTitle || template.name,
    description: template.description,
    steps,
    totalEstimatedTime: template.totalEstimatedTime,
    currentStep: 1,
    status: 'not_started',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create custom micro plan
 */
export function createCustomPlan(
  title: string,
  steps: Array<{
    title: string;
    action: MicroPlanStep['action'];
    requiresUserAction: boolean;
    estimatedTime?: string;
  }>
): MicroPlan {
  const now = Date.now();
  const planId = `plan_${now}_${Math.random().toString(36).slice(2, 8)}`;
  
  const fullSteps: MicroPlanStep[] = steps.map((step, idx) => ({
    ...step,
    stepNumber: idx + 1,
    status: 'pending' as const,
  }));
  
  return {
    planId,
    title,
    description: title,
    steps: fullSteps,
    totalEstimatedTime: 'varies',
    currentStep: 1,
    status: 'not_started',
    createdAt: now,
    updatedAt: now,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Start a plan
 */
export function startPlan(plan: MicroPlan): MicroPlan {
  return {
    ...plan,
    status: 'in_progress',
    currentStep: 1,
    steps: plan.steps.map((step, idx) => ({
      ...step,
      status: idx === 0 ? 'in_progress' : 'pending',
    })),
    updatedAt: Date.now(),
  };
}

/**
 * Complete current step and move to next
 */
export function completeStep(plan: MicroPlan): MicroPlan {
  const currentIdx = plan.currentStep - 1;
  
  // Mark current as completed
  const updatedSteps = plan.steps.map((step, idx) => {
    if (idx === currentIdx) {
      return { ...step, status: 'completed' as const };
    }
    if (idx === currentIdx + 1) {
      return { ...step, status: 'in_progress' as const };
    }
    return step;
  });
  
  // Check if plan is complete
  const isComplete = currentIdx === plan.steps.length - 1;
  
  return {
    ...plan,
    steps: updatedSteps,
    currentStep: isComplete ? plan.currentStep : plan.currentStep + 1,
    status: isComplete ? 'completed' : 'in_progress',
    updatedAt: Date.now(),
  };
}

/**
 * Skip current step
 */
export function skipStep(plan: MicroPlan): MicroPlan {
  const currentIdx = plan.currentStep - 1;
  
  const updatedSteps = plan.steps.map((step, idx) => {
    if (idx === currentIdx) {
      return { ...step, status: 'skipped' as const };
    }
    if (idx === currentIdx + 1) {
      return { ...step, status: 'in_progress' as const };
    }
    return step;
  });
  
  const isComplete = currentIdx === plan.steps.length - 1;
  
  return {
    ...plan,
    steps: updatedSteps,
    currentStep: isComplete ? plan.currentStep : plan.currentStep + 1,
    status: isComplete ? 'completed' : 'in_progress',
    updatedAt: Date.now(),
  };
}

/**
 * Abandon plan
 */
export function abandonPlan(plan: MicroPlan): MicroPlan {
  return {
    ...plan,
    status: 'abandoned',
    updatedAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPLAY UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format plan for user display
 */
export function formatPlanForUser(plan: MicroPlan): string {
  const lines: string[] = [];
  
  lines.push(`here's how i'll help you with ${plan.title}:`);
  lines.push('');
  
  for (const step of plan.steps) {
    const statusIcon = 
      step.status === 'completed' ? '✓' :
      step.status === 'in_progress' ? '→' :
      step.status === 'skipped' ? '○' : '·';
    
    const time = step.estimatedTime ? ` (${step.estimatedTime})` : '';
    lines.push(`${statusIcon} ${step.stepNumber}. ${step.title}${time}`);
  }
  
  lines.push('');
  lines.push(`estimated total time: ${plan.totalEstimatedTime}`);
  
  return lines.join('\n');
}

/**
 * Format plan for prompt injection
 */
export function formatPlanForPrompt(plan: MicroPlan): string {
  const lines = [
    '## active micro-plan',
    `plan: ${plan.title}`,
    `status: ${plan.status}`,
    `current_step: ${plan.currentStep}/${plan.steps.length}`,
    '',
    '### steps:',
  ];
  
  for (const step of plan.steps) {
    const status = step.status === 'in_progress' ? '[CURRENT]' : `[${step.status}]`;
    lines.push(`${step.stepNumber}. ${step.title} ${status}`);
    if (step.status === 'in_progress' && step.requiresUserAction) {
      lines.push('   → needs user action');
    }
  }
  
  lines.push('');
  lines.push('**guidance**: follow the plan steps, update user on progress');
  
  return lines.join('\n');
}

/**
 * Get current step summary
 */
export function getCurrentStepSummary(plan: MicroPlan): string {
  const step = plan.steps.find(s => s.status === 'in_progress');
  if (!step) return 'plan completed';
  
  const action = step.requiresUserAction ? 'i need your help to' : "i'm going to";
  return `${action} ${step.title}`;
}

/**
 * Check if current step needs user action
 */
export function currentStepNeedsUserAction(plan: MicroPlan): boolean {
  const step = plan.steps.find(s => s.status === 'in_progress');
  return step?.requiresUserAction ?? false;
}

/**
 * Get plan progress percentage
 */
export function getPlanProgress(plan: MicroPlan): number {
  const completed = plan.steps.filter(s => 
    s.status === 'completed' || s.status === 'skipped'
  ).length;
  return Math.round((completed / plan.steps.length) * 100);
}
