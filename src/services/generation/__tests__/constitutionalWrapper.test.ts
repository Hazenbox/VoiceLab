/**
 * Constitutional Wrapper Tests (Phase 4.2 - Test Plan 1.1)
 * 
 * Tests for constitutional validation enforcement including:
 * - convertToViolations() mapping
 * - getDefaultSuggestion() suggestions
 * - isAutoFixable() determination
 */

import { describe, it, expect } from 'vitest';
import {
  convertToViolations,
  type ValidationResult,
  type ValidationCheck,
} from '../constitutionalWrapper';

// =============================================================================
// Test Fixtures
// =============================================================================

function createValidationResult(checks: ValidationCheck[], suggestions: string[] = []): ValidationResult {
  const hasCritical = checks.some(c => !c.passed && c.severity === 'critical');
  const hasError = checks.some(c => !c.passed && c.severity === 'error');
  
  return {
    passed: checks.every(c => c.passed),
    checks,
    suggestions,
    shouldRegenerate: hasCritical,
    hasCriticalIssues: hasCritical,
    hasErrorIssues: hasError,
  };
}

// =============================================================================
// convertToViolations Tests
// =============================================================================

describe('convertToViolations', () => {
  describe('severity mapping', () => {
    it('should map critical severity to error', () => {
      const result = createValidationResult([
        {
          name: 'forbidden_phrase_critical',
          passed: false,
          severity: 'critical',
          message: 'Critical forbidden phrase detected',
          matchedText: 'I am a human',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('error');
    });

    it('should preserve error severity as error', () => {
      const result = createValidationResult([
        {
          name: 'safety_disclaimer',
          passed: false,
          severity: 'error',
          message: 'Missing safety disclaimer',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('error');
    });

    it('should preserve warning severity as warning', () => {
      const result = createValidationResult([
        {
          name: 'emotion_tone',
          passed: false,
          severity: 'warning',
          message: 'Tone mismatch',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('warning');
    });

    it('should preserve info severity as info', () => {
      const result = createValidationResult([
        {
          name: 'response_length_min',
          passed: false,
          severity: 'info',
          message: 'Response could be more detailed',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations).toHaveLength(1);
      expect(violations[0].severity).toBe('info');
    });
  });

  describe('violation properties', () => {
    it('should set category to constitutional', () => {
      const result = createValidationResult([
        {
          name: 'pattern_acknowledge',
          passed: false,
          severity: 'warning',
          message: 'Missing acknowledgment',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].category).toBe('constitutional');
    });

    it('should use matchedText when available', () => {
      const result = createValidationResult([
        {
          name: 'forbidden_phrase',
          passed: false,
          severity: 'error',
          message: 'Forbidden phrase detected',
          matchedText: 'you must do this',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].text).toBe('you must do this');
    });

    it('should fallback to message when matchedText is not available', () => {
      const result = createValidationResult([
        {
          name: 'emotion_tone',
          passed: false,
          severity: 'warning',
          message: 'Tone does not match user emotion',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].text).toBe('Tone does not match user emotion');
    });

    it('should fallback to check name when both matchedText and message are missing', () => {
      const result = createValidationResult([
        {
          name: 'pattern_next_step',
          passed: false,
          severity: 'warning',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].text).toBe('pattern_next_step');
    });

    it('should use rule name from check name', () => {
      const result = createValidationResult([
        {
          name: 'safety_disclaimer_critical',
          passed: false,
          severity: 'critical',
          message: 'Missing safety disclaimer',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].rule).toBe('safety_disclaimer_critical');
    });
  });

  describe('suggestion handling', () => {
    it('should match suggestion from suggestions array when available', () => {
      const result = createValidationResult(
        [
          {
            name: 'emotion_tone',
            passed: false,
            severity: 'warning',
            message: 'Tone mismatch',
          },
        ],
        ['Adjust emotion tone to be more empathetic']
      );

      const violations = convertToViolations(result);

      expect(violations[0].suggestion).toBe('Adjust emotion tone to be more empathetic');
    });

    it('should use default suggestion when no matching suggestion found', () => {
      const result = createValidationResult([
        {
          name: 'forbidden_phrase_critical',
          passed: false,
          severity: 'critical',
          message: 'Forbidden phrase detected',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].suggestion).toBe('Remove the phrase that claims human identity or experiences');
    });

    it('should return generic suggestion for unknown check names', () => {
      const result = createValidationResult([
        {
          name: 'unknown_check_name',
          passed: false,
          severity: 'warning',
          message: 'Unknown issue',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].suggestion).toBe('Review and revise this content');
    });
  });

  describe('autoFixable determination', () => {
    it('should mark forbidden_phrase as autoFixable', () => {
      const result = createValidationResult([
        {
          name: 'forbidden_phrase',
          passed: false,
          severity: 'error',
          message: 'Demanding language detected',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].autoFixable).toBe(true);
    });

    it('should mark forbidden_phrase_critical as autoFixable', () => {
      const result = createValidationResult([
        {
          name: 'forbidden_phrase_critical',
          passed: false,
          severity: 'critical',
          message: 'Human identity claim',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].autoFixable).toBe(true);
    });

    it('should mark response_length_max as autoFixable', () => {
      const result = createValidationResult([
        {
          name: 'response_length_max',
          passed: false,
          severity: 'warning',
          message: 'Response too long',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].autoFixable).toBe(true);
    });

    it('should mark safety_disclaimer as NOT autoFixable', () => {
      const result = createValidationResult([
        {
          name: 'safety_disclaimer',
          passed: false,
          severity: 'error',
          message: 'Missing disclaimer',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].autoFixable).toBe(false);
    });

    it('should mark emotion_tone as NOT autoFixable', () => {
      const result = createValidationResult([
        {
          name: 'emotion_tone',
          passed: false,
          severity: 'warning',
          message: 'Tone mismatch',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].autoFixable).toBe(false);
    });

    it('should mark pattern checks as NOT autoFixable', () => {
      const result = createValidationResult([
        {
          name: 'pattern_acknowledge',
          passed: false,
          severity: 'warning',
          message: 'Missing acknowledgment',
        },
        {
          name: 'pattern_next_step',
          passed: false,
          severity: 'warning',
          message: 'Missing next step',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].autoFixable).toBe(false);
      expect(violations[1].autoFixable).toBe(false);
    });
  });

  describe('passed checks filtering', () => {
    it('should not include passed checks in violations', () => {
      const result = createValidationResult([
        {
          name: 'emotion_tone',
          passed: true,
          severity: 'warning',
          message: 'Tone is appropriate',
        },
        {
          name: 'forbidden_phrase',
          passed: false,
          severity: 'error',
          message: 'Forbidden phrase detected',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations).toHaveLength(1);
      expect(violations[0].rule).toBe('forbidden_phrase');
    });

    it('should return empty array when all checks pass', () => {
      const result = createValidationResult([
        {
          name: 'emotion_tone',
          passed: true,
          severity: 'warning',
        },
        {
          name: 'pattern_acknowledge',
          passed: true,
          severity: 'warning',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations).toHaveLength(0);
    });
  });

  describe('multiple violations', () => {
    it('should convert multiple failed checks to violations', () => {
      const result = createValidationResult([
        {
          name: 'forbidden_phrase_critical',
          passed: false,
          severity: 'critical',
          message: 'Human identity claim',
          matchedText: 'I am a person',
        },
        {
          name: 'safety_disclaimer',
          passed: false,
          severity: 'error',
          message: 'Missing emergency resources',
        },
        {
          name: 'emotion_tone',
          passed: false,
          severity: 'warning',
          message: 'Tone too formal',
        },
      ]);

      const violations = convertToViolations(result);

      expect(violations).toHaveLength(3);
      expect(violations[0].severity).toBe('error'); // critical -> error
      expect(violations[1].severity).toBe('error');
      expect(violations[2].severity).toBe('warning');
    });

    it('should preserve order of violations as in checks', () => {
      const result = createValidationResult([
        { name: 'check_a', passed: false, severity: 'warning', message: 'A' },
        { name: 'check_b', passed: false, severity: 'error', message: 'B' },
        { name: 'check_c', passed: false, severity: 'info', message: 'C' },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].rule).toBe('check_a');
      expect(violations[1].rule).toBe('check_b');
      expect(violations[2].rule).toBe('check_c');
    });
  });
});

// =============================================================================
// Default Suggestion Tests
// =============================================================================

describe('getDefaultSuggestion (via convertToViolations)', () => {
  const testCases: Array<{ checkName: string; expectedContains: string }> = [
    { checkName: 'forbidden_phrase_critical', expectedContains: 'human identity' },
    { checkName: 'forbidden_phrase', expectedContains: 'supportive' },
    { checkName: 'safety_disclaimer_critical', expectedContains: 'emergency resources' },
    { checkName: 'safety_disclaimer', expectedContains: 'professional referral' },
    { checkName: 'emotion_tone', expectedContains: 'tone' },
    { checkName: 'pattern_acknowledge', expectedContains: 'acknowledging' },
    { checkName: 'pattern_next_step', expectedContains: 'next step' },
    { checkName: 'response_length_min', expectedContains: 'detail' },
    { checkName: 'response_length_max', expectedContains: 'concise' },
  ];

  testCases.forEach(({ checkName, expectedContains }) => {
    it(`should return appropriate suggestion for ${checkName}`, () => {
      const result = createValidationResult([
        { name: checkName, passed: false, severity: 'warning' },
      ]);

      const violations = convertToViolations(result);

      expect(violations[0].suggestion.toLowerCase()).toContain(expectedContains.toLowerCase());
    });
  });
});
