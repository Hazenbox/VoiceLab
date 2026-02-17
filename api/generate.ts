/**
 * Generation Pipeline API Endpoint
 * 
 * POST /api/generate
 * 
 * Runs the full content generation pipeline server-side.
 * Supports both streaming (SSE) and non-streaming responses.
 * 
 * Query Parameters:
 * - stream=true: Enable Server-Sent Events streaming
 * 
 * Phase 6B: Server-side pipeline execution.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_cors';
import { handleRateLimit, RATE_LIMITS } from './_rateLimit';
import { handleApiAuth } from './_auth';
import { validateGenerateRequest, sendValidationError } from './_validation';
import { sendPipelineError, sendSSEError, getErrorCode, isRetryableError } from './_errors';
import { fetchAllPipelineData, createSemanticSearchFunction } from './_convex';
import { runPipelineServer } from '../src/services/pipeline/shared/serverRunner';
import type { ServerPipelineInput, SSEEvent } from '../src/services/pipeline/shared/types';

// Pipeline-specific rate limit (stricter than LLM-only)
const PIPELINE_RATE_LIMIT = { windowMs: 60 * 1000, maxRequests: 15 }; // 15 requests/minute

// Max duration for Vercel serverless (60s on Pro, 10s on Hobby)
export const config = {
  maxDuration: 60,
};

/**
 * Main handler for /api/generate
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (!handleCors(req, res)) return;
  
  // Verify API key authentication
  if (!handleApiAuth(req, res)) return;
  
  // Apply rate limiting
  if (!handleRateLimit(req, res, 'llm')) return;
  
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }
  
  // Check if streaming is requested
  const wantsStream = req.query.stream === 'true' || req.body?.input?.stream === true;
  
  // Create abort controller for this request
  const abortController = new AbortController();
  let isClientDisconnected = false;
  
  // Handle client disconnect
  req.on('close', () => {
    if (!res.writableEnded) {
      isClientDisconnected = true;
      abortController.abort(new Error('Client disconnected'));
      console.log('[API/generate] Client disconnected, aborting pipeline');
    }
  });
  
  try {
    // Validate request body
    const validation = validateGenerateRequest(req.body);
    if (!validation.valid) {
      return sendValidationError(res, validation.errors);
    }
    
    const input = req.body.input as ServerPipelineInput;
    
    // Generate request ID for tracing
    const requestId = generateRequestId();
    console.log(`[API/generate] Starting pipeline: ${requestId}`);
    
    // Fetch external data from Convex
    const externalData = await fetchAllPipelineData(
      input.ecosystem,
      input.contentChannel,
      input.userProfile?.deviceId
    );
    
    // Check if client disconnected during data fetch
    if (isClientDisconnected) {
      console.log(`[API/generate] Client disconnected during data fetch: ${requestId}`);
      return;
    }
    
    if (wantsStream) {
      await handleStreamingResponse(input, externalData, requestId, abortController, res);
    } else {
      await handleNonStreamingResponse(input, externalData, requestId, abortController, res);
    }
    
    console.log(`[API/generate] Completed pipeline: ${requestId}`);
    
  } catch (error) {
    if (isClientDisconnected) {
      console.log('[API/generate] Error after client disconnect, ignoring');
      return;
    }
    
    console.error('[API/generate] Pipeline error:', error);
    
    if (wantsStream && res.headersSent) {
      sendSSEError(res, error);
    } else {
      sendPipelineError(res, error);
    }
  }
}

/**
 * Handle streaming response using Server-Sent Events.
 */
async function handleStreamingResponse(
  input: ServerPipelineInput,
  externalData: Awaited<ReturnType<typeof fetchAllPipelineData>>,
  requestId: string,
  abortController: AbortController,
  res: VercelResponse
): Promise<void> {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.setHeader('X-Request-Id', requestId);
  
  // SSE event callback
  const onEvent = (event: SSEEvent) => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  
  // Run pipeline with streaming
  const result = await runPipelineServer(
    { ...input, requestId },
    externalData,
    {
      onEvent,
      abortSignal: abortController.signal,
      runSemanticSearch: createSemanticSearchFunction(),
    }
  );
  
  // Send final done marker
  if (!res.writableEnded) {
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

/**
 * Handle non-streaming response.
 */
async function handleNonStreamingResponse(
  input: ServerPipelineInput,
  externalData: Awaited<ReturnType<typeof fetchAllPipelineData>>,
  requestId: string,
  abortController: AbortController,
  res: VercelResponse
): Promise<void> {
  // Run pipeline without streaming
  const result = await runPipelineServer(
    { ...input, requestId },
    externalData,
    {
      abortSignal: abortController.signal,
      runSemanticSearch: createSemanticSearchFunction(),
    }
  );
  
  // Set response headers
  res.setHeader('X-Request-Id', requestId);
  
  if (!result.success) {
    const statusCode = result.errorCode ? getHttpStatusForErrorCode(result.errorCode) : 500;
    return res.status(statusCode).json({
      error: result.error || 'Pipeline failed',
      code: result.errorCode || 'PIPELINE_ERROR',
      retryable: result.errorCode ? isRetryableErrorCode(result.errorCode) : false,
    });
  }
  
  // Return successful result
  res.status(200).json({ result });
}

/**
 * Generate unique request ID.
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `gen_${timestamp}_${random}`;
}

/**
 * Map error code to HTTP status.
 */
function getHttpStatusForErrorCode(code: string): number {
  const statusMap: Record<string, number> = {
    RATE_LIMIT: 429,
    QUOTA_EXCEEDED: 429,
    INVALID_API_KEY: 401,
    PERMISSION_DENIED: 403,
    INVALID_REQUEST: 400,
    CONTEXT_LENGTH_EXCEEDED: 413,
    CONTENT_FILTER: 422,
    SERVER_ERROR: 500,
    TIMEOUT: 408,
    NETWORK_ERROR: 502,
    SERVICE_UNAVAILABLE: 503,
    OVERLOADED: 503,
  };
  return statusMap[code] || 500;
}

/**
 * Check if error code is retryable.
 */
function isRetryableErrorCode(code: string): boolean {
  const retryableCodes = ['RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE', 'OVERLOADED'];
  return retryableCodes.includes(code);
}
