/**
 * Plan Naming Agent Tests (Phase 4.2 - Test Plan 2.2)
 * 
 * Tests for plan naming validation patterns in brandAlignmentAgent:
 * - Blocks tier naming: Bronze, Silver, Gold, Platinum
 * - Blocks "Pack" terminology (suggest "Plan")
 * - Suggests including price with plan mentions
 * - Flags unqualified "unlimited" claims
 * - Blocks old plan naming patterns
 * - Allows valid "Plan + Price" format ("Freedom ₹999 plan")
 */

import { describe, it, expect } from 'vitest';
import { brandAlignmentAgent } from '../allAgents';

// =============================================================================
// Agent Configuration Tests
// =============================================================================

describe('brandAlignmentAgent configuration', () => {
  it('should have correct id', () => {
    expect(brandAlignmentAgent.id).toBe('brand_alignment');
  });

  it('should have patterns array with plan_naming category', () => {
    const planNamingPatterns = brandAlignmentAgent.patterns.filter(
      p => p.category === 'plan_naming'
    );
    expect(planNamingPatterns.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Tier-Based Naming Detection (ba-019)
// =============================================================================

describe('tier-based naming detection', () => {
  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];

  tiers.forEach(tier => {
    it(`should block "${tier} plan" naming`, () => {
      const violations = brandAlignmentAgent.runPatternValidation(
        `Upgrade to our ${tier} Plan for better benefits.`
      );

      const tierViolation = violations.find(v => 
        v.rule.includes('Plan + Price') && v.category === 'plan_naming'
      );
      expect(tierViolation).toBeDefined();
      expect(tierViolation?.severity).toBe('error');
    });
  });

  it('should block "Gold package"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'The Gold Package includes all features.'
    );

    const tierViolation = violations.find(v => 
      v.rule.includes('Plan + Price') && v.category === 'plan_naming'
    );
    expect(tierViolation).toBeDefined();
  });

  it('should block "Silver tier"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'You are currently on the Silver tier.'
    );

    const tierViolation = violations.find(v => 
      v.rule.includes('Plan + Price') && v.category === 'plan_naming'
    );
    expect(tierViolation).toBeDefined();
  });

  it('should not flag tier words in other contexts', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Jio Cinema has a golden collection of movies.'
    );

    const tierViolation = violations.find(v => 
      v.rule.includes('Plan + Price') && v.category === 'plan_naming'
    );
    expect(tierViolation).toBeUndefined();
  });
});

// =============================================================================
// Pack vs Plan Terminology (ba-020, ba-021)
// =============================================================================

describe('Pack terminology detection', () => {
  it('should block "data pack"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Recharge with our data pack today.'
    );

    const packViolation = violations.find(v => 
      v.rule.includes('Plan') && v.rule.includes('Pack')
    );
    expect(packViolation).toBeDefined();
    expect(packViolation?.suggestion).toContain('Plan');
  });

  it('should block "recharge pack"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Choose your recharge pack here.'
    );

    const packViolation = violations.find(v => 
      v.rule.includes('Plan') && v.rule.includes('Pack')
    );
    expect(packViolation).toBeDefined();
  });

  it('should block "combo pack"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Our combo pack offers data and calls.'
    );

    const packViolation = violations.find(v => 
      v.rule.includes('Plan') && v.rule.includes('Pack')
    );
    expect(packViolation).toBeDefined();
  });

  it('should block "value pack"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Get more with our value pack.'
    );

    const packViolation = violations.find(v => 
      v.rule.includes('Plan') && v.rule.includes('Pack')
    );
    expect(packViolation).toBeDefined();
  });

  it('should block generic "pack" in product context', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'This pack is valid for 28 days.'
    );

    const packViolation = violations.find(v => 
      v.rule.includes('Plan') && v.category === 'plan_naming'
    );
    expect(packViolation).toBeDefined();
  });

  it('should allow "pack of" (not product pack)', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Get a pack of snacks with this order.'
    );

    const packViolation = violations.find(v => 
      v.rule.includes('Plan') && v.rule.includes('Pack') && v.category === 'plan_naming'
    );
    expect(packViolation).toBeUndefined();
  });

  it('should allow "package" in non-product context', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Your package will be delivered tomorrow.'
    );

    const packViolation = violations.find(v => 
      v.rule.includes('Plan') && v.rule.includes('Pack') && v.category === 'plan_naming'
    );
    expect(packViolation).toBeUndefined();
  });
});

// =============================================================================
// Plan + Price Format Suggestion (ba-022)
// =============================================================================

describe('price context for plans', () => {
  it('should suggest price when mentioning "this plan" without price', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'This plan offers great value for data users.'
    );

    const priceViolation = violations.find(v => 
      v.rule.includes('price') && v.category === 'plan_naming'
    );
    expect(priceViolation).toBeDefined();
    expect(priceViolation?.severity).toBe('info'); // info level
  });

  it('should suggest price when mentioning "our plan" without price', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Our plan comes with unlimited calls.'
    );

    const priceViolation = violations.find(v => 
      v.rule.includes('price') && v.category === 'plan_naming'
    );
    expect(priceViolation).toBeDefined();
  });

  it('should not flag when price is included', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'This plan at ₹299 offers great value.'
    );

    const priceViolation = violations.find(v => 
      v.rule.includes('price') && v.rule.includes('mentioning plans')
    );
    expect(priceViolation).toBeUndefined();
  });

  it('should accept valid "₹XXX Plan" format', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'The ₹599 Plan includes 2GB daily data and unlimited calls*.'
    );

    // Should have no plan naming issues (tier, pack, price context)
    // Note: "unlimited calls" without asterisk triggers ba-023, so we add asterisk
    const planNamingViolations = violations.filter(v => v.category === 'plan_naming');
    // Info-level violations are okay
    const errorOrWarning = planNamingViolations.filter(
      v => v.severity === 'error' || v.severity === 'warning'
    );
    expect(errorOrWarning.length).toBe(0);
  });
});

// =============================================================================
// Unlimited Claims Qualification (ba-023)
// =============================================================================

describe('unlimited claims detection', () => {
  it('should flag unqualified "unlimited data"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Get unlimited data with this plan.'
    );

    const unlimitedViolation = violations.find(v => 
      v.rule.includes('unlimited') && v.category === 'plan_naming'
    );
    expect(unlimitedViolation).toBeDefined();
    expect(unlimitedViolation?.suggestion).toContain('T&C');
  });

  it('should flag unqualified "unlimited calls"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Enjoy unlimited calls to all networks.'
    );

    const unlimitedViolation = violations.find(v => 
      v.rule.includes('unlimited') && v.category === 'plan_naming'
    );
    expect(unlimitedViolation).toBeDefined();
  });

  it('should flag unqualified "unlimited sms"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Send unlimited SMS to anyone.'
    );

    const unlimitedViolation = violations.find(v => 
      v.rule.includes('unlimited') && v.category === 'plan_naming'
    );
    expect(unlimitedViolation).toBeDefined();
  });

  it('should not flag qualified unlimited with asterisk', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Get unlimited data* with this plan.'
    );

    const unlimitedViolation = violations.find(v => 
      v.rule.includes('Qualify unlimited') && v.category === 'plan_naming'
    );
    expect(unlimitedViolation).toBeUndefined();
  });
});

// =============================================================================
// Old Plan Naming Patterns (ba-024)
// =============================================================================

describe('old plan naming detection', () => {
  it('should flag "Jio Prime"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Subscribe to Jio Prime for exclusive benefits.'
    );

    const oldNameViolation = violations.find(v => 
      v.rule.includes('current plan naming') && v.category === 'plan_naming'
    );
    expect(oldNameViolation).toBeDefined();
  });

  it('should flag "Jio Plus"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Upgrade to Jio Plus now.'
    );

    const oldNameViolation = violations.find(v => 
      v.rule.includes('current plan naming') && v.category === 'plan_naming'
    );
    expect(oldNameViolation).toBeDefined();
  });

  it('should flag "Jio Pro"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Jio Pro members get priority support.'
    );

    const oldNameViolation = violations.find(v => 
      v.rule.includes('current plan naming') && v.category === 'plan_naming'
    );
    expect(oldNameViolation).toBeDefined();
  });

  it('should not flag "JioCinema" (product name, not plan)', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Watch on JioCinema for free with your plan.'
    );

    const oldNameViolation = violations.find(v => 
      v.rule.includes('current plan naming') && v.category === 'plan_naming'
    );
    expect(oldNameViolation).toBeUndefined();
  });

  it('should not flag "JioFiber" (product name)', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Get JioFiber for high-speed internet.'
    );

    const oldNameViolation = violations.find(v => 
      v.rule.includes('current plan naming') && v.category === 'plan_naming'
    );
    expect(oldNameViolation).toBeUndefined();
  });
});

// =============================================================================
// Valid Plan Naming (Should Pass)
// =============================================================================

describe('valid plan naming', () => {
  it('should accept "₹299 Plan"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Choose the ₹299 Plan for great value.'
    );

    const planNamingErrors = violations.filter(
      v => v.category === 'plan_naming' && v.severity === 'error'
    );
    expect(planNamingErrors.length).toBe(0);
  });

  it('should accept "Freedom ₹999 Plan"', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'The Freedom ₹999 Plan includes streaming benefits.'
    );

    const planNamingErrors = violations.filter(
      v => v.category === 'plan_naming' && v.severity === 'error'
    );
    expect(planNamingErrors.length).toBe(0);
  });

  it('should accept plan with price mentioned', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Our ₹199 Plan offers 1.5GB daily data.'
    );

    const planNamingErrors = violations.filter(
      v => v.category === 'plan_naming' && v.severity === 'error'
    );
    expect(planNamingErrors.length).toBe(0);
  });

  it('should accept qualified unlimited', () => {
    const violations = brandAlignmentAgent.runPatternValidation(
      'Get unlimited data* with the ₹599 Plan. *FUP applies.'
    );

    // Should have no unlimited claims violation
    const unlimitedViolation = violations.find(v => 
      v.rule.includes('Qualify unlimited') && v.category === 'plan_naming'
    );
    expect(unlimitedViolation).toBeUndefined();
  });
});

// =============================================================================
// Pattern Coverage
// =============================================================================

describe('plan naming pattern coverage', () => {
  it('should have patterns for all plan naming scenarios', () => {
    const planNamingPatterns = brandAlignmentAgent.patterns.filter(
      p => p.category === 'plan_naming'
    );

    // Should have at least 5 patterns (ba-019 to ba-024)
    expect(planNamingPatterns.length).toBeGreaterThanOrEqual(5);
  });

  it('should have IDs starting with ba-', () => {
    const planNamingPatterns = brandAlignmentAgent.patterns.filter(
      p => p.category === 'plan_naming'
    );

    for (const pattern of planNamingPatterns) {
      expect(pattern.id).toMatch(/^ba-\d{3}$/);
    }
  });

  it('should have suggestions for all plan naming patterns', () => {
    const planNamingPatterns = brandAlignmentAgent.patterns.filter(
      p => p.category === 'plan_naming'
    );

    for (const pattern of planNamingPatterns) {
      expect(pattern.suggestion).toBeDefined();
      expect(pattern.suggestion.length).toBeGreaterThan(0);
    }
  });
});
