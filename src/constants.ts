import type { ConversationConfig, Voice, VoiceGender, DocSection, ResponseLength, Pace, Vibe } from './types';
import { VoiceGender as VG } from './types';

// Default configuration
export const DEFAULT_CONFIG: ConversationConfig = {
  persona: {
    tone: 'warm, helpful, and technically proficient Jio representative',
    pace: 'medium',
    confidence: 'high',
    vibe: 'warm',
    language: 'english',
  },
  greeting: "Namaste! I'm your Jio Voice assistant. How can I help you today?",
  maxResponseLength: 'short',
};

// Response length to word count mapping
export const RESPONSE_LENGTH_WORDS: Record<ResponseLength, number> = {
  short: 15,
  medium: 30,
  long: 50,
};

// Pace descriptions
export const PACE_DESCRIPTIONS: Record<Pace, string> = {
  slow: 'Deliberate, clear pronunciation',
  medium: 'Natural conversational speed',
  fast: 'Energetic, efficient delivery',
};

// Vibe options for dropdown
export const VIBE_OPTIONS: { value: Vibe; label: string }[] = [
  { value: 'calm', label: 'Calm' },
  { value: 'warm', label: 'Warm' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'professional', label: 'Professional' },
];

// Alibaba CosyVoice voices
export const ALIBABA_VOICES: Voice[] = [
  // English Female voices
  { id: 'loongeva_v2', name: 'Eva', gender: VG.FEMALE, language: 'British English', description: 'Intellectual British English' },
  { id: 'loongabby_v2', name: 'Abby', gender: VG.FEMALE, language: 'American English', description: 'American English female' },
  { id: 'loongluna_v2', name: 'Luna', gender: VG.FEMALE, language: 'British English', description: 'British English female' },
  { id: 'loongemily_v2', name: 'Emily', gender: VG.FEMALE, language: 'British English', description: 'British English female' },
  { id: 'loongcindy_v2', name: 'Cindy', gender: VG.FEMALE, language: 'American English', description: 'American English female' },
  { id: 'loongbeth_v2', name: 'Beth', gender: VG.FEMALE, language: 'American English', description: 'American English female' },
  // English Male voices
  { id: 'loongbrian_v2', name: 'Brian', gender: VG.MALE, language: 'British English', description: 'Calm British English' },
  { id: 'loongdavid_v2', name: 'David', gender: VG.MALE, language: 'American English', description: 'American English male' },
  { id: 'loongluca_v2', name: 'Luca', gender: VG.MALE, language: 'British English', description: 'British English male' },
  { id: 'loongeric_v2', name: 'Eric', gender: VG.MALE, language: 'British English', description: 'British English male' },
  { id: 'loongandy_v2', name: 'Andy', gender: VG.MALE, language: 'American English', description: 'American English male' },
];

// Gemini voices
export const GEMINI_VOICES: Voice[] = [
  { id: 'Kore', name: 'Kore', gender: VG.FEMALE, language: 'Indian English', description: 'Default female voice for Jio' },
  { id: 'Puck', name: 'Puck', gender: VG.MALE, language: 'Indian English', description: 'Default male voice for Jio' },
];

// ElevenLabs voices (supports Hindi and Indian English)
export const ELEVENLABS_VOICES: Voice[] = [
  // Custom Jio voices (primary)
  { id: 'xMagNCpMgZ83QOEsHNre', name: 'Jio Male', gender: VG.MALE, language: 'Indian English', description: 'Custom Jio Male Voice' },
  { id: '90ipbRoKi4CpHXvKVtl0', name: 'Jio Female', gender: VG.FEMALE, language: 'Indian English', description: 'Custom Jio Female Voice' },
  // Standard ElevenLabs voices (fallback)
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: VG.MALE, language: 'English', description: 'Deep, Natural Male Voice' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: VG.FEMALE, language: 'English', description: 'Soft, Expressive Female Voice' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', gender: VG.FEMALE, language: 'English', description: 'Pleasant, Natural Female Voice' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: VG.MALE, language: 'English', description: 'Young, Professional Male Voice' },
];

// Get voice by gender for Alibaba
export const getAlibabaVoiceByGender = (gender: VoiceGender): string => {
  return gender === VG.FEMALE ? 'loongeva_v2' : 'loongbrian_v2';
};

// Get voice by gender for Gemini
export const getGeminiVoiceByGender = (gender: VoiceGender): string => {
  return gender === VG.FEMALE ? 'Kore' : 'Puck';
};

// Get voice by gender for ElevenLabs (custom Jio voices)
export const getElevenLabsVoiceByGender = (gender: VoiceGender): string => {
  return gender === VG.FEMALE ? '90ipbRoKi4CpHXvKVtl0' : 'xMagNCpMgZ83QOEsHNre'; // Jio Female : Jio Male
};

// System instruction for live conversation
export const getSystemInstruction = (config: ConversationConfig): string => {
  const maxWords = RESPONSE_LENGTH_WORDS[config.maxResponseLength];
  
  return `You are "Jio Voice", a high-end experiential voice assistant for Jio.

CRITICAL VOICE INSTRUCTIONS:
1. ACCENT: You MUST speak with a distinct, natural, and professional INDIAN ENGLISH accent.
2. PRONUNCIATION: Use authentic Indian vowel sounds and intonation patterns.
3. DO NOT sound American, British, or Robotic. You are an Indian local.

Persona:
- Role: ${config.persona.tone}
- Vibe: ${config.persona.vibe}
- Language: Strictly Indian English.

Behavioral Rules:
1. Keep responses concise (Maximum ${maxWords} words).
2. Be helpful about Jio services (Fiber, Mobility, Mart).
3. Use natural Indian English phrasing.
4. Speak at a ${config.persona.pace} pace.
5. Start conversations with: "${config.greeting}"
6. Be ${config.persona.confidence} in your confidence level.`;
};

// System instruction for TTS
export const getTTSInstruction = (): string => {
  return `You are a highly advanced text-to-speech engine for the Indian market.
CRITICAL VOICE INSTRUCTION:
- Read the provided text with a STRICT, NATURAL, AND PROFESSIONAL INDIAN ENGLISH ACCENT.
- Your pronunciation must be authentically Indian (Indian English).
- Do NOT use an American or British accent.
- Do NOT add conversational fillers.
- ONLY speak the exact text provided.`;
};

// Audio configuration
export const AUDIO_CONFIG = {
  inputSampleRate: 16000,  // Microphone input
  outputSampleRate: 24000, // AI response (Gemini)
  alibabaOutputSampleRate: 22050, // CosyVoice output
  bufferSize: 2048,
  channels: 1,
};

// Documentation sections
export const DOCUMENTATION_SECTIONS: DocSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    content: `The Jio Voice Designer is a powerful tool for prototyping and testing voice assistant personas. 
    It allows you to:
    • Synthesize speech with customizable voice parameters
    • Conduct real-time voice conversations with an AI assistant
    • Configure personality traits, tone, and behavioral characteristics
    • Preview how the voice assistant will sound in production`,
  },
  {
    id: 'voice-models',
    title: 'Voice Models',
    content: `Available voice options:
    
    Alibaba CosyVoice (Default):
    • Eva (Female) - Intellectual British English
    • Brian (Male) - Calm British English
    • Abby (Female) - American English
    • David (Male) - American English
    
    Google Gemini (Indian English):
    • Kore (Female) - Default female voice
    • Puck (Male) - Default male voice
    
    ElevenLabs (Multilingual - Hindi & English):
    • Adam (Male) - Deep, Natural Male Voice
    • Bella (Female) - Soft, Expressive Female Voice
    • Dorothy (Female) - Pleasant, Natural Female Voice
    • Josh (Male) - Young, Professional Male Voice
    
    Select the voice model that best fits your use case. ElevenLabs is recommended for Hindi and high-quality English voices.`,
  },
  {
    id: 'tone-definition',
    title: 'Tone Definition',
    content: `The tone definition shapes how the voice assistant communicates:
    
    • Describe the personality traits you want the assistant to embody
    • Example: "warm, helpful, and technically proficient"
    • The tone affects word choice, phrasing, and emotional delivery
    
    Vibe Options:
    • Calm - Soothing and relaxed delivery
    • Warm - Friendly and approachable
    • Energetic - Upbeat and enthusiastic
    • Professional - Formal and business-like`,
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    content: `Tips for optimal results:
    
    1. Start with the default configuration and make incremental changes
    2. Test with various phrases to ensure consistency
    3. Use the Tap-to-Talk mode to validate conversation flows
    4. Keep responses short for better user experience
    5. Match the vibe to your target use case
    6. Test across different scenarios (greetings, help requests, errors)
    
    For production deployment, always validate with real users.`,
  },
];

// WebSocket endpoints
export const WEBSOCKET_ENDPOINTS = {
  alibaba: {
    tts: 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/',
    asr: 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime',
  },
  gemini: {
    live: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent',
  },
  elevenlabs: {
    rest: 'https://api.elevenlabs.io/v1',
    websocket: 'wss://api.elevenlabs.io/v1/text-to-speech',
  },
};

// Model names
export const MODELS = {
  alibaba: {
    tts: 'cosyvoice-v3-flash',
    asr: 'qwen3-asr-flash-realtime',
    llm: 'qwen-turbo',
  },
  gemini: {
    tts: 'gemini-2.0-flash',
    live: 'gemini-2.0-flash',
  },
  elevenlabs: {
    tts: 'eleven_multilingual_v2',
  },
};

// ============================================
// COPY GENERATION SYSTEM PROMPTS
// ============================================

export interface CopyGenerationPrompt {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  examplePrompts?: string[];
}

// Default copy generation system prompt
export const COPY_GENERATION_SYSTEM_PROMPT = `You are a professional copywriter for Jio, India's leading telecommunications company.

CORE IDENTITY:
- You write compelling, clear, and engaging copy for Jio products and services
- Your tone is modern, approachable, and authentically Indian
- You understand the Indian market and cultural nuances

WRITING GUIDELINES:
1. Keep copy concise and impactful
2. Use simple, clear language that resonates with diverse Indian audiences
3. Highlight benefits over features
4. Include calls-to-action when appropriate
5. Maintain brand consistency with Jio's voice

BRAND VOICE:
- Confident but not arrogant
- Innovative and forward-thinking
- Customer-centric
- Relatable to all demographics
- Proud of Indian heritage

FORMATTING:
- Use short paragraphs for readability
- Include bullet points for lists
- Suggest headlines and taglines when asked
- Provide multiple options when requested

You can write:
- Marketing copy
- Product descriptions
- Social media posts
- Email campaigns
- Ad copy
- Landing page content
- Push notifications
- SMS messages
- App store descriptions`;

// Predefined copy generation prompts for different use cases
export const COPY_GENERATION_PROMPTS: CopyGenerationPrompt[] = [
  {
    id: 'marketing-general',
    name: 'General Marketing',
    description: 'General purpose marketing copy',
    systemPrompt: COPY_GENERATION_SYSTEM_PROMPT,
    examplePrompts: [
      'Write a tagline for JioFiber',
      'Create 3 social media posts for Diwali offers',
      'Write product description for JioMart',
    ],
  },
  {
    id: 'promotional',
    name: 'Promotional Offers',
    description: 'Copy for sales, discounts, and special offers',
    systemPrompt: `${COPY_GENERATION_SYSTEM_PROMPT}

PROMOTIONAL FOCUS:
- Create urgency without being pushy
- Clearly state the offer value
- Include terms/conditions reminders
- Make redemption steps clear
- Use numbers and percentages effectively`,
    examplePrompts: [
      'Write copy for a 50% off JioFiber promotion',
      'Create a flash sale announcement',
      'Write a limited-time offer email',
    ],
  },
  {
    id: 'technical',
    name: 'Technical/Product',
    description: 'Technical product descriptions and features',
    systemPrompt: `${COPY_GENERATION_SYSTEM_PROMPT}

TECHNICAL WRITING FOCUS:
- Explain complex features simply
- Use analogies for technical concepts
- Balance technical accuracy with accessibility
- Include specs when relevant
- Highlight competitive advantages`,
    examplePrompts: [
      'Explain 5G benefits for average users',
      'Write JioPhone feature comparison',
      'Describe JioCloud security features',
    ],
  },
  {
    id: 'support',
    name: 'Customer Support',
    description: 'Help articles and support content',
    systemPrompt: `${COPY_GENERATION_SYSTEM_PROMPT}

SUPPORT CONTENT FOCUS:
- Clear step-by-step instructions
- Anticipate common questions
- Use numbered lists for processes
- Include troubleshooting tips
- Empathetic and helpful tone`,
    examplePrompts: [
      'Write FAQ for JioFiber installation',
      'Create troubleshooting guide for connectivity',
      'Write recharge help article',
    ],
  },
];

// Channel-specific guidelines
const CHANNEL_GUIDELINES: Record<string, string> = {
  sms: `
CHANNEL: SMS
- Maximum 160 characters per message (or 320 for multipart)
- No emojis or special formatting
- Clear, direct language
- Include short URLs when needed
- Front-load the key message`,
  whatsapp: `
CHANNEL: WhatsApp
- Can use emojis sparingly for engagement
- Rich text formatting available (*bold*, _italic_)
- Can include images, videos, or documents
- More conversational tone allowed
- Can be slightly longer but keep it scannable`,
  email: `
CHANNEL: Email
- Compelling subject line is critical
- Use headers and bullet points for scannability
- Include clear CTAs
- Professional but friendly tone
- Can include detailed information`,
};

// Platform-specific guidelines
const PLATFORM_GUIDELINES: Record<string, string> = {
  notifications: `
PLATFORM: Push Notifications
- Extremely brief (max 50 chars title, 100 chars body)
- Urgent, action-oriented language
- Create curiosity without clickbait
- Personalize when possible
- Clear value proposition`,
  banner: `
PLATFORM: Banner/Display Ads
- Visual-first thinking
- Minimal text (headline + CTA)
- Bold, attention-grabbing headlines
- Strong visual contrast suggestions
- Single focused message`,
  ads: `
PLATFORM: Digital Ads
- Platform-aware (social, search, display)
- A/B test friendly variations
- Strong hooks and CTAs
- Benefit-driven headlines
- Character limits awareness`,
};

// Get system prompt with channel and platform context
export const getCopySystemPrompt = (
  promptId?: string, 
  channel?: string, 
  platform?: string
): string => {
  let basePrompt = COPY_GENERATION_SYSTEM_PROMPT;
  
  if (promptId) {
    const prompt = COPY_GENERATION_PROMPTS.find(p => p.id === promptId);
    if (prompt) {
      basePrompt = prompt.systemPrompt;
    }
  }
  
  // Add channel-specific guidelines
  if (channel && CHANNEL_GUIDELINES[channel]) {
    basePrompt += `\n${CHANNEL_GUIDELINES[channel]}`;
  }
  
  // Add platform-specific guidelines
  if (platform && PLATFORM_GUIDELINES[platform]) {
    basePrompt += `\n${PLATFORM_GUIDELINES[platform]}`;
  }
  
  return basePrompt;
};

// Conversation context prompt for Tap-to-Talk LLM
export const getConversationLLMPrompt = (config: ConversationConfig): string => {
  const maxWords = RESPONSE_LENGTH_WORDS[config.maxResponseLength];
  
  return `You are "Jio Voice", a helpful voice assistant for Jio customers.

PERSONALITY:
- Tone: ${config.persona.tone}
- Vibe: ${config.persona.vibe}
- Confidence: ${config.persona.confidence}

RESPONSE GUIDELINES:
1. Keep responses under ${maxWords} words
2. Speak naturally as in a conversation
3. Be helpful about Jio services (Fiber, Mobility, Mart, etc.)
4. Use simple, clear language
5. Be empathetic to customer concerns

LANGUAGE:
- Use Indian English expressions naturally
- Avoid overly formal or robotic language
- Match the user's language style

GREETING: "${config.greeting}"

Remember: You are having a VOICE conversation. Keep responses spoken-word friendly.`;
};
