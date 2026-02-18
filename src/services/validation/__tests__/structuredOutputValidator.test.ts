/**
 * Structured Output Validator Tests (Phase 4.2)
 * 
 * Tests for JSON and XML validation.
 */

import { describe, it, expect } from 'vitest';
import {
  detectStructuredOutput,
  validateStructuredOutput,
  toValidationViolations,
} from '../structuredOutputValidator';

describe('structuredOutputValidator', () => {
  // ==========================================================================
  // detectStructuredOutput
  // ==========================================================================
  
  describe('detectStructuredOutput', () => {
    it('should detect JSON object', () => {
      const content = 'Here is the data: {"name": "test", "value": 123}';
      expect(detectStructuredOutput(content)).toBe('json');
    });
    
    it('should detect JSON array', () => {
      const content = 'Results: [1, 2, 3, 4, 5]';
      expect(detectStructuredOutput(content)).toBe('json');
    });
    
    it('should detect JSON in markdown code block', () => {
      const content = '```json\n{"test": true}\n```';
      expect(detectStructuredOutput(content)).toBe('json');
    });
    
    it('should detect XML', () => {
      const content = 'Here is the XML: <root><item>test</item></root>';
      expect(detectStructuredOutput(content)).toBe('xml');
    });
    
    it('should detect XML with declaration', () => {
      const content = '<?xml version="1.0"?><root><item>test</item></root>';
      expect(detectStructuredOutput(content)).toBe('xml');
    });
    
    it('should detect XML in markdown code block', () => {
      const content = '```xml\n<root><item>test</item></root>\n```';
      expect(detectStructuredOutput(content)).toBe('xml');
    });
    
    it('should return none for plain text', () => {
      const content = 'This is just plain text with no structured data.';
      expect(detectStructuredOutput(content)).toBe('none');
    });
    
    it('should prefer JSON when both present and JSON comes first', () => {
      const content = '{"json": true} and also <xml>data</xml>';
      expect(detectStructuredOutput(content)).toBe('json');
    });
  });
  
  // ==========================================================================
  // validateStructuredOutput - JSON
  // ==========================================================================
  
  describe('validateStructuredOutput - JSON', () => {
    it('should validate valid JSON object', () => {
      const content = '{"name": "test", "value": 123}';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('json');
      expect(result.errors).toHaveLength(0);
      expect(result.parsedJson).toEqual({ name: 'test', value: 123 });
    });
    
    it('should validate valid JSON array', () => {
      const content = '[1, 2, 3]';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('json');
      expect(result.parsedJson).toEqual([1, 2, 3]);
    });
    
    it('should detect trailing comma error', () => {
      const content = '{"name": "test",}';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Invalid JSON');
    });
    
    it('should detect missing quote error', () => {
      const content = '{name: "test"}';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should detect unclosed bracket', () => {
      const content = '{"name": "test"';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(false);
    });
    
    it('should warn about empty object', () => {
      const content = '{}';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('Empty JSON object');
    });
    
    it('should warn about empty array', () => {
      const content = '[]';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('Empty JSON array');
    });
    
    it('should warn about deep nesting', () => {
      // Create deeply nested object
      let nested = '{"level": 1';
      for (let i = 2; i <= 15; i++) {
        nested += `, "child": {"level": ${i}`;
      }
      for (let i = 0; i < 15; i++) {
        nested += '}';
      }
      nested += '}';
      
      const result = validateStructuredOutput(nested);
      
      expect(result.isValid).toBe(true);
      const deepWarning = result.warnings.find(w => w.message.includes('Deep JSON nesting'));
      expect(deepWarning).toBeDefined();
    });
  });
  
  // ==========================================================================
  // validateStructuredOutput - XML
  // ==========================================================================
  
  describe('validateStructuredOutput - XML', () => {
    it('should validate valid XML', () => {
      const content = '<root><item>test</item></root>';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('xml');
      expect(result.errors).toHaveLength(0);
    });
    
    it('should validate self-closing tags', () => {
      const content = '<root><item /><item /></root>';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(true);
    });
    
    it('should detect mismatched tags', () => {
      const content = '<root><item>test</wrong></root>';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(false);
      const mismatchError = result.errors.find(e => 
        e.message.toLowerCase().includes('mismatched')
      );
      expect(mismatchError).toBeDefined();
    });
    
    it('should detect unclosed tags', () => {
      const content = '<root><item>test</root>';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(false);
      const unclosedError = result.errors.find(e => 
        e.message.toLowerCase().includes('unclosed')
      );
      expect(unclosedError).toBeDefined();
    });
    
    it('should detect unexpected closing tag', () => {
      const content = '</unexpected><root></root>';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(false);
    });
    
    it('should warn about unescaped ampersand', () => {
      const content = '<root>Test & value</root>';
      const result = validateStructuredOutput(content);
      
      // This might be valid XML depending on implementation
      // but should warn about potential unescaped character
      const ampWarning = result.warnings.find(w => 
        w.message.toLowerCase().includes('ampersand')
      );
      expect(ampWarning).toBeDefined();
    });
  });
  
  // ==========================================================================
  // validateStructuredOutput - None
  // ==========================================================================
  
  describe('validateStructuredOutput - None', () => {
    it('should return valid for plain text', () => {
      const content = 'This is plain text.';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('none');
      expect(result.errors).toHaveLength(0);
    });
  });
  
  // ==========================================================================
  // toValidationViolations
  // ==========================================================================
  
  describe('toValidationViolations', () => {
    it('should convert JSON errors to violations', () => {
      const content = '{"name": "test",}'; // trailing comma
      const result = validateStructuredOutput(content);
      const violations = toValidationViolations(result);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].severity).toBe('error');
      expect(violations[0].category).toBe('structured_json');
    });
    
    it('should convert XML errors to violations', () => {
      const content = '<root><item></wrong></root>';
      const result = validateStructuredOutput(content);
      const violations = toValidationViolations(result);
      
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].category).toBe('structured_xml');
    });
    
    it('should convert warnings to info-level violations', () => {
      const content = '{}'; // empty object
      const result = validateStructuredOutput(content);
      const violations = toValidationViolations(result);
      
      const infoViolation = violations.find(v => v.severity === 'info');
      expect(infoViolation).toBeDefined();
    });
    
    it('should mark all violations as not auto-fixable', () => {
      const content = '{"name": "test",}';
      const result = validateStructuredOutput(content);
      const violations = toValidationViolations(result);
      
      expect(violations.every(v => v.autoFixable === false)).toBe(true);
    });
    
    it('should return empty array for valid content', () => {
      const content = '{"name": "test"}';
      const result = validateStructuredOutput(content);
      const violations = toValidationViolations(result);
      
      expect(violations).toHaveLength(0);
    });
  });
  
  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  
  describe('edge cases', () => {
    it('should handle JSON in markdown with language tag', () => {
      const content = '```json\n{"test": true}\n```';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(true);
      expect(result.format).toBe('json');
    });
    
    it('should handle nested JSON in text', () => {
      const content = 'The response is: {"user": {"name": "Test", "age": 25}}';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(true);
      expect(result.parsedJson).toEqual({ user: { name: 'Test', age: 25 } });
    });
    
    it('should handle mixed content with invalid JSON', () => {
      const content = 'Here is invalid JSON: {invalid}';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(false);
    });
    
    it('should handle XML with attributes', () => {
      const content = '<root attr="value"><item id="1">test</item></root>';
      const result = validateStructuredOutput(content);
      
      expect(result.isValid).toBe(true);
    });
  });
});
