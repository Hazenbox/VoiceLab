/**
 * Environment Abstraction
 * 
 * Unified environment variable access for both client (Vite) and server (Node.js).
 * Automatically detects runtime context and uses appropriate env source.
 * 
 * Phase 6A: Enables shared code between browser and Vercel serverless functions.
 */

/**
 * Check if running on server (Node.js/Vercel) vs client (browser)
 */
export const isServer = typeof window === 'undefined';

/**
 * Check if running in production environment
 * - Server: checks VERCEL_ENV or NODE_ENV
 * - Client: checks window.location.hostname
 */
export function isProduction(): boolean {
  if (isServer) {
    // Server-side: check Vercel/Node environment variables
    return (
      process.env.VERCEL_ENV === 'production' ||
      process.env.NODE_ENV === 'production'
    );
  }
  // Client-side: check hostname
  const hostname = window.location.hostname;
  return hostname !== 'localhost' && hostname !== '127.0.0.1';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  if (isServer) {
    return (
      process.env.VERCEL_ENV === 'development' ||
      process.env.NODE_ENV === 'development'
    );
  }
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Get environment variable with fallback
 * 
 * @param key - Environment variable key (without VITE_ prefix)
 * @param defaultValue - Default value if not found
 * @returns The environment variable value or default
 * 
 * Usage:
 * - Client: automatically prefixes with VITE_ and reads from import.meta.env
 * - Server: reads directly from process.env
 * 
 * Example:
 *   getEnv('API_KEY') reads:
 *   - Client: import.meta.env.VITE_API_KEY
 *   - Server: process.env.API_KEY (or process.env.VITE_API_KEY as fallback)
 */
export function getEnv(key: string, defaultValue: string = ''): string {
  if (isServer) {
    // Server-side: try direct key first, then VITE_ prefixed (for shared configs)
    return process.env[key] || process.env[`VITE_${key}`] || defaultValue;
  }
  
  // Client-side: use Vite's import.meta.env with VITE_ prefix
  // Need to handle the case where import.meta.env might not exist
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env[`VITE_${key}`] as string) || defaultValue;
  }
  
  return defaultValue;
}

/**
 * Get boolean environment variable
 */
export function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = getEnv(key);
  if (value === '') return defaultValue;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return defaultValue;
}

/**
 * Get numeric environment variable
 */
export function getEnvNumber(key: string, defaultValue: number = 0): number {
  const value = getEnv(key);
  if (value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Environment object for quick access
 * Provides commonly used environment checks and values
 */
export const env = {
  isServer,
  isProduction,
  isDevelopment,
  get: getEnv,
  getBool: getEnvBool,
  getNumber: getEnvNumber,
  
  // Common values
  get convexUrl(): string {
    return getEnv('CONVEX_URL', '');
  },
  
  get sentryDsn(): string {
    return getEnv('SENTRY_DSN', '');
  },
  
  get internalApiKey(): string {
    return getEnv('INTERNAL_API_KEY', '');
  },
  
  // Vercel-specific
  get vercelEnv(): string {
    return isServer ? (process.env.VERCEL_ENV || '') : '';
  },
  
  get vercelRegion(): string {
    return isServer ? (process.env.VERCEL_REGION || '') : '';
  },
} as const;

export default env;
