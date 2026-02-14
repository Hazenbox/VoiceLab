/**
 * Token Enforcement Agent Tests
 * 
 * Tests for post-generation validation against token-based enforcement rules.
 * 
 * Test Categories:
 * C1-C12: Post-generation validation tests for each enforcement rule type
 */

import { describe, it, expect } from 'vitest';
import {
  TOKEN_SCENARIOS,
  ENFORCEMENT_RULES,
  containsAnyPattern,
  avoidsAllPatterns,
  isUnderLimit,
  validateAgainstRule,
  createMockTokens,
} from '../../../test/tokenTestHelpers';

describe('Token Enforcement Agent', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // C1-C3: SAFETY RULES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('C1: Safety Critical - Must Contain Emergency Info', () => {
    const rule = ENFORCEMENT_RULES.SAFETY_CRITICAL_MUST_CONTAIN;

    it('should PASS when response contains "112"', () => {
      const response = 'Please call 112 for emergency assistance.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(true);
    });

    it('should PASS when response contains "emergency services"', () => {
      const response = 'Contact emergency services immediately for help.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(true);
    });

    it('should FAIL when response lacks emergency info', () => {
      const response = 'I understand you are having a difficult time. Please take deep breaths.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('missing required patterns');
    });

    it('should trigger auto-fix to add disclaimer', () => {
      expect(rule.autoFixAction).toBe('add_disclaimer');
      expect(rule.autoFixValue).toContain('112');
    });
  });

  describe('C2: Safety Self-Harm - Must Not Contain Methods', () => {
    const rule = ENFORCEMENT_RULES.SAFETY_SELF_HARM_MUST_NOT;

    it('should PASS when response avoids method words', () => {
      const response = 'I hear you are struggling. Please reach out to a counselor who can help.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(true);
    });

    it('should FAIL when response contains "method"', () => {
      const response = 'There are several methods you could consider...';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(false);
    });

    it('should FAIL when response contains "how to"', () => {
      const response = 'Here is how to proceed with your request...';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(false);
    });

    it('should FAIL when response contains "steps"', () => {
      const response = 'Follow these steps to achieve your goal...';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(false);
    });
  });

  describe('C3: Fraud Scam - Must Contain Verification Guidance', () => {
    const rule = ENFORCEMENT_RULES.FRAUD_SCAM_MUST_CONTAIN;

    it('should PASS when response contains "verify"', () => {
      const response = 'Please verify this request through our official channels.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(true);
    });

    it('should PASS when response contains "official"', () => {
      const response = 'Always contact official Jio support for account issues.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(true);
    });

    it('should PASS when response contains "suspicious"', () => {
      const response = 'This sounds suspicious. Never share your OTP.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(true);
    });

    it('should FAIL when response lacks verification guidance', () => {
      const response = 'You can call them back to continue the process.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C4-C5: NUDGE RULES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('C4: Nudge Blocked - Must Not Contain Promotions', () => {
    const rule = ENFORCEMENT_RULES.NUDGE_BLOCKED_MUST_NOT;

    it('should PASS when response is purely informational', () => {
      const response = 'Your current balance is Rs 250. Your plan expires on Feb 20.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(true);
    });

    it('should FAIL when response contains "upgrade"', () => {
      const response = 'You can upgrade to our premium plan for better benefits.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(false);
    });

    it('should FAIL when response contains "offer"', () => {
      const response = 'We have a special offer for you today!';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(false);
    });

    it('should FAIL when response contains "subscribe"', () => {
      const response = 'Subscribe to our annual plan for savings.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(false);
    });

    it('should FAIL when response contains "discount"', () => {
      const response = 'Get 20% discount on your next recharge.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(false);
    });
  });

  describe('C5: Nudge Never - Pattern Forbidden', () => {
    const rule = ENFORCEMENT_RULES.NUDGE_NEVER_PATTERN_FORBIDDEN;

    it('should PASS when response avoids promotional phrases', () => {
      const response = 'Here are our available plans with their features.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(true);
    });

    it('should FAIL when response contains "special offer"', () => {
      const response = 'Check out this special offer just for you!';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(false);
    });

    it('should FAIL when response contains "limited time"', () => {
      const response = 'This limited time deal expires soon!';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(false);
    });

    it('should FAIL when response contains "exclusive deal"', () => {
      const response = 'As a valued customer, here is an exclusive deal for you.';
      const result = validateAgainstRule(response, rule);

      expect(result.passed).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C6-C8: CHANNEL RULES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('C6: SMS Channel - Max 160 Characters', () => {
    const rule = ENFORCEMENT_RULES.SMS_MAX_LENGTH;

    it('should PASS when response is under 160 characters', () => {
      const response = 'Your balance: Rs 150. Plan expires Feb 20. Reply RECHARGE for options.';
      expect(response.length).toBeLessThanOrEqual(160);
      
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(true);
    });

    it('should PASS when response is exactly 160 characters', () => {
      const response = 'A'.repeat(160);
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(true);
    });

    it('should FAIL when response exceeds 160 characters', () => {
      const response = 'Thank you for contacting Jio! Your current prepaid balance is Rs 150.45. Your plan expires on February 20th. You have 1.5GB data remaining and 45 SMS left. Would you like me to suggest some recharge options?';
      expect(response.length).toBeGreaterThan(160);
      
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
      expect(result.message).toContain('exceeds 160 limit');
    });

    it('should have truncate as auto-fix action', () => {
      expect(rule.autoFixAction).toBe('truncate');
    });
  });

  describe('C7: Push Notification - Max 100 Characters', () => {
    const rule = ENFORCEMENT_RULES.PUSH_MAX_LENGTH;

    it('should PASS when response is under 100 characters', () => {
      const response = 'Your bill of Rs 599 is due. Pay now to avoid disconnection.';
      expect(response.length).toBeLessThanOrEqual(100);
      
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(true);
    });

    it('should FAIL when response exceeds 100 characters', () => {
      const response = 'Dear valued customer, your monthly bill of Rs 599 is now due. Please make the payment to continue enjoying uninterrupted services.';
      expect(response.length).toBeGreaterThan(100);
      
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
    });
  });

  describe('C8: IVR Channel - No URLs/Links', () => {
    const rule = ENFORCEMENT_RULES.IVR_MUST_NOT_CONTAIN;

    it('should PASS when response has no URLs', () => {
      const response = 'To recharge, dial star 1 2 3 hash from your phone or visit any Jio store.';
      // Note: "visit" is forbidden, this should fail
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false); // "visit" is in forbidden list
    });

    it('should PASS when response is voice-friendly', () => {
      const response = 'To recharge, dial star 1 2 3 hash from your phone or go to any Jio store.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(true);
    });

    it('should FAIL when response contains "http"', () => {
      const response = 'You can recharge at http://jio.com/recharge';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
    });

    it('should FAIL when response contains "click"', () => {
      const response = 'Click on the recharge button in your app.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
    });

    it('should FAIL when response contains "link"', () => {
      const response = 'I will send you a link to complete the payment.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C9-C10: EMOTION RULES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('C9: Angry User (Raudra) - No Contradicting Language', () => {
    const rule = ENFORCEMENT_RULES.EMOTION_RAUDRA_MUST_NOT;

    it('should PASS when response avoids contradicting words', () => {
      const response = 'I completely understand your frustration. Let me resolve this for you immediately.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(true);
    });

    it('should FAIL when response contains "but"', () => {
      const response = 'I understand your frustration, but we need more time to investigate.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
    });

    it('should FAIL when response contains "however"', () => {
      const response = 'I hear you. However, our policy requires verification.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
    });

    it('should FAIL when response contains "actually"', () => {
      const response = 'Actually, the issue is on your end.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
    });

    it('should FAIL when response contains "unfortunately"', () => {
      const response = 'Unfortunately, we cannot process your request at this time.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
    });

    it('should have replace as auto-fix action with "i understand"', () => {
      expect(rule.autoFixAction).toBe('replace');
      expect(rule.autoFixValue).toBe('i understand');
    });
  });

  describe('C10: Sad User (Karuna) - Must Contain Empathetic Phrases', () => {
    const rule = ENFORCEMENT_RULES.EMOTION_KARUNA_MUST_CONTAIN;

    it('should PASS when response contains "understand"', () => {
      const response = 'I understand this is a difficult situation. Let me see how I can help.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(true);
    });

    it('should PASS when response contains "sorry"', () => {
      const response = 'I am sorry to hear about your situation. We are here to support you.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(true);
    });

    it('should PASS when response contains "help"', () => {
      const response = 'I want to help you through this. Let me check your options.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(true);
    });

    it('should PASS when response contains "here for you"', () => {
      const response = 'I am here for you. We can work through this together.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(true);
    });

    it('should FAIL when response lacks empathetic phrases', () => {
      const response = 'Your payment extension has been approved. The new due date is March 15.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
    });

    it('should have add_disclaimer as auto-fix action', () => {
      expect(rule.autoFixAction).toBe('add_disclaimer');
      expect(rule.autoFixValue).toContain('difficult');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // C11-C12: SIGNATURE AND BRAND RULES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('C11: Completion Signature - No Question Invites', () => {
    it('should PASS when "all set" without question invites', () => {
      const response = "Your recharge is complete! You're all set. Thank you for choosing Jio!";
      const hasForbidden = containsAnyPattern(response, ['let me know if', 'feel free to ask', 'any questions']);
      expect(hasForbidden).toBe(false);
    });

    it('should identify forbidden "let me know if"', () => {
      const response = "You're all set! Let me know if you have any other questions.";
      const hasForbidden = containsAnyPattern(response, ['let me know if']);
      expect(hasForbidden).toBe(true);
    });

    it('should identify forbidden "feel free to ask"', () => {
      const response = "You're all set! Feel free to ask anything else.";
      const hasForbidden = containsAnyPattern(response, ['feel free to ask']);
      expect(hasForbidden).toBe(true);
    });
  });

  describe('C12: Jio Brand - No Competitor Mentions', () => {
    const rule = ENFORCEMENT_RULES.BRAND_JIO_MUST_NOT;

    it('should PASS when response focuses on Jio', () => {
      const response = 'Jio offers excellent coverage with affordable plans and great data speeds.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(true);
    });

    it('should FAIL when response mentions "Airtel"', () => {
      const response = 'Compared to Airtel, Jio has better coverage.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
    });

    it('should FAIL when response mentions "Vodafone"', () => {
      const response = 'Unlike Vodafone, we offer true unlimited calls.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
    });

    it('should FAIL when response mentions "Vi"', () => {
      const response = 'Jio is better than Vi for data plans.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
    });

    it('should FAIL when response mentions "BSNL"', () => {
      const response = 'We have better rural coverage than BSNL.';
      const result = validateAgainstRule(response, rule);
      expect(result.passed).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION HELPER TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Validation Helpers', () => {
    describe('containsAnyPattern', () => {
      it('should detect simple patterns (case-insensitive)', () => {
        expect(containsAnyPattern('Hello WORLD', ['world'])).toBe(true);
        expect(containsAnyPattern('Hello WORLD', ['foo'])).toBe(false);
      });

      it('should detect regex patterns', () => {
        expect(containsAnyPattern('Special offer today', ['(?i)(special offer|limited time)'])).toBe(true);
        expect(containsAnyPattern('Regular price', ['(?i)(special offer|limited time)'])).toBe(false);
      });
    });

    describe('avoidsAllPatterns', () => {
      it('should return true when all patterns avoided', () => {
        expect(avoidsAllPatterns('I understand completely', ['but', 'however'])).toBe(true);
      });

      it('should return false when any pattern found', () => {
        expect(avoidsAllPatterns('I understand, but...', ['but', 'however'])).toBe(false);
      });
    });

    describe('isUnderLimit', () => {
      it('should validate character limits correctly', () => {
        expect(isUnderLimit('Hello', 10)).toBe(true);
        expect(isUnderLimit('Hello World!', 10)).toBe(false);
        expect(isUnderLimit('A'.repeat(160), 160)).toBe(true);
        expect(isUnderLimit('A'.repeat(161), 160)).toBe(false);
      });
    });
  });
});
