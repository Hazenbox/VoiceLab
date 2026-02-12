import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_cors.js';
import { handleRateLimit } from '../_rateLimit.js';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api.js';
import * as crypto from 'crypto';

/**
 * Admin Authentication API
 * Validates admin credentials server-side and returns a session token
 * 
 * Sessions are stored in Convex database for persistence across cold starts.
 * This ensures admin sessions don't get invalidated when Vercel spins up new instances.
 */

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Initialize Convex client
function getConvexClient(): ConvexHttpClient | null {
  // Check multiple possible env var names for Convex URL
  // CONVEX_URL: Standard Convex env var
  // VITE_CONVEX_URL: Vite client-side env var (also accessible server-side)
  // NEXT_PUBLIC_CONVEX_URL: Next.js convention
  const convexUrl = process.env.CONVEX_URL 
    || process.env.VITE_CONVEX_URL 
    || process.env.NEXT_PUBLIC_CONVEX_URL;
  
  if (!convexUrl) {
    console.warn('[Admin Auth] CONVEX_URL not configured - falling back to in-memory sessions');
    console.warn('[Admin Auth] Available env vars:', Object.keys(process.env).filter(k => k.includes('CONVEX')));
    return null;
  }
  
  console.log('[Admin Auth] Using Convex URL:', convexUrl.slice(0, 30) + '...');
  return new ConvexHttpClient(convexUrl);
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Fallback in-memory storage (used when Convex is unavailable)
const fallbackSessions = new Map<string, { createdAt: number; expiresAt: number }>();

function cleanExpiredFallbackSessions(): void {
  const now = Date.now();
  const tokens = Array.from(fallbackSessions.keys());
  for (const token of tokens) {
    const session = fallbackSessions.get(token);
    if (session && session.expiresAt < now) {
      fallbackSessions.delete(token);
    }
  }
}

// Get client IP for logging
function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight and validation
  if (!handleCors(req, res)) return;
  
  // Apply strict rate limiting for auth (5 attempts/minute to prevent brute force)
  if (!handleRateLimit(req, res, 'auth')) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminPassphrase = process.env.ADMIN_PASSPHRASE;

  if (!adminPassphrase) {
    console.error('[Admin Auth] ADMIN_PASSPHRASE not configured on server');
    return res.status(500).json({ error: 'Admin authentication not configured' });
  }

  const convex = getConvexClient();
  const useConvex = convex !== null;

  try {
    const { action, passphrase, token, deviceId } = req.body;
    const userAgent = req.headers['user-agent'] || undefined;
    const ipAddress = getClientIP(req);

    // Clean expired fallback sessions periodically
    if (!useConvex) {
      cleanExpiredFallbackSessions();
    }

    switch (action) {
      case 'login': {
        if (!passphrase) {
          return res.status(400).json({ error: 'Passphrase is required' });
        }

        // Use constant-time comparison to prevent timing attacks
        const passphraseBuffer = Buffer.from(passphrase);
        const adminBuffer = Buffer.from(adminPassphrase);
        
        const isValid = passphraseBuffer.length === adminBuffer.length &&
                        crypto.timingSafeEqual(passphraseBuffer, adminBuffer);

        if (!isValid) {
          // Add delay to prevent brute force
          await new Promise(resolve => setTimeout(resolve, 1000));
          return res.status(401).json({ error: 'Invalid passphrase' });
        }

        // Generate session token
        const sessionToken = generateToken();
        const now = Date.now();

        if (useConvex) {
          // Store session in Convex
          try {
            await convex.mutation(api.adminSessions.create, {
              token: sessionToken,
              deviceId: deviceId || 'unknown',
              userAgent,
              ipAddress,
            });
          } catch (error) {
            console.error('[Admin Auth] Failed to store session in Convex:', error);
            // Fall back to in-memory
            fallbackSessions.set(sessionToken, {
              createdAt: now,
              expiresAt: now + SESSION_DURATION,
            });
          }
        } else {
          // Store in fallback memory
          fallbackSessions.set(sessionToken, {
            createdAt: now,
            expiresAt: now + SESSION_DURATION,
          });
        }

        return res.status(200).json({
          success: true,
          token: sessionToken,
          expiresIn: SESSION_DURATION,
        });
      }

      case 'verify': {
        if (!token) {
          return res.status(400).json({ error: 'Token is required' });
        }

        if (useConvex) {
          try {
            const result = await convex.query(api.adminSessions.verify, { token });
            
            if (!result.valid) {
              return res.status(401).json({ valid: false, error: result.error });
            }
            
            // Touch the session to update lastUsedAt
            convex.mutation(api.adminSessions.touch, { token }).catch(() => {
              // Ignore touch errors
            });
            
            return res.status(200).json({ 
              valid: true,
              expiresAt: result.expiresAt,
            });
          } catch (error) {
            console.error('[Admin Auth] Convex verify failed, checking fallback:', error);
            // Fall through to fallback check
          }
        }

        // Fallback: check in-memory
        const session = fallbackSessions.get(token);
        if (!session) {
          return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
        }

        if (session.expiresAt < Date.now()) {
          fallbackSessions.delete(token);
          return res.status(401).json({ valid: false, error: 'Token expired' });
        }

        return res.status(200).json({ valid: true });
      }

      case 'logout': {
        if (token) {
          if (useConvex) {
            try {
              await convex.mutation(api.adminSessions.remove, { token });
            } catch (error) {
              console.error('[Admin Auth] Convex logout failed:', error);
            }
          }
          // Always try to remove from fallback too
          fallbackSessions.delete(token);
        }
        return res.status(200).json({ success: true });
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Auth] Error:', message);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
