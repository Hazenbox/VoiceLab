/**
 * Embeddings & Vector Search for Knowledge Base (Phase 4)
 * 
 * Uses Hugging Face Inference API with sentence-transformers/all-MiniLM-L6-v2
 * (384 dimensions) to generate embeddings for knowledge items.
 * 
 * Architecture:
 * - generateEmbedding: action → calls HuggingFace, stores embedding
 * - backfillEmbeddings: action → batch-generates embeddings for items missing them
 * - semanticSearch: action → embeds query, runs vectorSearch, fetches docs
 * - fetchDocuments: internalQuery → loads documents by IDs (for action → query bridge)
 * 
 * Setup:
 * - Set HUGGINGFACE_API_KEY in Convex dashboard env vars
 * - Model: sentence-transformers/all-MiniLM-L6-v2 (384 dims, free tier)
 */

import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// ── Configuration ────────────────────────────────────────────────

const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const HF_API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;
const EXPECTED_DIMENSIONS = 384;

// ── Hugging Face Embedding Helper ────────────────────────────────

async function getHuggingFaceEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: text,
      options: { wait_for_model: true },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    // HF free tier may return 503 when model is loading
    if (response.status === 503) {
      throw new Error(
        `Model is loading on Hugging Face. Retry in a few seconds. (${errorBody})`
      );
    }
    throw new Error(
      `Hugging Face API error (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();

  // HF feature-extraction returns a nested array: [[...384 floats...]]
  // For a single input, we get the first (and only) result
  let embedding: number[];
  if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === "number") {
    embedding = data[0];
  } else if (Array.isArray(data) && typeof data[0] === "number") {
    // Some models return a flat array directly
    embedding = data;
  } else {
    throw new Error(
      `Unexpected embedding response shape: ${JSON.stringify(data).slice(0, 200)}`
    );
  }

  if (embedding.length !== EXPECTED_DIMENSIONS) {
    throw new Error(
      `Expected ${EXPECTED_DIMENSIONS} dimensions, got ${embedding.length}`
    );
  }

  return embedding;
}

/**
 * Batch embed multiple texts in one API call (HF supports this).
 */
async function getHuggingFaceBatchEmbeddings(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: texts,
      options: { wait_for_model: true },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 503) {
      throw new Error(
        `Model is loading on Hugging Face. Retry in a few seconds. (${errorBody})`
      );
    }
    throw new Error(
      `Hugging Face API error (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();

  // HF returns [[...384...], [...384...], ...] for batch input
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error(
      `Unexpected batch response shape: ${JSON.stringify(data).slice(0, 200)}`
    );
  }

  return data as number[][];
}

// ── Generate Embedding for a Single Item ─────────────────────────

export const generateEmbedding = action({
  args: {
    knowledgeItemId: v.id("knowledgeItems"),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "HUGGINGFACE_API_KEY environment variable is not set in Convex dashboard"
      );
    }

    // Fetch the item
    const item = await ctx.runQuery(internal.embeddings.getItem, {
      id: args.knowledgeItemId,
    });
    if (!item) {
      throw new Error(`Knowledge item ${args.knowledgeItemId} not found`);
    }

    // Build text for embedding
    const embeddingText = buildEmbeddingText(item);

    // Generate embedding via Hugging Face
    const embedding = await getHuggingFaceEmbedding(embeddingText, apiKey);

    // Store embedding
    await ctx.runMutation(internal.embeddings.storeEmbedding, {
      id: args.knowledgeItemId,
      embedding,
    });

    return { success: true, dimensions: embedding.length, model: HF_MODEL };
  },
});

// ── Backfill Embeddings for All Items Missing Them ───────────────

export const backfillEmbeddings = action({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "HUGGINGFACE_API_KEY environment variable is not set in Convex dashboard"
      );
    }

    const batchSize = args.batchSize ?? 50;

    // Fetch items without embeddings
    const items = await ctx.runQuery(
      internal.embeddings.getItemsWithoutEmbeddings,
      { limit: batchSize }
    );

    if (items.length === 0) {
      return { processed: 0, message: "All items already have embeddings" };
    }

    let processed = 0;
    let errors = 0;

    // Process in mini-batches of 10 (HF handles batch inputs well)
    const miniBatchSize = 10;
    for (let i = 0; i < items.length; i += miniBatchSize) {
      const batch = items.slice(i, i + miniBatchSize);
      const texts = batch.map((item) => buildEmbeddingText(item));

      try {
        const embeddings = await getHuggingFaceBatchEmbeddings(texts, apiKey);

        for (let j = 0; j < batch.length; j++) {
          try {
            await ctx.runMutation(internal.embeddings.storeEmbedding, {
              id: batch[j]._id,
              embedding: embeddings[j],
            });
            processed++;
          } catch (storeErr) {
            console.error(`Failed to store embedding for ${batch[j]._id}:`, storeErr);
            errors++;
          }
        }

        // Small delay between mini-batches to respect rate limits
        if (i + miniBatchSize < items.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (batchErr) {
        console.error(`Batch embedding failed for items ${i}-${i + batch.length}:`, batchErr);
        errors += batch.length;

        // If model is loading, wait and retry once
        if (String(batchErr).includes("loading")) {
          console.log("Model loading, waiting 5s before retry...");
          await new Promise((resolve) => setTimeout(resolve, 5000));

          try {
            const embeddings = await getHuggingFaceBatchEmbeddings(texts, apiKey);
            for (let j = 0; j < batch.length; j++) {
              await ctx.runMutation(internal.embeddings.storeEmbedding, {
                id: batch[j]._id,
                embedding: embeddings[j],
              });
              processed++;
              errors--; // Undo the error count
            }
          } catch {
            console.error("Retry also failed, skipping batch.");
          }
        }
      }
    }

    return {
      processed,
      errors,
      remaining: items.length - processed,
      model: HF_MODEL,
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
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "HUGGINGFACE_API_KEY environment variable is not set in Convex dashboard"
      );
    }

    const limit = args.limit ?? 10;

    // 1. Generate embedding for the search query via Hugging Face
    const queryEmbedding = await getHuggingFaceEmbedding(args.query, apiKey);

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
    const documents = await ctx.runQuery(
      internal.embeddings.fetchDocumentsByIds,
      { ids: searchResults.map((r) => r._id) }
    );

    // 5. Combine with scores
    return searchResults
      .map((result) => {
        const doc = documents.find((d) => d?._id === result._id);
        return {
          ...doc,
          _score: result._score,
        };
      })
      .filter((r) => r._id); // Filter out any not-found docs
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
