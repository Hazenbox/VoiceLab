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
// TRIGGER EVENT CLASSIFICATION (Training 1.pdf - Complete Trigger Categories)
// =============================================================================

/**
 * Trigger event types that initiate communication
 * Expanded based on Training 1.pdf to include all 13 categories
 */
export type TriggerEvent = 
  // Original Events
  | 'user_initiated'       // User started the conversation
  | 'transaction'          // Payment, order, booking
  | 'system_alert'         // Service notifications
  | 'marketing'            // Promotional content
  | 'support_followup'     // Following up on support case
  | 'reminder'             // Scheduled reminders
  | 'milestone'            // Achievement, anniversary
  | 'feedback_request'     // Asking for rating/review
  // NEW: Security & Safety Events
  | 'security_alert'       // Login from new device, password change, OTP
  | 'fraud_warning'        // Suspicious activity detected
  | 'account_security'     // Account locked, verification required
  // NEW: Lifecycle Events
  | 'onboarding'           // Welcome, first-time user guidance
  | 'activation'           // Service activated, feature enabled
  | 'renewal'              // Subscription renewal, plan expiry
  | 'churn_prevention'     // User hasn't engaged, win-back
  // NEW: Platform & Device Events
  | 'app_update'           // New version available
  | 'feature_announcement' // New feature launched
  | 'device_setup'         // New device connected, setup guidance
  // NEW: Health/Education/Finance Events
  | 'health_reminder'      // Medicine, appointment, wellness check
  | 'learning_progress'    // Course milestone, certification
  | 'financial_update'     // Investment update, statement ready
  // NEW: Emotional & Social Events
  | 'celebration'          // Birthday, festival, special day
  | 'community_update'     // Group activity, social engagement
  | 'empathy_response';    // Response to user frustration/complaint

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
  
  // Security & Safety Events (highest priority)
  if (/otp|one[-\s]?time|verification|login attempt|new device|suspicious|fraud|unauthorized/.test(lowerMsg)) {
    return 'security_alert';
  }
  if (/account locked|blocked|compromised|unusual activity/.test(lowerMsg)) {
    return 'account_security';
  }
  
  // Transaction keywords
  if (/payment|order|booking|recharge|bill|invoice|receipt|confirm/.test(lowerMsg)) {
    return 'transaction';
  }
  
  // Lifecycle Events
  if (/welcome|get started|first time|new user|onboarding/.test(lowerMsg)) {
    return 'onboarding';
  }
  if (/activated|enabled|setup complete|ready to use/.test(lowerMsg)) {
    return 'activation';
  }
  if (/renew|expir|subscription|plan ending|running out/.test(lowerMsg)) {
    return 'renewal';
  }
  if (/miss you|come back|haven't seen you|inactive/.test(lowerMsg)) {
    return 'churn_prevention';
  }
  
  // Health/Education/Finance
  if (/medicine|doctor|appointment|health|wellness|checkup/.test(lowerMsg)) {
    return 'health_reminder';
  }
  if (/course|learning|chapter|lesson|quiz|certificate/.test(lowerMsg)) {
    return 'learning_progress';
  }
  if (/portfolio|investment|mutual fund|statement|dividend/.test(lowerMsg)) {
    return 'financial_update';
  }
  
  // Alert keywords
  if (/alert|warning|notice|update|service|outage|maintenance/.test(lowerMsg)) {
    return 'system_alert';
  }
  
  // Platform & Device Events
  if (/new version|update available|upgrade|app update/.test(lowerMsg)) {
    return 'app_update';
  }
  if (/new feature|introducing|now available|just launched/.test(lowerMsg)) {
    return 'feature_announcement';
  }
  if (/new device|setup|configure|connect your/.test(lowerMsg)) {
    return 'device_setup';
  }
  
  // Support keywords
  if (/follow up|ticket|case|complaint|issue|resolved/.test(lowerMsg)) {
    return 'support_followup';
  }
  
  // Reminder keywords
  if (/reminder|due|don't forget/.test(lowerMsg)) {
    return 'reminder';
  }
  
  // Milestone/Celebration keywords
  if (/birthday|anniversary|special day|congratulations/.test(lowerMsg)) {
    return 'celebration';
  }
  if (/congratulations|milestone|achievement/.test(lowerMsg)) {
    return 'milestone';
  }
  
  // Feedback keywords
  if (/rate|review|feedback|survey|opinion|experience/.test(lowerMsg)) {
    return 'feedback_request';
  }
  
  // Emotional/Social
  if (/sorry to hear|we understand|apolog/.test(lowerMsg)) {
    return 'empathy_response';
  }
  if (/group|community|together|joined/.test(lowerMsg)) {
    return 'community_update';
  }
  
  // Default to marketing for outbound
  return 'marketing';
}

/**
 * Get trigger event guidance for prompt
 */
export function getTriggerEventGuidance(event: TriggerEvent): string {
  const guidance: Record<TriggerEvent, string> = {
    // Original Events
    user_initiated: 'User reached out - prioritize their intent. Be responsive and helpful.',
    transaction: 'Transaction context - be clear, confirm details, provide next steps.',
    system_alert: 'System alert - be informative, calm, provide resolution if applicable.',
    marketing: 'Marketing content - be engaging but not pushy. Respect user preferences.',
    support_followup: 'Support follow-up - acknowledge previous interaction, show progress.',
    reminder: 'Reminder - be helpful, not nagging. Provide easy action path.',
    milestone: 'Milestone celebration - be warm and celebratory. Make user feel valued.',
    feedback_request: 'Feedback request - be appreciative, make it easy to respond.',
    
    // Security & Safety Events (Training 1.pdf)
    security_alert: 'Security alert - be calm but urgent. Clear action required. No marketing.',
    fraud_warning: 'Fraud warning - serious tone. Immediate action. Contact support option.',
    account_security: 'Account security - reassure user. Clear steps to resolve. Support available.',
    
    // Lifecycle Events (Training 1.pdf)
    onboarding: 'Onboarding - warm welcome. Simple first steps. Build confidence.',
    activation: 'Activation success - celebrate briefly. Show what\'s possible. Quick value.',
    renewal: 'Renewal - transparent pricing. Value reminder. Easy decision path.',
    churn_prevention: 'Win-back - no guilt. Remind value. Easy return path. Respect choice.',
    
    // Platform & Device Events (Training 1.pdf)
    app_update: 'App update - highlight benefits. Simple upgrade path. No pressure.',
    feature_announcement: 'New feature - show value clearly. Easy to try. No jargon.',
    device_setup: 'Device setup - step-by-step. Patient tone. Support available.',
    
    // Health/Education/Finance Events (Training 1.pdf)
    health_reminder: 'Health reminder - caring, not alarming. Privacy respected. Action clear.',
    learning_progress: 'Learning progress - encouraging. Celebrate progress. Next step clear.',
    financial_update: 'Financial update - precise, trustworthy. No pressure. Full transparency.',
    
    // Emotional & Social Events (Training 1.pdf)
    celebration: 'Celebration - warm, genuine. No selling. Share joy.',
    community_update: 'Community update - inclusive, friendly. Everyone belongs.',
    empathy_response: 'Empathy response - acknowledge feeling. Apologize if needed. Fix it.',
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
