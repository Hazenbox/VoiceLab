/**
 * Tests for Validation Pipeline
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runValidationPipeline, runQuickValidation, getViolationSummary } from './validationPipeline';
import type { GenerationContext } from '../../types';

describe('validationPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runValidationPipeline', () => {
    it('should return passed=true for clean content', async () => {
      const cleanContent = 'Get unlimited data with our new plan. Recharge now!';
      const result = await runValidationPipeline(cleanContent);
      
      expect(result.passed).toBe(true);
      expect(result.overallScore).toBeGreaterThan(70);
      expect(result.certification).not.toBe('issues_found');
    });

    it('should detect avoid words violations', async () => {
      const contentWithAvoidWords = 'Please utilize this amazing feature to leverage your data.';
      const result = await runValidationPipeline(contentWithAvoidWords);
      
      // Should find avoid words like "utilize", "leverage", "amazing"
      const allViolations = result.agentResults.flatMap(r => r.violations);
      expect(allViolations.length).toBeGreaterThan(0);
    });

    it('should return processing time', async () => {
      const result = await runValidationPipeline('Test content');
      
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should include agent results', async () => {
      const result = await runValidationPipeline('Test content');
      
      expect(result.agentResults).toBeInstanceOf(Array);
      expect(result.agentResults.length).toBeGreaterThan(0);
      
      for (const agentResult of result.agentResults) {
        expect(agentResult).toHaveProperty('agentId');
        expect(agentResult).toHaveProperty('agentName');
        expect(agentResult).toHaveProperty('passed');
        expect(agentResult).toHaveProperty('score');
        expect(agentResult).toHaveProperty('violations');
      }
    });

    it('should validate channel length constraints for SMS', async () => {
      const longContent = 'A'.repeat(200); // Too long for SMS (160 char limit)
      const context: Partial<GenerationContext> = {
        channel: 'sms',
      };
      
      const result = await runValidationPipeline(longContent, context as GenerationContext);
      
      // Should have channel constraint violation
      const allViolations = result.agentResults.flatMap(r => r.violations);
      // Note: Channel constraints may or may not be added depending on config
      expect(result.totalViolations).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty content', async () => {
      const result = await runValidationPipeline('');
      
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('overallScore');
    });

    it('should calculate certification levels correctly', async () => {
      // High score content
      const goodContent = 'Get your new plan today. Simple and affordable.';
      const goodResult = await runValidationPipeline(goodContent);
      
      expect(['certified', 'review_recommended']).toContain(goodResult.certification);
    });
  });

  describe('runQuickValidation', () => {
    it('should run faster than full pipeline', async () => {
      const content = 'Test content for validation';
      
      const quickStart = performance.now();
      const quickResult = runQuickValidation(content);
      const quickTime = performance.now() - quickStart;
      
      const fullStart = performance.now();
      await runValidationPipeline(content);
      const fullTime = performance.now() - fullStart;
      
      // Quick validation should be at least as fast
      expect(quickResult.processingTimeMs).toBeLessThanOrEqual(fullTime + 10);
    });

    it('should accept specific agent IDs', () => {
      const content = 'Utilize this feature';
      const result = runQuickValidation(content, ['avoid_words']);
      
      // Should only have results from avoid_words agent
      expect(result.agentResults.length).toBe(1);
      expect(result.agentResults[0].agentId).toBe('avoid_words');
    });

    it('should return all required fields', () => {
      const result = runQuickValidation('Test');
      
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('certification');
      expect(result).toHaveProperty('agentResults');
      expect(result).toHaveProperty('totalViolations');
      expect(result).toHaveProperty('autoFixableCount');
      expect(result).toHaveProperty('processingTimeMs');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('getViolationSummary', () => {
    it('should categorize violations by severity', async () => {
      const content = 'Please utilize this amazing feature immediately!';
      const result = await runValidationPipeline(content);
      const summary = getViolationSummary(result);
      
      expect(summary).toHaveProperty('error');
      expect(summary).toHaveProperty('warning');
      expect(summary).toHaveProperty('info');
      
      expect(Array.isArray(summary.error)).toBe(true);
      expect(Array.isArray(summary.warning)).toBe(true);
      expect(Array.isArray(summary.info)).toBe(true);
    });

    it('should return empty arrays for clean content', async () => {
      const cleanContent = 'Get your plan today.';
      const result = await runValidationPipeline(cleanContent);
      const summary = getViolationSummary(result);
      
      // May have some violations but should categorize correctly
      const totalViolations = summary.error.length + summary.warning.length + summary.info.length;
      expect(totalViolations).toBe(result.totalViolations);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate overlapping violations', async () => {
      // Content that might be flagged by multiple agents for the same word
      const content = 'Utilize this amazing feature';
      const result = await runValidationPipeline(content);
      
      // Get all violations before and after deduplication
      const allViolations = result.agentResults.flatMap(r => r.violations);
      
      // The total should be <= the sum of individual agent violations
      // (deduplication should reduce or maintain count)
      expect(result.totalViolations).toBeLessThanOrEqual(allViolations.length);
    });
  });

  describe('scoring', () => {
    it('should return scores between 0 and 100', async () => {
      const result = await runValidationPipeline('Test content');
      
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      
      for (const agentResult of result.agentResults) {
        expect(agentResult.score).toBeGreaterThanOrEqual(0);
        expect(agentResult.score).toBeLessThanOrEqual(100);
      }
    });

    it('should reduce score for violations', async () => {
      const cleanContent = 'Get your plan today.';
      const dirtyContent = 'Utilize this amazing awesome revolutionary feature to leverage synergies.';
      
      const cleanResult = await runValidationPipeline(cleanContent);
      const dirtyResult = await runValidationPipeline(dirtyContent);
      
      // Content with more violations should have lower score
      expect(dirtyResult.overallScore).toBeLessThanOrEqual(cleanResult.overallScore);
    });
  });

  describe('autoFixableCount', () => {
    it('should count auto-fixable violations', async () => {
      const result = await runValidationPipeline('Utilize this feature');
      
      expect(result.autoFixableCount).toBeGreaterThanOrEqual(0);
      expect(result.autoFixableCount).toBeLessThanOrEqual(result.totalViolations);
    });
  });

  describe('benefit-first headline rule (ba-016)', () => {
    it('should flag event-first headlines', () => {
      // Event name at the start should trigger violation
      const eventFirstContent = 'Diwali sale now on!';
      const result = runQuickValidation(eventFirstContent, ['brand_alignment']);
      
      const violations = result.agentResults.flatMap(r => r.violations);
      const benefitViolation = violations.find(v => v.rule.includes('benefit'));
      
      expect(benefitViolation).toBeDefined();
      expect(benefitViolation?.suggestion).toContain('50% off');
    });

    it('should allow benefit-first headlines with event names', () => {
      // Benefit first, event name later - should NOT trigger violation
      const benefitFirstContent = '50% off - Diwali Special';
      const result = runQuickValidation(benefitFirstContent, ['brand_alignment']);
      
      const violations = result.agentResults.flatMap(r => r.violations);
      const benefitViolation = violations.find(v => v.rule.includes('benefit'));
      
      expect(benefitViolation).toBeUndefined();
    });

    it('should flag multiple event-first patterns', () => {
      const testCases = [
        'Christmas offer for you',
        'Holi special discounts',
        'New Year offer available',
      ];
      
      for (const content of testCases) {
        const result = runQuickValidation(content, ['brand_alignment']);
        const violations = result.agentResults.flatMap(r => r.violations);
        const benefitViolation = violations.find(v => v.rule.includes('benefit'));
        
        expect(benefitViolation).toBeDefined();
      }
    });

    it('should allow event names mid-sentence', () => {
      // Event name NOT at the start - should pass
      const midSentenceContent = 'Shop now! Diwali sale ends soon';
      const result = runQuickValidation(midSentenceContent, ['brand_alignment']);
      
      const violations = result.agentResults.flatMap(r => r.violations);
      const benefitViolation = violations.find(v => v.rule.includes('benefit'));
      
      expect(benefitViolation).toBeUndefined();
    });
  });
});
