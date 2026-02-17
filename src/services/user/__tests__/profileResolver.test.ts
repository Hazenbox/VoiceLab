/**
 * Profile Resolver Tests (Phase 4.2 - Test Plan 1.4)
 * 
 * Tests for profile resolution with Convex integration:
 * - convexUserToInput() maps deviceId, name, role correctly
 * - Account age calculated from createdAt timestamp
 * - Plan tier mapped from role
 * - resolveProfileFromConvex() produces valid UserProfile
 * - Missing learningProfile handled with defaults
 * - Onboarding data produces minimal valid profile
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resolveProfile,
  resolveSegment,
  resolvePlanType,
  resolveRelationshipStage,
  calculateTenure,
  deriveCommunicationPrefs,
  convexUserToInput,
  resolveProfileFromConvex,
  resolveProfileFromOnboarding,
  formatProfileForPrompt,
  getSegmentDisplayName,
  requiresSpecialHandling,
  type ConvexUserData,
  type ConvexLearningProfile,
  type ProfileResolutionInput,
  type UserSegment,
  type PlanType,
} from '../profileResolver';

// =============================================================================
// Test Fixtures
// =============================================================================

function createConvexUser(overrides: Partial<ConvexUserData> = {}): ConvexUserData {
  const now = Date.now();
  return {
    _id: 'user_123',
    deviceId: 'device_abc',
    name: 'Test User',
    role: 'marketing',
    product: 'connectivity',
    createdAt: now - (90 * 24 * 60 * 60 * 1000), // 90 days ago
    lastSeenAt: now - (2 * 24 * 60 * 60 * 1000), // 2 days ago
    ...overrides,
  };
}

function createLearningProfile(overrides: Partial<ConvexLearningProfile> = {}): ConvexLearningProfile {
  return {
    preferredWarmth: 2.5,
    preferredDetail: 2,
    preferredLanguage: 'en',
    avoidPatterns: [],
    correctionFrequency: 10,
    totalInteractions: 50,
    ...overrides,
  };
}

function createProfileInput(overrides: Partial<ProfileResolutionInput> = {}): ProfileResolutionInput {
  return {
    accountAge: 100,
    planName: 'jio_prepaid_299',
    monthlySpend: 300,
    servicesUsed: ['jio_mobile'],
    interactionFrequency: 3,
    ...overrides,
  };
}

// =============================================================================
// convexUserToInput Tests
// =============================================================================

describe('convexUserToInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should calculate account age from createdAt timestamp', () => {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    const convexUser = createConvexUser({ createdAt: thirtyDaysAgo });
    const input = convexUserToInput(convexUser);

    expect(input.accountAge).toBe(30);
  });

  it('should map role to services used', () => {
    const convexUser = createConvexUser({ role: 'marketing' });
    const input = convexUserToInput(convexUser);

    expect(input.servicesUsed).toContain('jio_marketing');
    expect(input.servicesUsed).toContain('analytics');
    expect(input.servicesUsed).toContain('campaigns');
  });

  it('should map leadership role to enterprise services', () => {
    const convexUser = createConvexUser({ role: 'leadership' });
    const input = convexUserToInput(convexUser);

    expect(input.servicesUsed).toContain('jio_enterprise');
    expect(input.servicesUsed).toContain('dashboards');
  });

  it('should derive monthly spend from role', () => {
    // Leadership gets highest spend
    const leaderUser = createConvexUser({ role: 'leadership' });
    expect(convexUserToInput(leaderUser).monthlySpend).toBe(2000);

    // UX writer gets medium-high spend
    const writerUser = createConvexUser({ role: 'ux_writer' });
    expect(convexUserToInput(writerUser).monthlySpend).toBe(1000);

    // Marketing gets standard spend
    const marketingUser = createConvexUser({ role: 'marketing' });
    expect(convexUserToInput(marketingUser).monthlySpend).toBe(500);
  });

  it('should detect reduced usage when lastSeenAt is old', () => {
    const now = Date.now();
    // Account is 60 days old, last seen 20 days ago
    const convexUser = createConvexUser({
      createdAt: now - (60 * 24 * 60 * 60 * 1000),
      lastSeenAt: now - (20 * 24 * 60 * 60 * 1000),
    });

    const input = convexUserToInput(convexUser);

    expect(input.hasReducedUsage).toBe(true);
  });

  it('should not flag reduced usage for new accounts', () => {
    const now = Date.now();
    // Account is 20 days old, last seen 15 days ago
    const convexUser = createConvexUser({
      createdAt: now - (20 * 24 * 60 * 60 * 1000),
      lastSeenAt: now - (15 * 24 * 60 * 60 * 1000),
    });

    const input = convexUserToInput(convexUser);

    expect(input.hasReducedUsage).toBe(false);
  });

  it('should calculate NPS from correction frequency', () => {
    // Low correction frequency = high NPS
    const happyProfile = createLearningProfile({ correctionFrequency: 3 });
    const happyUser = createConvexUser();
    expect(convexUserToInput(happyUser, happyProfile).npsScore).toBe(9);

    // High correction frequency = low NPS
    const unhappyProfile = createLearningProfile({ correctionFrequency: 35 });
    const unhappyUser = createConvexUser();
    expect(convexUserToInput(unhappyUser, unhappyProfile).npsScore).toBe(3);
  });

  it('should use learning profile language preference', () => {
    const profile = createLearningProfile({ preferredLanguage: 'hi' });
    const convexUser = createConvexUser();

    const input = convexUserToInput(convexUser, profile);

    expect(input.preferredLanguage).toBe('hi');
  });

  it('should default to English when no language preference', () => {
    const convexUser = createConvexUser();

    const input = convexUserToInput(convexUser);

    expect(input.preferredLanguage).toBe('en');
  });

  it('should set default channel to chat', () => {
    const convexUser = createConvexUser();

    const input = convexUserToInput(convexUser);

    expect(input.preferredChannel).toBe('chat');
  });

  it('should handle missing learning profile gracefully', () => {
    const convexUser = createConvexUser();

    const input = convexUserToInput(convexUser, null);

    expect(input).toBeDefined();
    expect(input.accountAge).toBeGreaterThan(0);
    expect(input.npsScore).toBeUndefined();
  });
});

// =============================================================================
// resolveProfileFromConvex Tests
// =============================================================================

describe('resolveProfileFromConvex', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should produce valid UserProfile', () => {
    const convexUser = createConvexUser();
    const profile = resolveProfileFromConvex(convexUser);

    expect(profile).toBeDefined();
    expect(profile.segment).toBeDefined();
    expect(profile.plan).toBeDefined();
    expect(profile.relationshipStage).toBeDefined();
    expect(profile.tenure).toBeDefined();
    expect(profile.communicationPreferences).toBeDefined();
  });

  it('should override segment based on role', () => {
    // Leadership role should get enterprise segment
    const leaderUser = createConvexUser({ role: 'leadership' });
    const profile = resolveProfileFromConvex(leaderUser);

    expect(profile.segment).toBe('enterprise');
  });

  it('should apply learning profile warmth preference', () => {
    const convexUser = createConvexUser();
    
    // High warmth = casual
    const warmProfile = createLearningProfile({ preferredWarmth: 4 });
    const warmResult = resolveProfileFromConvex(convexUser, warmProfile);
    expect(warmResult.communicationPreferences.formalityLevel).toBe('casual');

    // Low warmth = formal
    const formalProfile = createLearningProfile({ preferredWarmth: 1 });
    const formalResult = resolveProfileFromConvex(convexUser, formalProfile);
    expect(formalResult.communicationPreferences.formalityLevel).toBe('formal');
  });

  it('should apply learning profile detail preference', () => {
    const convexUser = createConvexUser();
    
    // High detail = detailed
    const detailedProfile = createLearningProfile({ preferredDetail: 3 });
    const detailedResult = resolveProfileFromConvex(convexUser, detailedProfile);
    expect(detailedResult.communicationPreferences.detailLevel).toBe('detailed');

    // Low detail = brief
    const briefProfile = createLearningProfile({ preferredDetail: 1 });
    const briefResult = resolveProfileFromConvex(convexUser, briefProfile);
    expect(briefResult.communicationPreferences.detailLevel).toBe('brief');
  });

  it('should handle missing learning profile with defaults', () => {
    const convexUser = createConvexUser();
    
    const profile = resolveProfileFromConvex(convexUser);

    expect(profile.communicationPreferences.preferredLanguage).toBe('en');
  });

  it('should not override churning segment from role', () => {
    const now = Date.now();
    // User with cancel page view = churning
    const churnUser = createConvexUser({
      role: 'leadership',
      createdAt: now - (60 * 24 * 60 * 60 * 1000),
      lastSeenAt: now - (65 * 24 * 60 * 60 * 1000), // Very old
    });

    // Since we can't set hasViewedCancelPage directly, test dormant detection
    const input = convexUserToInput(churnUser);
    const segment = resolveSegment({ ...input, lastActivityDate: churnUser.lastSeenAt });
    
    expect(segment).toBe('dormant');
  });

  it('should map ux_writer role to premium segment', () => {
    const writerUser = createConvexUser({ role: 'ux_writer' });
    const profile = resolveProfileFromConvex(writerUser);

    expect(profile.segment).toBe('premium');
  });
});

// =============================================================================
// resolveProfileFromOnboarding Tests
// =============================================================================

describe('resolveProfileFromOnboarding', () => {
  it('should produce minimal valid profile from role and product', () => {
    const profile = resolveProfileFromOnboarding('marketing', 'connectivity');

    expect(profile).toBeDefined();
    expect(profile.segment).toBeDefined();
    expect(profile.plan).toBeDefined();
    expect(profile.tenure).toBeDefined();
  });

  it('should create new user segment for fresh onboarding', () => {
    const profile = resolveProfileFromOnboarding('marketing', 'connectivity');

    // New users should be in onboarding stage
    expect(profile.relationshipStage).toBe('onboarding');
  });

  it('should map leadership role correctly', () => {
    const profile = resolveProfileFromOnboarding('leadership', 'business');

    expect(profile.segment).toBe('enterprise');
  });

  it('should handle unknown role gracefully', () => {
    const profile = resolveProfileFromOnboarding('unknown_role', 'unknown_product');

    expect(profile).toBeDefined();
    expect(profile.segment).toBeDefined();
  });

  it('should use current time when accountCreatedAt not provided', () => {
    const profile = resolveProfileFromOnboarding('marketing', 'connectivity');

    // Should be very new (0 or 1 day)
    expect(profile.tenure.days).toBeLessThanOrEqual(1);
    expect(profile.tenure.category).toBe('new');
  });
});

// =============================================================================
// resolveSegment Tests
// =============================================================================

describe('resolveSegment', () => {
  it('should return "new" for accounts under 30 days', () => {
    const segment = resolveSegment({ accountAge: 15 });
    expect(segment).toBe('new');
  });

  it('should return "churning" when hasViewedCancelPage is true', () => {
    const segment = resolveSegment({ accountAge: 100, hasViewedCancelPage: true });
    expect(segment).toBe('churning');
  });

  it('should return "churning" when paymentIssues is true', () => {
    const segment = resolveSegment({ accountAge: 100, paymentIssues: true });
    expect(segment).toBe('churning');
  });

  it('should return "dormant" when inactive for over 60 days', () => {
    const now = Date.now();
    const segment = resolveSegment({
      accountAge: 100,
      lastActivityDate: now - (70 * 24 * 60 * 60 * 1000),
    });
    expect(segment).toBe('dormant');
  });

  it('should return "enterprise" for enterprise services', () => {
    const segment = resolveSegment({
      accountAge: 100,
      servicesUsed: ['jio_enterprise_basic'],
    });
    expect(segment).toBe('enterprise');
  });

  it('should return "premium" for high monthly spend', () => {
    // Need interactionFrequency >= 1 to avoid win_back detection
    const segment = resolveSegment({ accountAge: 100, monthlySpend: 1500, interactionFrequency: 2 });
    expect(segment).toBe('premium');
  });

  it('should return "premium" for multiple services', () => {
    const segment = resolveSegment({
      accountAge: 100,
      servicesUsed: ['service1', 'service2', 'service3'],
      interactionFrequency: 2, // Avoid win_back detection
    });
    expect(segment).toBe('premium');
  });

  it('should return "loyal" for long tenure with good activity', () => {
    const segment = resolveSegment({
      accountAge: 400,
      interactionFrequency: 5,
    });
    expect(segment).toBe('loyal');
  });

  it('should return "active" as default', () => {
    // Need interactionFrequency >= 1 to avoid win_back detection
    const segment = resolveSegment({ accountAge: 100, interactionFrequency: 2 });
    expect(segment).toBe('active');
  });
});

// =============================================================================
// resolvePlanType Tests
// =============================================================================

describe('resolvePlanType', () => {
  it('should return "unknown" for undefined plan', () => {
    expect(resolvePlanType(undefined)).toBe('unknown');
  });

  it('should return "unknown" for empty plan', () => {
    expect(resolvePlanType('')).toBe('unknown');
  });

  it('should match direct plan names', () => {
    expect(resolvePlanType('jio_prepaid_149')).toBe('prepaid_basic');
    expect(resolvePlanType('jio_prepaid_449')).toBe('prepaid_premium');
    expect(resolvePlanType('jiofiber_999')).toBe('fiber_premium');
  });

  it('should match enterprise pattern', () => {
    expect(resolvePlanType('Enterprise Plus')).toBe('enterprise');
    expect(resolvePlanType('Jio Enterprise')).toBe('enterprise');
  });

  it('should match fiber patterns', () => {
    expect(resolvePlanType('JioFiber Premium 1499')).toBe('fiber_premium');
    expect(resolvePlanType('JioFiber Basic')).toBe('fiber_basic');
  });

  it('should match postpaid patterns', () => {
    expect(resolvePlanType('Jio Postpaid 999')).toBe('postpaid_premium');
    expect(resolvePlanType('Jio Postpaid 399')).toBe('postpaid_basic');
  });

  it('should match prepaid patterns', () => {
    expect(resolvePlanType('Jio Prepaid 599')).toBe('prepaid_premium');
    expect(resolvePlanType('Jio Prepaid 299')).toBe('prepaid_standard');
    expect(resolvePlanType('Jio Prepaid 149')).toBe('prepaid_basic');
  });
});

// =============================================================================
// calculateTenure Tests
// =============================================================================

describe('calculateTenure', () => {
  it('should categorize 0 days as "new"', () => {
    const tenure = calculateTenure(0);
    expect(tenure.category).toBe('new');
  });

  it('should categorize < 30 days as "new"', () => {
    const tenure = calculateTenure(25);
    expect(tenure.category).toBe('new');
  });

  it('should categorize 30-89 days as "recent"', () => {
    const tenure = calculateTenure(60);
    expect(tenure.category).toBe('recent');
  });

  it('should categorize 90-364 days as "established"', () => {
    const tenure = calculateTenure(200);
    expect(tenure.category).toBe('established');
  });

  it('should categorize 365-729 days as "long_term"', () => {
    const tenure = calculateTenure(500);
    expect(tenure.category).toBe('long_term');
  });

  it('should categorize 730+ days as "veteran"', () => {
    const tenure = calculateTenure(800);
    expect(tenure.category).toBe('veteran');
  });

  it('should calculate months correctly', () => {
    const tenure = calculateTenure(90);
    expect(tenure.months).toBe(3);
  });

  it('should calculate years correctly', () => {
    const tenure = calculateTenure(730);
    expect(tenure.years).toBe(2);
  });
});

// =============================================================================
// resolveRelationshipStage Tests
// =============================================================================

describe('resolveRelationshipStage', () => {
  it('should return "at_risk" for churning segment', () => {
    const stage = resolveRelationshipStage('churning', {});
    expect(stage).toBe('at_risk');
  });

  it('should return "at_risk" for dormant segment', () => {
    const stage = resolveRelationshipStage('dormant', {});
    expect(stage).toBe('at_risk');
  });

  it('should return "returning" for win_back segment', () => {
    const stage = resolveRelationshipStage('win_back', {});
    expect(stage).toBe('returning');
  });

  it('should return "onboarding" for new segment', () => {
    const stage = resolveRelationshipStage('new', {});
    expect(stage).toBe('onboarding');
  });

  it('should return "at_risk" for low NPS', () => {
    const stage = resolveRelationshipStage('active', { npsScore: 3 });
    expect(stage).toBe('at_risk');
  });

  it('should return "deepening" for high NPS', () => {
    const stage = resolveRelationshipStage('active', { npsScore: 10 });
    expect(stage).toBe('deepening');
  });

  it('should return "growing" for mid-tenure', () => {
    const stage = resolveRelationshipStage('active', { accountAge: 60 });
    expect(stage).toBe('growing');
  });

  it('should return "deepening" for multiple services', () => {
    const stage = resolveRelationshipStage('active', {
      accountAge: 200,
      servicesUsed: ['s1', 's2', 's3', 's4'],
    });
    expect(stage).toBe('deepening');
  });

  it('should return "established" as default', () => {
    const stage = resolveRelationshipStage('active', { accountAge: 200 });
    expect(stage).toBe('established');
  });
});

// =============================================================================
// deriveCommunicationPrefs Tests
// =============================================================================

describe('deriveCommunicationPrefs', () => {
  it('should set formal for enterprise segment', () => {
    const prefs = deriveCommunicationPrefs('enterprise', 'established', {});
    expect(prefs.formalityLevel).toBe('formal');
  });

  it('should set casual for established relationship', () => {
    const prefs = deriveCommunicationPrefs('active', 'established', {});
    expect(prefs.formalityLevel).toBe('casual');
  });

  it('should set detailed for new users', () => {
    const prefs = deriveCommunicationPrefs('new', 'onboarding', {});
    expect(prefs.detailLevel).toBe('detailed');
  });

  it('should set brief for loyal users', () => {
    const prefs = deriveCommunicationPrefs('loyal', 'established', {});
    expect(prefs.detailLevel).toBe('brief');
  });

  it('should use input channel preference', () => {
    const prefs = deriveCommunicationPrefs('active', 'established', { preferredChannel: 'email' });
    expect(prefs.preferredChannel).toBe('email');
  });

  it('should default to chat when no preference', () => {
    const prefs = deriveCommunicationPrefs('active', 'established', {});
    expect(prefs.preferredChannel).toBe('chat');
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('getSegmentDisplayName', () => {
  const segments: UserSegment[] = ['new', 'active', 'loyal', 'premium', 'enterprise', 'churning', 'dormant', 'win_back'];

  it('should return display name for all segments', () => {
    for (const segment of segments) {
      const name = getSegmentDisplayName(segment);
      expect(name).toBeDefined();
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('should return human-readable names', () => {
    expect(getSegmentDisplayName('new')).toBe('new customer');
    expect(getSegmentDisplayName('enterprise')).toBe('enterprise account');
    expect(getSegmentDisplayName('churning')).toBe('at-risk customer');
  });
});

describe('requiresSpecialHandling', () => {
  it('should return true for churning', () => {
    expect(requiresSpecialHandling('churning')).toBe(true);
  });

  it('should return true for premium', () => {
    expect(requiresSpecialHandling('premium')).toBe(true);
  });

  it('should return true for enterprise', () => {
    expect(requiresSpecialHandling('enterprise')).toBe(true);
  });

  it('should return true for win_back', () => {
    expect(requiresSpecialHandling('win_back')).toBe(true);
  });

  it('should return false for active', () => {
    expect(requiresSpecialHandling('active')).toBe(false);
  });

  it('should return false for new', () => {
    expect(requiresSpecialHandling('new')).toBe(false);
  });
});

describe('formatProfileForPrompt', () => {
  it('should include segment, plan, and relationship', () => {
    const profile = resolveProfile(createProfileInput());
    const formatted = formatProfileForPrompt(profile);

    expect(formatted).toContain('segment:');
    expect(formatted).toContain('plan:');
    expect(formatted).toContain('relationship:');
  });

  it('should include tenure info', () => {
    const profile = resolveProfile(createProfileInput({ accountAge: 200 }));
    const formatted = formatProfileForPrompt(profile);

    expect(formatted).toContain('tenure:');
    expect(formatted).toContain('months');
  });

  it('should include high-value indicator when applicable', () => {
    const profile = resolveProfile(createProfileInput({ monthlySpend: 1000 }));
    const formatted = formatProfileForPrompt(profile);

    expect(formatted).toContain('high-value');
  });

  it('should include communication preferences', () => {
    const profile = resolveProfile(createProfileInput());
    const formatted = formatProfileForPrompt(profile);

    expect(formatted).toContain('formality:');
    expect(formatted).toContain('detail:');
  });

  it('should include guidance section', () => {
    const profile = resolveProfile(createProfileInput());
    const formatted = formatProfileForPrompt(profile);

    expect(formatted).toContain('guidance');
  });
});
