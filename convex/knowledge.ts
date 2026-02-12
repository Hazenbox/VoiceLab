import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ── Get knowledge items by type ──────────────────────────────────
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
        .collect();
    }

    return await ctx.db
      .query("knowledgeItems")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();
  },
});

// ── Get relevant items for a generation context ──────────────────
// Metadata-based retrieval (Phase 2). Upgraded to vector search in Phase 4.
export const getRelevantItems = query({
  args: {
    ecosystem: v.optional(v.string()),
    channel: v.optional(v.string()),
    types: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const type of args.types) {
      const items = await ctx.db
        .query("knowledgeItems")
        .withIndex("by_type_active", (q) =>
          q.eq("type", type).eq("isActive", true)
        )
        .collect();

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
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("knowledgeItems", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ── Update a knowledge item ──────────────────────────────────────
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
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = { updatedAt: Date.now() };

    if (updates.content !== undefined) cleanUpdates.content = updates.content;
    if (updates.category !== undefined)
      cleanUpdates.category = updates.category;
    if (updates.metadata !== undefined)
      cleanUpdates.metadata = updates.metadata;
    if (updates.tags !== undefined) cleanUpdates.tags = updates.tags;
    if (updates.isActive !== undefined)
      cleanUpdates.isActive = updates.isActive;

    await ctx.db.patch(id, cleanUpdates);
  },
});

// ── Toggle active status ─────────────────────────────────────────
export const toggleActive = mutation({
  args: {
    id: v.id("knowledgeItems"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
  },
});

// ── Batch create items (for seeding) ─────────────────────────────
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ids = [];
    for (const item of args.items) {
      const id = await ctx.db.insert("knowledgeItems", {
        ...item,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id);
    }
    return ids;
  },
});

// ── Save approved content as an example ──────────────────────────
export const saveApprovedExample = mutation({
  args: {
    content: v.string(),
    ecosystem: v.string(),
    channel: v.string(),
    persona: v.optional(v.string()),
    trustScore: v.optional(v.number()),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
export const softDelete = mutation({
  args: { id: v.id("knowledgeItems") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });
  },
});

// ── Get all knowledge for prompt injection (Phase 2) ─────────────
// Single query to fetch everything the prompt builder needs.
export const getKnowledgeForPrompt = query({
  args: {
    ecosystem: v.optional(v.string()),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Fetch all types in parallel
    const [avoidWords, preferredWords, autoFixRules, approvedExamples] =
      await Promise.all([
        ctx.db
          .query("knowledgeItems")
          .withIndex("by_type_active", (q) =>
            q.eq("type", "avoid_word").eq("isActive", true)
          )
          .collect(),
        ctx.db
          .query("knowledgeItems")
          .withIndex("by_type_active", (q) =>
            q.eq("type", "preferred_word").eq("isActive", true)
          )
          .collect(),
        ctx.db
          .query("knowledgeItems")
          .withIndex("by_type_active", (q) =>
            q.eq("type", "auto_fix").eq("isActive", true)
          )
          .collect(),
        ctx.db
          .query("knowledgeItems")
          .withIndex("by_type_active", (q) =>
            q.eq("type", "approved_example").eq("isActive", true)
          )
          .collect(),
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
