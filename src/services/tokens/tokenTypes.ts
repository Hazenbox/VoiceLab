/**
 * Token Types Definition
 * 
 * Defines ALL token types matching the Tokens v2 specification exactly.
 * These tokens control LLM behavior across routing, safety, emotion,
 * conversation, identity, risk, pattern, and finishing layers.
 * 
 * @module services/tokens/tokenTypes
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: ROUTING TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/** Determines which engine leads the response */
export type RouteMode = 'jio_task' | 'open_chat' | 'mixed';

/** How certain the router is about classification */
export type RouteConfidence = 'low' | 'medium' | 'high';

/** Why this routing decision was made */
export type RouteTrigger = 
  | 'explicit_jio_entity'
  | 'implicit_jio_context'
  | 'account_action_request'
  | 'general_question'
  | 'safety_sensitive'
  | 'ambiguous';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: SAFETY & ADVISORY TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/** Identifies sensitive domains (24 domains) */
export type SafetyDomain = 
  | 'none'
  | 'health_general'
  | 'health_emergency'
  | 'mental_health'
  | 'finance_general'
  | 'investment_advice'
  | 'legal_general'
  | 'legal_advice'
  | 'self_harm'
  | 'suicide_risk'
  | 'violence'
  | 'hate_harassment'
  | 'sexual_content'
  | 'sexual_minors'
  | 'child_safety'
  | 'privacy_personal_data'
  | 'biometric_data'
  | 'fraud_scam'
  | 'cybersecurity'
  | 'identity_theft'
  | 'political_persuasion'
  | 'misinformation'
  | 'dangerous_activity'
  | 'weapons'
  | 'substance_use'
  | 'regulated_products';

/** Safety severity level */
export type SafetyLevel = 'none' | 'low' | 'moderate' | 'high' | 'critical';

/** Determines how far the model can advise */
export type AdvisoryBoundary = 
  | 'normal_information'
  | 'precautionary_guidance'
  | 'limited_guidance'
  | 'refer_professional'
  | 'emergency_redirect'
  | 'refuse_and_redirect';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: NUDGE CONTROL TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/** Controls when Jio ecosystem suggestions are allowed */
export type NudgePermission = 
  | 'blocked'
  | 'post_resolution_only'
  | 'contextual_soft'
  | 'contextual_strong'
  | 'proactive_allowed';

/** Relevance of potential Jio ecosystem suggestion */
export type NudgeRelevance = 
  | 'none'
  | 'low'
  | 'moderate'
  | 'high'
  | 'direct_actionable';

/** Overrides that block nudging in sensitive contexts */
export type NudgeSensitivityOverride = 
  | 'none'
  | 'safety_block'
  | 'complaint_block'
  | 'high_emotion_block';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: USER UNDERSTANDING TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/** Classifies the type of request at a high level */
export type UserIntent = 
  // Core intent types (universal)
  | 'ask_information'
  | 'seek_guidance'
  | 'solve_problem'
  | 'perform_action'
  | 'create_content'
  | 'make_decision'
  | 'locate_service'
  | 'track_status'
  | 'report_issue'
  | 'give_feedback'
  | 'social_chat'
  | 'emotional_support'
  // Jio-specific operational intents
  | 'jio_account'
  | 'jio_billing_payment'
  | 'jio_connectivity'
  | 'jio_orders_services'
  | 'jio_device_setup';

/** Captures the target outcome the user is trying to achieve */
export type UserGoal = 
  // Information / learning outcomes
  | 'understand_topic'
  | 'get_summary'
  | 'get_steps'
  | 'get_examples'
  | 'get_recommendations'
  // Problem-solving outcomes
  | 'fix_issue'
  | 'restore_service'
  | 'reduce_error'
  | 'confirm_working'
  | 'escalate_to_support'
  // Action / task outcomes
  | 'complete_transaction'
  | 'submit_request'
  | 'update_details'
  | 'schedule_or_book'
  | 'download_or_generate'
  // Decision outcomes
  | 'compare_options'
  | 'choose_best_option'
  | 'validate_choice'
  // Location outcomes
  | 'find_nearby'
  | 'find_best_match'
  | 'get_contact_details'
  // Content generation outcomes
  | 'create_copy_variants'
  | 'create_longform_content'
  | 'create_shortform_content'
  | 'adapt_to_language_tone'
  | 'format_for_channel'
  // Relationship / conversation outcomes
  | 'feel_reassured'
  | 'continue_chat'
  | 'get_motivation';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5.3: CONTEXT TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/** Time of day context */
export type ContextTime = 'morning' | 'afternoon' | 'evening' | 'night';

/** Current event context */
export type ContextEvent = 
  | 'none'
  | 'festival'
  | 'sale_event'
  | 'cricket_match'
  | 'exam_season'
  | 'weather_disruption'
  | 'public_holiday'
  | 'breaking_news';

/** Session context */
export type ContextSession = 'new_user' | 'returning_user' | 'repeat_issue';

/** Urgency level */
export type ContextUrgency = 'low' | 'medium' | 'high' | 'critical';

/** Universal lifecycle stage */
export type ContextJourneyStage = 
  | 'discover'
  | 'onboard'
  | 'use'
  | 'fix'
  | 'pay'
  | 'renew'
  | 'upgrade'
  | 'exit';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: EMOTION LAYER (NAVARASA)
// ═══════════════════════════════════════════════════════════════════════════════

/** Navarasa emotions - nine core emotional states */
export type NavarasaEmotion = 
  | 'shringara'  // Love / Delight
  | 'hasya'      // Laughter / Playfulness
  | 'karuna'     // Compassion / Sadness
  | 'raudra'     // Anger / Frustration
  | 'vira'       // Courage / Pride / Ambition
  | 'bhayanaka'  // Fear / Anxiety
  | 'bibhatsa'   // Disgust / Rejection
  | 'adbhuta'    // Wonder / Curiosity
  | 'shanta';    // Peace / Stillness / Contentment

/** Emotion intensity (can be 1-10 scale or categorical) */
export type EmotionIntensity = 'low' | 'moderate' | 'high' | 'extreme';
export type EmotionIntensityNumeric = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** Target emotional state to guide user toward */
export type EmotionTarget = 
  | 'shanta'           // Stability
  | 'vira'             // Confidence
  | 'hasya'            // Light uplift
  | 'adbhuta'          // Inspiration
  | 'karuna_resolved'  // Supported and steadied
  | 'relieved';        // Practical calm after friction

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: USER IDENTITY & LANGUAGE LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/** User segment within ecosystem */
export type ProfileSegment = 
  | 'consumer_mobile'
  | 'consumer_fiber'
  | 'enterprise'
  | 'small_business'
  | 'student'
  | 'family_account'
  | 'senior_user'
  | 'unknown';

/** User plan type */
export type ProfilePlan = 
  | 'prepaid'
  | 'postpaid'
  | 'broadband'
  | 'business_plan'
  | 'ott_bundle'
  | 'unknown';

/** Relationship stage with user */
export type ProfileRelationshipStage = 
  | 'new_user'
  | 'early_use'
  | 'active_regular'
  | 'high_engagement'
  | 'at_risk'
  | 'long_term_loyal';

/** Locale type */
export type RegionLocale = 
  | 'metro'
  | 'urban'
  | 'semi_urban'
  | 'rural'
  | 'remote';

/** Connectivity profile */
export type RegionConnectivityProfile = 
  | 'high_speed_available'
  | 'limited_bandwidth'
  | 'unstable_network'
  | 'unknown';

/** Supported languages */
export type Language = 
  | 'english'
  | 'hindi'
  | 'hinglish'
  | 'tamil'
  | 'telugu'
  | 'kannada'
  | 'malayalam'
  | 'bengali'
  | 'marathi'
  | 'gujarati'
  | 'punjabi'
  | 'odia'
  | 'assamese'
  | 'urdu';

/** Script types */
export type Script = 
  | 'latin'
  | 'devanagari'
  | 'tamil'
  | 'telugu'
  | 'kannada'
  | 'malayalam'
  | 'bengali'
  | 'gujarati'
  | 'gurmukhi'
  | 'odia'
  | 'assamese'
  | 'arabic';

/** Language mixing preference */
export type LanguageMix = 'pure' | 'light_mix' | 'heavy_mix' | 'code_switch';

/** Digital literacy level */
export type Literacy = 'low' | 'moderate' | 'high';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: CONVERSATION CONTROL LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/** Conversation state machine states */
export type ConversationState = 
  | 'start'
  | 'triage'
  | 'clarify'
  | 'act'
  | 'verify'
  | 'close'
  | 'next_opportunity';

/** Resolution status */
export type ResolutionStatus = 
  | 'not_started'
  | 'in_progress'
  | 'blocked_missing_info'
  | 'resolved'
  | 'escalated'
  | 'abandoned';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: MEMORY LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/** Session memory tokens */
export interface SessionMemory {
  lastIntent?: string;
  lastStep?: string;
  lastEntity?: string;
}

/** Mid-term memory tokens (7-day cross-channel) */
export interface MidTermMemory {
  lastJourney?: string;
  preferredLanguage?: string;
  lastChannel?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: VOICE & TONE LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/** Persona - relationship posture in conversation */
export type Persona = 
  | 'jio_friend'   // Casual, warm, relatable
  | 'jio_guide'    // Clear, structured, steady
  | 'jio_expert'   // Precise, confident, direct
  | 'jio_support'; // Calm, solution-oriented, composed

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: EXPERIENCE CONTEXT LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/** Ecosystem domain */
export type Ecosystem = 
  | 'connectivity'
  | 'finance'
  | 'shopping'
  | 'health'
  | 'education'
  | 'entertainment'
  | 'enterprise'
  | 'general';

/** Communication channel */
export type Channel = 
  | 'app_chat'
  | 'whatsapp'
  | 'ivr_voice'
  | 'sms'
  | 'email'
  | 'push_notification'
  | 'retail_store';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12: STRUCTURE & PATTERNS LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/** Response pattern building blocks */
export type Pattern = 
  | 'empathy.acknowledge'
  | 'clarify.ask'
  | 'explain.why'
  | 'guide.next_step'
  | 'guide.multi_step'
  | 'confirm.action'
  | 'confirm.done'
  | 'summarise.status'
  | 'handoff.warm'
  | 'offer.option'
  | 'reassure.safety'
  | 'proactive.suggest';

/** Common pattern sequences */
export type PatternSequence = 
  | 'acknowledge_clarify_act_verify'
  | 'direct_answer_explain_option'
  | 'guide_multi_step_confirm'
  | 'acknowledge_act_summarise'
  | 'act_verify_close'
  | 'resolve_next_opportunity';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 13: RISK AWARENESS LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/** Risk category */
export type RiskCategory = 
  | 'none'
  | 'account_security'
  | 'finance_regulatory'
  | 'privacy'
  | 'fraud_scam'
  | 'cybersecurity'
  | 'contractual'
  | 'legal_sensitive';

/** Risk level */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 14: FINISHING LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/** Closing signature types */
export type Signature = 
  | 'youre_all_set'
  | 'thank_you_for_choosing_jio'
  | 'with_love_from_jio'
  | 'take_care'
  | 'reach_out_anytime'
  | 'none';

/** Small joy micro-uplift types */
export type SmallJoy = 
  | 'time_of_day_wish'
  | 'festival_warmth'
  | 'cricket_reference'
  | 'workday_encouragement'
  | 'learning_encouragement'
  | 'none';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE ACTIVE TOKENS INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete set of active tokens for a single interaction
 * This is the master interface containing all 50+ tokens
 */
export interface ActiveTokens {
  // Routing (Section 2)
  'route.mode'?: RouteMode;
  'route.confidence'?: RouteConfidence;
  'route.trigger'?: RouteTrigger;
  
  // Safety (Section 3)
  'safety.domain'?: SafetyDomain;
  'safety.level'?: SafetyLevel;
  'advice.boundary'?: AdvisoryBoundary;
  
  // Nudge (Section 4)
  'nudge.permission'?: NudgePermission;
  'nudge.relevance'?: NudgeRelevance;
  'nudge.sensitivity_override'?: NudgeSensitivityOverride;
  
  // User (Section 5)
  'user.intent'?: UserIntent;
  'user.goal'?: UserGoal;
  
  // Context (Section 5.3)
  'context.time'?: ContextTime;
  'context.event'?: ContextEvent;
  'context.session'?: ContextSession;
  'context.urgency'?: ContextUrgency;
  'context.journey_stage'?: ContextJourneyStage;
  
  // Emotion (Section 6)
  'emotion.rasa.user'?: NavarasaEmotion;
  'emotion.intensity'?: EmotionIntensity | EmotionIntensityNumeric;
  'emotion.target'?: EmotionTarget;
  
  // Profile (Section 7.1)
  'profile.segment'?: ProfileSegment;
  'profile.plan'?: ProfilePlan;
  'profile.relationship_stage'?: ProfileRelationshipStage;
  
  // Region (Section 7.2)
  'region.state'?: string;
  'region.city'?: string;
  'region.locale'?: RegionLocale;
  'region.connectivity_profile'?: RegionConnectivityProfile;
  
  // Language (Section 7.3-7.6)
  'lang'?: Language;
  'script'?: Script;
  'lang_mix'?: LanguageMix;
  'literacy'?: Literacy;
  
  // Conversation (Section 8)
  'conversation.state'?: ConversationState;
  'conversation.transition'?: string; // Format: "state1_to_state2"
  'conversation.resolution_status'?: ResolutionStatus;
  'conversation.turn_count'?: number;
  
  // Memory (Section 9)
  'memory.session.last_intent'?: string;
  'memory.session.last_step'?: string;
  'memory.session.last_entity'?: string;
  'memory.mid_term.last_journey'?: string;
  'memory.mid_term.preferred_language'?: string;
  'memory.mid_term.last_channel'?: string;
  
  // Voice & Tone (Section 10)
  'persona'?: Persona;
  
  // Experience (Section 11)
  'ecosystem'?: Ecosystem;
  'channel'?: Channel;
  
  // Pattern (Section 12)
  'pattern'?: Pattern;
  'pattern.sequence'?: PatternSequence;
  
  // Risk (Section 13)
  'risk.category'?: RiskCategory;
  'risk.level'?: RiskLevel;
  
  // Finishing (Section 14)
  'signature'?: Signature;
  'small_joy'?: SmallJoy;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN GROUPS FOR SERIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Token groups for structured prompt serialization */
export const TOKEN_GROUPS = {
  ROUTING: ['route.mode', 'route.confidence', 'route.trigger'],
  SAFETY: ['safety.domain', 'safety.level', 'advice.boundary'],
  NUDGE: ['nudge.permission', 'nudge.relevance', 'nudge.sensitivity_override'],
  USER: ['user.intent', 'user.goal'],
  CONTEXT: ['context.time', 'context.event', 'context.session', 'context.urgency', 'context.journey_stage'],
  EMOTION: ['emotion.rasa.user', 'emotion.intensity', 'emotion.target'],
  PROFILE: ['profile.segment', 'profile.plan', 'profile.relationship_stage'],
  REGION: ['region.state', 'region.city', 'region.locale', 'region.connectivity_profile'],
  LANGUAGE: ['lang', 'script', 'lang_mix', 'literacy'],
  CONVERSATION: ['conversation.state', 'conversation.transition', 'conversation.resolution_status', 'conversation.turn_count'],
  MEMORY: ['memory.session.last_intent', 'memory.session.last_step', 'memory.session.last_entity', 'memory.mid_term.last_journey', 'memory.mid_term.preferred_language', 'memory.mid_term.last_channel'],
  IDENTITY: ['persona', 'ecosystem', 'channel'],
  PATTERN: ['pattern', 'pattern.sequence'],
  RISK: ['risk.category', 'risk.level'],
  FINISHING: ['signature', 'small_joy'],
} as const;

/** All token keys for validation */
export const ALL_TOKEN_KEYS = Object.values(TOKEN_GROUPS).flat();

/** Token count by group */
export const TOKEN_COUNTS = Object.fromEntries(
  Object.entries(TOKEN_GROUPS).map(([group, keys]) => [group, keys.length])
) as Record<keyof typeof TOKEN_GROUPS, number>;

/** Total token count */
export const TOTAL_TOKEN_COUNT = ALL_TOKEN_KEYS.length;
