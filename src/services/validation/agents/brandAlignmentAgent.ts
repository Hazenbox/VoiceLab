/**
 * Brand Alignment Agent
 * Training 1.pdf - 10 Guardrails enforcement
 */

import type { ValidationAgent, PatternRule } from '../types';
import { runPatterns, calculateScore } from './helpers';

const BRAND_PATTERNS: PatternRule[] = [
  // Demanding tone
  { id: 'ba-001', pattern: /\b(must|required|mandatory|compulsory)\b/gi, severity: 'warning', rule: 'Soften demanding tone', suggestion: 'please, we recommend', category: 'tone' },
  
  // Positive framing
  { id: 'ba-002', pattern: /\b(cannot|won\'t|don\'t)\b(?!\s+worry)/gi, severity: 'info', rule: 'Consider positive framing', suggestion: 'Rephrase positively', category: 'tone' },
  { id: 'ba-003', pattern: /\b(not available|unavailable)\b/gi, severity: 'warning', rule: 'Frame positively', suggestion: 'coming soon, available in [area]', category: 'tone' },
  { id: 'ba-004', pattern: /\b(error|failed|failure)\b/gi, severity: 'info', rule: 'Use gentler language', suggestion: "something went wrong, let's try again", category: 'tone' },
  
  // Fear-based messaging
  { id: 'ba-005', pattern: /\b(urgent|hurry|last chance|only \d+ left)\b/gi, severity: 'warning', rule: 'Avoid fear-based urgency', suggestion: 'Use positive framing', category: 'fear' },
  { id: 'ba-006', pattern: /\b(act now|limited time|expires soon)\b/gi, severity: 'info', rule: 'Avoid pressure tactics', suggestion: 'available until [date]', category: 'fear' },
  { id: 'ba-007', pattern: /\b(don\'t miss out|FOMO)\b/gi, severity: 'warning', rule: 'Avoid fear-based language', suggestion: 'You can enjoy, here for you', category: 'fear' },
  
  // Boastful language
  { id: 'ba-008', pattern: /\b(best in India|number one|#1|most trusted)\b/gi, severity: 'warning', rule: 'Avoid boastful claims', suggestion: 'Our customers trust us', category: 'modesty' },
  { id: 'ba-009', pattern: /\b(world[-\s]?class|cutting[-\s]?edge|state[-\s]?of[-\s]?the[-\s]?art|best[-\s]?in[-\s]?class)\b/gi, severity: 'warning', rule: 'Avoid buzzwords', suggestion: 'Describe specific benefit', category: 'modesty' },
  { id: 'ba-010', pattern: /\b(revolutionary|game[-\s]?changing|disruptive)\b/gi, severity: 'warning', rule: 'Avoid hyperbole', suggestion: 'Describe actual improvement', category: 'modesty' },
  
  // Complex/jargon
  { id: 'ba-011', pattern: /\b(aforementioned|henceforth|hereby|therein)\b/gi, severity: 'warning', rule: 'Use everyday language', suggestion: 'Use simpler alternative', category: 'jargon' },
  { id: 'ba-012', pattern: /\b(pursuant to|in accordance with|notwithstanding)\b/gi, severity: 'warning', rule: 'Use everyday language', suggestion: 'following, as per', category: 'jargon' },
  { id: 'ba-013', pattern: /\b(seamless|frictionless|robust|scalable)\b/gi, severity: 'info', rule: 'Avoid tech buzzwords', suggestion: 'Use specific benefit', category: 'jargon' },
  
  // Judgmental language
  { id: 'ba-014', pattern: /\b(unfortunately|regrettably|sadly)\b/gi, severity: 'info', rule: 'Avoid negative emotional framing', suggestion: 'State fact directly', category: 'judgment' },
  { id: 'ba-015', pattern: /\b(highly motivated|discerning customers|premium users)\b/gi, severity: 'warning', rule: 'Avoid exclusionary language', suggestion: 'everyone, all users', category: 'judgment' },
  
  // Marketing: Benefit-first
  { id: 'ba-016', pattern: /^(Diwali|Durga Puja|Holi|Eid|Christmas|New Year|Independence Day)\s+(sale|offer|special)\b/gim, severity: 'warning', rule: 'Headlines should lead with benefit, not event', suggestion: 'Put discount/benefit first: "50% off - [Event] Special"', category: 'marketing' },
  
  // Shame-inducing words
  { id: 'ba-017', pattern: /\b(you forgot|you missed|you failed to)\b/gi, severity: 'warning', rule: 'Avoid blame language', suggestion: 'Here\'s a reminder, Still time to', category: 'shame' },
  { id: 'ba-018', pattern: /\b(your fault|your mistake)\b/gi, severity: 'error', rule: 'Never blame the user', suggestion: 'Something went wrong, let us help', category: 'shame' },
  
  // Plan Naming Validation
  { id: 'ba-019', pattern: /\b(bronze|silver|gold|platinum|diamond)\s+(plan|package|tier|subscription)\b/gi, severity: 'error', rule: 'Use "Plan + Price" naming (e.g., ₹199 Plan)', suggestion: 'Replace with price-based name: ₹XXX Plan', category: 'plan_naming' },
  { id: 'ba-020', pattern: /\b(data|recharge|combo|value|super|mega)\s+pack\b/gi, severity: 'error', rule: 'Use "Plan" not "Pack" for Jio products', suggestion: 'Replace "Pack" with "Plan"', category: 'plan_naming' },
  { id: 'ba-021', pattern: /\bpack\b(?!\s*(of|up|age|ing|ed|s\s+of))/gi, severity: 'warning', rule: 'Use "Plan" terminology for Jio offerings', suggestion: 'Consider using "Plan" instead of "Pack"', category: 'plan_naming' },
  { id: 'ba-022', pattern: /\b(this|our|the|your)\s+plan\b(?!.*₹\d)/gi, severity: 'info', rule: 'Include price when mentioning plans', suggestion: 'Add price for clarity: "₹XXX Plan"', category: 'plan_naming' },
  { id: 'ba-023', pattern: /\bunlimited\s+(data|calls?|sms|minutes?)\b(?!\s*\*)/gi, severity: 'warning', rule: 'Qualify unlimited claims with FUP/T&C reference', suggestion: 'Add asterisk and refer to T&C', category: 'plan_naming' },
  { id: 'ba-024', pattern: /\bjio\s+(prime|plus|pro|max|ultra|super)\b(?!\s*(cinema|fiber|mart|tv))/gi, severity: 'warning', rule: 'Use current plan naming conventions', suggestion: 'Use ₹XXX Plan format', category: 'plan_naming' },
];

export const brandAlignmentAgent: ValidationAgent = {
  id: 'brand_alignment',
  name: 'Brand Alignment',
  description: 'Aligns with Jio brand values',
  weight: 15,
  patterns: BRAND_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, BRAND_PATTERNS, 'brand_alignment'),
  calculateScore,
};
