/**
 * HTTP Actions for Mac-ToneStudio Integration
 * 
 * PHASE 5: REST API endpoints for the native Mac app to interact with
 * the same Convex backend used by the web application.
 * 
 * These endpoints enable:
 * - User authentication/creation via deviceId
 * - Analytics event logging
 * - Knowledge base access
 * - Token enforcement rules retrieval
 * - Training examples access
 * 
 * Authentication: All endpoints require a deviceId header or body parameter.
 * The Mac app should store the deviceId in Keychain for persistence.
 * 
 * @module convex/http
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";

// ═══════════════════════════════════════════════════════════════════════════════
// CORS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Device-Id, Authorization",
  "Access-Control-Max-Age": "86400", // 24 hours
};

function corsResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message: string, status = 400) {
  return corsResponse({ error: message, success: false }, status);
}

function successResponse(data: unknown) {
  return corsResponse({ data, success: true }, 200);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract deviceId from request (header or body)
 */
async function getDeviceId(request: Request): Promise<string | null> {
  // First try header
  const headerDeviceId = request.headers.get("X-Device-Id");
  if (headerDeviceId) return headerDeviceId;
  
  // Then try body for POST requests
  if (request.method === "POST") {
    try {
      const body = await request.clone().json();
      return body.deviceId || null;
    } catch {
      return null;
    }
  }
  
  // Finally try URL params for GET requests
  const url = new URL(request.url);
  return url.searchParams.get("deviceId");
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/users/authenticate
 * 
 * Creates or updates a user based on deviceId.
 * Mac app should call this on launch.
 * 
 * Request body:
 * {
 *   deviceId: string,
 *   name: string,
 *   role: string,
 *   product: string
 * }
 */
const authenticateUser = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const { deviceId, name, role, product } = body;
    
    if (!deviceId) {
      return errorResponse("deviceId is required", 400);
    }
    
    // Create or update user
    const userId = await ctx.runMutation(api.users.createOrUpdate, {
      deviceId,
      name: name || "Mac User",
      role: role || "marketing",
      product: product || "JioMart",
    });
    
    return successResponse({ userId, deviceId });
  } catch (error) {
    console.error("[HTTP] authenticateUser error:", error);
    return errorResponse("Failed to authenticate user", 500);
  }
});

/**
 * POST /api/users/heartbeat
 * 
 * Updates user's last seen timestamp.
 * Mac app should call this periodically (every 5 minutes).
 */
const userHeartbeat = httpAction(async (ctx, request) => {
  try {
    const deviceId = await getDeviceId(request);
    if (!deviceId) {
      return errorResponse("deviceId is required", 400);
    }
    
    await ctx.runMutation(api.users.heartbeat, { deviceId });
    return successResponse({ timestamp: Date.now() });
  } catch (error) {
    console.error("[HTTP] userHeartbeat error:", error);
    return errorResponse("Failed to update heartbeat", 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/analytics/log
 * 
 * Log a single analytics event.
 * 
 * Request body:
 * {
 *   deviceId: string,
 *   eventType: string,
 *   ecosystem: string,
 *   channel: string,
 *   persona: string,
 *   ...optional fields
 * }
 */
const logAnalyticsEvent = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const { deviceId, eventType, ecosystem, channel, persona, ...rest } = body;
    
    if (!deviceId || !eventType || !ecosystem || !channel || !persona) {
      return errorResponse("Missing required fields: deviceId, eventType, ecosystem, channel, persona", 400);
    }
    
    await ctx.runMutation(api.analytics.logEvent, {
      deviceId,
      eventType,
      ecosystem,
      channel,
      persona,
      ...rest,
    });
    
    return successResponse({ logged: true, timestamp: Date.now() });
  } catch (error) {
    console.error("[HTTP] logAnalyticsEvent error:", error);
    return errorResponse("Failed to log analytics event", 500);
  }
});

/**
 * POST /api/analytics/batch
 * 
 * Log multiple analytics events at once.
 * Mac app can batch events when offline and send on reconnection.
 * 
 * Request body:
 * {
 *   events: Array<{
 *     deviceId: string,
 *     eventType: string,
 *     ecosystem: string,
 *     channel: string,
 *     persona: string,
 *     timestamp: number,
 *     ...optional fields
 *   }>
 * }
 */
const batchLogAnalyticsEvents = httpAction(async (ctx, request) => {
  try {
    const { events } = await request.json();
    
    if (!events || !Array.isArray(events) || events.length === 0) {
      return errorResponse("events array is required", 400);
    }
    
    if (events.length > 100) {
      return errorResponse("Maximum 100 events per batch", 400);
    }
    
    // Validate each event has required fields
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e.deviceId || !e.eventType || !e.ecosystem || !e.channel || !e.persona) {
        return errorResponse(`Event at index ${i} missing required fields`, 400);
      }
    }
    
    await ctx.runMutation(api.analytics.batchLogEvents, { events });
    
    return successResponse({ logged: events.length, timestamp: Date.now() });
  } catch (error) {
    console.error("[HTTP] batchLogAnalyticsEvents error:", error);
    return errorResponse("Failed to log analytics events", 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/knowledge
 * 
 * Get knowledge items for content generation prompt assembly.
 * 
 * Query params:
 * - ecosystem: string
 * - channel: string
 * - limit: number (optional, default 100)
 */
const getKnowledge = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const ecosystem = url.searchParams.get("ecosystem");
    const channel = url.searchParams.get("channel");
    const limitStr = url.searchParams.get("limit");
    const limit = limitStr ? parseInt(limitStr, 10) : 100;
    
    if (!ecosystem || !channel) {
      return errorResponse("ecosystem and channel query params are required", 400);
    }
    
    const knowledge = await ctx.runQuery(api.knowledge.getKnowledgeForPrompt, {
      ecosystem,
      channel,
    });
    
    return successResponse(knowledge);
  } catch (error) {
    console.error("[HTTP] getKnowledge error:", error);
    return errorResponse("Failed to get knowledge", 500);
  }
});

/**
 * GET /api/knowledge/counts
 * 
 * Get counts of knowledge items by type.
 * Useful for caching decisions.
 */
const getKnowledgeCounts = httpAction(async (ctx, request) => {
  try {
    const counts = await ctx.runQuery(api.knowledge.countByType, {});
    return successResponse(counts);
  } catch (error) {
    console.error("[HTTP] getKnowledgeCounts error:", error);
    return errorResponse("Failed to get knowledge counts", 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN ENFORCEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/enforcement/rules
 * 
 * Get all active token enforcement rules.
 * Mac app should cache these locally and refresh periodically.
 */
const getEnforcementRules = httpAction(async (ctx, request) => {
  try {
    const rules = await ctx.runQuery(api.tokenEnforcement.getActive);
    return successResponse(rules);
  } catch (error) {
    console.error("[HTTP] getEnforcementRules error:", error);
    return errorResponse("Failed to get enforcement rules", 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRAINING EXAMPLES ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/examples
 * 
 * Get high-quality training examples for few-shot prompting.
 * 
 * Query params:
 * - ecosystem: string (optional)
 * - channel: string (optional)
 * - limit: number (optional, default 20)
 */
const getTrainingExamples = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const limitStr = url.searchParams.get("limit");
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    const minScoreStr = url.searchParams.get("minScore");
    const minScore = minScoreStr ? parseInt(minScoreStr, 10) : undefined;
    
    const examples = await ctx.runQuery(api.seedTrainingExamples.getHighQuality, {
      limit,
      minScore,
    });
    
    return successResponse(examples);
  } catch (error) {
    console.error("[HTTP] getTrainingExamples error:", error);
    return errorResponse("Failed to get training examples", 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CORRECTIONS/FEEDBACK ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/feedback
 * 
 * Submit user feedback on generated content.
 * 
 * Request body:
 * {
 *   deviceId: string,
 *   feedbackType: "thumbs_up" | "thumbs_down" | "edit" | "comment",
 *   messageContent: string,
 *   originalContent: string,
 *   editedContent?: string,
 *   comment?: string,
 *   reasons?: string[],
 *   ecosystem: string,
 *   channel: string,
 *   persona: string
 * }
 */
const submitFeedback = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const {
      deviceId,
      feedbackType,
      messageContent,
      originalContent,
      editedContent,
      comment,
      reasons,
      ecosystem,
      channel,
      persona,
      trustScore,
      generationContext,
    } = body;
    
    if (!deviceId || !feedbackType || !messageContent || !ecosystem || !channel || !persona) {
      return errorResponse("Missing required fields", 400);
    }
    
    const validTypes = ["thumbs_up", "thumbs_down", "edit", "comment"];
    if (!validTypes.includes(feedbackType)) {
      return errorResponse(`Invalid feedbackType. Must be one of: ${validTypes.join(", ")}`, 400);
    }
    
    // First, lookup the user by deviceId
    const user = await ctx.runQuery(api.users.getByDeviceId, { deviceId });
    if (!user) {
      return errorResponse("User not found. Please authenticate first.", 404);
    }
    
    await ctx.runMutation(api.corrections.create, {
      userId: user._id,
      deviceId,
      feedbackType,
      messageContent,
      originalContent: originalContent || messageContent,
      editedContent,
      comment,
      reasons,
      ecosystem,
      channel,
      persona,
      trustScore,
      generationContext,
    });
    
    return successResponse({ submitted: true, timestamp: Date.now() });
  } catch (error) {
    console.error("[HTTP] submitFeedback error:", error);
    return errorResponse("Failed to submit feedback", 500);
  }
});

/**
 * GET /api/corrections/learning
 * 
 * Get learning corrections (patterns learned from user feedback).
 * 
 * Query params:
 * - ecosystem: string
 * - channel: string
 * - limit: number (optional, default 50)
 */
const getLearningCorrections = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const ecosystem = url.searchParams.get("ecosystem");
    const channel = url.searchParams.get("channel");
    const limitStr = url.searchParams.get("limit");
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    
    if (!ecosystem || !channel) {
      return errorResponse("ecosystem and channel query params are required", 400);
    }
    
    const corrections = await ctx.runQuery(api.corrections.getLearningCorrections, {
      ecosystem,
      channel,
      limit,
    });
    
    return successResponse(corrections);
  } catch (error) {
    console.error("[HTTP] getLearningCorrections error:", error);
    return errorResponse("Failed to get learning corrections", 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECTIVE OVERRIDES ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/directives
 * 
 * Get directive overrides for a specific ecosystem/channel.
 * 
 * Query params:
 * - ecosystem: string
 * - channel: string
 */
const getDirectiveOverrides = httpAction(async (ctx, request) => {
  try {
    const url = new URL(request.url);
    const ecosystem = url.searchParams.get("ecosystem");
    const channel = url.searchParams.get("channel");
    
    if (!ecosystem || !channel) {
      return errorResponse("ecosystem and channel query params are required", 400);
    }
    
    const overrides = await ctx.runQuery(api.seedDirectiveOverrides.getByContext, {
      ecosystem,
      channel,
    });
    
    return successResponse(overrides);
  } catch (error) {
    console.error("[HTTP] getDirectiveOverrides error:", error);
    return errorResponse("Failed to get directive overrides", 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT REWRITE ENDPOINT (Mac ToneStudio)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/rewrite
 * 
 * Transform text into Jio's voice using AI (HuggingFace).
 * Used by Mac ToneStudio app.
 * 
 * The text is transformed using comprehensive Jio brand guidelines:
 * - 10 Brand Guardrails (Direct, Focused, Caring, etc.)
 * - Style Rules (sentence case, active voice, British spellings)
 * - Vocabulary Rules (simple alternatives, gender-neutral language, 8 avoid categories)
 * - Hard Limits (emotion-first, "we" language, no corporate filler, scope boundary, escalation, crisis)
 * - Ecosystem Awareness (15 ecosystems with tone adjustments)
 * - Emotion Detection (9 Navarasa emotions with response strategies)
 * - Jio Product Glossary (correct terminology)
 * - Post-processing (currency format, brand names, exclamation marks)
 * 
 * Request body:
 * {
 *   text: string,
 *   style?: string (deprecated, kept for backward compatibility)
 *   prompt?: string (custom transformation instructions or chat message)
 *   channel?: string (context: "editor", "chat", "sms", "email", etc.)
 *   ecosystem?: string (context: "connectivity", "home", "entertainment", etc.)
 *   isChat?: boolean (if true, enables intent detection for crisis/conversation/transform)
 * }
 */
const rewriteText = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    const { text, style, prompt, channel, ecosystem, isChat } = body;
    
    if (!text || typeof text !== "string") {
      return errorResponse("text is required", 400);
    }
    
    if (text.length < 3) {
      return errorResponse("text must be at least 3 characters", 400);
    }
    
    if (text.length > 50000) {
      return errorResponse("text must be less than 50000 characters", 400);
    }
    
    const result = await ctx.runAction(api.rewrite.rephrase, {
      text,
      style: style || "professional",
      prompt: prompt || undefined,
      channel: channel || "general",
      ecosystem: ecosystem || undefined,
      isChat: isChat ?? true, // Default to true for intent detection
    });
    
    return successResponse({ rewritten: result });
  } catch (error) {
    console.error("[HTTP] rewriteText error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(`Failed to rewrite text: ${message}`, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/health
 * 
 * Health check endpoint for monitoring.
 */
const healthCheck = httpAction(async (ctx, request) => {
  return successResponse({
    status: "healthy",
    timestamp: Date.now(),
    version: "1.0.0",
    endpoints: [
      "POST /api/users/authenticate",
      "POST /api/users/heartbeat",
      "POST /api/analytics/log",
      "POST /api/analytics/batch",
      "GET /api/knowledge",
      "GET /api/knowledge/counts",
      "GET /api/enforcement/rules",
      "GET /api/examples",
      "POST /api/feedback",
      "GET /api/corrections/learning",
      "GET /api/directives",
      "POST /api/rewrite",
    ],
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CORS PREFLIGHT HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

const corsPreflightHandler = httpAction(async (ctx, request) => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

const http = httpRouter();

// CORS preflight handler for all routes
http.route({
  pathPrefix: "/api/",
  method: "OPTIONS",
  handler: corsPreflightHandler,
});

// Health check
http.route({
  path: "/api/health",
  method: "GET",
  handler: healthCheck,
});

// User endpoints
http.route({
  path: "/api/users/authenticate",
  method: "POST",
  handler: authenticateUser,
});

http.route({
  path: "/api/users/heartbeat",
  method: "POST",
  handler: userHeartbeat,
});

// Analytics endpoints
http.route({
  path: "/api/analytics/log",
  method: "POST",
  handler: logAnalyticsEvent,
});

http.route({
  path: "/api/analytics/batch",
  method: "POST",
  handler: batchLogAnalyticsEvents,
});

// Knowledge endpoints
http.route({
  path: "/api/knowledge",
  method: "GET",
  handler: getKnowledge,
});

http.route({
  path: "/api/knowledge/counts",
  method: "GET",
  handler: getKnowledgeCounts,
});

// Token enforcement endpoints
http.route({
  path: "/api/enforcement/rules",
  method: "GET",
  handler: getEnforcementRules,
});

// Training examples endpoints
http.route({
  path: "/api/examples",
  method: "GET",
  handler: getTrainingExamples,
});

// Feedback endpoints
http.route({
  path: "/api/feedback",
  method: "POST",
  handler: submitFeedback,
});

http.route({
  path: "/api/corrections/learning",
  method: "GET",
  handler: getLearningCorrections,
});

// Directive overrides
http.route({
  path: "/api/directives",
  method: "GET",
  handler: getDirectiveOverrides,
});

// Text rewrite (Mac ToneStudio)
http.route({
  path: "/api/rewrite",
  method: "POST",
  handler: rewriteText,
});

export default http;
