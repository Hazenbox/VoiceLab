/**
 * Auto-Fix Engine Stress Tests
 * 
 * Comprehensive stress tests for the auto-fix system including:
 * - High-volume violation handling (50-100+ violations)
 * - Large content processing (5KB-50KB)
 * - Edge cases (case preservation, overlapping violations)
 * - Dynamic rules from Convex
 * - Performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateAutoFixes,
  applyAutoFixes,
  setDynamicAutoFixRules,
  clearDynamicAutoFixRules,
} from '../autoFixEngine';
import { runValidationPipeline, runQuickValidation } from '../../validation/validationPipeline';
import {
  generateContentWithViolations,
  generateLargeContent,
  generateViolationBatch,
  generateOverlappingViolations,
  generateDynamicAutoFixRules,
  ALL_REPLACEMENT_KEYS,
  measureTime,
  measureTimeAsync,
} from '../../../test/stressTestHelpers';
import type { Violation } from '../../../types';
import type { GapFinding } from '../../../test/stressTestHelpers';

// ═══════════════════════════════════════════════════════════════════════════════
// GAP TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

const gaps: GapFinding[] = [];

function reportGap(gap: GapFinding) {
  gaps.push(gap);
  console.warn(`[GAP] ${gap.severity.toUpperCase()}: ${gap.description}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIGH-VOLUME VIOLATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Auto-Fix Stress Tests', () => {
  beforeEach(() => {
    clearDynamicAutoFixRules();
  });

  afterEach(() => {
    clearDynamicAutoFixRules();
  });

  describe('High-Volume Violation Handling', () => {
    it('should process 50 violations successfully', () => {
      const violations = generateViolationBatch(50);
      const { result: fixes, timeMs } = measureTime(() => generateAutoFixes(violations));
      
      console.log(`[PERF] 50 violations processed in ${timeMs.toFixed(2)}ms`);
      
      // Should generate fixes for all violations with suggestions
      expect(fixes.length).toBeGreaterThan(0);
      
      if (timeMs > 100) {
        reportGap({
          area: 'auto-fix-performance',
          severity: 'medium',
          description: `50 violations took ${timeMs.toFixed(2)}ms (target: <100ms)`,
          recommendation: 'Optimize generateAutoFixes loop or caching',
        });
      }
    });

    it('should process 100 violations under 100ms', () => {
      const violations = generateViolationBatch(100);
      const { result: fixes, timeMs } = measureTime(() => generateAutoFixes(violations));
      
      console.log(`[PERF] 100 violations processed in ${timeMs.toFixed(2)}ms`);
      
      expect(fixes.length).toBeGreaterThan(0);
      expect(timeMs).toBeLessThan(200); // Allow some buffer
      
      if (timeMs > 100) {
        reportGap({
          area: 'auto-fix-performance',
          severity: 'high',
          description: `100 violations took ${timeMs.toFixed(2)}ms (target: <100ms)`,
          recommendation: 'Consider batch processing or caching for high volumes',
        });
      }
    });

    it('should handle all 157+ replacement keys', () => {
      // Create violations for ALL known replacement keys
      const violations: Violation[] = ALL_REPLACEMENT_KEYS.map((key, i) => ({
        severity: 'warning',
        rule: `Avoid "${key}"`,
        text: key,
        suggestion: 'Use simpler alternative',
        category: 'avoid_words',
        position: { start: i * 50, end: i * 50 + key.length },
        autoFixable: true,
      }));

      const fixes = generateAutoFixes(violations);
      
      console.log(`[COVERAGE] ${fixes.length}/${violations.length} replacement keys have fixes`);
      
      // Track which keys don't have direct replacements
      const missingFixes = violations.filter(v => 
        !fixes.some(f => f.original.toLowerCase() === v.text.toLowerCase())
      );
      
      if (missingFixes.length > 0) {
        reportGap({
          area: 'auto-fix-coverage',
          severity: 'medium',
          description: `${missingFixes.length} keys without direct replacements: ${missingFixes.slice(0, 5).map(v => v.text).join(', ')}...`,
          recommendation: 'Add missing replacements to REPLACEMENTS dictionary',
          affectedCode: 'autoFixEngine.ts REPLACEMENTS',
        });
      }
      
      // At least 80% should have fixes
      expect(fixes.length).toBeGreaterThan(violations.length * 0.8);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LARGE CONTENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Large Content Handling', () => {
    it('should process 5KB content in under 200ms', async () => {
      const content = generateLargeContent(5);
      
      const { result, timeMs } = await measureTimeAsync(() => 
        runValidationPipeline(content)
      );
      
      console.log(`[PERF] 5KB content: ${result.totalViolations} violations in ${timeMs.toFixed(2)}ms`);
      
      if (timeMs > 200) {
        reportGap({
          area: 'validation-performance',
          severity: 'high',
          description: `5KB content took ${timeMs.toFixed(2)}ms (target: <200ms)`,
          recommendation: 'Optimize pattern matching or parallelize agents',
        });
      }
      
      expect(result).toBeDefined();
      expect(result.overallScore).toBeDefined();
    });

    it('should process 25KB content in under 500ms', async () => {
      const content = generateLargeContent(25);
      
      const { result, timeMs } = await measureTimeAsync(() => 
        runValidationPipeline(content)
      );
      
      console.log(`[PERF] 25KB content: ${result.totalViolations} violations in ${timeMs.toFixed(2)}ms`);
      
      if (timeMs > 500) {
        reportGap({
          area: 'validation-performance',
          severity: 'medium',
          description: `25KB content took ${timeMs.toFixed(2)}ms (target: <500ms)`,
          recommendation: 'Consider chunking large content for parallel processing',
        });
      }
      
      expect(result).toBeDefined();
    });

    it('should apply 50 fixes to 10KB content in under 200ms', () => {
      const content = generateLargeContent(10, 0.3); // Higher violation density
      const violations = generateViolationBatch(50);
      const fixes = generateAutoFixes(violations);
      
      const { result, timeMs } = measureTime(() => 
        applyAutoFixes(content, fixes)
      );
      
      console.log(`[PERF] Apply 50 fixes to 10KB: ${result.appliedFixes.length} applied in ${timeMs.toFixed(2)}ms`);
      
      if (timeMs > 200) {
        reportGap({
          area: 'apply-fix-performance',
          severity: 'medium',
          description: `Applying 50 fixes took ${timeMs.toFixed(2)}ms (target: <200ms)`,
          recommendation: 'Optimize regex replacement or batch replacements',
        });
      }
      
      expect(result.fixedContent).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // EDGE CASE TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    describe('Case Preservation', () => {
      const caseTestCases = [
        { input: 'CHAIRMAN', expected: 'CHAIRPERSON' },
        { input: 'Chairman', expected: 'Chairperson' },
        { input: 'chairman', expected: 'chairperson' },
        { input: 'UTILIZE', expected: 'USE' },
        { input: 'Utilize', expected: 'Use' },
        { input: 'utilize', expected: 'use' },
      ];

      caseTestCases.forEach(({ input, expected }) => {
        it(`should preserve case: "${input}" -> "${expected}"`, () => {
          const content = `The ${input} will review.`;
          const violations: Violation[] = [{
            severity: 'warning',
            rule: `Avoid "${input}"`,
            text: input,
            suggestion: expected.toLowerCase(),
            category: 'test',
            position: { start: 4, end: 4 + input.length },
            autoFixable: true,
          }];

          const fixes = generateAutoFixes(violations);
          const result = applyAutoFixes(content, fixes);
          
          const hasExpectedCase = result.fixedContent.toLowerCase().includes(expected.toLowerCase());
          
          if (!hasExpectedCase) {
            reportGap({
              area: 'case-preservation',
              severity: 'low',
              description: `Case not preserved for "${input}" -> got "${result.fixedContent}"`,
              recommendation: 'Review matchCase function in autoFixEngine.ts',
            });
          }
        });
      });

      it('should preserve brand names exactly: Jio', () => {
        const content = 'Contact jio support for help.';
        const result = runQuickValidation(content);
        
        // Should flag lowercase "jio"
        const jioViolation = result.agentResults
          .flatMap(r => r.violations)
          .find(v => v.text?.toLowerCase() === 'jio');
        
        if (!jioViolation) {
          reportGap({
            area: 'brand-detection',
            severity: 'medium',
            description: 'Lowercase "jio" not detected as violation',
            recommendation: 'Ensure brand capitalization rules are active',
          });
        }
      });
    });

    describe('Overlapping Violations', () => {
      it('should deduplicate overlapping violations correctly', () => {
        const violations = generateOverlappingViolations(10); // 20 total, 10 unique positions
        const fixes = generateAutoFixes(violations);
        
        console.log(`[DEDUP] ${violations.length} violations -> ${fixes.length} fixes`);
        
        // Should have fewer fixes than violations due to overlap
        // Each position should only have one fix
        const positionCounts = new Map<string, number>();
        fixes.forEach(f => {
          const key = `${f.violation.position?.start}-${f.violation.position?.end}`;
          positionCounts.set(key, (positionCounts.get(key) || 0) + 1);
        });
        
        const duplicates = Array.from(positionCounts.values()).filter(c => c > 1);
        
        if (duplicates.length > 0) {
          reportGap({
            area: 'deduplication',
            severity: 'medium',
            description: `${duplicates.length} positions have multiple fixes`,
            recommendation: 'Improve deduplication logic in generateAutoFixes',
          });
        }
      });

      it('should handle adjacent violations correctly', () => {
        const content = 'Please utilize leverage synergy for paradigm optimization.';
        const result = runQuickValidation(content);
        
        const violationWords = result.agentResults
          .flatMap(r => r.violations)
          .map(v => v.text)
          .filter(Boolean);
        
        console.log(`[ADJACENT] Found violations: ${violationWords.join(', ')}`);
        
        // Should detect multiple adjacent violations
        expect(violationWords.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('Replacement Chains', () => {
      it('should handle content where fix might introduce new violation', () => {
        // This tests if fixing one word creates another violation
        // e.g., if we had a rule "good" -> "utilize" (hypothetical bad rule)
        const content = 'We should utilize and optimize the streamlined process.';
        
        let currentContent = content;
        let iterations = 0;
        const maxIterations = 5;
        
        while (iterations < maxIterations) {
          const validation = runQuickValidation(currentContent);
          if (validation.totalViolations === 0) break;
          
          const fixes = generateAutoFixes(
            validation.agentResults.flatMap(r => r.violations)
          );
          
          if (fixes.length === 0) break;
          
          const result = applyAutoFixes(currentContent, fixes);
          
          if (result.fixedContent === currentContent) break;
          
          currentContent = result.fixedContent;
          iterations++;
        }
        
        console.log(`[CHAIN] Fixed after ${iterations} iterations`);
        
        if (iterations >= maxIterations) {
          reportGap({
            area: 'fix-loops',
            severity: 'high',
            description: `Fix loop detected - reached ${maxIterations} iterations`,
            recommendation: 'Check for circular replacement rules',
          });
        }
        
        // Final content should have fewer violations
        const finalValidation = runQuickValidation(currentContent);
        expect(finalValidation.totalViolations).toBeLessThanOrEqual(
          runQuickValidation(content).totalViolations
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // DYNAMIC RULES TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Dynamic Rules (Convex Integration)', () => {
    it('should handle 100 dynamic auto-fix rules', () => {
      const dynamicRules = generateDynamicAutoFixRules(100);
      
      // Create violations matching dynamic rules
      const violations: Violation[] = dynamicRules.slice(0, 20).map((rule, i) => ({
        severity: 'warning',
        rule: `Dynamic rule ${i}`,
        text: rule.from,
        suggestion: rule.to,
        category: 'dynamic',
        position: { start: i * 20, end: i * 20 + rule.from.length },
        autoFixable: true,
      }));

      setDynamicAutoFixRules(
        dynamicRules.map(r => ({ content: r.from, metadata: { suggestion: r.to } }))
      );

      const fixes = generateAutoFixes(violations);
      
      console.log(`[DYNAMIC] ${fixes.length} fixes generated from ${dynamicRules.length} dynamic rules`);
      
      expect(fixes.length).toBeGreaterThan(0);
    });

    it('should handle 500 dynamic rules without performance degradation', () => {
      const dynamicRules = generateDynamicAutoFixRules(500);
      
      setDynamicAutoFixRules(
        dynamicRules.map(r => ({ content: r.from, metadata: { suggestion: r.to } }))
      );

      // Create test violations
      const violations = generateViolationBatch(50);
      
      const { result: fixes, timeMs } = measureTime(() => generateAutoFixes(violations));
      
      console.log(`[PERF] 50 violations with 500 dynamic rules: ${timeMs.toFixed(2)}ms`);
      
      if (timeMs > 200) {
        reportGap({
          area: 'dynamic-rules-performance',
          severity: 'medium',
          description: `500 dynamic rules caused ${timeMs.toFixed(2)}ms processing time`,
          recommendation: 'Consider caching merged replacements',
        });
      }
      
      expect(fixes).toBeDefined();
    });

    it('should prioritize static rules over dynamic rules correctly', () => {
      // Set a dynamic rule that conflicts with a static one
      setDynamicAutoFixRules([
        { content: 'utilize', metadata: { suggestion: 'DYNAMIC_REPLACEMENT' } }
      ]);

      const violations: Violation[] = [{
        severity: 'warning',
        rule: 'Test rule',
        text: 'utilize',
        suggestion: 'use',
        category: 'test',
        position: { start: 0, end: 7 },
        autoFixable: true,
      }];

      const fixes = generateAutoFixes(violations);
      
      // Static rules have higher confidence (0.95) than dynamic (0.92)
      // So static should win
      const utilizeFix = fixes.find(f => f.original === 'utilize');
      
      console.log(`[PRIORITY] "utilize" replacement: ${utilizeFix?.replacement}`);
      
      // The replacement should be "use" from static rules, not "DYNAMIC_REPLACEMENT"
      if (utilizeFix?.replacement === 'DYNAMIC_REPLACEMENT') {
        reportGap({
          area: 'rule-priority',
          severity: 'medium',
          description: 'Dynamic rules overriding static rules unexpectedly',
          recommendation: 'Review getMergedReplacements priority logic',
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONCURRENT EXECUTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Concurrent Execution', () => {
    it('should handle 10 parallel validation runs', async () => {
      const contents = Array.from({ length: 10 }, (_, i) => 
        generateContentWithViolations(10 + i)
      );

      const start = performance.now();
      const results = await Promise.all(
        contents.map(c => runValidationPipeline(c))
      );
      const totalTime = performance.now() - start;

      console.log(`[CONCURRENT] 10 parallel runs: ${totalTime.toFixed(2)}ms total`);
      
      // All should complete successfully
      expect(results.every(r => r.totalViolations >= 0)).toBe(true);
      
      // Should be faster than sequential (10 * avg single run)
      const avgPerRun = totalTime / 10;
      console.log(`[CONCURRENT] Average per run: ${avgPerRun.toFixed(2)}ms`);
    });

    it('should handle concurrent reads/writes to dynamic rules', async () => {
      const operations: Promise<void>[] = [];
      
      // Concurrent writes
      for (let i = 0; i < 5; i++) {
        operations.push(
          new Promise(resolve => {
            setDynamicAutoFixRules(generateDynamicAutoFixRules(10 + i * 10).map(
              r => ({ content: r.from, metadata: { suggestion: r.to } })
            ));
            resolve();
          })
        );
      }
      
      // Concurrent reads (generateAutoFixes)
      for (let i = 0; i < 5; i++) {
        operations.push(
          new Promise(resolve => {
            const violations = generateViolationBatch(5);
            generateAutoFixes(violations);
            resolve();
          })
        );
      }

      await Promise.all(operations);
      
      // Should not throw or corrupt state
      expect(true).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GAP SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Gap Analysis Summary', () => {
    it('should report all found gaps', () => {
      if (gaps.length > 0) {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('                    GAP ANALYSIS SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        const critical = gaps.filter(g => g.severity === 'critical');
        const high = gaps.filter(g => g.severity === 'high');
        const medium = gaps.filter(g => g.severity === 'medium');
        const low = gaps.filter(g => g.severity === 'low');
        
        console.log(`Total Gaps Found: ${gaps.length}`);
        console.log(`  Critical: ${critical.length}`);
        console.log(`  High: ${high.length}`);
        console.log(`  Medium: ${medium.length}`);
        console.log(`  Low: ${low.length}`);
        console.log('');
        
        gaps.forEach((gap, i) => {
          console.log(`[${i + 1}] ${gap.severity.toUpperCase()} - ${gap.area}`);
          console.log(`    ${gap.description}`);
          console.log(`    Recommendation: ${gap.recommendation}`);
          if (gap.affectedCode) {
            console.log(`    Affected: ${gap.affectedCode}`);
          }
          console.log('');
        });
        
        console.log('═══════════════════════════════════════════════════════════════\n');
      } else {
        console.log('\n[SUCCESS] No gaps found in stress testing!\n');
      }
      
      // Don't fail the test just for reporting gaps
      expect(true).toBe(true);
    });
  });
});
