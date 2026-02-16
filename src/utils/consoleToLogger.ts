/**
 * Console to Logger Migration Guide (Phase 4.3)
 * 
 * This file documents the migration pattern from console.log to structured logger.
 * Use this as a reference when converting console calls.
 * 
 * @module utils/consoleToLogger
 */

import { logger, createLogger } from './logger';

// =============================================================================
// Migration Patterns
// =============================================================================

/**
 * MIGRATION GUIDE:
 * 
 * 1. SIMPLE CONSOLE.LOG
 *    Before: console.log('Processing started');
 *    After:  logger.info('Processing started');
 *    
 *    Before: console.log('User data:', userData);
 *    After:  logger.debug('User data', { userData });
 * 
 * 2. CONSOLE.WARN
 *    Before: console.warn('Deprecated feature used');
 *    After:  logger.warn('Deprecated feature used');
 *    
 *    Before: console.warn('[Module] Issue:', issue);
 *    After:  logger.warn('Issue detected', { issue }, 'Module');
 * 
 * 3. CONSOLE.ERROR
 *    Before: console.error('Failed:', error);
 *    After:  logger.error('Operation failed', error);
 *    
 *    Before: console.error('[API] Request failed:', { url, status });
 *    After:  logger.error('API request failed', { url, status }, 'API');
 * 
 * 4. MODULE-SCOPED LOGGING
 *    // At top of file:
 *    const log = createLogger('MyModule');
 *    
 *    // Then use:
 *    log.info('Started');
 *    log.warn('Warning');
 *    log.error('Error', error);
 * 
 * 5. PERFORMANCE TIMING
 *    Before: console.log(`Operation took ${time}ms`);
 *    After:  logger.timed('Operation completed', time);
 *    
 *    // Or for async:
 *    const result = await log.time('Fetch data', async () => fetchData());
 * 
 * 6. CONDITIONAL LOGGING
 *    Before: if (debug) console.log('Debug info');
 *    After:  logger.debug('Debug info');  // Will only show if level is debug
 * 
 * 7. STRUCTURED DATA
 *    Before: console.log('[Payment] Success:', { amount, txId });
 *    After:  logger.info('Payment successful', { amount, txId }, 'Payment');
 */

// =============================================================================
// Helper to migrate tagged console logs
// =============================================================================

/**
 * Parse a tagged console message like "[Module] Message: data"
 * and return structured components
 */
export function parseTaggedConsole(message: string): {
  module: string | null;
  text: string;
  hasData: boolean;
} {
  // Match pattern: [ModuleName] RestOfMessage
  const tagMatch = message.match(/^\[([^\]]+)\]\s*(.*)$/);
  
  if (tagMatch) {
    return {
      module: tagMatch[1],
      text: tagMatch[2],
      hasData: tagMatch[2].includes(':'),
    };
  }
  
  return {
    module: null,
    text: message,
    hasData: message.includes(':'),
  };
}

/**
 * Generate logger call from console call
 * This is a helper for manual migration - not for automated conversion
 */
export function suggestLoggerCall(
  consoleMethod: 'log' | 'warn' | 'error',
  message: string,
  hasArgs: boolean,
): string {
  const parsed = parseTaggedConsole(message);
  
  const levelMap = {
    log: 'debug', // or 'info' depending on importance
    warn: 'warn',
    error: 'error',
  };
  
  const level = levelMap[consoleMethod];
  
  if (parsed.module) {
    if (hasArgs) {
      return `logger.${level}('${parsed.text.replace(/:.*/,'')}', { ...args }, '${parsed.module}')`;
    }
    return `logger.${level}('${parsed.text}', undefined, '${parsed.module}')`;
  }
  
  if (hasArgs) {
    return `logger.${level}('${message.replace(/:.*/,'')}', { ...args })`;
  }
  
  return `logger.${level}('${message}')`;
}

// =============================================================================
// Common Module Loggers (Pre-created for convenience)
// =============================================================================

// Export pre-configured module loggers for common use cases
export const loggers = {
  app: createLogger('App'),
  generation: createLogger('Generation'),
  validation: createLogger('Validation'),
  api: createLogger('API'),
  sync: createLogger('Sync'),
  voice: createLogger('Voice'),
  analytics: createLogger('Analytics'),
  auth: createLogger('Auth'),
  memory: createLogger('Memory'),
  knowledge: createLogger('Knowledge'),
};

// =============================================================================
// Files That Should NOT Be Migrated
// =============================================================================

/**
 * These files have intentional console usage:
 * 
 * - utils/logger.ts - The logger itself uses console
 * - config/sentry.ts - Sentry integration needs console for fallback
 * - *.test.ts - Tests may use console for debugging
 * - ErrorBoundary.tsx - Needs console.error for error reporting
 */

// =============================================================================
// Priority Migration Order
// =============================================================================

/**
 * Files to migrate in priority order (high-traffic, user-visible):
 * 
 * 1. HIGH PRIORITY (user-facing, frequent):
 *    - src/App.tsx
 *    - src/services/llm/orchestrator.ts
 *    - src/services/validation/validationPipeline.ts
 *    - src/services/generation/*.ts
 * 
 * 2. MEDIUM PRIORITY (important but less frequent):
 *    - src/services/sync/*.ts
 *    - src/services/knowledge/*.ts
 *    - src/admin/*.tsx
 * 
 * 3. LOW PRIORITY (internal, debugging):
 *    - src/components/*.tsx (UI components)
 *    - src/hooks/*.ts
 * 
 * 4. SKIP (intentional console usage):
 *    - src/utils/logger.ts
 *    - src/config/sentry.ts
 *    - **/*.test.ts
 */

export default {
  parseTaggedConsole,
  suggestLoggerCall,
  loggers,
};
