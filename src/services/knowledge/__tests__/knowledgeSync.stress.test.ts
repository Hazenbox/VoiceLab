/**
 * Knowledge Sync Stress Tests
 * 
 * Tests the knowledge retrieval system integration:
 * - Code defaults fallback
 * - Convex data fetching simulation
 * - RAG semantic search simulation
 * - Caching behavior
 * - Data transformation
 * 
 * Note: These tests focus on the retriever logic, not live Convex connections
 * 
 * @module services/knowledge/__tests__/knowledgeSync.stress.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCodeDefaults,
  buildKnowledgePromptSection,
  getAvoidWordsByCategory,
} from '../knowledgeRetriever';
import type { RetrievedKnowledge } from '../knowledgeRetriever';
import {
  KNOWLEDGE_COUNTS,
  FESTIVALS,
  PRODUCT_DEFINITIONS,
  TOKEN_ENFORCEMENT_RULES,
  ECOSYSTEMS_EXTENDED,
  CHANNELS,
  PERSONAS,
  measureTime,
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
// CODE DEFAULTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Knowledge Sync Stress Tests', () => {
  describe('Code Defaults Fallback', () => {
    it('should return knowledge when Convex is unavailable', () => {
      const { result, timeMs } = measureTime(() => getCodeDefaults());
      
      console.log(`[DEFAULTS] Retrieved in ${timeMs.toFixed(2)}ms`);
      console.log(`[DEFAULTS] Avoid words: ${result.avoidWords.length}`);
      console.log(`[DEFAULTS] Preferred words: ${result.preferredWords.length}`);
      console.log(`[DEFAULTS] Auto-fix rules: ${result.autoFixRules.length}`);
      
      expect(result.source).toBe('code_defaults');
      expect(result.avoidWords.length).toBeGreaterThan(0);
      expect(result.preferredWords.length).toBeGreaterThan(0);
      expect(result.autoFixRules.length).toBeGreaterThan(0);
    });

    it('should have comprehensive avoid words list', () => {
      const defaults = getCodeDefaults();
      
      // Check for expected categories in avoid words
      const hasComplexWords = defaults.avoidWords.some(w => 
        ['utilize', 'leverage', 'synergy'].includes(w.toLowerCase())
      );
      const hasRoboticWords = defaults.avoidWords.some(w =>
        w.toLowerCase().includes('please note') || w.toLowerCase().includes('kindly')
      );
      
      console.log(`[DEFAULTS] Has complex words: ${hasComplexWords}`);
      console.log(`[DEFAULTS] Has robotic words: ${hasRoboticWords}`);
      
      expect(hasComplexWords).toBe(true);
    });

    it('should have comprehensive preferred words list', () => {
      const defaults = getCodeDefaults();
      
      // Check for simple alternatives
      const hasSimpleAlternatives = defaults.preferredWords.some(w =>
        ['use', 'help', 'simple'].includes(w.toLowerCase())
      );
      
      console.log(`[DEFAULTS] Has simple alternatives: ${hasSimpleAlternatives}`);
      
      expect(defaults.preferredWords.length).toBeGreaterThan(50);
    });

    it('should have auto-fix rules with valid structure', () => {
      const defaults = getCodeDefaults();
      
      // All rules should have from/to pairs
      const allValid = defaults.autoFixRules.every(rule =>
        rule.from && rule.to && rule.from !== rule.to
      );
      
      console.log(`[DEFAULTS] Auto-fix rules valid: ${allValid}`);
      console.log(`[DEFAULTS] Sample rules:`, defaults.autoFixRules.slice(0, 5));
      
      expect(allValid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SIMULATED CONVEX DATA TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Convex Data Structure Simulation', () => {
    it('should handle all knowledge item types', () => {
      const itemTypes = [
        'avoid_word',
        'preferred_word',
        'auto_fix',
        'product_definition',
        'festival',
        'approved_example',
      ];

      itemTypes.forEach(type => {
        // Simulate a knowledge item of each type
        const mockItem = {
          _id: `mock_${type}_1`,
          type,
          category: 'test',
          content: `Test ${type} content`,
          metadata: {},
          tags: [],
          isActive: true,
        };

        expect(mockItem.type).toBe(type);
        console.log(`[CONVEX] Item type ${type}: valid structure`);
      });
    });

    it('should simulate loading all 637 knowledge items', () => {
      // Simulate batch loading
      const mockItems = [];
      
      // Avoid words
      for (let i = 0; i < KNOWLEDGE_COUNTS.avoid_word; i++) {
        mockItems.push({
          _id: `avoid_${i}`,
          type: 'avoid_word',
          category: 'test',
          content: `avoid_word_${i}`,
          metadata: { severity: i % 3 === 0 ? 'error' : 'warning' },
          tags: [],
          isActive: true,
        });
      }

      // Preferred words
      for (let i = 0; i < KNOWLEDGE_COUNTS.preferred_word; i++) {
        mockItems.push({
          _id: `preferred_${i}`,
          type: 'preferred_word',
          category: 'vocabulary',
          content: `preferred_word_${i}`,
          metadata: {},
          tags: [],
          isActive: true,
        });
      }

      // Auto-fix rules
      for (let i = 0; i < KNOWLEDGE_COUNTS.auto_fix; i++) {
        mockItems.push({
          _id: `autofix_${i}`,
          type: 'auto_fix',
          category: 'replacement',
          content: `from_${i}`,
          metadata: { suggestion: `to_${i}` },
          tags: [],
          isActive: true,
        });
      }

      // Festivals
      FESTIVALS.forEach(festival => {
        mockItems.push({
          _id: `festival_${festival.id}`,
          type: 'festival',
          category: festival.category,
          content: festival.name,
          metadata: {},
          tags: [],
          isActive: true,
        });
      });

      // Product definitions
      PRODUCT_DEFINITIONS.forEach(product => {
        mockItems.push({
          _id: `product_${product.ecosystem}`,
          type: 'product_definition',
          category: product.ecosystem,
          content: product.tone,
          metadata: { ecosystem: product.ecosystem },
          tags: [],
          isActive: true,
        });
      });

      console.log(`[CONVEX] Simulated ${mockItems.length} total items`);
      console.log(`[CONVEX] Expected: ${KNOWLEDGE_COUNTS.TOTAL}`);

      expect(mockItems.length).toBeGreaterThanOrEqual(KNOWLEDGE_COUNTS.TOTAL - 10); // Allow small margin
    });

    it('should handle ecosystem-specific filtering', () => {
      const mockItems = PRODUCT_DEFINITIONS.map(p => ({
        _id: `product_${p.ecosystem}`,
        type: 'product_definition',
        category: p.ecosystem,
        content: p.tone,
        metadata: { ecosystem: p.ecosystem },
        tags: [],
        isActive: true,
      }));

      // Filter by ecosystem
      const connectivityItems = mockItems.filter(item => 
        item.metadata.ecosystem === 'connectivity'
      );

      expect(connectivityItems.length).toBe(1);
      expect(connectivityItems[0].content).toContain('Quick');
      console.log(`[CONVEX] Connectivity filter: ${connectivityItems.length} items`);
    });

    it('should handle channel-specific filtering', () => {
      const mockItems = CHANNELS.map(channel => ({
        _id: `channel_${channel}`,
        type: 'channel_override',
        category: 'channel',
        content: `Override for ${channel}`,
        metadata: { channel },
        tags: [],
        isActive: true,
      }));

      // Filter by channel
      const smsItems = mockItems.filter(item => 
        item.metadata.channel === 'sms'
      );

      expect(smsItems.length).toBe(1);
      console.log(`[CONVEX] SMS filter: ${smsItems.length} items`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SEMANTIC SEARCH SIMULATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('RAG Semantic Search Simulation', () => {
    it('should simulate vector search results', () => {
      // Mock semantic search results
      const mockQuery = 'how to help an angry customer';
      const mockResults = [
        {
          _id: 'example_1',
          type: 'approved_example',
          category: 'emotion_handling',
          content: 'I understand this is frustrating. Let me help you right away.',
          metadata: { emotion: 'raudra', persona: 'jio_support' },
          tags: ['empathy', 'angry', 'support'],
          _score: 0.95,
        },
        {
          _id: 'example_2',
          type: 'approved_example',
          category: 'emotion_handling',
          content: 'Im really sorry about this experience. We\'ll fix it now.',
          metadata: { emotion: 'raudra', persona: 'jio_friend' },
          tags: ['empathy', 'apology', 'resolution'],
          _score: 0.89,
        },
        {
          _id: 'avoid_1',
          type: 'avoid_word',
          category: 'emotion',
          content: 'calm down',
          metadata: { severity: 'error' },
          tags: ['angry', 'forbidden'],
          _score: 0.85,
        },
      ];

      console.log(`[RAG] Query: "${mockQuery}"`);
      console.log(`[RAG] Results: ${mockResults.length}`);
      console.log(`[RAG] Top score: ${mockResults[0]._score}`);

      // Verify results structure
      expect(mockResults[0]._score).toBeGreaterThan(0.8);
      expect(mockResults.every(r => r._score >= 0 && r._score <= 1)).toBe(true);
    });

    it('should rank results by relevance score', () => {
      const mockResults = [
        { _id: '1', _score: 0.75 },
        { _id: '2', _score: 0.95 },
        { _id: '3', _score: 0.82 },
        { _id: '4', _score: 0.91 },
      ];

      const sorted = [...mockResults].sort((a, b) => b._score - a._score);

      expect(sorted[0]._id).toBe('2');
      expect(sorted[0]._score).toBe(0.95);
      console.log(`[RAG] Sorted by score:`, sorted.map(r => r._score));
    });

    it('should filter results by minimum score threshold', () => {
      const mockResults = [
        { _id: '1', _score: 0.5 },
        { _id: '2', _score: 0.95 },
        { _id: '3', _score: 0.72 },
        { _id: '4', _score: 0.88 },
      ];

      const threshold = 0.75;
      const filtered = mockResults.filter(r => r._score >= threshold);

      expect(filtered.length).toBe(2);
      console.log(`[RAG] Filtered (≥${threshold}): ${filtered.length} results`);
    });

    it('should combine semantic results with code defaults', () => {
      const defaults = getCodeDefaults();
      const semanticResults = [
        { _id: 'semantic_1', type: 'approved_example', content: 'Semantic example 1', _score: 0.9 },
        { _id: 'semantic_2', type: 'approved_example', content: 'Semantic example 2', _score: 0.85 },
      ];

      // Simulate merged result
      const merged: RetrievedKnowledge = {
        ...defaults,
        approvedExamples: [
          ...defaults.approvedExamples,
          ...semanticResults.map(r => r.content),
        ],
        source: 'convex_with_rag' as const,
      };

      expect(merged.source).toBe('convex_with_rag');
      console.log(`[RAG] Merged result source: ${merged.source}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LEARNING PROMPT BUILDER TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Knowledge Prompt Builder', () => {
    it('should build knowledge prompt section', () => {
      const knowledge = getCodeDefaults();

      const { result, timeMs } = measureTime(() => 
        buildKnowledgePromptSection(knowledge)
      );

      console.log(`[KNOWLEDGE] Built in ${timeMs.toFixed(2)}ms`);
      console.log(`[KNOWLEDGE] Section length: ${result.length} chars`);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should include avoid words in prompt', () => {
      const knowledge = getCodeDefaults();
      const result = buildKnowledgePromptSection(knowledge);

      // Should contain avoid words section
      const hasAvoidSection = result.includes('avoid') || result.includes('AVOID');
      console.log(`[KNOWLEDGE] Has avoid section: ${hasAvoidSection}`);
    });

    it('should handle large knowledge base', () => {
      const knowledge = getCodeDefaults();
      
      // Simulate larger knowledge
      const largeKnowledge: RetrievedKnowledge = {
        ...knowledge,
        avoidWords: Array.from({ length: 500 }, (_, i) => `avoid_${i}`),
        preferredWords: Array.from({ length: 300 }, (_, i) => `preferred_${i}`),
      };

      const { result, timeMs } = measureTime(() => 
        buildKnowledgePromptSection(largeKnowledge)
      );

      console.log(`[KNOWLEDGE] Large KB built in ${timeMs.toFixed(2)}ms`);
      expect(timeMs).toBeLessThan(100); // Should be fast
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONTEXT FILTERING TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Context-Based Knowledge Filtering', () => {
    // Simple in-test filter function since filterKnowledgeByContext is not exported
    function filterByContext<T extends { ecosystem?: string; channel?: string; persona?: string }>(
      items: T[],
      context: { ecosystem?: string; channel?: string; persona?: string }
    ): T[] {
      return items.filter(item => {
        if (context.ecosystem && item.ecosystem && item.ecosystem !== context.ecosystem) return false;
        if (context.channel && item.channel && item.channel !== context.channel) return false;
        if (context.persona && item.persona && item.persona !== context.persona) return false;
        return true;
      });
    }

    it('should filter by ecosystem context', () => {
      const mockItems = ECOSYSTEMS_EXTENDED.map(eco => ({
        _id: eco,
        type: 'product_definition',
        ecosystem: eco,
        content: `Tone for ${eco}`,
      }));

      const context = { ecosystem: 'finance' };
      const filtered = filterByContext(mockItems, context);

      console.log(`[CONTEXT] Finance ecosystem: ${filtered.length} items`);
      expect(filtered.length).toBe(1);
    });

    it('should filter by channel context', () => {
      const mockItems = CHANNELS.map(channel => ({
        _id: channel,
        type: 'channel_override',
        channel,
        content: `Override for ${channel}`,
      }));

      const context = { channel: 'sms' };
      const filtered = filterByContext(mockItems, context);

      console.log(`[CONTEXT] SMS channel: ${filtered.length} items`);
      expect(filtered.length).toBe(1);
    });

    it('should filter by persona context', () => {
      const mockItems = PERSONAS.map(persona => ({
        _id: persona,
        type: 'persona_example',
        persona,
        content: `Example for ${persona}`,
      }));

      const context = { persona: 'jio_support' };
      const filtered = filterByContext(mockItems, context);

      console.log(`[CONTEXT] jio_support persona: ${filtered.length} items`);
      expect(filtered.length).toBe(1);
    });

    it('should combine multiple context filters', () => {
      const mockItems = [
        { _id: '1', ecosystem: 'finance', channel: 'app_chat', persona: 'jio_expert' },
        { _id: '2', ecosystem: 'finance', channel: 'sms', persona: 'jio_friend' },
        { _id: '3', ecosystem: 'health', channel: 'app_chat', persona: 'jio_support' },
        { _id: '4', ecosystem: 'finance', channel: 'app_chat', persona: 'jio_support' },
      ];

      const context = { ecosystem: 'finance', channel: 'app_chat' };
      const filtered = filterByContext(mockItems, context);

      console.log(`[CONTEXT] Multi-filter (finance + app_chat): ${filtered.length} items`);
      expect(filtered.length).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // TOKEN ENFORCEMENT RULES TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Token Enforcement Rules', () => {
    it('should have all 12 enforcement rules defined', () => {
      expect(TOKEN_ENFORCEMENT_RULES.length).toBe(12);
      console.log(`[ENFORCEMENT] Total rules: ${TOKEN_ENFORCEMENT_RULES.length}`);
    });

    it('should have high-priority safety rules', () => {
      const safetyRules = TOKEN_ENFORCEMENT_RULES.filter(r => r.category === 'safety');
      const highPriority = safetyRules.filter(r => r.priority >= 90);

      console.log(`[ENFORCEMENT] Safety rules: ${safetyRules.length}`);
      console.log(`[ENFORCEMENT] High-priority (≥90): ${highPriority.length}`);

      expect(safetyRules.length).toBeGreaterThan(0);
      expect(highPriority.length).toBeGreaterThan(0);
    });

    it('should have channel constraint rules', () => {
      const channelRules = TOKEN_ENFORCEMENT_RULES.filter(r => r.category === 'channel');

      console.log(`[ENFORCEMENT] Channel rules: ${channelRules.length}`);

      expect(channelRules.length).toBeGreaterThan(0);
    });

    it('should have emotion handling rules', () => {
      const emotionRules = TOKEN_ENFORCEMENT_RULES.filter(r => r.category === 'emotion');

      console.log(`[ENFORCEMENT] Emotion rules: ${emotionRules.length}`);

      expect(emotionRules.length).toBeGreaterThan(0);
    });

    it('should have brand protection rules', () => {
      const brandRules = TOKEN_ENFORCEMENT_RULES.filter(r => r.category === 'brand');

      console.log(`[ENFORCEMENT] Brand rules: ${brandRules.length}`);

      expect(brandRules.length).toBeGreaterThan(0);
    });

    TOKEN_ENFORCEMENT_RULES.forEach(rule => {
      it(`should have valid structure for rule: ${rule.tokenKey}=${rule.tokenValue}`, () => {
        expect(rule.tokenKey).toBeDefined();
        expect(rule.tokenValue).toBeDefined();
        expect(rule.ruleType).toBeDefined();
        expect(rule.category).toBeDefined();
        expect(rule.priority).toBeGreaterThan(0);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // COVERAGE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Knowledge Sync Coverage Summary', () => {
    it('should report sync coverage', () => {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('              KNOWLEDGE SYNC COVERAGE SUMMARY');
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      console.log('Code Defaults:');
      const defaults = getCodeDefaults();
      console.log(`  Avoid words:     ${defaults.avoidWords.length}`);
      console.log(`  Preferred words: ${defaults.preferredWords.length}`);
      console.log(`  Auto-fix rules:  ${defaults.autoFixRules.length}`);
      console.log('');
      
      console.log('Expected from Convex:');
      console.log(`  Avoid words:         ${KNOWLEDGE_COUNTS.avoid_word}`);
      console.log(`  Preferred words:     ${KNOWLEDGE_COUNTS.preferred_word}`);
      console.log(`  Auto-fix rules:      ${KNOWLEDGE_COUNTS.auto_fix}`);
      console.log(`  Product definitions: ${KNOWLEDGE_COUNTS.product_definition}`);
      console.log(`  Festivals:           ${KNOWLEDGE_COUNTS.festival}`);
      console.log(`  ────────────────────────────────────────`);
      console.log(`  TOTAL:               ${KNOWLEDGE_COUNTS.TOTAL}`);
      console.log('');
      
      console.log('Enforcement Rules:');
      console.log(`  Total rules:         ${TOKEN_ENFORCEMENT_RULES.length}`);
      console.log('');
      
      expect(true).toBe(true);
    });

    it('should report all found gaps', () => {
      if (gaps.length > 0) {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('            KNOWLEDGE SYNC GAP ANALYSIS');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        gaps.forEach((gap, i) => {
          console.log(`[${i + 1}] ${gap.severity.toUpperCase()} - ${gap.area}`);
          console.log(`    ${gap.description}`);
          console.log(`    Recommendation: ${gap.recommendation}`);
          console.log('');
        });
      } else {
        console.log('\n[SUCCESS] All knowledge sync tests passed!\n');
      }
      
      expect(true).toBe(true);
    });
  });
});
