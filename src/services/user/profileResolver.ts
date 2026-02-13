/**
 * Profile Resolver
 * 
 * Resolves user profile tokens: segment, plan, relationship_stage.
 * Provides context for personalized response generation.
 * 
 * @module services/user/profileResolver
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * User segment types
 */
export type UserSegment =
  | 'new'           // First 30 days
  | 'active'        // Regular usage
  | 'loyal'         // 1+ year, consistent
  | 'premium'       // High-value plans
  | 'enterprise'    // Business accounts
  | 'churning'      // At-risk of leaving
  | 'dormant'       // Inactive
  | 'win_back';     // Previously churned, returning

/**
 * Plan types
 */
export type PlanType =
  | 'prepaid_basic'
  | 'prepaid_standard'
  | 'prepaid_premium'
  | 'postpaid_basic'
  | 'postpaid_premium'
  | 'fiber_basic'
  | 'fiber_premium'
  | 'enterprise'
  | 'unknown';

/**
 * Relationship stages
 */
export type RelationshipStage =
  | 'prospect'      // Not yet customer
  | 'onboarding'    // Just joined
  | 'growing'       // Building relationship
  | 'established'   // Stable customer
  | 'deepening'     // Expanding services
  | 'at_risk'       // Showing churn signals
  | 'departing'     // Actively leaving
  | 'returning';    // Returning customer

/**
 * Resolved profile
 */
export interface ResolvedProfile {
  segment: UserSegment;
  plan: PlanType;
  relationshipStage: RelationshipStage;
  
  // Derived attributes
  isHighValue: boolean;
  tenure: TenureInfo;
  serviceBundle: string[];
  communicationPreferences: CommunicationPrefs;
}

/**
 * Tenure information
 */
export interface TenureInfo {
  days: number;
  months: number;
  years: number;
  category: 'new' | 'recent' | 'established' | 'long_term' | 'veteran';
}

/**
 * Communication preferences
 */
export interface CommunicationPrefs {
  preferredChannel: string;
  preferredLanguage: string;
  formalityLevel: 'casual' | 'balanced' | 'formal';
  detailLevel: 'brief' | 'standard' | 'detailed';
}

/**
 * Input for profile resolution
 */
export interface ProfileResolutionInput {
  // Known profile data
  accountAge?: number; // days
  planName?: string;
  monthlySpend?: number;
  servicesUsed?: string[];
  
  // Behavioral signals
  lastActivityDate?: number;
  interactionFrequency?: number; // per month
  complaintsLast30Days?: number;
  npsScore?: number;
  
  // Churn signals
  hasReducedUsage?: boolean;
  hasViewedCancelPage?: boolean;
  paymentIssues?: boolean;
  
  // Preferences
  preferredChannel?: string;
  preferredLanguage?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Plan classification mapping
 */
const PLAN_CLASSIFICATION: Record<string, PlanType> = {
  // Prepaid
  'jio_prepaid_149': 'prepaid_basic',
  'jio_prepaid_199': 'prepaid_basic',
  'jio_prepaid_249': 'prepaid_standard',
  'jio_prepaid_299': 'prepaid_standard',
  'jio_prepaid_399': 'prepaid_standard',
  'jio_prepaid_449': 'prepaid_premium',
  'jio_prepaid_599': 'prepaid_premium',
  'jio_prepaid_749': 'prepaid_premium',
  'jio_prepaid_999': 'prepaid_premium',
  
  // Postpaid
  'jio_postpaid_399': 'postpaid_basic',
  'jio_postpaid_599': 'postpaid_basic',
  'jio_postpaid_799': 'postpaid_premium',
  'jio_postpaid_999': 'postpaid_premium',
  'jio_postpaid_1499': 'postpaid_premium',
  
  // Fiber
  'jiofiber_399': 'fiber_basic',
  'jiofiber_699': 'fiber_basic',
  'jiofiber_999': 'fiber_premium',
  'jiofiber_1499': 'fiber_premium',
  'jiofiber_2499': 'fiber_premium',
  'jiofiber_3999': 'fiber_premium',
  
  // Enterprise
  'enterprise_basic': 'enterprise',
  'enterprise_plus': 'enterprise',
  'enterprise_premium': 'enterprise',
};

/**
 * High value thresholds
 */
const HIGH_VALUE_THRESHOLD = {
  monthlySpend: 500, // INR
  tenureDays: 365,
  services: 2,
};

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve user segment
 */
export function resolveSegment(input: ProfileResolutionInput): UserSegment {
  const {
    accountAge = 0,
    monthlySpend = 0,
    lastActivityDate,
    interactionFrequency = 0,
    hasReducedUsage = false,
    hasViewedCancelPage = false,
    paymentIssues = false,
    servicesUsed = [],
  } = input;
  
  // Churn detection
  if (hasViewedCancelPage || paymentIssues) {
    return 'churning';
  }
  
  // Dormant check
  if (lastActivityDate) {
    const daysSinceActivity = Math.floor((Date.now() - lastActivityDate) / (1000 * 60 * 60 * 24));
    if (daysSinceActivity > 60) {
      return 'dormant';
    }
  }
  
  // Enterprise
  if (servicesUsed.some(s => s.includes('enterprise'))) {
    return 'enterprise';
  }
  
  // New user
  if (accountAge < 30) {
    return 'new';
  }
  
  // Win back (would need historical data, simplifying here)
  if (accountAge > 90 && interactionFrequency < 1 && !hasReducedUsage) {
    return 'win_back';
  }
  
  // Premium
  if (monthlySpend >= 1000 || servicesUsed.length >= 3) {
    return 'premium';
  }
  
  // Loyal
  if (accountAge > 365 && interactionFrequency >= 2) {
    return 'loyal';
  }
  
  // Churning signals
  if (hasReducedUsage) {
    return 'churning';
  }
  
  // Default to active
  return 'active';
}

/**
 * Resolve plan type
 */
export function resolvePlanType(planName?: string): PlanType {
  if (!planName) return 'unknown';
  
  const normalized = planName.toLowerCase().replace(/\s+/g, '_');
  
  // Check direct match
  if (PLAN_CLASSIFICATION[normalized]) {
    return PLAN_CLASSIFICATION[normalized];
  }
  
  // Pattern matching
  if (/enterprise/i.test(planName)) return 'enterprise';
  if (/fiber.*premium/i.test(planName) || /fiber.*(999|1499|2499|3999)/i.test(planName)) return 'fiber_premium';
  if (/fiber/i.test(planName)) return 'fiber_basic';
  if (/postpaid.*(799|999|1499)/i.test(planName)) return 'postpaid_premium';
  if (/postpaid/i.test(planName)) return 'postpaid_basic';
  if (/prepaid.*(449|599|749|999)/i.test(planName)) return 'prepaid_premium';
  if (/prepaid.*(249|299|399)/i.test(planName)) return 'prepaid_standard';
  if (/prepaid/i.test(planName)) return 'prepaid_basic';
  
  return 'unknown';
}

/**
 * Resolve relationship stage
 */
export function resolveRelationshipStage(
  segment: UserSegment,
  input: ProfileResolutionInput
): RelationshipStage {
  const { accountAge = 0, servicesUsed = [], npsScore } = input;
  
  // Segment-based overrides
  if (segment === 'churning') return 'at_risk';
  if (segment === 'dormant') return 'at_risk';
  if (segment === 'win_back') return 'returning';
  if (segment === 'new') return 'onboarding';
  
  // NPS-based adjustments
  if (npsScore !== undefined) {
    if (npsScore < 5) return 'at_risk';
    if (npsScore >= 9) return 'deepening';
  }
  
  // Tenure-based
  if (accountAge < 30) return 'onboarding';
  if (accountAge < 90) return 'growing';
  
  // Multiple services = deepening
  if (servicesUsed.length >= 3) return 'deepening';
  
  // Default to established
  return 'established';
}

/**
 * Calculate tenure info
 */
export function calculateTenure(accountAgeDays: number = 0): TenureInfo {
  const days = accountAgeDays;
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  let category: TenureInfo['category'];
  if (days < 30) category = 'new';
  else if (days < 90) category = 'recent';
  else if (days < 365) category = 'established';
  else if (days < 730) category = 'long_term';
  else category = 'veteran';
  
  return { days, months, years, category };
}

/**
 * Derive communication preferences
 */
export function deriveCommunicationPrefs(
  segment: UserSegment,
  relationshipStage: RelationshipStage,
  input: ProfileResolutionInput
): CommunicationPrefs {
  // Formality based on segment
  let formalityLevel: CommunicationPrefs['formalityLevel'] = 'balanced';
  if (segment === 'enterprise') formalityLevel = 'formal';
  else if (segment === 'new' || segment === 'churning') formalityLevel = 'balanced';
  else if (relationshipStage === 'established') formalityLevel = 'casual';
  
  // Detail level based on segment
  let detailLevel: CommunicationPrefs['detailLevel'] = 'standard';
  if (segment === 'new' || segment === 'win_back') detailLevel = 'detailed';
  else if (segment === 'loyal' || segment === 'premium') detailLevel = 'brief';
  
  return {
    preferredChannel: input.preferredChannel || 'chat',
    preferredLanguage: input.preferredLanguage || 'en',
    formalityLevel,
    detailLevel,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve complete user profile
 */
export function resolveProfile(input: ProfileResolutionInput): ResolvedProfile {
  const segment = resolveSegment(input);
  const plan = resolvePlanType(input.planName);
  const relationshipStage = resolveRelationshipStage(segment, input);
  const tenure = calculateTenure(input.accountAge);
  
  // High value check
  const isHighValue = 
    (input.monthlySpend || 0) >= HIGH_VALUE_THRESHOLD.monthlySpend ||
    tenure.days >= HIGH_VALUE_THRESHOLD.tenureDays ||
    (input.servicesUsed?.length || 0) >= HIGH_VALUE_THRESHOLD.services ||
    segment === 'premium' || segment === 'enterprise';
  
  return {
    segment,
    plan,
    relationshipStage,
    isHighValue,
    tenure,
    serviceBundle: input.servicesUsed || [],
    communicationPreferences: deriveCommunicationPrefs(segment, relationshipStage, input),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format profile for prompt injection
 */
export function formatProfileForPrompt(profile: ResolvedProfile): string {
  const lines = [
    '## user profile',
    `segment: ${profile.segment}`,
    `plan: ${profile.plan}`,
    `relationship: ${profile.relationshipStage}`,
    `tenure: ${profile.tenure.category} (${profile.tenure.months} months)`,
  ];
  
  if (profile.isHighValue) {
    lines.push('⭐ high-value customer');
  }
  
  if (profile.serviceBundle.length > 0) {
    lines.push(`services: ${profile.serviceBundle.join(', ')}`);
  }
  
  lines.push('');
  lines.push('### communication preferences');
  lines.push(`formality: ${profile.communicationPreferences.formalityLevel}`);
  lines.push(`detail: ${profile.communicationPreferences.detailLevel}`);
  
  // Segment-specific guidance
  lines.push('');
  lines.push(`**guidance**: ${getSegmentGuidance(profile.segment)}`);
  
  return lines.join('\n');
}

/**
 * Get segment-specific guidance
 */
function getSegmentGuidance(segment: UserSegment): string {
  const guidance: Record<UserSegment, string> = {
    new: 'welcome warmly, guide patiently, explain fully',
    active: 'efficient assistance, standard warmth',
    loyal: 'appreciate loyalty, efficient service, can be casual',
    premium: 'prioritize resolution, extra care, acknowledge value',
    enterprise: 'professional tone, detailed solutions, account awareness',
    churning: 'extra empathy, understand concerns, offer value',
    dormant: 're-engage warmly, understand absence, offer incentives',
    win_back: 'welcome back, acknowledge return, special treatment',
  };
  return guidance[segment];
}

/**
 * Get segment display name
 */
export function getSegmentDisplayName(segment: UserSegment): string {
  const names: Record<UserSegment, string> = {
    new: 'new customer',
    active: 'active customer',
    loyal: 'loyal customer',
    premium: 'premium customer',
    enterprise: 'enterprise account',
    churning: 'at-risk customer',
    dormant: 'inactive customer',
    win_back: 'returning customer',
  };
  return names[segment];
}

/**
 * Check if segment requires special handling
 */
export function requiresSpecialHandling(segment: UserSegment): boolean {
  const specialSegments: UserSegment[] = ['churning', 'premium', 'enterprise', 'win_back'];
  return specialSegments.includes(segment);
}
