/**
 * Checker-mode compliance tests
 * Runs all 'checker' mode tests from complianceTestCases deterministically (no LLM needed).
 */
import { describe, test, expect } from 'vitest';
import { ALL_TESTS } from './complianceTestCases';
import { evaluateTest } from './complianceEvaluator';

const checkerTests = ALL_TESTS.filter(t => t.mode === 'checker');

describe('checker-mode compliance', () => {
  for (const tc of checkerTests) {
    test(`${tc.id}: ${tc.description}`, async () => {
      const result = await evaluateTest(tc);
      
      if (result.status === 'error') {
        console.error(`[${tc.id}] ERROR: ${result.error}`);
      }
      
      if (result.failPatternMatches.length > 0) {
        console.warn(`[${tc.id}] FAIL patterns found: ${result.failPatternMatches.join(', ')}`);
        console.warn(`[${tc.id}] Output: "${result.actualOutput.substring(0, 200)}"`);
      }
      
      if (result.failedPatterns.length > 0 && result.status !== 'pass') {
        console.warn(`[${tc.id}] Missing PASS patterns: ${result.failedPatterns.join(', ')}`);
        console.warn(`[${tc.id}] Output: "${result.actualOutput.substring(0, 200)}"`);
      }

      expect(result.status, `${tc.id} should pass. Output: "${result.actualOutput.substring(0, 150)}"`).not.toBe('fail');
      expect(result.status).not.toBe('error');
    });
  }
});
