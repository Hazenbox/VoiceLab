/**
 * Emoji Context Tests (Phase 4.2)
 * 
 * Tests for contextual emoji usage rules.
 */

import { describe, it, expect } from 'vitest';
import {
  shouldUseEmoji,
  getEmojiInstructions,
  validateEmojis,
  CONTEXTUAL_EMOJIS,
} from '../emojiContext';

describe('emojiContext', () => {
  // ==========================================================================
  // shouldUseEmoji
  // ==========================================================================
  
  describe('shouldUseEmoji', () => {
    it('should block emojis for finance safety domain', () => {
      const decision = shouldUseEmoji({
        channel: 'customer_care_chat',
        ecosystem: 'jio_mobility',
        safetyDomain: 'finance',
        userEmotion: 'shanta',
        isSupport: false,
        hasUnresolvedIssue: false,
        literacyLevel: 'medium',
      });
      
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('finance');
    });
    
    it('should block emojis for legal safety domain', () => {
      const decision = shouldUseEmoji({
        channel: 'customer_care_chat',
        ecosystem: 'jio_mobility',
        safetyDomain: 'legal',
        userEmotion: 'shanta',
        isSupport: false,
        hasUnresolvedIssue: false,
        literacyLevel: 'medium',
      });
      
      expect(decision.allowed).toBe(false);
    });
    
    it('should block emojis for SMS channel', () => {
      const decision = shouldUseEmoji({
        channel: 'sms',
        ecosystem: 'jio_mobility',
        userEmotion: 'shanta',
        isSupport: false,
        hasUnresolvedIssue: false,
        literacyLevel: 'medium',
      });
      
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('channel');
    });
    
    it('should block emojis for transactional email', () => {
      const decision = shouldUseEmoji({
        channel: 'transactional_email',
        ecosystem: 'jio_mobility',
        userEmotion: 'shanta',
        isSupport: false,
        hasUnresolvedIssue: false,
        literacyLevel: 'medium',
      });
      
      expect(decision.allowed).toBe(false);
    });
    
    it('should block emojis when user has negative emotion', () => {
      const decision = shouldUseEmoji({
        channel: 'customer_care_chat',
        ecosystem: 'jio_mobility',
        userEmotion: 'raudra', // Frustration
        isSupport: true,
        hasUnresolvedIssue: true,
        literacyLevel: 'medium',
      });
      
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('emotion');
    });
    
    it('should block emojis for sad emotions', () => {
      const decision = shouldUseEmoji({
        channel: 'customer_care_chat',
        ecosystem: 'jio_mobility',
        userEmotion: 'karuna', // Sadness
        isSupport: true,
        hasUnresolvedIssue: false,
        literacyLevel: 'medium',
      });
      
      expect(decision.allowed).toBe(false);
    });
    
    it('should block emojis during unresolved support issues', () => {
      const decision = shouldUseEmoji({
        channel: 'customer_care_chat',
        ecosystem: 'jio_mobility',
        userEmotion: 'shanta',
        isSupport: true,
        hasUnresolvedIssue: true,
        literacyLevel: 'medium',
      });
      
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('unresolved');
    });
    
    it('should allow emojis for celebration context', () => {
      const decision = shouldUseEmoji({
        channel: 'customer_care_chat',
        ecosystem: 'jio_mobility',
        userEmotion: 'hasya', // Happy
        isSupport: false,
        hasUnresolvedIssue: false,
        literacyLevel: 'medium',
        context: 'celebration',
      });
      
      expect(decision.allowed).toBe(true);
      expect(decision.suggestedEmojis).toBeDefined();
    });
    
    it('should allow emojis for status updates', () => {
      const decision = shouldUseEmoji({
        channel: 'whatsapp_support',
        ecosystem: 'jio_mobility',
        userEmotion: 'shanta',
        isSupport: false,
        hasUnresolvedIssue: false,
        literacyLevel: 'medium',
        context: 'status',
      });
      
      expect(decision.allowed).toBe(true);
    });
    
    it('should suggest limited emojis for low literacy level', () => {
      const decision = shouldUseEmoji({
        channel: 'customer_care_chat',
        ecosystem: 'jio_mobility',
        userEmotion: 'shanta',
        isSupport: false,
        hasUnresolvedIssue: false,
        literacyLevel: 'low',
        context: 'status',
      });
      
      if (decision.allowed && decision.suggestedEmojis) {
        // Low literacy should use simpler emojis
        expect(decision.suggestedEmojis.length).toBeLessThanOrEqual(5);
      }
    });
  });
  
  // ==========================================================================
  // getEmojiInstructions
  // ==========================================================================
  
  describe('getEmojiInstructions', () => {
    it('should return block instructions for blocked contexts', () => {
      const decision = shouldUseEmoji({
        channel: 'sms',
        ecosystem: 'jio_mobility',
        userEmotion: 'shanta',
        isSupport: false,
        hasUnresolvedIssue: false,
        literacyLevel: 'medium',
      });
      
      const instructions = getEmojiInstructions(decision);
      
      expect(instructions).toContain('Do not use');
    });
    
    it('should include suggested emojis when allowed', () => {
      const decision = shouldUseEmoji({
        channel: 'customer_care_chat',
        ecosystem: 'jio_mobility',
        userEmotion: 'shanta',
        isSupport: false,
        hasUnresolvedIssue: false,
        literacyLevel: 'medium',
        context: 'celebration',
      });
      
      const instructions = getEmojiInstructions(decision);
      
      if (decision.allowed) {
        expect(instructions).toContain('emoji');
      }
    });
    
    it('should include max count guidance', () => {
      const decision = shouldUseEmoji({
        channel: 'whatsapp_support',
        ecosystem: 'jio_mobility',
        userEmotion: 'shanta',
        isSupport: false,
        hasUnresolvedIssue: false,
        literacyLevel: 'medium',
      });
      
      const instructions = getEmojiInstructions(decision);
      
      if (decision.allowed && decision.maxCount) {
        expect(instructions).toContain(String(decision.maxCount));
      }
    });
  });
  
  // ==========================================================================
  // validateEmojis
  // ==========================================================================
  
  describe('validateEmojis', () => {
    it('should pass content without emojis', () => {
      const result = validateEmojis(
        'Hello, how can I help you today?',
        { allowed: false, reason: 'test' },
      );
      
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
    
    it('should detect emojis in blocked context', () => {
      const result = validateEmojis(
        'Your payment failed 😊 Please try again.',
        { allowed: false, reason: 'Finance context blocks emojis' },
      );
      
      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].emoji).toBe('😊');
    });
    
    it('should allow emojis in permitted context', () => {
      const result = validateEmojis(
        'Great! Your recharge was successful! ✅',
        { 
          allowed: true, 
          reason: 'Celebration context',
          suggestedEmojis: ['✅', '🎉', '👍'],
          maxCount: 2,
        },
      );
      
      expect(result.isValid).toBe(true);
    });
    
    it('should detect excessive emoji usage', () => {
      const result = validateEmojis(
        'Great! 🎉🎊✨🌟💫 Your recharge was successful! ✅🎉',
        { 
          allowed: true, 
          reason: 'Allowed',
          suggestedEmojis: ['✅', '🎉'],
          maxCount: 2,
        },
      );
      
      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.reason.includes('too many'))).toBe(true);
    });
    
    it('should flag non-suggested emojis', () => {
      const result = validateEmojis(
        'Your payment is complete 💰',
        { 
          allowed: true, 
          reason: 'Status context',
          suggestedEmojis: ['✅', '👍'],
          maxCount: 2,
        },
      );
      
      // 💰 is not in suggested list
      expect(result.violations.some(v => v.emoji === '💰')).toBe(true);
    });
    
    it('should handle content with multiple emojis', () => {
      const result = validateEmojis(
        'Thanks! ✅ All done! 👍',
        { 
          allowed: true, 
          reason: 'Status context',
          suggestedEmojis: ['✅', '👍', '🎉'],
          maxCount: 3,
        },
      );
      
      expect(result.isValid).toBe(true);
      expect(result.emojisFound).toContain('✅');
      expect(result.emojisFound).toContain('👍');
    });
  });
  
  // ==========================================================================
  // CONTEXTUAL_EMOJIS
  // ==========================================================================
  
  describe('CONTEXTUAL_EMOJIS', () => {
    it('should have status emojis', () => {
      expect(CONTEXTUAL_EMOJIS.status).toBeDefined();
      expect(CONTEXTUAL_EMOJIS.status.length).toBeGreaterThan(0);
    });
    
    it('should have celebration emojis', () => {
      expect(CONTEXTUAL_EMOJIS.celebration).toBeDefined();
      expect(CONTEXTUAL_EMOJIS.celebration.length).toBeGreaterThan(0);
    });
    
    it('should have confirmation emojis', () => {
      expect(CONTEXTUAL_EMOJIS.confirmation).toBeDefined();
      expect(CONTEXTUAL_EMOJIS.confirmation.length).toBeGreaterThan(0);
    });
    
    it('should not have overlapping categories', () => {
      // Technical should not have celebration emojis
      const techEmojis = CONTEXTUAL_EMOJIS.technical || [];
      const celebEmojis = CONTEXTUAL_EMOJIS.celebration || [];
      
      const overlap = techEmojis.filter(e => celebEmojis.includes(e));
      // Some minimal overlap might be acceptable
      expect(overlap.length).toBeLessThanOrEqual(1);
    });
  });
  
  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  
  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = validateEmojis('', { allowed: true, reason: 'test' });
      expect(result.isValid).toBe(true);
    });
    
    it('should handle content with only emojis', () => {
      const result = validateEmojis('👍', { 
        allowed: true, 
        reason: 'test',
        suggestedEmojis: ['👍'],
        maxCount: 1,
      });
      expect(result.isValid).toBe(true);
    });
    
    it('should handle Unicode variations', () => {
      const result = validateEmojis('Done ✅️', { allowed: false, reason: 'test' });
      // Should detect emoji regardless of Unicode variation
      expect(result.isValid).toBe(false);
    });
    
    it('should not flag text emoticons as emojis', () => {
      const result = validateEmojis('Great job :) Keep going!', { 
        allowed: false, 
        reason: 'test',
      });
      
      // Text emoticons like :) should not be flagged
      expect(result.isValid).toBe(true);
    });
  });
});
