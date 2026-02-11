import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Allowed origins for CORS
 * In production, this should be your actual domain(s)
 */
const ALLOWED_ORIGINS = [
  'https://voice-lab.vercel.app',
  'https://voice-designer.vercel.app',
  'https://jio-voice-lab.vercel.app',
  'https://jio-tone-studio.vercel.app',
  'https://tone-studio-upens-projects-bf30d69d.vercel.app',
  'https://tone-studio-git-main-upens-projects-bf30d69d.vercel.app',
  'https://tone-studio-delta.vercel.app',
];

// In development, allow localhost
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

/**
 * Check if origin is allowed
 */
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  
  // Check production origins
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // In development (Vercel preview or local), allow more origins
  const isDevEnvironment = process.env.VERCEL_ENV === 'preview' || 
                           process.env.VERCEL_ENV === 'development' ||
                           !process.env.VERCEL_ENV;
  
  if (isDevEnvironment && DEV_ORIGINS.includes(origin)) return true;
  
  // Allow Vercel preview deployments - only from this project
  // Pattern: voice-designer-*.vercel.app or voice-lab-*.vercel.app or jio-voice-lab-*.vercel.app or tone-studio-*.vercel.app
  if (isDevEnvironment && origin.endsWith('.vercel.app')) {
    const allowedPrefixes = ['voice-designer-', 'voice-lab-', 'jio-voice-lab-', 'tone-studio-', 'jio-tone-studio-'];
    const hostname = new URL(origin).hostname;
    
    for (const prefix of allowedPrefixes) {
      if (hostname.startsWith(prefix)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Set CORS headers with origin validation
 */
export function setCorsHeaders(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin!);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // For same-origin requests (no Origin header), allow access
    // This happens when the request is from the same domain
    if (!origin) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
      // Deny cross-origin requests from unknown origins
      return false;
    }
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  return true;
}

/**
 * Handle CORS preflight and validation
 * Returns true if request should continue, false if it was handled (preflight or denied)
 */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const corsAllowed = setCorsHeaders(req, res);
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  
  // Reject requests from disallowed origins
  if (!corsAllowed && req.headers.origin) {
    res.status(403).json({ error: 'CORS: Origin not allowed' });
    return false;
  }
  
  return true;
}
