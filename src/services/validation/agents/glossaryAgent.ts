/**
 * Glossary Agent
 * Validates ecosystem-specific terminology usage
 */

import type { ValidationAgent, PatternRule } from '../types';
import { runPatterns, calculateScore } from './helpers';

const GLOSSARY_PATTERNS: PatternRule[] = [
  // Pack vs Plan terminology
  { id: 'gl-001', pattern: /\bpack\b(?!\s*(of|up|age|ing|ed|s\s+of))/gi, severity: 'error', rule: 'Use "Plan" instead of "Pack"', suggestion: 'Jio uses "Plan" terminology, not "Pack"', category: 'terminology' },
  
  // App name specificity
  { id: 'gl-002', pattern: /\bdownload\s+jio(?!\s*(cinema|mart|tv|fiber|air|music|saavn|cloud|meet|chat|news|health|games))/gi, severity: 'warning', rule: 'Specify which Jio app', suggestion: 'Use "MyJio app" or specific app name (JioCinema, JioMart)', category: 'terminology' },
  
  // Recharge vs Bill payment context
  { id: 'gl-003', pattern: /\brecharge\s+(your\s+)?postpaid\b/gi, severity: 'warning', rule: 'Use "bill payment" for postpaid', suggestion: 'Postpaid uses "bill payment", prepaid uses "recharge"', category: 'terminology' },
  { id: 'gl-004', pattern: /\bpay\s+(your\s+)?prepaid\s+bill\b/gi, severity: 'warning', rule: 'Use "recharge" for prepaid', suggestion: 'Prepaid uses "recharge", postpaid uses "bill payment"', category: 'terminology' },
  
  // True Unlimited misuse
  { id: 'gl-005', pattern: /\b(true\s*)?unlimited\s+(data|internet|4g|5g)\s*(speed)?/gi, severity: 'warning', rule: '"True Unlimited" is for calls, not data', suggestion: 'Data has daily limits. Use "True Unlimited calls" for voice', category: 'terminology' },
  
  // 5G vs 5GHz confusion
  { id: 'gl-006', pattern: /\b5g\s+wifi(?!\s*\(5ghz\))/gi, severity: 'info', rule: '5G mobile vs 5GHz WiFi', suggestion: 'Clarify: 5G is mobile network, 5GHz is WiFi frequency', category: 'terminology' },
  
  // JioFiber vs JioAirFiber
  { id: 'gl-007', pattern: /\binstall\s+jioairfiber\s+cable/gi, severity: 'warning', rule: 'JioAirFiber is wireless', suggestion: 'JioAirFiber doesn\'t use cables - it\'s fixed wireless broadband', category: 'terminology' },
  
  // SIM vs Number porting
  { id: 'gl-008', pattern: /\b(port|porting)\s+(your\s+)?sim\b/gi, severity: 'info', rule: 'Numbers are ported, not SIMs', suggestion: 'Say "port your number" not "port your SIM"', category: 'terminology' },
  
  // Validity vs Data confusion
  { id: 'gl-009', pattern: /\b(\d+)\s*(gb|mb)\s+validity\b/gi, severity: 'error', rule: 'Validity is in days, not GB', suggestion: 'Validity is time period (days). Data is measured in GB/MB.', category: 'terminology' },
  
  // MyJio website (it's an app)
  { id: 'gl-010', pattern: /\bmyjio\s+(website|portal|site)\b/gi, severity: 'warning', rule: 'MyJio is an app', suggestion: 'MyJio is an app, not a website. Use jio.com for website.', category: 'terminology' },
];

export const glossaryAgent: ValidationAgent = {
  id: 'glossary',
  name: 'Ecosystem Glossary',
  description: 'Validates terminology usage against Jio ecosystem glossary',
  weight: 6,
  patterns: GLOSSARY_PATTERNS,
  runPatternValidation: (content) => runPatterns(content, GLOSSARY_PATTERNS, 'glossary'),
  calculateScore,
};
