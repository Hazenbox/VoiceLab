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
import { getEmotionInstructions, getEmotion, analyzeEmotion, isNegativeEmotion } from '../guidelines/navarasa';
import { getTimingGuidance, getDayOfWeek } from '../context/timingEngine';
import { getTriggerEventGuidance } from '../context/contextEngine';
import { buildPersonaPromptSection, type PersonaRole } from '../persona';
import { type RetrievedKnowledge, buildKnowledgePromptSection, buildSemanticPromptSection, getCodeDefaults } from '../knowledge';
import { getGoldenExampleForEmotion, formatGoldenExample } from '../../data/goldenExamples';
// Vocabulary imports for static high-priority injection
import {
  SIMPLE_ALTERNATIVES,
  GENDER_NEUTRAL_ALTERNATIVES,
  CARE_CONNECTION_WORDS,
  ACTION_PROGRESS_WORDS,
  CLARITY_SAFETY_WORDS,
  COMMUNITY_FIRST_WORDS,
} from '../guidelines/vocabulary';

// =============================================================================
// BRAND GUARDRAILS (From Training 1.pdf - The 10 Official Jio Guidelines)
// =============================================================================

// Brand guardrails are now in shared config to avoid cross-service coupling
// (trust/ was importing from prompt/, breaking unidirectional flow)
import { BRAND_GUARDRAILS } from '../../config/brandGuardrails';
export { BRAND_GUARDRAILS };

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

  // CRITICAL: Add minLength enforcement for emails and structured content
  if (channel.minLength) {
    prompt += `\n
### CRITICAL: Minimum Length Requirement

This channel requires a **minimum of ${channel.minLength} characters**. This is enforced to ensure proper structure and completeness.

**DO NOT** generate abbreviated or shortened content. Even if the user's request is brief, you MUST generate a complete ${channel.name} with all required sections:`;

    if (channelId === 'marketing_email') {
      prompt += `
- Subject line (clear, benefit-focused)
- Body paragraph(s) with offer/benefit details
- Clear call-to-action
- Professional sign-off`;
    } else if (channelId === 'transactional_email') {
      prompt += `
- Subject line with transaction reference
- Transaction details (amount, date, reference number)
- What happens next / next steps
- Support contact information`;
    }
  }

  return prompt;
}

// =============================================================================
// EMAIL CHANNEL OVERRIDE
// =============================================================================

/**
 * Build email-specific override section
 * This ensures the LLM doesn't abbreviate email content despite brevity instructions
 */
function buildEmailOverrideSection(channelId: ContentChannelType): string {
  if (channelId !== 'marketing_email' && channelId !== 'transactional_email') {
    return '';
  }

  const isMarketing = channelId === 'marketing_email';

  return `
## IMPORTANT: Email Channel Override

**CRITICAL**: When the channel is set to "${isMarketing ? 'Marketing Email' : 'Transactional Email'}", you MUST generate a **complete email** regardless of how brief the user's request is.

### Required Email Structure (DO NOT SKIP ANY SECTION)

${isMarketing ? `1. **Subject Line**: Compelling, benefit-focused (40-60 characters)
2. **Preview Text**: Complements the subject (optional but recommended)
3. **Body**:
   - Opening with value proposition
   - Details of offer/benefit (2-4 sentences minimum)
   - Urgency or timeline (if applicable)
4. **Call-to-Action**: Clear, action-oriented button text
5. **Sign-off**: Professional closing` : `1. **Subject Line**: Clear transaction reference
2. **Transaction Details**: Amount, date, reference number
3. **Status/Confirmation**: What was completed
4. **Next Steps**: What the customer should do or expect
5. **Support Info**: How to get help if needed`}

### Example of WRONG Response (DO NOT DO THIS)
> "Get 50% off on your next recharge. Click here."

### Example of CORRECT Response
> **Subject**: Get 50% off on your next Jio recharge - limited time
>
> Hi there,
>
> We've got something special for you. As a valued Jio customer, you can enjoy **50% off** on your next recharge of ₹299 or more.
>
> This offer is valid until 28 February 2026. Simply use code JIOLOVE50 at checkout or tap the button below to apply it automatically.
>
> [Recharge now and save]
>
> Thanks for being part of the Jio family.

`;
}

// =============================================================================
// STATIC HIGH-PRIORITY VOCABULARY SECTION
// =============================================================================

/**
 * Ecosystem-to-vocabulary priority mapping.
 * Each ecosystem emphasises different vocabulary categories.
 */
const ECOSYSTEM_VOCAB_FOCUS: Record<string, string[]> = {
  jio_telecom:    ['Care & Connection', 'Clarity & Safety'],
  jio_fiber:      ['Action & Progress', 'Clarity & Safety'],
  jio_cinema:     ['Care & Connection', 'Community First'],
  jio_saavn:      ['Care & Connection', 'Community First'],
  jio_mart:       ['Action & Progress', 'Clarity & Safety'],
  jio_financial:  ['Clarity & Safety', 'Action & Progress'],
  jio_health:     ['Care & Connection', 'Clarity & Safety'],
  jio_cloud:      ['Clarity & Safety', 'Action & Progress'],
  jio_business:   ['Action & Progress', 'Clarity & Safety'],
  jio_things:     ['Action & Progress', 'Clarity & Safety'],
};

/**
 * Build a selective vocabulary section based on ecosystem + channel.
 * Only injects the most relevant word categories + always includes
 * the top-10 critical replacements and spelling/format rules.
 */
function buildStaticVocabularySection(ecosystem?: string, channel?: string): string {
  // Always include top-10 critical replacements (tiny token cost)
  const criticalReplacements = [
    ...Object.entries(SIMPLE_ALTERNATIVES).slice(0, 10),
    ...Object.entries(GENDER_NEUTRAL_ALTERNATIVES).slice(0, 5),
  ];

  // Select vocabulary categories based on ecosystem
  const focusCategories = ECOSYSTEM_VOCAB_FOCUS[ecosystem || ''] || ['Care & Connection', 'Clarity & Safety'];

  const allCategories: Record<string, readonly string[]> = {
    'Care & Connection': CARE_CONNECTION_WORDS,
    'Action & Progress': ACTION_PROGRESS_WORDS,
    'Clarity & Safety': CLARITY_SAFETY_WORDS,
    'Community First': COMMUNITY_FIRST_WORDS,
  };

  // Include only the 2 focus categories (10 words each) instead of all 4 (15 each)
  const preferredByCategory: Record<string, readonly string[]> = {};
  for (const cat of focusCategories) {
    if (allCategories[cat]) {
      preferredByCategory[cat] = allCategories[cat].slice(0, 10);
    }
  }

  // For support channels, add extra empathy words
  const supportChannels = ['customer_care_chat', 'whatsapp_support', 'chatbot_faq'];
  if (channel && supportChannels.includes(channel) && !focusCategories.includes('Care & Connection')) {
    preferredByCategory['Care & Connection'] = CARE_CONNECTION_WORDS.slice(0, 8);
  }

  return `## vocabulary rules

### words to avoid (use the alternative)

${criticalReplacements.map(([avoid, use]) => `- "${avoid}" -> "${use}"`).join('\n')}

### preferred vocabulary for this context

${Object.entries(preferredByCategory).map(([category, words]) => 
  `**${category}**: ${words.join(', ')}`
).join('\n')}

### spelling and format

- British English: -ise (not -ize), -our (not -or), -re (not -er)
- Currency: ₹ (not Rs. or INR). Example: ₹399
- Numbers: Indian format 1,00,000 (not 100,000)
- Time: 12-hour 3:30 PM (not 15:30)
- No Oxford comma. Sentence case only.

`;
}

// =============================================================================
// PERSONA NARRATIVE (AD-4 Anti-Blandness)
// =============================================================================

/**
 * Build the persona-driven identity section.
 * Replaces the old bullet-list of 14 voice traits with a concise narrative,
 * negative examples, and context-selective rules.
 */
function buildPersonaNarrative(
  context: GenerationContext,
  emotionId?: string,
): string {
  const isComplaintContext = context.emotion === 'raudra' || context.emotion === 'bibhatsa';
  const isAnxiousContext = context.emotion === 'bhayanaka' || context.emotion === 'karuna';
  const isNegative = isNegativeEmotion(context.emotion);
  const dayType = getDayOfWeek();
  const isWeekend = dayType === 'weekend';

  let narrative = `## who you are

you are jio's voice -- warm, clear, steady. you speak like a caring elder sibling who genuinely wants to help. you are proud to be jio's AI assistant and say so honestly when asked.

your personality in 6 words: simple, warm, honest, inclusive, action-first, never preachy.

you never:
- oversell, push, or create urgency
- blame the user or dismiss their feelings
- use corporate filler ("we value your patience", "your call is important")
- hide behind policy ("as per our terms")
- use title case in labels or headings
- start with "i understand your frustration" without a follow-up action`;

  // Negative examples (AD-4) -- what NOT to sound like
  narrative += `

### what you never sound like

bad: "dear valued customer, we regret to inform you that your request has been logged. please be advised that..."
why: institutional, passive, no human warmth.

bad: "i completely understand your frustration. your concern is very important to us. we are looking into this matter."
why: empty empathy -- acknowledges without acting.

bad: "congratulations!!! you've been selected for an EXCLUSIVE offer!!! act NOW before it expires!!!"
why: urgency pressure, all-caps, excessive punctuation.`;

  // Context-selective rules (only inject what's relevant)
  if (isComplaintContext) {
    narrative += `

### complaint-specific rules (active now)
- acknowledge the specific issue in your first sentence
- take ownership ("i'll fix this" not "this will be looked into")
- give a concrete next step with timeline if possible
- offer personal follow-up or escalation path`;
  }

  if (isAnxiousContext) {
    narrative += `

### anxiety-specific rules (active now)
- reassure immediately with facts, not platitudes
- explain what IS safe/protected before explaining the risk
- break complex steps into one-at-a-time guidance
- end with a safety confirmation`;
  }

  if (isWeekend) {
    narrative += `

### weekend tone (active now)
- you can be slightly more conversational and relaxed
- lighter touch on formality, warmer on personality
- still respect the user's time -- don't over-chat`;
  }

  // Golden example injection for high-emotion contexts
  if (isNegative) {
    const golden = getGoldenExampleForEmotion(emotionId);
    if (golden) {
      narrative += `\n\n${formatGoldenExample(golden)}`;
    }
  }

  narrative += `

### message structure rules
- every response must end with a clear next step when one exists
- max 3 questions per turn (KB/05)
- use "we" for company ownership, "i" when personally helping
- use "if helpful" or "if useful" before optional suggestions (never "you should")
- keep sentences under 20 words for low-literacy users when detected`;

  return narrative;
}

// =============================================================================
// ECOSYSTEM TERMINOLOGY (Phase 3.3)
// =============================================================================

const ECOSYSTEM_TERMINOLOGY: Partial<Record<string, { terms: string[]; toneNote: string }>> = {
  connectivity: {
    terms: ['recharge', 'plan', 'data pack', 'validity', 'talktime', 'network', 'coverage', 'signal'],
    toneNote: 'be quick and confident. users here want speed, not stories.',
  },
  home: {
    terms: ['router', 'WiFi', 'bandwidth', 'setup', 'installation', 'connection speed'],
    toneNote: 'speak like you are helping set up their living room. warm and patient.',
  },
  entertainment: {
    terms: ['stream', 'watch', 'playlist', 'binge', 'episode', 'premiere', 'content library'],
    toneNote: 'be playful and expressive. match the energy of what they are watching.',
  },
  shopping: {
    terms: ['order', 'delivery', 'cart', 'return', 'refund', 'tracking', 'availability'],
    toneNote: 'be a helpful shop assistant. cheerful, practical, no pressure.',
  },
  finance: {
    terms: ['transaction', 'balance', 'statement', 'EMI', 'UPI', 'payment', 'settlement'],
    toneNote: 'be calm and precise. financial conversations need trust, not flair.',
  },
  health: {
    terms: ['consultation', 'appointment', 'prescription', 'symptoms', 'report', 'doctor'],
    toneNote: 'be gentle and steady. health topics need clarity and empathy.',
  },
  business: {
    terms: ['solution', 'deployment', 'SLA', 'bandwidth', 'enterprise', 'integration', 'uptime'],
    toneNote: 'be sharp and professional. business users value precision and results.',
  },
  education: {
    terms: ['course', 'module', 'assessment', 'certificate', 'skill', 'enrolment', 'progress'],
    toneNote: 'be encouraging and clear. learning should feel accessible, not intimidating.',
  },
  sports: {
    terms: ['match', 'score', 'fixture', 'live', 'replay', 'highlights', 'fantasy'],
    toneNote: 'be passionate and bold. sports fans want energy and speed.',
  },
  agriculture: {
    terms: ['crop', 'season', 'market price', 'weather', 'mandi', 'subsidy', 'soil'],
    toneNote: 'be grounded and respectful. speak to real work and real people.',
  },
  energy: {
    terms: ['solar', 'unit', 'consumption', 'grid', 'inverter', 'subsidy', 'savings'],
    toneNote: 'be purposeful and clear. energy conversations are about savings and future.',
  },
  transport: {
    terms: ['route', 'ETA', 'tracking', 'booking', 'fare', 'pickup', 'drop'],
    toneNote: 'be calm and clear. journeys should feel seamless, not stressful.',
  },
};

function buildEcosystemTerminologySection(ecosystem: string): string {
  const eco = ECOSYSTEM_TERMINOLOGY[ecosystem];
  if (!eco) return '';

  return `### ecosystem terminology (${ecosystem})
preferred terms: ${eco.terms.join(', ')}
tone note: ${eco.toneNote}
`;
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
export function buildSystemPrompt(
  context: GenerationContext,
  knowledge?: RetrievedKnowledge,
  userMessage?: string,
): string {
  const ecosystem = getEcosystem(context.ecosystem);
  const channel = getChannel(context.channel);
  const emotion = getEmotion(context.emotion);
  
  // Analyze emotion intensity from user message for emotion-first logic
  const emotionAnalysis = userMessage ? analyzeEmotion(userMessage, context.emotion) : null;
  
  // Get all component prompts
  const guardrails = getGuardrailsPrompt();
  const channelFormatting = getChannelFormattingPrompt(context.channel);
  const toneAdjustments = getToneAdjustments(context.userProfile);
  const toneInstructions = getToneInstructions(toneAdjustments);
  const emotionInstructions = getEmotionInstructions(context.emotion, {
    intensity: emotionAnalysis?.intensity,
    confidence: emotionAnalysis ? 0.7 : undefined,
  });
  const timingGuidance = getTimingGuidance(context.timing);
  const productContext = buildProductContextPrompt(context);
  
  // Selective vocabulary section (ecosystem + channel filtered)
  const staticVocabularySection = buildStaticVocabularySection(context.ecosystem, context.channel);
  
  // Persona section (Phase 1) -- only if a persona role is set
  const personaSection = context.persona
    ? buildPersonaPromptSection(context.persona as PersonaRole)
    : '';
  
  // Knowledge section (Phase 2) -- from Convex or code defaults
  const knowledgeData = knowledge || getCodeDefaults();
  const knowledgeSection = buildKnowledgePromptSection(knowledgeData);
  
  // Semantic RAG section (Phase 4) -- contextually relevant knowledge
  const semanticSection = knowledgeData.semanticResults
    ? buildSemanticPromptSection(knowledgeData.semanticResults)
    : '';
  
  // Persona narrative (AD-4 anti-blandness)
  const personaNarrative = buildPersonaNarrative(context, context.emotion);

  // Ecosystem terminology (Phase 3.3)
  const ecosystemTerminology = buildEcosystemTerminologySection(context.ecosystem);

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

${staticVocabularySection}

${ecosystemTerminology}${buildEmailOverrideSection(context.channel)}${personaSection ? `${personaSection}\n\n` : ''}${channelFormatting}

${knowledgeSection ? `${knowledgeSection}\n\n` : ''}${semanticSection ? `${semanticSection}\n\n` : ''}## User Profile Adaptations

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

${personaNarrative}`;
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
    knowledge?: RetrievedKnowledge;
  }
): {
  system: string;
  user: string;
  context: GenerationContext;
} {
  return {
    system: buildSystemPrompt(context, options?.knowledge, userRequest),
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
