/**
 * Consolidated Validation Agents
 * 
 * Four merged validation agents for efficiency:
 * 1. SafetyPrivacyAgent - Safety compliance + privacy protection
 * 2. InclusivityAgent - Accessibility + cultural sensitivity
 * 3. BrandStyleAgent - Brand voice + style consistency
 * 4. CommerceAgent - Appropriate commercial recommendations
 * 
 * @module services/validation/agents/consolidatedAgents
 */

import { SAFETY_DOMAINS, type SafetyDomain } from '../../constitutional/coreRules';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AgentValidation {
  passed: boolean;
  score: number;
  issues: Array<{
    type: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SAFETY & PRIVACY AGENT
// ═══════════════════════════════════════════════════════════════════════════════

const PII_PATTERNS = [
  { name: 'aadhaar', pattern: /\b\d{4}\s?\d{4}\s?\d{4}\b/, suggestion: 'Remove or mask Aadhaar number' },
  { name: 'pan', pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/, suggestion: 'Remove or mask PAN number' },
  { name: 'phone', pattern: /\b(?:\+91)?[6-9]\d{9}\b/, suggestion: 'Remove or mask phone number' },
  { name: 'email', pattern: /\b[\w.-]+@[\w.-]+\.\w{2,}\b/, suggestion: 'Remove or mask email address' },
  { name: 'bank_account', pattern: /\b\d{9,18}\b/, suggestion: 'Remove or mask account number' },
  { name: 'credit_card', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, suggestion: 'Remove credit card number' },
];

const HARMFUL_CONTENT_PATTERNS = [
  { name: 'violence', pattern: /\b(kill|attack|hurt|harm|assault)\b/i, severity: 'error' as const },
  { name: 'hate', pattern: /\b(hate|discriminate|slur)\b/i, severity: 'error' as const },
  { name: 'illegal', pattern: /\b(illegal|unlawful|crime|fraud)\b/i, severity: 'warning' as const },
];

export function validateSafetyPrivacy(
  content: string,
  detectedDomains: SafetyDomain[] = []
): AgentValidation {
  const issues: AgentValidation['issues'] = [];
  let score = 1.0;
  
  // Check for PII exposure
  for (const { name, pattern, suggestion } of PII_PATTERNS) {
    if (pattern.test(content)) {
      issues.push({
        type: 'pii_exposure',
        severity: 'error',
        message: `Potential ${name} exposure detected`,
        suggestion,
      });
      score -= 0.3;
    }
  }
  
  // Check for harmful content
  for (const { name, pattern, severity } of HARMFUL_CONTENT_PATTERNS) {
    if (pattern.test(content)) {
      issues.push({
        type: 'harmful_content',
        severity,
        message: `Potential ${name}-related content detected`,
        suggestion: `Review and remove ${name}-related language`,
      });
      score -= severity === 'error' ? 0.3 : 0.1;
    }
  }
  
  // Check safety domain compliance
  for (const domain of detectedDomains) {
    const config = SAFETY_DOMAINS[domain];
    
    // Check for required disclaimers
    if (config.advisoryBoundary !== 'normal_information') {
      const hasDisclaimer = /consult|professional|expert|specialist|helpline/i.test(content);
      
      if (!hasDisclaimer && (config.level === 'critical' || config.level === 'high')) {
        issues.push({
          type: 'missing_disclaimer',
          severity: 'error',
          message: `Missing required disclaimer for ${domain}`,
          suggestion: `Add professional referral or appropriate disclaimer`,
        });
        score -= 0.2;
      }
    }
  }
  
  return {
    passed: !issues.some(i => i.severity === 'error'),
    score: Math.max(0, score),
    issues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. INCLUSIVITY AGENT
// ═══════════════════════════════════════════════════════════════════════════════

const EXCLUSIONARY_PATTERNS = [
  { pattern: /\bobviously\b/i, issue: 'Assumes knowledge', suggestion: 'Remove "obviously" - don\'t assume' },
  { pattern: /\bas you know\b/i, issue: 'Assumes knowledge', suggestion: 'Remove "as you know"' },
  { pattern: /\bsimply\b/i, issue: 'May feel condescending', suggestion: 'Remove "simply"' },
  { pattern: /\bjust\b/i, issue: 'Minimizes complexity', suggestion: 'Remove minimizing "just"' },
  { pattern: /\bnormal\s+(people|users)\b/i, issue: 'Othering language', suggestion: 'Use "users" or "everyone"' },
  { pattern: /\bdummy\b/i, issue: 'Potentially offensive', suggestion: 'Use "placeholder" or "sample"' },
];

const ACCESSIBILITY_ISSUES = [
  { pattern: /click here/i, issue: 'Inaccessible link text', suggestion: 'Use descriptive link text' },
  { pattern: /see (below|above)/i, issue: 'Visual-dependent language', suggestion: 'Use "following" or "previous"' },
  { pattern: /\bblind\b(?!ness)/i, issue: 'Potentially insensitive', suggestion: 'Use "visually impaired" if relevant' },
];

const CULTURAL_SENSITIVITY = [
  { pattern: /\bNamaste\b.*business/i, issue: 'Inappropriate greeting context', suggestion: 'Use context-appropriate greeting' },
];

export function validateInclusivity(content: string): AgentValidation {
  const issues: AgentValidation['issues'] = [];
  let score = 1.0;
  
  // Check exclusionary language
  for (const { pattern, issue, suggestion } of EXCLUSIONARY_PATTERNS) {
    if (pattern.test(content)) {
      issues.push({
        type: 'exclusionary_language',
        severity: 'warning',
        message: issue,
        suggestion,
      });
      score -= 0.1;
    }
  }
  
  // Check accessibility
  for (const { pattern, issue, suggestion } of ACCESSIBILITY_ISSUES) {
    if (pattern.test(content)) {
      issues.push({
        type: 'accessibility',
        severity: 'warning',
        message: issue,
        suggestion,
      });
      score -= 0.1;
    }
  }
  
  // Check cultural sensitivity
  for (const { pattern, issue, suggestion } of CULTURAL_SENSITIVITY) {
    if (pattern.test(content)) {
      issues.push({
        type: 'cultural_sensitivity',
        severity: 'info',
        message: issue,
        suggestion,
      });
      score -= 0.05;
    }
  }
  
  // Positive check: uses inclusive language
  if (/\beveryone\b|\ball users\b|\baccessible\b/i.test(content)) {
    score = Math.min(1, score + 0.05);
  }
  
  return {
    passed: !issues.some(i => i.severity === 'error'),
    score: Math.max(0, Math.min(1, score)),
    issues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. BRAND & STYLE AGENT
// ═══════════════════════════════════════════════════════════════════════════════

const BRAND_VIOLATIONS = [
  { pattern: /\bJIO\b/, issue: 'Incorrect capitalization', suggestion: 'Use "Jio" not "JIO"' },
  { pattern: /\bjio\b(?![\.\,])/, issue: 'Incorrect capitalization', suggestion: 'Capitalize "Jio"' },
  { pattern: /\bReliance Jio\b/i, issue: 'Unnecessary full name', suggestion: 'Use just "Jio"' },
  { pattern: /competitor/i, issue: 'Competitor mention', suggestion: 'Focus on Jio\'s strengths' },
  { pattern: /\bAirtel\b|\bVodafone\b|\bBSNL\b/i, issue: 'Competitor brand', suggestion: 'Remove competitor reference' },
];

const STYLE_ISSUES = [
  { pattern: /\!\!\!/, issue: 'Excessive exclamation', suggestion: 'Use single exclamation or period' },
  { pattern: /\.\.\.\.\./,issue: 'Excessive ellipsis', suggestion: 'Use standard three dots (...)' },
  { pattern: /ALL CAPS [A-Z]{5,}/, issue: 'Excessive caps', suggestion: 'Use normal capitalization' },
  { pattern: /😀|🎉|👍{2,}/, issue: 'Excessive emojis', suggestion: 'Limit emoji usage' },
];

const FORMALITY_ISSUES = [
  { pattern: /\bgonna\b|\bwanna\b|\bgotta\b/i, issue: 'Too informal', suggestion: 'Use formal language' },
  { pattern: /\blol\b|\blomao\b/i, issue: 'Too casual', suggestion: 'Remove slang' },
  { pattern: /\bstuff\b|\bthing(y|ie)\b/i, issue: 'Vague language', suggestion: 'Be more specific' },
];

export function validateBrandStyle(content: string): AgentValidation {
  const issues: AgentValidation['issues'] = [];
  let score = 1.0;
  
  // Check brand violations
  for (const { pattern, issue, suggestion } of BRAND_VIOLATIONS) {
    if (pattern.test(content)) {
      issues.push({
        type: 'brand_violation',
        severity: 'warning',
        message: issue,
        suggestion,
      });
      score -= 0.15;
    }
  }
  
  // Check style issues
  for (const { pattern, issue, suggestion } of STYLE_ISSUES) {
    if (pattern.test(content)) {
      issues.push({
        type: 'style_issue',
        severity: 'warning',
        message: issue,
        suggestion,
      });
      score -= 0.1;
    }
  }
  
  // Check formality
  for (const { pattern, issue, suggestion } of FORMALITY_ISSUES) {
    if (pattern.test(content)) {
      issues.push({
        type: 'formality',
        severity: 'info',
        message: issue,
        suggestion,
      });
      score -= 0.05;
    }
  }
  
  return {
    passed: !issues.some(i => i.severity === 'error'),
    score: Math.max(0, Math.min(1, score)),
    issues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. COMMERCE AGENT
// ═══════════════════════════════════════════════════════════════════════════════

const PUSHY_SALES_PATTERNS = [
  { pattern: /\bmust (buy|get|upgrade)\b/i, issue: 'Pushy sales language', suggestion: 'Use softer recommendation' },
  { pattern: /\bdon't miss\b/i, issue: 'Urgency pressure', suggestion: 'Remove artificial urgency' },
  { pattern: /\blast chance\b/i, issue: 'Scarcity pressure', suggestion: 'Remove pressure language' },
  { pattern: /\blimited (time|offer)\b/i, issue: 'Scarcity pressure', suggestion: 'Focus on benefits instead' },
  { pattern: /\bact now\b/i, issue: 'Urgency pressure', suggestion: 'Let user decide timing' },
  { pattern: /\bbest deal ever\b/i, issue: 'Superlative claim', suggestion: 'Use factual comparison' },
];

const INAPPROPRIATE_TIMING_SIGNALS = [
  'complaint', 'issue', 'problem', 'frustrated', 'angry', 'upset',
  'not working', 'failed', 'error', 'help', 'emergency',
];

export function validateCommerce(
  content: string,
  context: {
    hasUnresolvedIssue?: boolean;
    userEmotion?: string;
    isSupport?: boolean;
  } = {}
): AgentValidation {
  const issues: AgentValidation['issues'] = [];
  let score = 1.0;
  
  // Check for pushy sales language
  for (const { pattern, issue, suggestion } of PUSHY_SALES_PATTERNS) {
    if (pattern.test(content)) {
      issues.push({
        type: 'pushy_sales',
        severity: 'warning',
        message: issue,
        suggestion,
      });
      score -= 0.15;
    }
  }
  
  // Check for inappropriate timing
  const hasPromotion = /upgrade|offer|deal|discount|plan|subscribe/i.test(content);
  
  if (hasPromotion) {
    // Check if in support context
    if (context.isSupport || context.hasUnresolvedIssue) {
      issues.push({
        type: 'inappropriate_timing',
        severity: 'warning',
        message: 'Promotional content during unresolved support issue',
        suggestion: 'Resolve issue before making suggestions',
      });
      score -= 0.2;
    }
    
    // Check if user is in negative emotional state
    const negativeEmotions = ['raudra', 'karuna', 'bhayanaka', 'bibhatsa'];
    if (context.userEmotion && negativeEmotions.includes(context.userEmotion)) {
      issues.push({
        type: 'inappropriate_timing',
        severity: 'warning',
        message: 'Promotional content when user is distressed',
        suggestion: 'Address emotional state first',
      });
      score -= 0.2;
    }
  }
  
  // Positive: Uses "you might also like" style
  if (/you might (also |be interested|like|find)/i.test(content)) {
    score = Math.min(1, score + 0.05);
  }
  
  return {
    passed: !issues.some(i => i.severity === 'error'),
    score: Math.max(0, Math.min(1, score)),
    issues,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConsolidatedValidation {
  passed: boolean;
  overallScore: number;
  safetyPrivacy: AgentValidation;
  inclusivity: AgentValidation;
  brandStyle: AgentValidation;
  commerce: AgentValidation;
  allIssues: AgentValidation['issues'];
  topSuggestions: string[];
}

export function runConsolidatedValidation(
  content: string,
  options: {
    safetyDomains?: SafetyDomain[];
    hasUnresolvedIssue?: boolean;
    userEmotion?: string;
    isSupport?: boolean;
  } = {}
): ConsolidatedValidation {
  const safetyPrivacy = validateSafetyPrivacy(content, options.safetyDomains);
  const inclusivity = validateInclusivity(content);
  const brandStyle = validateBrandStyle(content);
  const commerce = validateCommerce(content, {
    hasUnresolvedIssue: options.hasUnresolvedIssue,
    userEmotion: options.userEmotion,
    isSupport: options.isSupport,
  });
  
  // Collect all issues
  const allIssues = [
    ...safetyPrivacy.issues,
    ...inclusivity.issues,
    ...brandStyle.issues,
    ...commerce.issues,
  ];
  
  // Calculate overall score (weighted)
  const overallScore = (
    safetyPrivacy.score * 0.35 +
    inclusivity.score * 0.2 +
    brandStyle.score * 0.25 +
    commerce.score * 0.2
  );
  
  // Get top suggestions (max 5)
  const topSuggestions = allIssues
    .filter(i => i.suggestion)
    .map(i => i.suggestion!)
    .slice(0, 5);
  
  return {
    passed: safetyPrivacy.passed && inclusivity.passed && brandStyle.passed && commerce.passed,
    overallScore,
    safetyPrivacy,
    inclusivity,
    brandStyle,
    commerce,
    allIssues,
    topSuggestions,
  };
}
