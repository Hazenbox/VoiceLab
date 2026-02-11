import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../_cors';
import { handleRateLimit } from '../_rateLimit';
import * as crypto from 'crypto';

/**
 * Admin Authentication API
 * Validates admin credentials server-side and returns a session token
 */

// Session tokens are stored in memory (in production, use Redis or a database)
// For Vercel serverless, this resets on each cold start, but that's acceptable for admin auth
const activeSessions = new Map<string, { createdAt: number; expiresAt: number }>();
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function cleanExpiredSessions(): void {
  const now = Date.now();
  const tokens = Array.from(activeSessions.keys());
  for (const token of tokens) {
    const session = activeSessions.get(token);
    if (session && session.expiresAt < now) {
      activeSessions.delete(token);
    }
  }
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

  try {
    const { action, passphrase, token } = req.body;

    // Clean expired sessions periodically
    cleanExpiredSessions();

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
        activeSessions.set(sessionToken, {
          createdAt: now,
          expiresAt: now + SESSION_DURATION,
        });

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

        const session = activeSessions.get(token);
        if (!session) {
          return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
        }

        if (session.expiresAt < Date.now()) {
          activeSessions.delete(token);
          return res.status(401).json({ valid: false, error: 'Token expired' });
        }

        return res.status(200).json({ valid: true });
      }

      case 'logout': {
        if (token) {
          activeSessions.delete(token);
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
