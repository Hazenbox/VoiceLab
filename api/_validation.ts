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
