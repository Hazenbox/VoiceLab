import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireKnowledgeEditor, requireAuthenticated } from "./_auth";
import { api } from "./_generated/api";

// ── Get knowledge items by type ──────────────────────────────────
// Note: Knowledge items are curated, typically <500 per type
const MAX_KNOWLEDGE_ITEMS_PER_TYPE = 500;

export const getByType = query({
  args: {
    type: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const activeOnly = args.activeOnly ?? true;

    if (activeOnly) {
      return await ctx.db
        .query("knowledgeItems")
        .withIndex("by_type_active", (q) =>
          q.eq("type", args.type).eq("isActive", true)
        )
        .take(MAX_KNOWLEDGE_ITEMS_PER_TYPE);
    }

    return await ctx.db
      .query("knowledgeItems")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .take(MAX_KNOWLEDGE_ITEMS_PER_TYPE);
  },
});

// ── Get relevant items for a generation context ──────────────────
// Metadata-based retrieval (Phase 2). Upgraded to vector search in Phase 4.
// Parallelized queries for better performance
export const getRelevantItems = query({
  args: {
    ecosystem: v.optional(v.string()),
    channel: v.optional(v.string()),
    types: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Parallelize queries for all types
    const itemsByType = await Promise.all(
      args.types.map(type =>
        ctx.db
          .query("knowledgeItems")
          .withIndex("by_type_active", (q) =>
            q.eq("type", type).eq("isActive", true)
          )
          .take(MAX_KNOWLEDGE_ITEMS_PER_TYPE)
      )
    );

    // Flatten and filter results
    const results = [];
    for (const items of itemsByType) {
      // Filter by ecosystem/channel if specified in metadata
      const filtered = items.filter((item) => {
        // Global items (no ecosystem/channel filter) always match
        if (!item.metadata.ecosystem && !item.metadata.channel) return true;

        // If ecosystem specified, must match
        if (
          args.ecosystem &&
          item.metadata.ecosystem &&
          item.metadata.ecosystem !== args.ecosystem
        )
          return false;

        // If channel specified, must match
        if (
          args.channel &&
          item.metadata.channel &&
          item.metadata.channel !== args.channel
        )
          return false;

        return true;
      });

      results.push(...filtered);
    }

    return results;
  },
});

// ── List all knowledge items (admin, paginated) ──────────────────
export const listAll = query({
  args: {
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;

    if (args.type) {
      return await ctx.db
        .query("knowledgeItems")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("knowledgeItems")
      .order("desc")
      .take(limit);
  },
});

// ── Create a knowledge item ──────────────────────────────────────
// PROTECTED: Requires knowledge editor role (leadership, product, ux_writer)
// P0-FIX: Now auto-generates embeddings after creation
export const createItem = mutation({
  args: {
    type: v.string(),
    category: v.string(),
    content: v.string(),
    metadata: v.object({
      ecosystem: v.optional(v.string()),
      channel: v.optional(v.string()),
      persona: v.optional(v.string()),
      severity: v.optional(v.string()),
      suggestion: v.optional(v.string()),
      source: v.optional(v.string()),
    }),
    tags: v.array(v.string()),
    isActive: v.boolean(),
    createdBy: v.optional(v.string()), // deviceId
  },
  handler: async (ctx, args) => {
    // Verify authorization
    await requireKnowledgeEditor(ctx, args.createdBy);

    const now = Date.now();
    const id = await ctx.db.insert("knowledgeItems", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    // P0-FIX: Auto-generate embedding for new item (scheduled action)
    // Only generate if item is active (embeddings are used for search)
    if (args.isActive) {
      await ctx.scheduler.runAfter(0, api.embeddings.generateEmbedding, {
        knowledgeItemId: id,
      });
    }

    return id;
  },
});

// ── Update a knowledge item ──────────────────────────────────────
// PROTECTED: Requires knowledge editor role (leadership, product, ux_writer)
// P0-FIX: Now invalidates/regenerates embeddings when content changes
export const updateItem = mutation({
  args: {
    id: v.id("knowledgeItems"),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        ecosystem: v.optional(v.string()),
        channel: v.optional(v.string()),
        persona: v.optional(v.string()),
        severity: v.optional(v.string()),
        suggestion: v.optional(v.string()),
        source: v.optional(v.string()),
      })
    ),
    tags: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
    updatedBy: v.optional(v.string()), // deviceId for authorization
  },
  handler: async (ctx, args) => {
    // Verify authorization
    await requireKnowledgeEditor(ctx, args.updatedBy);

    const { id, updatedBy, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = { updatedAt: Date.now() };

    // P0-FIX: Track if content or semantic-relevant fields changed
    const needsEmbeddingUpdate = 
      updates.content !== undefined ||
      updates.category !== undefined ||
      updates.tags !== undefined ||
      updates.metadata !== undefined;

    if (updates.content !== undefined) cleanUpdates.content = updates.content;
    if (updates.category !== undefined)
      cleanUpdates.category = updates.category;
    if (updates.metadata !== undefined)
      cleanUpdates.metadata = updates.metadata;
    if (updates.tags !== undefined) cleanUpdates.tags = updates.tags;
    if (updates.isActive !== undefined)
      cleanUpdates.isActive = updates.isActive;

    // P0-FIX: Clear existing embedding if content changed (will be regenerated)
    if (needsEmbeddingUpdate) {
      cleanUpdates.embedding = undefined;
    }

    await ctx.db.patch(id, cleanUpdates);

    // P0-FIX: Regenerate embedding if semantic-relevant fields changed
    // Only if item is/will be active
    const finalIsActive = updates.isActive ?? (await ctx.db.get(id))?.isActive;
    if (needsEmbeddingUpdate && finalIsActive) {
      await ctx.scheduler.runAfter(0, api.embeddings.generateEmbedding, {
        knowledgeItemId: id,
      });
    }
  },
});

// ── Toggle active status ─────────────────────────────────────────
// PROTECTED: Requires knowledge editor role
export const toggleActive = mutation({
  args: {
    id: v.id("knowledgeItems"),
    isActive: v.boolean(),
    updatedBy: v.optional(v.string()), // deviceId for authorization
  },
  handler: async (ctx, args) => {
    // Verify authorization
    await requireKnowledgeEditor(ctx, args.updatedBy);

    await ctx.db.patch(args.id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
  },
});

// ── Batch create items (for seeding) ─────────────────────────────
// PROTECTED: Requires knowledge editor role
// P0-FIX: Now auto-generates embeddings after batch creation
export const batchCreate = mutation({
  args: {
    items: v.array(
      v.object({
        type: v.string(),
        category: v.string(),
        content: v.string(),
        metadata: v.object({
          ecosystem: v.optional(v.string()),
          channel: v.optional(v.string()),
          persona: v.optional(v.string()),
          severity: v.optional(v.string()),
          suggestion: v.optional(v.string()),
          source: v.optional(v.string()),
        }),
        tags: v.array(v.string()),
        isActive: v.boolean(),
        createdBy: v.optional(v.string()),
      })
    ),
    createdBy: v.optional(v.string()), // deviceId for authorization
    skipEmbeddings: v.optional(v.boolean()), // Skip auto-embedding (use for large batches, run backfill separately)
  },
  handler: async (ctx, args) => {
    // Verify authorization
    await requireKnowledgeEditor(ctx, args.createdBy);

    const now = Date.now();
    // Parallelize inserts for better throughput
    const ids = await Promise.all(
      args.items.map(item => 
        ctx.db.insert("knowledgeItems", {
          ...item,
          createdAt: now,
          updatedAt: now,
        })
      )
    );

    // P0-FIX: Schedule embedding generation for active items
    // For large batches, use skipEmbeddings=true and run backfillEmbeddings separately
    if (!args.skipEmbeddings) {
      const activeIds = ids.filter((id, idx) => args.items[idx].isActive);
      // Schedule in batches to avoid overwhelming the scheduler
      // Max 10 concurrent embedding generations
      for (let i = 0; i < activeIds.length; i += 10) {
        const batch = activeIds.slice(i, i + 10);
        for (const id of batch) {
          await ctx.scheduler.runAfter(i * 100, api.embeddings.generateEmbedding, {
            knowledgeItemId: id,
          });
        }
      }
    }

    return ids;
  },
});

// ── Save approved content as an example ──────────────────────────
// PROTECTED: Requires authenticated user (any role can approve their own edits)
export const saveApprovedExample = mutation({
  args: {
    content: v.string(),
    ecosystem: v.string(),
    channel: v.string(),
    persona: v.optional(v.string()),
    trustScore: v.optional(v.number()),
    createdBy: v.optional(v.string()), // deviceId for authorization
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated (any role can save approved examples)
    await requireAuthenticated(ctx, args.createdBy);

    const now = Date.now();
    return await ctx.db.insert("knowledgeItems", {
      type: "approved_example",
      category: args.ecosystem,
      content: args.content,
      metadata: {
        ecosystem: args.ecosystem,
        channel: args.channel,
        persona: args.persona,
        source: "user_approved",
      },
      tags: [
        "approved_example",
        args.ecosystem,
        args.channel,
        "tier1",
        ...(args.persona ? [args.persona] : []),
      ],
      isActive: true,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ── Delete (soft) ────────────────────────────────────────────────
// PROTECTED: Requires knowledge editor role
export const softDelete = mutation({
  args: { 
    id: v.id("knowledgeItems"),
    deletedBy: v.optional(v.string()), // deviceId for authorization
  },
  handler: async (ctx, args) => {
    // Verify authorization
    await requireKnowledgeEditor(ctx, args.deletedBy);

    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// ── Get all knowledge for prompt injection (Phase 2) ─────────────
// Single query to fetch everything the prompt builder needs.
// Note: Each type is capped at 200 items for prompt - prevents token overflow
const MAX_KNOWLEDGE_FOR_PROMPT = 200;

export const getKnowledgeForPrompt = query({
  args: {
    ecosystem: v.optional(v.string()),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Fetch all types in parallel with limits
    const [avoidWords, preferredWords, autoFixRules, approvedExamples] =
      await Promise.all([
        ctx.db
          .query("knowledgeItems")
          .withIndex("by_type_active", (q) =>
            q.eq("type", "avoid_word").eq("isActive", true)
          )
          .take(MAX_KNOWLEDGE_FOR_PROMPT),
        ctx.db
          .query("knowledgeItems")
          .withIndex("by_type_active", (q) =>
            q.eq("type", "preferred_word").eq("isActive", true)
          )
          .take(MAX_KNOWLEDGE_FOR_PROMPT),
        ctx.db
          .query("knowledgeItems")
          .withIndex("by_type_active", (q) =>
            q.eq("type", "auto_fix").eq("isActive", true)
          )
          .take(MAX_KNOWLEDGE_FOR_PROMPT),
        ctx.db
          .query("knowledgeItems")
          .withIndex("by_type_active", (q) =>
            q.eq("type", "approved_example").eq("isActive", true)
          )
          .take(MAX_KNOWLEDGE_FOR_PROMPT),
      ]);

    // Filter examples by ecosystem/channel if specified
    const filteredExamples = approvedExamples.filter((item) => {
      if (!item.metadata.ecosystem && !item.metadata.channel) return true;
      if (
        args.ecosystem &&
        item.metadata.ecosystem &&
        item.metadata.ecosystem !== args.ecosystem
      )
        return false;
      if (
        args.channel &&
        item.metadata.channel &&
        item.metadata.channel !== args.channel
      )
        return false;
      return true;
    });

    return {
      avoidWords,
      preferredWords,
      autoFixRules,
      approvedExamples: filteredExamples,
    };
  },
});

// ── Count by type (admin) ────────────────────────────────────────
// Note: Knowledge items are relatively stable (seeded data), so a higher limit is acceptable
export const countByType = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10000; // Higher limit for knowledge items
    const all = await ctx.db.query("knowledgeItems").take(limit);
    const counts: Record<string, { total: number; active: number }> = {};
    for (const item of all) {
      if (!counts[item.type]) counts[item.type] = { total: 0, active: 0 };
      counts[item.type].total++;
      if (item.isActive) counts[item.type].active++;
    }
    return counts;
  },
});
