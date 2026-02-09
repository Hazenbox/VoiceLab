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
  analyticsEvents: defineTable({
    userId: v.id("users"),
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
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_ecosystem", ["ecosystem"])
    .index("by_userId", ["userId"])
    .index("by_eventType", ["eventType"])
    .index("by_persona", ["persona"]),

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
});
