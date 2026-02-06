/**
 * Context Engine
 * 
 * Central hub that combines all contextual parameters for content generation:
 * - Ecosystem & Channel
 * - User Profile
 * - Detected Emotion (Navarasa)
 * - Timing Context
 * - Trigger Event Classification
 * 
 * @module services/context/contextEngine
 */

import type {
  GenerationContext,
  UserProfile,
  TimingContext,
  EcosystemType,
  ContentChannelType,
  NavarasaType,
  ContentGoalType,
  ContextOverrides,
} from '../../types';

import { DEFAULT_GENERATION_CONTEXT } from '../../types';
import { getChannel, getChannelDefaults, getEcosystem, detectProduct } from '../guidelines';
import { detectEmotion } from '../guidelines/navarasa';
import { getTimingContext, allowsPromotionalContent } from './timingEngine';
import { createDefaultProfile } from '../guidelines/userProfile';

// =============================================================================
// TRIGGER EVENT CLASSIFICATION
// =============================================================================

/**
 * Trigger event types that initiate communication
 */
export type TriggerEvent = 
  | 'user_initiated'      // User started the conversation
  | 'transaction'         // Payment, order, booking
  | 'system_alert'        // Service notifications
  | 'marketing'           // Promotional content
  | 'support_followup'    // Following up on support case
  | 'reminder'            // Scheduled reminders
  | 'milestone'           // Achievement, anniversary
  | 'feedback_request';   // Asking for rating/review

/**
 * Classify trigger event from context
 */
export function classifyTriggerEvent(
  userMessage: string,
  isUserInitiated: boolean = true
): TriggerEvent {
  const lowerMsg = userMessage.toLowerCase();
  
  if (isUserInitiated) {
    return 'user_initiated';
  }
  
  // Transaction keywords
  if (/payment|order|booking|recharge|bill|invoice|receipt/.test(lowerMsg)) {
    return 'transaction';
  }
  
  // Alert keywords
  if (/alert|warning|notice|update|service|outage|maintenance/.test(lowerMsg)) {
    return 'system_alert';
  }
  
  // Support keywords
  if (/follow up|ticket|case|complaint|issue|resolved/.test(lowerMsg)) {
    return 'support_followup';
  }
  
  // Reminder keywords
  if (/reminder|due|expires|renew|don't forget/.test(lowerMsg)) {
    return 'reminder';
  }
  
  // Milestone keywords
  if (/congratulations|anniversary|milestone|achievement|special/.test(lowerMsg)) {
    return 'milestone';
  }
  
  // Feedback keywords
  if (/rate|review|feedback|survey|opinion|experience/.test(lowerMsg)) {
    return 'feedback_request';
  }
  
  // Default to marketing for outbound
  return 'marketing';
}

/**
 * Get trigger event guidance for prompt
 */
export function getTriggerEventGuidance(event: TriggerEvent): string {
  const guidance: Record<TriggerEvent, string> = {
    user_initiated: 'User reached out - prioritize their intent. Be responsive and helpful.',
    transaction: 'Transaction context - be clear, confirm details, provide next steps.',
    system_alert: 'System alert - be informative, calm, provide resolution if applicable.',
    marketing: 'Marketing content - be engaging but not pushy. Respect user preferences.',
    support_followup: 'Support follow-up - acknowledge previous interaction, show progress.',
    reminder: 'Reminder - be helpful, not nagging. Provide easy action path.',
    milestone: 'Milestone celebration - be warm and celebratory. Make user feel valued.',
    feedback_request: 'Feedback request - be appreciative, make it easy to respond.',
  };
  
  return guidance[event];
}

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

/**
 * Options for building generation context
 */
export interface ContextBuilderOptions {
  // Required from UI
  ecosystem?: EcosystemType;
  channel?: ContentChannelType;
  
  // User profile (can use defaults)
  userProfile?: Partial<UserProfile>;
  
  // Optional overrides
  warmth?: number;
  detail?: number;
  goal?: ContentGoalType;
  emotion?: NavarasaType;
  timing?: TimingContext;
  
  // For auto-detection
  userMessage?: string;
  isUserInitiated?: boolean;
}

/**
 * Build complete generation context from options
 * 
 * KEY DESIGN PRINCIPLE (Industry Best Practice):
 * - Ecosystem dropdown controls TONE (how content sounds)
 * - User query controls TOPIC (what content is about)
 * - Product detection provides transparency on what was understood
 */
export function buildGenerationContext(options: ContextBuilderOptions): GenerationContext {
  // Start with defaults
  const context: GenerationContext = { ...DEFAULT_GENERATION_CONTEXT };
  const overrides: ContextOverrides = {};
  
  // 1. Set ecosystem from user selection (NOT auto-detected)
  // Ecosystem now controls TONE only, not content topic
  if (options.ecosystem) {
    context.ecosystem = options.ecosystem;
  }
  // Note: We no longer auto-override ecosystem based on keywords
  // The user's dropdown selection always controls the tone
  
  // 2. Detect product from user message (for transparency layer)
  // This identifies WHAT the user wants to write about
  if (options.userMessage) {
    const productDetection = detectProduct(options.userMessage, context.ecosystem);
    
    context.detectedProduct = {
      productId: productDetection.product?.id || null,
      productName: productDetection.product?.displayName || null,
      confidence: productDetection.confidence,
      matchedKeywords: productDetection.matchedKeywords,
      suggestedEcosystem: productDetection.suggestedEcosystem,
      ecosystemMismatch: productDetection.ecosystemMismatch,
    };
  }
  
  // 3. Set channel and get defaults
  if (options.channel) {
    context.channel = options.channel;
    const channelDefaults = getChannelDefaults(options.channel);
    context.warmth = channelDefaults.warmth;
    context.detail = channelDefaults.detail;
    context.goal = channelDefaults.goal;
  }
  
  // 4. Apply warmth/detail overrides
  if (options.warmth !== undefined) {
    context.warmth = options.warmth;
    overrides.warmthOverridden = true;
  }
  if (options.detail !== undefined) {
    context.detail = options.detail;
    overrides.detailOverridden = true;
  }
  if (options.goal !== undefined) {
    context.goal = options.goal;
  }
  
  // 5. Set user profile
  const defaultProfile = createDefaultProfile();
  context.userProfile = {
    ...defaultProfile,
    ...options.userProfile,
  };
  
  // 6. Detect or set emotion
  if (options.emotion) {
    context.emotion = options.emotion;
    overrides.emotionOverridden = true;
  } else if (options.userMessage) {
    context.emotion = detectEmotion(options.userMessage);
  }
  
  // 7. Get or set timing
  if (options.timing) {
    context.timing = options.timing;
    overrides.timingOverridden = true;
  } else {
    context.timing = getTimingContext();
  }
  
  // 8. Store overrides for display
  if (Object.keys(overrides).length > 0) {
    context.overrides = overrides;
  }
  
  // 9. Validate marketing restrictions
  if (
    context.goal === 'Engagement' &&
    !allowsPromotionalContent(context.timing)
  ) {
    // Late night - switch to informational only
    console.warn('Late night detected - switching from marketing to informational goal');
    context.goal = 'Information';
  }
  
  return context;
}

/**
 * Detected product summary for UI display
 */
export interface DetectedProductSummary {
  productName: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  matchedKeywords: string[];
  ecosystemMismatch: boolean;
  suggestedEcosystem: string | null;
  displayText: string;
}

/**
 * Get context summary for display in TrustContextPanel
 */
export function getContextSummary(context: GenerationContext): {
  ecosystem: string;
  channel: string;
  warmth: string;
  detail: string;
  goal: string;
  profile: string;
  emotion: string;
  timing: string;
  overrides: string[];
  detectedProduct: DetectedProductSummary;
} {
  const ecosystem = getEcosystem(context.ecosystem);
  const channel = getChannel(context.channel);
  
  const overridesList: string[] = [];
  if (context.overrides?.warmthOverridden) overridesList.push('Warmth');
  if (context.overrides?.detailOverridden) overridesList.push('Detail');
  if (context.overrides?.emotionOverridden) overridesList.push('Emotion');
  if (context.overrides?.timingOverridden) overridesList.push('Timing');
  
  // Build detected product summary
  const detected = context.detectedProduct;
  let detectedProductSummary: DetectedProductSummary;
  
  if (detected && detected.confidence !== 'none') {
    const suggestedEcosystemName = detected.suggestedEcosystem 
      ? getEcosystem(detected.suggestedEcosystem).name 
      : null;
    
    detectedProductSummary = {
      productName: detected.productName,
      confidence: detected.confidence,
      matchedKeywords: detected.matchedKeywords,
      ecosystemMismatch: detected.ecosystemMismatch,
      suggestedEcosystem: suggestedEcosystemName,
      displayText: detected.ecosystemMismatch
        ? `${detected.productName} (tone mismatch)`
        : `${detected.productName}`,
    };
  } else {
    detectedProductSummary = {
      productName: null,
      confidence: 'none',
      matchedKeywords: [],
      ecosystemMismatch: false,
      suggestedEcosystem: null,
      displayText: 'No specific product detected',
    };
  }
  
  return {
    ecosystem: `${ecosystem.name} - ${ecosystem.tone}`,
    channel: `${channel.name} (${channel.group})`,
    warmth: `${context.warmth}/10 ${context.warmth >= 7 ? '🔥 Warm' : context.warmth <= 3 ? '❄️ Formal' : '⚖️ Balanced'}`,
    detail: `${context.detail}/10 ${context.detail >= 7 ? '📚 Comprehensive' : context.detail <= 3 ? '📌 Brief' : '📝 Moderate'}`,
    goal: context.goal,
    profile: `${context.userProfile.ageGroup === 'digital_confident' ? '💻' : '👴'} ${context.userProfile.language}, ${context.userProfile.region}`,
    emotion: `${context.emotion.charAt(0).toUpperCase() + context.emotion.slice(1)}`,
    timing: `${context.timing.timeOfDay}${context.timing.festival ? ` (${context.timing.festival})` : ''}, ${context.timing.dayOfWeek}`,
    overrides: overridesList,
    detectedProduct: detectedProductSummary,
  };
}

/**
 * Validate context for potential issues
 */
export function validateContext(context: GenerationContext): string[] {
  const warnings: string[] = [];
  
  // Check for late night marketing
  if (
    context.timing.timeOfDay === 'late_night' &&
    (context.goal === 'Action' || context.goal === 'Engagement')
  ) {
    warnings.push('Late night detected - promotional content not recommended');
  }
  
  // Check for low literacy with complex channel
  if (
    context.userProfile.literacyLevel === 'low' &&
    (context.channel === 'transactional_email' || context.channel === 'training_module')
  ) {
    warnings.push('Low literacy user with complex channel - consider simplifying');
  }
  
  // Check for regional sensitivity
  if (
    context.userProfile.region === 'south' &&
    context.userProfile.language === 'hindi'
  ) {
    warnings.push('South India user with Hindi - consider regional language');
  }
  
  // Check for negative emotion with marketing goal
  if (
    ['raudra', 'bhayanaka', 'bibhatsa', 'karuna'].includes(context.emotion) &&
    context.goal === 'Engagement'
  ) {
    warnings.push('Negative emotion detected - marketing content not appropriate');
  }
  
  return warnings;
}

export default {
  classifyTriggerEvent,
  getTriggerEventGuidance,
  buildGenerationContext,
  getContextSummary,
  validateContext,
};
