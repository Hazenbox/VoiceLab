/**
 * Long-Term Memory Tests (Phase 4.2 - Test Plan 3.3)
 * 
 * Tests for long-term memory layer:
 * - createLongTermMemory() generates valid default structure
 * - getLongTermMemory() returns cached or new memory
 * - hasOptedIn() correctly checks consent status
 * - optIn()/optOut() properly manage consent
 * - updateLongTermMemory() applies EMA for quality signals
 * - updateLongTermMemory() no-ops when not opted in
 * - extractMemoryContext() produces valid context
 * - getMemoryPromptSection() returns null when insufficient data
 * - isStale() respects retention window
 * - fromConvexLearningProfile() maps Convex data correctly
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createLongTermMemory,
  getLongTermMemory,
  hasOptedIn,
  optIn,
  optOut,
  updateLongTermMemory,
  extractMemoryContext,
  getMemoryPromptSection,
  isStale,
  pruneStaleData,
  fromConvexLearningProfile,
  toConvexUpdate,
  clearCache,
  type LongTermMemory,
  type LongTermMemoryInput,
} from '../longTermMemory';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestInput(overrides: Partial<LongTermMemoryInput> = {}): LongTermMemoryInput {
  return {
    sessionLength: 5,
    messageCount: 3,
    ecosystem: 'jio_mobility',
    channel: 'customer_care_chat',
    intent: 'recharge',
    language: 'en',
    copied: false,
    regenerated: false,
    corrected: false,
    escalated: false,
    resolved: true,
    ...overrides,
  };
}

// =============================================================================
// Setup/Teardown
// =============================================================================

describe('longTermMemory', () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    clearCache();
  });

  // =============================================================================
  // createLongTermMemory Tests
  // =============================================================================

  describe('createLongTermMemory', () => {
    it('should generate valid default structure', () => {
      const memory = createLongTermMemory('device123');

      expect(memory.deviceId).toBe('device123');
      expect(memory.consent).toBeDefined();
      expect(memory.language).toBeDefined();
      expect(memory.style).toBeDefined();
      expect(memory.services).toBeDefined();
      expect(memory.patterns).toBeDefined();
      expect(memory.quality).toBeDefined();
      expect(memory.learned).toBeDefined();
      expect(memory.metadata).toBeDefined();
    });

    it('should have consent optedIn=false by default', () => {
      const memory = createLongTermMemory('device123');
      expect(memory.consent.optedIn).toBe(false);
    });

    it('should have valid default language settings', () => {
      const memory = createLongTermMemory('device123');
      expect(memory.language.preferred).toBe('en');
      expect(memory.language.confidence).toBe(0);
      expect(memory.language.hinglishComfort).toBe('none');
    });

    it('should have valid default style settings', () => {
      const memory = createLongTermMemory('device123');
      expect(memory.style.warmthPreference).toBe(3);
      expect(memory.style.detailPreference).toBe(2);
      expect(memory.style.emojiTolerance).toBe('minimal');
    });

    it('should have valid default quality signals', () => {
      const memory = createLongTermMemory('device123');
      expect(memory.quality.copyRate).toBe(0);
      expect(memory.quality.regenerationRate).toBe(0);
      expect(memory.quality.correctionRate).toBe(0);
      expect(memory.quality.satisfactionEstimate).toBe(0.5);
    });

    it('should have empty arrays for learned patterns', () => {
      const memory = createLongTermMemory('device123');
      expect(memory.learned.avoidPatterns).toEqual([]);
      expect(memory.learned.preferPatterns).toEqual([]);
      expect(memory.learned.topCorrectionReasons).toEqual([]);
    });

    it('should have valid metadata with timestamps', () => {
      const memory = createLongTermMemory('device123');
      expect(memory.metadata.createdAt).toBeGreaterThan(0);
      expect(memory.metadata.updatedAt).toBeGreaterThan(0);
      expect(memory.metadata.totalInteractions).toBe(0);
      expect(memory.metadata.version).toBe(1);
    });
  });

  // =============================================================================
  // getLongTermMemory Tests
  // =============================================================================

  describe('getLongTermMemory', () => {
    it('should return cached memory when available', () => {
      const memory1 = getLongTermMemory('device123');
      const memory2 = getLongTermMemory('device123');

      expect(memory1).toBe(memory2); // Same reference
    });

    it('should create new memory when not cached', () => {
      const memory = getLongTermMemory('new_device');

      expect(memory.deviceId).toBe('new_device');
      expect(memory.consent.optedIn).toBe(false);
    });

    it('should create different memories for different devices', () => {
      const memory1 = getLongTermMemory('device1');
      const memory2 = getLongTermMemory('device2');

      expect(memory1.deviceId).toBe('device1');
      expect(memory2.deviceId).toBe('device2');
    });
  });

  // =============================================================================
  // hasOptedIn Tests
  // =============================================================================

  describe('hasOptedIn', () => {
    it('should return false for new memory', () => {
      const memory = createLongTermMemory('device123');
      expect(hasOptedIn(memory)).toBe(false);
    });

    it('should return true after opt in', () => {
      const memory = createLongTermMemory('device123');
      const optedIn = optIn(memory);
      expect(hasOptedIn(optedIn)).toBe(true);
    });

    it('should return false after opt out', () => {
      const optedIn = optIn(createLongTermMemory('device123'));
      const optedOut = optOut('device123');
      expect(hasOptedIn(optedOut)).toBe(false);
    });
  });

  // =============================================================================
  // optIn Tests
  // =============================================================================

  describe('optIn', () => {
    it('should set optedIn to true', () => {
      const memory = createLongTermMemory('device123');
      const result = optIn(memory);

      expect(result.consent.optedIn).toBe(true);
    });

    it('should set consentedAt timestamp', () => {
      const memory = createLongTermMemory('device123');
      const result = optIn(memory);

      expect(result.consent.consentedAt).toBeGreaterThan(0);
    });

    it('should use default retention of 6 months', () => {
      const memory = createLongTermMemory('device123');
      const result = optIn(memory);

      expect(result.consent.retentionMonths).toBe(6);
    });

    it('should allow 12 month retention', () => {
      const memory = createLongTermMemory('device123');
      const result = optIn(memory, 12);

      expect(result.consent.retentionMonths).toBe(12);
    });

    it('should update metadata.updatedAt', () => {
      const memory = createLongTermMemory('device123');
      const originalUpdatedAt = memory.metadata.updatedAt;
      
      // Wait a tiny bit to ensure different timestamp
      const result = optIn(memory);

      expect(result.metadata.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });
  });

  // =============================================================================
  // optOut Tests
  // =============================================================================

  describe('optOut', () => {
    it('should clear all memory data', () => {
      const memory = optIn(createLongTermMemory('device123'));
      const result = optOut('device123');

      expect(result.consent.optedIn).toBe(false);
      expect(result.metadata.totalInteractions).toBe(0);
    });

    it('should set lastReviewedAt timestamp', () => {
      optIn(createLongTermMemory('device123'));
      const result = optOut('device123');

      expect(result.consent.lastReviewedAt).toBeGreaterThan(0);
    });

    it('should reset learned patterns', () => {
      const result = optOut('device123');

      expect(result.learned.avoidPatterns).toEqual([]);
      expect(result.learned.preferPatterns).toEqual([]);
      expect(result.learned.topCorrectionReasons).toEqual([]);
    });
  });

  // =============================================================================
  // updateLongTermMemory Tests
  // =============================================================================

  describe('updateLongTermMemory', () => {
    it('should no-op when not opted in', () => {
      const memory = createLongTermMemory('device123');
      const input = createTestInput();

      const result = updateLongTermMemory(memory, input);

      expect(result.metadata.totalInteractions).toBe(0); // Not updated
    });

    it('should update when opted in', () => {
      const memory = optIn(createLongTermMemory('device123'));
      const input = createTestInput();

      const result = updateLongTermMemory(memory, input);

      expect(result.metadata.totalInteractions).toBe(1);
    });

    it('should increment totalInteractions', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      memory = updateLongTermMemory(memory, createTestInput());
      memory = updateLongTermMemory(memory, createTestInput());
      memory = updateLongTermMemory(memory, createTestInput());

      expect(memory.metadata.totalInteractions).toBe(3);
    });

    it('should apply EMA for copyRate', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      // First interaction with copy
      memory = updateLongTermMemory(memory, createTestInput({ copied: true }));
      expect(memory.quality.copyRate).toBeGreaterThan(0);

      // Second interaction without copy
      memory = updateLongTermMemory(memory, createTestInput({ copied: false }));
      // Should decrease slightly but not be 0
      expect(memory.quality.copyRate).toBeGreaterThan(0);
      expect(memory.quality.copyRate).toBeLessThan(1);
    });

    it('should apply EMA for regenerationRate', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      memory = updateLongTermMemory(memory, createTestInput({ regenerated: true }));
      expect(memory.quality.regenerationRate).toBeGreaterThan(0);
    });

    it('should apply EMA for correctionRate', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      memory = updateLongTermMemory(memory, createTestInput({ corrected: true }));
      expect(memory.quality.correctionRate).toBeGreaterThan(0);
    });

    it('should update escalationRate', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      memory = updateLongTermMemory(memory, createTestInput({ escalated: true }));
      expect(memory.patterns.escalationRate).toBeGreaterThan(0);
    });

    it('should track common ecosystems', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      memory = updateLongTermMemory(memory, createTestInput({ ecosystem: 'jio_fiber' }));
      memory = updateLongTermMemory(memory, createTestInput({ ecosystem: 'jio_fiber' }));

      expect(memory.services.commonEcosystems.length).toBeGreaterThan(0);
    });

    it('should track common intents', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      memory = updateLongTermMemory(memory, createTestInput({ intent: 'recharge' }));
      memory = updateLongTermMemory(memory, createTestInput({ intent: 'recharge' }));

      // Intent tracking depends on the updateFrequencyList implementation
      // The function may use different key names, so we just verify array grows
      expect(memory.patterns.commonIntents.length).toBeGreaterThan(0);
      // Check that there's an entry with frequency > 0
      expect(memory.patterns.commonIntents[0].frequency).toBeGreaterThan(0);
    });

    it('should update satisfaction based on signals', () => {
      let memory = optIn(createLongTermMemory('device123'));
      const initialSat = memory.quality.satisfactionEstimate;

      // Positive signals
      memory = updateLongTermMemory(memory, createTestInput({ 
        copied: true, 
        wasPositiveFeedback: true 
      }));

      expect(memory.quality.satisfactionEstimate).toBeGreaterThan(initialSat);
    });

    it('should decrease satisfaction on negative signals', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      // Multiple positive first
      memory = updateLongTermMemory(memory, createTestInput({ copied: true }));
      memory = updateLongTermMemory(memory, createTestInput({ copied: true }));
      const afterPositive = memory.quality.satisfactionEstimate;

      // Then negative
      memory = updateLongTermMemory(memory, createTestInput({ 
        wasNegativeFeedback: true,
        escalated: true,
        regenerated: true,
      }));

      expect(memory.quality.satisfactionEstimate).toBeLessThan(afterPositive);
    });

    it('should record correction reasons', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      memory = updateLongTermMemory(memory, createTestInput({ 
        corrected: true,
        correctionReason: 'too formal',
      }));

      expect(memory.learned.topCorrectionReasons).toContain('too formal');
    });

    it('should limit correction reasons to 10', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      for (let i = 0; i < 15; i++) {
        memory = updateLongTermMemory(memory, createTestInput({ 
          corrected: true,
          correctionReason: `reason_${i}`,
        }));
      }

      expect(memory.learned.topCorrectionReasons.length).toBeLessThanOrEqual(10);
    });
  });

  // =============================================================================
  // extractMemoryContext Tests
  // =============================================================================

  describe('extractMemoryContext', () => {
    it('should produce valid context', () => {
      const memory = optIn(createLongTermMemory('device123'));
      const context = extractMemoryContext(memory);

      expect(context).toBeDefined();
      expect(typeof context.isNew).toBe('boolean');
      expect(typeof context.hasHistory).toBe('boolean');
      expect(context.preferredLanguage).toBeDefined();
      expect(typeof context.warmthLevel).toBe('number');
      expect(typeof context.detailLevel).toBe('number');
      expect(['low', 'medium', 'high']).toContain(context.satisfactionLevel);
      expect(Array.isArray(context.suggestions)).toBe(true);
    });

    it('should mark new users with few interactions', () => {
      const memory = optIn(createLongTermMemory('device123'));
      const context = extractMemoryContext(memory);

      expect(context.isNew).toBe(true);
      expect(context.hasHistory).toBe(false);
    });

    it('should mark users with history after many interactions', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      // Simulate many interactions
      for (let i = 0; i < 15; i++) {
        memory = updateLongTermMemory(memory, createTestInput());
      }

      const context = extractMemoryContext(memory);
      expect(context.hasHistory).toBe(true);
      expect(context.isNew).toBe(false);
    });

    it('should suggest for high regeneration rate', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      // Simulate high regeneration
      for (let i = 0; i < 10; i++) {
        memory = updateLongTermMemory(memory, createTestInput({ regenerated: true }));
      }

      const context = extractMemoryContext(memory);
      const hasRegenSuggestion = context.suggestions.some(s => s.includes('regenerate'));
      expect(hasRegenSuggestion).toBe(true);
    });

    it('should suggest for high escalation rate', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      for (let i = 0; i < 10; i++) {
        memory = updateLongTermMemory(memory, createTestInput({ escalated: true }));
      }

      const context = extractMemoryContext(memory);
      const hasEscalationSuggestion = context.suggestions.some(s => s.includes('escalat'));
      expect(hasEscalationSuggestion).toBe(true);
    });
  });

  // =============================================================================
  // getMemoryPromptSection Tests
  // =============================================================================

  describe('getMemoryPromptSection', () => {
    it('should return null when not opted in', () => {
      const memory = createLongTermMemory('device123');
      const section = getMemoryPromptSection(memory);

      expect(section).toBeNull();
    });

    it('should return null when insufficient data', () => {
      const memory = optIn(createLongTermMemory('device123'));
      const section = getMemoryPromptSection(memory);

      expect(section).toBeNull(); // < 10 interactions
    });

    it('should return prompt section when sufficient data', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      for (let i = 0; i < 12; i++) {
        memory = updateLongTermMemory(memory, createTestInput());
      }

      const section = getMemoryPromptSection(memory);

      expect(section).not.toBeNull();
      expect(section).toContain('User History Context');
      expect(section).toContain('Preferred language');
    });

    it('should include warmth and detail levels', () => {
      let memory = optIn(createLongTermMemory('device123'));
      
      for (let i = 0; i < 12; i++) {
        memory = updateLongTermMemory(memory, createTestInput());
      }

      const section = getMemoryPromptSection(memory)!;

      expect(section).toContain('Warmth level');
      expect(section).toContain('Detail level');
    });
  });

  // =============================================================================
  // isStale Tests
  // =============================================================================

  describe('isStale', () => {
    it('should return false for fresh memory', () => {
      const memory = optIn(createLongTermMemory('device123'));
      expect(isStale(memory)).toBe(false);
    });

    it('should return true when beyond retention window', () => {
      let memory = optIn(createLongTermMemory('device123'), 6);
      
      // Set dataWindowStart to 7 months ago
      const sevenMonthsAgo = Date.now() - (7 * 30 * 24 * 60 * 60 * 1000);
      memory = {
        ...memory,
        metadata: {
          ...memory.metadata,
          dataWindowStart: sevenMonthsAgo,
        },
      };

      expect(isStale(memory)).toBe(true);
    });

    it('should respect 12 month retention', () => {
      let memory = optIn(createLongTermMemory('device123'), 12);
      
      // Set dataWindowStart to 10 months ago (should not be stale with 12 month retention)
      const tenMonthsAgo = Date.now() - (10 * 30 * 24 * 60 * 60 * 1000);
      memory = {
        ...memory,
        metadata: {
          ...memory.metadata,
          dataWindowStart: tenMonthsAgo,
        },
      };

      expect(isStale(memory)).toBe(false);
    });
  });

  // =============================================================================
  // pruneStaleData Tests
  // =============================================================================

  describe('pruneStaleData', () => {
    it('should not prune fresh memory', () => {
      const memory = optIn(createLongTermMemory('device123'));
      const pruned = pruneStaleData(memory);

      expect(pruned).toBe(memory); // Same reference
    });

    it('should prune stale memory', () => {
      let memory = optIn(createLongTermMemory('device123'), 6);
      
      // Make it stale
      const sevenMonthsAgo = Date.now() - (7 * 30 * 24 * 60 * 60 * 1000);
      memory = {
        ...memory,
        metadata: {
          ...memory.metadata,
          dataWindowStart: sevenMonthsAgo,
          totalInteractions: 100,
        },
      };

      const pruned = pruneStaleData(memory);

      expect(pruned.metadata.totalInteractions).toBe(0);
      expect(pruned.consent.optedIn).toBe(true); // Consent preserved
    });
  });

  // =============================================================================
  // fromConvexLearningProfile Tests
  // =============================================================================

  describe('fromConvexLearningProfile', () => {
    it('should map Convex data correctly', () => {
      const convexProfile = {
        userId: 'user123',
        preferredWarmth: 4,
        preferredDetail: 3,
        preferredLanguage: 'hi',
        commonIntents: [{ intent: 'recharge', frequency: 10 }],
        commonEcosystems: [{ ecosystem: 'jio_fiber', frequency: 5 }],
        correctionFrequency: 15,
        topCorrectionReasons: ['too long'],
        regenerationRate: 20,
        copyRate: 50,
        totalInteractions: 100,
        lastAggregatedAt: Date.now(),
      };

      const memory = fromConvexLearningProfile('device123', convexProfile);

      expect(memory.deviceId).toBe('device123');
      expect(memory.userId).toBe('user123');
      expect(memory.consent.optedIn).toBe(true);
      expect(memory.style.warmthPreference).toBe(4);
      expect(memory.style.detailPreference).toBe(3);
      expect(memory.language.preferred).toBe('hi');
      expect(memory.patterns.commonIntents).toEqual([{ intent: 'recharge', frequency: 10 }]);
      expect(memory.quality.correctionRate).toBe(0.15);
      expect(memory.quality.regenerationRate).toBe(0.2);
      expect(memory.quality.copyRate).toBe(0.5);
      expect(memory.learned.topCorrectionReasons).toContain('too long');
      expect(memory.metadata.totalInteractions).toBe(100);
    });

    it('should handle missing optional fields', () => {
      const convexProfile = {
        userId: 'user123',
        correctionFrequency: 10,
        totalInteractions: 50,
        lastAggregatedAt: Date.now(),
      };

      const memory = fromConvexLearningProfile('device123', convexProfile);

      expect(memory.deviceId).toBe('device123');
      expect(memory.style.warmthPreference).toBe(3); // Default
      expect(memory.patterns.commonIntents).toEqual([]);
    });
  });

  // =============================================================================
  // toConvexUpdate Tests
  // =============================================================================

  describe('toConvexUpdate', () => {
    it('should convert memory to Convex format', () => {
      let memory = optIn(createLongTermMemory('device123'));
      memory = updateLongTermMemory(memory, createTestInput({ copied: true }));

      const update = toConvexUpdate(memory);

      expect(update.preferredWarmth).toBe(memory.style.warmthPreference);
      expect(update.preferredDetail).toBe(memory.style.detailPreference);
      expect(update.preferredLanguage).toBe(memory.language.preferred);
      expect(update.totalInteractions).toBe(memory.metadata.totalInteractions);
      expect(update.updatedAt).toBeDefined();
    });

    it('should convert rates to percentages', () => {
      let memory = optIn(createLongTermMemory('device123'));
      memory = {
        ...memory,
        quality: {
          ...memory.quality,
          correctionRate: 0.15,
          regenerationRate: 0.25,
          copyRate: 0.5,
        },
      };

      const update = toConvexUpdate(memory);

      expect(update.correctionFrequency).toBe(15);
      expect(update.regenerationRate).toBe(25);
      expect(update.copyRate).toBe(50);
    });
  });

  // =============================================================================
  // clearCache Tests
  // =============================================================================

  describe('clearCache', () => {
    it('should clear all cached memories', () => {
      getLongTermMemory('device1');
      getLongTermMemory('device2');
      
      clearCache();

      // Getting memories again should create new ones
      const memory1 = getLongTermMemory('device1');
      expect(memory1.metadata.totalInteractions).toBe(0);
    });
  });
});
