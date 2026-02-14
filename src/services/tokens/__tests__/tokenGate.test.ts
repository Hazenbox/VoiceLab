/**
 * Token Gate Tests
 * 
 * Tests for pre-generation blocking and prompt modification based on token values.
 * 
 * Test Categories:
 * A1-A4: Blocking tests (self_harm, violence, suicide_risk, illegal_activity)
 * B1-B6: Modification tests (critical safety, nudge blocking, emotion handling)
 */

import { describe, it, expect } from 'vitest';
import {
  checkTokenGate,
  formatGateDecision,
  hasBlockingTokens,
  DEFAULT_GATE_RULES,
} from '../tokenGate';
import {
  TOKEN_SCENARIOS,
  EXPECTED_BLOCKED_RESPONSES,
  createMockTokens,
} from '../../../test/tokenTestHelpers';

describe('Token Gate', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // A. BLOCKING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('A. Pre-Generation Blocking', () => {
    describe('A1: Self-Harm Blocking', () => {
      it('should block when safety.domain = self_harm', () => {
        const tokens = TOKEN_SCENARIOS.SAFETY_SELF_HARM;
        const decision = checkTokenGate(tokens);

        expect(decision.shouldProceed).toBe(false);
        expect(decision.reason).toContain('safety');
        expect(decision.prebuiltResponse).toBeDefined();
        expect(decision.triggeringTokens).toContain('safety.domain=self_harm');
      });

      it('should return crisis helpline response for self_harm', () => {
        const tokens = TOKEN_SCENARIOS.SAFETY_SELF_HARM;
        const decision = checkTokenGate(tokens);

        expect(decision.prebuiltResponse).toContain('iCall');
        expect(decision.prebuiltResponse).toContain('9152987821');
        expect(decision.prebuiltResponse).toContain('112');
        expect(decision.prebuiltResponse).toContain('Vandrevala Foundation');
      });
    });

    describe('A2: Suicide Risk Blocking', () => {
      it('should block when safety.domain = suicide_risk', () => {
        const tokens = TOKEN_SCENARIOS.SAFETY_SUICIDE_RISK;
        const decision = checkTokenGate(tokens);

        expect(decision.shouldProceed).toBe(false);
        expect(decision.prebuiltResponse).toBeDefined();
        expect(decision.triggeringTokens).toContain('safety.domain=suicide_risk');
      });

      it('should have high priority for suicide_risk', () => {
        const tokens = TOKEN_SCENARIOS.SAFETY_SUICIDE_RISK;
        const decision = checkTokenGate(tokens);

        expect(decision.priority).toBeGreaterThanOrEqual(100);
      });
    });

    describe('A3: Violence Blocking', () => {
      it('should block when safety.domain = violence', () => {
        const tokens = TOKEN_SCENARIOS.SAFETY_VIOLENCE;
        const decision = checkTokenGate(tokens);

        expect(decision.shouldProceed).toBe(false);
        expect(decision.reason).toContain('safety');
      });

      it('should return safety response with emergency numbers', () => {
        const tokens = TOKEN_SCENARIOS.SAFETY_VIOLENCE;
        const decision = checkTokenGate(tokens);

        expect(decision.prebuiltResponse).toContain('112');
        expect(decision.prebuiltResponse).toContain('100');
        expect(decision.prebuiltResponse).toContain('not able to help');
      });
    });

    describe('A4: Illegal Activity Blocking', () => {
      it('should block when safety.domain = illegal_activity', () => {
        const tokens = createMockTokens({ 'safety.domain': 'illegal_activity' });
        const decision = checkTokenGate(tokens);

        expect(decision.shouldProceed).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // B. MODIFICATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('B. Pre-Generation Modifications', () => {
    describe('B1: Critical Safety Mode', () => {
      it('should modify prompt when safety.level = critical', () => {
        const tokens = createMockTokens({ 'safety.level': 'critical' });
        const decision = checkTokenGate(tokens);

        expect(decision.shouldProceed).toBe(true);
        expect(decision.promptInjection).toBeDefined();
        expect(decision.promptInjection).toContain('CRITICAL SAFETY MODE');
        expect(decision.promptInjection).toContain('emergency resources');
      });

      it('should include helpline instruction for critical safety', () => {
        const tokens = createMockTokens({ 'safety.level': 'critical' });
        const decision = checkTokenGate(tokens);

        expect(decision.promptInjection).toContain('112');
        expect(decision.promptInjection).toContain('988');
      });
    });

    describe('B2: Nudge Permission Blocked', () => {
      it('should add nudge restriction when nudge.permission = blocked', () => {
        const tokens = TOKEN_SCENARIOS.NUDGE_BLOCKED;
        const decision = checkTokenGate(tokens);

        expect(decision.shouldProceed).toBe(true);
        expect(decision.promptInjection).toContain('NUDGE RESTRICTION');
        expect(decision.promptInjection).toContain('promotional content');
      });

      it('should add nudge restriction when nudge.permission = never', () => {
        const tokens = TOKEN_SCENARIOS.NUDGE_NEVER;
        const decision = checkTokenGate(tokens);

        expect(decision.shouldProceed).toBe(true);
        expect(decision.promptInjection).toContain('NUDGE RESTRICTION');
      });
    });

    describe('B3: Nudge Permission Minimal', () => {
      it('should add minimal nudge mode when nudge.permission = minimal', () => {
        const tokens = TOKEN_SCENARIOS.NUDGE_MINIMAL;
        const decision = checkTokenGate(tokens);

        expect(decision.shouldProceed).toBe(true);
        expect(decision.promptInjection).toContain('MINIMAL NUDGE MODE');
        expect(decision.promptInjection).toContain('critical/expiring services');
      });
    });

    describe('B4: Angry User (Raudra)', () => {
      it('should add empathy instructions for angry user', () => {
        const tokens = TOKEN_SCENARIOS.EMOTION_ANGRY;
        const decision = checkTokenGate(tokens);

        expect(decision.shouldProceed).toBe(true);
        expect(decision.promptInjection).toContain('ANGRY USER DETECTED');
        expect(decision.promptInjection).toContain('empathy');
        expect(decision.promptInjection).toContain('but');
        expect(decision.promptInjection).toContain('however');
      });

      it('should instruct to avoid defensive language', () => {
        const tokens = TOKEN_SCENARIOS.EMOTION_ANGRY;
        const decision = checkTokenGate(tokens);

        expect(decision.promptInjection).toContain('defensive language');
        expect(decision.promptInjection).toContain('solution');
      });
    });

    describe('B5: Sad User (Karuna)', () => {
      it('should add compassionate mode for sad user', () => {
        const tokens = TOKEN_SCENARIOS.EMOTION_SAD;
        const decision = checkTokenGate(tokens);

        expect(decision.shouldProceed).toBe(true);
        expect(decision.promptInjection).toContain('COMPASSIONATE MODE');
        expect(decision.promptInjection).toContain('empathy');
        expect(decision.promptInjection).toContain('warm');
      });
    });

    describe('B6: Fearful User (Bhayanak)', () => {
      it('should add reassurance mode for fearful user', () => {
        const tokens = TOKEN_SCENARIOS.EMOTION_FEARFUL;
        const decision = checkTokenGate(tokens);

        expect(decision.shouldProceed).toBe(true);
        expect(decision.promptInjection).toContain('REASSURANCE MODE');
        expect(decision.promptInjection).toContain('reassurance');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C. WARNING/DISCLAIMER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('C. Compliance Warnings', () => {
    it('should add financial disclaimer for investment queries', () => {
      const tokens = createMockTokens({ 'safety.domain': 'investment' });
      const decision = checkTokenGate(tokens);

      expect(decision.shouldProceed).toBe(true);
      expect(decision.promptInjection).toContain('financial advice');
      expect(decision.promptInjection).toContain('financial advisor');
    });

    it('should add health disclaimer for health queries', () => {
      const tokens = createMockTokens({ 'safety.domain': 'health_general' });
      const decision = checkTokenGate(tokens);

      expect(decision.shouldProceed).toBe(true);
      expect(decision.promptInjection).toContain('health information');
      expect(decision.promptInjection).toContain('healthcare professional');
    });

    it('should add legal disclaimer for legal queries', () => {
      const tokens = createMockTokens({ 'safety.domain': 'legal_sensitive' });
      const decision = checkTokenGate(tokens);

      expect(decision.shouldProceed).toBe(true);
      expect(decision.promptInjection).toContain('legal advice');
      expect(decision.promptInjection).toContain('legal professional');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // D. UTILITY FUNCTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('D. Utility Functions', () => {
    describe('formatGateDecision', () => {
      it('should format blocked decision correctly', () => {
        const decision = checkTokenGate(TOKEN_SCENARIOS.SAFETY_SELF_HARM);
        const formatted = formatGateDecision(decision);

        expect(formatted).toContain('[BLOCKED]');
      });

      it('should format modified decision correctly', () => {
        const decision = checkTokenGate(TOKEN_SCENARIOS.EMOTION_ANGRY);
        const formatted = formatGateDecision(decision);

        expect(formatted).toContain('[MODIFIED]');
      });

      it('should format allowed decision correctly', () => {
        // With brand protection gate always active for ecosystem tokens,
        // a truly "allowed" decision requires no tokens at all
        const decision = checkTokenGate({});
        const formatted = formatGateDecision(decision);

        expect(formatted).toContain('[ALLOWED]');
      });
    });

    describe('hasBlockingTokens', () => {
      it('should return true for blocking tokens', () => {
        expect(hasBlockingTokens(TOKEN_SCENARIOS.SAFETY_SELF_HARM)).toBe(true);
        expect(hasBlockingTokens(TOKEN_SCENARIOS.SAFETY_VIOLENCE)).toBe(true);
      });

      it('should return false for non-blocking tokens', () => {
        expect(hasBlockingTokens(TOKEN_SCENARIOS.EMOTION_ANGRY)).toBe(false);
        expect(hasBlockingTokens(TOKEN_SCENARIOS.NUDGE_BLOCKED)).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // E. COMBINED SCENARIO TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('E. Combined Scenarios', () => {
    it('should handle angry billing user with multiple modifications', () => {
      const tokens = TOKEN_SCENARIOS.ANGRY_BILLING_USER;
      const decision = checkTokenGate(tokens);

      expect(decision.shouldProceed).toBe(true);
      expect(decision.promptInjection).toContain('ANGRY USER DETECTED');
      expect(decision.triggeringTokens.length).toBeGreaterThan(0);
    });

    it('should prioritize blocking over modification', () => {
      // User is angry AND expressing self-harm
      const tokens = createMockTokens({
        'emotion.rasa.user': 'raudra',
        'safety.domain': 'self_harm',
      });
      const decision = checkTokenGate(tokens);

      // Should block (not just modify)
      expect(decision.shouldProceed).toBe(false);
      expect(decision.prebuiltResponse).toBeDefined();
    });

    it('should combine multiple modifications when not blocked', () => {
      // User is sad AND asking about investment
      const tokens = createMockTokens({
        'emotion.rasa.user': 'karuna',
        'safety.domain': 'investment',
      });
      const decision = checkTokenGate(tokens);

      expect(decision.shouldProceed).toBe(true);
      expect(decision.promptInjection).toContain('COMPASSIONATE MODE');
      expect(decision.promptInjection).toContain('financial');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // F. RULE STRUCTURE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('F. Default Rules Structure', () => {
    it('should have blocking rules for safety', () => {
      const blockingRules = DEFAULT_GATE_RULES.filter(r => r.action === 'block');
      expect(blockingRules.length).toBeGreaterThan(0);
      expect(blockingRules.every(r => r.category === 'safety')).toBe(true);
    });

    it('should have modification rules for emotions', () => {
      const emotionRules = DEFAULT_GATE_RULES.filter(r => r.category === 'emotion');
      expect(emotionRules.length).toBeGreaterThan(0);
      expect(emotionRules.every(r => r.action === 'modify')).toBe(true);
    });

    it('should have warning rules for compliance', () => {
      const complianceRules = DEFAULT_GATE_RULES.filter(r => r.category === 'compliance');
      expect(complianceRules.length).toBeGreaterThan(0);
      // Compliance rules can be add_warning OR modify (brand protection)
      expect(complianceRules.every(r => r.action === 'add_warning' || r.action === 'modify')).toBe(true);
    });

    it('should have priorities set correctly', () => {
      // Safety rules should have highest priority
      const safetyRules = DEFAULT_GATE_RULES.filter(r => r.category === 'safety');
      const otherRules = DEFAULT_GATE_RULES.filter(r => r.category !== 'safety');

      const minSafetyPriority = Math.min(...safetyRules.map(r => r.priority));
      const maxOtherPriority = Math.max(...otherRules.map(r => r.priority));

      expect(minSafetyPriority).toBeGreaterThanOrEqual(maxOtherPriority);
    });
  });
});
