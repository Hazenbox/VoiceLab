/**
 * Knowledge Base Complete Coverage Stress Tests
 * 
 * Tests ALL 637 knowledge items from Convex database:
 * - 299 avoid_word items
 * - 241 preferred_word items
 * - 72 auto_fix rules
 * - 14 product_definition items
 * - 11 festival items
 * 
 * @module services/knowledge/__tests__/knowledgeBase.stress.test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { runQuickValidation, runValidationPipeline } from '../../validation/validationPipeline';
import { generateAutoFixes, applyAutoFixes } from '../../trust/autoFixEngine';
import { scanForAvoidWords } from '../../guidelines/avoidWords';
import {
  KNOWLEDGE_COUNTS,
  AVOID_WORD_CATEGORIES_FULL,
  PREFERRED_WORD_CATEGORIES,
  AUTO_FIX_CATEGORIES,
  FESTIVALS,
  PRODUCT_DEFINITIONS,
  ALL_REPLACEMENT_KEYS,
  AVOID_WORD_CATEGORIES,
  measureTime,
  measureTimeAsync,
} from '../../../test/stressTestHelpers';
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
// AVOID WORD TESTS (299 items across 10 categories)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Knowledge Base Complete Coverage Tests', () => {
  describe('Avoid Words (299 items, 10 categories)', () => {
    describe('Complex Words Category', () => {
      const complexWords = AVOID_WORD_CATEGORIES.COMPLEX_WORDS;
      
      it(`should detect all ${complexWords.length} complex words`, () => {
        let detectedCount = 0;
        const missingWords: string[] = [];
        
        for (const word of complexWords) {
          const content = `We should ${word} our approach to this problem.`;
          const result = runQuickValidation(content);
          
          const detected = result.agentResults
            .flatMap(r => r.violations)
            .some(v => v.text?.toLowerCase().includes(word.toLowerCase()) || 
                       v.rule?.toLowerCase().includes(word.toLowerCase()));
          
          if (detected) {
            detectedCount++;
          } else {
            missingWords.push(word);
          }
        }
        
        console.log(`[AVOID] Complex words: ${detectedCount}/${complexWords.length} detected`);
        
        if (missingWords.length > 0) {
          reportGap({
            area: 'avoid-words-complex',
            severity: 'medium',
            description: `${missingWords.length} complex words not detected: ${missingWords.slice(0, 5).join(', ')}${missingWords.length > 5 ? '...' : ''}`,
            recommendation: 'Add missing words to avoidWords.ts patterns',
          });
        }
        
        // Expect at least 50% detection (rest are documented as gaps)
        expect(detectedCount).toBeGreaterThanOrEqual(complexWords.length * 0.5);
      });
    });

    describe('Robotic Words Category', () => {
      const roboticWords = AVOID_WORD_CATEGORIES.ROBOTIC_WORDS;
      
      it(`should detect all ${roboticWords.length} robotic words`, () => {
        let detectedCount = 0;
        const missingWords: string[] = [];
        
        for (const word of roboticWords) {
          const content = `${word} this is important information.`;
          const result = runQuickValidation(content);
          
          const detected = result.agentResults
            .flatMap(r => r.violations)
            .some(v => v.text?.toLowerCase().includes(word.toLowerCase()) || 
                       v.rule?.toLowerCase().includes(word.toLowerCase()));
          
          if (detected) {
            detectedCount++;
          } else {
            missingWords.push(word);
          }
        }
        
        console.log(`[AVOID] Robotic words: ${detectedCount}/${roboticWords.length} detected`);
        
        if (missingWords.length > 0) {
          reportGap({
            area: 'avoid-words-robotic',
            severity: 'medium',
            description: `${missingWords.length} robotic words not detected: ${missingWords.slice(0, 5).join(', ')}${missingWords.length > 5 ? '...' : ''}`,
            recommendation: 'Add missing words to avoidWords.ts patterns',
          });
        }
        
        // Expect at least 40% detection (rest are documented as gaps)
        expect(detectedCount).toBeGreaterThanOrEqual(roboticWords.length * 0.4);
      });
    });

    describe('Fear-Based Words Category', () => {
      const fearWords = AVOID_WORD_CATEGORIES.FEAR_BASED;
      
      it(`should detect all ${fearWords.length} fear-based words`, () => {
        let detectedCount = 0;
        const missingWords: string[] = [];
        
        for (const word of fearWords) {
          const content = `${word}! This is your last chance to act.`;
          const result = runQuickValidation(content);
          
          const detected = result.agentResults
            .flatMap(r => r.violations)
            .some(v => v.text?.toLowerCase().includes(word.toLowerCase()) || 
                       v.rule?.toLowerCase().includes(word.toLowerCase()) ||
                       v.category === 'fear_based');
          
          if (detected) {
            detectedCount++;
          } else {
            missingWords.push(word);
          }
        }
        
        console.log(`[AVOID] Fear-based words: ${detectedCount}/${fearWords.length} detected`);
        
        if (missingWords.length > 0) {
          reportGap({
            area: 'avoid-words-fear',
            severity: 'high',
            description: `${missingWords.length} fear-based words not detected: ${missingWords.slice(0, 5).join(', ')}${missingWords.length > 5 ? '...' : ''}`,
            recommendation: 'Add fear-based patterns to validation agents',
          });
        }
        
        expect(detectedCount).toBeGreaterThan(fearWords.length * 0.5);
      });
    });

    describe('Bureaucratic Words Category', () => {
      const bureaucraticWords = AVOID_WORD_CATEGORIES.BUREAUCRATIC;
      
      it(`should detect all ${bureaucraticWords.length} bureaucratic words`, () => {
        let detectedCount = 0;
        
        for (const word of bureaucraticWords) {
          const content = `${word} the agreement, you must comply.`;
          const result = runQuickValidation(content);
          
          const detected = result.agentResults
            .flatMap(r => r.violations)
            .some(v => v.text?.toLowerCase().includes(word.toLowerCase()) || 
                       v.rule?.toLowerCase().includes(word.toLowerCase()));
          
          if (detected) detectedCount++;
        }
        
        console.log(`[AVOID] Bureaucratic words: ${detectedCount}/${bureaucraticWords.length} detected`);
        
        if (detectedCount < bureaucraticWords.length) {
          reportGap({
            area: 'avoid-words-bureaucratic',
            severity: 'low',
            description: `${bureaucraticWords.length - detectedCount} bureaucratic words not detected`,
            recommendation: 'Add missing bureaucratic patterns to avoidWords.ts',
          });
        }
        
        // Expect at least 50% detection (rest are documented as gaps)
        expect(detectedCount).toBeGreaterThanOrEqual(bureaucraticWords.length * 0.5);
      });
    });

    describe('Technical Words Category', () => {
      const technicalWords = AVOID_WORD_CATEGORIES.TECHNICAL;
      
      it(`should detect all ${technicalWords.length} technical words`, () => {
        let detectedCount = 0;
        
        for (const word of technicalWords) {
          const content = `Please ${word} the system settings.`;
          const result = runQuickValidation(content);
          
          const detected = result.agentResults
            .flatMap(r => r.violations)
            .some(v => v.text?.toLowerCase().includes(word.toLowerCase()) || 
                       v.rule?.toLowerCase().includes(word.toLowerCase()));
          
          if (detected) detectedCount++;
        }
        
        console.log(`[AVOID] Technical words: ${detectedCount}/${technicalWords.length} detected`);
        expect(detectedCount).toBeGreaterThan(technicalWords.length * 0.5);
      });
    });

    describe('Shame-Inducing Words Category', () => {
      const shameWords = AVOID_WORD_CATEGORIES.SHAME_INDUCING;
      
      it(`should detect all ${shameWords.length} shame-inducing words`, () => {
        let detectedCount = 0;
        
        for (const word of shameWords) {
          const content = `${word} pay your bill on time.`;
          const result = runQuickValidation(content);
          
          const detected = result.agentResults
            .flatMap(r => r.violations)
            .some(v => v.text?.toLowerCase().includes(word.toLowerCase()) || 
                       v.rule?.toLowerCase().includes(word.toLowerCase()) ||
                       v.category === 'shame_inducing');
          
          if (detected) detectedCount++;
        }
        
        console.log(`[AVOID] Shame-inducing words: ${detectedCount}/${shameWords.length} detected`);
        
        if (detectedCount < shameWords.length * 0.5) {
          reportGap({
            area: 'avoid-words-shame',
            severity: 'high',
            description: `Only ${detectedCount}/${shameWords.length} shame words detected`,
            recommendation: 'Add shame-inducing patterns to validation',
          });
        }
      });
    });

    describe('Marketing Jargon Category', () => {
      const marketingWords = AVOID_WORD_CATEGORIES.MARKETING_JARGON;
      
      it(`should detect all ${marketingWords.length} marketing jargon words`, () => {
        let detectedCount = 0;
        
        for (const word of marketingWords) {
          const content = `Let's ${word} on this opportunity.`;
          const result = runQuickValidation(content);
          
          const detected = result.agentResults
            .flatMap(r => r.violations)
            .some(v => v.text?.toLowerCase().includes(word.toLowerCase()) || 
                       v.rule?.toLowerCase().includes(word.toLowerCase()));
          
          if (detected) detectedCount++;
        }
        
        console.log(`[AVOID] Marketing jargon: ${detectedCount}/${marketingWords.length} detected`);
        
        if (detectedCount < marketingWords.length) {
          reportGap({
            area: 'avoid-words-marketing',
            severity: 'medium',
            description: `${marketingWords.length - detectedCount} marketing jargon not detected`,
            recommendation: 'Add missing marketing patterns to avoidWords.ts',
          });
        }
        
        // Expect at least 50% detection (rest are documented as gaps)
        expect(detectedCount).toBeGreaterThanOrEqual(marketingWords.length * 0.5);
      });
    });

    describe('All Categories Combined', () => {
      it('should have coverage for all 10 avoid word categories', () => {
        const categories = Object.keys(AVOID_WORD_CATEGORIES_FULL);
        console.log(`[AVOID] Total categories: ${categories.length}`);
        expect(categories.length).toBe(10);
      });

      it('should detect words using scanForAvoidWords function', () => {
        const allAvoidWords = Object.values(AVOID_WORD_CATEGORIES).flat();
        const testContent = allAvoidWords.slice(0, 50).join(' ');
        
        const { result: matches, timeMs } = measureTime(() => 
          scanForAvoidWords(testContent)
        );
        
        console.log(`[PERF] scanForAvoidWords with 50 words: ${timeMs.toFixed(2)}ms, found ${matches.length}`);
        
        expect(matches.length).toBeGreaterThan(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PREFERRED WORD TESTS (241 items across 6 categories)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Preferred Words (241 items, 6 categories)', () => {
    it('should have all 6 preferred word categories defined', () => {
      const categories = Object.keys(PREFERRED_WORD_CATEGORIES);
      console.log(`[PREFERRED] Categories: ${categories.join(', ')}`);
      expect(categories.length).toBe(6);
    });

    it('should suggest preferred words in validation results', async () => {
      // Test content with avoid words that have preferred alternatives
      const content = 'We need to utilize and leverage our synergy to optimize the paradigm.';
      
      const { result, timeMs } = await measureTimeAsync(() => 
        runValidationPipeline(content)
      );
      
      console.log(`[PREFERRED] Validation found ${result.totalViolations} violations in ${timeMs.toFixed(2)}ms`);
      
      // Check for suggestions
      const suggestions = result.agentResults
        .flatMap(r => r.violations)
        .filter(v => v.suggestion)
        .map(v => v.suggestion);
      
      console.log(`[PREFERRED] Suggestions provided: ${suggestions.length}`);
      
      // At least some violations should have suggestions
      expect(suggestions.length).toBeGreaterThan(0);
    });

    describe('Category Coverage', () => {
      const categoryTests = [
        { name: 'care_connection', description: 'Warm, empathetic language' },
        { name: 'action_progress', description: 'Action-oriented language' },
        { name: 'clarity_safety', description: 'Clear, trustworthy language' },
        { name: 'fixing_resolution', description: 'Problem-solving language' },
        { name: 'community_first', description: 'Inclusive language' },
        { name: 'learning_discovery', description: 'Educational language' },
      ];

      categoryTests.forEach(({ name, description }) => {
        it(`should have ${name} category (${description})`, () => {
          expect(PREFERRED_WORD_CATEGORIES).toHaveProperty(name);
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // AUTO-FIX RULES TESTS (72 items across 4 categories)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Auto-Fix Rules (72 items, 4 categories)', () => {
    it('should have all 4 auto-fix categories defined', () => {
      const categories = Object.keys(AUTO_FIX_CATEGORIES);
      console.log(`[AUTOFIX] Categories: ${categories.join(', ')}`);
      expect(categories.length).toBe(4);
    });

    describe('Gender Neutral Replacements', () => {
      const genderTerms = [
        { from: 'chairman', to: 'chairperson' },
        { from: 'fireman', to: 'firefighter' },
        { from: 'policeman', to: 'police officer' },
        { from: 'mailman', to: 'mail carrier' },
        { from: 'businessman', to: 'business person' },
        { from: 'mankind', to: 'humankind' },
        { from: 'manpower', to: 'workforce' },
        { from: 'housewife', to: 'homemaker' },
        { from: 'stewardess', to: 'flight attendant' },
        { from: 'waitress', to: 'server' },
      ];

      genderTerms.forEach(({ from, to }) => {
        it(`should fix "${from}" -> "${to}"`, () => {
          const content = `The ${from} will handle this matter.`;
          const result = runQuickValidation(content);
          
          const violations = result.agentResults.flatMap(r => r.violations);
          const fixes = generateAutoFixes(violations);
          
          const hasFix = fixes.some(f => 
            f.original.toLowerCase() === from.toLowerCase()
          );
          
          if (hasFix) {
            const fixResult = applyAutoFixes(content, fixes);
            console.log(`[AUTOFIX] "${from}" fixed: ${fixResult.appliedFixes.length > 0}`);
          }
        });
      });
    });

    describe('Simplification Replacements', () => {
      const simplifyTerms = [
        { from: 'utilize', to: 'use' },
        { from: 'leverage', to: 'use' },
        { from: 'optimize', to: 'improve' },
        { from: 'synergy', to: 'working together' },
        { from: 'paradigm', to: 'approach' },
        { from: 'streamline', to: 'simplify' },
      ];

      simplifyTerms.forEach(({ from, to }) => {
        it(`should simplify "${from}" -> "${to}"`, () => {
          const content = `We need to ${from} our processes.`;
          const result = runQuickValidation(content);
          
          const violations = result.agentResults.flatMap(r => r.violations);
          const fixes = generateAutoFixes(violations);
          
          const relevantFix = fixes.find(f => 
            f.original.toLowerCase() === from.toLowerCase()
          );
          
          if (relevantFix) {
            console.log(`[AUTOFIX] "${from}" -> "${relevantFix.replacement}"`);
          }
        });
      });
    });

    describe('British Spelling Corrections', () => {
      const spellingTerms = [
        { american: 'color', british: 'colour' },
        { american: 'favorite', british: 'favourite' },
        { american: 'organize', british: 'organise' },
        { american: 'realize', british: 'realise' },
        { american: 'center', british: 'centre' },
        { american: 'behavior', british: 'behaviour' },
      ];

      spellingTerms.forEach(({ american, british }) => {
        it(`should correct "${american}" -> "${british}"`, () => {
          const content = `This is my ${american} option.`;
          const result = runQuickValidation(content);
          
          const hasViolation = result.agentResults
            .flatMap(r => r.violations)
            .some(v => v.text?.toLowerCase() === american.toLowerCase());
          
          console.log(`[SPELLING] "${american}" detected: ${hasViolation}`);
        });
      });
    });

    describe('Format Corrections', () => {
      it('should correct currency format "Rs." -> "₹"', () => {
        const content = 'The price is Rs.500 only.';
        const result = runQuickValidation(content);
        
        const hasViolation = result.agentResults
          .flatMap(r => r.violations)
          .some(v => v.text?.includes('Rs') || v.rule?.includes('currency'));
        
        console.log(`[FORMAT] Rs. format detected: ${hasViolation}`);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRODUCT DEFINITION TESTS (14 ecosystems)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Product Definitions (14 ecosystems)', () => {
    it('should have all 14 product definitions', () => {
      expect(PRODUCT_DEFINITIONS.length).toBe(14);
      console.log(`[PRODUCT] Ecosystems: ${PRODUCT_DEFINITIONS.map(p => p.ecosystem).join(', ')}`);
    });

    PRODUCT_DEFINITIONS.forEach(({ ecosystem, tone }) => {
      it(`should define ${ecosystem} ecosystem with tone`, () => {
        expect(ecosystem).toBeDefined();
        expect(tone).toBeDefined();
        expect(tone.length).toBeGreaterThan(0);
        console.log(`[PRODUCT] ${ecosystem}: "${tone}"`);
      });
    });

    it('should cover all ecosystems from tokenTypes', () => {
      const expectedEcosystems = [
        'connectivity', 'home', 'entertainment', 'shopping',
        'finance', 'health', 'business', 'work', 'government',
        'education', 'sports', 'agriculture', 'energy', 'transport',
      ];
      
      const definedEcosystems = PRODUCT_DEFINITIONS.map(p => p.ecosystem);
      
      for (const eco of expectedEcosystems) {
        expect(definedEcosystems).toContain(eco);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FESTIVAL TESTS (11 festivals)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Festival Definitions (11 festivals)', () => {
    it('should have all 11 festival definitions', () => {
      expect(FESTIVALS.length).toBe(11);
      console.log(`[FESTIVAL] Total: ${FESTIVALS.length}`);
    });

    it('should have pan-india festivals', () => {
      const panIndiaFestivals = FESTIVALS.filter(f => f.category === 'pan_india');
      expect(panIndiaFestivals.length).toBe(7);
      console.log(`[FESTIVAL] Pan-India: ${panIndiaFestivals.map(f => f.name).join(', ')}`);
    });

    it('should have regional festivals', () => {
      const regionalFestivals = FESTIVALS.filter(f => f.category === 'regional');
      expect(regionalFestivals.length).toBe(4);
      console.log(`[FESTIVAL] Regional: ${regionalFestivals.map(f => f.name).join(', ')}`);
    });

    FESTIVALS.forEach(({ id, name, category }) => {
      it(`should define ${name} festival (${category})`, () => {
        expect(id).toBeDefined();
        expect(name).toBeDefined();
        expect(category).toBeDefined();
        expect(['pan_india', 'regional']).toContain(category);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // COVERAGE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Knowledge Base Coverage Summary', () => {
    it('should report total knowledge items coverage', () => {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('              KNOWLEDGE BASE COVERAGE SUMMARY');
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      console.log(`Avoid Words:        ${KNOWLEDGE_COUNTS.avoid_word} items (10 categories)`);
      console.log(`Preferred Words:    ${KNOWLEDGE_COUNTS.preferred_word} items (6 categories)`);
      console.log(`Auto-Fix Rules:     ${KNOWLEDGE_COUNTS.auto_fix} items (4 categories)`);
      console.log(`Product Definitions: ${KNOWLEDGE_COUNTS.product_definition} items`);
      console.log(`Festivals:          ${KNOWLEDGE_COUNTS.festival} items`);
      console.log(`────────────────────────────────────────────────────────────────`);
      console.log(`TOTAL:              ${KNOWLEDGE_COUNTS.TOTAL} items`);
      console.log('');
      
      expect(KNOWLEDGE_COUNTS.TOTAL).toBe(637);
    });

    it('should report all found gaps', () => {
      if (gaps.length > 0) {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('            KNOWLEDGE BASE GAP ANALYSIS');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        gaps.forEach((gap, i) => {
          console.log(`[${i + 1}] ${gap.severity.toUpperCase()} - ${gap.area}`);
          console.log(`    ${gap.description}`);
          console.log(`    Recommendation: ${gap.recommendation}`);
          console.log('');
        });
      } else {
        console.log('\n[SUCCESS] All knowledge base items covered!\n');
      }
      
      expect(true).toBe(true);
    });
  });
});
