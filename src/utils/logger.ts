/**
 * Centralized Structured Logger
 * 
 * Provides consistent, structured logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - JSON output for production
 * - Context tags and metadata
 * - Integration with Sentry for errors
 * - Automatic timestamp and context
 */

import { captureError, captureMessage, addBreadcrumb, Sentry } from '../config/sentry';

// Log levels in order of severity
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Environment detection
const isProduction = typeof import.meta !== 'undefined' && import.meta.env?.PROD;

// Default log level based on environment
const DEFAULT_LOG_LEVEL: LogLevel = isProduction ? 'info' : 'debug';

// Configuration
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableSentry: boolean;
  jsonOutput: boolean;
  context?: Record<string, unknown>;
}

const config: LoggerConfig = {
  level: DEFAULT_LOG_LEVEL,
  enableConsole: true,
  enableSentry: isProduction,
  jsonOutput: isProduction,
  context: {},
};

// Log entry structure
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
  tags?: string[];
}

/**
 * Format a log entry for console output
 */
function formatForConsole(entry: LogEntry): string {
  const prefix = entry.module ? `[${entry.module}]` : '';
  const contextStr = entry.context && Object.keys(entry.context).length > 0
    ? ` ${JSON.stringify(entry.context)}`
    : '';
  const durationStr = entry.duration !== undefined ? ` (${entry.duration}ms)` : '';
  
  return `${prefix} ${entry.message}${contextStr}${durationStr}`;
}

/**
 * Format a log entry as JSON
 */
function formatAsJson(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Output a log entry
 */
function output(entry: LogEntry): void {
  // Check if we should log at this level
  if (LOG_LEVELS[entry.level] < LOG_LEVELS[config.level]) {
    return;
  }

  // Console output
  if (config.enableConsole) {
    const formatted = config.jsonOutput ? formatAsJson(entry) : formatForConsole(entry);
    
    switch (entry.level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted, entry.error);
        break;
    }
  }

  // Sentry integration
  if (config.enableSentry) {
    // Map our log level to Sentry severity
    const sentryLevel: Sentry.SeverityLevel = entry.level === 'warn' ? 'warning' : entry.level;
    
    // Add breadcrumb for all logs
    addBreadcrumb(entry.message, entry.module || 'app', entry.context, sentryLevel);
    
    // Capture errors and warnings in Sentry
    if (entry.level === 'error' && entry.error) {
      captureError(new Error(entry.error.message), {
        tags: { module: entry.module || 'unknown' },
        extra: entry.context,
      });
    } else if (entry.level === 'warn') {
      captureMessage(entry.message, 'warning', entry.context);
    }
  }
}

/**
 * Create a log entry
 */
function createEntry(
  level: LogLevel,
  message: string,
  options?: {
    module?: string;
    context?: Record<string, unknown>;
    error?: Error;
    duration?: number;
    tags?: string[];
  }
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    module: options?.module,
    context: { ...config.context, ...options?.context },
    duration: options?.duration,
    tags: options?.tags,
  };

  if (options?.error) {
    entry.error = {
      name: options.error.name,
      message: options.error.message,
      stack: options.error.stack,
    };
  }

  return entry;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Configure the logger
 */
export function configure(options: Partial<LoggerConfig>): void {
  Object.assign(config, options);
}

/**
 * Set global context that will be included in all logs
 */
export function setContext(context: Record<string, unknown>): void {
  config.context = { ...config.context, ...context };
}

/**
 * Clear global context
 */
export function clearContext(): void {
  config.context = {};
}

/**
 * Log at debug level
 */
export function debug(message: string, context?: Record<string, unknown>, module?: string): void {
  output(createEntry('debug', message, { module, context }));
}

/**
 * Log at info level
 */
export function info(message: string, context?: Record<string, unknown>, module?: string): void {
  output(createEntry('info', message, { module, context }));
}

/**
 * Log at warn level
 */
export function warn(message: string, context?: Record<string, unknown>, module?: string): void {
  output(createEntry('warn', message, { module, context }));
}

/**
 * Log at error level
 */
export function error(
  message: string,
  errorOrContext?: Error | Record<string, unknown>,
  module?: string
): void {
  const isError = errorOrContext instanceof Error;
  output(createEntry('error', message, {
    module,
    error: isError ? errorOrContext : undefined,
    context: isError ? undefined : errorOrContext,
  }));
}

/**
 * Log with timing information
 */
export function timed(
  message: string,
  duration: number,
  context?: Record<string, unknown>,
  module?: string
): void {
  output(createEntry('info', message, { module, context, duration }));
}

/**
 * Create a scoped logger for a specific module
 */
export function createLogger(moduleName: string) {
  return {
    debug: (message: string, context?: Record<string, unknown>) => debug(message, context, moduleName),
    info: (message: string, context?: Record<string, unknown>) => info(message, context, moduleName),
    warn: (message: string, context?: Record<string, unknown>) => warn(message, context, moduleName),
    error: (message: string, errorOrContext?: Error | Record<string, unknown>) => 
      error(message, errorOrContext, moduleName),
    timed: (message: string, duration: number, context?: Record<string, unknown>) =>
      timed(message, duration, context, moduleName),
    
    /**
     * Time an async operation
     */
    async time<T>(
      operation: string,
      fn: () => Promise<T>,
      context?: Record<string, unknown>
    ): Promise<T> {
      const start = performance.now();
      try {
        const result = await fn();
        const duration = Math.round(performance.now() - start);
        timed(`${operation} completed`, duration, context, moduleName);
        return result;
      } catch (err) {
        const duration = Math.round(performance.now() - start);
        error(`${operation} failed after ${duration}ms`, err as Error, moduleName);
        throw err;
      }
    },
    
    /**
     * Create a child logger with additional context
     */
    child(additionalContext: Record<string, unknown>) {
      const childModule = moduleName;
      return {
        debug: (message: string, context?: Record<string, unknown>) => 
          debug(message, { ...additionalContext, ...context }, childModule),
        info: (message: string, context?: Record<string, unknown>) => 
          info(message, { ...additionalContext, ...context }, childModule),
        warn: (message: string, context?: Record<string, unknown>) => 
          warn(message, { ...additionalContext, ...context }, childModule),
        error: (message: string, errorOrContext?: Error | Record<string, unknown>) => {
          if (errorOrContext instanceof Error) {
            error(message, errorOrContext, childModule);
          } else {
            error(message, { ...additionalContext, ...errorOrContext }, childModule);
          }
        },
      };
    },
  };
}

// Default export as a convenient logger object
export const logger = {
  debug,
  info,
  warn,
  error,
  timed,
  configure,
  setContext,
  clearContext,
  createLogger,
};

export default logger;
