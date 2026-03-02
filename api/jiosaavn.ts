/**
 * JioSaavn API Proxy Endpoint
 * 
 * GET /api/jiosaavn?query=<search_term>&limit=<number>
 * 
 * Proxies requests to the unofficial JioSaavn API (saavn.sumit.co) to avoid CORS issues.
 * Returns global search results including songs, playlists, artists, and albums.
 * 
 * Query Parameters:
 * - query (required): Search term
 * - limit (optional): Max results per category (default: 5, max: 10)
 * 
 * Response: JioSaavnGlobalSearchResponse
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_cors';
import { handleRateLimit, RATE_LIMITS } from './_rateLimit';

const JIOSAAVN_API_BASE = 'https://saavn.sumit.co/api';
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 10000;

export const config = {
  maxDuration: 15,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res)) return;
  
  if (!handleRateLimit(req, res, 'default')) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED' 
    });
  }
  
  const { query, limit: limitParam } = req.query;
  
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid query parameter',
      code: 'INVALID_QUERY'
    });
  }
  
  const searchQuery = query.trim();
  
  if (searchQuery.length > 200) {
    return res.status(400).json({
      success: false,
      error: 'Query too long (max 200 characters)',
      code: 'QUERY_TOO_LONG'
    });
  }
  
  let limit = DEFAULT_LIMIT;
  if (limitParam) {
    const parsedLimit = parseInt(typeof limitParam === 'string' ? limitParam : limitParam[0], 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = Math.min(parsedLimit, MAX_LIMIT);
    }
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    const apiUrl = new URL(`${JIOSAAVN_API_BASE}/search`);
    apiUrl.searchParams.set('query', searchQuery);
    
    console.log(`[API/jiosaavn] Searching: "${searchQuery}" (limit: ${limit})`);
    
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VoiceLab/1.0',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`[API/jiosaavn] Upstream error: ${response.status} ${response.statusText}`);
      
      if (response.status === 429) {
        return res.status(429).json({
          success: false,
          error: 'JioSaavn API rate limit exceeded',
          code: 'UPSTREAM_RATE_LIMIT',
          retryAfter: 60,
        });
      }
      
      return res.status(502).json({
        success: false,
        error: 'Failed to fetch from JioSaavn API',
        code: 'UPSTREAM_ERROR',
        upstreamStatus: response.status,
      });
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      console.warn('[API/jiosaavn] Invalid response structure from upstream');
      return res.status(502).json({
        success: false,
        error: 'Invalid response from JioSaavn API',
        code: 'INVALID_UPSTREAM_RESPONSE',
      });
    }
    
    const limitedData = {
      success: true,
      data: {
        songs: {
          results: (data.data.songs?.results || []).slice(0, limit),
          position: data.data.songs?.position || 0,
        },
        playlists: {
          results: (data.data.playlists?.results || []).slice(0, limit),
          position: data.data.playlists?.position || 0,
        },
        artists: {
          results: (data.data.artists?.results || []).slice(0, limit),
          position: data.data.artists?.position || 0,
        },
        albums: {
          results: (data.data.albums?.results || []).slice(0, limit),
          position: data.data.albums?.position || 0,
        },
        topQuery: {
          results: (data.data.topQuery?.results || []).slice(0, limit),
          position: data.data.topQuery?.position || 0,
        },
      },
    };
    
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    
    return res.status(200).json(limitedData);
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[API/jiosaavn] Request timeout');
      return res.status(504).json({
        success: false,
        error: 'Request to JioSaavn API timed out',
        code: 'TIMEOUT',
      });
    }
    
    console.error('[API/jiosaavn] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}
