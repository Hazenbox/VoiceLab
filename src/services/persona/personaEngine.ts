/**
 * Persona Engine
 * 
 * Maps user roles to default configuration presets.
 * When a user completes onboarding with role + product, the persona engine
 * auto-configures:
 * - Preferred ecosystem (from product)
 * - Preferred channels (role-specific)
 * - Default warmth/detail levels
 * - Default content goal
 * - Preferred tone framing
 * - Prompt personality injection
 * 
 * This is NON-BREAKING: the system works exactly as before without a persona.
 * Persona just provides smarter defaults.
 * 
 * @module services/persona/personaEngine
 */

import type {
  EcosystemType,
  ContentChannelType,
  ContentGoalType,
  NavarasaType,
} from '../../types';

// ── Persona Types ────────────────────────────────────────────────

export type PersonaRole = 'marketing' | 'product' | 'ux_writer' | 'designer' | 'sales' | 'support' | 'leadership';

/**
 * Complete persona preset -- derived from role.
 * Controls default settings and prompt personality.
 */
export interface PersonaPreset {
  role: PersonaRole;
  label: string;
  description: string;

  // Default UI selections
  preferredChannels: ContentChannelType[];
  defaultChannel: ContentChannelType;
  defaultGoal: ContentGoalType;
  defaultWarmth: number;    // 1-10
  defaultDetail: number;    // 1-10
  defaultEmotion: NavarasaType;

  // Prompt personality
  promptPersonality: string;   // Injected into system prompt
  contentFocus: string;        // What this role cares about
  avoidPatterns: string[];     // Things this role should avoid
}

// ── Role Presets ─────────────────────────────────────────────────

const PERSONA_PRESETS: Record<PersonaRole, PersonaPreset> = {
  marketing: {
    role: 'marketing',
    label: 'Marketing',
    description: 'Campaigns, promotions, brand content',
    preferredChannels: [
      'social_media_post', 'digital_ads', 'marketing_email',
      'push_notification', 'tv_video_ad', 'app_notification',
    ],
    defaultChannel: 'social_media_post',
    defaultGoal: 'Engagement',
    defaultWarmth: 8,
    defaultDetail: 4,
    defaultEmotion: 'adbhuta',
    promptPersonality: `You are writing for a marketing team. Prioritise engagement, brand recall, and emotional connection. Content should be catchy, memorable, and drive action. Think in terms of campaigns, hooks, and customer journeys.`,
    contentFocus: 'Brand voice consistency, engagement metrics, campaign alignment, viral potential',
    avoidPatterns: [
      'Overly technical language',
      'Dry informational tone',
      'Missing call-to-action',
    ],
  },

  product: {
    role: 'product',
    label: 'Product',
    description: 'Feature copy, release notes, in-app content',
    preferredChannels: [
      'app_notification', 'onboarding_screen', 'push_notification',
      'transactional_email', 'chatbot_faq',
    ],
    defaultChannel: 'app_notification',
    defaultGoal: 'Information',
    defaultWarmth: 6,
    defaultDetail: 7,
    defaultEmotion: 'shanta',
    promptPersonality: `You are writing for a product team. Prioritise clarity, feature explanation, and user guidance. Content should help users understand and adopt features. Think in terms of user flows, feature benefits, and progressive disclosure.`,
    contentFocus: 'Feature clarity, user adoption, progressive disclosure, benefit-driven copy',
    avoidPatterns: [
      'Marketing fluff without substance',
      'Vague feature descriptions',
      'Missing user benefit',
    ],
  },

  ux_writer: {
    role: 'ux_writer',
    label: 'UX Writer',
    description: 'Interface copy, microcopy, flows',
    preferredChannels: [
      'onboarding_screen', 'app_notification', 'chatbot_faq',
      'voice_prompts', 'voice_assistant',
    ],
    defaultChannel: 'onboarding_screen',
    defaultGoal: 'Instructional',
    defaultWarmth: 7,
    defaultDetail: 3,
    defaultEmotion: 'shanta',
    promptPersonality: `You are writing for a UX writing team. Prioritise brevity, clarity, and user confidence. Every word must earn its place. Content should guide users smoothly through interfaces. Think in terms of microcopy, error states, empty states, and user emotions at each step.`,
    contentFocus: 'Microcopy precision, user confidence, error handling, accessibility, conciseness',
    avoidPatterns: [
      'Verbose explanations',
      'Technical jargon in UI',
      'Passive voice in instructions',
      'Ambiguous button labels',
    ],
  },

  designer: {
    role: 'designer',
    label: 'Designer',
    description: 'UI, UX, and product design',
    preferredChannels: [
      'onboarding_screen', 'app_notification', 'push_notification',
      'chatbot_faq', 'voice_prompts',
    ],
    defaultChannel: 'onboarding_screen',
    defaultGoal: 'Instructional',
    defaultWarmth: 7,
    defaultDetail: 5,
    defaultEmotion: 'shanta',
    promptPersonality: `You are writing for a design team (UI, UX, product designers). Prioritise visual hierarchy in text, scannability, and user delight. Content should complement design systems and enhance the user experience. Think in terms of design patterns, user flows, accessibility, and consistent voice across touch points.`,
    contentFocus: 'Visual hierarchy, scannability, design-system alignment, user delight, accessibility',
    avoidPatterns: [
      'Walls of text that break visual hierarchy',
      'Inconsistent terminology across screens',
      'Content that ignores the visual context',
      'Inaccessible or jargon-heavy labels',
    ],
  },

  sales: {
    role: 'sales',
    label: 'Sales',
    description: 'Pitches, proposals, outreach',
    preferredChannels: [
      'marketing_email', 'whatsapp_alert', 'sms',
      'digital_ads', 'social_media_post',
    ],
    defaultChannel: 'marketing_email',
    defaultGoal: 'Action',
    defaultWarmth: 8,
    defaultDetail: 6,
    defaultEmotion: 'vira',
    promptPersonality: `You are writing for a sales team. Prioritise persuasion, value proposition, and urgency. Content should drive conversions and build trust. Think in terms of objection handling, social proof, and clear value communication.`,
    contentFocus: 'Value proposition clarity, urgency without pressure, trust building, conversion',
    avoidPatterns: [
      'Pushy or aggressive tone',
      'Unsubstantiated claims',
      'Missing value proposition',
    ],
  },

  support: {
    role: 'support',
    label: 'Support',
    description: 'Help articles, chat responses, FAQs',
    preferredChannels: [
      'customer_care_chat', 'whatsapp_support', 'chatbot_faq',
      'ivr_voice_menu', 'transactional_email',
    ],
    defaultChannel: 'customer_care_chat',
    defaultGoal: 'Support',
    defaultWarmth: 9,
    defaultDetail: 8,
    defaultEmotion: 'karuna',
    promptPersonality: `You are writing for a customer support team. Prioritise empathy, problem resolution, and user reassurance. Content should make users feel heard, then guided to a solution. Think in terms of acknowledgment, clear steps, and follow-up.`,
    contentFocus: 'Empathy first, clear resolution steps, de-escalation, user reassurance',
    avoidPatterns: [
      'Robotic or canned responses',
      'Blaming the user',
      'Missing resolution steps',
      'Cold or dismissive tone',
    ],
  },

  leadership: {
    role: 'leadership',
    label: 'Leadership',
    description: 'Internal comms, strategy, memos',
    preferredChannels: [
      'internal_announcement', 'training_module', 'marketing_email',
    ],
    defaultChannel: 'internal_announcement',
    defaultGoal: 'Information',
    defaultWarmth: 6,
    defaultDetail: 7,
    defaultEmotion: 'vira',
    promptPersonality: `You are writing for leadership communications. Prioritise clarity, inspiration, and strategic alignment. Content should motivate teams, communicate vision, and drive organisational alignment. Think in terms of transparency, purpose, and actionable direction.`,
    contentFocus: 'Strategic clarity, team motivation, organisational alignment, transparent communication',
    avoidPatterns: [
      'Corporate jargon',
      'Vague directives',
      'Missing context or rationale',
    ],
  },
};

// ── Public API ───────────────────────────────────────────────────

/**
 * Get the full persona preset for a role.
 */
export function getPersonaPreset(role: PersonaRole): PersonaPreset {
  return PERSONA_PRESETS[role] || PERSONA_PRESETS.marketing;
}

/**
 * Get all persona presets (for settings UI).
 */
export function getAllPersonaPresets(): PersonaPreset[] {
  return Object.values(PERSONA_PRESETS);
}

/**
 * Get the list of roles for selection UI.
 */
export function getPersonaRoleOptions(): { value: PersonaRole; label: string; description: string }[] {
  return Object.values(PERSONA_PRESETS).map((p) => ({
    value: p.role,
    label: p.label,
    description: p.description,
  }));
}

/**
 * Derive default ecosystem from a product string.
 * The product comes from onboarding and is already an EcosystemType.
 */
export function getDefaultEcosystem(product: string): EcosystemType {
  // The product field from onboarding is already an EcosystemType value
  const validEcosystems: EcosystemType[] = [
    'connectivity', 'home', 'entertainment', 'shopping', 'finance',
    'health', 'business', 'work', 'government', 'education',
    'sports', 'agriculture', 'energy', 'transport', 'support',
  ];

  if (validEcosystems.includes(product as EcosystemType)) {
    return product as EcosystemType;
  }

  return 'connectivity'; // fallback
}

/**
 * Build the persona-specific prompt section.
 * This is injected into the system prompt alongside existing content.
 */
export function buildPersonaPromptSection(role: PersonaRole): string {
  const preset = getPersonaPreset(role);

  return `## Content Creator Context

**Role**: ${preset.label}
${preset.promptPersonality}

**Content Focus**: ${preset.contentFocus}

**Avoid These Patterns**:
${preset.avoidPatterns.map((p) => `- ${p}`).join('\n')}`;
}

/**
 * Get auto-config settings from role + product.
 * Called after onboarding to set all defaults at once.
 */
export function getAutoConfig(role: PersonaRole, product: string): {
  ecosystem: EcosystemType;
  channel: ContentChannelType;
  warmth: number;
  detail: number;
  goal: ContentGoalType;
  emotion: NavarasaType;
} {
  const preset = getPersonaPreset(role);
  const ecosystem = getDefaultEcosystem(product);

  return {
    ecosystem,
    channel: preset.defaultChannel,
    warmth: preset.defaultWarmth,
    detail: preset.defaultDetail,
    goal: preset.defaultGoal,
    emotion: preset.defaultEmotion,
  };
}
