import type { VercelResponse } from '@vercel/node';

/**
 * Input Validation Utilities for API Routes
 * Basic validation without external dependencies (no zod to keep serverless bundle small)
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate required string field
 */
export function validateString(
  value: unknown,
  field: string,
  options?: { minLength?: number; maxLength?: number }
): ValidationError | null {
  if (value === undefined || value === null) {
    return { field, message: `${field} is required` };
  }
  
  if (typeof value !== 'string') {
    return { field, message: `${field} must be a string` };
  }
  
  if (options?.minLength && value.length < options.minLength) {
    return { field, message: `${field} must be at least ${options.minLength} characters` };
  }
  
  if (options?.maxLength && value.length > options.maxLength) {
    return { field, message: `${field} must be at most ${options.maxLength} characters` };
  }
  
  return null;
}

/**
 * Validate optional string field
 */
export function validateOptionalString(
  value: unknown,
  field: string,
  options?: { maxLength?: number }
): ValidationError | null {
  if (value === undefined || value === null) {
    return null; // Optional field
  }
  
  if (typeof value !== 'string') {
    return { field, message: `${field} must be a string` };
  }
  
  if (options?.maxLength && value.length > options.maxLength) {
    return { field, message: `${field} must be at most ${options.maxLength} characters` };
  }
  
  return null;
}

/**
 * Validate required array field
 */
export function validateArray(
  value: unknown,
  field: string,
  options?: { minLength?: number; maxLength?: number }
): ValidationError | null {
  if (value === undefined || value === null) {
    return { field, message: `${field} is required` };
  }
  
  if (!Array.isArray(value)) {
    return { field, message: `${field} must be an array` };
  }
  
  if (options?.minLength && value.length < options.minLength) {
    return { field, message: `${field} must have at least ${options.minLength} items` };
  }
  
  if (options?.maxLength && value.length > options.maxLength) {
    return { field, message: `${field} must have at most ${options.maxLength} items` };
  }
  
  return null;
}

/**
 * Validate optional number field
 */
export function validateOptionalNumber(
  value: unknown,
  field: string,
  options?: { min?: number; max?: number }
): ValidationError | null {
  if (value === undefined || value === null) {
    return null; // Optional field
  }
  
  if (typeof value !== 'number' || isNaN(value)) {
    return { field, message: `${field} must be a number` };
  }
  
  if (options?.min !== undefined && value < options.min) {
    return { field, message: `${field} must be at least ${options.min}` };
  }
  
  if (options?.max !== undefined && value > options.max) {
    return { field, message: `${field} must be at most ${options.max}` };
  }
  
  return null;
}

/**
 * Validate LLM request body
 */
export function validateLLMRequest(body: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate messages array
  const messagesError = validateArray(body.messages, 'messages', { minLength: 1, maxLength: 100 });
  if (messagesError) {
    errors.push(messagesError);
  } else if (Array.isArray(body.messages)) {
    // Validate each message
    for (let i = 0; i < body.messages.length; i++) {
      const msg = body.messages[i] as Record<string, unknown>;
      const roleError = validateString(msg.role, `messages[${i}].role`);
      const contentError = validateString(msg.content, `messages[${i}].content`, { maxLength: 100000 });
      
      if (roleError) errors.push(roleError);
      if (contentError) errors.push(contentError);
    }
  }
  
  // Validate optional fields
  const tempError = validateOptionalNumber(body.temperature, 'temperature', { min: 0, max: 2 });
  if (tempError) errors.push(tempError);
  
  const maxTokensError = validateOptionalNumber(body.max_tokens, 'max_tokens', { min: 1, max: 128000 });
  if (maxTokensError) errors.push(maxTokensError);
  
  const topPError = validateOptionalNumber(body.top_p, 'top_p', { min: 0, max: 1 });
  if (topPError) errors.push(topPError);
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate TTS request body
 */
export function validateTTSRequest(body: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate text field
  const textError = validateString(body.text, 'text', { minLength: 1, maxLength: 5000 });
  if (textError) errors.push(textError);
  
  // Validate optional provider
  const providerError = validateOptionalString(body.provider, 'provider', { maxLength: 50 });
  if (providerError) errors.push(providerError);
  
  return { valid: errors.length === 0, errors };
}

/**
 * Validate Inworld request body
 */
export function validateInworldRequest(body: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate text field
  const textError = validateString(body.text, 'text', { minLength: 1, maxLength: 10000 });
  if (textError) errors.push(textError);
  
  return { valid: errors.length === 0, errors };
}

/**
 * Send validation error response
 */
export function sendValidationError(res: VercelResponse, errors: ValidationError[]): void {
  res.status(400).json({
    error: 'Validation failed',
    details: errors,
  });
}

// ── Prompt Injection Detection ─────────────────────────────────────────

/**
 * Patterns that indicate potential prompt injection attacks.
 * These patterns attempt to:
 * - Override system instructions
 * - Extract system prompts
 * - Change model behavior
 * - Bypass safety measures
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Instruction override attempts
  /ignore\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions?|prompts?|rules?|guidelines?)/i,
  /disregard\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions?|prompts?|rules?|guidelines?)/i,
  /forget\s+(?:everything|all|your)\s+(?:instructions?|prompts?|rules?|training)/i,
  
  // System prompt extraction
  /(?:reveal|show|display|print|output|repeat)\s+(?:your\s+)?(?:system|hidden|secret|internal)\s+(?:prompt|instructions?|rules?)/i,
  /what\s+(?:is|are)\s+your\s+(?:system|hidden|secret|internal)\s+(?:prompt|instructions?|rules?)/i,
  /(?:copy|paste|echo)\s+(?:the\s+)?(?:system|initial)\s+(?:prompt|message)/i,
  
  // Role manipulation
  /you\s+are\s+now\s+(?:a|an|acting\s+as|pretending\s+to\s+be)/i,
  /from\s+now\s+on[,\s]+(?:you\s+)?(?:are|will\s+be|act\s+as)/i,
  /(?:pretend|imagine|act)\s+(?:that\s+)?you\s+(?:are|were|have)/i,
  
  // Constraint bypass
  /override\s+(?:all\s+)?(?:safety|security|content)\s+(?:measures?|filters?|rules?|constraints?)/i,
  /bypass\s+(?:all\s+)?(?:safety|security|content)\s+(?:measures?|filters?|rules?|constraints?)/i,
  /disable\s+(?:all\s+)?(?:safety|security|content)\s+(?:measures?|filters?|rules?|constraints?)/i,
  
  // Jailbreak patterns
  /(?:dan|developer|admin)\s+mode/i,
  /(?:unlock|enable)\s+(?:full|unrestricted)\s+(?:access|mode)/i,
  /(?:no\s+)?(?:rules?|restrictions?|limits?|boundaries)/i,
  
  // Data exfiltration attempts
  /(?:list|enumerate|show)\s+(?:all\s+)?(?:api\s+)?(?:keys?|tokens?|secrets?|credentials?)/i,
  /(?:what|which)\s+(?:api\s+)?(?:keys?|tokens?|secrets?)\s+(?:do\s+you|are\s+you)/i,
];

/**
 * Check if a message contains potential prompt injection.
 * Returns true if injection detected, false otherwise.
 */
export function detectPromptInjection(message: string): boolean {
  // Normalize message (remove extra whitespace, convert to lower for checking)
  const normalizedMessage = message
    .replace(/\s+/g, ' ')
    .trim();
  
  // Check against all patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(normalizedMessage)) {
      return true;
    }
  }
  
  // Check for suspicious character sequences that might hide injection
  // (e.g., unicode characters that look like ASCII but aren't)
  if (containsSuspiciousUnicode(normalizedMessage)) {
    return true;
  }
  
  return false;
}

/**
 * Check for suspicious Unicode characters that might be used to hide injection.
 */
function containsSuspiciousUnicode(text: string): boolean {
  // Check for zero-width characters (often used to hide text)
  const zeroWidthPattern = /[\u200B-\u200D\uFEFF\u2060]/;
  if (zeroWidthPattern.test(text)) {
    return true;
  }
  
  // Check for homoglyph characters (characters that look like ASCII but aren't)
  // Common in "look-alike" attacks
  const homoglyphPattern = /[\u0430\u0435\u043E\u0440\u0441\u0443\u0445]/; // Cyrillic look-alikes
  if (homoglyphPattern.test(text)) {
    return true;
  }
  
  return false;
}

/**
 * Get a safe excerpt from message for logging (truncated, no sensitive data).
 */
export function getSafeMessageExcerpt(message: string, maxLength: number = 100): string {
  if (message.length <= maxLength) {
    return message;
  }
  return message.substring(0, maxLength) + '...';
}

/**
 * Validate a generate request with full injection detection.
 */
export function validateGenerateRequest(body: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Basic structure validation
  if (!body.input || typeof body.input !== 'object') {
    errors.push({ field: 'input', message: 'input object is required' });
    return { valid: false, errors };
  }
  
  const input = body.input as Record<string, unknown>;
  
  // Validate message
  const messageError = validateString(input.message, 'input.message', { minLength: 1, maxLength: 50000 });
  if (messageError) {
    errors.push(messageError);
  } else if (typeof input.message === 'string') {
    // Check for prompt injection
    if (detectPromptInjection(input.message)) {
      console.warn(`[Validation] Potential prompt injection detected: "${getSafeMessageExcerpt(input.message)}"`);
      errors.push({ 
        field: 'input.message', 
        message: 'Message contains disallowed patterns' 
      });
    }
  }
  
  // Validate required fields
  if (!input.ecosystem || typeof input.ecosystem !== 'string') {
    errors.push({ field: 'input.ecosystem', message: 'ecosystem is required' });
  }
  
  if (!input.contentChannel || typeof input.contentChannel !== 'string') {
    errors.push({ field: 'input.contentChannel', message: 'contentChannel is required' });
  }
  
  // Validate optional numeric fields
  const tempError = validateOptionalNumber(input.temperature, 'input.temperature', { min: 0, max: 2 });
  if (tempError) errors.push(tempError);
  
  const maxTokensError = validateOptionalNumber(input.maxTokens, 'input.maxTokens', { min: 1, max: 128000 });
  if (maxTokensError) errors.push(maxTokensError);
  
  // Validate conversation history if provided
  if (input.conversationHistory !== undefined) {
    const historyError = validateArray(input.conversationHistory, 'input.conversationHistory', { maxLength: 50 });
    if (historyError) {
      errors.push(historyError);
    } else if (Array.isArray(input.conversationHistory)) {
      // Check each message in history for injection
      for (let i = 0; i < input.conversationHistory.length; i++) {
        const msg = input.conversationHistory[i] as Record<string, unknown>;
        if (typeof msg.content === 'string' && detectPromptInjection(msg.content)) {
          console.warn(`[Validation] Potential injection in history[${i}]: "${getSafeMessageExcerpt(msg.content as string)}"`);
          errors.push({ 
            field: `input.conversationHistory[${i}].content`, 
            message: 'Message contains disallowed patterns' 
          });
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}
