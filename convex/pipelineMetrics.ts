import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Pipeline Metrics API
 * 
 * Phase 6E: Server-side pipeline execution metrics.
 * Tracks performance, errors, and usage patterns for the generation pipeline.
 */

/**
 * Log a pipeline execution metric.
 */
export const logMetric = mutation({
  args: {
    requestId: v.string(),
    inputHash: v.string(),
    ecosystem: v.string(),
    channel: v.string(),
    pipelinePath: v.string(),
    model: v.string(),
    totalMs: v.number(),
    stepTimings: v.optional(v.object({
      classify: v.optional(v.number()),
      safety: v.optional(v.number()),
      retrieve: v.optional(v.number()),
      assemble: v.optional(v.number()),
      generate: v.optional(v.number()),
      validate: v.optional(v.number()),
      finalize: v.optional(v.number()),
    })),
    retrievalCount: v.number(),
    validationScore: v.optional(v.number()),
    retryCount: v.number(),
    success: v.boolean(),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    source: v.string(),
    vercelRegion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("pipelineMetrics", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

/**
 * Get pipeline metrics for a time range.
 */
export const getMetrics = query({
  args: {
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const endTime = args.endTime ?? Date.now();
    const startTime = args.startTime ?? endTime - 24 * 60 * 60 * 1000; // Default: last 24h
    
    return ctx.db
      .query("pipelineMetrics")
      .withIndex("by_timestamp")
      .filter((q) => 
        q.and(
          q.gte(q.field("timestamp"), startTime),
          q.lte(q.field("timestamp"), endTime)
        )
      )
      .order("desc")
      .take(limit);
  },
});

/**
 * Get aggregated pipeline statistics.
 */
export const getStats = query({
  args: {
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const endTime = args.endTime ?? Date.now();
    const startTime = args.startTime ?? endTime - 24 * 60 * 60 * 1000; // Default: last 24h
    
    const metrics = await ctx.db
      .query("pipelineMetrics")
      .withIndex("by_timestamp")
      .filter((q) => 
        q.and(
          q.gte(q.field("timestamp"), startTime),
          q.lte(q.field("timestamp"), endTime)
        )
      )
      .collect();
    
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        bySource: {},
        byPath: {},
        byModel: {},
        errorsByCode: {},
      };
    }
    
    // Calculate statistics
    const successful = metrics.filter(m => m.success);
    const latencies = metrics.map(m => m.totalMs).sort((a, b) => a - b);
    
    // Group by source
    const bySource: Record<string, number> = {};
    metrics.forEach(m => {
      bySource[m.source] = (bySource[m.source] || 0) + 1;
    });
    
    // Group by pipeline path
    const byPath: Record<string, number> = {};
    metrics.forEach(m => {
      byPath[m.pipelinePath] = (byPath[m.pipelinePath] || 0) + 1;
    });
    
    // Group by model
    const byModel: Record<string, number> = {};
    metrics.forEach(m => {
      byModel[m.model] = (byModel[m.model] || 0) + 1;
    });
    
    // Group errors by code
    const errorsByCode: Record<string, number> = {};
    metrics
      .filter(m => !m.success && m.errorCode)
      .forEach(m => {
        errorsByCode[m.errorCode!] = (errorsByCode[m.errorCode!] || 0) + 1;
      });
    
    return {
      totalRequests: metrics.length,
      successRate: successful.length / metrics.length,
      averageLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p50Latency: latencies[Math.floor(latencies.length * 0.5)],
      p95Latency: latencies[Math.floor(latencies.length * 0.95)],
      p99Latency: latencies[Math.floor(latencies.length * 0.99)],
      bySource,
      byPath,
      byModel,
      errorsByCode,
    };
  },
});

/**
 * Get metrics for a specific request (for debugging).
 */
export const getMetricByRequestId = query({
  args: { requestId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("pipelineMetrics")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .first();
  },
});

/**
 * Get slow requests (for performance analysis).
 */
export const getSlowRequests = query({
  args: {
    thresholdMs: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    
    // Get recent metrics and filter for slow ones
    const recentMetrics = await ctx.db
      .query("pipelineMetrics")
      .withIndex("by_timestamp")
      .order("desc")
      .take(1000);
    
    return recentMetrics
      .filter(m => m.totalMs > args.thresholdMs)
      .slice(0, limit);
  },
});

/**
 * Get error rate over time (for dashboards).
 */
export const getErrorRateOverTime = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
    bucketSizeMs: v.number(), // e.g., 3600000 for hourly buckets
  },
  handler: async (ctx, args) => {
    const metrics = await ctx.db
      .query("pipelineMetrics")
      .withIndex("by_timestamp")
      .filter((q) => 
        q.and(
          q.gte(q.field("timestamp"), args.startTime),
          q.lte(q.field("timestamp"), args.endTime)
        )
      )
      .collect();
    
    // Group by time bucket
    const buckets: Record<number, { total: number; errors: number }> = {};
    
    metrics.forEach(m => {
      const bucket = Math.floor(m.timestamp / args.bucketSizeMs) * args.bucketSizeMs;
      if (!buckets[bucket]) {
        buckets[bucket] = { total: 0, errors: 0 };
      }
      buckets[bucket].total++;
      if (!m.success) {
        buckets[bucket].errors++;
      }
    });
    
    return Object.entries(buckets)
      .map(([bucket, data]) => ({
        timestamp: parseInt(bucket),
        total: data.total,
        errors: data.errors,
        errorRate: data.errors / data.total,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  },
});
