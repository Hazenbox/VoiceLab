/**
 * LLM-based Health Topic Detector
 * 
 * Uses the existing LLM infrastructure to classify content as health-related.
 * Follows the pattern from llmMusicDetector.ts.
 * 
 * Benefits over keyword-based detection:
 * - Contextual understanding (knows "speed test" is not medical)
 * - Handles edge cases automatically
 * - No maintenance of keyword lists required
 * - Falls back to keyword detection if LLM fails
 */

import { getApiBaseUrl, getApiHeaders } from '../../config/providers';
import { detectHealthTopic as keywordDetectHealthTopic } from './healthTopicDetector';
import type { HealthTopicResult, HealthCategory } from './types';

export interface HealthClassification {
  isHealthRelated: boolean;
  confidence: number;
  category: HealthCategory;
  reason: string;
}

interface CacheEntry {
  result: HealthTopicResult;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const classificationCache = new Map<string, CacheEntry>();

const CLASSIFICATION_PROMPT = `You are a health content classifier. Analyze the given text and determine if it discusses health/medical topics that would benefit from connecting with a healthcare provider.

Return a JSON object with this exact structure:
{
  "isHealthRelated": boolean,
  "confidence": number between 0 and 1,
  "category": "medical_advice" | "appointment" | "wellness" | "emergency" | "none",
  "reason": "brief explanation (10 words max)"
}

Guidelines for isHealthRelated:
- TRUE for: symptoms, medical conditions, medications, doctor visits, health advice, wellness/fitness questions, mental health
- FALSE for: technical support, internet/network issues, billing queries, product troubleshooting, account issues, device problems, connectivity issues, speed tests, router problems

Category definitions:
- "medical_advice": symptoms, conditions, medications, treatments
- "appointment": booking doctors, scheduling visits, consultations
- "wellness": fitness, nutrition, exercise, preventive health
- "emergency": suicide, self-harm, severe life-threatening symptoms
- "none": not health-related

Be CONSERVATIVE - only return isHealthRelated=true if the content is genuinely about health/medical topics.
Technical support queries (internet slow, router issues, app problems) are NOT health-related.

IMPORTANT: Return ONLY the JSON object, no additional text or markdown.`;

function getCacheKey(content: string): string {
  return content.slice(0, 500).toLowerCase().trim();
}

function getFromCache(content: string): HealthTopicResult | null {
  const key = getCacheKey(content);
  const entry = classificationCache.get(key);
  
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    classificationCache.delete(key);
    return null;
  }
  
  return entry.result;
}

function setCache(content: string, result: HealthTopicResult): void {
  const key = getCacheKey(content);
  classificationCache.set(key, {
    result,
    timestamp: Date.now(),
  });
  
  // Limit cache size
  if (classificationCache.size > 100) {
    const oldestKey = classificationCache.keys().next().value;
    if (oldestKey) {
      classificationCache.delete(oldestKey);
    }
  }
}

function parseClassificationResponse(response: string): HealthClassification | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (typeof parsed.isHealthRelated !== 'boolean') return null;
    
    const validCategories: HealthCategory[] = ['medical_advice', 'appointment', 'wellness', 'emergency'];
    const category = validCategories.includes(parsed.category) ? parsed.category : 'medical_advice';
    
    return {
      isHealthRelated: parsed.isHealthRelated,
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
      category,
      reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 100) : '',
    };
  } catch {
    console.warn('[LLMHealthDetector] Failed to parse response:', response.slice(0, 200));
    return null;
  }
}

function classificationToHealthTopicResult(classification: HealthClassification): HealthTopicResult {
  // Skip showing card for emergency category (we show helplines instead)
  const shouldSkipEmergency = classification.category === 'emergency';
  
  return {
    detected: classification.isHealthRelated && 
              classification.confidence >= 0.5 && 
              !shouldSkipEmergency,
    category: classification.category,
    confidence: classification.confidence,
    matchedKeywords: [classification.reason],
  };
}

/**
 * Classify health content using LLM
 */
export async function classifyHealthContent(
  content: string,
  options: { signal?: AbortSignal; timeout?: number } = {}
): Promise<HealthTopicResult> {
  const { signal, timeout = 5000 } = options;
  
  if (!content || content.trim().length < 20) {
    return {
      detected: false,
      category: 'medical_advice',
      confidence: 0,
      matchedKeywords: [],
    };
  }
  
  // Check cache first
  const cached = getFromCache(content);
  if (cached) {
    console.log('[LLMHealthDetector] Cache hit');
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
        maxTokens: 200,
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
      const result = classificationToHealthTopicResult(classification);
      console.log('[LLMHealthDetector] Classification result:', {
        detected: result.detected,
        category: result.category,
        confidence: result.confidence.toFixed(2),
        reason: classification.reason,
      });
      setCache(content, result);
      return result;
    }
    
    // Fallback to keyword detection if parsing fails
    console.warn('[LLMHealthDetector] Failed to parse LLM response, falling back to keyword detection');
    return keywordDetectHealthTopic(content);
    
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log('[LLMHealthDetector] Request aborted/timeout, using keyword fallback');
    } else {
      console.warn('[LLMHealthDetector] LLM classification failed, using keyword fallback:', error);
    }
    
    // Fallback to keyword detection
    const fallbackResult = keywordDetectHealthTopic(content);
    setCache(content, fallbackResult);
    return fallbackResult;
  }
}

/**
 * Clear the classification cache
 */
export function clearHealthClassificationCache(): void {
  classificationCache.clear();
}

/**
 * Detect health topic with optional LLM classification
 */
export async function detectHealthTopicWithLLM(
  content: string,
  options: { signal?: AbortSignal; useLLM?: boolean } = {}
): Promise<HealthTopicResult> {
  const { useLLM = true } = options;
  
  if (!useLLM) {
    return keywordDetectHealthTopic(content);
  }
  
  return classifyHealthContent(content, options);
}
