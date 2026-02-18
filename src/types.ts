// Voice gender options
export const VoiceGender = {
  FEMALE: 'female',
  MALE: 'male',
} as const;

export type VoiceGender = typeof VoiceGender[keyof typeof VoiceGender];

// Application states for the conversation mode
export const AppState = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  LISTENING: 'listening',
  SPEAKING: 'speaking',
  ERROR: 'error',
} as const;

export type AppState = typeof AppState[keyof typeof AppState];

// Vibe options for the voice persona
export type Vibe = 'calm' | 'warm' | 'energetic' | 'professional';

// Pace options
export type Pace = 'slow' | 'medium' | 'fast';

// Response length options
export type ResponseLength = 'short' | 'medium' | 'long';

// Language options
export type Language = 'english' | 'hindi' | 'hinglish';

// Channel options for copy generation
/** @deprecated Use ContentChannelType from Content Trust System instead */
export type Channel = 'sms' | 'whatsapp' | 'email';

// Platform options for copy generation
/** @deprecated Use EcosystemType from Content Trust System instead */
export type Platform = 'notifications' | 'banner' | 'ads';

// =============================================================================
// CONTENT TRUST SYSTEM TYPES (v2)
// =============================================================================

/**
 * 14 Ecosystems - Business context for content generation
 * Replaces old Platform type for copy generation
 * Source: Training 1.pdf, lines 1629-1737
 */
export type EcosystemType = 
  | 'connectivity'   // Jio mobile, fiber, network
  | 'home'           // JioFiber, home entertainment
  | 'entertainment'  // JioCinema, JioTV, music
  | 'shopping'       // JioMart, retail
  | 'finance'        // JioPayments, banking
  | 'health'         // JioHealthHub, wellness
  | 'business'       // Enterprise, B2B
  | 'work'           // Employee communications (renamed from 'internal')
  | 'government'     // G2C services
  // NEW - 5 Previously Missing Ecosystems
  | 'education'      // Learning platforms, courses
  | 'sports'         // Sports content, live streaming
  | 'agriculture'    // Farmer services, rural
  | 'energy'         // Solar, clean energy
  | 'transport'      // Mobility, logistics
  | 'support';       // Customer care (kept for compatibility)

/**
 * 18 Channels - Output format for content generation
 * Replaces old Channel type with more granular options
 */
export type ContentChannelType = 
  // Quick Messages
  | 'push_notification'
  | 'sms'
  | 'whatsapp_alert'
  // Support & Chat
  | 'customer_care_chat'
  | 'whatsapp_support'
  | 'chatbot_faq'
  // Voice
  | 'ivr_voice_menu'
  | 'voice_assistant'
  | 'voice_prompts'
  // Email
  | 'marketing_email'
  | 'transactional_email'
  // Marketing & Ads
  | 'social_media_post'
  | 'digital_ads'
  | 'tv_video_ad'
  // In-App & Web
  | 'app_notification'
  | 'onboarding_screen'
  // Internal
  | 'internal_announcement'
  | 'training_module';

/**
 * 9 Navarasa emotions - Indian emotional framework
 * Replaces old Vibe type with culturally relevant emotions
 */
export type NavarasaType = 
  | 'shringara'  // Joy, Love, Gratitude
  | 'hasya'      // Humor, Playfulness
  | 'karuna'     // Compassion, Empathy
  | 'raudra'     // Frustration, Anger (calm response)
  | 'vira'       // Courage, Pride, Ambition
  | 'bhayanaka'  // Fear, Anxiety (reassuring response)
  | 'bibhatsa'   // Disgust, Want to cancel (respectful)
  | 'adbhuta'    // Wonder, Curiosity
  | 'shanta';    // Peace, Calm, Neutral

/**
 * Content generation goal types
 */
export type ContentGoalType = 
  | 'Action'        // Drive immediate action
  | 'Alert'         // Urgent notification
  | 'Support'       // Help and assistance
  | 'Instructional' // Step-by-step guidance
  | 'Engagement'    // Build relationship
  | 'Confirmation'  // Acknowledge transaction
  | 'Information';  // Share updates

/**
 * 15 Supported Indian languages
 */
export type SupportedLanguage = 
  | 'english'
  | 'hindi'
  | 'hinglish'   // Hindi-English mix
  | 'tamil'
  | 'telugu'
  | 'kannada'
  | 'malayalam'
  | 'marathi'
  | 'gujarati'
  | 'bengali'
  | 'punjabi'
  | 'odia'
  | 'assamese'
  | 'urdu'
  | 'konkani';

/**
 * Indian regions for content localization
 */
export type IndianRegion = 
  | 'pan_india'   // Neutral, all-India
  | 'north'       // UP, Uttarakhand, HP, J&K
  | 'south'       // TN, KA, KL, AP, TS
  | 'east'        // WB, Bihar, Jharkhand, Odisha
  | 'west'        // MH, Gujarat, Goa, Rajasthan
  | 'northeast'   // Assam, Meghalaya, etc.
  | 'delhi'       // Delhi NCR
  | 'mumbai'      // Mumbai metro
  | 'bangalore'   // Bangalore metro
  | 'chennai'     // Chennai metro
  | 'kolkata'     // Kolkata metro
  | 'hyderabad';  // Hyderabad metro

/**
 * User age group affecting communication style
 */
export type AgeGroup = 'digital_confident' | 'digital_cautious';

/**
 * Literacy level affecting content complexity
 */
export type LiteracyLevel = 'low' | 'high';

/**
 * Validation strictness levels
 */
export type ValidationStrictness = 'lenient' | 'standard' | 'strict';

/**
 * Violation severity levels
 */
export type ViolationSeverity = 'error' | 'warning' | 'info';

/**
 * Trust certification status
 */
export type TrustCertification = 'certified' | 'review_recommended' | 'issues_found';

// =============================================================================
// TRUST SCORE & VALIDATION TYPES
// =============================================================================

/**
 * Individual violation found during validation
 */
export interface Violation {
  severity: ViolationSeverity;
  rule: string;
  text: string;           // The problematic text
  suggestion: string;     // How to fix it
  category: string;       // Which agent found it
  position?: { 
    start: number; 
    end: number; 
  };
  autoFixable: boolean;
}

/**
 * Auto-fix suggestion for a violation
 */
export interface AutoFix {
  original: string;
  replacement: string;
  confidence: number;     // 0-1, higher = safer to auto-apply
  rule: string;
  violation: Violation;
}

/**
 * Auto-fix preview state for inline side-by-side display
 * Shows original and recommended content in chat interface
 */
export interface AutoFixPreview {
  /** Original content before fixes */
  originalContent: string;
  /** Content with all auto-fixes applied */
  fixedContent: string;
  /** List of fixes that were applied */
  appliedFixes: AutoFix[];
  /** True while user hasn't accepted or dismissed the preview */
  isPending: boolean;
}

/**
 * Evidence of what influenced content generation
 * Used to show transparency in the Trust panel's Evidence tab
 */
export interface GenerationEvidence {
  /** Knowledge base items that were used */
  knowledgeUsed: {
    /** Avoid words that matched in the output (before auto-fix) */
    avoidWordsMatched: string[];
    /** Preferred vocabulary terms used in the output */
    preferredWordsUsed: string[];
    /** Number of auto-fix rules available */
    autoFixRulesCount: number;
    /** Source of knowledge data */
    source: 'convex' | 'code_defaults' | 'convex_with_rag';
  };
  
  /** Learnings from user feedback that were applied */
  learningsApplied: {
    /** Number of correction pairs injected into prompt */
    correctionsCount: number;
    /** Avoid patterns from thumbs-down feedback */
    avoidPatterns: string[];
    /** Style preferences from user comments */
    stylePreferences: string[];
  };
  
  /** Auto-fixes applied after generation */
  autoFixes: {
    /** List of replacements made */
    applied: Array<{ from: string; to: string }>;
    /** Total count of fixes */
    totalCount: number;
  };
  
  /** RAG semantic search results (if used) */
  semanticSearch?: {
    /** Original query */
    query: string;
    /** Number of results used */
    resultsUsed: number;
    /** Highest relevance score */
    topScore: number;
  };
}

/**
 * Result from a single validation agent
 */
export interface ValidationResult {
  agentName: string;
  passed: boolean;
  score: number;          // 0-100
  violations: Violation[];
  suggestions: string[];
  autoFixes: AutoFix[];
  processingTimeMs: number;
  usedLLM: boolean;
}

/**
 * Trust score breakdown by validation category
 */
export interface TrustScoreBreakdown {
  genderNeutrality: number;
  inclusivity: number;
  culturalSensitivity: number;
  accessibility: number;
  compliance: number;
  styleConsistency: number;
  brandAlignment: number;
  readability: number;  // Training 1.pdf: Grade 8 readability requirement
  avoidWords?: number;  // Optional for backwards compat with stored messages
}

/**
 * Complete trust score for content
 */
export interface TrustScore {
  overall: number;        // 0-100
  breakdown: TrustScoreBreakdown;
  confidence: 'high' | 'medium' | 'low';
  certified: boolean;     // True if score >= threshold
  certification: TrustCertification;
  validationResults: ValidationResult[];
  totalViolations: number;
  autoFixableCount: number;
  processingTimeMs: number;
}

/**
 * Guardrail compliance status for UI display
 */
export interface GuardrailStatus {
  id: string;
  rule: string;
  description: string;
  status: 'followed' | 'partial';
  confidence: 'high' | 'medium';
}

/**
 * Validation agent results summary for UI display
 */
export interface ValidationAgentSummary {
  agentId: string;
  agentName: string;
  rulesChecked: number;
  rulesPassed: number;
  keyRulesFollowed: string[];
}

/**
 * Trust summary for quick overview
 */
export interface TrustSummary {
  totalRulesChecked: number;
  totalRulesPassed: number;
  compliancePercentage: number;
  intelligenceIndicators: string[];
}

/**
 * Complete compliance justification for building user trust
 * Shows which rules have been followed and provides transparency
 */
export interface ComplianceJustification {
  /** The content that was analyzed (truncated for display) */
  analyzedContent: string;
  
  /** Brand guardrails status */
  guardrailsFollowed: GuardrailStatus[];
  
  /** Validation agents status (rules passed) */
  validationsPassed: ValidationAgentSummary[];
  
  /** Summary for quick trust building */
  trustSummary: TrustSummary;
}

// =============================================================================
// GENERATION CONTEXT TYPES
// =============================================================================

/**
 * User profile for content personalization
 */
export interface UserProfile {
  ageGroup: AgeGroup;
  region: IndianRegion;
  language: SupportedLanguage;
  literacyLevel: LiteracyLevel;
}

/**
 * Timing context for content delivery
 */
export interface TimingContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late_night';
  dayOfWeek: 'weekday' | 'weekend';
  festival?: string;
  specialEvent?: string;
}

/**
 * Track which parameters were manually overridden
 */
export interface ContextOverrides {
  warmthOverridden?: boolean;
  detailOverridden?: boolean;
  emotionOverridden?: boolean;
  timingOverridden?: boolean;
}

/**
 * Detected product context - for transparency layer
 * Separates WHAT (product/topic) from HOW (ecosystem tone)
 */
export interface DetectedProductContext {
  /** Detected Jio product from user query */
  productId: string | null;
  /** Display name of detected product */
  productName: string | null;
  /** Detection confidence level */
  confidence: 'high' | 'medium' | 'low' | 'none';
  /** Keywords that triggered detection */
  matchedKeywords: string[];
  /** Ecosystem that would naturally fit this product */
  suggestedEcosystem: EcosystemType | null;
  /** True if detected product doesn't match selected ecosystem */
  ecosystemMismatch: boolean;
}

/**
 * Complete generation context - all parameters for content generation
 */
export interface GenerationContext {
  // User Selection (from dropdowns)
  ecosystem: EcosystemType;
  channel: ContentChannelType;
  
  // Auto-derived from channel (can be overridden)
  warmth: number;         // 1-10
  detail: number;         // 1-10
  goal: ContentGoalType;
  
  // User Profile
  userProfile: UserProfile;
  
  // Emotion (auto-detected or manual)
  emotion: NavarasaType;
  
  // Timing (auto-detected or manual)
  timing: TimingContext;
  
  // Track overrides for display in TrustContextPanel
  overrides?: ContextOverrides;
  
  // Detected product context (for transparency layer)
  detectedProduct?: DetectedProductContext;
  
  // Persona context (Phase 1) -- optional, additive
  persona?: string;  // PersonaRole -- kept as string for serialization
}

/**
 * Default generation context
 */
export const DEFAULT_GENERATION_CONTEXT: GenerationContext = {
  ecosystem: 'connectivity',
  channel: 'push_notification',
  warmth: 7,
  detail: 2,
  goal: 'Action',
  userProfile: {
    ageGroup: 'digital_confident',
    region: 'pan_india',
    language: 'english',
    literacyLevel: 'high',
  },
  emotion: 'shanta',
  timing: {
    timeOfDay: 'morning',
    dayOfWeek: 'weekday',
  },
};

// =============================================================================
// PROJECT TRUST SETTINGS
// =============================================================================

/**
 * Trust and validation settings for a project
 */
export interface TrustSettings {
  minimumScore: number;           // Default 90
  blockBelowThreshold: boolean;   // Block content below minimumScore
  autoFixMinorIssues: boolean;    // Auto-apply high-confidence fixes
  validationStrictness: ValidationStrictness;
  showDetailedBreakdown: boolean; // Show full agent scores
}

/**
 * Default trust settings
 */
export const DEFAULT_TRUST_SETTINGS: TrustSettings = {
  minimumScore: 90,
  blockBelowThreshold: false,
  autoFixMinorIssues: false,
  validationStrictness: 'standard',
  showDetailedBreakdown: true,
};

// Persona configuration
export interface PersonaConfig {
  tone: string;
  pace: Pace;
  confidence: 'low' | 'medium' | 'high';
  vibe: Vibe;
  language: Language;
}

// Full conversation configuration
export interface ConversationConfig {
  persona: PersonaConfig;
  greeting: string;
  maxResponseLength: ResponseLength;
}

// Voice information
export interface Voice {
  id: string;
  name: string;
  gender: VoiceGender;
  language: string;
  description: string;
}

// TTS Provider types
export type TTSProviderType = 'alibaba' | 'gemini' | 'elevenlabs';
export type ConversationProviderType = 'alibaba' | 'gemini';

// Audio output format
export type AudioFormat = 'mp3' | 'pcm' | 'wav' | 'opus';

// TTS synthesis options
export interface TTSSynthesisOptions {
  text: string;
  voice: string;
  format?: AudioFormat;
  sampleRate?: number;
  volume?: number;
  rate?: number;
  pitch?: number;
}

// Conversation session options
export interface ConversationSessionOptions {
  voice: string;
  systemPrompt: string;
  persona: PersonaConfig;
  greeting: string;
  maxResponseLength: ResponseLength;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

// Active view type
export type ActiveView = 'main' | 'docs' | 'how-it-works' | 'compliance-tests';

// Active tab type
export type ActiveTab = 'tts' | 'talk' | 'copy';

// Color mode
export type ColorMode = 'Light' | 'Dark';

// Documentation section
export interface DocSection {
  id: string;
  title: string;
  content: string;
}

// Project management
export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  config: ConversationConfig;
  voiceGender: VoiceGender;
  /** @deprecated Use defaultChannel instead */
  channel?: Channel;    // Optional for backward compatibility
  /** @deprecated Use defaultEcosystem instead */
  platform?: Platform;  // Optional for backward compatibility
  
  // ==========================================================================
  // CONTENT TRUST SYSTEM DEFAULTS (v2)
  // ==========================================================================
  
  /** Default ecosystem for new conversations */
  defaultEcosystem?: EcosystemType;
  
  /** Default channel for new conversations */
  defaultChannel?: ContentChannelType;
  
  /** Default language for content generation */
  defaultLanguage?: SupportedLanguage;
  
  /** Default region for content localization */
  defaultRegion?: IndianRegion;
  
  /** Default user profile for content personalization */
  defaultUserProfile?: UserProfile;
  
  /** Trust and validation settings */
  trustSettings?: TrustSettings;
}

// Saved audio in library
export interface SavedAudio {
  id: string;
  projectId: string;
  name: string;
  prompt: string;
  audioData: string; // base64 encoded
  duration: number;
  createdAt: number;
  voiceConfig: { gender: string; voice: string };
}

// Chat mode type for unified interface
export type ChatMode = 'copy' | 'voice';

// Message type discriminator
export type MessageType = 'text' | 'audio';

// =============================================================================
// Feedback Types (moved from MessageFeedback.tsx for centralization)
// =============================================================================

/** Feedback action types for learning system */
export type FeedbackType = 'thumbs_up' | 'thumbs_down' | 'edit' | 'comment';

/** Payload sent when user provides feedback on a message */
export interface FeedbackPayload {
  messageId: string;
  feedbackType: FeedbackType;
  originalContent: string;
  editedContent?: string;
  comment?: string;
  /** Structured dislike reasons (e.g., ["not accurate", "wrong tone"]) */
  reasons?: string[];
}

// =============================================================================
// Prompt Version Tracking (for edit history)
// =============================================================================

/**
 * Represents a single version of a user message prompt
 * Used for edit history tracking (ChatGPT-style 2/2 navigation)
 */
export interface PromptVersion {
  /** The prompt content for this version */
  content: string;
  /** When this version was created */
  timestamp: number;
  /** The AI response ID generated from this prompt version */
  responseId: string;
}

/**
 * Result from handleSendChatMessage for atomic state updates
 */
export interface SendMessageResult {
  /** The user message ID (existing or newly created) */
  userMessageId: string;
  /** The AI response message ID */
  aiMessageId: string;
  /** Whether generation was successful */
  success: boolean;
}

/**
 * Options for handleSendChatMessage
 */
export interface SendMessageOptions {
  /** For edits/regeneration: reuse existing user message ID */
  parentMessageId?: string;
  /** Replace existing AI response in-place */
  replaceResponseId?: string;
  /** Skip creating user message (for edit flow) */
  skipUserMessage?: boolean;
}

// Chat message for unified chat interface
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  // Message type discriminator
  type: MessageType;
  // Audio-specific fields (present when type === 'audio')
  audioData?: string;        // Base64 encoded PCM16 for persistence
  audioDuration?: number;    // Duration in seconds
  audioSampleRate?: number;  // Sample rate for decoding
  // Source tracking for filtering/styling
  sourceMode: ChatMode;
  // For linking user question to AI response
  parentMessageId?: string;
  
  // ==========================================================================
  // CONTENT TRUST SYSTEM FIELDS (v2)
  // ==========================================================================
  
  /** Trust score for this message (assistant messages only) */
  trustScore?: TrustScore;
  
  /** Generation context used to create this message */
  generationContext?: GenerationContext;
  
  /** Summary of validation for quick display */
  validationSummary?: {
    passedCount: number;
    warningCount: number;
    errorCount: number;
    autoFixesApplied: number;
  };
  
  // ==========================================================================
  // PROMPT VERSION TRACKING (for user messages - edit history)
  // ==========================================================================
  
  /** 
   * History of prompt versions (user messages only)
   * First entry is the original, subsequent entries are edits
   */
  promptVersions?: PromptVersion[];
  
  /** 
   * Currently displayed version index (1-indexed for UI display)
   * If undefined, shows the latest version
   */
  displayVersion?: number;
  
  // ==========================================================================
  // USER FEEDBACK TRACKING (for assistant messages)
  // ==========================================================================
  
  /**
   * User feedback for this message (persisted)
   * Used to prevent double-submit and show feedback state after refresh
   */
  userFeedback?: 'like' | 'dislike';
  
  // ==========================================================================
  // CONVERSATIONAL MODE: Intent Tracking
  // ==========================================================================
  
  /**
   * The classified intent for this message.
   * - 'general_chat': Normal conversation (no guardrails, no validation)
   * - 'content_generation': Branded Jio content (full pipeline)
   * - 'jio_inquiry': Jio product questions (no validation, Jio-aware prompt)
   * 
   * Undefined for legacy messages or when conversational mode is disabled.
   */
  messageIntent?: 'general_chat' | 'content_generation' | 'jio_inquiry' | 'safety_response';
  
  // ==========================================================================
  // AUTO-FIX PREVIEW (inline side-by-side display)
  // ==========================================================================
  
  /**
   * Auto-fix preview for side-by-side display in chat interface.
   * When present and isPending=true, shows original (left) and 
   * recommended (right) content with accept button.
   */
  autoFixPreview?: AutoFixPreview;
  
  // ==========================================================================
  // GENERATION EVIDENCE (for transparency in Trust panel)
  // ==========================================================================
  
  /**
   * Evidence of what influenced this generation.
   * Shows in the "Evidence" tab of the Trust panel.
   */
  evidence?: GenerationEvidence;
}

// Inworld configuration
export interface InworldConfig {
  apiKey: string;
  character: string;
  workspaceId?: string;
}

// =============================================================================
// Chat Message Helpers
// =============================================================================

/**
 * Generate a unique message ID
 */
export function generateMessageId(prefix: 'user' | 'ai' = 'user'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a text chat message
 */
export function createTextMessage(
  role: 'user' | 'assistant',
  content: string,
  sourceMode: ChatMode,
  parentMessageId?: string
): ChatMessage {
  return {
    id: generateMessageId(role === 'user' ? 'user' : 'ai'),
    role,
    content,
    timestamp: Date.now(),
    type: 'text',
    sourceMode,
    parentMessageId,
  };
}

/**
 * Create an audio chat message
 */
export function createAudioMessage(
  role: 'user' | 'assistant',
  content: string,
  audioData: string,
  audioDuration: number,
  audioSampleRate: number,
  sourceMode: ChatMode = 'voice',
  parentMessageId?: string
): ChatMessage {
  return {
    id: generateMessageId(role === 'user' ? 'user' : 'ai'),
    role,
    content,
    timestamp: Date.now(),
    type: 'audio',
    audioData,
    audioDuration,
    audioSampleRate,
    sourceMode,
    parentMessageId,
  };
}

// =============================================================================
// Version Migration Helpers
// =============================================================================

/**
 * Migrate legacy messages to include version tracking fields
 * Call this during message load from storage for backward compatibility
 */
export function migrateMessageVersion(message: ChatMessage): ChatMessage {
  // Only migrate user messages without version tracking
  if (message.role === 'user' && !message.promptVersions) {
    return {
      ...message,
      promptVersions: [{
        content: message.content,
        timestamp: message.timestamp,
        responseId: '', // Unknown for legacy messages - will show current content
      }],
      // Don't set displayVersion - undefined means "show latest"
    };
  }
  return message;
}

/**
 * Get the display content for a user message (handles version navigation)
 * Returns the content for the currently selected version, or latest if not set
 */
export function getDisplayContent(message: ChatMessage): string {
  if (!message.promptVersions || message.promptVersions.length === 0) {
    return message.content;
  }
  const version = message.displayVersion ?? message.promptVersions.length;
  return message.promptVersions[version - 1]?.content ?? message.content;
}
