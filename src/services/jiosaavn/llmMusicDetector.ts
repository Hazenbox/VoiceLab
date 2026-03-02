/**
 * LLM-based Music Topic Detector
 * 
 * Uses the existing LLM infrastructure to classify content as music-related
 * and extract optimal search queries for JioSaavn.
 * 
 * Benefits over keyword-based detection:
 * - Handles new artists, genres, and edge cases automatically
 * - Understands context and intent
 * - Easily extensible to other topics
 * - No maintenance of keyword lists required
 */

import { getApiBaseUrl, getApiHeaders } from '../../config/providers';
import { detectMusicTopic as keywordDetectMusicTopic } from './musicTopicDetector';
import type { MusicTopicResult } from './types';

export interface MusicClassification {
  isMusicRelated: boolean;
  confidence: number;
  searchQuery: string;
  detectedEntities: {
    artists: string[];
    genres: string[];
    albums: string[];
    songs: string[];
  };
}

interface CacheEntry {
  result: MusicTopicResult;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const classificationCache = new Map<string, CacheEntry>();

const CLASSIFICATION_PROMPT = `You are a music content classifier. Analyze the given text and determine if it discusses music-related topics.

Return a JSON object with this exact structure:
{
  "isMusicRelated": boolean,
  "confidence": number between 0 and 1,
  "searchQuery": "best search term for finding related music on a streaming service",
  "artists": ["list of artist names mentioned"],
  "genres": ["list of music genres mentioned"],
  "albums": ["list of album names mentioned"],
  "songs": ["list of song names mentioned"]
}

Guidelines:
- Set isMusicRelated to true if the text mentions songs, artists, albums, playlists, music genres, or music recommendations
- confidence should reflect how certain you are (0.9+ for explicit music content, 0.5-0.8 for indirect references)
- searchQuery should be the most effective search term to find related music (prioritize artist names, then song names, then genres)
- Keep searchQuery concise (2-4 words max)
- Extract actual entity names, not generic terms

IMPORTANT: Return ONLY the JSON object, no additional text or markdown.`;

function getCacheKey(content: string): string {
  return content.slice(0, 500).toLowerCase().trim();
}

function getFromCache(content: string): MusicTopicResult | null {
  const key = getCacheKey(content);
  const entry = classificationCache.get(key);
  
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    classificationCache.delete(key);
    return null;
  }
  
  return entry.result;
}

function setCache(content: string, result: MusicTopicResult): void {
  const key = getCacheKey(content);
  classificationCache.set(key, {
    result,
    timestamp: Date.now(),
  });
  
  if (classificationCache.size > 100) {
    const oldestKey = classificationCache.keys().next().value;
    if (oldestKey) {
      classificationCache.delete(oldestKey);
    }
  }
}

function parseClassificationResponse(response: string): MusicClassification | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (typeof parsed.isMusicRelated !== 'boolean') return null;
    
    return {
      isMusicRelated: parsed.isMusicRelated,
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery.slice(0, 50) : '',
      detectedEntities: {
        artists: Array.isArray(parsed.artists) ? parsed.artists.filter((a: unknown) => typeof a === 'string') : [],
        genres: Array.isArray(parsed.genres) ? parsed.genres.filter((g: unknown) => typeof g === 'string') : [],
        albums: Array.isArray(parsed.albums) ? parsed.albums.filter((a: unknown) => typeof a === 'string') : [],
        songs: Array.isArray(parsed.songs) ? parsed.songs.filter((s: unknown) => typeof s === 'string') : [],
      },
    };
  } catch {
    console.warn('[LLMMusicDetector] Failed to parse response:', response.slice(0, 200));
    return null;
  }
}

function classificationToMusicTopicResult(classification: MusicClassification): MusicTopicResult {
  const allKeywords = [
    ...classification.detectedEntities.artists,
    ...classification.detectedEntities.genres,
    ...classification.detectedEntities.albums,
    ...classification.detectedEntities.songs,
  ];
  
  return {
    detected: classification.isMusicRelated && classification.confidence >= 0.3,
    searchQuery: classification.searchQuery,
    confidence: classification.confidence,
    matchedKeywords: allKeywords.slice(0, 10),
  };
}

export async function classifyMusicContent(
  content: string,
  options: { signal?: AbortSignal; timeout?: number } = {}
): Promise<MusicTopicResult> {
  const { signal, timeout = 5000 } = options;
  
  if (!content || content.trim().length < 20) {
    return {
      detected: false,
      searchQuery: '',
      confidence: 0,
      matchedKeywords: [],
    };
  }
  
  const cached = getFromCache(content);
  if (cached) {
    console.log('[LLMMusicDetector] Cache hit');
    return cached;
  }
  
  const truncatedContent = content.slice(0, 1500);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }
    
    const proxyUrl = getApiBaseUrl();
    const response = await fetch(`${proxyUrl}/api/llm`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({
        model: 'qwen-turbo',
        messages: [
          { role: 'system', content: CLASSIFICATION_PROMPT },
          { role: 'user', content: `Analyze this text:\n\n${truncatedContent}` },
        ],
        maxTokens: 300,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status}`);
    }
    
    const data = await response.json();
    const outputText = data.output?.text || 
                      data.output?.choices?.[0]?.message?.content || 
                      '';
    
    const classification = parseClassificationResponse(outputText);
    
    if (classification) {
      const result = classificationToMusicTopicResult(classification);
      console.log('[LLMMusicDetector] Classification result:', {
        detected: result.detected,
        query: result.searchQuery,
        confidence: result.confidence.toFixed(2),
        entities: classification.detectedEntities,
      });
      setCache(content, result);
      return result;
    }
    
    console.warn('[LLMMusicDetector] Failed to parse LLM response, falling back to keyword detection');
    return keywordDetectMusicTopic(content);
    
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log('[LLMMusicDetector] Request aborted/timeout, using keyword fallback');
    } else {
      console.warn('[LLMMusicDetector] LLM classification failed, using keyword fallback:', error);
    }
    
    const fallbackResult = keywordDetectMusicTopic(content);
    setCache(content, fallbackResult);
    return fallbackResult;
  }
}

export function clearClassificationCache(): void {
  classificationCache.clear();
}

export async function detectMusicTopicWithLLM(
  content: string,
  options: { signal?: AbortSignal; useLLM?: boolean } = {}
): Promise<MusicTopicResult> {
  const { useLLM = true } = options;
  
  if (!useLLM) {
    return keywordDetectMusicTopic(content);
  }
  
  return classifyMusicContent(content, options);
}
