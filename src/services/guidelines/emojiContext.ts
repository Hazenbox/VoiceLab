/**
 * Emoji Context Rules
 * 
 * Phase 2.3: Contextual emoji rules replacing binary on/off logic.
 * 
 * Emojis are allowed/blocked based on:
 * - Content context (status/celebration vs. technical/safety)
 * - Safety domain (blocked for finance, legal, health)
 * - Channel type (appropriate for chat, blocked for formal docs)
 * - User emotion (celebration appropriate for positive emotions)
 * 
 * @module services/guidelines/emojiContext
 */

import type { ContentChannelType, EcosystemType, NavarasaType } from '../../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type EmojiContext = 
  | 'status'        // ✅ ⚠️ ❌ - Status indicators
  | 'celebration'   // 🎉 ✨ 🎊 - Offers, thanks, success
  | 'recognition'   // 📞 🔋 💰 - Quick visual recognition
  | 'technical'     // Step-by-step guides, instructions
  | 'safety'        // Finance, legal, health domains
  | 'formal'        // Enterprise, legal documents
  | 'support';      // Customer support during issues

export interface EmojiDecision {
  allowed: boolean;
  reason: string;
  suggestedEmojis?: string[];
  blockedCategories?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALLOWED EMOJI BY CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Emojis allowed for specific contexts
 */
export const CONTEXTUAL_EMOJIS: Record<EmojiContext, string[]> = {
  status: ['✅', '⚠️', '❌', '✔️', '⭐', '🔔', '🔴', '🟢', '🟡'],
  celebration: ['🎉', '✨', '🎊', '👏', '🙌', '💐', '🎁', '🌟'],
  recognition: ['📞', '🔋', '💰', '📱', '💳', '📧', '🎬', '📺', '🏠', '🌐'],
  technical: [], // No emojis in technical content
  safety: [],    // No emojis in safety-critical content
  formal: [],    // No emojis in formal communications
  support: ['🙏', '💙'], // Very limited - empathy only
};

/**
 * Domains where emojis are BLOCKED regardless of other factors
 */
export const EMOJI_BLOCKED_SAFETY_DOMAINS = [
  'financial_advice',
  'legal_guidance',
  'health_medical',
  'investment',
  'tax_advice',
  'insurance_claims',
  'fraud_scam',
  'emergency_crisis',
];

/**
 * Channels where emojis are BLOCKED
 */
export const EMOJI_BLOCKED_CHANNELS: ContentChannelType[] = [
  'transactional_email',
  'internal_announcement',
  'training_module',
  'ivr_voice_menu',
  'voice_prompts',
];

/**
 * Channels where emojis are ENCOURAGED
 */
export const EMOJI_ENCOURAGED_CHANNELS: ContentChannelType[] = [
  'push_notification',
  'whatsapp_alert',
  'whatsapp_support',
  'social_media_post',
  'chatbot_faq',
];

/**
 * Ecosystems where emojis should be conservative
 */
export const EMOJI_CONSERVATIVE_ECOSYSTEMS: EcosystemType[] = [
  'finance',
  'health',
  'government',
  'business',
  'work',
];

/**
 * Negative emotions where promotional emojis are inappropriate
 */
export const EMOJI_BLOCKED_EMOTIONS: NavarasaType[] = [
  'raudra',    // Anger
  'karuna',    // Sadness
  'bhayanaka', // Fear
  'bibhatsa',  // Disgust
];

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmojiContextInput {
  channel?: ContentChannelType;
  ecosystem?: EcosystemType;
  safetyDomain?: string;
  userEmotion?: NavarasaType;
  intent?: string;
  isSupport?: boolean;
  hasUnresolvedIssue?: boolean;
  literacyLevel?: 'low' | 'high';
}

/**
 * Determine if emojis are appropriate in the current context
 */
export function shouldUseEmoji(input: EmojiContextInput): EmojiDecision {
  const {
    channel,
    ecosystem,
    safetyDomain,
    userEmotion,
    isSupport,
    hasUnresolvedIssue,
    literacyLevel,
  } = input;

  // 1. Safety domain block (highest priority)
  if (safetyDomain && EMOJI_BLOCKED_SAFETY_DOMAINS.includes(safetyDomain)) {
    return {
      allowed: false,
      reason: `Safety domain '${safetyDomain}' requires no emojis`,
      blockedCategories: ['all'],
    };
  }

  // 2. Channel block
  if (channel && EMOJI_BLOCKED_CHANNELS.includes(channel)) {
    return {
      allowed: false,
      reason: `Channel '${channel}' is formal and should not use emojis`,
      blockedCategories: ['all'],
    };
  }

  // 3. Ecosystem conservative check
  if (ecosystem && EMOJI_CONSERVATIVE_ECOSYSTEMS.includes(ecosystem)) {
    // Allow only status emojis in conservative ecosystems
    return {
      allowed: true,
      reason: `Conservative ecosystem '${ecosystem}' - status emojis only`,
      suggestedEmojis: CONTEXTUAL_EMOJIS.status,
      blockedCategories: ['celebration', 'recognition'],
    };
  }

  // 4. Negative emotion block for celebratory emojis
  if (userEmotion && EMOJI_BLOCKED_EMOTIONS.includes(userEmotion)) {
    // Only allow empathy emojis
    return {
      allowed: true,
      reason: `User emotion '${userEmotion}' - empathy emojis only`,
      suggestedEmojis: CONTEXTUAL_EMOJIS.support,
      blockedCategories: ['celebration', 'recognition'],
    };
  }

  // 5. Support with unresolved issue - limited emojis
  if (isSupport && hasUnresolvedIssue) {
    return {
      allowed: true,
      reason: 'Support context with unresolved issue - empathy and status only',
      suggestedEmojis: [...CONTEXTUAL_EMOJIS.support, ...CONTEXTUAL_EMOJIS.status],
      blockedCategories: ['celebration'],
    };
  }

  // 6. Low literacy - encourage helpful emojis
  if (literacyLevel === 'low') {
    return {
      allowed: true,
      reason: 'Low literacy context - visual aids encouraged',
      suggestedEmojis: [
        ...CONTEXTUAL_EMOJIS.status,
        ...CONTEXTUAL_EMOJIS.recognition,
      ],
    };
  }

  // 7. Encouraged channels - allow most emojis
  if (channel && EMOJI_ENCOURAGED_CHANNELS.includes(channel)) {
    return {
      allowed: true,
      reason: `Channel '${channel}' encourages emoji use`,
      suggestedEmojis: [
        ...CONTEXTUAL_EMOJIS.status,
        ...CONTEXTUAL_EMOJIS.celebration,
        ...CONTEXTUAL_EMOJIS.recognition,
      ],
    };
  }

  // 8. Default: allowed but conservative
  return {
    allowed: true,
    reason: 'Default context - emojis allowed conservatively',
    suggestedEmojis: CONTEXTUAL_EMOJIS.status,
  };
}

/**
 * Get emoji instructions for prompt injection
 */
export function getEmojiInstructions(decision: EmojiDecision): string {
  if (!decision.allowed) {
    return `EMOJI RULE: Do NOT use any emojis. Reason: ${decision.reason}`;
  }

  const lines: string[] = [];
  
  lines.push(`EMOJI RULE: Emojis allowed with restrictions. ${decision.reason}`);
  
  if (decision.suggestedEmojis && decision.suggestedEmojis.length > 0) {
    lines.push(`Appropriate emojis for this context: ${decision.suggestedEmojis.join(' ')}`);
  }
  
  if (decision.blockedCategories && decision.blockedCategories.length > 0) {
    lines.push(`Do NOT use: celebratory/fun emojis (${decision.blockedCategories.join(', ')})`);
  }
  
  lines.push('Use emojis sparingly - max 1-2 per message.');
  
  return lines.join('\n');
}

/**
 * Validate emojis in generated content
 * Returns violations for inappropriate emoji usage
 */
export function validateEmojis(
  content: string,
  input: EmojiContextInput
): Array<{
  emoji: string;
  position: number;
  issue: string;
  severity: 'error' | 'warning';
}> {
  const decision = shouldUseEmoji(input);
  const violations: Array<{
    emoji: string;
    position: number;
    issue: string;
    severity: 'error' | 'warning';
  }> = [];

  // Find all emojis in content
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{231A}\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}]/gu;
  let match;

  while ((match = emojiRegex.exec(content)) !== null) {
    const emoji = match[0];
    const position = match.index;

    // Case 1: Emojis completely blocked
    if (!decision.allowed) {
      violations.push({
        emoji,
        position,
        issue: `Emoji not allowed: ${decision.reason}`,
        severity: 'error',
      });
      continue;
    }

    // Case 2: Check if emoji is in suggested list
    if (decision.suggestedEmojis) {
      if (!decision.suggestedEmojis.includes(emoji)) {
        // Check if it's a celebration emoji in blocked context
        const isCelebration = CONTEXTUAL_EMOJIS.celebration.includes(emoji);
        const isRecognition = CONTEXTUAL_EMOJIS.recognition.includes(emoji);
        
        if (
          decision.blockedCategories?.includes('celebration') && isCelebration ||
          decision.blockedCategories?.includes('recognition') && isRecognition
        ) {
          violations.push({
            emoji,
            position,
            issue: `Emoji '${emoji}' inappropriate for this context`,
            severity: 'warning',
          });
        }
      }
    }
  }

  // Case 3: Too many emojis
  const totalEmojis = content.match(emojiRegex)?.length || 0;
  if (totalEmojis > 3) {
    violations.push({
      emoji: '(multiple)',
      position: 0,
      issue: `Too many emojis (${totalEmojis}). Use max 2-3 per message.`,
      severity: 'warning',
    });
  }

  return violations;
}

export default {
  shouldUseEmoji,
  getEmojiInstructions,
  validateEmojis,
  CONTEXTUAL_EMOJIS,
  EMOJI_BLOCKED_SAFETY_DOMAINS,
  EMOJI_BLOCKED_CHANNELS,
  EMOJI_ENCOURAGED_CHANNELS,
};
