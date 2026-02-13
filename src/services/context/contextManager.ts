/**
 * Context Manager
 * 
 * Manages conversation context with automatic truncation when approaching
 * token limits. Integrates with token estimation to prevent overflow.
 * 
 * @module services/context/contextManager
 */

import {
  estimateRequestTokens,
  truncateConversationHistory,
  getContextLimit,
  suggestOptimalConfig,
  type TokenEstimate,
  type ModelType,
} from '../tokens/tokenEstimator';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const CONTEXT_MANAGER_CONFIG = {
  /** Auto-truncate when usage exceeds this percentage */
  autoTruncateThreshold: 85,
  /** Target usage after truncation */
  targetUsageAfterTruncate: 70,
  /** Minimum messages to always keep */
  minMessagesToKeep: 4,
  /** Whether to preserve the first message (often contains context) */
  preserveFirstMessage: true,
  /** Log truncation events */
  logTruncation: true,
  /** Maximum conversation history tokens as percentage of context */
  maxHistoryPercentage: 60,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  id?: string;
}

export interface ContextManagerInput {
  /** System prompt/instructions */
  systemPrompt: string;
  /** Full conversation history */
  conversationHistory: Message[];
  /** Current user message */
  userMessage: string;
  /** Knowledge/RAG context */
  knowledgeContext?: string;
  /** Additional context */
  additionalContext?: string;
  /** Target model */
  model?: ModelType;
}

export interface ContextManagerResult {
  /** Processed (possibly truncated) conversation history */
  processedHistory: Message[];
  /** Token estimate after processing */
  estimate: TokenEstimate;
  /** Whether truncation was applied */
  wasTruncated: boolean;
  /** Number of messages removed */
  messagesRemoved: number;
  /** Approximate tokens saved */
  tokensSaved: number;
  /** Warnings or recommendations */
  warnings: string[];
}

export interface TruncationEvent {
  timestamp: number;
  originalMessageCount: number;
  finalMessageCount: number;
  originalTokens: number;
  finalTokens: number;
  reason: 'auto_threshold' | 'overflow' | 'manual';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ContextManager {
  private model: ModelType;
  private truncationHistory: TruncationEvent[] = [];
  
  constructor(model: ModelType = 'default') {
    this.model = model;
  }
  
  /**
   * Process context with automatic truncation if needed
   */
  process(input: ContextManagerInput): ContextManagerResult {
    const model = input.model || this.model;
    const contextLimit = getContextLimit(model);
    
    // First, estimate current usage
    const initialEstimate = estimateRequestTokens({
      systemPrompt: input.systemPrompt,
      conversationHistory: input.conversationHistory,
      userMessage: input.userMessage,
      knowledgeContext: input.knowledgeContext,
      additionalContext: input.additionalContext,
      model,
    });
    
    const warnings: string[] = [];
    let processedHistory = input.conversationHistory;
    let wasTruncated = false;
    let messagesRemoved = 0;
    let tokensSaved = 0;
    
    // Check if truncation is needed
    const shouldTruncate = 
      initialEstimate.status === 'overflow' ||
      initialEstimate.status === 'critical' ||
      initialEstimate.usagePercent >= CONTEXT_MANAGER_CONFIG.autoTruncateThreshold;
    
    if (shouldTruncate && input.conversationHistory.length > CONTEXT_MANAGER_CONFIG.minMessagesToKeep) {
      // Calculate target token budget for conversation history
      const optimalConfig = suggestOptimalConfig(initialEstimate);
      const targetHistoryTokens = Math.min(
        optimalConfig.maxConversationTokens,
        contextLimit * (CONTEXT_MANAGER_CONFIG.targetUsageAfterTruncate / 100) - 
          initialEstimate.breakdown.systemPrompt - 
          initialEstimate.breakdown.userMessage -
          initialEstimate.breakdown.knowledgeContext -
          initialEstimate.breakdown.other
      );
      
      // Truncate conversation history
      processedHistory = truncateConversationHistory(
        input.conversationHistory,
        targetHistoryTokens,
        {
          preserveFirst: CONTEXT_MANAGER_CONFIG.preserveFirstMessage,
          minMessages: CONTEXT_MANAGER_CONFIG.minMessagesToKeep,
        }
      );
      
      wasTruncated = processedHistory.length < input.conversationHistory.length;
      messagesRemoved = input.conversationHistory.length - processedHistory.length;
      
      if (wasTruncated) {
        // Calculate tokens saved
        const newEstimate = estimateRequestTokens({
          systemPrompt: input.systemPrompt,
          conversationHistory: processedHistory,
          userMessage: input.userMessage,
          knowledgeContext: input.knowledgeContext,
          additionalContext: input.additionalContext,
          model,
        });
        
        tokensSaved = initialEstimate.totalTokens - newEstimate.totalTokens;
        
        // Log truncation event
        if (CONTEXT_MANAGER_CONFIG.logTruncation) {
          const event: TruncationEvent = {
            timestamp: Date.now(),
            originalMessageCount: input.conversationHistory.length,
            finalMessageCount: processedHistory.length,
            originalTokens: initialEstimate.totalTokens,
            finalTokens: newEstimate.totalTokens,
            reason: initialEstimate.status === 'overflow' ? 'overflow' : 'auto_threshold',
          };
          this.truncationHistory.push(event);
          
          console.log(
            `[ContextManager] Truncated conversation: ${messagesRemoved} messages removed, ` +
            `${tokensSaved} tokens saved (${initialEstimate.usagePercent.toFixed(1)}% -> ${newEstimate.usagePercent.toFixed(1)}%)`
          );
        }
        
        warnings.push(
          `Conversation history truncated: ${messagesRemoved} older messages removed to prevent context overflow.`
        );
      }
    }
    
    // Final estimate
    const finalEstimate = wasTruncated
      ? estimateRequestTokens({
          systemPrompt: input.systemPrompt,
          conversationHistory: processedHistory,
          userMessage: input.userMessage,
          knowledgeContext: input.knowledgeContext,
          additionalContext: input.additionalContext,
          model,
        })
      : initialEstimate;
    
    // Add any recommendations from the estimate
    warnings.push(...finalEstimate.recommendations);
    
    return {
      processedHistory,
      estimate: finalEstimate,
      wasTruncated,
      messagesRemoved,
      tokensSaved,
      warnings,
    };
  }
  
  /**
   * Check if context would overflow without truncation
   */
  wouldOverflow(input: ContextManagerInput): boolean {
    const estimate = estimateRequestTokens({
      systemPrompt: input.systemPrompt,
      conversationHistory: input.conversationHistory,
      userMessage: input.userMessage,
      knowledgeContext: input.knowledgeContext,
      additionalContext: input.additionalContext,
      model: input.model || this.model,
    });
    
    return estimate.status === 'overflow' || estimate.status === 'critical';
  }
  
  /**
   * Get recommended max messages for current configuration
   */
  getRecommendedMaxMessages(
    systemPrompt: string,
    avgMessageLength: number = 200
  ): number {
    const contextLimit = getContextLimit(this.model);
    const systemTokens = Math.ceil(systemPrompt.length / 4);
    const maxHistoryTokens = contextLimit * (CONTEXT_MANAGER_CONFIG.maxHistoryPercentage / 100);
    const availableTokens = maxHistoryTokens - systemTokens;
    const avgMessageTokens = Math.ceil(avgMessageLength / 4) + 4; // +4 for role overhead
    
    return Math.max(
      CONTEXT_MANAGER_CONFIG.minMessagesToKeep,
      Math.floor(availableTokens / avgMessageTokens)
    );
  }
  
  /**
   * Get truncation history for analytics
   */
  getTruncationHistory(): TruncationEvent[] {
    return [...this.truncationHistory];
  }
  
  /**
   * Clear truncation history
   */
  clearTruncationHistory(): void {
    this.truncationHistory = [];
  }
  
  /**
   * Set model (updates context limits)
   */
  setModel(model: ModelType): void {
    this.model = model;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

let contextManagerInstance: ContextManager | null = null;

/**
 * Get the context manager singleton
 */
export function getContextManager(model?: ModelType): ContextManager {
  if (!contextManagerInstance) {
    contextManagerInstance = new ContextManager(model);
  } else if (model) {
    contextManagerInstance.setModel(model);
  }
  return contextManagerInstance;
}

/**
 * Process context with automatic truncation (convenience function)
 */
export function processContext(input: ContextManagerInput): ContextManagerResult {
  return getContextManager(input.model).process(input);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT HOOK HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a message truncation function for React hooks
 * 
 * @example
 * ```tsx
 * const truncateIfNeeded = createMessageTruncator('gemini_flash', systemPrompt);
 * 
 * // In your send handler:
 * const processedMessages = truncateIfNeeded(messages, userMessage);
 * ```
 */
export function createMessageTruncator(
  model: ModelType,
  systemPrompt: string,
  knowledgeContext?: string
) {
  return (
    messages: Message[],
    userMessage: string
  ): { messages: Message[]; wasTruncated: boolean } => {
    const result = processContext({
      systemPrompt,
      conversationHistory: messages,
      userMessage,
      knowledgeContext,
      model,
    });
    
    return {
      messages: result.processedHistory,
      wasTruncated: result.wasTruncated,
    };
  };
}
