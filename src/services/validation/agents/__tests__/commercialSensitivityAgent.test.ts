/**
 * Commercial Sensitivity Agent Tests (Phase 4.2 - Test Plan 1.5)
 * 
 * Tests for commercial sensitivity detection:
 * - Detects pushy sales language ("buy now", "limited time")
 * - Detects urgency patterns ("hurry", "act fast")
 * - Detects scarcity patterns ("only X left")
 * - Does not flag legitimate product mentions
 * - Agent weight correctly set in AGENT_WEIGHTS (7)
 * - Included in DEFAULT_VALIDATION_CONFIG.enabledAgents
 */

import { describe, it, expect } from 'vitest';
import { commercialSensitivityAgent } from '../allAgents';
import { AGENT_WEIGHTS, DEFAULT_VALIDATION_CONFIG } from '../../types';

// =============================================================================
// Agent Configuration Tests
// =============================================================================

describe('commercialSensitivityAgent configuration', () => {
  it('should have correct id', () => {
    expect(commercialSensitivityAgent.id).toBe('commercial_sensitivity');
  });

  it('should have a name', () => {
    expect(commercialSensitivityAgent.name).toBe('Commercial Sensitivity');
  });

  it('should have a description', () => {
    expect(commercialSensitivityAgent.description).toContain('sales');
  });

  it('should have patterns array', () => {
    expect(Array.isArray(commercialSensitivityAgent.patterns)).toBe(true);
    expect(commercialSensitivityAgent.patterns.length).toBeGreaterThan(0);
  });

  it('should have runPatternValidation function', () => {
    expect(typeof commercialSensitivityAgent.runPatternValidation).toBe('function');
  });

  it('should have calculateScore function', () => {
    expect(typeof commercialSensitivityAgent.calculateScore).toBe('function');
  });
});

describe('AGENT_WEIGHTS', () => {
  it('should have commercial_sensitivity weight of 7', () => {
    expect(AGENT_WEIGHTS.commercial_sensitivity).toBe(7);
  });
});

describe('DEFAULT_VALIDATION_CONFIG', () => {
  it('should include commercial_sensitivity in enabledAgents', () => {
    expect(DEFAULT_VALIDATION_CONFIG.enabledAgents).toContain('commercial_sensitivity');
  });
});

// =============================================================================
// Pushy Sales Language Detection
// =============================================================================

describe('pushy sales language detection', () => {
  it('should detect "must buy" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'You must buy this plan to get the best value.'
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('pushy_sales');
  });

  it('should detect "must get" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'You must get this offer before it expires!'
    );

    expect(violations.length).toBeGreaterThan(0);
  });

  it('should detect "must upgrade" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'You must upgrade to enjoy these benefits.'
    );

    expect(violations.length).toBeGreaterThan(0);
  });

  it('should detect "grab this deal" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'Grab this deal now while stocks last!'
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('pushy_sales');
  });

  it('should detect "snag the offer" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'Snag the offer before it disappears!'
    );

    expect(violations.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Urgency Pattern Detection
// =============================================================================

describe('urgency pattern detection', () => {
  it('should detect "don\'t miss" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      "Don't miss this amazing opportunity!"
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('urgency_pressure');
  });

  it('should detect "act now" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'Act now to save 50% on your recharge!'
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('urgency_pressure');
  });

  it('should detect "hurry" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'Hurry! This offer ends soon.'
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('urgency_pressure');
  });

  it('should detect "rush" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'Rush now to get the best deals!'
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('urgency_pressure');
  });
});

// =============================================================================
// Scarcity Pattern Detection
// =============================================================================

describe('scarcity pattern detection', () => {
  it('should detect "last chance" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'This is your last chance to get this price!'
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('scarcity_pressure');
  });

  it('should detect "limited time" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'Limited time offer - recharge now!'
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('scarcity_pressure');
  });

  it('should detect "limited offer" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'This is a limited offer available only today.'
    );

    expect(violations.length).toBeGreaterThan(0);
  });

  it('should detect "only X left" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'Only 5 left in stock! Order now.'
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('scarcity_pressure');
  });

  it('should detect "only X remaining" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'Only 10 remaining at this price.'
    );

    expect(violations.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Superlative Claims Detection
// =============================================================================

describe('superlative claims detection', () => {
  it('should detect "best deal ever" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'This is the best deal ever on JioFiber!'
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('superlative');
  });
});

// =============================================================================
// Exclusionary Marketing Detection
// =============================================================================

describe('exclusionary marketing detection', () => {
  it('should detect "exclusive offer" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'Get this exclusive offer just for you!'
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('exclusionary');
    expect(violations[0].severity).toBe('info'); // Lower severity for this
  });

  it('should detect "VIP access" pattern', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'Unlock VIP access to premium features!'
    );

    expect(violations.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Inappropriate Timing Detection (Promotions During Issues)
// =============================================================================

describe('inappropriate timing detection', () => {
  it('should detect promotion during support issue (sorry + upgrade)', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      "Sorry for the issue. By the way, you might like our new upgrade!"
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('inappropriate_timing');
    expect(violations[0].severity).toBe('error');
  });

  it('should detect promotion when user is distressed', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      "I understand you're frustrated. Here's a special offer for you!"
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('inappropriate_timing');
  });

  it('should detect cross-sell during complaint', () => {
    // Pattern cm-014 matches: complaint + (meanwhile|also|by the way) + (check out|try|get)
    // The pattern needs 'complaint' followed by conjunction then action verb
    const violations = commercialSensitivityAgent.runPatternValidation(
      "I understand your complaint and meanwhile check out our new plans."
    );

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].category).toBe('inappropriate_timing');
  });
});

// =============================================================================
// Legitimate Content (Should NOT Flag)
// =============================================================================

describe('legitimate content detection', () => {
  it('should not flag simple product mention', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'Our Freedom Plan offers 2GB daily data and unlimited calls.'
    );

    expect(violations.length).toBe(0);
  });

  it('should not flag helpful suggestion without pressure', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'You might find the Premium plan useful for your data needs.'
    );

    expect(violations.length).toBe(0);
  });

  it('should not flag factual comparison', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'The ₹599 plan gives you 20% more data than the ₹499 plan.'
    );

    expect(violations.length).toBe(0);
  });

  it('should not flag genuine time-bound information', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'This plan is valid for 28 days from the date of recharge.'
    );

    expect(violations.length).toBe(0);
  });

  it('should not flag support-focused messages', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      "I'm sorry for the inconvenience. Let me help resolve this issue for you."
    );

    expect(violations.length).toBe(0);
  });

  it('should not flag informational content', () => {
    const violations = commercialSensitivityAgent.runPatternValidation(
      'You can recharge your number through the MyJio app, website, or any JioMart store.'
    );

    expect(violations.length).toBe(0);
  });
});

// =============================================================================
// Score Calculation Tests
// =============================================================================

describe('calculateScore', () => {
  it('should return 100 for no violations', () => {
    const score = commercialSensitivityAgent.calculateScore([]);
    expect(score).toBe(100);
  });

  it('should deduct points for error severity violations', () => {
    const violations = [
      {
        severity: 'error' as const,
        rule: 'test',
        text: 'test',
        suggestion: 'test',
        category: 'inappropriate_timing',
      },
    ];
    
    const score = commercialSensitivityAgent.calculateScore(violations);
    expect(score).toBeLessThan(100);
  });

  it('should deduct fewer points for warning severity', () => {
    const errorViolation = [
      { severity: 'error' as const, rule: 'test', text: 'test', suggestion: 'test', category: 'test' },
    ];
    const warningViolation = [
      { severity: 'warning' as const, rule: 'test', text: 'test', suggestion: 'test', category: 'test' },
    ];
    
    const errorScore = commercialSensitivityAgent.calculateScore(errorViolation);
    const warningScore = commercialSensitivityAgent.calculateScore(warningViolation);
    
    expect(warningScore).toBeGreaterThan(errorScore);
  });

  it('should not go below 0', () => {
    const manyViolations = Array(20).fill({
      severity: 'error' as const,
      rule: 'test',
      text: 'test',
      suggestion: 'test',
      category: 'test',
    });
    
    const score = commercialSensitivityAgent.calculateScore(manyViolations);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// Pattern Coverage Tests
// =============================================================================

describe('pattern coverage', () => {
  const expectedPatternCategories = [
    'pushy_sales',
    'urgency_pressure',
    'scarcity_pressure',
    'superlative',
    'exclusionary',
    'inappropriate_timing',
  ];

  it('should have patterns for all expected categories', () => {
    const patternCategories = new Set(
      commercialSensitivityAgent.patterns.map(p => p.category)
    );

    for (const category of expectedPatternCategories) {
      expect(patternCategories.has(category)).toBe(true);
    }
  });

  it('should have at least 10 patterns total', () => {
    expect(commercialSensitivityAgent.patterns.length).toBeGreaterThanOrEqual(10);
  });

  it('should have suggestions for all patterns', () => {
    for (const pattern of commercialSensitivityAgent.patterns) {
      expect(pattern.suggestion).toBeDefined();
      expect(pattern.suggestion.length).toBeGreaterThan(0);
    }
  });

  it('should have unique pattern IDs', () => {
    const ids = commercialSensitivityAgent.patterns.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have pattern IDs starting with cm-', () => {
    for (const pattern of commercialSensitivityAgent.patterns) {
      expect(pattern.id).toMatch(/^cm-\d{3}$/);
    }
  });
});
