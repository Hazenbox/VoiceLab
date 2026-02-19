/**
 * Commercial Sensitivity Agent
 * Detects pushy sales during support, promotions during negative emotions
 */

import type { ValidationAgent, PatternRule } from '../types';
import { runPatterns, calculateScore } from './helpers';

const COMMERCIAL_PATTERNS: PatternRule[] = [
  // Pushy sales language
  { id: 'cm-001', pattern: /\b(must (buy|get|upgrade|purchase))\b/gi, severity: 'warning', rule: 'Pushy sales language', suggestion: 'Use softer recommendation: "You might like" or "Consider"', category: 'pushy_sales' },
  { id: 'cm-002', pattern: /\bdon['']?t miss\b/gi, severity: 'warning', rule: 'Urgency pressure', suggestion: 'Remove artificial urgency', category: 'urgency_pressure' },
  { id: 'cm-003', pattern: /\blast chance\b/gi, severity: 'warning', rule: 'Scarcity pressure', suggestion: 'Remove pressure language', category: 'scarcity_pressure' },
  { id: 'cm-004', pattern: /\blimited (time|offer|period)\b/gi, severity: 'warning', rule: 'Scarcity pressure', suggestion: 'Focus on benefits instead', category: 'scarcity_pressure' },
  { id: 'cm-005', pattern: /\bact now\b/gi, severity: 'warning', rule: 'Urgency pressure', suggestion: 'Let user decide timing', category: 'urgency_pressure' },
  { id: 'cm-006', pattern: /\bbest deal ever\b/gi, severity: 'warning', rule: 'Superlative claim', suggestion: 'Use factual comparison', category: 'superlative' },
  { id: 'cm-007', pattern: /\b(grab|snag|scoop up)\s+(this|the)\s+(deal|offer)\b/gi, severity: 'warning', rule: 'Aggressive sales language', suggestion: 'Use "explore" or "check out"', category: 'pushy_sales' },
  { id: 'cm-008', pattern: /\bonly\s+\d+\s+(left|remaining|available)\b/gi, severity: 'warning', rule: 'False scarcity', suggestion: 'Remove artificial limits', category: 'scarcity_pressure' },
  { id: 'cm-009', pattern: /\b(hurry|rush)\b/gi, severity: 'warning', rule: 'Urgency pressure', suggestion: 'Allow user to take their time', category: 'urgency_pressure' },
  { id: 'cm-010', pattern: /\b(exclusive|VIP|elite)\s+(access|offer|deal)\b/gi, severity: 'info', rule: 'Exclusionary marketing', suggestion: 'Consider inclusive framing', category: 'exclusionary' },
  
  // Inappropriate cross-sell/upsell timing patterns
  { id: 'cm-011', pattern: /\b(sorry|apologies|issue|problem).*\b(upgrade|also try|you might like)\b/gi, severity: 'error', rule: 'Promotional content during support issue', suggestion: 'Resolve issue before making suggestions', category: 'inappropriate_timing' },
  { id: 'cm-012', pattern: /\b(upgrade|also try|you might like).*\b(sorry|apologies|issue|problem)\b/gi, severity: 'error', rule: 'Promotional content during support issue', suggestion: 'Resolve issue before making suggestions', category: 'inappropriate_timing' },
  { id: 'cm-013', pattern: /\b(frustrated|upset|angry|disappointed).*\b(special offer|discount|deal)\b/gi, severity: 'error', rule: 'Promotion when user is distressed', suggestion: 'Address emotional state first', category: 'inappropriate_timing' },
  { id: 'cm-014', pattern: /\b(complaint|complain|escalate).*\b(meanwhile|also|by the way)\s*(check out|try|get)\b/gi, severity: 'error', rule: 'Cross-sell during complaint', suggestion: 'Focus on resolution, not sales', category: 'inappropriate_timing' },
  
  // Direct recommendation without needs assessment (serve, not sell)
  { id: 'cm-015', pattern: /\b(i recommend|we recommend|i suggest|we suggest|the best plan is|the best option is)\b(?![^.]*\?)/gi, severity: 'warning', rule: 'Direct recommendation without asking about needs', suggestion: 'Ask about user needs before recommending: "Could you share how much data you use?"', category: 'needs_assessment' },
  { id: 'cm-016', pattern: /\b(₹\d{2,4}|rs\.?\s*\d{2,4}|rupees?\s*\d{2,4})\s*(per|\/)\s*(month|year|day)/gi, severity: 'info', rule: 'Plan pricing mentioned - ensure needs were assessed first', suggestion: 'Verify that user needs were understood before presenting specific plan prices', category: 'needs_assessment' },
  { id: 'cm-017', pattern: /\bfor\s+(heavy|light|moderate)\s+users?\b/gi, severity: 'info', rule: 'User segment assumption', suggestion: 'Ask user about their usage instead of assuming their segment', category: 'needs_assessment' },
];

export const commercialSensitivityAgent: ValidationAgent = {
  id: 'commercial_sensitivity',
  name: 'Commercial Sensitivity',
  description: 'Detects inappropriate sales/promotional timing and pushy language',
  weight: 8,
  patterns: COMMERCIAL_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, COMMERCIAL_PATTERNS, 'commercial_sensitivity'),
  calculateScore,
};
