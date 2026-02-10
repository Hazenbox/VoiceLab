/**
 * Channel Registry
 * 
 * 18 Channels representing different output formats for content.
 * Each channel has preset warmth, detail, and goal parameters.
 * 
 * @module services/guidelines/channels
 */

import type { ContentChannelType, ContentGoalType } from '../../types';

/**
 * Channel group for UI organization
 */
export type ChannelGroup = 
  | 'Quick Messages'
  | 'Support & Chat'
  | 'Voice'
  | 'Email'
  | 'Marketing'
  | 'In-App'
  | 'Internal';

/**
 * Channel definition with all parameters
 */
export interface ContentChannel {
  id: ContentChannelType;
  name: string;
  warmth: number;       // 1-10, higher = more friendly/emotional
  detail: number;       // 1-10, higher = more comprehensive
  goal: ContentGoalType;
  group: ChannelGroup;
  maxLength?: number;   // Character limit if applicable
  minLength?: number;   // Minimum length for structured content like emails
  description: string;
  guidelines: string;
}

/**
 * 18 Channels - Complete registry with auto-set parameters
 */
export const CONTENT_CHANNELS: readonly ContentChannel[] = [
  // ==========================================================================
  // Quick Messages
  // ==========================================================================
  {
    id: 'push_notification',
    name: 'Push Notification',
    warmth: 7,
    detail: 2,
    goal: 'Action',
    group: 'Quick Messages',
    maxLength: 100,
    description: 'Mobile push notifications - brief, attention-grabbing',
    guidelines: 'Max 50 chars title, 100 chars body. Front-load key message. Create urgency without clickbait.',
  },
  {
    id: 'sms',
    name: 'SMS',
    warmth: 5,
    detail: 2,
    goal: 'Alert',
    group: 'Quick Messages',
    maxLength: 160,
    description: 'Text messages - clear, direct, essential info only',
    guidelines: 'Max 160 chars per message. No emojis. Include short URLs. Front-load key message.',
  },
  {
    id: 'whatsapp_alert',
    name: 'WhatsApp Alert',
    warmth: 5,
    detail: 2,
    goal: 'Alert',
    group: 'Quick Messages',
    maxLength: 200,
    description: 'WhatsApp notifications - quick alerts and updates',
    guidelines: 'Can use emojis sparingly. Keep scannable. Rich formatting available.',
  },

  // ==========================================================================
  // Support & Chat
  // ==========================================================================
  {
    id: 'customer_care_chat',
    name: 'Customer Care Chat',
    warmth: 8,
    detail: 8,
    goal: 'Support',
    group: 'Support & Chat',
    description: 'Live chat with customer care - empathetic, solution-focused',
    guidelines: 'Acknowledge concern first. Provide step-by-step help. Offer escalation if needed.',
  },
  {
    id: 'whatsapp_support',
    name: 'WhatsApp Support',
    warmth: 7,
    detail: 7,
    goal: 'Support',
    group: 'Support & Chat',
    description: 'WhatsApp business support - conversational, helpful',
    guidelines: 'More conversational tone. Can use rich media. Quick responses expected.',
  },
  {
    id: 'chatbot_faq',
    name: 'Chatbot / FAQ',
    warmth: 5,
    detail: 9,
    goal: 'Instructional',
    group: 'Support & Chat',
    description: 'Automated chatbot responses - comprehensive, structured',
    guidelines: 'Provide complete answers. Use numbered steps. Offer related topics.',
  },

  // ==========================================================================
  // Voice
  // ==========================================================================
  {
    id: 'ivr_voice_menu',
    name: 'IVR / Voice Menu',
    warmth: 6,
    detail: 5,
    goal: 'Instructional',
    group: 'Voice',
    description: 'Interactive voice response - clear, spoken instructions',
    guidelines: 'Keep options brief. Pause between choices. Repeat key info. Max 3-4 options per menu.',
  },
  {
    id: 'voice_assistant',
    name: 'Voice Assistant',
    warmth: 7,
    detail: 6,
    goal: 'Support',
    group: 'Voice',
    description: 'AI voice assistant - natural, conversational',
    guidelines: 'Speak naturally. Confirm understanding. Offer alternatives if unclear.',
  },
  {
    id: 'voice_prompts',
    name: 'Voice Prompts',
    warmth: 6,
    detail: 4,
    goal: 'Instructional',
    group: 'Voice',
    description: 'System voice prompts - polite, calm, brief',
    guidelines: 'Clear but brief. Polite, slightly friendly. Consistent pacing.',
  },

  // ==========================================================================
  // Email
  // ==========================================================================
  {
    id: 'marketing_email',
    name: 'Marketing Email',
    warmth: 7,
    detail: 6,  // Bumped from 5 to 6 (stays in "Moderate detail" bracket)
    goal: 'Engagement',
    group: 'Email',
    minLength: 150,  // Minimum characters to ensure proper email structure
    description: 'Promotional emails - engaging, benefit-focused',
    guidelines: 'MUST include: Subject line, Body with benefit/offer, clear CTA. Scannable with headers. Personalize when possible.',
  },
  {
    id: 'transactional_email',
    name: 'Transactional Email',
    warmth: 5,
    detail: 6,
    goal: 'Confirmation',
    group: 'Email',
    minLength: 100,  // Minimum characters for complete transactional info
    description: 'Order confirmations, receipts - factual, complete',
    guidelines: 'MUST include: Subject line, transaction details, next steps. Professional tone. Clear action items if any.',
  },

  // ==========================================================================
  // Marketing & Ads
  // ==========================================================================
  {
    id: 'social_media_post',
    name: 'Social Media Post',
    warmth: 6,
    detail: 4,
    goal: 'Engagement',
    group: 'Marketing',
    description: 'Social media content - engaging, shareable',
    guidelines: 'Platform-appropriate length. Use hashtags. Encourage interaction. Visual-first thinking.',
  },
  {
    id: 'digital_ads',
    name: 'Digital Ads',
    warmth: 5,
    detail: 3,
    goal: 'Action',
    group: 'Marketing',
    description: 'Display and search ads - attention-grabbing, action-oriented',
    guidelines: 'Strong hooks. Benefit-driven headlines. Clear CTA. A/B test friendly.',
  },
  {
    id: 'tv_video_ad',
    name: 'TV / Video Ad',
    warmth: 8,
    detail: 4,
    goal: 'Engagement',
    group: 'Marketing',
    description: 'Video ad scripts - emotional, memorable',
    guidelines: 'Story-driven. Emotional connection. Strong audio cues. Brand moment at end.',
  },

  // ==========================================================================
  // In-App & Web
  // ==========================================================================
  {
    id: 'app_notification',
    name: 'App Notification',
    warmth: 5,
    detail: 4,
    goal: 'Support',
    group: 'In-App',
    description: 'In-app notifications and alerts - contextual, helpful',
    guidelines: 'Contextually relevant. Action-oriented. Non-intrusive timing.',
  },
  {
    id: 'onboarding_screen',
    name: 'Onboarding Screen',
    warmth: 7,
    detail: 7,
    goal: 'Instructional',
    group: 'In-App',
    description: 'App onboarding flows - welcoming, educational',
    guidelines: 'Progressive disclosure. One concept per screen. Skip option available.',
  },

  // ==========================================================================
  // Internal
  // ==========================================================================
  {
    id: 'internal_announcement',
    name: 'Internal Announcement',
    warmth: 6,
    detail: 6,
    goal: 'Information',
    group: 'Internal',
    description: 'Company announcements - professional, clear',
    guidelines: 'Lead with key message. Include context. Specify action items if any.',
  },
  {
    id: 'training_module',
    name: 'Training Module',
    warmth: 6,
    detail: 9,
    goal: 'Instructional',
    group: 'Internal',
    description: 'Employee training content - comprehensive, educational',
    guidelines: 'Structured learning. Include examples. Check understanding. Provide resources.',
  },
] as const;

/**
 * Get channel by ID
 */
export function getChannel(id: ContentChannelType): ContentChannel {
  const channel = CONTENT_CHANNELS.find(c => c.id === id);
  if (!channel) {
    throw new Error(`Unknown channel: ${id}`);
  }
  return channel;
}

/**
 * Get channels by group
 */
export function getChannelsByGroup(group: ChannelGroup): ContentChannel[] {
  return CONTENT_CHANNELS.filter(c => c.group === group);
}

/**
 * Get all channel groups
 */
export function getChannelGroups(): ChannelGroup[] {
  const groups = new Set(CONTENT_CHANNELS.map(c => c.group));
  return Array.from(groups);
}

/**
 * Get channels for dropdown display, grouped
 */
export function getChannelOptions(): Array<{
  group: ChannelGroup;
  channels: Array<{ value: ContentChannelType; label: string; warmth: number; detail: number }>;
}> {
  const groups = getChannelGroups();
  
  return groups.map(group => ({
    group,
    channels: getChannelsByGroup(group).map(c => ({
      value: c.id,
      label: c.name,
      warmth: c.warmth,
      detail: c.detail,
    })),
  }));
}

/**
 * Get default parameters for a channel
 */
export function getChannelDefaults(id: ContentChannelType): {
  warmth: number;
  detail: number;
  goal: ContentGoalType;
} {
  const channel = getChannel(id);
  return {
    warmth: channel.warmth,
    detail: channel.detail,
    goal: channel.goal,
  };
}

export default CONTENT_CHANNELS;
