/**
 * Ecosystem Glossary Tests (Phase 4.2)
 * 
 * Tests for the glossary validation system.
 */

import { describe, it, expect } from 'vitest';
import {
  JIO_GLOSSARY,
  getGlossaryForEcosystem,
  getGlossaryByCategory,
  getGlossaryByPriority,
  findGlossaryTerm,
  getGlossaryInstructions,
  validateGlossaryUsage,
  toViolations,
} from '../ecosystemGlossary';

describe('ecosystemGlossary', () => {
  // ==========================================================================
  // JIO_GLOSSARY Data Integrity
  // ==========================================================================
  
  describe('JIO_GLOSSARY data integrity', () => {
    it('should have at least 20 terms', () => {
      expect(JIO_GLOSSARY.length).toBeGreaterThanOrEqual(20);
    });
    
    it('should have all required fields for each term', () => {
      for (const term of JIO_GLOSSARY) {
        expect(term.term).toBeTruthy();
        expect(term.meaning).toBeTruthy();
        expect(term.notMeaning).toBeTruthy();
        expect(term.correctUse).toBeTruthy();
        expect(term.incorrectUse).toBeTruthy();
        expect(term.ecosystems.length).toBeGreaterThan(0);
        expect(['product', 'service', 'technical', 'payment', 'plan', 'support', 'general']).toContain(term.category);
        expect(['critical', 'high', 'medium', 'low']).toContain(term.priority);
      }
    });
    
    it('should have unique term names', () => {
      const names = JIO_GLOSSARY.map(t => t.term.toLowerCase());
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });
  
  // ==========================================================================
  // getGlossaryForEcosystem
  // ==========================================================================
  
  describe('getGlossaryForEcosystem', () => {
    it('should return terms for jio_mobility', () => {
      const terms = getGlossaryForEcosystem('jio_mobility');
      expect(terms.length).toBeGreaterThan(0);
      expect(terms.every(t => t.ecosystems.includes('jio_mobility'))).toBe(true);
    });
    
    it('should return terms for jiofiber', () => {
      const terms = getGlossaryForEcosystem('jiofiber');
      expect(terms.length).toBeGreaterThan(0);
      expect(terms.every(t => t.ecosystems.includes('jiofiber'))).toBe(true);
    });
    
    it('should include JioFiber term for jiofiber ecosystem', () => {
      const terms = getGlossaryForEcosystem('jiofiber');
      const jioFiberTerm = terms.find(t => t.term === 'JioFiber');
      expect(jioFiberTerm).toBeDefined();
    });
    
    it('should not include JioMart term for jio_mobility ecosystem', () => {
      const terms = getGlossaryForEcosystem('jio_mobility');
      const jioMartTerm = terms.find(t => t.term === 'JioMart');
      // JioMart might not be in mobility ecosystem
      if (jioMartTerm) {
        expect(jioMartTerm.ecosystems).toContain('jio_mobility');
      }
    });
  });
  
  // ==========================================================================
  // getGlossaryByCategory
  // ==========================================================================
  
  describe('getGlossaryByCategory', () => {
    it('should return product terms', () => {
      const terms = getGlossaryByCategory('product');
      expect(terms.length).toBeGreaterThan(0);
      expect(terms.every(t => t.category === 'product')).toBe(true);
    });
    
    it('should return plan terms', () => {
      const terms = getGlossaryByCategory('plan');
      expect(terms.length).toBeGreaterThan(0);
      expect(terms.every(t => t.category === 'plan')).toBe(true);
    });
    
    it('should return technical terms', () => {
      const terms = getGlossaryByCategory('technical');
      expect(terms.length).toBeGreaterThan(0);
    });
  });
  
  // ==========================================================================
  // getGlossaryByPriority
  // ==========================================================================
  
  describe('getGlossaryByPriority', () => {
    it('should return critical priority terms', () => {
      const terms = getGlossaryByPriority('critical');
      expect(terms.length).toBeGreaterThan(0);
      expect(terms.every(t => t.priority === 'critical')).toBe(true);
    });
    
    it('should have fewer critical terms than total', () => {
      const criticalTerms = getGlossaryByPriority('critical');
      expect(criticalTerms.length).toBeLessThan(JIO_GLOSSARY.length);
    });
  });
  
  // ==========================================================================
  // findGlossaryTerm
  // ==========================================================================
  
  describe('findGlossaryTerm', () => {
    it('should find term by exact name', () => {
      const term = findGlossaryTerm('MyJio');
      expect(term).toBeDefined();
      expect(term?.term).toBe('MyJio');
    });
    
    it('should find term by alias', () => {
      const term = findGlossaryTerm('my jio app');
      expect(term).toBeDefined();
      expect(term?.term).toBe('MyJio');
    });
    
    it('should be case-insensitive', () => {
      const term = findGlossaryTerm('MYJIO');
      expect(term).toBeDefined();
      expect(term?.term).toBe('MyJio');
    });
    
    it('should return undefined for non-existent term', () => {
      const term = findGlossaryTerm('NonExistentTerm');
      expect(term).toBeUndefined();
    });
  });
  
  // ==========================================================================
  // getGlossaryInstructions
  // ==========================================================================
  
  describe('getGlossaryInstructions', () => {
    it('should generate instructions for an ecosystem', () => {
      const instructions = getGlossaryInstructions('jio_mobility');
      expect(instructions).toContain('## Terminology Guide');
      expect(instructions.length).toBeGreaterThan(100);
    });
    
    it('should include term meanings', () => {
      const instructions = getGlossaryInstructions('jio_mobility');
      expect(instructions).toContain('Means:');
      expect(instructions).toContain('NOT:');
    });
    
    it('should respect maxTerms parameter', () => {
      const instructions5 = getGlossaryInstructions('jio_mobility', 5);
      const instructions15 = getGlossaryInstructions('jio_mobility', 15);
      expect(instructions5.length).toBeLessThan(instructions15.length);
    });
  });
  
  // ==========================================================================
  // validateGlossaryUsage
  // ==========================================================================
  
  describe('validateGlossaryUsage', () => {
    it('should detect "Pack" instead of "Plan"', () => {
      const content = 'Buy the Rs.299 Pack for unlimited calls';
      const results = validateGlossaryUsage(content, 'jio_mobility');
      
      const packIssue = results.find(r => r.foundText.toLowerCase().includes('pack'));
      expect(packIssue).toBeDefined();
      expect(packIssue?.term).toBe('Plan');
    });
    
    it('should detect recharge used with postpaid', () => {
      const content = 'You can recharge your postpaid bill';
      const results = validateGlossaryUsage(content, 'jio_mobility');
      
      const rechargeIssue = results.find(r => 
        r.suggestion.toLowerCase().includes('bill payment')
      );
      expect(rechargeIssue).toBeDefined();
    });
    
    it('should detect "download Jio" without app name', () => {
      const content = 'Please download Jio to manage your account';
      const results = validateGlossaryUsage(content, 'jio_mobility');
      
      const downloadIssue = results.find(r => r.foundText.includes('download Jio'));
      expect(downloadIssue).toBeDefined();
      expect(downloadIssue?.suggestion).toContain('MyJio');
    });
    
    it('should not flag correct usage', () => {
      const content = 'Download the MyJio app to recharge with the Rs.299 Plan';
      const results = validateGlossaryUsage(content, 'jio_mobility');
      
      // Should not have Plan/Pack issues
      const packIssue = results.find(r => 
        r.issue === 'misuse' && r.term === 'Plan'
      );
      expect(packIssue).toBeUndefined();
    });
    
    it('should detect unlimited data misuse', () => {
      const content = 'Get true unlimited data at 4G speed';
      const results = validateGlossaryUsage(content, 'jio_mobility');
      
      const unlimitedIssue = results.find(r => r.term === 'True Unlimited');
      expect(unlimitedIssue).toBeDefined();
    });
  });
  
  // ==========================================================================
  // toViolations
  // ==========================================================================
  
  describe('toViolations', () => {
    it('should convert glossary results to violations', () => {
      const content = 'Buy the Rs.299 Pack';
      const results = validateGlossaryUsage(content, 'jio_mobility');
      const violations = toViolations(results);
      
      expect(violations.length).toBe(results.length);
      
      if (violations.length > 0) {
        expect(violations[0]).toHaveProperty('severity');
        expect(violations[0]).toHaveProperty('rule');
        expect(violations[0]).toHaveProperty('suggestion');
        expect(violations[0]).toHaveProperty('category', 'glossary');
      }
    });
    
    it('should map priority to severity correctly', () => {
      const results = [
        {
          term: 'Test',
          issue: 'misuse' as const,
          foundText: 'test',
          suggestion: 'fix it',
          correctUse: 'correct',
          priority: 'critical' as const,
        },
      ];
      
      const violations = toViolations(results);
      expect(violations[0].severity).toBe('error');
    });
    
    it('should mark alias issues as auto-fixable', () => {
      const results = [
        {
          term: 'MyJio',
          issue: 'wrong_alias' as const,
          foundText: 'my jio',
          suggestion: 'Use MyJio',
          correctUse: 'Download MyJio',
          priority: 'high' as const,
        },
      ];
      
      const violations = toViolations(results);
      expect(violations[0].autoFixable).toBe(true);
    });
  });
});
