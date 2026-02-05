/**
 * Unified Prompt Builder
 * 
 * Constructs comprehensive LLM prompts by combining all context parameters:
 * - Ecosystem context and tone
 * - Channel-specific guidelines
 * - User profile adjustments
 * - Navarasa emotion strategies
 * - Timing guidance
 * - Brand guardrails
 * 
 * @module services/prompt/promptBuilder
 */

import type { GenerationContext, ContentChannelType } from '../../types';
import { getEcosystem, getChannel } from '../guidelines';
import { getToneInstructions, getToneAdjustments } from '../guidelines/userProfile';
import { getEmotionInstructions, getEmotion } from '../guidelines/navarasa';
import { getTimingGuidance } from '../context/timingEngine';
import { getTriggerEventGuidance } from '../context/contextEngine';

// =============================================================================
// BRAND GUARDRAILS
// =============================================================================

/**
 * The 10 Brand Guardrails from Jio Training Materials
 * These are mandatory rules that must be included in every prompt
 */
export const BRAND_GUARDRAILS = [
  {
    id: 'warmth',
    rule: 'Warmth First',
    description: 'Every message should feel like it comes from a friend who genuinely cares.',
    prompt: 'Write with warmth and genuine care. The user should feel valued and supported.',
  },
  {
    id: 'no_jargon',
    rule: 'No Corporate Jargon',
    description: 'Avoid technical terms, corporate speak, or complicated language.',
    prompt: 'Use simple, everyday language. Avoid jargon, technical terms, and corporate speak.',
  },
  {
    id: 'action_clarity',
    rule: 'Clear Action Path',
    description: 'Every communication should have a clear, simple next step.',
    prompt: 'Always provide a clear, actionable next step. Make it easy to understand what to do.',
  },
  {
    id: 'respect_time',
    rule: 'Respect Time',
    description: 'Be concise. Get to the point while remaining warm.',
    prompt: 'Be concise and respect the users time. Get to the point while staying warm.',
  },
  {
    id: 'inclusive',
    rule: 'Inclusive Language',
    description: 'Content must be gender-neutral, age-appropriate, and culturally sensitive.',
    prompt: 'Use gender-neutral, inclusive language. Be culturally and socially sensitive.',
  },
  {
    id: 'no_elitism',
    rule: 'No Elitism',
    description: 'Never make users feel excluded based on their background or literacy.',
    prompt: 'Never use elitist language or make assumptions about users background or education.',
  },
  {
    id: 'empathy',
    rule: 'Empathetic Responses',
    description: 'Acknowledge user emotions and frustrations with understanding.',
    prompt: 'Show empathy. Acknowledge feelings before providing solutions.',
  },
  {
    id: 'trust_transparency',
    rule: 'Build Trust Through Transparency',
    description: 'Be honest about limitations, costs, and what to expect.',
    prompt: 'Be transparent and honest. Never hide costs or create false expectations.',
  },
  {
    id: 'celebrate',
    rule: 'Celebrate with Users',
    description: 'Share in users joys and milestones authentically.',
    prompt: 'When appropriate, celebrate user achievements and milestones warmly.',
  },
  {
    id: 'dignity',
    rule: 'Preserve Dignity',
    description: 'Never make users feel bad about their choices or situations.',
    prompt: 'Always preserve user dignity. Never blame, shame, or make users feel inadequate.',
  },
] as const;

/**
 * Get guardrails formatted for prompt inclusion
 */
export function getGuardrailsPrompt(): string {
  return `## Jio Brand Guidelines (MANDATORY)

Follow these brand guidelines strictly:

${BRAND_GUARDRAILS.map((g, i) => `${i + 1}. **${g.rule}**: ${g.prompt}`).join('\n')}

These guidelines are non-negotiable and must be reflected in every response.`;
}

// =============================================================================
// CHANNEL-SPECIFIC FORMATTING
// =============================================================================

interface ChannelFormatting {
  maxLength?: number;
  structure: string;
  formatting: string[];
  examples?: string[];
}

/**
 * Get channel-specific formatting guidelines
 */
export function getChannelFormatting(channelId: ContentChannelType): ChannelFormatting {
  const formattingRules: Record<ContentChannelType, ChannelFormatting> = {
    push_notification: {
      maxLength: 100,
      structure: 'Title (max 50 chars) + Body (max 100 chars)',
      formatting: [
        'Front-load the key message',
        'Use action verbs',
        'Create urgency without clickbait',
        'One clear call-to-action',
      ],
    },
    sms: {
      maxLength: 160,
      structure: 'Single message within 160 characters',
      formatting: [
        'Start with context (brand/purpose)',
        'Include key information',
        'End with action or link',
        'Avoid special characters',
      ],
    },
    whatsapp_alert: {
      maxLength: 256,
      structure: 'Greeting + Message + Action',
      formatting: [
        'Can use emojis sparingly',
        'Include clickable links',
        'Maintain conversational tone',
        'One message = one purpose',
      ],
    },
    customer_care_chat: {
      structure: 'Greeting + Acknowledgment + Solution + Follow-up',
      formatting: [
        'Use customer name when available',
        'Acknowledge the issue first',
        'Provide step-by-step solution',
        'Offer escalation path',
        'End with satisfaction check',
      ],
    },
    whatsapp_support: {
      structure: 'Personalized greeting + Detailed response + Next steps',
      formatting: [
        'Mirror customer formality level',
        'Use numbered steps for instructions',
        'Include relevant links/resources',
        'Proactive helpful suggestions',
      ],
    },
    chatbot_faq: {
      structure: 'Direct answer + Supporting details + Related help',
      formatting: [
        'Lead with the answer',
        'Use bullet points for clarity',
        'Suggest related FAQs',
        'Offer human escalation option',
      ],
    },
    ivr_voice_menu: {
      maxLength: 50,
      structure: 'Brief option descriptions (max 5 options)',
      formatting: [
        'Use simple, spoken language',
        'Keep each option under 10 words',
        'Most common options first',
        'Include "repeat" and "agent" options',
      ],
    },
    voice_assistant: {
      structure: 'Conversational response optimized for speech',
      formatting: [
        'Use natural speech patterns',
        'Avoid abbreviations and symbols',
        'Include confirmation prompts',
        'Break complex info into turns',
      ],
    },
    voice_prompts: {
      maxLength: 100,
      structure: 'Clear, single-purpose instruction',
      formatting: [
        'Use imperative mood',
        'Include waiting cues',
        'Avoid negative constructions',
        'End with next step',
      ],
    },
    marketing_email: {
      structure: 'Subject + Preview + Header + Body + CTA + Footer',
      formatting: [
        'Subject: 40-60 chars, intriguing',
        'Preview: 85-100 chars, complements subject',
        'One primary CTA above the fold',
        'Scannable with headers and bullets',
        'Mobile-optimized layout',
      ],
    },
    transactional_email: {
      structure: 'Clear subject + Transaction details + Next steps + Support',
      formatting: [
        'Lead with transaction reference',
        'Include all relevant details in structured format',
        'Highlight important dates/amounts',
        'Include support contact',
      ],
    },
    social_media_post: {
      maxLength: 280,
      structure: 'Hook + Message + CTA/Hashtags',
      formatting: [
        'Platform-specific optimization',
        'Use relevant hashtags (max 3-5)',
        'Include visual suggestion',
        'Engagement-focused language',
      ],
    },
    digital_ads: {
      structure: 'Headline + Description + CTA',
      formatting: [
        'Headline: 30 chars, value proposition',
        'Description: 90 chars, benefits',
        'Strong action verb CTA',
        'A/B testing variations',
      ],
    },
    tv_video_ad: {
      structure: 'Script with visual cues and timing',
      formatting: [
        'Include visual direction',
        'Mark timing for key beats',
        'Write for spoken delivery',
        'Include supers/text overlays',
      ],
    },
    app_notification: {
      maxLength: 150,
      structure: 'Brief alert with action',
      formatting: [
        'Contextual and timely',
        'Deep link to relevant screen',
        'Personalized when possible',
        'Respect notification preferences',
      ],
    },
    onboarding_screen: {
      structure: 'Welcome + Value prop + Simple action',
      formatting: [
        'Progressive disclosure',
        'Visual-first with minimal text',
        'One action per screen',
        'Skip option available',
      ],
    },
    internal_announcement: {
      structure: 'Subject + Context + Details + Action + Timeline',
      formatting: [
        'Clear subject line',
        'Executive summary first',
        'Detailed info in sections',
        'Include owner/contact',
      ],
    },
    training_module: {
      structure: 'Objective + Content + Examples + Assessment',
      formatting: [
        'State learning objectives',
        'Chunked content sections',
        'Include practical examples',
        'Interactive elements',
        'Knowledge check questions',
      ],
    },
  };
  
  return formattingRules[channelId] || {
    structure: 'Standard format',
    formatting: ['Follow general best practices'],
  };
}

/**
 * Get channel formatting as prompt text
 */
export function getChannelFormattingPrompt(channelId: ContentChannelType): string {
  const channel = getChannel(channelId);
  const formatting = getChannelFormatting(channelId);
  
  let prompt = `## Channel Guidelines: ${channel.name}

**Channel Type**: ${channel.group}
**Default Tone**: Warmth ${channel.warmth}/10, Detail ${channel.detail}/10
**Primary Goal**: ${channel.goal}

### Structure
${formatting.structure}

### Formatting Rules
${formatting.formatting.map(r => `- ${r}`).join('\n')}`;

  if (formatting.maxLength) {
    prompt += `\n\n**Maximum Length**: ${formatting.maxLength} characters`;
  }

  return prompt;
}

// =============================================================================
// PROMPT BUILDER
// =============================================================================

/**
 * Build complete system prompt from generation context
 */
export function buildSystemPrompt(context: GenerationContext): string {
  const ecosystem = getEcosystem(context.ecosystem);
  const channel = getChannel(context.channel);
  const emotion = getEmotion(context.emotion);
  
  // Get all component prompts
  const guardrails = getGuardrailsPrompt();
  const channelFormatting = getChannelFormattingPrompt(context.channel);
  const toneAdjustments = getToneAdjustments(context.userProfile);
  const toneInstructions = getToneInstructions(toneAdjustments);
  const emotionInstructions = getEmotionInstructions(context.emotion);
  const timingGuidance = getTimingGuidance(context.timing);
  
  // Build the complete system prompt
  return `# Jio Content Generation System

You are generating content for Jio, India's largest digital services company. Your content must reflect Jio's brand values of warmth, accessibility, and trust.

## Current Context

**Ecosystem**: ${ecosystem.name}
${ecosystem.description}
Tone: ${ecosystem.tone}

**Channel**: ${channel.name}
${channel.description}
Goal: ${context.goal}

**Content Parameters**:
- Warmth Level: ${context.warmth}/10 ${context.warmth >= 7 ? '(Very warm, friendly)' : context.warmth <= 3 ? '(Formal, professional)' : '(Balanced)'}
- Detail Level: ${context.detail}/10 ${context.detail >= 7 ? '(Comprehensive, thorough)' : context.detail <= 3 ? '(Brief, concise)' : '(Moderate detail)'}

${guardrails}

${channelFormatting}

## User Profile Adaptations

**Language**: ${context.userProfile.language}
**Region**: ${context.userProfile.region}
**Age Group**: ${context.userProfile.ageGroup}
**Literacy**: ${context.userProfile.literacyLevel}

${toneInstructions}

## Emotional Context

**Detected Emotion**: ${emotion.name} (${emotion.sanskrit})
${emotion.description}

${emotionInstructions}

## Timing Context

${timingGuidance}

## Important Reminders

1. Always maintain Jio's brand voice - warm, helpful, and trustworthy
2. Adapt complexity based on user profile
3. Match the emotional tone appropriately
4. Follow channel-specific formatting strictly
5. Ensure content is inclusive and respectful
6. Be transparent about any limitations or costs
7. Provide clear next steps when applicable

Generate content that makes users feel valued, understood, and supported.`;
}

/**
 * Build user prompt with additional context
 */
export function buildUserPrompt(
  userRequest: string,
  additionalContext?: {
    previousMessages?: string[];
    triggerEvent?: string;
    customInstructions?: string;
  }
): string {
  let prompt = userRequest;
  
  if (additionalContext?.previousMessages?.length) {
    prompt = `Previous context:\n${additionalContext.previousMessages.join('\n')}\n\nCurrent request:\n${prompt}`;
  }
  
  if (additionalContext?.triggerEvent) {
    const guidance = getTriggerEventGuidance(additionalContext.triggerEvent as any);
    prompt = `[${additionalContext.triggerEvent}]: ${guidance}\n\n${prompt}`;
  }
  
  if (additionalContext?.customInstructions) {
    prompt = `${prompt}\n\nAdditional instructions: ${additionalContext.customInstructions}`;
  }
  
  return prompt;
}

/**
 * Build complete prompt object for LLM API
 */
export function buildPrompt(
  context: GenerationContext,
  userRequest: string,
  options?: {
    previousMessages?: string[];
    triggerEvent?: string;
    customInstructions?: string;
  }
): {
  system: string;
  user: string;
  context: GenerationContext;
} {
  return {
    system: buildSystemPrompt(context),
    user: buildUserPrompt(userRequest, options),
    context,
  };
}

/**
 * Get a minimal prompt for quick generations (no full context)
 */
export function buildQuickPrompt(
  channelId: ContentChannelType,
  request: string
): string {
  const channel = getChannel(channelId);
  const formatting = getChannelFormatting(channelId);
  
  return `Generate ${channel.name} content following Jio brand guidelines.
Tone: Warm and helpful
Goal: ${channel.goal}
Format: ${formatting.structure}
${formatting.maxLength ? `Max length: ${formatting.maxLength} characters` : ''}

Request: ${request}`;
}

export default {
  BRAND_GUARDRAILS,
  getGuardrailsPrompt,
  getChannelFormatting,
  getChannelFormattingPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  buildPrompt,
  buildQuickPrompt,
};
