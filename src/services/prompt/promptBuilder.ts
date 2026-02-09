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
import { buildPersonaPromptSection, type PersonaRole } from '../persona';

// =============================================================================
// BRAND GUARDRAILS (From Training 1.pdf - The 10 Official Jio Guidelines)
// =============================================================================

/**
 * The 10 Brand Guardrails from Jio Training Materials
 * These are mandatory rules that must be included in every prompt
 * Source: Training 1.pdf, pages 53-56 (lines 1489-1569)
 */
export const BRAND_GUARDRAILS = [
  {
    id: 'direct',
    rule: 'We are direct',
    description: 'Get to the point. No unnecessary words.',
    prompt: 'Be direct and get to the point. No unnecessary words or filler.',
    doExample: 'Fresh food delivered in 15 minutes.',
    dontExample: 'Quick grocery delivery service so that you get what you need, fast.',
  },
  {
    id: 'focused',
    rule: 'We are focused',
    description: 'Say only what matters. Nothing more.',
    prompt: 'Say only what matters. Keep messages focused on one clear purpose.',
    doExample: 'Movie starts instantly. No ads.',
    dontExample: 'Enjoy an uninterrupted streaming experience with no ad breaks.',
  },
  {
    id: 'caring',
    rule: 'We are caring',
    description: 'Be approachable, respectful and put the customer first.',
    prompt: 'Be approachable and respectful. Always put the customer first.',
    doExample: 'Something wrong? We\'ll fix it. Fast and free.',
    dontExample: 'In case of an issue, please file a complaint. Our team will get back to you in due course.',
  },
  {
    id: 'inviting',
    rule: 'We are inviting',
    description: 'Make people feel welcome and included.',
    prompt: 'Make people feel welcome and included. Everyone belongs.',
    doExample: 'Join now. No fees, no commitments. Only premium benefits.',
    dontExample: 'Exclusive memberships and premium benefits available for RelianceOne members.',
  },
  {
    id: 'positive',
    rule: 'We are positive',
    description: 'Offer solutions, not problems.',
    prompt: 'Always offer solutions, not problems. Frame everything positively.',
    doExample: 'Jio True 5G is coming to your area soon. Stay tuned.',
    dontExample: 'Jio True 5G is not available in your area.',
  },
  {
    id: 'personal',
    rule: 'We are personal',
    description: 'Speak to people\'s needs, not just to sell.',
    prompt: 'Speak to people\'s real needs, not just to sell products.',
    doExample: 'Plan your child\'s future with just ₹500 a month.',
    dontExample: 'We offer a range of customised investment options for parents to secure their child\'s future.',
  },
  {
    id: 'simple',
    rule: 'We are simple',
    description: 'Make the message clear and self-explanatory.',
    prompt: 'Make every message clear and self-explanatory. Simple language always.',
    doExample: 'Scan. Pay. Done.',
    dontExample: 'Use our advanced, AI-powered payment gateway to complete your transactions quickly.',
  },
  {
    id: 'modest',
    rule: 'We are modest',
    description: 'Do not boast or exaggerate.',
    prompt: 'Never boast or exaggerate. Let actions speak louder than claims.',
    doExample: 'Our customers trust us for reliable service.',
    dontExample: 'We are the most trusted brand in the industry.',
  },
  {
    id: 'inspirational',
    rule: 'We are inspirational',
    description: 'Encourage and motivate without sounding heavy.',
    prompt: 'Encourage and motivate users without being preachy or heavy-handed.',
    doExample: 'Start small. Dream big. We\'ll help you get there.',
    dontExample: 'Small steps today with Jio will lead to big achievements tomorrow.',
  },
  {
    id: 'non_judgmental',
    rule: 'We are non-judgmental',
    description: 'Respect everyone. Avoid making comparisons that judge or exclude.',
    prompt: 'Respect everyone equally. Never judge or exclude based on background, income, or choices.',
    doExample: 'No matter where you start, you can build the future you want.',
    dontExample: 'If you\'re a highly motivated professional looking to advance, our solutions are for you.',
  },
] as const;

/**
 * Jio's 5 Signature Phrases (From Training 1.pdf lines 1310-1326)
 * These are brand-specific closing/opening phrases
 */
export const SIGNATURE_PHRASES = {
  closing: 'With love, from Jio.',
  emotionalLens: 'Life is beautiful.',
  prideStatement: 'Made in India, with love.',
  unityCall: 'We are Jio.',
  ecosystemIdea: 'JioTogether.',
} as const;

/**
 * Jio's Conversation Flow Structure (From Conversational Engagement 2.pdf)
 * Every conversation should follow this pattern
 */
export const CONVERSATION_FLOW = [
  { step: 1, name: 'Start with care', description: 'Acknowledge the user warmly and show you understand their situation.' },
  { step: 2, name: 'Understand clearly', description: 'Clarify what the user needs before jumping to solutions.' },
  { step: 3, name: 'Resolve in action', description: 'Provide clear, actionable steps to solve the problem.' },
  { step: 4, name: 'Enrich the moment', description: 'Add a helpful tip or additional value.' },
  { step: 5, name: 'Close warmly', description: 'End with warmth and gratitude.' },
  { step: 6, name: 'Next opportunity', description: 'Suggest a relevant next step or related service.' },
] as const;

/**
 * Get guardrails formatted for prompt inclusion
 */
export function getGuardrailsPrompt(): string {
  const guardrailsText = BRAND_GUARDRAILS.map((g, i) => 
    `${i + 1}. **${g.rule}**: ${g.prompt}
   - DO: "${g.doExample}"
   - DON'T: "${g.dontExample}"`
  ).join('\n\n');

  return `## Jio Brand Guidelines (MANDATORY - 10 Guardrails)

Follow these brand guidelines strictly. Each includes a DO and DON'T example:

${guardrailsText}

## Style Rules (MANDATORY)
- Use SENTENCE CASE only (not Title Case). Example: "Get started today" NOT "Get Started Today"
- Avoid exclamation marks unless absolutely necessary
- End every sentence with a full stop - it's Jio's brand signature
- Use British spellings: colour, favourite, organisation (NOT color, favorite, organization)
- Use ₹ symbol for currency (NOT Rs. or INR). Example: ₹399
- Use Indian number format: 1,00,000 (NOT 100,000)
- Use 12-hour time format: 3:30 PM (NOT 15:30)
- No Oxford comma. Example: "speed, value and reliability" (NOT "speed, value, and reliability")

## Conversation Flow (For Support/Chat)
Follow this structure for conversational content:
1. **Start with care**: Acknowledge the user warmly
2. **Understand clearly**: Clarify what they need
3. **Resolve in action**: Provide clear, actionable steps
4. **Enrich the moment**: Add a helpful tip
5. **Close warmly**: End with gratitude
6. **Next opportunity**: Suggest relevant next steps

These guidelines are non-negotiable and must be reflected in every response.`;
}

/**
 * Get signature phrases for appropriate use
 */
export function getSignaturePhraseGuidance(): string {
  return `## Jio Signature Phrases (Use Appropriately)
- Closing messages: "${SIGNATURE_PHRASES.closing}"
- Brand campaigns: "${SIGNATURE_PHRASES.emotionalLens}"
- Product/packaging: "${SIGNATURE_PHRASES.prideStatement}"
- Internal/community: "${SIGNATURE_PHRASES.unityCall}"
- Cross-platform: "${SIGNATURE_PHRASES.ecosystemIdea}"`;
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
 * Build product context section for the prompt
 * This implements the transparency layer - showing what product was detected
 */
function buildProductContextPrompt(context: GenerationContext): string {
  const detected = context.detectedProduct;
  
  if (!detected || detected.confidence === 'none') {
    return `## Content Topic

No specific Jio product was detected in the query. Generate content based on the user's explicit request.`;
  }
  
  let prompt = `## Content Topic (Detected from Query)

**Detected Product**: ${detected.productName}
**Detection Confidence**: ${detected.confidence}
**Matched Keywords**: ${detected.matchedKeywords.join(', ')}`;

  if (detected.ecosystemMismatch) {
    prompt += `

**Note**: The detected product (${detected.productName}) is typically associated with the "${detected.suggestedEcosystem}" ecosystem, but the user has selected a different tone. This is intentional - generate content about ${detected.productName} while using the selected tone and voice style.`;
  }
  
  prompt += `

**Important**: The user's query explicitly mentions this product. Generate content about ${detected.productName} regardless of the ecosystem setting. The ecosystem setting controls the TONE and VOICE STYLE, not the content topic.`;
  
  return prompt;
}

/**
 * Build complete system prompt from generation context
 * 
 * KEY DESIGN (Industry Best Practice):
 * - Ecosystem controls TONE (how content sounds)
 * - Detected Product controls TOPIC (what content is about)
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
  const productContext = buildProductContextPrompt(context);
  
  // Persona section (Phase 1) -- only if a persona role is set
  const personaSection = context.persona
    ? buildPersonaPromptSection(context.persona as PersonaRole)
    : '';
  
  // Build the complete system prompt
  return `# Jio Content Generation System

You are generating content for Jio, India's largest digital services company. Your content must reflect Jio's brand values of warmth, accessibility, and trust.

## Current Context

**Tone & Voice Style**: ${ecosystem.name}
${ecosystem.description}
Voice: ${ecosystem.tone}

**Channel**: ${channel.name}
${channel.description}
Goal: ${context.goal}

**Content Parameters**:
- Warmth Level: ${context.warmth}/10 ${context.warmth >= 7 ? '(Very warm, friendly)' : context.warmth <= 3 ? '(Formal, professional)' : '(Balanced)'}
- Detail Level: ${context.detail}/10 ${context.detail >= 7 ? '(Comprehensive, thorough)' : context.detail <= 3 ? '(Brief, concise)' : '(Moderate detail)'}

${productContext}

${guardrails}

${personaSection ? `${personaSection}\n\n` : ''}${channelFormatting}

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
2. **CRITICAL**: Generate content about the TOPIC from the user's query (detected product if any)
3. **CRITICAL**: Use the TONE from the selected ecosystem setting (${ecosystem.name}: ${ecosystem.tone})
4. Adapt complexity based on user profile
5. Match the emotional tone appropriately
6. Follow channel-specific formatting strictly
7. Ensure content is inclusive and respectful
8. Be transparent about any limitations or costs
9. Provide clear next steps when applicable

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
