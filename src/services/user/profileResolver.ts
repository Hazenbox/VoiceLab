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

/**
 * Convex user data for profile resolution
 * Matches the Convex users table schema
 */
export interface ConvexUserData {
  _id?: string;
  deviceId: string;
  name: string;
  role: string; // marketing | product | ux_writer | sales | support | leadership
  product: string; // ecosystem they primarily work on
  createdAt: number;
  lastSeenAt: number;
}

/**
 * Convex user learning profile data
 */
export interface ConvexLearningProfile {
  preferredWarmth?: number;
  preferredDetail?: number;
  preferredLanguage?: string;
  avoidPatterns?: string[];
  correctionFrequency?: number;
  totalInteractions?: number;
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

// ═══════════════════════════════════════════════════════════════════════════════
// CONVEX INTEGRATION (Phase 1.4)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Role to segment mapping
 * Maps onboarding roles to appropriate user segments for tone/style
 */
const ROLE_SEGMENT_MAPPING: Record<string, UserSegment> = {
  'marketing': 'active',
  'product': 'active',
  'ux_writer': 'premium', // Content experts get premium treatment
  'sales': 'active',
  'support': 'active',
  'leadership': 'enterprise', // Leadership gets enterprise-level detail
};

/**
 * Role to services mapping
 * Maps roles to typical services they work with
 */
const ROLE_SERVICES_MAPPING: Record<string, string[]> = {
  'marketing': ['jio_marketing', 'analytics', 'campaigns'],
  'product': ['jio_product', 'analytics', 'user_research'],
  'ux_writer': ['jio_content', 'voice_designer', 'copy_editing'],
  'sales': ['jio_sales', 'crm', 'reporting'],
  'support': ['jio_support', 'ticketing', 'knowledge_base'],
  'leadership': ['jio_enterprise', 'dashboards', 'reporting', 'strategy'],
};

/**
 * Product (ecosystem) to plan mapping
 * Maps primary product to typical plan type
 */
const PRODUCT_PLAN_MAPPING: Record<string, PlanType> = {
  'connectivity': 'prepaid_standard',
  'home': 'fiber_basic',
  'entertainment': 'prepaid_standard',
  'shopping': 'prepaid_basic',
  'finance': 'postpaid_basic',
  'health': 'prepaid_standard',
  'business': 'enterprise',
  'work': 'enterprise',
  'government': 'enterprise',
  'education': 'prepaid_basic',
  'sports': 'prepaid_standard',
  'agriculture': 'prepaid_basic',
  'energy': 'prepaid_standard',
  'transport': 'prepaid_standard',
  'support': 'prepaid_standard',
};

/**
 * Convert Convex user data to ProfileResolutionInput
 * This bridges the gap between Convex user profiles and the profile resolver
 */
export function convexUserToInput(
  convexUser: ConvexUserData,
  learningProfile?: ConvexLearningProfile | null,
): ProfileResolutionInput {
  // Calculate account age from createdAt
  const now = Date.now();
  const accountAgeDays = Math.floor((now - convexUser.createdAt) / (1000 * 60 * 60 * 24));
  
  // Map role to services
  const servicesUsed = ROLE_SERVICES_MAPPING[convexUser.role] || [];
  
  // Map product to plan
  const planName = PRODUCT_PLAN_MAPPING[convexUser.product] 
    ? `jio_${convexUser.product}_standard` 
    : 'unknown';
  
  // Calculate interaction frequency from learning profile if available
  let interactionFrequency = 2; // Default to moderate
  if (learningProfile?.totalInteractions && accountAgeDays > 0) {
    const interactionsPerMonth = (learningProfile.totalInteractions / accountAgeDays) * 30;
    interactionFrequency = Math.min(interactionsPerMonth, 100); // Cap at 100
  }
  
  // Check for reduced usage - if last seen is > 14 days ago relative to account age
  const daysSinceLastSeen = Math.floor((now - convexUser.lastSeenAt) / (1000 * 60 * 60 * 24));
  const hasReducedUsage = accountAgeDays > 30 && daysSinceLastSeen > 14;
  
  // Derive monthly spend from role (internal users don't pay, but we model engagement value)
  let monthlySpend = 0;
  if (convexUser.role === 'leadership') monthlySpend = 2000;
  else if (convexUser.role === 'ux_writer' || convexUser.role === 'product') monthlySpend = 1000;
  else monthlySpend = 500;
  
  // Derive NPS from correction frequency if available
  let npsScore: number | undefined;
  if (learningProfile?.correctionFrequency !== undefined) {
    // Lower correction frequency = higher satisfaction
    // Assuming correctionFrequency is corrections per 100 interactions
    if (learningProfile.correctionFrequency < 5) npsScore = 9;
    else if (learningProfile.correctionFrequency < 15) npsScore = 7;
    else if (learningProfile.correctionFrequency < 30) npsScore = 5;
    else npsScore = 3;
  }
  
  return {
    accountAge: accountAgeDays,
    planName,
    monthlySpend,
    servicesUsed,
    lastActivityDate: convexUser.lastSeenAt,
    interactionFrequency,
    hasReducedUsage,
    npsScore,
    preferredChannel: 'chat',
    preferredLanguage: learningProfile?.preferredLanguage || 'en',
  };
}

/**
 * Resolve profile directly from Convex user data
 * Convenience function combining convexUserToInput + resolveProfile
 */
export function resolveProfileFromConvex(
  convexUser: ConvexUserData,
  learningProfile?: ConvexLearningProfile | null,
): ResolvedProfile {
  const input = convexUserToInput(convexUser, learningProfile);
  const profile = resolveProfile(input);
  
  // Override segment based on role if appropriate
  const roleSegment = ROLE_SEGMENT_MAPPING[convexUser.role];
  if (roleSegment && (profile.segment === 'active' || profile.segment === 'new')) {
    // Only override default segments, not churning/dormant detection
    profile.segment = roleSegment;
  }
  
  // Apply learning profile preferences
  if (learningProfile) {
    if (learningProfile.preferredWarmth !== undefined) {
      // Map 1-4 scale to formality
      if (learningProfile.preferredWarmth >= 3) {
        profile.communicationPreferences.formalityLevel = 'casual';
      } else if (learningProfile.preferredWarmth <= 1.5) {
        profile.communicationPreferences.formalityLevel = 'formal';
      }
    }
    if (learningProfile.preferredDetail !== undefined) {
      // Map 1-3 scale to detail level
      if (learningProfile.preferredDetail >= 2.5) {
        profile.communicationPreferences.detailLevel = 'detailed';
      } else if (learningProfile.preferredDetail <= 1.5) {
        profile.communicationPreferences.detailLevel = 'brief';
      }
    }
    if (learningProfile.preferredLanguage) {
      profile.communicationPreferences.preferredLanguage = learningProfile.preferredLanguage;
    }
  }
  
  return profile;
}

/**
 * Create a minimal default profile from onboarding data
 * Used when full Convex user data isn't available yet
 */
export function resolveProfileFromOnboarding(
  role: string,
  product: string,
  accountCreatedAt?: number,
): ResolvedProfile {
  const syntheticUser: ConvexUserData = {
    deviceId: 'local',
    name: 'User',
    role,
    product,
    createdAt: accountCreatedAt || Date.now(),
    lastSeenAt: Date.now(),
  };
  return resolveProfileFromConvex(syntheticUser);
}
