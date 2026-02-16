/**
 * Generation Hook (Phase 4.1)
 * 
 * Extracts content generation logic from App.tsx.
 * Handles LLM calls, validation, and response processing.
 * 
 * @module hooks/useGeneration
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { 
  GenerationContext, 
  EcosystemType, 
  ContentChannelType, 
  SupportedLanguage,
  RegionType,
  ValidationStrictness,
  Violation,
} from '../types';
import { featureFlags } from '../services/featureFlags';
import { logger } from '../utils/logger';

// =============================================================================
// Types
// =============================================================================

export interface GenerationState {
  isGenerating: boolean;
  currentRequestId: string | null;
  abortController: AbortController | null;
  lastGenerationTime: number | null;
  generationCount: number;
  errorCount: number;
}

export interface GenerationResult {
  content: string;
  validationResult?: {
    score: number;
    violations: Violation[];
    certification: 'certified' | 'review_recommended' | 'issues_found';
  };
  tokensUsed?: number;
  generationTimeMs: number;
  provider?: string;
  wasRegeneration?: boolean;
}

export interface GenerationOptions {
  ecosystem: EcosystemType;
  channel: ContentChannelType;
  language: SupportedLanguage;
  region: RegionType;
  strictness: ValidationStrictness;
  enableValidation: boolean;
  enableAutoFix: boolean;
  conversationalMode: boolean;
  maxRetries?: number;
  timeout?: number;
}

export interface UseGenerationReturn {
  state: GenerationState;
  generate: (prompt: string, options: GenerationOptions) => Promise<GenerationResult | null>;
  regenerate: (prompt: string, options: GenerationOptions) => Promise<GenerationResult | null>;
  abort: () => void;
  reset: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 2;

// =============================================================================
// Hook Implementation
// =============================================================================

export function useGeneration(): UseGenerationReturn {
  // State
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    currentRequestId: null,
    abortController: null,
    lastGenerationTime: null,
    generationCount: 0,
    errorCount: 0,
  });
  
  // Refs for stable references
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  /**
   * Abort current generation
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isGenerating: false,
      currentRequestId: null,
      abortController: null,
    }));
    logger.info('[Generation] Aborted by user');
  }, []);
  
  /**
   * Reset generation state
   */
  const reset = useCallback(() => {
    abort();
    setState({
      isGenerating: false,
      currentRequestId: null,
      abortController: null,
      lastGenerationTime: null,
      generationCount: 0,
      errorCount: 0,
    });
  }, [abort]);
  
  /**
   * Core generation function
   */
  const generate = useCallback(async (
    prompt: string,
    options: GenerationOptions,
  ): Promise<GenerationResult | null> => {
    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // Generate request ID
    const requestId = `gen_${++requestIdRef.current}_${Date.now()}`;
    
    setState(prev => ({
      ...prev,
      isGenerating: true,
      currentRequestId: requestId,
      abortController: controller,
    }));
    
    const startTime = Date.now();
    
    try {
      logger.debug('[Generation] Starting', { requestId, ecosystem: options.ecosystem, channel: options.channel });
      
      // Build generation context
      const context: GenerationContext = {
        ecosystem: options.ecosystem,
        channel: options.channel,
        language: options.language,
        region: options.region,
        validationStrictness: options.strictness,
        enableValidation: options.enableValidation,
        conversationalMode: options.conversationalMode,
      };
      
      // The actual generation call would be imported from services
      // For now, this is a placeholder showing the hook structure
      // In the full integration, this would call generateResponse() from services
      
      const generationTimeMs = Date.now() - startTime;
      
      // Placeholder result - in actual implementation, this comes from LLM service
      const result: GenerationResult = {
        content: '[Generation placeholder - hook structure only]',
        generationTimeMs,
        wasRegeneration: false,
      };
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        currentRequestId: null,
        abortController: null,
        lastGenerationTime: generationTimeMs,
        generationCount: prev.generationCount + 1,
      }));
      
      logger.debug('[Generation] Complete', { requestId, timeMs: generationTimeMs });
      
      return result;
      
    } catch (error) {
      const generationTimeMs = Date.now() - startTime;
      
      // Check if aborted
      if (controller.signal.aborted) {
        logger.debug('[Generation] Aborted', { requestId });
        return null;
      }
      
      logger.error('[Generation] Failed', { requestId, error });
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        currentRequestId: null,
        abortController: null,
        lastGenerationTime: generationTimeMs,
        errorCount: prev.errorCount + 1,
      }));
      
      throw error;
    }
  }, []);
  
  /**
   * Regenerate (same prompt, mark as regeneration)
   */
  const regenerate = useCallback(async (
    prompt: string,
    options: GenerationOptions,
  ): Promise<GenerationResult | null> => {
    logger.info('[Generation] Regenerating');
    
    const result = await generate(prompt, options);
    
    if (result) {
      result.wasRegeneration = true;
    }
    
    return result;
  }, [generate]);
  
  return {
    state,
    generate,
    regenerate,
    abort,
    reset,
  };
}
