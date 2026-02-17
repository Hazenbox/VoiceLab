/**
 * UX Microcopy Agent Tests (Phase 4.2 - Test Plan 2.4)
 * 
 * Tests for UX microcopy validation:
 * - CTA format: Detects weak CTAs ("click here")
 * - CTA format: Suggests action-oriented CTAs
 * - Dead-end detection: "We can't help with that"
 * - Dead-end detection: Missing next steps
 * - Error message structure: Has clear explanation
 * - Error message structure: Has recovery suggestion
 * - Empty state validation
 * - Loading state messages
 * - Success message patterns
 */

import { describe, it, expect } from 'vitest';
import { uxMicrocopyAgent } from '../allAgents';

// =============================================================================
// Agent Configuration Tests
// =============================================================================

describe('uxMicrocopyAgent configuration', () => {
  it('should have correct id', () => {
    expect(uxMicrocopyAgent.id).toBe('ux_microcopy');
  });

  it('should have patterns array', () => {
    expect(Array.isArray(uxMicrocopyAgent.patterns)).toBe(true);
    expect(uxMicrocopyAgent.patterns.length).toBeGreaterThan(0);
  });

  it('should have weight of 8', () => {
    expect(uxMicrocopyAgent.weight).toBe(8);
  });

  it('should have calculateScore function', () => {
    expect(typeof uxMicrocopyAgent.calculateScore).toBe('function');
  });
});

// =============================================================================
// CTA Format Detection
// =============================================================================

describe('CTA format validation', () => {
  describe('weak CTA detection', () => {
    it('should detect "click here" pattern', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Click here to view your balance.'
      );

      const ctaViolation = violations.find(v => v.category === 'cta_format');
      expect(ctaViolation).toBeDefined();
      expect(ctaViolation?.rule).toContain('Vague CTA');
    });

    it('should detect "tap here" pattern', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Tap here to continue.'
      );

      const ctaViolation = violations.find(v => v.category === 'cta_format');
      expect(ctaViolation).toBeDefined();
    });

    it('should detect "press the button" pattern', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Press the button to proceed.'
      );

      const ctaViolation = violations.find(v => 
        v.rule.includes('Redundant CTA') && v.category === 'cta_format'
      );
      expect(ctaViolation).toBeDefined();
    });

    it('should detect "push button" pattern', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Push button to submit your request.'
      );

      const ctaViolation = violations.find(v => 
        v.rule.includes('Redundant') && v.category === 'cta_format'
      );
      expect(ctaViolation).toBeDefined();
    });
  });

  describe('passive CTA detection', () => {
    it('should detect "you can click" pattern', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'You can click to see more options.'
      );

      const ctaViolation = violations.find(v => 
        v.rule.includes('Passive') && v.category === 'cta_format'
      );
      expect(ctaViolation).toBeDefined();
    });

    it('should detect "if you want to" pattern', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'If you want to recharge, visit our app.'
      );

      const ctaViolation = violations.find(v => 
        v.rule.includes('Conditional') && v.category === 'cta_format'
      );
      expect(ctaViolation).toBeDefined();
    });

    it('should detect "go ahead and" filler', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Go ahead and select your plan.'
      );

      const ctaViolation = violations.find(v => 
        v.rule.includes('Filler') && v.category === 'cta_format'
      );
      expect(ctaViolation).toBeDefined();
    });
  });

  describe('good CTAs (should pass)', () => {
    it('should not flag "View plans"', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'View plans to find the best offer for you.'
      );

      const ctaViolation = violations.find(v => 
        v.category === 'cta_format' && v.severity !== 'info'
      );
      expect(ctaViolation).toBeUndefined();
    });

    it('should not flag "Recharge now"', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Recharge now to enjoy uninterrupted service.'
      );

      const ctaViolation = violations.find(v => 
        v.category === 'cta_format' && v.severity !== 'info'
      );
      expect(ctaViolation).toBeUndefined();
    });

    it('should allow "Submit a complaint"', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Submit a complaint if you need help.'
      );

      const ctaViolation = violations.find(v => 
        v.rule.includes('Generic CTA') && v.category === 'cta_format'
      );
      expect(ctaViolation).toBeUndefined();
    });
  });
});

// =============================================================================
// Dead-End Detection
// =============================================================================

describe('dead-end detection', () => {
  it('should detect "cannot be done"', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'This request cannot be done.'
    );

    const deadEnd = violations.find(v => v.category === 'dead_end');
    expect(deadEnd).toBeDefined();
    expect(deadEnd?.severity).toBe('error');
  });

  it('should detect "can\'t be helped"', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      "Unfortunately, this can't be helped."
    );

    const deadEnd = violations.find(v => v.category === 'dead_end');
    expect(deadEnd).toBeDefined();
  });

  it('should detect "not possible"', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'This is not possible.'
    );

    const deadEnd = violations.find(v => v.category === 'dead_end');
    expect(deadEnd).toBeDefined();
  });

  it('should detect "not available"', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'This feature is not available.'
    );

    const deadEnd = violations.find(v => v.category === 'dead_end');
    expect(deadEnd).toBeDefined();
  });

  it('should detect "we can\'t do that"', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      "We can't do that."
    );

    const deadEnd = violations.find(v => v.category === 'dead_end');
    expect(deadEnd).toBeDefined();
  });

  it('should detect "error occurred" without guidance', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'An error occurred.'
    );

    const deadEnd = violations.find(v => v.category === 'dead_end');
    expect(deadEnd).toBeDefined();
  });

  it('should detect "something went wrong" without action', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'Something went wrong.'
    );

    const deadEnd = violations.find(v => v.category === 'dead_end');
    expect(deadEnd).toBeDefined();
  });

  it('should detect "contact us" dead-end', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'Please contact us.'
    );

    const deadEnd = violations.find(v => v.category === 'dead_end');
    expect(deadEnd).toBeDefined();
  });

  it('should not flag dead-end with alternative', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'This is not possible. However, you can try recharging online instead.'
    );

    // The pattern matches at end of line, so mid-sentence shouldn't match
    const deadEnd = violations.find(v => 
      v.category === 'dead_end' && v.rule.includes('no next step')
    );
    expect(deadEnd).toBeUndefined();
  });
});

// =============================================================================
// Error Message Structure
// =============================================================================

describe('error message structure', () => {
  describe('technical jargon detection', () => {
    it('should detect "exception" in error message', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'An exception occurred while processing your request.'
      );

      const errorViolation = violations.find(v => 
        v.rule.includes('Technical jargon') && v.category === 'error_structure'
      );
      expect(errorViolation).toBeDefined();
      expect(errorViolation?.severity).toBe('error');
    });

    it('should detect "null pointer"', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Null pointer error in your request.'
      );

      const errorViolation = violations.find(v => 
        v.rule.includes('Technical jargon')
      );
      expect(errorViolation).toBeDefined();
    });

    it('should detect "undefined"', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Value is undefined for this field.'
      );

      const errorViolation = violations.find(v => 
        v.rule.includes('Technical jargon')
      );
      expect(errorViolation).toBeDefined();
    });

    it('should detect "syntax error"', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'There was a syntax error in your input.'
      );

      const errorViolation = violations.find(v => 
        v.rule.includes('Technical jargon')
      );
      expect(errorViolation).toBeDefined();
    });
  });

  describe('error code detection', () => {
    it('should detect raw error codes', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Error code: ERR_1234 occurred.'
      );

      const errorViolation = violations.find(v => 
        v.rule.includes('error code') && v.category === 'error_structure'
      );
      expect(errorViolation).toBeDefined();
    });

    it('should detect HTTP status codes', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Received 404 error while loading page.'
      );

      const errorViolation = violations.find(v => 
        v.rule.includes('HTTP status')
      );
      expect(errorViolation).toBeDefined();
    });

    it('should detect 500 error', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Server returned 500 status code.'
      );

      const errorViolation = violations.find(v => 
        v.rule.includes('HTTP status')
      );
      expect(errorViolation).toBeDefined();
    });
  });

  describe('user blame detection', () => {
    it('should detect "you entered wrong"', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'You entered wrong details in the form.'
      );

      const errorViolation = violations.find(v => 
        v.rule.includes('Blaming user')
      );
      expect(errorViolation).toBeDefined();
    });

    it('should detect "you typed incorrect"', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'You typed incorrect password.'
      );

      const errorViolation = violations.find(v => 
        v.rule.includes('Blaming user')
      );
      expect(errorViolation).toBeDefined();
    });

    it('should detect "user error"', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'This is a user error.'
      );

      const errorViolation = violations.find(v => 
        v.rule.includes('user blame')
      );
      expect(errorViolation).toBeDefined();
    });

    it('should detect "your fault"', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'This is your fault.'
      );

      const errorViolation = violations.find(v => 
        v.rule.includes('Accusatory')
      );
      expect(errorViolation).toBeDefined();
    });
  });

  describe('errors without action', () => {
    it('should detect "invalid input" without explanation', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Invalid input.'
      );

      const errorViolation = violations.find(v => 
        v.rule.includes('Invalid without') && v.category === 'error_structure'
      );
      expect(errorViolation).toBeDefined();
    });

    it('should detect "request failed" without next step', () => {
      const violations = uxMicrocopyAgent.runPatternValidation(
        'Your request failed.'
      );

      const errorViolation = violations.find(v => 
        v.rule.includes('Failed without') && v.category === 'error_structure'
      );
      expect(errorViolation).toBeDefined();
    });
  });
});

// =============================================================================
// Empty State Validation
// =============================================================================

describe('empty state validation', () => {
  it('should detect "no results found" without guidance', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'No results found.'
    );

    const emptyState = violations.find(v => v.category === 'empty_state');
    expect(emptyState).toBeDefined();
    expect(emptyState?.suggestion).toContain('suggestion');
  });

  it('should detect "no data available"', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'No data available.'
    );

    const emptyState = violations.find(v => v.category === 'empty_state');
    expect(emptyState).toBeDefined();
  });

  it('should detect "nothing to show"', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'Nothing to show.'
    );

    const emptyState = violations.find(v => v.category === 'empty_state');
    expect(emptyState).toBeDefined();
  });

  it('should detect "nothing here"', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'Nothing here.'
    );

    const emptyState = violations.find(v => v.category === 'empty_state');
    expect(emptyState).toBeDefined();
  });
});

// =============================================================================
// Loading State Messages
// =============================================================================

describe('loading state validation', () => {
  it('should detect vague "please wait..."', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'Please wait...'
    );

    const loadingState = violations.find(v => v.category === 'loading_state');
    expect(loadingState).toBeDefined();
    expect(loadingState?.severity).toBe('info');
  });

  it('should detect generic "loading..."', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'Loading...'
    );

    const loadingState = violations.find(v => v.category === 'loading_state');
    expect(loadingState).toBeDefined();
  });

  it('should not flag specific loading message', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'Loading your transaction history. This may take a moment.'
    );

    const loadingState = violations.find(v => 
      v.category === 'loading_state' && v.rule.includes('Generic loading')
    );
    expect(loadingState).toBeUndefined();
  });
});

// =============================================================================
// Success Message Patterns
// =============================================================================

describe('success message validation', () => {
  it('should detect vague "Success!"', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'Success!'
    );

    const successState = violations.find(v => v.category === 'success_state');
    expect(successState).toBeDefined();
  });

  it('should detect vague "Done"', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'Done'
    );

    const successState = violations.find(v => v.category === 'success_state');
    expect(successState).toBeDefined();
  });

  it('should detect redundant "successfully done"', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'Request successfully done.'
    );

    const successState = violations.find(v => 
      v.rule.includes('Redundant success') && v.category === 'success_state'
    );
    expect(successState).toBeDefined();
  });

  it('should not flag specific success message', () => {
    const violations = uxMicrocopyAgent.runPatternValidation(
      'Your recharge of ₹299 was successful. Enjoy your new benefits!'
    );

    const successState = violations.find(v => v.category === 'success_state');
    expect(successState).toBeUndefined();
  });
});

// =============================================================================
// Score Calculation Tests
// =============================================================================

describe('calculateScore', () => {
  it('should return 100 for no violations', () => {
    const score = uxMicrocopyAgent.calculateScore([]);
    expect(score).toBe(100);
  });

  it('should penalize dead-ends more heavily', () => {
    const deadEndViolation = [{
      severity: 'error' as const,
      rule: 'Dead-end',
      text: 'test',
      suggestion: 'test',
      category: 'dead_end',
    }];

    const otherViolation = [{
      severity: 'error' as const,
      rule: 'Other',
      text: 'test',
      suggestion: 'test',
      category: 'error_structure',
    }];

    const deadEndScore = uxMicrocopyAgent.calculateScore(deadEndViolation);
    const otherScore = uxMicrocopyAgent.calculateScore(otherViolation);

    // Dead-end should cause lower score (more deduction)
    expect(deadEndScore).toBeLessThan(otherScore);
  });

  it('should not go below 0', () => {
    const manyViolations = Array(20).fill({
      severity: 'error' as const,
      rule: 'test',
      text: 'test',
      suggestion: 'test',
      category: 'dead_end',
    });

    const score = uxMicrocopyAgent.calculateScore(manyViolations);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// Pattern Coverage Tests
// =============================================================================

describe('pattern coverage', () => {
  const expectedCategories = [
    'cta_format',
    'dead_end',
    'error_structure',
    'empty_state',
    'loading_state',
    'success_state',
  ];

  it('should have patterns for all expected categories', () => {
    const patternCategories = new Set(
      uxMicrocopyAgent.patterns.map(p => p.category)
    );

    for (const category of expectedCategories) {
      expect(patternCategories.has(category)).toBe(true);
    }
  });

  it('should have unique pattern IDs', () => {
    const ids = uxMicrocopyAgent.patterns.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have pattern IDs starting with ux-', () => {
    for (const pattern of uxMicrocopyAgent.patterns) {
      expect(pattern.id).toMatch(/^ux-\d{3}$/);
    }
  });

  it('should have at least 20 patterns total', () => {
    expect(uxMicrocopyAgent.patterns.length).toBeGreaterThanOrEqual(20);
  });
});
