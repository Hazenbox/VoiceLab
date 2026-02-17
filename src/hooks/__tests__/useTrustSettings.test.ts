/**
 * Trust Settings Hook Tests (Phase 4.2 - Test Plan 4.1)
 * 
 * Tests for trust settings utility functions:
 * - getChannelConstraints() returns correct maxLength for each channel
 * - getChannelConstraints() returns correct emoji/formatting permissions
 * - Default settings have expected values
 */

import { describe, it, expect } from 'vitest';
import { getChannelConstraints } from '../useTrustSettings';
import type { ContentChannelType } from '../../types';

// =============================================================================
// getChannelConstraints Tests
// =============================================================================

describe('getChannelConstraints', () => {
  describe('maxLength constraints', () => {
    it('should return 50 for push_notification', () => {
      const constraints = getChannelConstraints('push_notification');
      expect(constraints.maxLength).toBe(50);
    });

    it('should return 160 for sms', () => {
      const constraints = getChannelConstraints('sms');
      expect(constraints.maxLength).toBe(160);
    });

    it('should return 500 for whatsapp_alert', () => {
      const constraints = getChannelConstraints('whatsapp_alert');
      expect(constraints.maxLength).toBe(500);
    });

    it('should return 1000 for customer_care_chat', () => {
      const constraints = getChannelConstraints('customer_care_chat');
      expect(constraints.maxLength).toBe(1000);
    });

    it('should return 800 for whatsapp_support', () => {
      const constraints = getChannelConstraints('whatsapp_support');
      expect(constraints.maxLength).toBe(800);
    });

    it('should return 200 for ivr_voice_menu', () => {
      const constraints = getChannelConstraints('ivr_voice_menu');
      expect(constraints.maxLength).toBe(200);
    });

    it('should return 150 for voice_assistant', () => {
      const constraints = getChannelConstraints('voice_assistant');
      expect(constraints.maxLength).toBe(150);
    });

    it('should return 280 for social_media_post', () => {
      const constraints = getChannelConstraints('social_media_post');
      expect(constraints.maxLength).toBe(280);
    });

    it('should return 90 for digital_ads', () => {
      const constraints = getChannelConstraints('digital_ads');
      expect(constraints.maxLength).toBe(90);
    });
  });

  describe('emoji permissions', () => {
    it('should not allow emoji for sms', () => {
      const constraints = getChannelConstraints('sms');
      expect(constraints.allowsEmoji).toBe(false);
    });

    it('should not allow emoji for push_notification', () => {
      const constraints = getChannelConstraints('push_notification');
      expect(constraints.allowsEmoji).toBe(false);
    });

    it('should allow emoji for whatsapp_support', () => {
      const constraints = getChannelConstraints('whatsapp_support');
      expect(constraints.allowsEmoji).toBe(true);
    });

    it('should allow emoji for customer_care_chat', () => {
      const constraints = getChannelConstraints('customer_care_chat');
      expect(constraints.allowsEmoji).toBe(true);
    });

    it('should not allow emoji for ivr_voice_menu', () => {
      const constraints = getChannelConstraints('ivr_voice_menu');
      expect(constraints.allowsEmoji).toBe(false);
    });

    it('should not allow emoji for transactional_email', () => {
      const constraints = getChannelConstraints('transactional_email');
      expect(constraints.allowsEmoji).toBe(false);
    });

    it('should allow emoji for social_media_post', () => {
      const constraints = getChannelConstraints('social_media_post');
      expect(constraints.allowsEmoji).toBe(true);
    });
  });

  describe('formatting permissions', () => {
    it('should not allow formatting for sms', () => {
      const constraints = getChannelConstraints('sms');
      expect(constraints.allowsFormatting).toBe(false);
    });

    it('should allow formatting for marketing_email', () => {
      const constraints = getChannelConstraints('marketing_email');
      expect(constraints.allowsFormatting).toBe(true);
    });

    it('should allow formatting for customer_care_chat', () => {
      const constraints = getChannelConstraints('customer_care_chat');
      expect(constraints.allowsFormatting).toBe(true);
    });

    it('should not allow formatting for voice_prompts', () => {
      const constraints = getChannelConstraints('voice_prompts');
      expect(constraints.allowsFormatting).toBe(false);
    });

    it('should allow formatting for internal_announcement', () => {
      const constraints = getChannelConstraints('internal_announcement');
      expect(constraints.allowsFormatting).toBe(true);
    });
  });

  describe('fallback behavior', () => {
    it('should return customer_care_chat defaults for unknown channel', () => {
      // @ts-expect-error Testing fallback with invalid channel
      const constraints = getChannelConstraints('unknown_channel');
      expect(constraints.maxLength).toBe(1000);
      expect(constraints.allowsEmoji).toBe(true);
    });
  });

  describe('all channels coverage', () => {
    const allChannels: ContentChannelType[] = [
      'push_notification',
      'sms',
      'whatsapp_alert',
      'customer_care_chat',
      'whatsapp_support',
      'chatbot_faq',
      'ivr_voice_menu',
      'voice_assistant',
      'voice_prompts',
      'marketing_email',
      'transactional_email',
      'social_media_post',
      'digital_ads',
      'tv_video_ad',
      'app_notification',
      'onboarding_screen',
      'internal_announcement',
      'training_module',
    ];

    allChannels.forEach(channel => {
      it(`should return valid constraints for ${channel}`, () => {
        const constraints = getChannelConstraints(channel);
        
        expect(constraints).toBeDefined();
        expect(typeof constraints.maxLength).toBe('number');
        expect(constraints.maxLength).toBeGreaterThan(0);
        expect(typeof constraints.allowsEmoji).toBe('boolean');
        expect(typeof constraints.allowsFormatting).toBe('boolean');
      });
    });
  });
});
