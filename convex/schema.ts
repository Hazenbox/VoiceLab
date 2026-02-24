import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── User Profiles ──────────────────────────────────────────────
  // Created during first-time onboarding. One per device.
  users: defineTable({
    deviceId: v.string(),
    name: v.string(),
    role: v.string(), // marketing | product | ux_writer | sales | support | leadership
    product: v.string(), // ecosystem they primarily work on
    createdAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_deviceId", ["deviceId"])
    .index("by_role", ["role"])
    .index("by_lastSeenAt", ["lastSeenAt"]),

  // ── Corrections & Feedback ─────────────────────────────────────
  // Every thumbs up/down, edit, and comment from users.
  corrections: defineTable({
    userId: v.id("users"),
    deviceId: v.string(),
    messageContent: v.string(), // The AI-generated content
    originalContent: v.string(), // Content before edit (same as messageContent if not edited)
    editedContent: v.optional(v.string()), // Content after edit (only for feedbackType "edit")
    feedbackType: v.string(), // thumbs_up | thumbs_down | edit | comment
    comment: v.optional(v.string()), // User's comment (for "comment" or "thumbs_down" with reason)
    reasons: v.optional(v.array(v.string())), // Structured dislike reasons (e.g., ["not accurate", "wrong tone"])
    ecosystem: v.string(),
    channel: v.string(),
    persona: v.string(),
    trustScore: v.optional(v.number()),
    generationContext: v.optional(v.string()), // JSON stringified GenerationContext
    adminStatus: v.optional(v.string()), // pending | approved | rejected
    timestamp: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_ecosystem_channel", ["ecosystem", "channel"])
    .index("by_timestamp", ["timestamp"])
    .index("by_adminStatus", ["adminStatus"])
    .index("by_feedbackType", ["feedbackType"])
    .index("by_ecosystem_channel_feedbackType", [
      "ecosystem",
      "channel",
      "feedbackType",
    ]),

  // ── Analytics Events ───────────────────────────────────────────
  // One event per content generation, session start, or feedback action.
  // PHASE 0: userId is now optional to allow deviceId-only logging when user is unavailable
  analyticsEvents: defineTable({
    userId: v.optional(v.id("users")), // PHASE 0: Optional - allows logging before user is created
    deviceId: v.string(),
    eventType: v.string(), // generation | feedback | session_start
    ecosystem: v.string(),
    channel: v.string(),
    persona: v.string(),
    trustScore: v.optional(v.number()),
    violationCount: v.optional(v.number()),
    topViolations: v.optional(v.array(v.string())),
    userAction: v.optional(v.string()), // accepted | edited | rejected
    tokenCount: v.optional(v.number()),
    llmProvider: v.optional(v.string()),
    timestamp: v.number(),
    // v2 additions for session tracking
    sessionId: v.optional(v.id("conversationSessions")),
    responseTimeMs: v.optional(v.number()),
    messageSequenceNumber: v.optional(v.number()),
    wasRegeneration: v.optional(v.boolean()),
    errorType: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_ecosystem", ["ecosystem"])
    .index("by_userId", ["userId"])
    .index("by_eventType", ["eventType"])
    .index("by_eventType_timestamp", ["eventType", "timestamp"]) // Compound index for efficient filtered time queries
    .index("by_persona", ["persona"])
    .index("by_sessionId", ["sessionId"]),

  // ── Conversation Sessions ────────────────────────────────────────
  // Tracks user sessions for analytics and behavior analysis.
  // One session = one continuous usage period per project.
  conversationSessions: defineTable({
    userId: v.id("users"),
    deviceId: v.string(),
    projectId: v.string(),
    projectName: v.string(),

    // Session timing
    startedAt: v.number(),
    lastActivityAt: v.number(),
    endedAt: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),

    // Conversation metrics
    messageCount: v.number(),
    userMessageCount: v.number(),
    assistantMessageCount: v.number(),
    averageResponseTimeMs: v.optional(v.number()),

    // Context at session start
    ecosystem: v.string(),
    channel: v.string(),
    persona: v.string(),

    // Session characteristics
    contextSwitches: v.number(), // times user changed ecosystem/channel/persona
    regenerationCount: v.number(), // "try again" clicks
    copyActionCount: v.number(), // times user copied content
    voiceMessageCount: v.number(), // voice inputs
    textMessageCount: v.number(), // text inputs

    // Completion status
    status: v.string(), // active | completed | abandoned
    exitReason: v.optional(v.string()), // user_left | browser_closed | timeout | error

    // Client environment (for UX insights)
    userAgent: v.optional(v.string()),
    screenWidth: v.optional(v.number()),
    screenHeight: v.optional(v.number()),

    // Archival flag for data retention
    isArchived: v.optional(v.boolean()),
    
    // PHASE 4: Sync tracking for offline-first reliability
    lastSyncedAt: v.optional(v.number()), // Last time metrics were synced from client
    syncVersion: v.optional(v.number()),   // Optimistic concurrency control
  })
    .index("by_userId", ["userId"])
    .index("by_deviceId", ["deviceId"])
    .index("by_projectId", ["projectId"])
    .index("by_startedAt", ["startedAt"])
    .index("by_status", ["status"])
    .index("by_isArchived", ["isArchived"]),

  // ── Interaction Events ───────────────────────────────────────────
  // Granular user interactions for behavior analysis.
  // Tracks copy, regenerate, edit, settings changes, feature usage, errors.
  interactionEvents: defineTable({
    userId: v.id("users"),
    sessionId: v.optional(v.id("conversationSessions")),
    deviceId: v.string(),

    // Event details
    eventType: v.string(), // copy | regenerate | edit | settings_change | feature_access | like | dislike | error
    target: v.string(), // messageId, feature name, or error source
    metadata: v.optional(v.string()), // JSON stringified additional context

    timestamp: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_userId", ["userId"])
    .index("by_eventType", ["eventType"])
    .index("by_timestamp", ["timestamp"]),

  // ── Knowledge Base ─────────────────────────────────────────────
  // Dynamic rules, vocabulary, examples, products, festivals.
  // Seeded from hardcoded Tier 1 data, then managed by admin.
  knowledgeItems: defineTable({
    type: v.string(), // avoid_word | preferred_word | product_definition | festival | auto_fix | approved_example | channel_override | ecosystem_override | trigger_override
    category: v.string(), // Sub-category within the type
    content: v.string(), // The actual rule/word/example text
    metadata: v.object({
      ecosystem: v.optional(v.string()),
      channel: v.optional(v.string()),
      persona: v.optional(v.string()),
      severity: v.optional(v.string()), // error | warning | info
      suggestion: v.optional(v.string()), // Suggested replacement
      source: v.optional(v.string()), // system_v1 | admin_manual | user_correction
    }),
    tags: v.array(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.string()), // deviceId of creator, or "system"
    createdAt: v.number(),
    updatedAt: v.number(),
    embedding: v.optional(v.array(v.float64())), // Phase 4: vector for semantic search
  })
    .index("by_type", ["type"])
    .index("by_type_active", ["type", "isActive"])
    .index("by_category", ["category"])
    .index("by_type_category", ["type", "category"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384, // sentence-transformers/all-MiniLM-L6-v2 via Hugging Face
      filterFields: ["type", "category", "isActive"],
    }),

  // ── Admin Configuration ────────────────────────────────────────
  // System-level settings managed by admin at /admin/config.
  adminConfig: defineTable({
    key: v.string(), // e.g. "trust_threshold", "feature_flags", "llm_defaults"
    value: v.string(), // JSON stringified value
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()), // admin deviceId
  }).index("by_key", ["key"]),

  // ── Admin Sessions ───────────────────────────────────────────────
  // Persistent admin authentication sessions (replaces in-memory storage)
  // This ensures sessions survive Vercel cold starts
  adminSessions: defineTable({
    token: v.string(), // Session token (secure random string)
    deviceId: v.string(), // Device that created the session
    createdAt: v.number(),
    expiresAt: v.number(),
    lastUsedAt: v.number(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_deviceId", ["deviceId"])
    .index("by_expiresAt", ["expiresAt"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // P0: CONSTITUTIONAL AI TABLES (Batch 2)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Directive Overrides ─────────────────────────────────────────────
  // Runtime overrides for constitutional directives per ecosystem/channel.
  // Allows admin to customize rules without code changes.
  directiveOverrides: defineTable({
    directiveType: v.string(), // voice_trait | safety_rule | pattern_block | emotion_rule
    directiveKey: v.string(), // e.g., "direct", "suicide_risk", "acknowledge"
    ecosystem: v.optional(v.string()), // null = global override
    channel: v.optional(v.string()), // null = all channels in ecosystem
    overrideAction: v.string(), // enable | disable | modify
    overrideValue: v.optional(v.string()), // JSON for modifications
    priority: v.number(), // Higher = applied later (can override earlier)
    reason: v.optional(v.string()), // Why this override exists
    isActive: v.boolean(),
    createdBy: v.string(), // deviceId of admin
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.optional(v.number()), // Optional auto-expiry
  })
    .index("by_directiveType", ["directiveType"])
    .index("by_ecosystem", ["ecosystem"])
    .index("by_ecosystem_channel", ["ecosystem", "channel"])
    .index("by_directiveType_key", ["directiveType", "directiveKey"])
    .index("by_isActive", ["isActive"]),

  // ── Conversation States ─────────────────────────────────────────────
  // Persists conversation state machine state for multi-turn flows.
  // Enables resumption of complex workflows across sessions.
  conversationStates: defineTable({
    sessionId: v.id("conversationSessions"),
    userId: v.id("users"),
    deviceId: v.string(),
    
    // State machine data
    currentState: v.string(), // e.g., "greeting", "clarifying", "resolving", "escalated"
    previousState: v.optional(v.string()),
    stateHistory: v.array(v.object({
      state: v.string(),
      enteredAt: v.number(),
      exitedAt: v.optional(v.number()),
      trigger: v.optional(v.string()),
    })),
    
    // Context accumulation
    collectedInfo: v.optional(v.string()), // JSON - info gathered during conversation
    pendingClarifications: v.optional(v.array(v.string())),
    resolvedIntents: v.optional(v.array(v.string())),
    
    // Emotional tracking
    detectedEmotion: v.optional(v.string()), // Current navarasa emotion
    emotionHistory: v.optional(v.array(v.object({
      emotion: v.string(),
      confidence: v.number(),
      timestamp: v.number(),
    }))),
    targetEmotion: v.optional(v.string()),
    
    // Safety tracking
    safetyDomain: v.optional(v.string()),
    safetyLevel: v.optional(v.string()),
    escalationReason: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.number(), // Auto-cleanup old states
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_userId", ["userId"])
    .index("by_deviceId", ["deviceId"])
    .index("by_currentState", ["currentState"])
    .index("by_expiresAt", ["expiresAt"]),

  // ── Training Examples ───────────────────────────────────────────────
  // Curated examples for few-shot prompting and model fine-tuning.
  // Admin-approved good/bad examples from corrections or manual curation.
  trainingExamples: defineTable({
    exampleType: v.string(), // good_example | bad_example | correction_pair
    
    // Content
    inputContext: v.string(), // User message or context that triggered this
    outputContent: v.string(), // The response content (good or bad)
    correctedContent: v.optional(v.string()), // For correction_pair: the corrected version
    
    // Classification
    ecosystem: v.string(),
    channel: v.string(),
    persona: v.optional(v.string()),
    intent: v.optional(v.string()),
    emotion: v.optional(v.string()),
    
    // Quality signals
    qualityScore: v.number(), // 1-5 rating
    violationTypes: v.optional(v.array(v.string())), // For bad examples
    exemplaryTraits: v.optional(v.array(v.string())), // For good examples
    
    // Source tracking
    sourceType: v.string(), // admin_curated | user_correction | auto_promoted
    sourceCorrectionId: v.optional(v.id("corrections")), // If from correction
    curatedBy: v.optional(v.string()), // Admin deviceId if manually curated
    
    // Usage tracking
    usageCount: v.number(), // Times used in prompts
    lastUsedAt: v.optional(v.number()),
    
    // Status
    isActive: v.boolean(),
    isVerified: v.boolean(), // Admin has verified quality
    tags: v.array(v.string()),
    
    createdAt: v.number(),
    updatedAt: v.number(),
    embedding: v.optional(v.array(v.float64())), // For semantic retrieval
  })
    .index("by_exampleType", ["exampleType"])
    .index("by_ecosystem_channel", ["ecosystem", "channel"])
    .index("by_qualityScore", ["qualityScore"])
    .index("by_isActive", ["isActive"])
    .index("by_isVerified", ["isVerified"])
    .index("by_sourceType", ["sourceType"])
    .vectorIndex("by_example_embedding", {
      vectorField: "embedding",
      dimensions: 384,
      filterFields: ["exampleType", "ecosystem", "channel", "isActive"],
    }),

  // ── User Learning Profiles ──────────────────────────────────────────
  // Aggregated learning preferences per user across sessions.
  // Enables personalization without storing PII.
  userLearningProfiles: defineTable({
    userId: v.id("users"),
    deviceId: v.string(),
    
    // Preference patterns (aggregated from corrections)
    preferredVoiceTraits: v.optional(v.array(v.object({
      trait: v.string(),
      preference: v.number(), // -1 to 1 (dislike to prefer)
      sampleSize: v.number(),
    }))),
    
    // Style preferences
    preferredWarmth: v.optional(v.number()), // 1-4 scale average
    preferredDetail: v.optional(v.number()), // 1-3 scale average
    preferredLanguage: v.optional(v.string()),
    
    // Behavioral patterns
    commonIntents: v.optional(v.array(v.object({
      intent: v.string(),
      frequency: v.number(),
    }))),
    commonEcosystems: v.optional(v.array(v.object({
      ecosystem: v.string(),
      frequency: v.number(),
    }))),
    
    // Correction patterns
    correctionFrequency: v.number(), // Corrections per 100 interactions
    topCorrectionReasons: v.optional(v.array(v.string())),
    avoidPatterns: v.optional(v.array(v.string())), // Learned from thumbs down
    
    // Engagement signals
    averageSessionLength: v.optional(v.number()), // In messages
    regenerationRate: v.optional(v.number()), // Regenerations per 100 messages
    copyRate: v.optional(v.number()), // Copies per 100 messages
    
    // Computed at aggregation time
    totalInteractions: v.number(),
    totalCorrections: v.number(),
    lastAggregatedAt: v.number(),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_deviceId", ["deviceId"])
    .index("by_correctionFrequency", ["correctionFrequency"])
    .index("by_lastAggregatedAt", ["lastAggregatedAt"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN ENFORCEMENT RULES
  // Rules that enforce content compliance based on token values
  // ═══════════════════════════════════════════════════════════════════════════
  tokenEnforcementRules: defineTable({
    // Token matching
    tokenKey: v.string(),           // e.g., "nudge.permission", "safety.level", "channel.type"
    tokenValue: v.string(),         // e.g., "blocked", "critical", "sms"
    
    // Rule definition
    ruleType: v.string(),           // "must_contain" | "must_not_contain" | "pattern_required" | "pattern_forbidden" | "max_length" | "min_empathy"
    patterns: v.array(v.string()),  // Regex patterns or keywords to check
    
    // Auto-fix configuration
    autoFixAction: v.optional(v.string()), // "remove" | "replace" | "add_disclaimer" | "truncate" | "rephrase"
    autoFixValue: v.optional(v.string()),  // Replacement text, disclaimer, or rephrase guidance
    
    // Rule metadata
    severity: v.string(),           // "error" | "warning" | "info"
    errorMessage: v.string(),       // Human-readable violation message
    category: v.optional(v.string()), // "safety" | "nudge" | "channel" | "emotion" | "signature" | "brand"
    
    // Status
    isActive: v.boolean(),
    priority: v.number(),           // Higher = checked first (allows rule override)
    
    // Audit
    createdBy: v.optional(v.string()), // deviceId of creator
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["tokenKey", "tokenValue"])
    .index("by_tokenKey", ["tokenKey"])
    .index("by_active", ["isActive"])
    .index("by_priority", ["priority"])
    .index("by_category", ["category"])
    .index("by_ruleType", ["ruleType"]),

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 6D: DYNAMIC GUIDELINES TABLES
  // Admin-editable guidelines that were previously hardcoded in TypeScript.
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Core Voice Traits ─────────────────────────────────────────────────────
  // Previously hardcoded in src/services/constitutional/coreRules.ts
  // Each trait defines a characteristic of Jio's brand voice.
  coreVoiceTraits: defineTable({
    traitKey: v.string(),           // e.g., "direct", "helpful", "human_optimized"
    name: v.string(),               // Display name: "Direct", "Helpful"
    description: v.string(),        // What this trait means
    violations: v.array(v.string()), // Examples of violations
    positiveExamples: v.optional(v.array(v.string())), // Good examples
    ecosystem: v.optional(v.string()), // Optional ecosystem-specific trait
    channel: v.optional(v.string()),   // Optional channel-specific trait
    priority: v.number(),           // Order in validation (lower = first)
    isActive: v.boolean(),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_traitKey", ["traitKey"])
    .index("by_isActive", ["isActive"])
    .index("by_ecosystem", ["ecosystem"])
    .index("by_ecosystem_channel", ["ecosystem", "channel"])
    .index("by_priority", ["priority"]),

  // ── Brand Guardrails ──────────────────────────────────────────────────────
  // Previously hardcoded in src/config/brandGuardrails.ts
  // Rules that protect brand consistency and compliance.
  brandGuardrails: defineTable({
    ruleKey: v.string(),            // Unique identifier for the rule
    ruleName: v.string(),           // Human-readable name
    ruleType: v.string(),           // "must_include" | "must_avoid" | "format" | "tone" | "legal"
    rule: v.string(),               // The actual rule statement
    examples: v.array(v.string()),  // Examples of violations or correct usage
    ecosystem: v.optional(v.string()), // Optional ecosystem scope (null = all)
    channel: v.optional(v.string()),   // Optional channel scope (null = all)
    severity: v.string(),           // "error" | "warning" | "info"
    autoFixSuggestion: v.optional(v.string()), // Suggested fix for violations
    isActive: v.boolean(),
    priority: v.number(),           // Order of application (higher = more important)
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ruleKey", ["ruleKey"])
    .index("by_ruleType", ["ruleType"])
    .index("by_isActive", ["isActive"])
    .index("by_ecosystem", ["ecosystem"])
    .index("by_ecosystem_channel", ["ecosystem", "channel"])
    .index("by_severity", ["severity"])
    .index("by_priority", ["priority"]),

  // ── Safety Keywords ───────────────────────────────────────────────────────
  // Previously hardcoded in src/services/safety/safetyClassifier.ts
  // Keywords and patterns that trigger safety classification.
  safetyKeywords: defineTable({
    domain: v.string(),             // "crisis" | "legal" | "medical" | "financial" | "security" | "harassment"
    domainDisplayName: v.string(),  // Human-readable domain name
    keywords: v.array(v.string()),  // Exact match keywords
    patterns: v.array(v.string()),  // Regex patterns
    severity: v.string(),           // "critical" | "high" | "medium" | "low"
    responseType: v.string(),       // "emergency_response" | "safe_response" | "escalate" | "flag"
    emergencyTemplate: v.optional(v.string()), // Template for emergency responses
    requiresHuman: v.boolean(),     // Whether to escalate to human support
    isActive: v.boolean(),
    notes: v.optional(v.string()),  // Admin notes about this domain
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_domain", ["domain"])
    .index("by_isActive", ["isActive"])
    .index("by_severity", ["severity"])
    .index("by_responseType", ["responseType"]),

  // ── Pipeline Metrics ──────────────────────────────────────────────────────
  // Phase 6E: Server-side pipeline execution metrics for analysis.
  pipelineMetrics: defineTable({
    requestId: v.string(),          // Unique request identifier
    inputHash: v.string(),          // Hash of input for deduplication analysis
    
    // Request context
    ecosystem: v.string(),
    channel: v.string(),
    pipelinePath: v.string(),       // "content_generation" | "general_chat" | "jio_inquiry" | "safety_blocked"
    model: v.string(),              // LLM model used
    
    // Timing metrics
    totalMs: v.number(),            // Total pipeline duration
    stepTimings: v.optional(v.object({
      classify: v.optional(v.number()),
      safety: v.optional(v.number()),
      retrieve: v.optional(v.number()),
      assemble: v.optional(v.number()),
      generate: v.optional(v.number()),
      validate: v.optional(v.number()),
      finalize: v.optional(v.number()),
    })),
    
    // Results
    retrievalCount: v.number(),     // Number of knowledge items retrieved
    validationScore: v.optional(v.number()), // Trust score (0-100)
    retryCount: v.number(),         // Number of retry attempts
    
    // Status
    success: v.boolean(),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    
    // Source
    source: v.string(),             // "client" | "server" - where pipeline ran
    vercelRegion: v.optional(v.string()), // Vercel edge region if server-side
    
    timestamp: v.number(),
  })
    .index("by_requestId", ["requestId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_ecosystem", ["ecosystem"])
    .index("by_pipelinePath", ["pipelinePath"])
    .index("by_model", ["model"])
    .index("by_success", ["success"])
    .index("by_source", ["source"]),
});
