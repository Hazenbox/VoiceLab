/**
 * Structured Output Validator (Phase 2.5)
 * 
 * Validates JSON and XML structured output for well-formedness.
 * Ensures LLM-generated structured data is parseable and correct.
 * 
 * @module services/validation/structuredOutputValidator
 */

import type { ViolationSeverity } from '../../types';

// =============================================================================
// Types
// =============================================================================

export interface StructuredOutputValidation {
  isValid: boolean;
  format: 'json' | 'xml' | 'unknown' | 'none';
  errors: StructuredOutputError[];
  warnings: StructuredOutputWarning[];
  /** For JSON: parsed object if valid */
  parsedJson?: unknown;
  /** Raw extracted structured content */
  extractedContent?: string;
}

export interface StructuredOutputError {
  severity: ViolationSeverity;
  message: string;
  position?: number;
  line?: number;
  column?: number;
  suggestion: string;
}

export interface StructuredOutputWarning {
  message: string;
  suggestion: string;
}

// =============================================================================
// JSON Validation
// =============================================================================

/**
 * Extract JSON from content (handles markdown code blocks)
 */
function extractJson(content: string): { json: string; startIndex: number } | null {
  // Check for markdown code block with JSON
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const startIndex = content.indexOf(codeBlockMatch[0]);
    return {
      json: codeBlockMatch[1].trim(),
      startIndex,
    };
  }
  
  // Check for raw JSON object
  const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    return {
      json: jsonObjectMatch[0],
      startIndex: content.indexOf(jsonObjectMatch[0]),
    };
  }
  
  // Check for raw JSON array
  const jsonArrayMatch = content.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch) {
    return {
      json: jsonArrayMatch[0],
      startIndex: content.indexOf(jsonArrayMatch[0]),
    };
  }
  
  return null;
}

/**
 * Parse JSON position from error message
 */
function parseJsonErrorPosition(errorMessage: string, jsonString: string): { line: number; column: number } | null {
  // Standard JSON.parse error: "at position X"
  const posMatch = errorMessage.match(/at position (\d+)/);
  if (posMatch) {
    const position = parseInt(posMatch[1], 10);
    let line = 1;
    let column = 1;
    
    for (let i = 0; i < position && i < jsonString.length; i++) {
      if (jsonString[i] === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
    
    return { line, column };
  }
  
  return null;
}

/**
 * Validate JSON structure and content
 */
function validateJson(jsonString: string): {
  isValid: boolean;
  parsed?: unknown;
  errors: StructuredOutputError[];
  warnings: StructuredOutputWarning[];
} {
  const errors: StructuredOutputError[] = [];
  const warnings: StructuredOutputWarning[] = [];
  
  try {
    const parsed = JSON.parse(jsonString);
    
    // JSON is valid - check for common issues
    
    // Check for empty object/array at root
    if (typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed) && parsed.length === 0) {
        warnings.push({
          message: 'Empty JSON array',
          suggestion: 'Verify this is intentional',
        });
      } else if (!Array.isArray(parsed) && Object.keys(parsed).length === 0) {
        warnings.push({
          message: 'Empty JSON object',
          suggestion: 'Verify this is intentional',
        });
      }
    }
    
    // Check for very deep nesting (potential issue)
    const maxDepth = getJsonDepth(parsed);
    if (maxDepth > 10) {
      warnings.push({
        message: `Deep JSON nesting detected (depth: ${maxDepth})`,
        suggestion: 'Consider flattening structure for easier processing',
      });
    }
    
    // Check for null values (might be unintentional)
    const nullCount = countNullValues(parsed);
    if (nullCount > 5) {
      warnings.push({
        message: `Multiple null values in JSON (${nullCount} found)`,
        suggestion: 'Verify null values are intentional vs missing data',
      });
    }
    
    return { isValid: true, parsed, errors, warnings };
    
  } catch (parseError) {
    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
    const position = parseJsonErrorPosition(errorMessage, jsonString);
    
    errors.push({
      severity: 'error',
      message: `Invalid JSON: ${errorMessage}`,
      line: position?.line,
      column: position?.column,
      suggestion: getSuggestionForJsonError(errorMessage, jsonString),
    });
    
    return { isValid: false, errors, warnings };
  }
}

/**
 * Get suggestion for common JSON errors
 */
function getSuggestionForJsonError(errorMessage: string, jsonString: string): string {
  const lowerError = errorMessage.toLowerCase();
  
  if (lowerError.includes('unexpected token')) {
    // Check for trailing comma
    if (/,\s*[}\]]/.test(jsonString)) {
      return 'Remove trailing comma before closing bracket';
    }
    // Check for single quotes
    if (/'/.test(jsonString)) {
      return 'Use double quotes instead of single quotes for strings';
    }
    // Check for unquoted keys
    if (/\{\s*[a-zA-Z_]/.test(jsonString) && !/"[a-zA-Z_]/.test(jsonString)) {
      return 'Property names must be enclosed in double quotes';
    }
    return 'Check for syntax errors (missing quotes, commas, or brackets)';
  }
  
  if (lowerError.includes('unexpected end')) {
    return 'JSON is incomplete - missing closing bracket or brace';
  }
  
  if (lowerError.includes('duplicate key')) {
    return 'Remove duplicate keys in object';
  }
  
  return 'Verify JSON syntax - use a JSON validator for details';
}

/**
 * Get maximum nesting depth of JSON
 */
function getJsonDepth(obj: unknown, currentDepth = 0): number {
  if (typeof obj !== 'object' || obj === null) {
    return currentDepth;
  }
  
  let maxDepth = currentDepth;
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      maxDepth = Math.max(maxDepth, getJsonDepth(item, currentDepth + 1));
    }
  } else {
    for (const value of Object.values(obj)) {
      maxDepth = Math.max(maxDepth, getJsonDepth(value, currentDepth + 1));
    }
  }
  
  return maxDepth;
}

/**
 * Count null values in JSON
 */
function countNullValues(obj: unknown): number {
  if (obj === null) return 1;
  if (typeof obj !== 'object') return 0;
  
  let count = 0;
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      count += countNullValues(item);
    }
  } else {
    for (const value of Object.values(obj as Record<string, unknown>)) {
      count += countNullValues(value);
    }
  }
  
  return count;
}

// =============================================================================
// XML Validation
// =============================================================================

/**
 * Extract XML from content
 */
function extractXml(content: string): { xml: string; startIndex: number } | null {
  // Check for markdown code block with XML
  const codeBlockMatch = content.match(/```(?:xml|html)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    if (inner.startsWith('<')) {
      return {
        xml: inner,
        startIndex: content.indexOf(codeBlockMatch[0]),
      };
    }
  }
  
  // Check for XML declaration or root element
  const xmlMatch = content.match(/(<\?xml[\s\S]*?\?>)?[\s\S]*?<[a-zA-Z_][\w-]*[\s\S]*<\/[a-zA-Z_][\w-]*>/);
  if (xmlMatch) {
    return {
      xml: xmlMatch[0],
      startIndex: content.indexOf(xmlMatch[0]),
    };
  }
  
  // Check for self-closing tags
  const selfClosingMatch = content.match(/<[a-zA-Z_][\w-]*[^>]*\/>/);
  if (selfClosingMatch) {
    return {
      xml: selfClosingMatch[0],
      startIndex: content.indexOf(selfClosingMatch[0]),
    };
  }
  
  return null;
}

/**
 * Validate XML structure
 * Note: This is a lightweight validation - not a full XML parser
 */
function validateXml(xmlString: string): {
  isValid: boolean;
  errors: StructuredOutputError[];
  warnings: StructuredOutputWarning[];
} {
  const errors: StructuredOutputError[] = [];
  const warnings: StructuredOutputWarning[] = [];
  
  // Track tag stack for matching
  const tagStack: { name: string; line: number }[] = [];
  let currentLine = 1;
  let lastIndex = 0;
  
  // Remove XML declaration for processing
  const processXml = xmlString.replace(/<\?xml[^?]*\?>\s*/g, '');
  
  // Find all tags
  const tagRegex = /<\/?([a-zA-Z_][\w-]*)([^>]*?)(\/?)\s*>/g;
  let match: RegExpExecArray | null;
  
  while ((match = tagRegex.exec(processXml)) !== null) {
    // Update line count
    const substring = processXml.substring(lastIndex, match.index);
    currentLine += (substring.match(/\n/g) || []).length;
    lastIndex = match.index;
    
    const [fullMatch, tagName, attributes, selfClosing] = match;
    const isClosing = fullMatch.startsWith('</');
    const isSelfClosing = selfClosing === '/' || fullMatch.endsWith('/>');
    
    if (isClosing) {
      // Closing tag - check stack
      if (tagStack.length === 0) {
        errors.push({
          severity: 'error',
          message: `Unexpected closing tag </${tagName}> - no matching opening tag`,
          line: currentLine,
          suggestion: `Remove the closing tag or add opening <${tagName}>`,
        });
      } else {
        const lastOpen = tagStack.pop()!;
        if (lastOpen.name !== tagName) {
          errors.push({
            severity: 'error',
            message: `Mismatched tags: <${lastOpen.name}> (line ${lastOpen.line}) closed with </${tagName}>`,
            line: currentLine,
            suggestion: `Change to </${lastOpen.name}> or fix opening tag`,
          });
        }
      }
    } else if (!isSelfClosing) {
      // Opening tag - push to stack
      tagStack.push({ name: tagName, line: currentLine });
    }
    
    // Check for common attribute issues
    if (attributes) {
      // Check for unquoted attribute values
      const unquotedAttr = attributes.match(/\s([a-zA-Z_][\w-]*)=([^"'\s>][^\s>]*)/);
      if (unquotedAttr) {
        errors.push({
          severity: 'warning',
          message: `Unquoted attribute value: ${unquotedAttr[1]}=${unquotedAttr[2]}`,
          line: currentLine,
          suggestion: 'Enclose attribute value in quotes',
        });
      }
      
      // Check for duplicate attributes
      const attrNames = attributes.match(/\s([a-zA-Z_][\w-]*)\s*=/g);
      if (attrNames) {
        const names = attrNames.map(a => a.trim().replace('=', ''));
        const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
        if (duplicates.length > 0) {
          errors.push({
            severity: 'error',
            message: `Duplicate attribute: ${duplicates[0]}`,
            line: currentLine,
            suggestion: 'Remove duplicate attribute',
          });
        }
      }
    }
  }
  
  // Check for unclosed tags
  if (tagStack.length > 0) {
    for (const unclosed of tagStack) {
      errors.push({
        severity: 'error',
        message: `Unclosed tag <${unclosed.name}> opened at line ${unclosed.line}`,
        suggestion: `Add closing tag </${unclosed.name}>`,
      });
    }
  }
  
  // Check for unescaped characters
  if (processXml.includes('&') && !processXml.match(/&(amp|lt|gt|apos|quot|#\d+|#x[a-fA-F0-9]+);/)) {
    warnings.push({
      message: 'Possible unescaped ampersand (&) character',
      suggestion: 'Use &amp; for literal ampersand characters',
    });
  }
  
  if (/<[^>]*</.test(processXml)) {
    errors.push({
      severity: 'error',
      message: 'Unescaped < character found inside tag or content',
      suggestion: 'Use &lt; for literal less-than characters',
    });
  }
  
  return {
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// Main Validator
// =============================================================================

/**
 * Detect if content contains structured output (JSON or XML)
 */
export function detectStructuredOutput(content: string): 'json' | 'xml' | 'none' {
  const jsonExtract = extractJson(content);
  const xmlExtract = extractXml(content);
  
  // If both found, prefer the one that appears first
  if (jsonExtract && xmlExtract) {
    return jsonExtract.startIndex <= xmlExtract.startIndex ? 'json' : 'xml';
  }
  
  if (jsonExtract) return 'json';
  if (xmlExtract) return 'xml';
  
  return 'none';
}

/**
 * Validate structured output in content
 */
export function validateStructuredOutput(content: string): StructuredOutputValidation {
  const format = detectStructuredOutput(content);
  
  if (format === 'none') {
    return {
      isValid: true,
      format: 'none',
      errors: [],
      warnings: [],
    };
  }
  
  if (format === 'json') {
    const extracted = extractJson(content);
    if (!extracted) {
      return {
        isValid: false,
        format: 'json',
        errors: [{ 
          severity: 'error', 
          message: 'Could not extract JSON from content',
          suggestion: 'Ensure JSON is properly formatted with {} or []',
        }],
        warnings: [],
      };
    }
    
    const validation = validateJson(extracted.json);
    return {
      isValid: validation.isValid,
      format: 'json',
      errors: validation.errors,
      warnings: validation.warnings,
      parsedJson: validation.parsed,
      extractedContent: extracted.json,
    };
  }
  
  if (format === 'xml') {
    const extracted = extractXml(content);
    if (!extracted) {
      return {
        isValid: false,
        format: 'xml',
        errors: [{ 
          severity: 'error', 
          message: 'Could not extract XML from content',
          suggestion: 'Ensure XML has proper opening and closing tags',
        }],
        warnings: [],
      };
    }
    
    const validation = validateXml(extracted.xml);
    return {
      isValid: validation.isValid,
      format: 'xml',
      errors: validation.errors,
      warnings: validation.warnings,
      extractedContent: extracted.xml,
    };
  }
  
  return {
    isValid: false,
    format: 'unknown',
    errors: [{ 
      severity: 'error', 
      message: 'Unknown structured output format',
      suggestion: 'Use standard JSON or XML format',
    }],
    warnings: [],
  };
}

/**
 * Convert structured output validation to violations for pipeline
 */
export function toValidationViolations(validation: StructuredOutputValidation): Array<{
  severity: ViolationSeverity;
  rule: string;
  text: string;
  suggestion: string;
  category: string;
  autoFixable: boolean;
}> {
  const violations: Array<{
    severity: ViolationSeverity;
    rule: string;
    text: string;
    suggestion: string;
    category: string;
    autoFixable: boolean;
  }> = [];
  
  for (const error of validation.errors) {
    violations.push({
      severity: error.severity,
      rule: `Structured output (${validation.format}): ${error.message}`,
      text: error.line ? `Line ${error.line}${error.column ? `, col ${error.column}` : ''}` : error.message,
      suggestion: error.suggestion,
      category: `structured_${validation.format}`,
      autoFixable: false,
    });
  }
  
  for (const warning of validation.warnings) {
    violations.push({
      severity: 'info',
      rule: `Structured output (${validation.format}): ${warning.message}`,
      text: warning.message,
      suggestion: warning.suggestion,
      category: `structured_${validation.format}`,
      autoFixable: false,
    });
  }
  
  return violations;
}
