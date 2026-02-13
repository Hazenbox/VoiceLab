/**
 * Blocking Info Detector
 * 
 * Distinguishes between blocking vs non-blocking information needs.
 * Determines when to wait for user input vs when to proceed.
 * 
 * @module services/conversation/blockingInfoDetector
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Information type classification
 */
export type InfoType =
  | 'identity'        // Name, phone, account ID
  | 'verification'    // OTP, PIN, security question
  | 'technical'       // Device, OS, app version
  | 'contextual'      // What happened, when, where
  | 'preference'      // Choice, option selection
  | 'confirmation';   // Yes/no, proceed/cancel

/**
 * Blocking status
 */
export type BlockingStatus =
  | 'blocking'        // Cannot proceed without this info
  | 'non_blocking'    // Can proceed with assumptions/defaults
  | 'deferrable'      // Can ask later if needed
  | 'optional';       // Nice to have but not needed

/**
 * Information need
 */
export interface InfoNeed {
  /** What information is needed */
  description: string;
  /** Type of information */
  type: InfoType;
  /** Is it blocking */
  status: BlockingStatus;
  /** Why it's needed */
  reason: string;
  /** Default value if available */
  defaultValue?: string;
  /** Example of expected format */
  example?: string;
  /** Priority (1 = highest) */
  priority: number;
}

/**
 * Detection result
 */
export interface BlockingDetectionResult {
  /** List of information needs */
  needs: InfoNeed[];
  /** Are there any blocking needs */
  hasBlockingNeeds: boolean;
  /** Highest priority blocking need */
  primaryBlockingNeed: InfoNeed | null;
  /** Can proceed with assumptions */
  canProceedWithAssumptions: boolean;
  /** Suggested question to ask */
  suggestedQuestion: string | null;
  /** Count by status */
  statusCounts: Record<BlockingStatus, number>;
}

/**
 * Context for detection
 */
export interface DetectionContext {
  intent: string;
  topic: string;
  ecosystem: string;
  knownInfo: Record<string, string>;
  turnNumber: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT-BASED INFO REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Information requirements by intent
 */
const INTENT_REQUIREMENTS: Record<string, Array<{
  field: string;
  type: InfoType;
  status: BlockingStatus;
  description: string;
  reason: string;
  example?: string;
}>> = {
  // Recharge related
  recharge: [
    { field: 'phone_number', type: 'identity', status: 'blocking', description: 'mobile number', reason: 'to process recharge', example: '10-digit number' },
    { field: 'recharge_amount', type: 'preference', status: 'blocking', description: 'recharge amount or plan', reason: 'to know which plan to activate' },
    { field: 'payment_method', type: 'preference', status: 'non_blocking', description: 'payment preference', reason: 'to suggest appropriate payment' },
  ],
  
  // Account/Plan queries
  plan_inquiry: [
    { field: 'phone_number', type: 'identity', status: 'blocking', description: 'mobile number', reason: 'to look up account details', example: '10-digit number' },
  ],
  
  // Complaint related
  complaint: [
    { field: 'issue_description', type: 'contextual', status: 'blocking', description: 'what issue you are facing', reason: 'to understand and resolve the problem' },
    { field: 'phone_number', type: 'identity', status: 'blocking', description: 'mobile number', reason: 'to check your account', example: '10-digit number' },
    { field: 'when_started', type: 'contextual', status: 'non_blocking', description: 'when the issue started', reason: 'to narrow down the cause' },
    { field: 'location', type: 'contextual', status: 'non_blocking', description: 'your location', reason: 'to check local network status' },
  ],
  
  // Network issues
  network_issue: [
    { field: 'phone_number', type: 'identity', status: 'blocking', description: 'mobile number', reason: 'to check network status', example: '10-digit number' },
    { field: 'location', type: 'contextual', status: 'blocking', description: 'your current location', reason: 'to check local network status' },
    { field: 'issue_type', type: 'contextual', status: 'non_blocking', description: 'type of issue (no signal, slow speed, etc.)', reason: 'to provide specific troubleshooting' },
  ],
  
  // Billing
  billing: [
    { field: 'phone_number', type: 'identity', status: 'blocking', description: 'mobile number or account ID', reason: 'to look up billing details' },
    { field: 'billing_period', type: 'contextual', status: 'non_blocking', description: 'which bill you are asking about', reason: 'to show correct statement' },
  ],
  
  // KYC/Verification
  kyc: [
    { field: 'phone_number', type: 'identity', status: 'blocking', description: 'mobile number', reason: 'to link with your account' },
    { field: 'document_type', type: 'preference', status: 'blocking', description: 'ID document type (Aadhaar/PAN)', reason: 'to know verification method' },
    { field: 'document_number', type: 'identity', status: 'blocking', description: 'document number', reason: 'to verify identity' },
  ],
  
  // Activation
  activation: [
    { field: 'phone_number', type: 'identity', status: 'blocking', description: 'new mobile number', reason: 'to activate SIM' },
    { field: 'sim_id', type: 'identity', status: 'deferrable', description: '19-digit SIM number', reason: 'for verification', example: 'on SIM card packaging' },
  ],
  
  // Port/MNP
  porting: [
    { field: 'phone_number', type: 'identity', status: 'blocking', description: 'number to port', reason: 'to initiate porting request' },
    { field: 'current_operator', type: 'contextual', status: 'non_blocking', description: 'current operator', reason: 'to validate porting eligibility' },
  ],
  
  // General inquiry
  general: [
    { field: 'topic', type: 'contextual', status: 'non_blocking', description: 'what you would like to know', reason: 'to provide relevant information' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get requirements for an intent
 */
function getRequirements(intent: string, topic: string): typeof INTENT_REQUIREMENTS[string] {
  // Check specific topic first
  if (INTENT_REQUIREMENTS[topic]) {
    return INTENT_REQUIREMENTS[topic];
  }
  
  // Check intent
  if (INTENT_REQUIREMENTS[intent]) {
    return INTENT_REQUIREMENTS[intent];
  }
  
  // Fall back to general
  return INTENT_REQUIREMENTS['general'] || [];
}

/**
 * Check which information is already known
 */
function filterUnknownNeeds(
  requirements: typeof INTENT_REQUIREMENTS[string],
  knownInfo: Record<string, string>
): typeof INTENT_REQUIREMENTS[string] {
  return requirements.filter(req => {
    const value = knownInfo[req.field];
    return !value || value === 'unknown';
  });
}

/**
 * Convert requirement to InfoNeed
 */
function toInfoNeed(
  req: typeof INTENT_REQUIREMENTS[string][number],
  priority: number
): InfoNeed {
  return {
    description: req.description,
    type: req.type,
    status: req.status,
    reason: req.reason,
    example: req.example,
    priority,
  };
}

/**
 * Generate suggested question
 */
function generateQuestion(needs: InfoNeed[]): string | null {
  // Get highest priority blocking need
  const blockingNeeds = needs
    .filter(n => n.status === 'blocking')
    .sort((a, b) => a.priority - b.priority);
  
  if (blockingNeeds.length === 0) return null;
  
  const need = blockingNeeds[0];
  
  // Generate question based on type
  switch (need.type) {
    case 'identity':
      if (need.description.includes('mobile') || need.description.includes('phone')) {
        return 'could you please share the mobile number this is regarding?';
      }
      return `could you please share your ${need.description}?`;
    
    case 'verification':
      return `please enter the ${need.description} to proceed.`;
    
    case 'contextual':
      return `could you tell me ${need.description}?`;
    
    case 'preference':
      return `what would you prefer for ${need.description}?`;
    
    case 'confirmation':
      return need.description;
    
    default:
      return `could you please share ${need.description}?`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect blocking information needs
 */
export function detectBlockingInfo(context: DetectionContext): BlockingDetectionResult {
  const { intent, topic, knownInfo, turnNumber } = context;
  
  // Get requirements for this intent/topic
  const requirements = getRequirements(intent, topic);
  
  // Filter out already known info
  const unknownRequirements = filterUnknownNeeds(requirements, knownInfo);
  
  // Convert to InfoNeeds with priority
  const needs: InfoNeed[] = unknownRequirements.map((req, idx) => 
    toInfoNeed(req, idx + 1)
  );
  
  // Adjust status based on turn number
  // After turn 3, be more willing to proceed with assumptions
  const adjustedNeeds = needs.map(need => {
    if (turnNumber > 3 && need.status === 'non_blocking') {
      return { ...need, status: 'deferrable' as BlockingStatus };
    }
    return need;
  });
  
  // Calculate status counts
  const statusCounts: Record<BlockingStatus, number> = {
    blocking: 0,
    non_blocking: 0,
    deferrable: 0,
    optional: 0,
  };
  
  for (const need of adjustedNeeds) {
    statusCounts[need.status]++;
  }
  
  // Determine blocking status
  const hasBlockingNeeds = statusCounts.blocking > 0;
  const primaryBlockingNeed = adjustedNeeds.find(n => n.status === 'blocking') || null;
  const canProceedWithAssumptions = !hasBlockingNeeds || turnNumber > 5;
  
  // Generate question
  const suggestedQuestion = generateQuestion(adjustedNeeds);
  
  return {
    needs: adjustedNeeds,
    hasBlockingNeeds,
    primaryBlockingNeed,
    canProceedWithAssumptions,
    suggestedQuestion,
    statusCounts,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format blocking info for prompt injection
 */
export function formatBlockingInfoForPrompt(result: BlockingDetectionResult): string {
  const lines = ['## information status'];
  
  if (result.needs.length === 0) {
    lines.push('all necessary information available');
    return lines.join('\n');
  }
  
  lines.push(`blocking: ${result.statusCounts.blocking}`);
  lines.push(`non-blocking: ${result.statusCounts.non_blocking}`);
  lines.push(`deferrable: ${result.statusCounts.deferrable}`);
  
  if (result.hasBlockingNeeds && result.primaryBlockingNeed) {
    lines.push('');
    lines.push('### blocking need');
    lines.push(`needed: ${result.primaryBlockingNeed.description}`);
    lines.push(`reason: ${result.primaryBlockingNeed.reason}`);
    if (result.primaryBlockingNeed.example) {
      lines.push(`example: ${result.primaryBlockingNeed.example}`);
    }
    lines.push('');
    lines.push('**action required**: ask for this information before proceeding');
  } else {
    lines.push('');
    lines.push('can proceed - no blocking information needs');
  }
  
  if (result.suggestedQuestion) {
    lines.push('');
    lines.push(`suggested question: "${result.suggestedQuestion}"`);
  }
  
  return lines.join('\n');
}

/**
 * Check if a specific field is needed
 */
export function isFieldNeeded(result: BlockingDetectionResult, field: string): boolean {
  return result.needs.some(n => n.description.toLowerCase().includes(field.toLowerCase()));
}

/**
 * Check if we should ask for info or proceed
 */
export function shouldAskForInfo(result: BlockingDetectionResult, turnNumber: number): boolean {
  // Always ask for blocking info in early turns
  if (result.hasBlockingNeeds && turnNumber <= 3) {
    return true;
  }
  
  // After turn 5, avoid asking more questions
  if (turnNumber > 5) {
    return false;
  }
  
  // Otherwise, ask if blocking
  return result.hasBlockingNeeds;
}

/**
 * Get next question to ask
 */
export function getNextQuestion(result: BlockingDetectionResult): string {
  if (result.suggestedQuestion) {
    return result.suggestedQuestion;
  }
  
  if (result.hasBlockingNeeds && result.primaryBlockingNeed) {
    return `could you please share ${result.primaryBlockingNeed.description}?`;
  }
  
  return 'is there anything specific you need help with?';
}
