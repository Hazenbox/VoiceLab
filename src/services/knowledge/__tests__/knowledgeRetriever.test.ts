/**
 * Knowledge Retriever Tests (Phase 4.2 - Test Plan 1.3)
 * 
 * Tests for knowledge retrieval with corrections processing:
 * - retrieveKnowledge() processes corrections from Convex data
 * - Corrections are filtered by ecosystem/channel
 * - Style preferences extracted from comments containing keywords
 * - Corrections limited to most recent 20
 * - Empty corrections array handled gracefully
 * - Source set to 'convex' when Convex data present
 */

import { describe, it, expect } from 'vitest';
import {
  retrieveKnowledge,
  getCodeDefaults,
  enrichWithSemanticResults,
  buildKnowledgePromptSection,
  buildSemanticPromptSection,
  RAG_CONFIG,
  type ConvexKnowledgeData,
  type CorrectionRecord,
  type KnowledgeItem,
  type RetrievedKnowledge,
  type SemanticSearchResult,
} from '../knowledgeRetriever';

// =============================================================================
// Test Fixtures
// =============================================================================

function createKnowledgeItem(overrides: Partial<KnowledgeItem> = {}): KnowledgeItem {
  return {
    _id: `item_${Math.random().toString(36).substr(2, 9)}`,
    type: 'avoid_word',
    category: 'test',
    content: 'test content',
    metadata: {},
    tags: [],
    isActive: true,
    ...overrides,
  };
}

function createCorrectionRecord(overrides: Partial<CorrectionRecord> = {}): CorrectionRecord {
  return {
    _id: `correction_${Math.random().toString(36).substr(2, 9)}`,
    feedbackType: 'edit',
    originalContent: 'original text',
    editedContent: 'edited text',
    comment: undefined,
    reasons: [],
    ecosystem: 'JioFiber',
    channel: 'Chat',
    adminStatus: 'approved',
    timestamp: Date.now(),
    ...overrides,
  };
}

function createSemanticResult(overrides: Partial<SemanticSearchResult> = {}): SemanticSearchResult {
  return {
    _id: `semantic_${Math.random().toString(36).substr(2, 9)}`,
    type: 'avoid_word',
    category: 'test',
    content: 'semantic content',
    metadata: {},
    tags: [],
    _score: 0.8,
    ...overrides,
  };
}

// =============================================================================
// retrieveKnowledge Tests
// =============================================================================

describe('retrieveKnowledge', () => {
  describe('source determination', () => {
    it('should set source to "convex" when Convex data is present', () => {
      const convexData: ConvexKnowledgeData = {
        avoidWords: [],
        preferredWords: [],
        autoFixRules: [],
        approvedExamples: [],
        corrections: [],
      };

      const result = retrieveKnowledge(convexData);

      expect(result.source).toBe('convex');
    });

    it('should set source to "code_defaults" when Convex data is null', () => {
      const result = retrieveKnowledge(null);

      expect(result.source).toBe('code_defaults');
    });
  });

  describe('corrections processing', () => {
    it('should process corrections from Convex data', () => {
      const convexData: ConvexKnowledgeData = {
        corrections: [
          createCorrectionRecord({
            originalContent: 'You must do this',
            editedContent: 'Here is how to do this',
            comment: 'Avoid commanding tone',
          }),
        ],
      };

      const result = retrieveKnowledge(convexData);

      expect(result.corrections).toHaveLength(1);
      expect(result.corrections[0].original).toBe('You must do this');
      expect(result.corrections[0].edited).toBe('Here is how to do this');
    });

    it('should filter out corrections without editedContent', () => {
      const convexData: ConvexKnowledgeData = {
        corrections: [
          createCorrectionRecord({
            originalContent: 'Some text',
            editedContent: undefined,
          }),
          createCorrectionRecord({
            originalContent: 'Other text',
            editedContent: 'Corrected text',
          }),
        ],
      };

      const result = retrieveKnowledge(convexData);

      expect(result.corrections).toHaveLength(1);
      expect(result.corrections[0].original).toBe('Other text');
    });

    it('should filter out rejected corrections', () => {
      const convexData: ConvexKnowledgeData = {
        corrections: [
          createCorrectionRecord({
            originalContent: 'Rejected correction',
            editedContent: 'New text',
            adminStatus: 'rejected',
          }),
          createCorrectionRecord({
            originalContent: 'Approved correction',
            editedContent: 'Better text',
            adminStatus: 'approved',
          }),
        ],
      };

      const result = retrieveKnowledge(convexData);

      expect(result.corrections).toHaveLength(1);
      expect(result.corrections[0].original).toBe('Approved correction');
    });

    it('should limit corrections to most recent 20', () => {
      const corrections = Array.from({ length: 30 }, (_, i) =>
        createCorrectionRecord({
          originalContent: `Original ${i}`,
          editedContent: `Edited ${i}`,
        })
      );

      const convexData: ConvexKnowledgeData = { corrections };

      const result = retrieveKnowledge(convexData);

      expect(result.corrections).toHaveLength(20);
    });

    it('should handle empty corrections array gracefully', () => {
      const convexData: ConvexKnowledgeData = {
        corrections: [],
      };

      const result = retrieveKnowledge(convexData);

      expect(result.corrections).toHaveLength(0);
      expect(result.corrections).toEqual([]);
    });

    it('should handle missing corrections key gracefully', () => {
      const convexData: ConvexKnowledgeData = {
        avoidWords: [],
      };

      const result = retrieveKnowledge(convexData);

      expect(result.corrections).toHaveLength(0);
    });
  });

  describe('ecosystem/channel filtering', () => {
    it('should filter corrections by ecosystem when specified', () => {
      const convexData: ConvexKnowledgeData = {
        corrections: [
          createCorrectionRecord({
            ecosystem: 'JioFiber',
            originalContent: 'Fiber text',
            editedContent: 'Better fiber text',
          }),
          createCorrectionRecord({
            ecosystem: 'JioMart',
            originalContent: 'Mart text',
            editedContent: 'Better mart text',
          }),
        ],
      };

      const result = retrieveKnowledge(convexData, 'JioFiber');

      expect(result.corrections).toHaveLength(1);
      expect(result.corrections[0].original).toBe('Fiber text');
    });

    it('should filter corrections by channel when specified', () => {
      const convexData: ConvexKnowledgeData = {
        corrections: [
          createCorrectionRecord({
            channel: 'Chat',
            originalContent: 'Chat text',
            editedContent: 'Better chat text',
          }),
          createCorrectionRecord({
            channel: 'Email',
            originalContent: 'Email text',
            editedContent: 'Better email text',
          }),
        ],
      };

      const result = retrieveKnowledge(convexData, undefined, 'Chat');

      expect(result.corrections).toHaveLength(1);
      expect(result.corrections[0].original).toBe('Chat text');
    });

    it('should filter by both ecosystem and channel', () => {
      const convexData: ConvexKnowledgeData = {
        corrections: [
          createCorrectionRecord({
            ecosystem: 'JioFiber',
            channel: 'Chat',
            originalContent: 'Match',
            editedContent: 'Match edited',
          }),
          createCorrectionRecord({
            ecosystem: 'JioFiber',
            channel: 'Email',
            originalContent: 'Wrong channel',
            editedContent: 'Wrong channel edited',
          }),
          createCorrectionRecord({
            ecosystem: 'JioMart',
            channel: 'Chat',
            originalContent: 'Wrong ecosystem',
            editedContent: 'Wrong ecosystem edited',
          }),
        ],
      };

      const result = retrieveKnowledge(convexData, 'JioFiber', 'Chat');

      expect(result.corrections).toHaveLength(1);
      expect(result.corrections[0].original).toBe('Match');
    });

    it('should filter approved examples by ecosystem/channel', () => {
      const convexData: ConvexKnowledgeData = {
        approvedExamples: [
          createKnowledgeItem({
            type: 'approved_example',
            content: 'Fiber example',
            metadata: { ecosystem: 'JioFiber' },
          }),
          createKnowledgeItem({
            type: 'approved_example',
            content: 'Mart example',
            metadata: { ecosystem: 'JioMart' },
          }),
        ],
      };

      const result = retrieveKnowledge(convexData, 'JioFiber');

      expect(result.approvedExamples).toHaveLength(1);
      expect(result.approvedExamples[0]).toBe('Fiber example');
    });
  });

  describe('style preferences extraction', () => {
    it('should extract style preferences from comments containing keywords', () => {
      const convexData: ConvexKnowledgeData = {
        corrections: [
          createCorrectionRecord({
            comment: 'Always prefer using friendly language',
            originalContent: 'Test',
            editedContent: 'Test edited',
          }),
          createCorrectionRecord({
            comment: 'Never use technical jargon',
            originalContent: 'Test 2',
            editedContent: 'Test 2 edited',
          }),
        ],
      };

      const result = retrieveKnowledge(convexData);

      expect(result.stylePreferences).toBeDefined();
      expect(result.stylePreferences).toHaveLength(2);
      expect(result.stylePreferences).toContain('Always prefer using friendly language');
      expect(result.stylePreferences).toContain('Never use technical jargon');
    });

    it('should not extract comments without style keywords', () => {
      const convexData: ConvexKnowledgeData = {
        corrections: [
          createCorrectionRecord({
            comment: 'This is just a random comment without keywords',
            originalContent: 'Test',
            editedContent: 'Test edited',
          }),
        ],
      };

      const result = retrieveKnowledge(convexData);

      expect(result.stylePreferences).toBeUndefined();
    });

    it('should filter out short comments (< 10 chars)', () => {
      const convexData: ConvexKnowledgeData = {
        corrections: [
          createCorrectionRecord({
            comment: 'use this', // 8 chars
            originalContent: 'Test',
            editedContent: 'Test edited',
          }),
        ],
      };

      const result = retrieveKnowledge(convexData);

      expect(result.stylePreferences).toBeUndefined();
    });

    it('should limit style preferences to 10', () => {
      const corrections = Array.from({ length: 15 }, (_, i) =>
        createCorrectionRecord({
          comment: `Always prefer style ${i} for better results`,
          originalContent: `Original ${i}`,
          editedContent: `Edited ${i}`,
        })
      );

      const convexData: ConvexKnowledgeData = { corrections };

      const result = retrieveKnowledge(convexData);

      expect(result.stylePreferences).toHaveLength(10);
    });

    it('should recognize all style keywords', () => {
      const keywords = ['prefer', 'always', 'never', 'use', 'avoid', 'instead', 'better', 'tone', 'style'];

      for (const keyword of keywords) {
        const convexData: ConvexKnowledgeData = {
          corrections: [
            createCorrectionRecord({
              comment: `Please ${keyword} this approach for content`,
              originalContent: 'Test',
              editedContent: 'Test edited',
            }),
          ],
        };

        const result = retrieveKnowledge(convexData);

        expect(result.stylePreferences).toBeDefined();
        expect(result.stylePreferences!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('knowledge item processing', () => {
    it('should filter out inactive knowledge items', () => {
      const convexData: ConvexKnowledgeData = {
        avoidWords: [
          createKnowledgeItem({ content: 'active word', isActive: true }),
          createKnowledgeItem({ content: 'inactive word', isActive: false }),
        ],
      };

      const result = retrieveKnowledge(convexData);

      expect(result.avoidWords).toHaveLength(1);
      expect(result.avoidWords[0]).toBe('active word');
    });

    it('should extract content from knowledge items', () => {
      const convexData: ConvexKnowledgeData = {
        avoidWords: [createKnowledgeItem({ content: 'bad word' })],
        preferredWords: [createKnowledgeItem({ content: 'good word' })],
      };

      const result = retrieveKnowledge(convexData);

      expect(result.avoidWords).toContain('bad word');
      expect(result.preferredWords).toContain('good word');
    });

    it('should process auto-fix rules with suggestion metadata', () => {
      const convexData: ConvexKnowledgeData = {
        autoFixRules: [
          createKnowledgeItem({
            content: 'utilize',
            metadata: { suggestion: 'use' },
          }),
          createKnowledgeItem({
            content: 'no suggestion',
            metadata: {},
          }),
        ],
      };

      const result = retrieveKnowledge(convexData);

      expect(result.autoFixRules).toHaveLength(1);
      expect(result.autoFixRules[0]).toEqual({ from: 'utilize', to: 'use' });
    });
  });
});

// =============================================================================
// getCodeDefaults Tests
// =============================================================================

describe('getCodeDefaults', () => {
  it('should return source as "code_defaults"', () => {
    const result = getCodeDefaults();

    expect(result.source).toBe('code_defaults');
  });

  it('should return non-empty avoid words', () => {
    const result = getCodeDefaults();

    expect(result.avoidWords.length).toBeGreaterThan(0);
  });

  it('should return non-empty preferred words', () => {
    const result = getCodeDefaults();

    expect(result.preferredWords.length).toBeGreaterThan(0);
  });

  it('should return auto-fix rules', () => {
    const result = getCodeDefaults();

    expect(result.autoFixRules.length).toBeGreaterThan(0);
    expect(result.autoFixRules[0]).toHaveProperty('from');
    expect(result.autoFixRules[0]).toHaveProperty('to');
  });

  it('should return empty corrections array', () => {
    const result = getCodeDefaults();

    expect(result.corrections).toEqual([]);
  });
});

// =============================================================================
// enrichWithSemanticResults Tests
// =============================================================================

describe('enrichWithSemanticResults', () => {
  const baseKnowledge: RetrievedKnowledge = {
    avoidWords: ['existing'],
    preferredWords: ['good'],
    autoFixRules: [],
    approvedExamples: [],
    corrections: [],
    source: 'convex',
  };

  it('should return base knowledge when no semantic results', () => {
    const result = enrichWithSemanticResults(baseKnowledge, []);

    expect(result).toBe(baseKnowledge);
  });

  it('should filter results below minimum score', () => {
    const lowScoreResults = [
      createSemanticResult({ _score: 0.2, content: 'low score' }),
    ];

    const result = enrichWithSemanticResults(baseKnowledge, lowScoreResults);

    expect(result).toBe(baseKnowledge);
  });

  it('should include results above minimum score', () => {
    const highScoreResults = [
      createSemanticResult({ _score: 0.6, content: 'high score', type: 'avoid_word' }),
    ];

    const result = enrichWithSemanticResults(baseKnowledge, highScoreResults);

    expect(result.avoidWords).toContain('high score');
    expect(result.source).toBe('convex_with_rag');
  });

  it('should not duplicate existing items', () => {
    const duplicateResults = [
      createSemanticResult({ _score: 0.8, content: 'existing', type: 'avoid_word' }),
    ];

    const result = enrichWithSemanticResults(baseKnowledge, duplicateResults);

    expect(result.avoidWords.filter(w => w === 'existing')).toHaveLength(1);
  });

  it('should categorize results by type', () => {
    const mixedResults = [
      createSemanticResult({ _score: 0.8, content: 'avoid this', type: 'avoid_word' }),
      createSemanticResult({ _score: 0.8, content: 'prefer this', type: 'preferred_word' }),
      createSemanticResult({ _score: 0.8, content: 'old', type: 'auto_fix', metadata: { suggestion: 'new' } }),
      createSemanticResult({ _score: 0.8, content: 'example text', type: 'approved_example' }),
    ];

    const result = enrichWithSemanticResults(baseKnowledge, mixedResults);

    expect(result.avoidWords).toContain('avoid this');
    expect(result.preferredWords).toContain('prefer this');
    expect(result.autoFixRules).toContainEqual({ from: 'old', to: 'new' });
    expect(result.approvedExamples).toContain('example text');
  });

  it('should respect custom minimum score', () => {
    const results = [
      createSemanticResult({ _score: 0.6, content: 'medium score', type: 'avoid_word' }),
    ];

    const result = enrichWithSemanticResults(baseKnowledge, results, 0.7);

    expect(result).toBe(baseKnowledge);
  });

  it('should attach semantic results to output', () => {
    const results = [
      createSemanticResult({ _score: 0.8, content: 'semantic', type: 'avoid_word' }),
    ];

    const result = enrichWithSemanticResults(baseKnowledge, results);

    expect(result.semanticResults).toHaveLength(1);
    expect(result.semanticResults![0].content).toBe('semantic');
  });
});

// =============================================================================
// buildKnowledgePromptSection Tests
// =============================================================================

describe('buildKnowledgePromptSection', () => {
  it('should return empty string for empty knowledge', () => {
    const emptyKnowledge: RetrievedKnowledge = {
      avoidWords: [],
      preferredWords: [],
      autoFixRules: [],
      approvedExamples: [],
      corrections: [],
      source: 'code_defaults',
    };

    const result = buildKnowledgePromptSection(emptyKnowledge);

    expect(result).toBe('');
  });

  it('should include avoid words section', () => {
    const knowledge: RetrievedKnowledge = {
      avoidWords: ['bad', 'worse'],
      preferredWords: [],
      autoFixRules: [],
      approvedExamples: [],
      corrections: [],
      source: 'convex',
    };

    const result = buildKnowledgePromptSection(knowledge);

    expect(result).toContain('CRITICAL');
    expect(result).toContain('MUST NOT Use');
    expect(result).toContain('"bad"');
    expect(result).toContain('"worse"');
  });

  it('should include preferred words section', () => {
    const knowledge: RetrievedKnowledge = {
      avoidWords: [],
      preferredWords: ['good', 'better'],
      autoFixRules: [],
      approvedExamples: [],
      corrections: [],
      source: 'convex',
    };

    const result = buildKnowledgePromptSection(knowledge);

    expect(result).toContain('Preferred Vocabulary');
    expect(result).toContain('good');
    expect(result).toContain('better');
  });

  it('should include auto-fix rules section', () => {
    const knowledge: RetrievedKnowledge = {
      avoidWords: [],
      preferredWords: [],
      autoFixRules: [{ from: 'utilize', to: 'use' }],
      approvedExamples: [],
      corrections: [],
      source: 'convex',
    };

    const result = buildKnowledgePromptSection(knowledge);

    expect(result).toContain('Word Replacements');
    expect(result).toContain('"utilize"');
    expect(result).toContain('"use"');
  });

  it('should include corrections section', () => {
    const knowledge: RetrievedKnowledge = {
      avoidWords: [],
      preferredWords: [],
      autoFixRules: [],
      approvedExamples: [],
      corrections: [{ original: 'old', edited: 'new', context: 'test' }],
      source: 'convex',
    };

    const result = buildKnowledgePromptSection(knowledge);

    expect(result).toContain('Learned Preferences');
    expect(result).toContain('old');
    expect(result).toContain('new');
  });

  it('should include style preferences section', () => {
    const knowledge: RetrievedKnowledge = {
      avoidWords: [],
      preferredWords: [],
      autoFixRules: [],
      approvedExamples: [],
      corrections: [],
      stylePreferences: ['Always use friendly tone'],
      source: 'convex',
    };

    const result = buildKnowledgePromptSection(knowledge);

    expect(result).toContain('User Style Preferences');
    expect(result).toContain('Always use friendly tone');
  });

  it('should limit avoid words to 150', () => {
    const knowledge: RetrievedKnowledge = {
      avoidWords: Array.from({ length: 200 }, (_, i) => `word${i}`),
      preferredWords: [],
      autoFixRules: [],
      approvedExamples: [],
      corrections: [],
      source: 'convex',
    };

    const result = buildKnowledgePromptSection(knowledge);

    // Should show 150 words and mention more
    expect(result).toContain('200 total');
    expect(result).toContain('50 more');
  });
});

// =============================================================================
// buildSemanticPromptSection Tests
// =============================================================================

describe('buildSemanticPromptSection', () => {
  it('should return empty string for empty results', () => {
    expect(buildSemanticPromptSection([])).toBe('');
  });

  it('should return empty string for undefined results', () => {
    expect(buildSemanticPromptSection(undefined as unknown as SemanticSearchResult[])).toBe('');
  });

  it('should group results by type', () => {
    const results = [
      createSemanticResult({ type: 'avoid_word', content: 'avoid1' }),
      createSemanticResult({ type: 'avoid_word', content: 'avoid2' }),
      createSemanticResult({ type: 'preferred_word', content: 'prefer1' }),
    ];

    const result = buildSemanticPromptSection(results);

    expect(result).toContain('Words to Avoid');
    expect(result).toContain('Preferred Words');
  });

  it('should include suggestions for auto-fix type', () => {
    const results = [
      createSemanticResult({
        type: 'auto_fix',
        content: 'old word',
        metadata: { suggestion: 'new word' },
      }),
    ];

    const result = buildSemanticPromptSection(results);

    expect(result).toContain('"old word"');
    expect(result).toContain('"new word"');
  });

  it('should include RAG header', () => {
    const results = [createSemanticResult()];

    const result = buildSemanticPromptSection(results);

    expect(result).toContain('Contextually Retrieved Knowledge (RAG)');
  });
});

// =============================================================================
// RAG_CONFIG Tests
// =============================================================================

describe('RAG_CONFIG', () => {
  it('should have minimum score of 0.5', () => {
    expect(RAG_CONFIG.minScore).toBe(0.5);
  });

  it('should have timeout of 300ms', () => {
    expect(RAG_CONFIG.timeoutMs).toBe(300);
  });

  it('should have max results of 10', () => {
    expect(RAG_CONFIG.maxResults).toBe(10);
  });

  it('should have max prompt results of 5', () => {
    expect(RAG_CONFIG.maxPromptResults).toBe(5);
  });
});
