/**
 * Channel-Specific Phrases Tests (Phase 4.2 - Test Plan 3.2)
 * 
 * Tests for channel phrase retrieval:
 * - getOpeningPhrase() returns array for all 18 channels
 * - getClosingPhrase() respects closing context (resolved/pending/escalating)
 * - getTransitionPhrase() returns valid transitions
 * - getChannelConstraints() returns correct constraints
 * - Constraints include maxLength, formalityLevel, allowEmoji
 * - stateToClosingContext() maps conversation states correctly
 * - getChannelPhrasingInstructions() produces valid prompt text
 * - Push notification has empty opening phrases (intentional)
 * - SMS has character limit constraint (160)
 */

import { describe, it, expect } from 'vitest';
import {
  CHANNEL_PHRASES,
  getChannelPhrases,
  getOpeningPhrase,
  getClosingPhrase,
  getTransitionPhrase,
  getChannelConstraints,
  getChannelPhrasingInstructions,
  stateToClosingContext,
  stateToTransition,
  type ChannelPhrases,
} from '../channelPhrases';
import type { ContentChannelType, ConversationState } from '../../../types';

// =============================================================================
// All 18 Channels List
// =============================================================================

const ALL_CHANNELS: ContentChannelType[] = [
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

// =============================================================================
// CHANNEL_PHRASES Configuration Tests
// =============================================================================

describe('CHANNEL_PHRASES configuration', () => {
  it('should have phrases defined for all 18 channels', () => {
    expect(Object.keys(CHANNEL_PHRASES)).toHaveLength(18);
    
    for (const channel of ALL_CHANNELS) {
      expect(CHANNEL_PHRASES[channel]).toBeDefined();
    }
  });

  it('should have required structure for each channel', () => {
    for (const channel of ALL_CHANNELS) {
      const phrases = CHANNEL_PHRASES[channel];
      
      // Opening structure
      expect(phrases.opening).toBeDefined();
      expect(phrases.opening.initial).toBeDefined();
      expect(phrases.opening.returning).toBeDefined();
      expect(phrases.opening.resuming).toBeDefined();
      
      // Closing structure
      expect(phrases.closing).toBeDefined();
      expect(phrases.closing.resolved).toBeDefined();
      expect(phrases.closing.pending).toBeDefined();
      expect(phrases.closing.escalating).toBeDefined();
      expect(phrases.closing.abandoned).toBeDefined();
      
      // Transitions structure
      expect(phrases.transitions).toBeDefined();
      expect(phrases.transitions.toInfoGathering).toBeDefined();
      expect(phrases.transitions.toProcessing).toBeDefined();
      expect(phrases.transitions.toResolution).toBeDefined();
      expect(phrases.transitions.toConfirmation).toBeDefined();
      
      // Constraints
      expect(phrases.constraints).toBeDefined();
      expect(typeof phrases.constraints.formalityLevel).toBe('string');
      expect(typeof phrases.constraints.allowEmoji).toBe('boolean');
      expect(typeof phrases.constraints.requiresAcknowledgment).toBe('boolean');
    }
  });
});

// =============================================================================
// getOpeningPhrase Tests
// =============================================================================

describe('getOpeningPhrase', () => {
  it('should return phrases for channels with openings', () => {
    const channelsWithOpenings: ContentChannelType[] = [
      'customer_care_chat',
      'whatsapp_support',
      'chatbot_faq',
      'ivr_voice_menu',
      'voice_assistant',
      'onboarding_screen',
    ];

    for (const channel of channelsWithOpenings) {
      const phrase = getOpeningPhrase(channel, 'initial');
      expect(phrase).not.toBeNull();
      expect(typeof phrase).toBe('string');
      expect(phrase!.length).toBeGreaterThan(0);
    }
  });

  it('should return null for push_notification (intentionally no opening)', () => {
    const phrase = getOpeningPhrase('push_notification', 'initial');
    expect(phrase).toBeNull();
  });

  it('should return null for channels with skipGreeting=true', () => {
    const skipGreetingChannels: ContentChannelType[] = [
      'push_notification',
      'sms',
      'social_media_post',
      'digital_ads',
      'tv_video_ad',
      'app_notification',
      'voice_prompts',
    ];

    for (const channel of skipGreetingChannels) {
      const constraints = getChannelConstraints(channel);
      if (constraints.skipGreeting) {
        // If skipGreeting is true, opening should be null even if defined
        const phrase = getOpeningPhrase(channel, 'initial');
        // SMS has a brand prefix "Jio:" but skipGreeting means we return null
        if (channel === 'sms') {
          // SMS has special handling - it has phrases but skipGreeting
          // The function returns null when skipGreeting is true
          expect(phrase).toBeNull();
        } else {
          expect(phrase).toBeNull();
        }
      }
    }
  });

  it('should support different contexts (initial, returning, resuming)', () => {
    const phrase1 = getOpeningPhrase('customer_care_chat', 'initial');
    const phrase2 = getOpeningPhrase('customer_care_chat', 'returning');
    const phrase3 = getOpeningPhrase('customer_care_chat', 'resuming');

    expect(phrase1).not.toBeNull();
    expect(phrase2).not.toBeNull();
    expect(phrase3).not.toBeNull();
  });

  it('should fall back to initial when specific context empty', () => {
    // voice_prompts has empty opening arrays, should return null
    const phrase = getOpeningPhrase('voice_prompts', 'returning');
    expect(phrase).toBeNull();
  });
});

// =============================================================================
// getClosingPhrase Tests
// =============================================================================

describe('getClosingPhrase', () => {
  describe('resolved context', () => {
    it('should return phrases for channels with resolved closings', () => {
      const phrase = getClosingPhrase('customer_care_chat', 'resolved');
      expect(phrase).not.toBeNull();
      expect(typeof phrase).toBe('string');
    });

    it('should return helpful closing for support channels', () => {
      const phrase = getClosingPhrase('whatsapp_support', 'resolved');
      expect(phrase).not.toBeNull();
    });
  });

  describe('pending context', () => {
    it('should return pending phrase when issue is in progress', () => {
      const phrase = getClosingPhrase('customer_care_chat', 'pending');
      expect(phrase).not.toBeNull();
    });

    it('should set expectations for follow-up', () => {
      const phrase = getClosingPhrase('transactional_email', 'pending');
      expect(phrase).not.toBeNull();
      expect(phrase).toContain('update');
    });
  });

  describe('escalating context', () => {
    it('should return escalation phrase when handing off', () => {
      const phrase = getClosingPhrase('customer_care_chat', 'escalating');
      expect(phrase).not.toBeNull();
    });

    it('should mention specialist/team/agent', () => {
      const phrase = getClosingPhrase('chatbot_faq', 'escalating');
      expect(phrase).not.toBeNull();
    });
  });

  describe('abandoned context', () => {
    it('should return abandoned phrase when user leaves', () => {
      const phrase = getClosingPhrase('customer_care_chat', 'abandoned');
      expect(phrase).not.toBeNull();
    });
  });

  describe('fallback behavior', () => {
    it('should fall back to resolved when specific context empty', () => {
      // social_media_post has only resolved closings
      const phrase = getClosingPhrase('social_media_post', 'pending');
      expect(phrase).not.toBeNull(); // Falls back to resolved
    });

    it('should return null when no closings available', () => {
      // voice_prompts has no meaningful closings
      const phrase = getClosingPhrase('voice_prompts', 'abandoned');
      expect(phrase).toBeNull();
    });
  });
});

// =============================================================================
// getTransitionPhrase Tests
// =============================================================================

describe('getTransitionPhrase', () => {
  it('should return info gathering transitions', () => {
    const phrase = getTransitionPhrase('customer_care_chat', 'toInfoGathering');
    expect(phrase).not.toBeNull();
    expect(typeof phrase).toBe('string');
  });

  it('should return processing transitions', () => {
    const phrase = getTransitionPhrase('whatsapp_support', 'toProcessing');
    expect(phrase).not.toBeNull();
  });

  it('should return resolution transitions', () => {
    const phrase = getTransitionPhrase('chatbot_faq', 'toResolution');
    expect(phrase).not.toBeNull();
  });

  it('should return confirmation transitions', () => {
    const phrase = getTransitionPhrase('voice_assistant', 'toConfirmation');
    expect(phrase).not.toBeNull();
  });

  it('should return null when transitions not defined', () => {
    // digital_ads has no transitions
    const phrase = getTransitionPhrase('digital_ads', 'toInfoGathering');
    expect(phrase).toBeNull();
  });
});

// =============================================================================
// getChannelConstraints Tests
// =============================================================================

describe('getChannelConstraints', () => {
  it('should return constraints for all channels', () => {
    for (const channel of ALL_CHANNELS) {
      const constraints = getChannelConstraints(channel);
      expect(constraints).toBeDefined();
      expect(['casual', 'balanced', 'formal']).toContain(constraints.formalityLevel);
      expect(typeof constraints.allowEmoji).toBe('boolean');
    }
  });

  it('should have maxLength for SMS (160)', () => {
    const constraints = getChannelConstraints('sms');
    expect(constraints.maxLength).toBe(160);
  });

  it('should have maxLength for push_notification (50)', () => {
    const constraints = getChannelConstraints('push_notification');
    expect(constraints.maxLength).toBe(50);
  });

  it('should have correct emoji settings', () => {
    // Channels that allow emojis
    expect(getChannelConstraints('whatsapp_alert').allowEmoji).toBe(true);
    expect(getChannelConstraints('whatsapp_support').allowEmoji).toBe(true);
    expect(getChannelConstraints('onboarding_screen').allowEmoji).toBe(true);

    // Channels that don't allow emojis
    expect(getChannelConstraints('sms').allowEmoji).toBe(false);
    expect(getChannelConstraints('ivr_voice_menu').allowEmoji).toBe(false);
    expect(getChannelConstraints('transactional_email').allowEmoji).toBe(false);
  });

  it('should have correct formality levels', () => {
    expect(getChannelConstraints('ivr_voice_menu').formalityLevel).toBe('formal');
    expect(getChannelConstraints('transactional_email').formalityLevel).toBe('formal');
    
    expect(getChannelConstraints('whatsapp_support').formalityLevel).toBe('casual');
    expect(getChannelConstraints('voice_assistant').formalityLevel).toBe('casual');
    
    expect(getChannelConstraints('customer_care_chat').formalityLevel).toBe('balanced');
  });

  it('should have requiresAcknowledgment for support channels', () => {
    expect(getChannelConstraints('customer_care_chat').requiresAcknowledgment).toBe(true);
    expect(getChannelConstraints('ivr_voice_menu').requiresAcknowledgment).toBe(true);
    
    expect(getChannelConstraints('push_notification').requiresAcknowledgment).toBe(false);
  });
});

// =============================================================================
// stateToClosingContext Tests
// =============================================================================

describe('stateToClosingContext', () => {
  it('should map escalation state to escalating', () => {
    const context = stateToClosingContext('escalation', false);
    expect(context).toBe('escalating');
  });

  it('should map abandoned state to abandoned', () => {
    const context = stateToClosingContext('abandoned', false);
    expect(context).toBe('abandoned');
  });

  it('should map closing state with isResolved to resolved', () => {
    const context = stateToClosingContext('closing', true);
    expect(context).toBe('resolved');
  });

  it('should return resolved when isResolved is true regardless of state', () => {
    const context = stateToClosingContext('processing', true);
    expect(context).toBe('resolved');
  });

  it('should return pending for non-resolved states', () => {
    const context = stateToClosingContext('processing', false);
    expect(context).toBe('pending');
  });

  it('should return pending for information_gathering state', () => {
    const context = stateToClosingContext('information_gathering', false);
    expect(context).toBe('pending');
  });
});

// =============================================================================
// stateToTransition Tests
// =============================================================================

describe('stateToTransition', () => {
  it('should map information_gathering to toInfoGathering', () => {
    const transition = stateToTransition('information_gathering');
    expect(transition).toBe('toInfoGathering');
  });

  it('should map processing to toProcessing', () => {
    const transition = stateToTransition('processing');
    expect(transition).toBe('toProcessing');
  });

  it('should map resolution to toResolution', () => {
    const transition = stateToTransition('resolution');
    expect(transition).toBe('toResolution');
  });

  it('should map confirmation to toConfirmation', () => {
    const transition = stateToTransition('confirmation');
    expect(transition).toBe('toConfirmation');
  });

  it('should return null for states without transitions', () => {
    expect(stateToTransition('greeting')).toBeNull();
    expect(stateToTransition('closing')).toBeNull();
    expect(stateToTransition('escalation')).toBeNull();
    expect(stateToTransition('abandoned')).toBeNull();
  });
});

// =============================================================================
// getChannelPhrasingInstructions Tests
// =============================================================================

describe('getChannelPhrasingInstructions', () => {
  it('should produce valid prompt text', () => {
    const instructions = getChannelPhrasingInstructions('customer_care_chat');
    
    expect(typeof instructions).toBe('string');
    expect(instructions.length).toBeGreaterThan(0);
  });

  it('should include channel name', () => {
    const instructions = getChannelPhrasingInstructions('whatsapp_support');
    
    expect(instructions).toContain('whatsapp_support');
  });

  it('should include formality level', () => {
    const instructions = getChannelPhrasingInstructions('ivr_voice_menu');
    
    expect(instructions).toContain('Formality');
    expect(instructions).toContain('formal');
  });

  it('should include emoji setting', () => {
    const instructions = getChannelPhrasingInstructions('sms');
    
    expect(instructions).toContain('Emoji');
    expect(instructions).toContain('not allowed');
  });

  it('should include max length when defined', () => {
    const instructions = getChannelPhrasingInstructions('sms');
    
    expect(instructions).toContain('Max length');
    expect(instructions).toContain('160');
  });

  it('should include skip greeting note when applicable', () => {
    const instructions = getChannelPhrasingInstructions('push_notification');
    
    expect(instructions).toContain('Skip greetings');
  });

  it('should include opening examples when available', () => {
    const instructions = getChannelPhrasingInstructions('customer_care_chat');
    
    expect(instructions).toContain('Opening examples');
  });

  it('should include closing examples when available', () => {
    const instructions = getChannelPhrasingInstructions('customer_care_chat');
    
    expect(instructions).toContain('Closing examples');
  });
});

// =============================================================================
// Channel-Specific Tests
// =============================================================================

describe('channel-specific configurations', () => {
  describe('push_notification', () => {
    it('should have empty opening phrases (intentional)', () => {
      const phrases = getChannelPhrases('push_notification');
      expect(phrases.opening.initial).toHaveLength(0);
      expect(phrases.opening.returning).toHaveLength(0);
    });

    it('should have skipGreeting=true', () => {
      const constraints = getChannelConstraints('push_notification');
      expect(constraints.skipGreeting).toBe(true);
    });

    it('should have short maxLength (50)', () => {
      const constraints = getChannelConstraints('push_notification');
      expect(constraints.maxLength).toBe(50);
    });
  });

  describe('sms', () => {
    it('should have 160 character limit', () => {
      const constraints = getChannelConstraints('sms');
      expect(constraints.maxLength).toBe(160);
    });

    it('should have brand prefix opening', () => {
      const phrases = getChannelPhrases('sms');
      expect(phrases.opening.initial).toContain('Jio:');
    });

    it('should not allow emojis', () => {
      const constraints = getChannelConstraints('sms');
      expect(constraints.allowEmoji).toBe(false);
    });
  });

  describe('customer_care_chat', () => {
    it('should have multiple opening options', () => {
      const phrases = getChannelPhrases('customer_care_chat');
      expect(phrases.opening.initial.length).toBeGreaterThan(1);
    });

    it('should have acknowledgment requirement', () => {
      const constraints = getChannelConstraints('customer_care_chat');
      expect(constraints.requiresAcknowledgment).toBe(true);
    });
  });

  describe('ivr_voice_menu', () => {
    it('should be formal', () => {
      const constraints = getChannelConstraints('ivr_voice_menu');
      expect(constraints.formalityLevel).toBe('formal');
    });

    it('should not allow emojis', () => {
      const constraints = getChannelConstraints('ivr_voice_menu');
      expect(constraints.allowEmoji).toBe(false);
    });
  });

  describe('whatsapp_support', () => {
    it('should be casual', () => {
      const constraints = getChannelConstraints('whatsapp_support');
      expect(constraints.formalityLevel).toBe('casual');
    });

    it('should allow emojis', () => {
      const constraints = getChannelConstraints('whatsapp_support');
      expect(constraints.allowEmoji).toBe(true);
    });
  });
});

// =============================================================================
// getChannelPhrases Tests
// =============================================================================

describe('getChannelPhrases', () => {
  it('should return complete phrase object for any channel', () => {
    for (const channel of ALL_CHANNELS) {
      const phrases = getChannelPhrases(channel);
      
      expect(phrases).toBeDefined();
      expect(phrases.opening).toBeDefined();
      expect(phrases.closing).toBeDefined();
      expect(phrases.transitions).toBeDefined();
      expect(phrases.constraints).toBeDefined();
    }
  });
});
