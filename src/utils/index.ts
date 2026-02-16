/**
 * Utilities Module
 * 
 * Central export for utility functions and helpers.
 * 
 * @module utils
 */

// ── Logging ──────────────────────────────────────────────────────────────────
export { default as logger, createLogger } from './logger';
export type { LogLevel } from './logger';

// ── Console Migration ────────────────────────────────────────────────────────
export {
  parseTaggedConsole,
  suggestLoggerCall,
  loggers,
} from './consoleToLogger';
