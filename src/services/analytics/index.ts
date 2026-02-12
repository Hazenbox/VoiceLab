/**
 * Analytics Services
 * 
 * Centralized exports for all analytics-related services.
 */

// Rate Limiter
export { RateLimiter, rateLimiter, RATE_LIMITS } from './rateLimiter';
export type { RateLimitConfig } from './rateLimiter';

// Session Manager
export { 
  SessionManager, 
  getSessionManager, 
  resetSessionManager 
} from './sessionManager';
export type { 
  SessionState, 
  SessionStartParams, 
  InteractionEvent 
} from './sessionManager';

// Response Timer
export { 
  ResponseTimer, 
  getResponseTimer, 
  resetResponseTimer 
} from './responseTimer';
export type { ResponseTiming } from './responseTimer';

// Error Logger
export { 
  getErrorLogger, 
  resetErrorLogger 
} from './errorLogger';
export type { ErrorSource, ErrorLogEntry } from './errorLogger';
