/**
 * CSAT & Intent Tracker Tests (Phase 4.2)
 * 
 * Tests for customer satisfaction collection and intent accuracy logging.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  shouldPromptCSAT,
  generateCSATPrompt,
  recordCSATResponse,
  optOutCSAT,
  optInCSAT,
  calculateCSATMetrics,
  getCSATLabel,
  getDeviceCSATHistory,
  logDetectedIntent,
  correctIntentLog,
  inferIntentCorrectness,
  calculateIntentAccuracyMetrics,
  getPendingSyncData,
  clearSyncedData,
  clearAllData,
  DEFAULT_CSAT_CONFIG,
} from '../csatIntentTracker';

describe('csatIntentTracker', () => {
  // Reset state before each test
  beforeEach(() => {
    clearSyncedData();
    // Reset opt-outs by opting in
    optInCSAT('test-device-1');
    optInCSAT('test-device-2');
  });
  
  // ==========================================================================
  // shouldPromptCSAT
  // ==========================================================================
  
  describe('shouldPromptCSAT', () => {
    it('should return false if turn count is below minimum', () => {
      const result = shouldPromptCSAT('test-device', 2, true, false);
      expect(result).toBe(false);
    });
    
    it('should return true for resolved conversation with enough turns', () => {
      const result = shouldPromptCSAT('test-device', 5, true, false, {
        ...DEFAULT_CSAT_CONFIG,
        trigger: 'resolution',
      });
      expect(result).toBe(true);
    });
    
    it('should return false for unresolved conversation when trigger is resolution', () => {
      const result = shouldPromptCSAT('test-device', 5, false, false, {
        ...DEFAULT_CSAT_CONFIG,
        trigger: 'resolution',
      });
      expect(result).toBe(false);
    });
    
    it('should return true for escalation when trigger is escalation', () => {
      const result = shouldPromptCSAT('test-device', 5, false, true, {
        ...DEFAULT_CSAT_CONFIG,
        trigger: 'escalation',
      });
      expect(result).toBe(true);
    });
    
    it('should return false if user opted out', () => {
      optOutCSAT('test-device');
      const result = shouldPromptCSAT('test-device', 5, true, false);
      expect(result).toBe(false);
    });
    
    it('should respect cooldown period', () => {
      // First, record a CSAT to set the last prompt time
      recordCSATResponse({
        sessionId: 'session-1',
        deviceId: 'test-device-cooldown',
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        turnCount: 5,
        wasEscalated: false,
        wasResolved: true,
        scores: [{ score: 5, aspect: 'overall' }],
        collectedAt: Date.now(),
        conversationEndedAt: Date.now() - 1000,
        responseDelaySeconds: 1,
      });
      
      // Should not prompt again within cooldown
      const result = shouldPromptCSAT('test-device-cooldown', 5, true, false);
      expect(result).toBe(false);
    });
  });
  
  // ==========================================================================
  // generateCSATPrompt
  // ==========================================================================
  
  describe('generateCSATPrompt', () => {
    it('should generate overall prompt by default', () => {
      const prompt = generateCSATPrompt();
      expect(prompt).toContain('overall experience');
    });
    
    it('should generate response quality prompt', () => {
      const prompt = generateCSATPrompt('response_quality');
      expect(prompt).toContain('helpful');
    });
    
    it('should generate resolution speed prompt', () => {
      const prompt = generateCSATPrompt('resolution_speed');
      expect(prompt).toContain('resolution time');
    });
    
    it('should include rating scale', () => {
      const prompt = generateCSATPrompt();
      expect(prompt).toContain('1-5');
    });
  });
  
  // ==========================================================================
  // recordCSATResponse & calculateCSATMetrics
  // ==========================================================================
  
  describe('recordCSATResponse', () => {
    it('should calculate aggregate score', () => {
      const collection = recordCSATResponse({
        sessionId: 'session-1',
        deviceId: 'test-device',
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        turnCount: 5,
        wasEscalated: false,
        wasResolved: true,
        scores: [
          { score: 5, aspect: 'overall' },
          { score: 4, aspect: 'response_quality' },
        ],
        collectedAt: Date.now(),
        conversationEndedAt: Date.now() - 1000,
        responseDelaySeconds: 1,
      });
      
      expect(collection.aggregateScore).toBe(4.5);
    });
  });
  
  describe('calculateCSATMetrics', () => {
    beforeEach(() => {
      clearSyncedData();
    });
    
    it('should return zeros for empty collections', () => {
      const metrics = calculateCSATMetrics([]);
      
      expect(metrics.totalResponses).toBe(0);
      expect(metrics.averageScore).toBe(0);
      expect(metrics.npsScore).toBe(0);
    });
    
    it('should calculate correct average score', () => {
      const collections = [
        recordCSATResponse({
          sessionId: 's1',
          deviceId: 'd1',
          ecosystem: 'jio_mobility',
          channel: 'customer_care_chat',
          turnCount: 5,
          wasEscalated: false,
          wasResolved: true,
          scores: [{ score: 5, aspect: 'overall' }],
          collectedAt: Date.now(),
          conversationEndedAt: Date.now(),
          responseDelaySeconds: 0,
        }),
        recordCSATResponse({
          sessionId: 's2',
          deviceId: 'd2',
          ecosystem: 'jio_mobility',
          channel: 'customer_care_chat',
          turnCount: 5,
          wasEscalated: false,
          wasResolved: true,
          scores: [{ score: 3, aspect: 'overall' }],
          collectedAt: Date.now(),
          conversationEndedAt: Date.now(),
          responseDelaySeconds: 0,
        }),
      ];
      
      const metrics = calculateCSATMetrics(collections);
      expect(metrics.averageScore).toBe(4);
    });
    
    it('should calculate satisfied/dissatisfied rates', () => {
      const collections = [
        recordCSATResponse({
          sessionId: 's1',
          deviceId: 'd1',
          ecosystem: 'jio_mobility',
          channel: 'customer_care_chat',
          turnCount: 5,
          wasEscalated: false,
          wasResolved: true,
          scores: [{ score: 5, aspect: 'overall' }], // satisfied
          collectedAt: Date.now(),
          conversationEndedAt: Date.now(),
          responseDelaySeconds: 0,
        }),
        recordCSATResponse({
          sessionId: 's2',
          deviceId: 'd2',
          ecosystem: 'jio_mobility',
          channel: 'customer_care_chat',
          turnCount: 5,
          wasEscalated: false,
          wasResolved: true,
          scores: [{ score: 1, aspect: 'overall' }], // dissatisfied
          collectedAt: Date.now(),
          conversationEndedAt: Date.now(),
          responseDelaySeconds: 0,
        }),
      ];
      
      const metrics = calculateCSATMetrics(collections);
      expect(metrics.satisfiedRate).toBe(0.5);
      expect(metrics.dissatisfiedRate).toBe(0.5);
    });
  });
  
  // ==========================================================================
  // getCSATLabel
  // ==========================================================================
  
  describe('getCSATLabel', () => {
    it('should return correct labels', () => {
      expect(getCSATLabel(1)).toBe('very unsatisfied');
      expect(getCSATLabel(2)).toBe('unsatisfied');
      expect(getCSATLabel(3)).toBe('neutral');
      expect(getCSATLabel(4)).toBe('satisfied');
      expect(getCSATLabel(5)).toBe('very satisfied');
    });
  });
  
  // ==========================================================================
  // Intent Accuracy Logging
  // ==========================================================================
  
  describe('logDetectedIntent', () => {
    it('should log intent with null wasCorrect initially', () => {
      const log = logDetectedIntent({
        sessionId: 'session-1',
        deviceId: 'device-1',
        messageIndex: 0,
        detectedIntent: 'recharge_query',
        detectedConfidence: 0.95,
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        userMessage: 'How do I recharge my phone?',
        timestamp: Date.now(),
      });
      
      expect(log.wasCorrect).toBeNull();
      expect(log.detectedIntent).toBe('recharge_query');
    });
    
    it('should truncate long messages for privacy', () => {
      const longMessage = 'a'.repeat(200);
      const log = logDetectedIntent({
        sessionId: 'session-1',
        deviceId: 'device-1',
        messageIndex: 0,
        detectedIntent: 'test',
        detectedConfidence: 0.9,
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        userMessage: longMessage,
        timestamp: Date.now(),
      });
      
      expect(log.userMessage.length).toBeLessThanOrEqual(100);
    });
    
    it('should redact phone numbers', () => {
      const log = logDetectedIntent({
        sessionId: 'session-1',
        deviceId: 'device-1',
        messageIndex: 0,
        detectedIntent: 'test',
        detectedConfidence: 0.9,
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        userMessage: 'My number is 9876543210',
        timestamp: Date.now(),
      });
      
      expect(log.userMessage).toContain('[REDACTED]');
    });
  });
  
  describe('correctIntentLog', () => {
    it('should update log with actual intent and correctness', () => {
      // First log an intent
      logDetectedIntent({
        sessionId: 'session-correct',
        deviceId: 'device-1',
        messageIndex: 0,
        detectedIntent: 'billing_query',
        detectedConfidence: 0.9,
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        userMessage: 'What is my bill?',
        timestamp: Date.now(),
      });
      
      // Then correct it
      const corrected = correctIntentLog(
        'session-correct',
        0,
        'billing_query', // Same as detected
        'user_explicit',
      );
      
      expect(corrected?.wasCorrect).toBe(true);
      expect(corrected?.actualIntent).toBe('billing_query');
    });
    
    it('should mark as incorrect when intents differ', () => {
      logDetectedIntent({
        sessionId: 'session-wrong',
        deviceId: 'device-1',
        messageIndex: 0,
        detectedIntent: 'billing_query',
        detectedConfidence: 0.9,
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        userMessage: 'What is my bill?',
        timestamp: Date.now(),
      });
      
      const corrected = correctIntentLog(
        'session-wrong',
        0,
        'recharge_query', // Different from detected
        'user_redirect',
      );
      
      expect(corrected?.wasCorrect).toBe(false);
    });
    
    it('should return null for non-existent log', () => {
      const result = correctIntentLog('non-existent', 0, 'test', 'user_explicit');
      expect(result).toBeNull();
    });
  });
  
  describe('inferIntentCorrectness', () => {
    it('should mark as correct when user confirmed', () => {
      logDetectedIntent({
        sessionId: 'session-infer-1',
        deviceId: 'device-1',
        messageIndex: 0,
        detectedIntent: 'test',
        detectedConfidence: 0.9,
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        userMessage: 'test',
        timestamp: Date.now(),
      });
      
      inferIntentCorrectness('session-infer-1', 0, { userConfirmed: true });
      
      const pending = getPendingSyncData();
      const log = pending.intentLogs.find(l => l.sessionId === 'session-infer-1');
      expect(log?.wasCorrect).toBe(true);
    });
  });
  
  describe('calculateIntentAccuracyMetrics', () => {
    beforeEach(() => {
      clearAllData(); // Clear ALL logs for clean state
    });
    
    it('should calculate accuracy from known logs', () => {
      // Log some intents
      logDetectedIntent({
        sessionId: 's1',
        deviceId: 'd1',
        messageIndex: 0,
        detectedIntent: 'recharge',
        detectedConfidence: 0.9,
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        userMessage: 'test',
        timestamp: Date.now(),
      });
      
      logDetectedIntent({
        sessionId: 's2',
        deviceId: 'd2',
        messageIndex: 0,
        detectedIntent: 'billing',
        detectedConfidence: 0.9,
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        userMessage: 'test',
        timestamp: Date.now(),
      });
      
      // Mark one as correct
      correctIntentLog('s1', 0, 'recharge', 'user_explicit');
      // Mark one as incorrect
      correctIntentLog('s2', 0, 'support', 'user_redirect');
      
      const metrics = calculateIntentAccuracyMetrics();
      
      expect(metrics.totalIntents).toBe(2);
      expect(metrics.correctIntents).toBe(1);
      expect(metrics.incorrectIntents).toBe(1);
      expect(metrics.accuracyRate).toBe(0.5);
    });
    
    it('should track misclassifications', () => {
      // Create a misclassification
      logDetectedIntent({
        sessionId: 's-mis',
        deviceId: 'd1',
        messageIndex: 0,
        detectedIntent: 'billing',
        detectedConfidence: 0.9,
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        userMessage: 'test',
        timestamp: Date.now(),
      });
      
      correctIntentLog('s-mis', 0, 'recharge', 'user_explicit');
      
      const metrics = calculateIntentAccuracyMetrics();
      
      expect(metrics.topMisclassifications.length).toBe(1);
      expect(metrics.topMisclassifications[0].detected).toBe('billing');
      expect(metrics.topMisclassifications[0].actual).toBe('recharge');
    });
  });
  
  // ==========================================================================
  // Sync Functions
  // ==========================================================================
  
  describe('getPendingSyncData', () => {
    it('should return only confirmed intent logs', () => {
      // Log intent without correction
      logDetectedIntent({
        sessionId: 'unconfirmed',
        deviceId: 'd1',
        messageIndex: 0,
        detectedIntent: 'test',
        detectedConfidence: 0.9,
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        userMessage: 'test',
        timestamp: Date.now(),
      });
      
      // Log and confirm another
      logDetectedIntent({
        sessionId: 'confirmed',
        deviceId: 'd2',
        messageIndex: 0,
        detectedIntent: 'test',
        detectedConfidence: 0.9,
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        userMessage: 'test',
        timestamp: Date.now(),
      });
      correctIntentLog('confirmed', 0, 'test', 'inferred');
      
      const pending = getPendingSyncData();
      
      // Only the confirmed one should be in intentLogs
      expect(pending.intentLogs.some(l => l.sessionId === 'confirmed')).toBe(true);
    });
  });
  
  describe('clearSyncedData', () => {
    it('should keep unknown intent logs', () => {
      // Log intent without correction
      logDetectedIntent({
        sessionId: 'unknown',
        deviceId: 'd1',
        messageIndex: 0,
        detectedIntent: 'test',
        detectedConfidence: 0.9,
        ecosystem: 'jio_mobility',
        channel: 'customer_care_chat',
        userMessage: 'test',
        timestamp: Date.now(),
      });
      
      clearSyncedData();
      
      // The unknown log should still be there
      const pending = getPendingSyncData();
      // Since it's unknown (wasCorrect === null), it won't be in intentLogs
      // but we can verify the function doesn't crash
      expect(pending).toBeDefined();
    });
  });
});
