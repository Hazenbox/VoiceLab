/**
 * Error Handling for API Routes
 * 
 * Maps LLMError codes to HTTP status codes and provides
 * standardized error responses for the /api/generate endpoint.
 * 
 * Phase 6B: Error handling for server-side pipeline.
 */

import type { VercelResponse } from '@vercel/node';
import { ERROR_CODES } from '../src/services/providers/llm/types.js';

/**
 * Map LLMError codes to HTTP status codes.
 */
export const ERROR_TO_HTTP_STATUS: Record<string, number> = {
  // Rate limiting -> 429 Too Many Requests
  [ERROR_CODES.RATE_LIMIT]: 429,
  [ERROR_CODES.QUOTA_EXCEEDED]: 429,
  
  // Authentication -> 401/403
  [ERROR_CODES.INVALID_API_KEY]: 401,
  [ERROR_CODES.PERMISSION_DENIED]: 403,
  
  // Client errors -> 4xx
  [ERROR_CODES.INVALID_REQUEST]: 400,
  [ERROR_CODES.CONTEXT_LENGTH_EXCEEDED]: 413, // Payload Too Large
  [ERROR_CODES.CONTENT_FILTER]: 422, // Unprocessable Entity
  
  // Server errors -> 5xx
  [ERROR_CODES.SERVER_ERROR]: 500,
  [ERROR_CODES.TIMEOUT]: 408, // Request Timeout (or 504 Gateway Timeout)
  [ERROR_CODES.NETWORK_ERROR]: 502, // Bad Gateway
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [ERROR_CODES.OVERLOADED]: 503,
};

/**
 * Map error codes to user-friendly messages.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
  [ERROR_CODES.QUOTA_EXCEEDED]: 'API quota exceeded. Please try again later.',
  [ERROR_CODES.INVALID_API_KEY]: 'Invalid API key. Please check your configuration.',
  [ERROR_CODES.PERMISSION_DENIED]: 'Permission denied. You do not have access to this resource.',
  [ERROR_CODES.INVALID_REQUEST]: 'Invalid request. Please check your input.',
  [ERROR_CODES.CONTEXT_LENGTH_EXCEEDED]: 'Input too long. Please reduce the message length.',
  [ERROR_CODES.CONTENT_FILTER]: 'Content was filtered for safety reasons.',
  [ERROR_CODES.SERVER_ERROR]: 'An unexpected error occurred. Please try again.',
  [ERROR_CODES.TIMEOUT]: 'Request timed out. Please try again.',
  [ERROR_CODES.NETWORK_ERROR]: 'Network error. Please check your connection.',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again later.',
  [ERROR_CODES.OVERLOADED]: 'Service is currently overloaded. Please try again later.',
};

/**
 * Check if an error code is retryable.
 */
export const RETRYABLE_ERRORS: Set<string> = new Set([
  ERROR_CODES.RATE_LIMIT,
  ERROR_CODES.TIMEOUT,
  ERROR_CODES.NETWORK_ERROR,
  ERROR_CODES.SERVICE_UNAVAILABLE,
  ERROR_CODES.OVERLOADED,
]);

export interface APIError {
  error: string;
  code: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

/**
 * Get HTTP status code for an error.
 */
export function getHttpStatusForError(error: unknown): number {
  const errorCode = getErrorCode(error);
  return ERROR_TO_HTTP_STATUS[errorCode] || 500;
}

/**
 * Extract error code from various error types.
 */
export function getErrorCode(error: unknown): string {
  // Check for LLMError structure
  const llmError = error as { code?: string };
  if (llmError.code && typeof llmError.code === 'string') {
    return llmError.code;
  }
  
  // Check for abort error
  if (error instanceof Error && error.name === 'AbortError') {
    return ERROR_CODES.TIMEOUT;
  }
  
  // Try to detect error type from message
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  
  if (message.includes('timeout')) return ERROR_CODES.TIMEOUT;
  if (message.includes('rate limit') || message.includes('too many')) return ERROR_CODES.RATE_LIMIT;
  if (message.includes('unauthorized') || message.includes('api key')) return ERROR_CODES.INVALID_API_KEY;
  if (message.includes('forbidden') || message.includes('permission')) return ERROR_CODES.PERMISSION_DENIED;
  if (message.includes('context') && message.includes('length')) return ERROR_CODES.CONTEXT_LENGTH_EXCEEDED;
  if (message.includes('filter') || message.includes('safety')) return ERROR_CODES.CONTENT_FILTER;
  if (message.includes('network') || message.includes('connection')) return ERROR_CODES.NETWORK_ERROR;
  if (message.includes('unavailable')) return ERROR_CODES.SERVICE_UNAVAILABLE;
  if (message.includes('overloaded')) return ERROR_CODES.OVERLOADED;
  
  return ERROR_CODES.SERVER_ERROR;
}

/**
 * Check if an error is retryable.
 */
export function isRetryableError(error: unknown): boolean {
  // Check for explicit retryable flag
  const llmError = error as { retryable?: boolean };
  if (typeof llmError.retryable === 'boolean') {
    return llmError.retryable;
  }
  
  const code = getErrorCode(error);
  return RETRYABLE_ERRORS.has(code);
}

/**
 * Create a standardized API error response.
 */
export function createAPIError(error: unknown, includeDetails: boolean = false): APIError {
  const code = getErrorCode(error);
  const userMessage = ERROR_MESSAGES[code] || 'An unexpected error occurred.';
  
  const apiError: APIError = {
    error: userMessage,
    code,
    retryable: isRetryableError(error),
  };
  
  // Include details in non-production for debugging
  if (includeDetails && error instanceof Error) {
    apiError.details = {
      message: error.message,
      name: error.name,
    };
  }
  
  return apiError;
}

/**
 * Send an error response to the client.
 */
export function sendErrorResponse(
  res: VercelResponse,
  error: unknown,
  options?: {
    /** Override the HTTP status code */
    statusCode?: number;
    /** Include error details (for debugging) */
    includeDetails?: boolean;
    /** Custom error message */
    customMessage?: string;
  }
): void {
  const statusCode = options?.statusCode || getHttpStatusForError(error);
  const isNonProduction = process.env.VERCEL_ENV !== 'production';
  const apiError = createAPIError(error, options?.includeDetails ?? isNonProduction);
  
  if (options?.customMessage) {
    apiError.error = options.customMessage;
  }
  
  // Set retry-after header for rate limit errors
  if (statusCode === 429) {
    const llmError = error as { details?: { retryAfter?: number } };
    const retryAfter = llmError.details?.retryAfter || 60;
    res.setHeader('Retry-After', retryAfter);
  }
  
  console.error(`[API Error] ${apiError.code}: ${error instanceof Error ? error.message : String(error)}`);
  res.status(statusCode).json(apiError);
}

/**
 * Send a pipeline error response with proper mapping.
 */
export function sendPipelineError(
  res: VercelResponse,
  error: unknown
): void {
  sendErrorResponse(res, error, {
    includeDetails: process.env.VERCEL_ENV !== 'production',
  });
}

/**
 * Send an SSE error event for streaming responses.
 */
export function sendSSEError(
  res: VercelResponse,
  error: unknown
): void {
  const code = getErrorCode(error);
  const message = ERROR_MESSAGES[code] || (error instanceof Error ? error.message : 'An error occurred');
  const retryable = isRetryableError(error);
  
  const event = JSON.stringify({
    type: 'error',
    message,
    code,
    retryable,
  });
  
  res.write(`data: ${event}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}
