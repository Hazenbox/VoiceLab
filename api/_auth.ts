import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * API Authentication Module
 * 
 * Provides shared API key authentication for internal endpoints.
 * This protects against unauthorized API access while keeping
 * the setup simple for an internal tool.
 * 
 * Usage:
 * 1. Set INTERNAL_API_KEY environment variable in Vercel
 * 2. Pass x-api-key header or ?apiKey query param in requests
 * 3. For client-side, set VITE_INTERNAL_API_KEY (bundled, acceptable for internal)
 */

/**
 * Verify API key from request
 * Checks x-api-key header first, then apiKey query parameter
 */
function getApiKeyFromRequest(req: VercelRequest): string | null {
  // Check header first (preferred)
  const headerKey = req.headers['x-api-key'];
  if (typeof headerKey === 'string' && headerKey.length > 0) {
    return headerKey;
  }
  
  // Fallback to query parameter
  const queryKey = req.query.apiKey;
  if (typeof queryKey === 'string' && queryKey.length > 0) {
    return queryKey;
  }
  
  return null;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * API key authentication middleware
 * 
 * Returns true if authentication passes, false if request was rejected.
 * 
 * @param req - Vercel request
 * @param res - Vercel response
 * @param options - Optional configuration
 * @returns true if authenticated, false if rejected
 */
export function handleApiAuth(
  req: VercelRequest,
  res: VercelResponse,
  options?: {
    /** Skip auth for certain methods (e.g., OPTIONS for CORS) */
    skipMethods?: string[];
    /** Custom error message */
    errorMessage?: string;
  }
): boolean {
  // Skip auth for specified methods (OPTIONS is handled by CORS)
  if (options?.skipMethods?.includes(req.method || '')) {
    return true;
  }
  
  const serverApiKey = process.env.INTERNAL_API_KEY;
  
  // If no API key configured, allow requests (development mode / gradual rollout)
  // In production, INTERNAL_API_KEY should always be set
  if (!serverApiKey) {
    // Log warning in production
    if (process.env.VERCEL_ENV === 'production') {
      console.warn('[API Auth] INTERNAL_API_KEY not configured - authentication disabled');
    }
    return true;
  }
  
  const requestApiKey = getApiKeyFromRequest(req);
  
  if (!requestApiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: options?.errorMessage || 'API key required. Provide x-api-key header.',
    });
    return false;
  }
  
  if (!secureCompare(requestApiKey, serverApiKey)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: options?.errorMessage || 'Invalid API key.',
    });
    return false;
  }
  
  return true;
}

/**
 * Check if API authentication is enabled
 * Useful for conditional logic in the application
 */
export function isApiAuthEnabled(): boolean {
  return !!process.env.INTERNAL_API_KEY;
}

/**
 * Get instructions for API key setup
 * Returns helpful error message for developers
 */
export function getApiKeySetupInstructions(): string {
  return `
API Authentication Setup:
1. Generate a secure API key: openssl rand -hex 32
2. Add INTERNAL_API_KEY to Vercel Environment Variables
3. Add VITE_INTERNAL_API_KEY with same value for client access
4. Pass key via x-api-key header in API requests
`.trim();
}
