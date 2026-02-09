/**
 * Embeddings & Vector Search for Knowledge Base (Phase 4)
 * 
 * Uses OpenAI text-embedding-3-small (1536 dimensions) to generate
 * embeddings for knowledge items, enabling semantic search.
 * 
 * Architecture:
 * - generateEmbedding: action → calls OpenAI, stores embedding
 * - backfillEmbeddings: action → batch-generates embeddings for items missing them
 * - semanticSearch: action → embeds query, runs vectorSearch, fetches docs
 * - fetchDocuments: internalQuery → loads documents by IDs (for action → query bridge)
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ── OpenAI Embedding Helper ──────────────────────────────────────

async function getOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI embedding API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// ── Generate Embedding for a Single Item ─────────────────────────

export const generateEmbedding = action({
  args: {
    knowledgeItemId: v.id("knowledgeItems"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    // Fetch the item
    const item = await ctx.runQuery(internal.embeddings.getItem, {
      id: args.knowledgeItemId,
    });
    if (!item) {
      throw new Error(`Knowledge item ${args.knowledgeItemId} not found`);
    }

    // Build text for embedding: combine type, category, content, and tags
    const embeddingText = buildEmbeddingText(item);

    // Generate embedding
    const embedding = await getOpenAIEmbedding(embeddingText, apiKey);

    // Store embedding
    await ctx.runMutation(internal.embeddings.storeEmbedding, {
      id: args.knowledgeItemId,
      embedding,
    });

    return { success: true, dimensions: embedding.length };
  },
});

// ── Backfill Embeddings for All Items Missing Them ───────────────

export const backfillEmbeddings = action({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const batchSize = args.batchSize ?? 50;

    // Fetch items without embeddings
    const items = await ctx.runQuery(internal.embeddings.getItemsWithoutEmbeddings, {
      limit: batchSize,
    });

    if (items.length === 0) {
      return { processed: 0, message: "All items already have embeddings" };
    }

    let processed = 0;
    let errors = 0;

    for (const item of items) {
      try {
        const embeddingText = buildEmbeddingText(item);
        const embedding = await getOpenAIEmbedding(embeddingText, apiKey);

        await ctx.runMutation(internal.embeddings.storeEmbedding, {
          id: item._id,
          embedding,
        });

        processed++;

        // Rate limit: ~3000 RPM for text-embedding-3-small
        // Add small delay every 20 items to stay safe
        if (processed % 20 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Failed to embed item ${item._id}:`, error);
        errors++;
      }
    }

    return {
      processed,
      errors,
      remaining: items.length - processed,
      message: `Embedded ${processed}/${items.length} items (${errors} errors)`,
    };
  },
});

// ── Semantic Search ──────────────────────────────────────────────

export const semanticSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    filterType: v.optional(v.string()),
    filterActiveOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }

    const limit = args.limit ?? 10;

    // 1. Generate embedding for the search query
    const queryEmbedding = await getOpenAIEmbedding(args.query, apiKey);

    // 2. Build filter
    type FilterExpression = {
      eq: (field: string, value: string | boolean) => FilterExpression;
      or: (...exprs: FilterExpression[]) => FilterExpression;
    };

    let filter: ((q: FilterExpression) => FilterExpression) | undefined;

    if (args.filterType && args.filterActiveOnly !== false) {
      filter = (q: FilterExpression) =>
        q.or(
          q.eq("type", args.filterType!),
          q.eq("isActive", true)
        );
    } else if (args.filterType) {
      filter = (q: FilterExpression) => q.eq("type", args.filterType!);
    } else if (args.filterActiveOnly !== false) {
      filter = (q: FilterExpression) => q.eq("isActive", true);
    }

    // 3. Run vector search
    const searchResults = await ctx.vectorSearch(
      "knowledgeItems",
      "by_embedding",
      {
        vector: queryEmbedding,
        limit,
        ...(filter ? { filter } : {}),
      },
    );

    if (searchResults.length === 0) {
      return [];
    }

    // 4. Fetch full documents
    const documents = await ctx.runQuery(internal.embeddings.fetchDocumentsByIds, {
      ids: searchResults.map((r) => r._id),
    });

    // 5. Combine with scores
    return searchResults.map((result) => {
      const doc = documents.find((d) => d?._id === result._id);
      return {
        ...doc,
        _score: result._score,
      };
    }).filter((r) => r._id); // Filter out any not-found docs
  },
});

// ── Internal Helpers ─────────────────────────────────────────────

// Get a single knowledge item by ID
export const getItem = internalQuery({
  args: { id: v.id("knowledgeItems") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get items that don't have embeddings yet
export const getItemsWithoutEmbeddings = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    // Fetch all active items and filter for missing embeddings
    const items = await ctx.db
      .query("knowledgeItems")
      .order("asc")
      .collect();

    return items
      .filter((item) => item.isActive && !item.embedding)
      .slice(0, args.limit);
  },
});

// Store an embedding on a knowledge item
export const storeEmbedding = internalMutation({
  args: {
    id: v.id("knowledgeItems"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      embedding: args.embedding,
      updatedAt: Date.now(),
    });
  },
});

// Fetch documents by array of IDs (bridge from action to query)
export const fetchDocumentsByIds = internalQuery({
  args: { ids: v.array(v.id("knowledgeItems")) },
  handler: async (ctx, args) => {
    const results = [];
    for (const id of args.ids) {
      const doc = await ctx.db.get(id);
      if (doc) {
        // Exclude the embedding field from results (it's large and not needed)
        const { embedding: _embedding, ...rest } = doc;
        results.push(rest);
      }
    }
    return results;
  },
});

// ── Text Builder for Embeddings ──────────────────────────────────

interface EmbeddableItem {
  type: string;
  category: string;
  content: string;
  tags: string[];
  metadata: {
    ecosystem?: string;
    channel?: string;
    severity?: string;
    suggestion?: string;
  };
}

function buildEmbeddingText(item: EmbeddableItem): string {
  const parts = [
    `Type: ${item.type}`,
    `Category: ${item.category}`,
    `Content: ${item.content}`,
  ];

  if (item.metadata.suggestion) {
    parts.push(`Suggestion: ${item.metadata.suggestion}`);
  }
  if (item.metadata.ecosystem) {
    parts.push(`Ecosystem: ${item.metadata.ecosystem}`);
  }
  if (item.metadata.severity) {
    parts.push(`Severity: ${item.metadata.severity}`);
  }
  if (item.tags.length > 0) {
    parts.push(`Tags: ${item.tags.join(", ")}`);
  }

  return parts.join(". ");
}
