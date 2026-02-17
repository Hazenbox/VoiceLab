/**
 * UX Microcopy Agent
 * Validates CTA verb format, dead-end detection, error message structure
 */

import type { ValidationAgent, PatternRule, ValidationViolation } from '../types';
import { runPatterns } from './helpers';

const UX_MICROCOPY_PATTERNS: PatternRule[] = [
  // CTA Verb Format Validation
  { id: 'ux-001', pattern: /\b(click|tap)\s+here\b/gi, severity: 'warning', rule: 'Vague CTA: use descriptive action', suggestion: 'Replace with specific action like "View plans" or "Check status"', category: 'cta_format' },
  { id: 'ux-002', pattern: /\bsubmit\b(?!\s+(a\s+)?(complaint|ticket|request|feedback))/gi, severity: 'info', rule: 'Generic CTA: consider specific action', suggestion: 'Use context-specific verb like "Send message", "Place order"', category: 'cta_format' },
  { id: 'ux-003', pattern: /\b(press|push)\s+(the\s+)?button\b/gi, severity: 'warning', rule: 'Redundant CTA instruction', suggestion: 'Name the action directly: "Recharge" instead of "Press the recharge button"', category: 'cta_format' },
  { id: 'ux-004', pattern: /\byou\s+can\s+(also\s+)?(click|tap|select|choose)\b/gi, severity: 'info', rule: 'Passive CTA phrasing', suggestion: 'Use direct imperative: "Select your plan" instead of "You can select"', category: 'cta_format' },
  { id: 'ux-005', pattern: /\bif\s+you\s+(want|wish)\s+to\b/gi, severity: 'info', rule: 'Conditional CTA weakens action', suggestion: 'Use confident imperative when action is recommended', category: 'cta_format' },
  { id: 'ux-006', pattern: /\b(go\s+ahead\s+and)\b/gi, severity: 'info', rule: 'Filler phrase before CTA', suggestion: 'Remove filler: directly state the action', category: 'cta_format' },
  
  // Dead-End Detection
  { id: 'ux-007', pattern: /\b(cannot|can['']?t)\s+(be\s+)?(done|helped|processed|completed)\s*\.?\s*$/gim, severity: 'error', rule: 'Dead-end: no alternative offered', suggestion: 'Add alternative action or escalation path', category: 'dead_end' },
  { id: 'ux-008', pattern: /\bnot\s+(possible|available|supported)\s*\.?\s*$/gim, severity: 'error', rule: 'Dead-end: no next step', suggestion: 'Explain alternatives or when it will be available', category: 'dead_end' },
  { id: 'ux-009', pattern: /\bwe\s+(cannot|can['']?t)\s+do\s+that\s*\.?\s*$/gim, severity: 'error', rule: 'Negative dead-end', suggestion: 'Rephrase with what CAN be done instead', category: 'dead_end' },
  { id: 'ux-010', pattern: /\b(error|failed|issue)\s+occurred\s*\.?\s*$/gim, severity: 'error', rule: 'Error without guidance', suggestion: 'Add what user should do next', category: 'dead_end' },
  { id: 'ux-011', pattern: /\bsomething\s+went\s+wrong\s*\.?\s*$/gim, severity: 'error', rule: 'Vague error with no action', suggestion: 'Be specific and offer retry/alternative', category: 'dead_end' },
  { id: 'ux-012', pattern: /\bcontact\s+(us|support|customer\s+care)\s*\.?\s*$/gim, severity: 'warning', rule: 'Contact dead-end', suggestion: 'Provide specific contact method (number, chat link) or try self-service first', category: 'dead_end' },
  
  // Error Message Structure
  { id: 'ux-013', pattern: /\b(exception|stack\s*trace|null\s*pointer|undefined|NaN|syntax\s*error)\b/gi, severity: 'error', rule: 'Technical jargon in error message', suggestion: 'Use user-friendly language: "Something went wrong" + clear next step', category: 'error_structure' },
  { id: 'ux-014', pattern: /\berror\s+(code|number)?\s*[:=]?\s*[A-Z0-9_-]{4,}/gi, severity: 'warning', rule: 'Raw error code in user message', suggestion: 'Translate error code to human-readable message (keep code in logs)', category: 'error_structure' },
  { id: 'ux-015', pattern: /\b(500|404|403|401|400)\s*(error|status)\b/gi, severity: 'warning', rule: 'HTTP status codes in user message', suggestion: 'Use friendly description instead of technical codes', category: 'error_structure' },
  { id: 'ux-016', pattern: /\byou\s+(entered|typed|provided)\s+(wrong|incorrect|invalid)\b/gi, severity: 'warning', rule: 'Blaming user for error', suggestion: 'Focus on what to do: "Please check the number and try again"', category: 'error_structure' },
  { id: 'ux-017', pattern: /\buser\s+error\b/gi, severity: 'error', rule: 'Direct user blame', suggestion: 'Never blame user - focus on solution', category: 'error_structure' },
  { id: 'ux-018', pattern: /\byour\s+fault\b/gi, severity: 'error', rule: 'Accusatory error message', suggestion: 'Remove blame, offer help', category: 'error_structure' },
  { id: 'ux-019', pattern: /\binvalid\s+(input|data|value|format)\s*\.?\s*$/gim, severity: 'warning', rule: 'Invalid without explanation', suggestion: 'Explain what format is expected', category: 'error_structure' },
  { id: 'ux-020', pattern: /\b(request|operation)\s+failed\s*\.?\s*$/gim, severity: 'warning', rule: 'Failed without next step', suggestion: 'Add retry option or alternative action', category: 'error_structure' },
  
  // Empty State Messages
  { id: 'ux-021', pattern: /\bno\s+(results|data|records|items)\s+(found|available)\s*\.?\s*$/gim, severity: 'warning', rule: 'Empty state without guidance', suggestion: 'Add suggestion: "Try adjusting filters" or "Check back later"', category: 'empty_state' },
  { id: 'ux-022', pattern: /\bnothing\s+(to\s+show|here|found)\s*\.?\s*$/gim, severity: 'warning', rule: 'Unhelpful empty state', suggestion: 'Guide user on how to add content or adjust search', category: 'empty_state' },
  
  // Loading/Processing State
  { id: 'ux-023', pattern: /\b(please\s+)?wait\s*\.{3,}\s*$/gim, severity: 'info', rule: 'Vague loading message', suggestion: 'Be specific: "Checking your balance..." or add estimated time', category: 'loading_state' },
  { id: 'ux-024', pattern: /\bloading\s*\.{3,}\s*$/gim, severity: 'info', rule: 'Generic loading message', suggestion: 'Describe what is loading: "Loading your transaction history..."', category: 'loading_state' },
  
  // Success Message Structure
  { id: 'ux-025', pattern: /^(success|done|completed)\s*[.!]?\s*$/gim, severity: 'info', rule: 'Vague success message', suggestion: 'Specify what succeeded: "Recharge of Rs.299 successful"', category: 'success_state' },
  { id: 'ux-026', pattern: /\bsuccessfully\s+(done|completed)\s*\.?\s*$/gim, severity: 'info', rule: 'Redundant success phrasing', suggestion: 'Be specific about what completed', category: 'success_state' },
];

export const uxMicrocopyAgent: ValidationAgent = {
  id: 'ux_microcopy',
  name: 'UX Microcopy',
  description: 'Validates CTA format, dead-end detection, and error message structure',
  weight: 8,
  patterns: UX_MICROCOPY_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, UX_MICROCOPY_PATTERNS, 'ux_microcopy'),
  calculateScore: (violations: ValidationViolation[]): number => {
    if (violations.length === 0) return 100;
    
    let deduction = 0;
    for (const v of violations) {
      if (v.category === 'dead_end') {
        deduction += v.severity === 'error' ? 20 : 10;
      } else if (v.category === 'error_structure') {
        deduction += v.severity === 'error' ? 15 : 8;
      } else {
        deduction += v.severity === 'error' ? 10 : v.severity === 'warning' ? 5 : 2;
      }
    }
    
    return Math.max(0, 100 - deduction);
  },
};
