/**
 * Error Logger
 * 
 * Centralized error logging for analytics.
 * Tracks errors from various sources:
 * - LLM API failures
 * - Voice transcription errors
 * - Network failures
 * - React errors (via ErrorBoundary)
 * - Validation failures
 */

import { getSessionManager } from './sessionManager';
import { rateLimiter, RATE_LIMITS } from './rateLimiter';

// ── Types ────────────────────────────────────────────────────────────

export type ErrorSource = 
  | 'llm_api'
  | 'voice_transcription'
  | 'voice_synthesis'
  | 'network'
  | 'react_component'
  | 'validation'
  | 'convex_sync'
  | 'audio_processing'
  | 'unknown';

export interface ErrorLogEntry {
  source: ErrorSource;
  errorType: string;       // e.g., "timeout", "rate_limit", "invalid_response"
  message: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
  sessionId?: string;
  recoverable: boolean;    // Was the app able to continue?
}

// ── Error Logger Class ───────────────────────────────────────────────

class ErrorLogger {
  private errorHistory: ErrorLogEntry[] = [];
  private maxHistorySize = 100;
  
  // Callback for sending errors to Convex
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private syncCallback: ((action: string, data: Record<string, any>) => Promise<any>) | null = null;

  /**
   * Set the sync callback for Convex
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setSyncCallback(callback: (action: string, data: Record<string, any>) => Promise<any>): void {
    this.syncCallback = callback;
  }

  /**
   * Log an error
   */
  logError(
    source: ErrorSource,
    error: Error | string,
    options: {
      errorType?: string;
      metadata?: Record<string, unknown>;
      recoverable?: boolean;
    } = {}
  ): void {
    // Rate limit error logging
    if (!rateLimiter.canProceed('errorLogs', RATE_LIMITS.errorLogs)) {
      console.warn('[ErrorLogger] Error logging rate limited');
      return;
    }

    const sessionManager = getSessionManager();
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    const entry: ErrorLogEntry = {
      source,
      errorType: options.errorType || this.inferErrorType(error),
      message: errorMessage,
      stack: errorStack,
      metadata: options.metadata,
      timestamp: Date.now(),
      sessionId: sessionManager.getSessionId() || undefined,
      recoverable: options.recoverable ?? true,
    };

    // Add to local history
    this.errorHistory.push(entry);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Log to console for debugging
    console.error(`[ErrorLogger] ${source}:`, errorMessage, options.metadata);

    // Track in session
    sessionManager.trackError(source, errorMessage);

    // Send to Convex (async, non-blocking)
    this.sendToConvex(entry);
  }

  /**
   * Log an LLM API error
   */
  logLLMError(
    provider: string,
    error: Error | string,
    options: {
      model?: string;
      tokenCount?: number;
      retryCount?: number;
    } = {}
  ): void {
    this.logError('llm_api', error, {
      errorType: this.inferLLMErrorType(error),
      metadata: {
        provider,
        ...options,
      },
    });
  }

  /**
   * Log a voice/audio error
   */
  logVoiceError(
    type: 'transcription' | 'synthesis',
    error: Error | string,
    options: {
      provider?: string;
      duration?: number;
    } = {}
  ): void {
    const source: ErrorSource = type === 'transcription' ? 'voice_transcription' : 'voice_synthesis';
    this.logError(source, error, {
      metadata: options,
    });
  }

  /**
   * Log a network error
   */
  logNetworkError(
    url: string,
    error: Error | string,
    options: {
      method?: string;
      statusCode?: number;
    } = {}
  ): void {
    this.logError('network', error, {
      errorType: options.statusCode ? `http_${options.statusCode}` : 'network_failure',
      metadata: {
        url,
        ...options,
      },
    });
  }

  /**
   * Log a React component error (from ErrorBoundary)
   */
  logReactError(
    error: Error,
    errorInfo: { componentStack?: string }
  ): void {
    this.logError('react_component', error, {
      errorType: 'render_error',
      metadata: {
        componentStack: errorInfo.componentStack,
      },
      recoverable: false,
    });
  }

  /**
   * Log a validation failure
   */
  logValidationError(
    message: string,
    options: {
      trustScore?: number;
      violationCount?: number;
      topViolations?: string[];
    } = {}
  ): void {
    this.logError('validation', message, {
      errorType: 'trust_score_failure',
      metadata: options,
      recoverable: true,
    });
  }

  // ── Helper Methods ─────────────────────────────────────────────────

  private inferErrorType(error: Error | string): string {
    const message = error instanceof Error ? error.message : error;
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('timeout')) return 'timeout';
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) return 'rate_limit';
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) return 'auth_error';
    if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) return 'forbidden';
    if (lowerMessage.includes('not found') || lowerMessage.includes('404')) return 'not_found';
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) return 'network_error';
    if (lowerMessage.includes('parse') || lowerMessage.includes('json')) return 'parse_error';
    
    return 'unknown';
  }

  private inferLLMErrorType(error: Error | string): string {
    const message = error instanceof Error ? error.message : error;
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('context') && lowerMessage.includes('length')) return 'context_length_exceeded';
    if (lowerMessage.includes('content') && lowerMessage.includes('filter')) return 'content_filter';
    if (lowerMessage.includes('quota')) return 'quota_exceeded';
    if (lowerMessage.includes('model') && lowerMessage.includes('not found')) return 'model_not_found';
    if (lowerMessage.includes('overloaded')) return 'model_overloaded';
    
    return this.inferErrorType(error);
  }

  private async sendToConvex(entry: ErrorLogEntry): Promise<void> {
    if (!this.syncCallback) return;

    try {
      const sessionManager = getSessionManager();
      const session = sessionManager.getSession();
      
      await this.syncCallback('interactions:log', {
        userId: session?.userId,
        sessionId: session?.sessionId,
        deviceId: session?.deviceId || 'unknown',
        eventType: 'error',
        target: entry.source,
        metadata: JSON.stringify({
          errorType: entry.errorType,
          message: entry.message,
          recoverable: entry.recoverable,
          ...entry.metadata,
        }),
      });
    } catch (error) {
      // Don't log errors about logging errors - avoid infinite loop
      console.error('[ErrorLogger] Failed to send error to Convex:', error);
    }
  }

  // ── Getters ────────────────────────────────────────────────────────

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): ErrorLogEntry[] {
    return this.errorHistory.slice(-limit);
  }

  /**
   * Get error count by source
   */
  getErrorCountBySource(): Record<ErrorSource, number> {
    const counts: Partial<Record<ErrorSource, number>> = {};
    for (const entry of this.errorHistory) {
      counts[entry.source] = (counts[entry.source] || 0) + 1;
    }
    return counts as Record<ErrorSource, number>;
  }

  /**
   * Get error count in last N minutes
   */
  getErrorCountInLastMinutes(minutes: number): number {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.errorHistory.filter(e => e.timestamp >= cutoff).length;
  }

  /**
   * Check if there's an error spike (more than threshold in last minute)
   */
  hasErrorSpike(threshold: number = 10): boolean {
    return this.getErrorCountInLastMinutes(1) >= threshold;
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }
}

// ── Singleton ────────────────────────────────────────────────────────

let errorLoggerInstance: ErrorLogger | null = null;

export function getErrorLogger(): ErrorLogger {
  if (!errorLoggerInstance) {
    errorLoggerInstance = new ErrorLogger();
  }
  return errorLoggerInstance;
}

export function resetErrorLogger(): void {
  if (errorLoggerInstance) {
    errorLoggerInstance.clearHistory();
    errorLoggerInstance = null;
  }
}
