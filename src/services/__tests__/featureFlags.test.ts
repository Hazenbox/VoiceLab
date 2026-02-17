/**
 * Feature Flags Tests (Phase 4.2 - Test Plan 1.2)
 * 
 * Tests for feature flag opt-out defaults:
 * - Default true when env var is undefined
 * - Default true when env var is empty
 * - Only false when explicitly set to 'false'
 * - getFlag() helper with custom defaults
 */

import { describe, it, expect } from 'vitest';
import { featureFlags } from '../featureFlags';

// =============================================================================
// Helper Function Logic Tests
// =============================================================================

/**
 * Extracts and tests the core logic of feature flags.
 * The actual featureFlags module uses import.meta.env which can't be easily mocked,
 * so we test the logic pattern and verify the actual exports work.
 */

// Simulate the opt-out pattern: returns false ONLY if env === 'false'
function optOutPattern(envValue: string | undefined): boolean {
  return envValue !== 'false';
}

// Simulate the opt-in pattern: returns true ONLY if env === 'true'
function optInPattern(envValue: string | undefined): boolean {
  return envValue === 'true';
}

// Simulate getFlag helper
function getFlagPattern(envValue: string | undefined, defaultValue: boolean = false): boolean {
  if (envValue === undefined) return defaultValue;
  if (envValue === 'true') return true;
  if (envValue === 'false') return false;
  return defaultValue;
}

// =============================================================================
// Opt-Out Pattern Tests (core features - default ON)
// =============================================================================

describe('Feature Flag Opt-Out Pattern', () => {
  describe('when env var is undefined', () => {
    it('should return true (feature enabled)', () => {
      expect(optOutPattern(undefined)).toBe(true);
    });
  });

  describe('when env var is empty string', () => {
    it('should return true (feature enabled)', () => {
      expect(optOutPattern('')).toBe(true);
    });
  });

  describe('when env var is "true"', () => {
    it('should return true (feature enabled)', () => {
      expect(optOutPattern('true')).toBe(true);
    });
  });

  describe('when env var is exactly "false"', () => {
    it('should return false (feature disabled)', () => {
      expect(optOutPattern('false')).toBe(false);
    });
  });

  describe('when env var is "FALSE" (case-sensitive)', () => {
    it('should return true (not disabled - case sensitive)', () => {
      expect(optOutPattern('FALSE')).toBe(true);
    });
  });

  describe('when env var is any other value', () => {
    it('should return true for "yes"', () => {
      expect(optOutPattern('yes')).toBe(true);
    });

    it('should return true for "1"', () => {
      expect(optOutPattern('1')).toBe(true);
    });

    it('should return true for "enabled"', () => {
      expect(optOutPattern('enabled')).toBe(true);
    });
  });
});

// =============================================================================
// Opt-In Pattern Tests (debug features - default OFF)
// =============================================================================

describe('Feature Flag Opt-In Pattern', () => {
  describe('when env var is undefined', () => {
    it('should return false (feature disabled)', () => {
      expect(optInPattern(undefined)).toBe(false);
    });
  });

  describe('when env var is empty string', () => {
    it('should return false (feature disabled)', () => {
      expect(optInPattern('')).toBe(false);
    });
  });

  describe('when env var is exactly "true"', () => {
    it('should return true (feature enabled)', () => {
      expect(optInPattern('true')).toBe(true);
    });
  });

  describe('when env var is "TRUE" (case-sensitive)', () => {
    it('should return false (not enabled - case sensitive)', () => {
      expect(optInPattern('TRUE')).toBe(false);
    });
  });

  describe('when env var is any other value', () => {
    it('should return false for "yes"', () => {
      expect(optInPattern('yes')).toBe(false);
    });

    it('should return false for "1"', () => {
      expect(optInPattern('1')).toBe(false);
    });
  });
});

// =============================================================================
// getFlag() Helper Pattern Tests
// =============================================================================

describe('getFlag() Helper Pattern', () => {
  describe('default value handling', () => {
    it('should return default=true when env is undefined', () => {
      expect(getFlagPattern(undefined, true)).toBe(true);
    });

    it('should return default=false when env is undefined', () => {
      expect(getFlagPattern(undefined, false)).toBe(false);
    });

    it('should return false when no default provided', () => {
      expect(getFlagPattern(undefined)).toBe(false);
    });
  });

  describe('explicit true/false', () => {
    it('should return true when env is "true" regardless of default', () => {
      expect(getFlagPattern('true', false)).toBe(true);
      expect(getFlagPattern('true', true)).toBe(true);
    });

    it('should return false when env is "false" regardless of default', () => {
      expect(getFlagPattern('false', true)).toBe(false);
      expect(getFlagPattern('false', false)).toBe(false);
    });
  });

  describe('non-boolean values', () => {
    it('should return default for "yes"', () => {
      expect(getFlagPattern('yes', true)).toBe(true);
      expect(getFlagPattern('yes', false)).toBe(false);
    });

    it('should return default for "1"', () => {
      expect(getFlagPattern('1', true)).toBe(true);
      expect(getFlagPattern('1', false)).toBe(false);
    });

    it('should return default for empty string', () => {
      expect(getFlagPattern('', true)).toBe(true);
      expect(getFlagPattern('', false)).toBe(false);
    });
  });
});

// =============================================================================
// Actual Feature Flags Export Tests
// =============================================================================

describe('featureFlags exports', () => {
  describe('opt-out flags (default ON)', () => {
    // These flags use the pattern: env !== 'false'
    // So they default to true when env is undefined
    
    it('persona should be accessible', () => {
      expect(typeof featureFlags.persona).toBe('boolean');
    });

    it('knowledgeBase should be accessible', () => {
      expect(typeof featureFlags.knowledgeBase).toBe('boolean');
    });

    it('learning should be accessible', () => {
      expect(typeof featureFlags.learning).toBe('boolean');
    });

    it('conversationalMode should be accessible', () => {
      expect(typeof featureFlags.conversationalMode).toBe('boolean');
    });

    it('safetyGate should be accessible', () => {
      expect(typeof featureFlags.safetyGate).toBe('boolean');
    });

    it('constitutionalWrapper should be accessible', () => {
      expect(typeof featureFlags.constitutionalWrapper).toBe('boolean');
    });

    it('validationAgents should be accessible', () => {
      expect(typeof featureFlags.validationAgents).toBe('boolean');
    });

    it('emergencyResponses should be accessible', () => {
      expect(typeof featureFlags.emergencyResponses).toBe('boolean');
    });

    it('sessionAnalytics should be accessible', () => {
      expect(typeof featureFlags.sessionAnalytics).toBe('boolean');
    });

    it('interactionTracking should be accessible', () => {
      expect(typeof featureFlags.interactionTracking).toBe('boolean');
    });

    it('autoApproveCorrections should be accessible', () => {
      expect(typeof featureFlags.autoApproveCorrections).toBe('boolean');
    });

    it('validateConversational should be accessible', () => {
      expect(typeof featureFlags.validateConversational).toBe('boolean');
    });
  });

  describe('opt-in flags (default OFF)', () => {
    // These flags use the pattern: env === 'true'
    // So they default to false when env is undefined

    it('debugTokens should be accessible', () => {
      expect(typeof featureFlags.debugTokens).toBe('boolean');
    });

    it('debugValidation should be accessible', () => {
      expect(typeof featureFlags.debugValidation).toBe('boolean');
    });

    it('debugStateMachine should be accessible', () => {
      expect(typeof featureFlags.debugStateMachine).toBe('boolean');
    });
  });

  describe('always-on flags', () => {
    it('convexSync should always be true', () => {
      expect(featureFlags.convexSync).toBe(true);
    });
  });

  describe('getFlag helper', () => {
    it('should be a function', () => {
      expect(typeof featureFlags.getFlag).toBe('function');
    });

    it('should accept key and default value', () => {
      // Test that it doesn't throw
      const result = featureFlags.getFlag('test_feature', false);
      expect(typeof result).toBe('boolean');
    });
  });
});

// =============================================================================
// Default Values in Test Environment
// =============================================================================

describe('featureFlags default values (test environment)', () => {
  // In test environment without env vars set, opt-out flags should be true
  // and opt-in flags should be false

  it('core features should default to enabled (true)', () => {
    // These are opt-out flags (env !== 'false')
    expect(featureFlags.persona).toBe(true);
    expect(featureFlags.knowledgeBase).toBe(true);
    expect(featureFlags.learning).toBe(true);
    expect(featureFlags.conversationalMode).toBe(true);
  });

  it('safety features should default to enabled (true)', () => {
    expect(featureFlags.safetyGate).toBe(true);
    expect(featureFlags.emergencyResponses).toBe(true);
    expect(featureFlags.validateConversational).toBe(true);
  });

  it('debug features should default to disabled (false)', () => {
    // These are opt-in flags (env === 'true')
    expect(featureFlags.debugTokens).toBe(false);
    expect(featureFlags.debugValidation).toBe(false);
    expect(featureFlags.debugStateMachine).toBe(false);
  });
});
