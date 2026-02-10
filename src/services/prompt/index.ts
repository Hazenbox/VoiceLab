/**
 * Prompt Services
 * 
 * Exports all prompt-building functionality for the Content Trust System
 * and the conversational-first architecture.
 * 
 * @module services/prompt
 */

// Content Generation prompts (full guardrails)
export {
  BRAND_GUARDRAILS,
  getGuardrailsPrompt,
  getChannelFormatting,
  getChannelFormattingPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  buildPrompt,
  buildQuickPrompt,
} from './promptBuilder';

export type { default as PromptBuilder } from './promptBuilder';

// Conversational-first prompts (lightweight)
export {
  BASE_PERSONA_PROMPT,
  JIO_INQUIRY_LAYER,
  buildConversationalPrompt,
  buildJioInquiryPrompt,
} from './basePersona';
