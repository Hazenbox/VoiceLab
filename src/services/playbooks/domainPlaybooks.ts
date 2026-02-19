/**
 * Domain Playbooks
 * 
 * Provides domain-specific guidance and response patterns.
 * 7 domain playbooks: connectivity, payments, entertainment, commerce, health, education, enterprise.
 * 
 * @module services/playbooks/domainPlaybooks
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Domain types
 */
export type DomainType =
  | 'connectivity'     // Telecom, internet, network
  | 'payments'         // UPI, banking, transactions
  | 'entertainment'    // Streaming, content
  | 'commerce'         // Shopping, orders
  | 'health'           // Health services
  | 'education'        // Learning, courses
  | 'enterprise';      // B2B services

/**
 * Playbook structure
 */
export interface DomainPlaybook {
  domain: DomainType;
  description: string;
  
  // Common issues and resolutions
  commonIssues: CommonIssue[];
  
  // Response patterns
  responsePatterns: ResponsePattern[];
  
  // Domain-specific vocabulary
  vocabulary: VocabularyEntry[];
  
  // Escalation triggers
  escalationTriggers: string[];
  
  // Proactive opportunities
  proactiveOpportunities: ProactiveOpportunity[];
  
  // Tone guidance
  toneGuidance: ToneGuidance;
}

/**
 * Common issue definition
 */
export interface CommonIssue {
  id: string;
  name: string;
  keywords: string[];
  resolution: string[];
  estimatedResolutionTime: string;
  selfServiceable: boolean;
}

/**
 * Response pattern
 */
export interface ResponsePattern {
  scenario: string;
  opening: string[];
  body: string[];
  closing: string[];
}

/**
 * Vocabulary entry
 */
export interface VocabularyEntry {
  term: string;
  definition: string;
  useInstead?: string; // Simpler alternative
}

/**
 * Proactive opportunity
 */
export interface ProactiveOpportunity {
  trigger: string;
  suggestion: string;
  relevanceScore: number;
}

/**
 * Tone guidance
 */
export interface ToneGuidance {
  formality: 'casual' | 'balanced' | 'formal';
  technicalLevel: 'basic' | 'moderate' | 'technical';
  empathyLevel: 'low' | 'medium' | 'high';
  urgencyDefault: 'low' | 'medium' | 'high';
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN PLAYBOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export const DOMAIN_PLAYBOOKS: Record<DomainType, DomainPlaybook> = {
  connectivity: {
    domain: 'connectivity',
    description: 'telecom and internet services',
    commonIssues: [
      {
        id: 'no_network',
        name: 'no network signal',
        keywords: ['no signal', 'no network', 'no service', 'emergency calls only'],
        resolution: [
          'check if airplane mode is off',
          'restart your phone',
          'reinsert SIM card',
          'check for network outage in area',
        ],
        estimatedResolutionTime: '5-10 minutes',
        selfServiceable: true,
      },
      {
        id: 'slow_internet',
        name: 'slow internet speed',
        keywords: ['slow', 'speed', 'buffering', 'loading'],
        resolution: [
          'check data balance',
          'move to better signal area',
          'restart mobile data',
          'clear app cache',
        ],
        estimatedResolutionTime: '5 minutes',
        selfServiceable: true,
      },
      {
        id: 'recharge_failed',
        name: 'recharge failed',
        keywords: ['recharge failed', 'money deducted', 'not credited'],
        resolution: [
          'wait 30 minutes for auto-reversal',
          'check transaction status in MyJio',
          'contact support with transaction ID',
        ],
        estimatedResolutionTime: '24-48 hours for refund',
        selfServiceable: false,
      },
      {
        id: 'plan_recommendation',
        name: 'plan recommendation',
        keywords: ['recommend', 'best plan', 'which plan', 'suggest', 'upgrade', 'compare plans', 'most expensive', 'cheapest plan'],
        resolution: [
          'ask about current usage patterns (data, voice, streaming)',
          'ask about budget preference or flexibility',
          'ask about duration preference (monthly vs annual)',
          'present 2-3 matching options with trade-offs',
          'let user choose - no pressure',
        ],
        estimatedResolutionTime: '3-5 minutes',
        selfServiceable: true,
      },
    ],
    responsePatterns: [
      {
        scenario: 'network_complaint',
        opening: ['i understand connectivity issues can be really frustrating'],
        body: ['let me help you get back online'],
        closing: ['is your connection working now?'],
      },
      {
        scenario: 'plan_recommendation',
        opening: ['i would be happy to help you find the right plan'],
        body: [
          'before i suggest anything, could you share a bit about how you use your phone?',
          'how much data do you typically use per month?',
          'do you stream content often?',
          'is this for just yourself or do you need a family plan?',
        ],
        closing: [
          'based on what you have shared, here are a few options that could work for you',
          'you can also continue with your current plan if it still meets your needs',
        ],
      },
    ],
    vocabulary: [
      { term: 'VoLTE', definition: 'voice over LTE for HD calling', useInstead: 'HD calling' },
      { term: 'APN', definition: 'access point name', useInstead: 'network settings' },
      { term: 'IMEI', definition: 'device identifier', useInstead: 'phone ID' },
    ],
    escalationTriggers: [
      'network down for multiple days',
      'repeated failed recharges',
      'SIM swap fraud',
      'number porting issues',
    ],
    proactiveOpportunities: [
      { trigger: 'low_data', suggestion: 'data pack running low - recharge?', relevanceScore: 0.9 },
      { trigger: 'plan_expiry', suggestion: 'plan expiring soon - renew?', relevanceScore: 0.95 },
    ],
    toneGuidance: {
      formality: 'balanced',
      technicalLevel: 'basic',
      empathyLevel: 'high',
      urgencyDefault: 'high',
    },
  },
  
  payments: {
    domain: 'payments',
    description: 'financial transactions and UPI',
    commonIssues: [
      {
        id: 'payment_failed',
        name: 'payment failed',
        keywords: ['payment failed', 'transaction failed', 'money stuck'],
        resolution: [
          'check internet connection',
          'verify UPI PIN is correct',
          'check bank account balance',
          'wait for auto-reversal (3-5 business days)',
        ],
        estimatedResolutionTime: '3-5 business days',
        selfServiceable: false,
      },
      {
        id: 'wrong_transfer',
        name: 'wrong UPI transfer',
        keywords: ['wrong number', 'wrong account', 'sent to wrong'],
        resolution: [
          'contact recipient if known',
          'raise complaint in UPI app',
          'contact bank for reversal request',
        ],
        estimatedResolutionTime: '7-10 business days',
        selfServiceable: false,
      },
    ],
    responsePatterns: [
      {
        scenario: 'payment_concern',
        opening: ['i understand how stressful payment issues can be - your money is safe'],
        body: ['let me help you track this'],
        closing: ['your refund should reflect within the timeline'],
      },
    ],
    vocabulary: [
      { term: 'UPI', definition: 'unified payments interface' },
      { term: 'IMPS', definition: 'immediate payment service' },
      { term: 'NEFT', definition: 'national electronic fund transfer' },
    ],
    escalationTriggers: [
      'fraud suspicion',
      'unauthorized transaction',
      'large amount stuck',
      'repeat failures',
    ],
    proactiveOpportunities: [
      { trigger: 'bill_due', suggestion: 'bill due soon - pay now?', relevanceScore: 0.85 },
    ],
    toneGuidance: {
      formality: 'formal',
      technicalLevel: 'moderate',
      empathyLevel: 'high',
      urgencyDefault: 'high',
    },
  },
  
  entertainment: {
    domain: 'entertainment',
    description: 'streaming and content services',
    commonIssues: [
      {
        id: 'playback_issue',
        name: 'video not playing',
        keywords: ['not playing', 'buffering', 'black screen', 'error'],
        resolution: [
          'check internet connection',
          'clear app cache',
          'update app',
          'try different quality setting',
        ],
        estimatedResolutionTime: '5 minutes',
        selfServiceable: true,
      },
      {
        id: 'subscription_issue',
        name: 'subscription not active',
        keywords: ['subscription', 'premium', 'content locked'],
        resolution: [
          'check subscription status',
          'logout and login again',
          'verify linked Jio number',
        ],
        estimatedResolutionTime: '5 minutes',
        selfServiceable: true,
      },
    ],
    responsePatterns: [
      {
        scenario: 'content_issue',
        opening: ["let's get your entertainment back on track"],
        body: ['here are some quick fixes'],
        closing: ['enjoy your show!'],
      },
    ],
    vocabulary: [
      { term: 'bitrate', definition: 'video quality', useInstead: 'video quality' },
      { term: 'codec', definition: 'video format', useInstead: 'video format' },
    ],
    escalationTriggers: [
      'content not available after purchase',
      'billing dispute',
      'account hacked',
    ],
    proactiveOpportunities: [
      { trigger: 'new_release', suggestion: 'check out new releases', relevanceScore: 0.6 },
      { trigger: 'upgrade', suggestion: 'upgrade to premium for ad-free', relevanceScore: 0.5 },
    ],
    toneGuidance: {
      formality: 'casual',
      technicalLevel: 'basic',
      empathyLevel: 'medium',
      urgencyDefault: 'medium',
    },
  },
  
  commerce: {
    domain: 'commerce',
    description: 'e-commerce and orders',
    commonIssues: [
      {
        id: 'order_tracking',
        name: 'order tracking',
        keywords: ['where is my order', 'tracking', 'delivery status'],
        resolution: [
          'provide order ID',
          'check tracking in app',
          'contact delivery partner',
        ],
        estimatedResolutionTime: 'instant',
        selfServiceable: true,
      },
      {
        id: 'return_request',
        name: 'return and refund',
        keywords: ['return', 'refund', 'exchange', 'damaged'],
        resolution: [
          'initiate return in app',
          'pack item securely',
          'schedule pickup',
          'refund after pickup (5-7 days)',
        ],
        estimatedResolutionTime: '5-7 days',
        selfServiceable: true,
      },
    ],
    responsePatterns: [
      {
        scenario: 'order_concern',
        opening: ['let me check on your order for you'],
        body: ['here is the current status'],
        closing: ['is there anything else about your order?'],
      },
    ],
    vocabulary: [
      { term: 'AWB', definition: 'airway bill number', useInstead: 'tracking number' },
      { term: 'COD', definition: 'cash on delivery' },
    ],
    escalationTriggers: [
      'order lost',
      'wrong item delivered',
      'refund not received after 15 days',
    ],
    proactiveOpportunities: [
      { trigger: 'cart_abandoned', suggestion: 'items waiting in cart', relevanceScore: 0.7 },
      { trigger: 'reorder', suggestion: 'time to reorder?', relevanceScore: 0.6 },
    ],
    toneGuidance: {
      formality: 'balanced',
      technicalLevel: 'basic',
      empathyLevel: 'medium',
      urgencyDefault: 'medium',
    },
  },
  
  health: {
    domain: 'health',
    description: 'health and wellness services',
    commonIssues: [
      {
        id: 'appointment_booking',
        name: 'appointment booking',
        keywords: ['book appointment', 'doctor', 'consultation'],
        resolution: [
          'select specialty',
          'choose doctor',
          'pick time slot',
          'confirm booking',
        ],
        estimatedResolutionTime: '5 minutes',
        selfServiceable: true,
      },
    ],
    responsePatterns: [
      {
        scenario: 'health_inquiry',
        opening: ['i can help you with that'],
        body: ['for medical advice, please consult a doctor'],
        closing: ['would you like to book an appointment?'],
      },
    ],
    vocabulary: [
      { term: 'teleconsultation', definition: 'video doctor consultation' },
    ],
    escalationTriggers: [
      'emergency mentioned',
      'serious symptoms',
    ],
    proactiveOpportunities: [],
    toneGuidance: {
      formality: 'formal',
      technicalLevel: 'basic',
      empathyLevel: 'high',
      urgencyDefault: 'high',
    },
  },
  
  education: {
    domain: 'education',
    description: 'learning and courses',
    commonIssues: [
      {
        id: 'course_access',
        name: 'course access issues',
        keywords: ['course', 'access', 'certificate', 'content'],
        resolution: [
          'verify enrollment',
          'check payment status',
          'refresh course list',
        ],
        estimatedResolutionTime: '5 minutes',
        selfServiceable: true,
      },
    ],
    responsePatterns: [
      {
        scenario: 'learning_support',
        opening: ['happy to help with your learning journey'],
        body: ['let me assist you with this'],
        closing: ['happy learning!'],
      },
    ],
    vocabulary: [],
    escalationTriggers: [
      'certificate not generated',
      'course purchase issue',
    ],
    proactiveOpportunities: [
      { trigger: 'course_completion', suggestion: 'explore related courses', relevanceScore: 0.7 },
    ],
    toneGuidance: {
      formality: 'balanced',
      technicalLevel: 'moderate',
      empathyLevel: 'medium',
      urgencyDefault: 'low',
    },
  },
  
  enterprise: {
    domain: 'enterprise',
    description: 'B2B and business services',
    commonIssues: [
      {
        id: 'account_management',
        name: 'enterprise account',
        keywords: ['enterprise', 'business', 'corporate', 'bulk'],
        resolution: [
          'connect to account manager',
          'schedule callback',
          'email support',
        ],
        estimatedResolutionTime: 'varies',
        selfServiceable: false,
      },
    ],
    responsePatterns: [
      {
        scenario: 'enterprise_inquiry',
        opening: ['thank you for choosing Jio for your business'],
        body: ['let me connect you with our enterprise team'],
        closing: ['your dedicated manager will follow up'],
      },
    ],
    vocabulary: [
      { term: 'SLA', definition: 'service level agreement' },
      { term: 'TCO', definition: 'total cost of ownership' },
    ],
    escalationTriggers: [
      'SLA breach',
      'service outage',
      'contract issues',
    ],
    proactiveOpportunities: [],
    toneGuidance: {
      formality: 'formal',
      technicalLevel: 'technical',
      empathyLevel: 'medium',
      urgencyDefault: 'high',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYBOOK FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get playbook for domain
 */
export function getPlaybook(domain: DomainType): DomainPlaybook {
  return DOMAIN_PLAYBOOKS[domain];
}

/**
 * Detect domain from message
 */
export function detectDomain(message: string, ecosystem?: string): DomainType {
  const text = message.toLowerCase();
  
  // Ecosystem hints
  if (ecosystem) {
    const ecosystemDomainMap: Record<string, DomainType> = {
      jio_telecom: 'connectivity',
      jio_fiber: 'connectivity',
      jio_payments: 'payments',
      jio_cinema: 'entertainment',
      jio_saavn: 'entertainment',
      jio_mart: 'commerce',
      jio_health: 'health',
      jio_edu: 'education',
      jio_enterprise: 'enterprise',
    };
    if (ecosystemDomainMap[ecosystem]) {
      return ecosystemDomainMap[ecosystem];
    }
  }
  
  // Keyword detection
  for (const [domain, playbook] of Object.entries(DOMAIN_PLAYBOOKS)) {
    for (const issue of playbook.commonIssues) {
      if (issue.keywords.some(kw => text.includes(kw))) {
        return domain as DomainType;
      }
    }
  }
  
  return 'connectivity'; // Default
}

/**
 * Find matching issue in playbook
 */
export function findMatchingIssue(
  playbook: DomainPlaybook,
  message: string
): CommonIssue | null {
  const text = message.toLowerCase();
  
  for (const issue of playbook.commonIssues) {
    if (issue.keywords.some(kw => text.includes(kw))) {
      return issue;
    }
  }
  
  return null;
}

/**
 * Format playbook guidance for prompt
 */
export function formatPlaybookForPrompt(
  domain: DomainType,
  matchedIssue?: CommonIssue | null
): string {
  const playbook = getPlaybook(domain);
  
  const lines = [
    `## domain playbook: ${domain}`,
    `description: ${playbook.description}`,
    '',
    '### tone guidance',
    `formality: ${playbook.toneGuidance.formality}`,
    `technical level: ${playbook.toneGuidance.technicalLevel}`,
    `empathy: ${playbook.toneGuidance.empathyLevel}`,
  ];
  
  if (matchedIssue) {
    lines.push('');
    lines.push('### matched issue');
    lines.push(`issue: ${matchedIssue.name}`);
    lines.push(`self-serviceable: ${matchedIssue.selfServiceable}`);
    lines.push(`estimated time: ${matchedIssue.estimatedResolutionTime}`);
    lines.push('');
    lines.push('resolution steps:');
    matchedIssue.resolution.forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
  }
  
  if (playbook.escalationTriggers.length > 0) {
    lines.push('');
    lines.push('### escalation triggers');
    lines.push(`watch for: ${playbook.escalationTriggers.join(', ')}`);
  }
  
  return lines.join('\n');
}

/**
 * Get vocabulary for domain
 */
export function getDomainVocabulary(domain: DomainType): VocabularyEntry[] {
  return getPlaybook(domain).vocabulary;
}

/**
 * Simplify technical term
 */
export function simplifyTerm(term: string, domain: DomainType): string {
  const vocabulary = getDomainVocabulary(domain);
  const entry = vocabulary.find(v => v.term.toLowerCase() === term.toLowerCase());
  return entry?.useInstead || term;
}
