/**
 * Channel Registry with Group Inheritance (AD-3)
 * 
 * 9 channel groups with default properties. Individual channels inherit
 * from their group and only override what's different. This makes adding
 * new channels trivial: just specify the group and any overrides.
 * 
 * Use getChannelConfig() at runtime to get merged properties.
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

// ═══════════════════════════════════════════════════════════════════════════════
// CHANNEL GROUP DEFAULTS (AD-3 Inheritance Model)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Group-level defaults. Channels inherit these unless overridden.
 * New channels only need to specify group + any property they override.
 */
export interface ChannelGroupDefaults {
  warmth: number;
  detail: number;
  maxWords: number;
  structure: string;
}

export const CHANNEL_GROUP_DEFAULTS: Record<ChannelGroup, ChannelGroupDefaults> = {
  'Quick Messages': { warmth: 5, detail: 2, maxWords: 30, structure: 'single line or 2-line alert' },
  'Support & Chat': { warmth: 7, detail: 7, maxWords: 180, structure: 'greeting + solution + next step' },
  'Voice': { warmth: 6, detail: 5, maxWords: 100, structure: 'spoken instructions, natural cadence' },
  'Email': { warmth: 6, detail: 6, maxWords: 400, structure: 'subject + body + CTA + sign-off' },
  'Marketing': { warmth: 6, detail: 4, maxWords: 100, structure: 'hook + message + CTA' },
  'In-App': { warmth: 6, detail: 5, maxWords: 50, structure: 'contextual micro-copy' },
  'Internal': { warmth: 6, detail: 7, maxWords: 300, structure: 'headline + body + action items' },
};

/**
 * Get the resolved config for a channel by merging group defaults with channel overrides.
 * This is the canonical way to get channel properties at runtime.
 */
export function getChannelConfig(id: ContentChannelType): ContentChannel & ChannelGroupDefaults {
  const channel = getChannel(id);
  const groupDefaults = CHANNEL_GROUP_DEFAULTS[channel.group];

  return {
    ...channel,
    warmth: channel.warmth ?? groupDefaults.warmth,
    detail: channel.detail ?? groupDefaults.detail,
    maxWords: groupDefaults.maxWords,
    structure: groupDefaults.structure,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHANNEL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

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

// =============================================================================
// CHANNEL AUTO-DETECTION (Conversational Mode)
// =============================================================================

/**
 * Channel detection keywords mapping
 * Maps keyword patterns to channel IDs for auto-detection from user messages.
 * Order matters: more specific patterns are checked first.
 */
const CHANNEL_DETECTION_MAP: Array<{
  channel: ContentChannelType;
  patterns: RegExp[];
  priority: number;
}> = [
  // Specific channels first (high priority)
  { channel: 'transactional_email', patterns: [/\b(transactional\s+email|order\s+email|receipt\s+email|confirmation\s+email|order\s+confirmation)\b/i], priority: 10 },
  { channel: 'marketing_email', patterns: [/\b(marketing\s+email|email\s+campaign|promotional\s+email|newsletter)\b/i], priority: 10 },
  { channel: 'whatsapp_support', patterns: [/\b(whatsapp\s+support|whatsapp\s+reply|whatsapp\s+response)\b/i], priority: 10 },
  { channel: 'whatsapp_alert', patterns: [/\b(whatsapp\s+message|whatsapp\s+alert|whatsapp\s+notification|whatsapp)\b/i], priority: 9 },
  { channel: 'customer_care_chat', patterns: [/\b(customer\s+care|support\s+chat|care\s+script|support\s+script|care\s+response)\b/i], priority: 10 },
  { channel: 'chatbot_faq', patterns: [/\b(faq|chatbot\s+response|bot\s+reply|chatbot)\b/i], priority: 9 },
  { channel: 'push_notification', patterns: [/\b(push\s+notification|push\s+alert|push\s+message)\b/i], priority: 10 },
  { channel: 'app_notification', patterns: [/\b(app\s+notification|in[\s-]app\s+notification|in[\s-]app\s+alert)\b/i], priority: 10 },
  { channel: 'ivr_voice_menu', patterns: [/\b(ivr|voice\s+menu|ivr\s+script)\b/i], priority: 10 },
  { channel: 'voice_assistant', patterns: [/\b(voice\s+assistant\s+response|voice\s+assistant\s+script)\b/i], priority: 10 },
  { channel: 'voice_prompts', patterns: [/\b(voice\s+prompt|system\s+prompt\s+voice)\b/i], priority: 10 },
  { channel: 'tv_video_ad', patterns: [/\b(tv\s+ad|video\s+ad|commercial|tv\s+script|video\s+script)\b/i], priority: 10 },
  { channel: 'digital_ads', patterns: [/\b(ad\s+copy|google\s+ad|banner\s+ad|digital\s+ad|display\s+ad)\b/i], priority: 10 },
  { channel: 'social_media_post', patterns: [/\b(social\s+media|social\s+post|tweet|instagram\s+post|facebook\s+post|linkedin\s+post)\b/i], priority: 9 },
  { channel: 'onboarding_screen', patterns: [/\b(onboarding\s+copy|onboarding\s+screen|welcome\s+screen)\b/i], priority: 10 },
  { channel: 'internal_announcement', patterns: [/\b(internal\s+announcement|internal\s+comms|memo)\b/i], priority: 9 },
  { channel: 'training_module', patterns: [/\b(training\s+content|training\s+module|training\s+material)\b/i], priority: 10 },
  // Generic/ambiguous channels (lower priority)
  { channel: 'sms', patterns: [/\b(sms|text\s+message)\b/i], priority: 8 },
  { channel: 'marketing_email', patterns: [/\bemail\b/i], priority: 5 }, // Generic "email" defaults to marketing
  { channel: 'push_notification', patterns: [/\bnotification\b/i], priority: 4 }, // Generic "notification" defaults to push
  { channel: 'digital_ads', patterns: [/\b(ad|advertisement)\b/i], priority: 4 }, // Generic "ad" defaults to digital
];

/**
 * Auto-detect channel from user message text.
 * 
 * Mirrors the existing `detectProduct()` pattern from ecosystems.ts.
 * Checks patterns in priority order, returns the highest-priority match.
 * 
 * @param text - The user's message text
 * @returns Detected channel info, or null if no channel keywords found
 */
export function detectChannel(text: string): {
  channel: ContentChannelType;
  matchedKeywords: string[];
  confidence: 'high' | 'medium' | 'low';
} | null {
  const lowerText = text.toLowerCase();
  
  let bestMatch: ContentChannelType | null = null;
  let bestPriority = -1;
  let matchedKeywords: string[] = [];

  for (const entry of CHANNEL_DETECTION_MAP) {
    for (const pattern of entry.patterns) {
      const match = pattern.exec(lowerText);
      if (match && entry.priority > bestPriority) {
        bestMatch = entry.channel;
        bestPriority = entry.priority;
        matchedKeywords = [match[0]];
      }
    }
  }

  if (!bestMatch) {
    return null;
  }

  // Determine confidence based on priority
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (bestPriority >= 9) confidence = 'high';
  else if (bestPriority >= 6) confidence = 'medium';

  return {
    channel: bestMatch,
    matchedKeywords,
    confidence,
  };
}

export default CONTENT_CHANNELS;
