/**
 * Avoid Words Validation Tests
 * 
 * Tests for Phase 2 validation fixes:
 * 1. Word-boundary matching (no false positives)
 * 2. Agent weights sum to 100
 * 3. Avoid words agent detects forbidden words
 */

import { describe, it, expect } from 'vitest';
import { scanForAvoidWords, WORD_CATEGORIES } from '../guidelines/avoidWords';
import { AGENT_WEIGHTS, DEFAULT_VALIDATION_CONFIG } from './types';
import { avoidWordsAgent } from './agents/avoidWordsAgent';

describe('scanForAvoidWords', () => {
  describe('word-boundary matching', () => {
    it('should NOT match "just" inside "adjust"', () => {
      const results = scanForAvoidWords('Please adjust your settings');
      const justMatches = results.filter(r => r.word.toLowerCase() === 'just');
      expect(justMatches).toHaveLength(0);
    });

    it('should NOT match "just" inside "justice"', () => {
      const results = scanForAvoidWords('We believe in justice for all');
      const justMatches = results.filter(r => r.word.toLowerCase() === 'just');
      expect(justMatches).toHaveLength(0);
    });

    it('should NOT match "just" inside "justify"', () => {
      const results = scanForAvoidWords('We cannot justify this decision');
      const justMatches = results.filter(r => r.word.toLowerCase() === 'just');
      expect(justMatches).toHaveLength(0);
    });

    it('SHOULD match standalone "just"', () => {
      const results = scanForAvoidWords('It is just a test');
      const justMatches = results.filter(r => r.word.toLowerCase() === 'just');
      expect(justMatches.length).toBeGreaterThan(0);
    });

    it('should match "avail" as a standalone word', () => {
      const results = scanForAvoidWords('You can avail this offer today');
      const availMatches = results.filter(r => r.word.toLowerCase() === 'avail');
      expect(availMatches.length).toBeGreaterThan(0);
    });

    it('should match "utilize" and report correct position', () => {
      const content = 'Please utilize this feature';
      const results = scanForAvoidWords(content);
      const utilizeMatches = results.filter(r => r.word.toLowerCase() === 'utilize');
      
      expect(utilizeMatches.length).toBeGreaterThan(0);
      expect(utilizeMatches[0].position.start).toBe(content.indexOf('utilize'));
      expect(utilizeMatches[0].position.end).toBe(content.indexOf('utilize') + 'utilize'.length);
    });

    it('should match "deep dive" as a phrase', () => {
      // "click here" is an accessibility issue (allAgents.ts), not an avoid word
      // "deep dive" is a complex jargon phrase in COMPLEX_WORDS
      const results = scanForAvoidWords('Let me do a deep dive into this topic');
      const deepDiveMatches = results.filter(r => r.word.toLowerCase() === 'deep dive');
      expect(deepDiveMatches.length).toBeGreaterThan(0);
    });
  });

  describe('case insensitivity', () => {
    it('should match "Utilize" (capitalized)', () => {
      const results = scanForAvoidWords('Utilize this feature');
      const matches = results.filter(r => r.word.toLowerCase() === 'utilize');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should match "LEVERAGE" (all caps)', () => {
      const results = scanForAvoidWords('LEVERAGE your resources');
      const matches = results.filter(r => r.word.toLowerCase() === 'leverage');
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('severity categories', () => {
    it('should mark fear-based words as errors', () => {
      const results = scanForAvoidWords('Act now or you will lose out');
      const fearWords = results.filter(r => r.category === 'Fear-Based Words');
      
      expect(fearWords.length).toBeGreaterThan(0);
      expect(fearWords.some(w => w.severity === 'error')).toBe(true);
    });

    it('should mark all avoid words as errors (strict mode)', () => {
      // All avoid word categories should now be errors (not warnings)
      // This ensures full brand compliance
      const results = scanForAvoidWords('We will leverage synergy to move the needle');
      const complexWords = results.filter(r => r.category === 'Complex Words');
      
      expect(complexWords.length).toBeGreaterThan(0);
      expect(complexWords.every(w => w.severity === 'error')).toBe(true);
    });
  });
});

describe('AGENT_WEIGHTS', () => {
  it('should sum to exactly 100', () => {
    const sum = Object.values(AGENT_WEIGHTS).reduce((acc, weight) => acc + weight, 0);
    expect(sum).toBe(100);
  });

  it('should include avoid_words agent', () => {
    expect(AGENT_WEIGHTS.avoid_words).toBeDefined();
    expect(AGENT_WEIGHTS.avoid_words).toBeGreaterThan(0);
  });

  it('should have 9 agents total', () => {
    const agentCount = Object.keys(AGENT_WEIGHTS).length;
    expect(agentCount).toBe(9);
  });
});

describe('DEFAULT_VALIDATION_CONFIG', () => {
  it('should include avoid_words in enabled agents', () => {
    expect(DEFAULT_VALIDATION_CONFIG.enabledAgents).toContain('avoid_words');
  });
});

describe('avoidWordsAgent', () => {
  it('should have correct agent ID', () => {
    expect(avoidWordsAgent.id).toBe('avoid_words');
  });

  it('should detect "avail" violation', () => {
    const violations = avoidWordsAgent.runPatternValidation('You can avail this offer');
    const availViolation = violations.find(v => v.text.toLowerCase() === 'avail');
    
    expect(availViolation).toBeDefined();
    expect(availViolation?.autoFixable).toBe(true);
  });

  it('should detect "leverage" violation', () => {
    // "click here" is caught by accessibility agent, not avoid_words agent
    const violations = avoidWordsAgent.runPatternValidation('We can leverage this opportunity');
    const leverageViolation = violations.find(v => v.text.toLowerCase() === 'leverage');
    
    expect(leverageViolation).toBeDefined();
  });

  it('should calculate score correctly', () => {
    // No violations = 100
    const noViolations = avoidWordsAgent.calculateScore([]);
    expect(noViolations).toBe(100);

    // With warnings (7 points each)
    const warningViolations = avoidWordsAgent.runPatternValidation('Utilize leverage synergy');
    const withWarnings = avoidWordsAgent.calculateScore(warningViolations);
    expect(withWarnings).toBeLessThan(100);
    expect(withWarnings).toBeGreaterThan(0);
  });
});

describe('WORD_CATEGORIES', () => {
  it('should include avail in the complex words category', () => {
    const complexCategory = WORD_CATEGORIES.find(c => c.id === 'complex');
    expect(complexCategory).toBeDefined();
    expect(complexCategory?.words).toContain('avail');
  });

  it('should have 8 categories total', () => {
    expect(WORD_CATEGORIES).toHaveLength(8);
  });

  const categoryIds = ['complex', 'robotic', 'fear_based', 'bureaucratic', 'technical', 'shame_inducing', 'elitist', 'marketing_jargon'];
  categoryIds.forEach(id => {
    it(`should include "${id}" category`, () => {
      const category = WORD_CATEGORIES.find(c => c.id === id);
      expect(category).toBeDefined();
      expect(category?.words.length).toBeGreaterThan(0);
    });
  });
});
