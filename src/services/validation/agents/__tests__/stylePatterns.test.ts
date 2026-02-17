/**
 * Style/Grammar Patterns Tests (Phase 4.2 - Test Plan 2.1)
 * 
 * Tests for style consistency agent pattern detection:
 * - Detects missing full stops at end of sentences
 * - Detects ampersand usage (suggest "and")
 * - Detects numerals below 10 (suggest spelled out)
 * - Detects double spaces
 * - Detects incorrect capitalization after sentences
 * - Detects em-dash usage patterns
 * - Detects ellipsis misuse
 * - Detects trailing/leading punctuation issues
 */

import { describe, it, expect } from 'vitest';
import { styleConsistencyAgent } from '../allAgents';

// =============================================================================
// Agent Configuration Tests
// =============================================================================

describe('styleConsistencyAgent configuration', () => {
  it('should have correct id', () => {
    expect(styleConsistencyAgent.id).toBe('style_consistency');
  });

  it('should have patterns array', () => {
    expect(Array.isArray(styleConsistencyAgent.patterns)).toBe(true);
    expect(styleConsistencyAgent.patterns.length).toBeGreaterThan(0);
  });

  it('should have weight of 15', () => {
    expect(styleConsistencyAgent.weight).toBe(15);
  });
});

// =============================================================================
// Full Stop / Period Enforcement (st-039)
// =============================================================================

describe('full stop enforcement', () => {
  it('should detect sentences not ending with punctuation', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'This is a long sentence without punctuation at the end'
    );

    const periodViolation = violations.find(v => v.rule.includes('proper punctuation'));
    expect(periodViolation).toBeDefined();
  });

  it('should not flag sentences ending with period', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'This sentence ends properly with a period.'
    );

    const periodViolation = violations.find(v => v.rule.includes('proper punctuation'));
    expect(periodViolation).toBeUndefined();
  });

  it('should not flag sentences ending with question mark', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'How can I help you today?'
    );

    const periodViolation = violations.find(v => v.rule.includes('proper punctuation'));
    expect(periodViolation).toBeUndefined();
  });
});

// =============================================================================
// Ampersand Detection (st-040)
// =============================================================================

describe('ampersand detection', () => {
  it('should detect ampersand in regular text', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Get our plans & offers today.'
    );

    const ampViolation = violations.find(v => v.rule.includes('"and"') && v.rule.includes('&'));
    expect(ampViolation).toBeDefined();
    expect(ampViolation?.suggestion).toContain('and');
  });

  it('should detect ampersand in "recharge & enjoy"', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Recharge & enjoy unlimited calling.'
    );

    const ampViolation = violations.find(v => v.rule.includes('"and"'));
    expect(ampViolation).toBeDefined();
  });

  // Note: Brand names with & (like AT&T) should be allowed
  // The pattern allows: & T, & D, & M after the ampersand
  it('should allow AT&T brand name', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Unlike AT&T, Jio offers better value.'
    );

    const ampViolation = violations.find(v => v.rule.includes('"and"') && v.rule.includes('&'));
    expect(ampViolation).toBeUndefined();
  });
});

// =============================================================================
// Numerals for Quantities (st-041)
// =============================================================================

describe('numerals vs words for quantities', () => {
  it('should detect "two days" - use numeral', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Your plan is valid for two days.'
    );

    const numViolation = violations.find(v => v.rule.includes('numerals'));
    expect(numViolation).toBeDefined();
  });

  it('should detect "five GB" - use numeral', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'You get five GB of data daily.'
    );

    const numViolation = violations.find(v => v.rule.includes('numerals'));
    expect(numViolation).toBeDefined();
  });

  it('should detect "three months" - use numeral', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'This offer is valid for three months.'
    );

    const numViolation = violations.find(v => v.rule.includes('numerals'));
    expect(numViolation).toBeDefined();
  });

  it('should not flag numerals when already used', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'You get 5 GB of data daily for 28 days.'
    );

    const numViolation = violations.find(v => v.rule.includes('numerals'));
    expect(numViolation).toBeUndefined();
  });
});

// =============================================================================
// Double Space Detection (st-042)
// =============================================================================

describe('double space detection', () => {
  it('should detect double spaces', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'This sentence has  double spaces.'
    );

    const spaceViolation = violations.find(v => v.rule.includes('extra spaces'));
    expect(spaceViolation).toBeDefined();
  });

  it('should detect multiple spaces after period', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'First sentence.  Second sentence.'
    );

    const spaceViolation = violations.find(v => v.rule.includes('extra spaces'));
    expect(spaceViolation).toBeDefined();
  });

  it('should not flag single spaces', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'This sentence has proper single spaces.'
    );

    const spaceViolation = violations.find(v => v.rule.includes('extra spaces'));
    expect(spaceViolation).toBeUndefined();
  });
});

// =============================================================================
// Capitalization After Sentences (st-043)
// =============================================================================

describe('capitalization after sentences', () => {
  it('should detect lowercase after period', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'First sentence. second sentence.'
    );

    const capViolation = violations.find(v => v.rule.includes('Capitalize'));
    expect(capViolation).toBeDefined();
  });

  it('should detect lowercase after exclamation', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Great news! your plan is active.'
    );

    const capViolation = violations.find(v => v.rule.includes('Capitalize'));
    expect(capViolation).toBeDefined();
  });

  it('should detect lowercase after question mark', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Need help? we are here for you.'
    );

    const capViolation = violations.find(v => v.rule.includes('Capitalize'));
    expect(capViolation).toBeDefined();
  });

  it('should not flag proper capitalization', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'First sentence. Second sentence.'
    );

    const capViolation = violations.find(v => v.rule.includes('Capitalize') && v.rule.includes('after sentence'));
    expect(capViolation).toBeUndefined();
  });
});

// =============================================================================
// Em-Dash Usage (st-044)
// =============================================================================

describe('em-dash usage patterns', () => {
  it('should detect double hyphen', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'This plan--our best seller--offers great value.'
    );

    const dashViolation = violations.find(v => v.rule.includes('em-dash'));
    expect(dashViolation).toBeDefined();
    expect(dashViolation?.suggestion).toBe('—');
  });

  it('should not flag single hyphen', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Get a high-speed internet connection.'
    );

    const dashViolation = violations.find(v => v.rule.includes('em-dash'));
    expect(dashViolation).toBeUndefined();
  });

  it('should not flag proper em-dash', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'This plan—our best seller—offers great value.'
    );

    const dashViolation = violations.find(v => v.rule.includes('em-dash'));
    expect(dashViolation).toBeUndefined();
  });
});

// =============================================================================
// Ellipsis Format (st-045)
// =============================================================================

describe('ellipsis misuse', () => {
  it('should detect three dots instead of proper ellipsis', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Loading... please wait.'
    );

    const ellipsisViolation = violations.find(v => v.rule.includes('ellipsis'));
    expect(ellipsisViolation).toBeDefined();
    expect(ellipsisViolation?.suggestion).toBe('…');
  });

  it('should detect multiple dots', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Coming soon..... stay tuned.'
    );

    const ellipsisViolation = violations.find(v => v.rule.includes('ellipsis'));
    expect(ellipsisViolation).toBeDefined();
  });

  it('should not flag proper ellipsis character', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Loading… please wait.'
    );

    const ellipsisViolation = violations.find(v => v.rule.includes('ellipsis'));
    expect(ellipsisViolation).toBeUndefined();
  });
});

// =============================================================================
// Leading/Trailing Punctuation (st-046)
// =============================================================================

describe('trailing/leading punctuation issues', () => {
  it('should detect leading comma', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      ', and then proceed to recharge.'
    );

    const punctViolation = violations.find(v => v.rule.includes('leading punctuation'));
    expect(punctViolation).toBeDefined();
  });

  it('should detect leading semicolon', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      '; this is invalid text.'
    );

    const punctViolation = violations.find(v => v.rule.includes('leading punctuation'));
    expect(punctViolation).toBeDefined();
  });

  it('should detect leading colon', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      ': here is the content.'
    );

    const punctViolation = violations.find(v => v.rule.includes('leading punctuation'));
    expect(punctViolation).toBeDefined();
  });

  it('should not flag proper punctuation usage', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Here are the steps: first, second, and third.'
    );

    const punctViolation = violations.find(v => v.rule.includes('leading punctuation'));
    expect(punctViolation).toBeUndefined();
  });
});

// =============================================================================
// British Spelling (st-010 to st-029)
// =============================================================================

describe('British spelling enforcement', () => {
  const spellingCases: Array<{ american: string; british: string }> = [
    { american: 'color', british: 'colour' },
    { american: 'favorite', british: 'favourite' },
    { american: 'organize', british: 'organise' },
    { american: 'realize', british: 'realise' },
    { american: 'customize', british: 'customise' },
    { american: 'center', british: 'centre' },
    { american: 'analyze', british: 'analyse' },
    { american: 'canceled', british: 'cancelled' },
  ];

  spellingCases.forEach(({ american, british }) => {
    it(`should detect "${american}" and suggest "${british}"`, () => {
      const violations = styleConsistencyAgent.runPatternValidation(
        `We will ${american} your settings.`
      );

      const spellingViolation = violations.find(
        v => v.rule.includes('British spelling') && v.suggestion === british
      );
      expect(spellingViolation).toBeDefined();
    });
  });
});

// =============================================================================
// Currency Format (st-030 to st-032)
// =============================================================================

describe('currency format', () => {
  it('should detect Rs. format', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'The plan costs Rs. 299 only.'
    );

    const currencyViolation = violations.find(v => v.rule.includes('₹'));
    expect(currencyViolation).toBeDefined();
  });

  it('should detect INR format', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Pay INR 599 for this plan.'
    );

    const currencyViolation = violations.find(v => v.rule.includes('₹'));
    expect(currencyViolation).toBeDefined();
  });

  it('should detect Rupees format', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Price is Rupees 999 only.'
    );

    const currencyViolation = violations.find(v => v.rule.includes('₹'));
    expect(currencyViolation).toBeDefined();
  });

  it('should not flag proper ₹ symbol', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'The plan costs ₹299 only.'
    );

    const currencyViolation = violations.find(v => v.rule.includes('₹'));
    expect(currencyViolation).toBeUndefined();
  });
});

// =============================================================================
// Exclamation Marks (st-007, st-008)
// =============================================================================

describe('exclamation mark usage', () => {
  it('should detect multiple exclamation marks', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Great offer!! Do not miss!!'
    );

    const exclamViolation = violations.find(v => v.rule.includes('multiple exclamation'));
    expect(exclamViolation).toBeDefined();
    expect(exclamViolation?.severity).toBe('error');
  });

  it('should flag single exclamation (info level)', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Welcome to Jio!'
    );

    const exclamViolation = violations.find(v => 
      v.rule.includes('exclamation marks') && !v.rule.includes('multiple')
    );
    expect(exclamViolation).toBeDefined();
    expect(exclamViolation?.severity).toBe('info');
  });
});

// =============================================================================
// Brand Capitalization (st-001, st-002)
// =============================================================================

describe('brand capitalization', () => {
  it('should detect lowercase "jio"', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Welcome to jio services.'
    );

    const brandViolation = violations.find(v => v.rule.includes('Capitalize Jio'));
    expect(brandViolation).toBeDefined();
  });

  it('should detect all-caps "JIO"', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Welcome to JIO services.'
    );

    const brandViolation = violations.find(v => v.rule.includes('all-caps'));
    expect(brandViolation).toBeDefined();
  });

  it('should not flag proper "Jio"', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Welcome to Jio services.'
    );

    const brandViolation = violations.find(
      v => v.rule.includes('Capitalize Jio') || v.rule.includes('all-caps')
    );
    expect(brandViolation).toBeUndefined();
  });
});

// =============================================================================
// Emoji Patterns (st-047 to st-049)
// =============================================================================

describe('emoji validation patterns', () => {
  it('should detect excessive emoji usage (4+)', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Great news! 🎉🎊✨👏🙌'
    );

    const emojiViolation = violations.find(v => v.rule.includes('many emojis'));
    expect(emojiViolation).toBeDefined();
  });

  it('should detect emoji in legal content', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Please read our terms and conditions 😊'
    );

    const emojiViolation = violations.find(v => v.rule.includes('emojis in legal'));
    expect(emojiViolation).toBeDefined();
  });

  it('should detect celebratory emoji in error context', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Your payment failed 🎉'
    );

    const emojiViolation = violations.find(v => v.rule.includes('celebratory emojis'));
    expect(emojiViolation).toBeDefined();
  });

  it('should not flag appropriate emoji usage', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Your recharge was successful! 😊'
    );

    const emojiViolation = violations.find(v => v.rule.includes('celebratory emojis in error'));
    expect(emojiViolation).toBeUndefined();
  });
});

// =============================================================================
// Corporate Jargon (st-003)
// =============================================================================

describe('corporate jargon detection', () => {
  it('should detect "utilize"', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Please utilize our app for recharge.'
    );

    const jargonViolation = violations.find(v => v.rule.includes('jargon'));
    expect(jargonViolation).toBeDefined();
  });

  it('should detect "leverage"', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'Leverage our services for better connectivity.'
    );

    const jargonViolation = violations.find(v => v.rule.includes('jargon'));
    expect(jargonViolation).toBeDefined();
  });

  it('should detect "synergy"', () => {
    const violations = styleConsistencyAgent.runPatternValidation(
      'This creates synergy between our offerings.'
    );

    const jargonViolation = violations.find(v => v.rule.includes('jargon'));
    expect(jargonViolation).toBeDefined();
  });
});

// =============================================================================
// Pattern Coverage Tests
// =============================================================================

describe('pattern coverage', () => {
  it('should have patterns with unique IDs', () => {
    const ids = styleConsistencyAgent.patterns.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have pattern IDs starting with st-', () => {
    for (const pattern of styleConsistencyAgent.patterns) {
      expect(pattern.id).toMatch(/^st-\d{3}$/);
    }
  });

  it('should have suggestions for all patterns', () => {
    for (const pattern of styleConsistencyAgent.patterns) {
      expect(pattern.suggestion).toBeDefined();
      expect(pattern.suggestion.length).toBeGreaterThan(0);
    }
  });

  it('should cover expected categories', () => {
    const categories = new Set(styleConsistencyAgent.patterns.map(p => p.category));
    
    expect(categories.has('brand')).toBe(true);
    expect(categories.has('punctuation')).toBe(true);
    expect(categories.has('spelling')).toBe(true);
    expect(categories.has('currency')).toBe(true);
    expect(categories.has('numbers')).toBe(true);
  });
});
