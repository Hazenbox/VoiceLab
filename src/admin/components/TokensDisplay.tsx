/**
 * Tokens Display Component
 * 
 * Displays all 50+ tokens from the Tokens specification with:
 * - Grouped by category (Routing, Safety, Nudge, User, Context, Emotion, etc.)
 * - Collapsible sections
 * - Search/filter functionality
 * - Token documentation
 */

import { useState, useMemo, memo } from 'react';
import { useThemeColors } from '../../theme/useColors';
import { DSIcon } from '../../components/DSIcon';
import { 
  TOKEN_GROUPS, 
  TOKEN_COUNTS, 
  TOTAL_TOKEN_COUNT 
} from '../../services/tokens/tokenTypes';
import { TOKEN_RULES } from '../../services/tokens/tokenRules';

// ═══════════════════════════════════════════════════════════════════════════════
// Token Documentation - Comprehensive descriptions for each token
// ═══════════════════════════════════════════════════════════════════════════════

const TOKEN_DOCUMENTATION: Record<string, {
  description: string;
  values: Array<{ value: string; description: string }>;
  example?: string;
}> = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 2: ROUTING TOKENS
  // ═══════════════════════════════════════════════════════════════════════════════
  'route.mode': {
    description: 'Determines which engine leads the response generation',
    values: [
      { value: 'jio_task', description: 'Enter structured Jio resolution flow. Jio service logic dominates.' },
      { value: 'open_chat', description: 'Base LLM answers; Jio layer shapes tone only.' },
      { value: 'mixed', description: 'Answer fully first, then optionally offer one relevant Jio help.' },
    ],
    example: 'User asks about Jio plan → route.mode: jio_task',
  },
  'route.confidence': {
    description: 'How certain the router is about the classification decision',
    values: [
      { value: 'high', description: 'Proceed directly' },
      { value: 'medium', description: 'Ask one clarifier if needed' },
      { value: 'low', description: 'Clarify before acting' },
    ],
  },
  'route.trigger': {
    description: 'Why this routing decision was made',
    values: [
      { value: 'explicit_jio_entity', description: 'User names Jio product/service' },
      { value: 'implicit_jio_context', description: 'Context strongly suggests Jio' },
      { value: 'account_action_request', description: 'User wants account/service operation' },
      { value: 'general_question', description: 'Open knowledge question' },
      { value: 'safety_sensitive', description: 'Health, legal, finance, emergency, self-harm' },
      { value: 'ambiguous', description: 'Not enough clarity' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 3: SAFETY & ADVISORY TOKENS
  // ═══════════════════════════════════════════════════════════════════════════════
  'safety.domain': {
    description: 'Identifies sensitive domains requiring special handling (26 domains)',
    values: [
      { value: 'none', description: 'No sensitive domain detected' },
      { value: 'health_general', description: 'General health questions' },
      { value: 'health_emergency', description: 'Emergency health situation' },
      { value: 'mental_health', description: 'Mental health topics' },
      { value: 'finance_general', description: 'General financial questions' },
      { value: 'investment_advice', description: 'Investment-related queries' },
      { value: 'legal_general', description: 'General legal questions' },
      { value: 'legal_advice', description: 'Specific legal advice requests' },
      { value: 'self_harm', description: 'Self-harm related content' },
      { value: 'suicide_risk', description: 'Suicide risk indicators' },
      { value: 'violence', description: 'Violence-related content' },
      { value: 'hate_harassment', description: 'Hate speech or harassment' },
      { value: 'sexual_content', description: 'Sexual content' },
      { value: 'sexual_minors', description: 'Sexual content involving minors' },
      { value: 'child_safety', description: 'Child safety concerns' },
      { value: 'privacy_personal_data', description: 'Personal data privacy' },
      { value: 'biometric_data', description: 'Biometric data handling' },
      { value: 'fraud_scam', description: 'Fraud or scam detection' },
      { value: 'cybersecurity', description: 'Cybersecurity threats' },
      { value: 'identity_theft', description: 'Identity theft concerns' },
      { value: 'political_persuasion', description: 'Political persuasion attempts' },
      { value: 'misinformation', description: 'Misinformation detection' },
      { value: 'dangerous_activity', description: 'Dangerous activities' },
      { value: 'weapons', description: 'Weapons-related content' },
      { value: 'substance_use', description: 'Substance use/abuse' },
      { value: 'regulated_products', description: 'Regulated product queries' },
    ],
  },
  'safety.level': {
    description: 'Severity level for safety response',
    values: [
      { value: 'low', description: 'Minor concern - standard response' },
      { value: 'moderate', description: 'Some sensitivity - add precautions' },
      { value: 'high', description: 'Significant concern - limited guidance' },
      { value: 'critical', description: 'Immediate concern - emergency redirect' },
    ],
  },
  'advice.boundary': {
    description: 'Determines how far the model can advise',
    values: [
      { value: 'normal_information', description: 'No sensitive domain - normal response' },
      { value: 'precautionary_guidance', description: 'Mild health/finance/legal - add disclaimers' },
      { value: 'limited_guidance', description: 'Moderate sensitivity - avoid procedural detail' },
      { value: 'refer_professional', description: 'Diagnosis, investment advice, legal strategy - refer out' },
      { value: 'emergency_redirect', description: 'Immediate emergency response needed' },
      { value: 'refuse_and_redirect', description: 'Illegal, harmful, exploitative - refuse' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 4: NUDGE CONTROL TOKENS
  // ═══════════════════════════════════════════════════════════════════════════════
  'nudge.permission': {
    description: 'Controls when Jio ecosystem suggestions are allowed',
    values: [
      { value: 'blocked', description: 'Safety-sensitive, complaint, crisis - no nudging' },
      { value: 'post_resolution_only', description: 'Jio support cases - nudge only after resolution' },
      { value: 'contextual_soft', description: 'Open chat with mild relevance' },
      { value: 'contextual_strong', description: 'Clear mapping to ecosystem' },
      { value: 'proactive_allowed', description: 'Discovery/sales flows only' },
    ],
    example: 'Default = blocked. Nudging is only allowed after resolution.',
  },
  'nudge.relevance': {
    description: 'Relevance of potential Jio ecosystem suggestion',
    values: [
      { value: 'none', description: 'No relevant Jio connection' },
      { value: 'low', description: 'Weak connection to Jio ecosystem' },
      { value: 'moderate', description: 'Reasonable connection' },
      { value: 'high', description: 'Strong connection to Jio' },
      { value: 'direct_actionable', description: 'Directly actionable within Jio ecosystem (e.g., "watch IPL")' },
    ],
  },
  'nudge.sensitivity_override': {
    description: 'Overrides that block nudging in sensitive contexts',
    values: [
      { value: 'none', description: 'No override active' },
      { value: 'safety_block', description: 'Blocked due to safety domain' },
      { value: 'complaint_block', description: 'Blocked during complaint/refund dispute' },
      { value: 'high_emotion_block', description: 'Blocked due to anger/crisis' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 5: USER UNDERSTANDING TOKENS
  // ═══════════════════════════════════════════════════════════════════════════════
  'user.intent': {
    description: 'Classifies the type of request at a high level',
    values: [
      // Core intent types (universal)
      { value: 'ask_information', description: 'Facts, explanations, learning' },
      { value: 'seek_guidance', description: 'How to do something; advice within boundaries' },
      { value: 'solve_problem', description: 'Something is not working; troubleshooting' },
      { value: 'perform_action', description: 'Do/trigger/submit/change something' },
      { value: 'create_content', description: 'Write/design/generate copy or content' },
      { value: 'make_decision', description: 'Compare options; choose a plan/product/approach' },
      { value: 'locate_service', description: 'Find a place/person/service nearby or online' },
      { value: 'track_status', description: 'Where is it? What is the update? Order/ticket/network' },
      { value: 'report_issue', description: 'Log a complaint/incident/bug' },
      { value: 'give_feedback', description: 'Review, rating, suggestion' },
      { value: 'social_chat', description: 'Talk, joke, explore, companionship' },
      { value: 'emotional_support', description: 'Venting, reassurance; non-clinical' },
      // Jio-specific operational intents
      { value: 'jio_account', description: 'Login, OTP, profile, KYC' },
      { value: 'jio_billing_payment', description: 'Recharge, bills, refunds, payment failures' },
      { value: 'jio_connectivity', description: 'Network, speed, outage, device connectivity' },
      { value: 'jio_orders_services', description: 'Orders, delivery, service requests, appointments' },
      { value: 'jio_device_setup', description: 'Device onboarding, setup, feature guidance' },
    ],
  },
  'user.goal': {
    description: 'Captures the target outcome the user is trying to achieve',
    values: [
      // Information / learning outcomes
      { value: 'understand_topic', description: 'Learn about a subject' },
      { value: 'get_summary', description: 'Get a concise overview' },
      { value: 'get_steps', description: 'Receive step-by-step instructions' },
      { value: 'get_examples', description: 'See examples or samples' },
      { value: 'get_recommendations', description: 'Receive suggestions' },
      // Problem-solving outcomes
      { value: 'fix_issue', description: 'Resolve a problem' },
      { value: 'restore_service', description: 'Get service working again' },
      { value: 'reduce_error', description: 'Minimize or eliminate errors' },
      { value: 'confirm_working', description: 'Verify something works' },
      { value: 'escalate_to_support', description: 'Reach human support' },
      // Action / task outcomes
      { value: 'complete_transaction', description: 'Finish a purchase/payment' },
      { value: 'submit_request', description: 'Submit a form/application' },
      { value: 'update_details', description: 'Change account/profile info' },
      { value: 'schedule_or_book', description: 'Book appointment/slot' },
      { value: 'download_or_generate', description: 'Get a file/document' },
      // Decision outcomes
      { value: 'compare_options', description: 'See options side by side' },
      { value: 'choose_best_option', description: 'Select the best choice' },
      { value: 'validate_choice', description: 'Confirm a decision' },
      // Location outcomes
      { value: 'find_nearby', description: 'Find nearby locations' },
      { value: 'find_best_match', description: 'Find best matching option' },
      { value: 'get_contact_details', description: 'Get contact information' },
      // Content generation outcomes
      { value: 'create_copy_variants', description: 'Generate copy variations' },
      { value: 'create_longform_content', description: 'Create long-form content' },
      { value: 'create_shortform_content', description: 'Create short-form content' },
      { value: 'adapt_to_language_tone', description: 'Adapt content language/tone' },
      { value: 'format_for_channel', description: 'Format for specific channel' },
      // Relationship / conversation outcomes
      { value: 'feel_reassured', description: 'Feel better/supported' },
      { value: 'continue_chat', description: 'Keep conversation going' },
      { value: 'get_motivation', description: 'Receive encouragement' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 5.3: CONTEXT TOKENS
  // ═══════════════════════════════════════════════════════════════════════════════
  'context.time': {
    description: 'Time of day context',
    values: [
      { value: 'morning', description: 'Morning hours (5am-12pm)' },
      { value: 'afternoon', description: 'Afternoon hours (12pm-5pm)' },
      { value: 'evening', description: 'Evening hours (5pm-9pm)' },
      { value: 'night', description: 'Night hours (9pm-5am)' },
    ],
  },
  'context.event': {
    description: 'Current event context affecting conversation',
    values: [
      { value: 'none', description: 'No special event' },
      { value: 'festival', description: 'Festival season (Diwali, Holi, Eid, etc.)' },
      { value: 'sale_event', description: 'Sale/promotion event' },
      { value: 'cricket_match', description: 'Cricket match in progress (IPL, etc.)' },
      { value: 'exam_season', description: 'Exam season for students' },
      { value: 'weather_disruption', description: 'Weather affecting services' },
      { value: 'public_holiday', description: 'Public holiday' },
      { value: 'breaking_news', description: 'Major news event' },
    ],
  },
  'context.session': {
    description: 'Session context about user history',
    values: [
      { value: 'new_user', description: 'First interaction with system' },
      { value: 'returning_user', description: 'Has interacted before' },
      { value: 'repeat_issue', description: 'Same issue as previous session' },
    ],
  },
  'context.urgency': {
    description: 'Urgency level of the request',
    values: [
      { value: 'low', description: 'No time pressure' },
      { value: 'medium', description: 'Moderate time sensitivity' },
      { value: 'high', description: 'Time-sensitive request' },
      { value: 'critical', description: 'Immediate attention needed' },
    ],
  },
  'context.journey_stage': {
    description: 'Universal lifecycle stage (works for both Jio and open tasks)',
    values: [
      { value: 'discover', description: 'Learning about options' },
      { value: 'onboard', description: 'Getting started' },
      { value: 'use', description: 'Regular usage' },
      { value: 'fix', description: 'Troubleshooting issues' },
      { value: 'pay', description: 'Payment/billing related' },
      { value: 'renew', description: 'Renewal stage' },
      { value: 'upgrade', description: 'Upgrading service' },
      { value: 'exit', description: 'Considering leaving' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 6: EMOTION LAYER (NAVARASA)
  // Token keys: emotion.rasa.user, emotion.intensity, emotion.target
  // ═══════════════════════════════════════════════════════════════════════════════
  'emotion.rasa.user': {
    description: 'Dominant emotional state using Navarasa framework (9 emotions)',
    values: [
      { value: 'shringara', description: 'Love/Delight - warmth, affection. Direction: Match the joy, be warm and personal.' },
      { value: 'hasya', description: 'Laughter/Playfulness - lightness, amusement. Direction: Lean into humour naturally.' },
      { value: 'karuna', description: 'Compassion/Sadness - disappointment, grief. Direction: Be gentle, supportive, sincere.' },
      { value: 'raudra', description: 'Anger/Frustration - irritation, rage. Direction: Stay calm, acknowledge directly, be solution-focused.' },
      { value: 'vira', description: 'Courage/Pride/Ambition - confidence, aspiration. Direction: Be bold, direct, empowering.' },
      { value: 'bhayanaka', description: 'Fear/Anxiety - uncertainty, doubt. Direction: Be steady, factual, reassuring.' },
      { value: 'bibhatsa', description: 'Disgust/Rejection - aversion, dissatisfaction. Direction: Acknowledge, respect distance.' },
      { value: 'adbhuta', description: 'Wonder/Curiosity - excitement, awe. Direction: Spark imagination, be vivid.' },
      { value: 'shanta', description: 'Peace/Stillness - calm, stability. Direction: Respect the quiet, be minimal and clear.' },
    ],
  },
  'emotion.intensity': {
    description: 'How strongly the emotion is expressed',
    values: [
      { value: 'low', description: '1-3: Subtle emotional indicators' },
      { value: 'moderate', description: '4-6: Clear emotional state' },
      { value: 'high', description: '7-8: Strong emotional response' },
      { value: 'extreme', description: '9-10: Requires immediate attention' },
    ],
  },
  'emotion.target': {
    description: 'The emotional state to guide user toward by end of interaction',
    values: [
      { value: 'shanta', description: 'Guide toward stability and peace' },
      { value: 'vira', description: 'Build confidence and empowerment' },
      { value: 'hasya', description: 'Introduce appropriate lightness' },
      { value: 'adbhuta', description: 'Sustain curiosity and inspiration' },
      { value: 'karuna_resolved', description: 'Supported and steadied after sadness' },
      { value: 'relieved', description: 'Practical calm after friction' },
    ],
  },

  // Backward compatibility aliases (old emotion key names)
  'emotion.detected': {
    description: 'Current emotional state using Navarasa framework (alias for emotion.rasa.user)',
    values: [
      { value: 'shringara', description: 'Love/Delight - warmth and connection' },
      { value: 'hasya', description: 'Laughter/Playfulness - lightness' },
      { value: 'karuna', description: 'Compassion/Sadness - empathy' },
      { value: 'raudra', description: 'Anger/Frustration - acknowledgment needed' },
      { value: 'vira', description: 'Courage/Pride - empowerment' },
      { value: 'bhayanaka', description: 'Fear/Anxiety - reassurance needed' },
      { value: 'bibhatsa', description: 'Disgust/Rejection - validation' },
      { value: 'adbhuta', description: 'Wonder/Curiosity - celebration' },
      { value: 'shanta', description: 'Peace/Stillness - target state' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 7.1: PROFILE TOKENS
  // ═══════════════════════════════════════════════════════════════════════════════
  'profile.segment': {
    description: 'User segment within the ecosystem',
    values: [
      { value: 'consumer_mobile', description: 'Mobile consumer user' },
      { value: 'consumer_fiber', description: 'Fiber/broadband consumer' },
      { value: 'enterprise', description: 'Enterprise/business user' },
      { value: 'small_business', description: 'Small business owner' },
      { value: 'student', description: 'Student user' },
      { value: 'family_account', description: 'Family account holder' },
      { value: 'senior_user', description: 'Senior citizen user' },
      { value: 'unknown', description: 'Segment not identified' },
    ],
  },
  'profile.plan': {
    description: 'User plan type',
    values: [
      { value: 'prepaid', description: 'Prepaid mobile plan' },
      { value: 'postpaid', description: 'Postpaid mobile plan' },
      { value: 'broadband', description: 'Broadband/fiber plan' },
      { value: 'business_plan', description: 'Business plan' },
      { value: 'ott_bundle', description: 'OTT bundle subscription' },
      { value: 'unknown', description: 'Plan not identified' },
    ],
  },
  'profile.relationship_stage': {
    description: 'Relationship stage with user (controls familiarity level)',
    values: [
      { value: 'new_user', description: 'New → welcoming clarity' },
      { value: 'early_use', description: 'Early stage → supportive guidance' },
      { value: 'active_regular', description: 'Active → efficient service' },
      { value: 'high_engagement', description: 'High engagement → personalized' },
      { value: 'at_risk', description: 'At risk → trust-restoring tone' },
      { value: 'long_term_loyal', description: 'Loyal → confident, familiar tone' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 7.2: REGION TOKENS
  // ═══════════════════════════════════════════════════════════════════════════════
  'region.state': {
    description: 'Structured state value for geographical context',
    values: [
      { value: '(dynamic)', description: 'Indian state name (e.g., Maharashtra, Karnataka)' },
    ],
  },
  'region.city': {
    description: 'City if known for local context',
    values: [
      { value: '(dynamic)', description: 'City name (e.g., Mumbai, Bangalore)' },
    ],
  },
  'region.locale': {
    description: 'Type of locality (affects infrastructure assumptions)',
    values: [
      { value: 'metro', description: 'Metro city - high infrastructure' },
      { value: 'urban', description: 'Urban area - good infrastructure' },
      { value: 'semi_urban', description: 'Semi-urban - moderate infrastructure' },
      { value: 'rural', description: 'Rural area - basic infrastructure' },
      { value: 'remote', description: 'Remote area - limited infrastructure' },
    ],
  },
  'region.connectivity_profile': {
    description: 'Network connectivity profile (prevents giving high-bandwidth solutions to low-bandwidth users)',
    values: [
      { value: 'high_speed_available', description: 'High-speed connection available' },
      { value: 'limited_bandwidth', description: 'Limited bandwidth environment' },
      { value: 'unstable_network', description: 'Unstable network conditions' },
      { value: 'unknown', description: 'Connectivity unknown' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 7.3-7.6: LANGUAGE TOKENS
  // ═══════════════════════════════════════════════════════════════════════════════
  'lang': {
    description: 'Primary language for communication',
    values: [
      { value: 'english', description: 'English' },
      { value: 'hindi', description: 'Hindi' },
      { value: 'hinglish', description: 'Hindi-English mix' },
      { value: 'tamil', description: 'Tamil' },
      { value: 'telugu', description: 'Telugu' },
      { value: 'kannada', description: 'Kannada' },
      { value: 'malayalam', description: 'Malayalam' },
      { value: 'bengali', description: 'Bengali' },
      { value: 'marathi', description: 'Marathi' },
      { value: 'gujarati', description: 'Gujarati' },
      { value: 'punjabi', description: 'Punjabi' },
      { value: 'odia', description: 'Odia' },
      { value: 'assamese', description: 'Assamese' },
      { value: 'urdu', description: 'Urdu' },
    ],
  },
  'script': {
    description: 'Script alignment for readability',
    values: [
      { value: 'latin', description: 'Latin/Roman script' },
      { value: 'devanagari', description: 'Devanagari script (Hindi, Marathi)' },
      { value: 'tamil', description: 'Tamil script' },
      { value: 'telugu', description: 'Telugu script' },
      { value: 'kannada', description: 'Kannada script' },
      { value: 'malayalam', description: 'Malayalam script' },
      { value: 'bengali', description: 'Bengali script' },
      { value: 'gujarati', description: 'Gujarati script' },
      { value: 'gurmukhi', description: 'Gurmukhi script (Punjabi)' },
      { value: 'odia', description: 'Odia script' },
      { value: 'assamese', description: 'Assamese script' },
      { value: 'arabic', description: 'Arabic script (Urdu)' },
    ],
  },
  'lang_mix': {
    description: 'Code-switching preference (use only when session context indicates comfort)',
    values: [
      { value: 'pure', description: 'Single language only' },
      { value: 'light_mix', description: 'Occasional English words in vernacular' },
      { value: 'heavy_mix', description: 'Frequent code-switching' },
      { value: 'code_switch', description: 'Full bilingual switching' },
    ],
  },
  'literacy': {
    description: 'Digital literacy level (controls structural clarity, not intelligence)',
    values: [
      { value: 'low', description: 'Simple language, fewer steps, more guidance' },
      { value: 'moderate', description: 'Standard explanations' },
      { value: 'high', description: 'Can handle technical terms and complex flows' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 8: CONVERSATION CONTROL LAYER
  // Token keys: conversation.state, conversation.transition, conversation.resolution_status, conversation.turn_count
  // ═══════════════════════════════════════════════════════════════════════════════
  'conversation.state': {
    description: 'Current state in the conversation state machine',
    values: [
      { value: 'start', description: 'Entry point - acknowledge user, move toward intent recognition' },
      { value: 'triage', description: 'Intent unclear - determine route, safety, and intent' },
      { value: 'clarify', description: 'Missing critical info - ask minimum question to proceed' },
      { value: 'act', description: 'Providing solution - deliver value, stay focused' },
      { value: 'verify', description: 'After solution - check if resolved or sufficient' },
      { value: 'close', description: 'Goal fulfilled - confirm completion, minimal' },
      { value: 'next_opportunity', description: 'After resolution (if allowed) - offer one contextual next step' },
    ],
  },
  'conversation.transition': {
    description: 'Transition between conversation states',
    values: [
      { value: 'start_to_triage', description: 'Moving from greeting to classification' },
      { value: 'triage_to_clarify', description: 'Need more info before proceeding' },
      { value: 'triage_to_act', description: 'Intent clear, proceed confidently' },
      { value: 'clarify_to_act', description: 'Required info received, execute' },
      { value: 'act_to_verify', description: 'Solution delivered, confirm result' },
      { value: 'verify_to_act', description: 'Not resolved, refine solution' },
      { value: 'verify_to_close', description: 'Resolved, finalize cleanly' },
      { value: 'close_to_next_opportunity', description: 'Resolution complete, offer next help' },
    ],
  },
  'conversation.resolution_status': {
    description: 'Current resolution status',
    values: [
      { value: 'not_started', description: 'No action taken yet - move toward triage/act' },
      { value: 'in_progress', description: 'Working through steps - stay structured' },
      { value: 'blocked_missing_info', description: 'Cannot continue - ask precise clarification' },
      { value: 'resolved', description: 'Goal achieved - confirm and close' },
      { value: 'escalated', description: 'Requires human/system intervention - explain next steps' },
      { value: 'abandoned', description: 'User disengaged - offer simple reopening path' },
    ],
  },
  'conversation.turn_count': {
    description: 'Number of turns in the conversation',
    values: [
      { value: '1-2', description: 'Early interaction - normal exploratory flow' },
      { value: '3-5', description: 'Developing - increase clarity and structure' },
      { value: '6-8', description: 'Possible friction - simplify, summarise, tighten' },
      { value: '9+', description: 'High friction/fatigue - offer reset or escalation' },
    ],
  },

  // Backward compatibility aliases (old conversation key names)
  'conv.state': {
    description: 'Current state in the conversation flow (alias for conversation.state)',
    values: [
      { value: 'greeting', description: 'Initial greeting phase' },
      { value: 'understanding', description: 'Gathering information' },
      { value: 'resolving', description: 'Working on resolution' },
      { value: 'confirming', description: 'Verifying solution' },
      { value: 'closing', description: 'Wrapping up conversation' },
      { value: 'escalated', description: 'Transferred to human agent' },
    ],
  },
  'conv.turn_count': {
    description: 'Number of turns in the conversation (alias for conversation.turn_count)',
    values: [
      { value: '1-2', description: 'Early turns - build rapport' },
      { value: '3-5', description: 'Active resolution - stay focused' },
      { value: '6-8', description: 'Extended conversation - check satisfaction' },
      { value: '9+', description: 'Long conversation - consider escalation' },
    ],
  },
  'conv.resolution_status': {
    description: 'Current resolution status (alias for conversation.resolution_status)',
    values: [
      { value: 'not_started', description: 'Issue not yet addressed' },
      { value: 'in_progress', description: 'Actively working on resolution' },
      { value: 'resolved', description: 'Issue successfully resolved' },
      { value: 'escalated', description: 'Handed off to human' },
      { value: 'abandoned', description: 'User left conversation' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 9: MEMORY LAYER
  // ═══════════════════════════════════════════════════════════════════════════════
  'memory.session.last_intent': {
    description: 'Most recent user intent in current session',
    values: [
      { value: '(dynamic)', description: 'Populated from session memory' },
    ],
  },
  'memory.session.last_step': {
    description: 'Last action step completed in session',
    values: [
      { value: '(dynamic)', description: 'Populated from session memory' },
    ],
  },
  'memory.session.last_entity': {
    description: 'Key entity from last turn (phone number, order ID, etc.)',
    values: [
      { value: '(dynamic)', description: 'Populated from session memory' },
    ],
  },
  'memory.mid_term.last_journey': {
    description: 'Last journey from 7-day cross-channel memory',
    values: [
      { value: '(dynamic)', description: 'Populated from mid-term memory' },
    ],
  },
  'memory.mid_term.preferred_language': {
    description: 'Preferred language from cross-session history',
    values: [
      { value: '(dynamic)', description: 'Populated from mid-term memory' },
    ],
  },
  'memory.mid_term.last_channel': {
    description: 'Last channel used from cross-session history',
    values: [
      { value: '(dynamic)', description: 'Populated from mid-term memory' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 10: VOICE & TONE LAYER (PERSONA)
  // ═══════════════════════════════════════════════════════════════════════════════
  'persona': {
    description: 'Relationship posture in conversation (stance, not personality role-play)',
    values: [
      { value: 'jio_friend', description: 'Casual, everyday support, emotional reassurance. Warm, relatable, conversational.' },
      { value: 'jio_guide', description: 'Step-by-step flows, onboarding, tutorials. Clear, structured, steady.' },
      { value: 'jio_expert', description: 'Technical explanation, enterprise, policy. Precise, confident, direct.' },
      { value: 'jio_support', description: 'Complaints, friction, failures, escalations. Calm, solution-oriented, composed.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 11: EXPERIENCE CONTEXT LAYER
  // ═══════════════════════════════════════════════════════════════════════════════
  'ecosystem': {
    description: 'Domain of relevance (controls vocabulary, references, nudges)',
    values: [
      { value: 'connectivity', description: 'Mobile, fiber, network, device - use telecom language, be operational' },
      { value: 'finance', description: 'Payments, billing, refunds - use precision, avoid speculation' },
      { value: 'shopping', description: 'Commerce, orders, delivery - structured options, status clarity' },
      { value: 'health', description: 'Health info, appointments - activate Safety Layer, calm tone' },
      { value: 'education', description: 'Learning, tutorials, courses - encourage clarity and exploration' },
      { value: 'entertainment', description: 'Movies, music, sports - allow slight expressive tone' },
      { value: 'enterprise', description: 'Business dashboards, SLA, contracts - direct, precise, structured' },
      { value: 'general', description: 'Open-domain, non-ecosystem - Base LLM answers, Jio tone applied' },
    ],
  },
  'channel': {
    description: 'Communication medium constraints',
    values: [
      { value: 'app_chat', description: 'Full structured responses allowed' },
      { value: 'whatsapp', description: 'Conversational, short blocks, friendly rhythm' },
      { value: 'ivr_voice', description: 'Audio-only - short sentences, clear pacing, no visual refs' },
      { value: 'sms', description: 'Character-limited - very concise, no excess context' },
      { value: 'email', description: 'Longer structured - clear headings, complete info' },
      { value: 'push_notification', description: 'Extremely brief - one-line actionable clarity' },
      { value: 'retail_store', description: 'Assisted environment - direct and operational' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 12: STRUCTURE & PATTERNS LAYER
  // ═══════════════════════════════════════════════════════════════════════════════
  'pattern': {
    description: 'Reusable response building blocks',
    values: [
      { value: 'empathy.acknowledge', description: 'Emotional alignment - briefly recognise user state' },
      { value: 'clarify.ask', description: 'Unlocking clarity - ask one focused question' },
      { value: 'explain.why', description: 'Transparency - simple cause-effect explanation' },
      { value: 'guide.next_step', description: 'Forward movement - provide structured next step' },
      { value: 'guide.multi_step', description: 'Structured flow - present steps sequentially' },
      { value: 'confirm.action', description: 'Consent check - confirm before irreversible step' },
      { value: 'confirm.done', description: 'Closure validation - confirm what completed' },
      { value: 'summarise.status', description: 'Clarity reset - short recap to reduce confusion' },
      { value: 'handoff.warm', description: 'Human continuity - explain next process calmly' },
      { value: 'offer.option', description: 'User agency - present clear structured options' },
      { value: 'reassure.safety', description: 'Calm stabilisation - steady factual reassurance' },
      { value: 'proactive.suggest', description: 'Controlled expansion - one optional relevant suggestion' },
    ],
  },
  'pattern.sequence': {
    description: 'Ordered structure of patterns for response',
    values: [
      { value: 'acknowledge_clarify_act_verify', description: 'Troubleshooting: emotional align → unlock info → solution → confirm' },
      { value: 'direct_answer_explain_option', description: 'Knowledge/comparison: clear answer → reasoning → optional paths' },
      { value: 'guide_multi_step_confirm', description: 'Setup/onboarding: structured guidance → confirmation' },
      { value: 'acknowledge_act_summarise', description: 'Complaint handling: validate → resolve → recap' },
      { value: 'act_verify_close', description: 'Transaction flows: execute → confirm → finish cleanly' },
      { value: 'resolve_next_opportunity', description: 'Post-resolution: only after confirmed success' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 13: RISK AWARENESS LAYER
  // ═══════════════════════════════════════════════════════════════════════════════
  'risk.category': {
    description: 'Type of operational/regulatory risk (does not replace Safety Layer)',
    values: [
      { value: 'none', description: 'No operational risk - proceed normally' },
      { value: 'account_security', description: 'Login, OTP, KYC - confirm identity steps carefully' },
      { value: 'finance_regulatory', description: 'Payments, refunds - precise language, confirm amounts' },
      { value: 'privacy', description: 'Personal data - avoid storing/exposing extra data' },
      { value: 'fraud_scam', description: 'Suspicious activity - protective guidance, calm tone' },
      { value: 'cybersecurity', description: 'Device/network compromise - containment steps, calm authority' },
      { value: 'contractual', description: 'Enterprise, SLA, policy - precise, avoid casual phrasing' },
      { value: 'legal_sensitive', description: 'Legal implications - avoid advisory beyond general info' },
    ],
  },
  'risk.level': {
    description: 'Risk severity level (higher = slower pacing, clearer confirmations)',
    values: [
      { value: 'low', description: 'Minor procedural risk - standard clarity' },
      { value: 'medium', description: 'Financial/identity implications - increase precision' },
      { value: 'high', description: 'Data, money, trust at stake - slow down, confirm' },
      { value: 'critical', description: 'Immediate fraud/security - stabilise, contain first' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTION 14: FINISHING LAYER
  // Token keys: signature, small_joy
  // ═══════════════════════════════════════════════════════════════════════════════
  'signature': {
    description: 'Closing identity markers (must match emotion, channel, risk)',
    values: [
      { value: 'youre_all_set', description: 'Task completed - clean and confident closure' },
      { value: 'thank_you_for_choosing_jio', description: 'General closure - warm but not excessive' },
      { value: 'with_love_from_jio', description: 'Celebration/delight - emotional warmth allowed' },
      { value: 'take_care', description: 'Health/sensitive - gentle close' },
      { value: 'reach_out_anytime', description: 'Support contexts - reassuring availability' },
      { value: 'none', description: 'Transactional SMS/brief - minimal closure' },
    ],
  },
  'small_joy': {
    description: 'Micro-uplift element (optional, never mandatory, never in risk/complaint)',
    values: [
      { value: 'time_of_day_wish', description: 'Normal interactions - light contextual warmth' },
      { value: 'festival_warmth', description: 'Regional event active - cultural connection' },
      { value: 'cricket_reference', description: 'Sports season - light excitement' },
      { value: 'workday_encouragement', description: 'Weekday flows - gentle positivity' },
      { value: 'learning_encouragement', description: 'Education context - motivational tone' },
      { value: 'none', description: 'Risk, complaint, crisis - no uplift' },
    ],
  },

  // Backward compatibility aliases (old finishing key names)
  'finish.signature': {
    description: 'Closing signature style (alias for signature)',
    values: [
      { value: 'youre_all_set', description: 'Task completed successfully' },
      { value: 'thank_you', description: 'General interaction closure' },
      { value: 'with_love', description: 'Celebration or delight context' },
      { value: 'take_care', description: 'Health or sensitive context' },
      { value: 'reach_out_anytime', description: 'Support context - availability' },
      { value: 'none', description: 'No signature (brief responses)' },
    ],
  },
  'finish.small_joy': {
    description: 'Micro-uplift element to include (alias for small_joy)',
    values: [
      { value: 'none', description: 'No joy element appropriate' },
      { value: 'encouragement', description: 'Encouraging message' },
      { value: 'celebration', description: 'Celebrating achievement' },
      { value: 'cricket_reference', description: 'Cricket-related joy (match context)' },
      { value: 'festival_warmth', description: 'Festival-related warmth' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // BACKWARD COMPATIBILITY ALIASES (Identity tokens using old keys)
  // ═══════════════════════════════════════════════════════════════════════════════
  'identity.persona': {
    description: 'The AI persona being used (alias for persona)',
    values: [
      { value: 'jio_voice', description: 'Default Jio conversational assistant' },
      { value: 'jio_support', description: 'Technical support specialist' },
      { value: 'jio_sales', description: 'Sales and offers specialist' },
    ],
  },
  'identity.ecosystem': {
    description: 'Jio ecosystem context (alias for ecosystem)',
    values: [
      { value: 'jio_telecom', description: 'Mobile and telecom services' },
      { value: 'jio_fiber', description: 'Broadband and fiber services' },
      { value: 'jio_platforms', description: 'Digital platforms (JioTV, JioCinema, etc.)' },
      { value: 'jio_retail', description: 'JioMart and retail services' },
      { value: 'jio_money', description: 'Financial services' },
    ],
  },
  'identity.channel': {
    description: 'Communication channel (alias for channel)',
    values: [
      { value: 'chatbot', description: 'Chat interface' },
      { value: 'sms', description: 'SMS messages' },
      { value: 'ivr', description: 'Voice response system' },
      { value: 'email', description: 'Email communication' },
      { value: 'whatsapp', description: 'WhatsApp messaging' },
      { value: 'push_notification', description: 'Push notifications' },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════

interface TokenCardProps {
  tokenKey: string;
  doc: typeof TOKEN_DOCUMENTATION[string];
  rules: Record<string, string> | undefined;
}

const TokenCard = memo(function TokenCard({ tokenKey, doc, rules }: TokenCardProps) {
  const theme = useThemeColors();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="rounded-lg p-3 mb-2"
      style={{
        backgroundColor: theme.background.layer,
        border: `1px solid ${theme.stroke.low}`,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <code
            className="px-2 py-0.5 rounded text-sm font-mono"
            style={{
              backgroundColor: theme.stroke.low,
              color: theme.accent.primary,
            }}
          >
            {tokenKey}
          </code>
          <span
            className="text-xs"
            style={{ color: theme.text.low }}
          >
            {doc.values.length} values
          </span>
        </div>
        <DSIcon
          name={isExpanded ? 'IcChevronUp' : 'IcChevronDown'}
          size="XS"
          attention="low"
        />
      </button>

      {/* Description */}
      <p
        className="text-sm mt-2"
        style={{ color: theme.text.medium }}
      >
        {doc.description}
      </p>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {/* Values */}
          <div>
            <h4
              className="text-xs font-medium mb-1"
              style={{ color: theme.text.low }}
            >
              Possible values
            </h4>
            <div className="space-y-1">
              {doc.values.map((v) => (
                <div
                  key={v.value}
                  className="flex items-start gap-2 text-sm"
                >
                  <code
                    className="px-1.5 py-0.5 rounded text-xs font-mono shrink-0"
                    style={{
                      backgroundColor: theme.background.ghost,
                      color: theme.text.high,
                    }}
                  >
                    {v.value}
                  </code>
                  <span style={{ color: theme.text.medium }}>
                    {v.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rules */}
          {rules && Object.keys(rules).length > 0 && (
            <div>
              <h4
                className="text-xs font-medium mb-1 mt-3"
                style={{ color: theme.text.low }}
              >
                LLM behavior rules
              </h4>
              <div className="space-y-1">
                {Object.entries(rules).map(([value, rule]) => (
                  <div
                    key={value}
                    className="text-xs p-2 rounded"
                    style={{
                      backgroundColor: theme.background.ghost,
                      border: `1px solid ${theme.stroke.low}`,
                    }}
                  >
                    <code
                      className="font-mono"
                      style={{ color: theme.accent.primary }}
                    >
                      {value}
                    </code>
                    <span style={{ color: theme.text.low }}> → </span>
                    <span style={{ color: theme.text.medium }}>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Example */}
          {doc.example && (
            <div
              className="text-xs mt-2 p-2 rounded"
              style={{
                backgroundColor: theme.accent.primary + '10',
                color: theme.text.medium,
              }}
            >
              <strong>Example:</strong> {doc.example}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

interface TokenGroupProps {
  groupName: string;
  tokens: string[];
  tokenDocs: typeof TOKEN_DOCUMENTATION;
  tokenRules: typeof TOKEN_RULES;
}

const TokenGroup = memo(function TokenGroup({ 
  groupName, 
  tokens, 
  tokenDocs, 
  tokenRules 
}: TokenGroupProps) {
  const theme = useThemeColors();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const displayName = groupName.replace(/_/g, ' ').toLowerCase();

  return (
    <div className="mb-4">
      {/* Group Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer mb-2"
        style={{
          backgroundColor: theme.stroke.low,
        }}
      >
        <div className="flex items-center gap-2">
          <DSIcon
            name={isCollapsed ? 'IcChevronRight' : 'IcChevronDown'}
            size="XS"
            attention="medium"
          />
          <span
            className="text-sm font-medium"
            style={{ color: theme.text.high }}
          >
            {displayName}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: theme.accent.primary + '20',
              color: theme.accent.primary,
            }}
          >
            {tokens.length} tokens
          </span>
        </div>
      </button>

      {/* Tokens */}
      {!isCollapsed && (
        <div className="pl-4">
          {tokens.map((tokenKey) => {
            const doc = tokenDocs[tokenKey] || {
              description: `Token: ${tokenKey}`,
              values: [],
            };
            const rules = tokenRules[tokenKey];

            return (
              <TokenCard
                key={tokenKey}
                tokenKey={tokenKey}
                doc={doc}
                rules={rules}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export const TokensDisplay = memo(function TokensDisplay() {
  const theme = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | 'all'>('all');

  // Filter tokens based on search and group selection
  const filteredGroups = useMemo(() => {
    const groups = Object.entries(TOKEN_GROUPS);
    
    if (selectedGroup !== 'all') {
      return groups.filter(([name]) => name === selectedGroup);
    }
    
    if (!searchQuery) {
      return groups;
    }
    
    const query = searchQuery.toLowerCase();
    return groups
      .map(([name, tokens]) => {
        const filteredTokens = tokens.filter((token) => {
          const doc = TOKEN_DOCUMENTATION[token];
          return (
            token.toLowerCase().includes(query) ||
            (doc && doc.description.toLowerCase().includes(query)) ||
            (doc && doc.values.some((v) => 
              v.value.toLowerCase().includes(query) || 
              v.description.toLowerCase().includes(query)
            ))
          );
        });
        return [name, filteredTokens] as [string, string[]];
      })
      .filter(([, tokens]) => tokens.length > 0);
  }, [searchQuery, selectedGroup]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: theme.stroke.low }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1
              className="text-xl font-semibold"
              style={{ color: theme.text.high }}
            >
              Tokens specification
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: theme.text.low }}
            >
              {TOTAL_TOKEN_COUNT} tokens across {Object.keys(TOKEN_GROUPS).length} categories
            </p>
          </div>
          <div
            className="text-right text-sm"
            style={{ color: theme.text.low }}
          >
            <div>controls LLM behavior</div>
            <div>routing, safety, emotion, identity</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <DSIcon
              name="IcSearch"
              size="XS"
              attention="low"
              className="absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: theme.background.layer,
                border: `1px solid ${theme.stroke.low}`,
                color: theme.text.high,
              }}
            />
          </div>

          {/* Group Filter */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm cursor-pointer"
            style={{
              backgroundColor: theme.background.layer,
              border: `1px solid ${theme.stroke.low}`,
              color: theme.text.high,
            }}
          >
            <option value="all">All groups ({TOTAL_TOKEN_COUNT})</option>
            {Object.entries(TOKEN_COUNTS).map(([group, count]) => (
              <option key={group} value={group}>
                {group.replace(/_/g, ' ').toLowerCase()} ({count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Token List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredGroups.length === 0 ? (
          <div
            className="text-center py-8"
            style={{ color: theme.text.low }}
          >
            No tokens found matching "{searchQuery}"
          </div>
        ) : (
          filteredGroups.map(([groupName, tokens]) => (
            <TokenGroup
              key={groupName}
              groupName={groupName}
              tokens={tokens}
              tokenDocs={TOKEN_DOCUMENTATION}
              tokenRules={TOKEN_RULES}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default TokensDisplay;
