import { describe, it, expect } from 'vitest';
import { generateAutoFixes, applyAutoFixes } from './autoFixEngine';
import type { Violation } from '../../types';

describe('AutoFixEngine', () => {
  describe('generateAutoFixes', () => {
    it('should generate fixes for gender-neutral violations', () => {
      const violations: Violation[] = [
        {
          rule: 'Use gender-neutral language',
          severity: 'error',
          category: 'inclusive',
          text: 'chairman',
          suggestion: 'chairperson',
          position: { start: 0, end: 8 },
          autoFixable: true,
        },
      ];

      const fixes = generateAutoFixes(violations);

      expect(fixes).toHaveLength(1);
      expect(fixes[0]).toMatchObject({
        original: 'chairman',
        replacement: 'chairperson',
        confidence: 0.95,
      });
    });

    it('should generate fixes for avoid words', () => {
      const violations: Violation[] = [
        {
          rule: 'Avoid jargon',
          severity: 'warning',
          category: 'clarity',
          text: 'utilize',
          suggestion: 'use',
          position: { start: 0, end: 7 },
          autoFixable: true,
        },
      ];

      const fixes = generateAutoFixes(violations);

      expect(fixes).toHaveLength(1);
      expect(fixes[0].replacement).toBe('use');
      expect(fixes[0].confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should generate fixes for brand capitalization', () => {
      const violations: Violation[] = [
        {
          rule: 'Brand capitalization',
          severity: 'error',
          category: 'brand',
          text: 'jio',
          suggestion: 'Jio',
          position: { start: 0, end: 3 },
          autoFixable: true,
        },
      ];

      const fixes = generateAutoFixes(violations);

      expect(fixes).toHaveLength(1);
      expect(fixes[0]).toMatchObject({
        original: 'jio',
        replacement: 'Jio',
        confidence: 0.99,
      });
    });

    it('should now process ALL violations regardless of autoFixable flag (aggressive mode)', () => {
      // NEW BEHAVIOR: Auto-fix engine now processes ALL violations that have suggestions
      // to ensure no violating content ever appears in the final output
      const violations: Violation[] = [
        {
          rule: 'Complex issue',
          severity: 'warning',
          category: 'other',
          text: 'some text',
          suggestion: 'manual fix needed',
          position: { start: 0, end: 9 },
          autoFixable: false, // Even with autoFixable=false, we now generate a fix
        },
      ];

      const fixes = generateAutoFixes(violations);

      // Changed from 0 to 1 - we now fix ALL violations with suggestions
      expect(fixes).toHaveLength(1);
      expect(fixes[0].replacement).toBe('manual fix needed');
      expect(fixes[0].original).toBe('some text');
    });

    it('should use suggestion for violations without known replacements', () => {
      const violations: Violation[] = [
        {
          rule: 'Unknown issue',
          severity: 'warning',
          category: 'other',
          text: 'unknown-word',
          suggestion: 'a better word',
          position: { start: 0, end: 12 },
          autoFixable: true,
        },
      ];

      const fixes = generateAutoFixes(violations);

      // Unknown word not in REPLACEMENTS - uses suggestion
      expect(fixes).toHaveLength(1);
      // Confidence increased from 0.7 to 0.75 for raw suggestions
      expect(fixes[0].confidence).toBe(0.75);
    });
  });

  describe('applyAutoFixes', () => {
    it('should apply single fix to content', () => {
      const content = 'The chairman will attend the meeting.';
      const violations: Violation[] = [
        {
          rule: 'Gender neutral',
          severity: 'error',
          category: 'inclusive',
          text: 'chairman',
          suggestion: 'chairperson',
          position: { start: 4, end: 12 },
          autoFixable: true,
        },
      ];
      
      const fixes = generateAutoFixes(violations);
      const result = applyAutoFixes(content, fixes);

      expect(result.fixedContent).toBe('The chairperson will attend the meeting.');
      expect(result.appliedFixes).toHaveLength(1);
      expect(result.skippedFixes).toHaveLength(0);
    });

    it('should apply multiple fixes to content', () => {
      const content = 'We need to utilize jio services.';
      const violations: Violation[] = [
        {
          rule: 'Simplify',
          severity: 'warning',
          category: 'clarity',
          text: 'utilize',
          suggestion: 'use',
          position: { start: 11, end: 18 },
          autoFixable: true,
        },
        {
          rule: 'Brand',
          severity: 'error',
          category: 'brand',
          text: 'jio',
          suggestion: 'Jio',
          position: { start: 19, end: 22 },
          autoFixable: true,
        },
      ];
      
      const fixes = generateAutoFixes(violations);
      const result = applyAutoFixes(content, fixes);

      // Both fixes should be applied
      expect(result.fixedContent).toContain('use');
      expect(result.fixedContent).toContain('Jio');
      expect(result.appliedFixes.length).toBeGreaterThan(0);
    });

    it('should preserve content when no fixes provided', () => {
      const content = 'This is a test sentence.';
      const result = applyAutoFixes(content, []);

      expect(result.fixedContent).toBe(content);
      expect(result.appliedFixes).toHaveLength(0);
    });

    it('should handle repeated words correctly', () => {
      const content = 'chairman and chairman';
      const violations: Violation[] = [
        {
          rule: 'Gender neutral',
          severity: 'error',
          category: 'inclusive',
          text: 'chairman',
          suggestion: 'chairperson',
          position: { start: 0, end: 8 },
          autoFixable: true,
        },
      ];
      
      const fixes = generateAutoFixes(violations);
      const result = applyAutoFixes(content, fixes);

      // Should replace ALL occurrences
      expect(result.fixedContent).toBe('Chairperson and chairperson');
      expect(result.appliedFixes).toHaveLength(1);
    });

    it('should calculate score improvement', () => {
      const content = 'The chairman will utilize the facility.';
      const violations: Violation[] = [
        {
          rule: 'Gender neutral',
          severity: 'error',
          category: 'inclusive',
          text: 'chairman',
          suggestion: 'chairperson',
          position: { start: 4, end: 12 },
          autoFixable: true,
        },
      ];
      
      const fixes = generateAutoFixes(violations);
      const result = applyAutoFixes(content, fixes);

      expect(result.scoreImprovement).toBeGreaterThan(0);
      expect(result.newScore).toBeGreaterThanOrEqual(0);
      expect(result.newScore).toBeLessThanOrEqual(100);
    });

    it('should preserve case in replacements', () => {
      const content = 'Utilize the services.';
      const violations: Violation[] = [
        {
          rule: 'Simplify',
          severity: 'warning',
          category: 'clarity',
          text: 'Utilize',
          suggestion: 'use',
          position: { start: 0, end: 7 },
          autoFixable: true,
        },
      ];
      
      const fixes = generateAutoFixes(violations);
      const result = applyAutoFixes(content, fixes);

      // Should preserve capitalization
      expect(result.fixedContent).toBe('Use the services.');
    });

    it('should skip low-confidence fixes when minConfidence set', () => {
      const content = 'We need to leverage this.';
      const violations: Violation[] = [
        {
          rule: 'Simplify',
          severity: 'warning',
          category: 'clarity',
          text: 'leverage',
          suggestion: 'use',
          position: { start: 11, end: 19 },
          autoFixable: true,
        },
      ];
      
      const fixes = generateAutoFixes(violations);
      
      // Apply with confidence threshold higher than SIMPLE_ALTERNATIVES (0.90)
      const result = applyAutoFixes(content, fixes, 0.95);

      expect(result.fixedContent).toBe(content); // Not changed
      expect(result.skippedFixes).toHaveLength(1);
    });

    it('should handle British spellings', () => {
      const content = 'We organize our favorites.';
      const violations: Violation[] = [
        {
          rule: 'British spelling',
          severity: 'warning',
          category: 'style',
          text: 'organize',
          suggestion: 'organise',
          position: { start: 3, end: 11 },
          autoFixable: true,
        },
      ];
      
      const fixes = generateAutoFixes(violations);
      const result = applyAutoFixes(content, fixes);

      // Should fix at least one word
      expect(result.fixedContent).toContain('organise');
      expect(result.appliedFixes.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty violations array', () => {
      const fixes = generateAutoFixes([]);
      expect(fixes).toHaveLength(0);
    });

    it('should handle empty content', () => {
      const result = applyAutoFixes('', []);
      expect(result.fixedContent).toBe('');
    });

    it('should not modify unrelated content', () => {
      const content = 'This is perfectly fine content with no issues.';
      const result = applyAutoFixes(content, []);
      
      expect(result.fixedContent).toBe(content);
    });
  });
});
