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
import { handleCors } from './_cors.js';
import { handleRateLimit, RATE_LIMITS } from './_rateLimit.js';

const JIOSAAVN_API_BASE = 'https://saavn.sumit.co/api';
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

export const config = {
  maxDuration: 15,
};

function createEmptyResponse() {
  return {
    success: true,
    data: {
      songs: { results: [], position: 0 },
      playlists: { results: [], position: 0 },
      artists: { results: [], position: 0 },
      albums: { results: [], position: 0 },
      topQuery: { results: [], position: 0 },
    },
    _meta: {
      fallback: true,
      reason: 'upstream_unavailable',
    },
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[API/jiosaavn] Attempt ${attempt + 1}/${retries + 1} failed:`, lastError.message);
      
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }
  
  throw lastError;
}

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
    
    const response = await fetchWithRetry(apiUrl.toString(), {
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
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({
          ...createEmptyResponse(),
          _meta: { fallback: true, reason: 'rate_limited' },
        });
      }
      
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        ...createEmptyResponse(),
        _meta: { fallback: true, reason: 'upstream_error', upstreamStatus: response.status },
      });
    }
    
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('[API/jiosaavn] Failed to parse upstream response:', parseError);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        ...createEmptyResponse(),
        _meta: { fallback: true, reason: 'parse_error' },
      });
    }
    
    if (!data.success || !data.data) {
      console.warn('[API/jiosaavn] Invalid response structure from upstream');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        ...createEmptyResponse(),
        _meta: { fallback: true, reason: 'invalid_response' },
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
      console.error('[API/jiosaavn] Request timeout after retries');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        ...createEmptyResponse(),
        _meta: { fallback: true, reason: 'timeout' },
      });
    }
    
    console.error('[API/jiosaavn] Unexpected error:', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ...createEmptyResponse(),
      _meta: { 
        fallback: true, 
        reason: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
