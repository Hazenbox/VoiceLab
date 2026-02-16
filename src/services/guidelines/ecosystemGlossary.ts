/**
 * Ecosystem-Specific Glossary (Phase 3.1)
 * 
 * Comprehensive glossary with:
 * - Term: The official term to use
 * - Meaning: What it means in Jio context
 * - NotMeaning: What it does NOT mean (common misconceptions)
 * - CorrectUse: Example of correct usage
 * - IncorrectUse: Example of incorrect usage to avoid
 * 
 * Used for:
 * 1. Prompt injection to guide LLM generation
 * 2. Post-generation validation to catch misuse
 * 3. Training data for fine-tuning
 * 
 * @module services/guidelines/ecosystemGlossary
 */

import type { EcosystemType } from '../../types';

// =============================================================================
// Types
// =============================================================================

export interface GlossaryTerm {
  /** The official term */
  term: string;
  /** Alternative spellings/forms that should be normalized to this term */
  aliases?: string[];
  /** What it means in Jio context */
  meaning: string;
  /** What it does NOT mean (common misconceptions to avoid) */
  notMeaning: string;
  /** Example of correct usage */
  correctUse: string;
  /** Example of incorrect usage */
  incorrectUse: string;
  /** Which ecosystem(s) this term belongs to */
  ecosystems: EcosystemType[];
  /** Categories for filtering */
  category: 'product' | 'service' | 'technical' | 'payment' | 'plan' | 'support' | 'general';
  /** Importance for validation (higher = more critical to check) */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** Terms that are often confused with this one */
  confusedWith?: string[];
}

export interface GlossaryValidationResult {
  term: string;
  issue: 'misuse' | 'wrong_alias' | 'wrong_context' | 'confused_term';
  foundText: string;
  suggestion: string;
  correctUse: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// =============================================================================
// Jio Ecosystem Glossary
// =============================================================================

export const JIO_GLOSSARY: GlossaryTerm[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PRODUCT TERMS
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    term: 'MyJio',
    aliases: ['My Jio', 'myJio', 'my jio app', 'jio app'],
    meaning: 'The official Jio self-service app for recharges, bill payments, and account management',
    notMeaning: 'Not a website, not customer care number, not JioTV or JioCinema',
    correctUse: 'You can recharge your number using the MyJio app',
    incorrectUse: 'Please visit MyJio website to recharge', // MyJio is an app
    ecosystems: ['jio_mobility', 'jiofiber', 'jio_payments'],
    category: 'product',
    priority: 'critical',
    confusedWith: ['Jio.com', 'JioMart', 'JioCinema'],
  },
  
  {
    term: 'JioFiber',
    aliases: ['Jio Fiber', 'jiofiber', 'Jio fiber', 'JioFibre'],
    meaning: 'Jio\'s home broadband service delivered via fiber optic cable',
    notMeaning: 'Not mobile data, not a mobile plan, not JioAirFiber',
    correctUse: 'Your JioFiber connection provides up to 1Gbps speed at home',
    incorrectUse: 'Recharge your JioFiber for mobile data', // JioFiber is for home broadband
    ecosystems: ['jiofiber'],
    category: 'product',
    priority: 'critical',
    confusedWith: ['JioAirFiber', 'mobile data', 'Jio hotspot'],
  },
  
  {
    term: 'JioAirFiber',
    aliases: ['Jio AirFiber', 'Jio Air Fiber', 'Air Fiber'],
    meaning: 'Jio\'s fixed wireless broadband service (no physical cable installation)',
    notMeaning: 'Not JioFiber (which uses cables), not mobile hotspot',
    correctUse: 'JioAirFiber gives you broadband without drilling for cables',
    incorrectUse: 'Install JioAirFiber cable in your home', // It's wireless
    ecosystems: ['jiofiber'],
    category: 'product',
    priority: 'high',
    confusedWith: ['JioFiber', 'WiFi router', 'mobile hotspot'],
  },
  
  {
    term: 'JioMart',
    aliases: ['Jio Mart', 'jiomart'],
    meaning: 'Jio\'s online grocery and shopping platform',
    notMeaning: 'Not a recharge portal, not for bill payments, not MyJio',
    correctUse: 'Order groceries from JioMart for home delivery',
    incorrectUse: 'Recharge your mobile on JioMart', // Use MyJio for recharges
    ecosystems: ['jiomart'],
    category: 'product',
    priority: 'critical',
    confusedWith: ['MyJio', 'Jio.com', 'Reliance Fresh'],
  },
  
  {
    term: 'JioCinema',
    aliases: ['Jio Cinema', 'jiocinema'],
    meaning: 'Jio\'s OTT streaming platform for movies, shows, and live sports',
    notMeaning: 'Not JioTV (different app), not a mobile plan benefit, not the same as JioTV',
    correctUse: 'Watch IPL live on JioCinema',
    incorrectUse: 'Switch to JioTV channel 123 on JioCinema', // JioCinema is not live TV channels
    ecosystems: ['jiocinema'],
    category: 'product',
    priority: 'high',
    confusedWith: ['JioTV', 'Hotstar', 'Netflix'],
  },
  
  {
    term: 'JioTV',
    aliases: ['Jio TV', 'jiotv'],
    meaning: 'Jio\'s live TV streaming app with 800+ channels',
    notMeaning: 'Not on-demand content (use JioCinema), not a set-top box',
    correctUse: 'Watch live news on JioTV',
    incorrectUse: 'Watch movies from JioTV library', // JioTV is live TV, not on-demand
    ecosystems: ['jio_mobility'],
    category: 'product',
    priority: 'high',
    confusedWith: ['JioCinema', 'JioFiber TV', 'set-top box'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PLAN & PAYMENT TERMS
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    term: 'Plan',
    aliases: [],
    meaning: 'A prepaid or postpaid subscription with specific benefits (data, calls, validity)',
    notMeaning: 'Not "Pack" (avoid this term), not "Bundle", not "Scheme"',
    correctUse: 'The Rs.299 Plan includes unlimited calls and 2GB/day for 28 days',
    incorrectUse: 'Buy the Rs.299 Pack', // Use "Plan" not "Pack"
    ecosystems: ['jio_mobility', 'jiofiber'],
    category: 'plan',
    priority: 'critical',
    confusedWith: ['Pack', 'Recharge', 'Top-up', 'Add-on'],
  },
  
  {
    term: 'Recharge',
    aliases: ['recharge', 'top up', 'top-up'],
    meaning: 'Action of adding balance or activating a plan on prepaid number',
    notMeaning: 'Not bill payment (for postpaid), not balance transfer',
    correctUse: 'Recharge with the Rs.299 Plan to get unlimited calls',
    incorrectUse: 'Recharge your postpaid bill', // Postpaid is "bill payment" not recharge
    ecosystems: ['jio_mobility'],
    category: 'payment',
    priority: 'high',
    confusedWith: ['Bill payment', 'Add-on', 'Balance transfer'],
  },
  
  {
    term: 'Bill payment',
    aliases: ['pay bill', 'postpaid bill'],
    meaning: 'Monthly payment for postpaid services (mobile or fiber)',
    notMeaning: 'Not recharge (for prepaid), not advance payment',
    correctUse: 'Your JioFiber bill of Rs.999 is due on the 15th',
    incorrectUse: 'Recharge your JioFiber monthly plan', // It's bill payment, not recharge
    ecosystems: ['jio_mobility', 'jiofiber'],
    category: 'payment',
    priority: 'high',
    confusedWith: ['Recharge', 'Auto-pay', 'Advance payment'],
  },
  
  {
    term: 'Auto-pay',
    aliases: ['autopay', 'auto pay', 'automatic payment'],
    meaning: 'Automatic monthly payment from linked bank/card/UPI',
    notMeaning: 'Not auto-recharge, not one-time payment scheduled',
    correctUse: 'Set up auto-pay to never miss your bill payment',
    incorrectUse: 'Enable auto-pay for one-time recharge', // Auto-pay is recurring
    ecosystems: ['jio_mobility', 'jiofiber', 'jio_payments'],
    category: 'payment',
    priority: 'medium',
    confusedWith: ['Scheduled payment', 'Auto-recharge', 'Standing instruction'],
  },
  
  {
    term: 'Add-on',
    aliases: ['addon', 'add on', 'data pack'],
    meaning: 'Extra data or benefits on top of main plan',
    notMeaning: 'Not a full plan, not a replacement for existing plan',
    correctUse: 'Get a 1GB add-on for Rs.19 if you run out of daily data',
    incorrectUse: 'Replace your current plan with an add-on', // Add-ons supplement, not replace
    ecosystems: ['jio_mobility'],
    category: 'plan',
    priority: 'medium',
    confusedWith: ['Plan', 'Booster', 'Data voucher'],
  },
  
  {
    term: 'Validity',
    aliases: ['plan validity', 'expiry'],
    meaning: 'Number of days a plan is active',
    notMeaning: 'Not data limit, not the amount of data',
    correctUse: 'This plan has 28 days validity',
    incorrectUse: 'This plan has 28GB validity', // Validity is days, not data
    ecosystems: ['jio_mobility', 'jiofiber'],
    category: 'plan',
    priority: 'high',
    confusedWith: ['Data limit', 'Usage', 'Balance'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TECHNICAL TERMS
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    term: '5G',
    aliases: ['Jio 5G', 'True 5G'],
    meaning: 'Fifth generation mobile network with faster speeds and lower latency',
    notMeaning: 'Not 5GHz WiFi (which is home router frequency)',
    correctUse: 'Your area now has Jio 5G coverage',
    incorrectUse: 'Connect to the 5G WiFi network', // That's 5GHz WiFi, not 5G mobile
    ecosystems: ['jio_mobility'],
    category: 'technical',
    priority: 'high',
    confusedWith: ['5GHz WiFi', '4G', 'LTE'],
  },
  
  {
    term: 'VoLTE',
    aliases: ['Voice over LTE', 'HD calling'],
    meaning: 'Voice calls over 4G/5G network (better quality than 2G/3G)',
    notMeaning: 'Not WiFi calling, not video calling, not VoIP',
    correctUse: 'Enable VoLTE for clearer call quality',
    incorrectUse: 'Turn on VoLTE for video calls', // VoLTE is voice, not video
    ecosystems: ['jio_mobility'],
    category: 'technical',
    priority: 'medium',
    confusedWith: ['WiFi calling', 'Video call', 'VoIP'],
  },
  
  {
    term: 'WiFi calling',
    aliases: ['VoWiFi', 'Voice over WiFi'],
    meaning: 'Making voice calls over WiFi when mobile signal is weak',
    notMeaning: 'Not VoLTE, not video calling over WiFi, not WhatsApp calling',
    correctUse: 'Use WiFi calling in your basement where mobile signal is weak',
    incorrectUse: 'Enable WiFi calling for WhatsApp', // WhatsApp already uses WiFi
    ecosystems: ['jio_mobility', 'jiofiber'],
    category: 'technical',
    priority: 'medium',
    confusedWith: ['VoLTE', 'WhatsApp call', 'Video call'],
  },
  
  {
    term: 'SIM',
    aliases: ['Jio SIM', 'SIM card'],
    meaning: 'The physical or eSIM card that stores your mobile identity',
    notMeaning: 'Not the phone, not the number (which can be ported to new SIM)',
    correctUse: 'Your SIM is now activated. Insert it into any unlocked phone.',
    incorrectUse: 'Your SIM has been ported', // Numbers get ported, not SIMs
    ecosystems: ['jio_mobility'],
    category: 'technical',
    priority: 'high',
    confusedWith: ['Phone', 'Number', 'Account'],
  },
  
  {
    term: 'eSIM',
    aliases: ['e-SIM', 'embedded SIM', 'digital SIM'],
    meaning: 'A digital SIM built into the phone (no physical card needed)',
    notMeaning: 'Not a regular SIM, not a backup SIM in case physical is lost',
    correctUse: 'Activate your eSIM to use Jio on your smartwatch',
    incorrectUse: 'Insert eSIM into your phone', // eSIM is digital, not inserted
    ecosystems: ['jio_mobility'],
    category: 'technical',
    priority: 'medium',
    confusedWith: ['Physical SIM', 'Dual SIM', 'Nano SIM'],
  },
  
  {
    term: 'Porting',
    aliases: ['number porting', 'MNP'],
    meaning: 'Moving your existing number from another operator to Jio (or vice versa)',
    notMeaning: 'Not SIM replacement, not changing plans, not number change',
    correctUse: 'Port your number to Jio by sending SMS to 1900',
    incorrectUse: 'Port to a new Jio number', // Porting keeps same number
    ecosystems: ['jio_mobility'],
    category: 'service',
    priority: 'high',
    confusedWith: ['SIM swap', 'New connection', 'Upgrade'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SUPPORT & SERVICE TERMS
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    term: 'JioCare',
    aliases: ['Jio Care', 'Jio customer care'],
    meaning: 'Jio\'s official customer support service (via app, call, or chat)',
    notMeaning: 'Not a warranty program, not device repair, not Jio store',
    correctUse: 'Contact JioCare for help with your account',
    incorrectUse: 'Take your phone to JioCare for repair', // JioCare is support, not repair
    ecosystems: ['jio_mobility', 'jiofiber', 'jiomart', 'jiocinema'],
    category: 'support',
    priority: 'high',
    confusedWith: ['Jio Store', 'Device warranty', 'Technical support'],
  },
  
  {
    term: 'Service request',
    aliases: ['SR', 'ticket', 'complaint number'],
    meaning: 'A tracked reference for your support query',
    notMeaning: 'Not an order number, not transaction ID, not OTP',
    correctUse: 'Your service request number is SR-12345. We\'ll update you within 24 hours.',
    incorrectUse: 'Enter your service request number to track order', // SR is for support, not orders
    ecosystems: ['jio_mobility', 'jiofiber', 'jiomart'],
    category: 'support',
    priority: 'medium',
    confusedWith: ['Order number', 'Transaction ID', 'Reference number'],
  },
  
  {
    term: 'KYC',
    aliases: ['e-KYC', 'Aadhaar verification', 'identity verification'],
    meaning: 'Know Your Customer - mandatory identity verification for telecom',
    notMeaning: 'Not document upload for other services, not account login',
    correctUse: 'Complete KYC to activate your SIM within 24 hours',
    incorrectUse: 'Do KYC to reset your MyJio password', // KYC is for SIM activation
    ecosystems: ['jio_mobility', 'jiofiber', 'jio_payments'],
    category: 'service',
    priority: 'high',
    confusedWith: ['Account verification', 'OTP verification', 'Login'],
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAL TERMS
  // ═══════════════════════════════════════════════════════════════════════════
  
  {
    term: 'Jio',
    aliases: [],
    meaning: 'Reliance Jio Infocomm Limited - the telecom company',
    notMeaning: 'Not a specific app or product (MyJio, JioMart are separate)',
    correctUse: 'Jio offers mobile, fiber, and digital services',
    incorrectUse: 'Download Jio to recharge', // Should say "MyJio app"
    ecosystems: ['jio_mobility', 'jiofiber', 'jiomart', 'jiocinema', 'jio_payments'],
    category: 'general',
    priority: 'critical',
    confusedWith: ['MyJio', 'Jio.com', 'Reliance'],
  },
  
  {
    term: 'Jio Number',
    aliases: ['mobile number', 'Jio mobile'],
    meaning: 'Your 10-digit mobile phone number on Jio network',
    notMeaning: 'Not customer ID, not account number, not SR number',
    correctUse: 'Enter your Jio Number to check balance',
    incorrectUse: 'Enter your Jio Number from the SIM card', // Number is not on SIM
    ecosystems: ['jio_mobility'],
    category: 'general',
    priority: 'high',
    confusedWith: ['IMSI', 'SIM number', 'Customer ID'],
  },
  
  {
    term: 'True Unlimited',
    aliases: ['truly unlimited', 'unlimited'],
    meaning: 'No FUP/fair usage policy on calls (calls don\'t get throttled)',
    notMeaning: 'Not unlimited data (data still has daily limits)',
    correctUse: 'Enjoy true unlimited voice calls to any network',
    incorrectUse: 'True unlimited data at 4G speed', // Unlimited is for calls, data has limits
    ecosystems: ['jio_mobility'],
    category: 'plan',
    priority: 'high',
    confusedWith: ['Unlimited data', 'No FUP data', 'Uncapped'],
  },
];

// =============================================================================
// Ecosystem-Filtered Glossary
// =============================================================================

/**
 * Get glossary terms for a specific ecosystem
 */
export function getGlossaryForEcosystem(ecosystem: EcosystemType): GlossaryTerm[] {
  return JIO_GLOSSARY.filter(term => term.ecosystems.includes(ecosystem));
}

/**
 * Get glossary terms by category
 */
export function getGlossaryByCategory(category: GlossaryTerm['category']): GlossaryTerm[] {
  return JIO_GLOSSARY.filter(term => term.category === category);
}

/**
 * Get glossary terms by priority
 */
export function getGlossaryByPriority(priority: GlossaryTerm['priority']): GlossaryTerm[] {
  return JIO_GLOSSARY.filter(term => term.priority === priority);
}

/**
 * Find a term in the glossary (checks term and aliases)
 */
export function findGlossaryTerm(searchTerm: string): GlossaryTerm | undefined {
  const normalized = searchTerm.toLowerCase().trim();
  return JIO_GLOSSARY.find(entry => {
    if (entry.term.toLowerCase() === normalized) return true;
    if (entry.aliases?.some(alias => alias.toLowerCase() === normalized)) return true;
    return false;
  });
}

// =============================================================================
// Prompt Injection
// =============================================================================

/**
 * Generate glossary instructions for LLM prompt
 */
export function getGlossaryInstructions(ecosystem: EcosystemType, maxTerms = 15): string {
  const terms = getGlossaryForEcosystem(ecosystem)
    // Sort by priority (critical > high > medium > low)
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, maxTerms);
  
  if (terms.length === 0) {
    return '';
  }
  
  const lines: string[] = [
    '## Terminology Guide',
    'Use these terms correctly:',
    '',
  ];
  
  for (const term of terms) {
    lines.push(`**${term.term}**:`);
    lines.push(`- Means: ${term.meaning}`);
    lines.push(`- NOT: ${term.notMeaning}`);
    lines.push(`- Correct: "${term.correctUse}"`);
    if (term.confusedWith) {
      lines.push(`- Don't confuse with: ${term.confusedWith.join(', ')}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate content against glossary for terminology misuse
 */
export function validateGlossaryUsage(
  content: string,
  ecosystem: EcosystemType,
): GlossaryValidationResult[] {
  const results: GlossaryValidationResult[] = [];
  const terms = getGlossaryForEcosystem(ecosystem);
  const contentLower = content.toLowerCase();
  
  for (const term of terms) {
    // Check for wrong aliases
    if (term.aliases) {
      for (const alias of term.aliases) {
        // Case-insensitive check but preserve original for suggestion
        const aliasLower = alias.toLowerCase();
        if (contentLower.includes(aliasLower) && aliasLower !== term.term.toLowerCase()) {
          // Find the actual text position
          const index = contentLower.indexOf(aliasLower);
          const foundText = content.substring(index, index + alias.length);
          
          // Only flag if it's the wrong case or format
          if (foundText !== term.term) {
            results.push({
              term: term.term,
              issue: 'wrong_alias',
              foundText,
              suggestion: `Use "${term.term}" instead of "${foundText}"`,
              correctUse: term.correctUse,
              priority: term.priority,
            });
          }
        }
      }
    }
    
    // Check for confused terms (if present in content)
    if (term.confusedWith) {
      for (const confused of term.confusedWith) {
        const confusedLower = confused.toLowerCase();
        
        // Check if confused term appears in a context where the main term should be used
        // This is a heuristic - look for confused term near context keywords
        if (contentLower.includes(confusedLower)) {
          // Context clues that suggest misuse
          const contextClues = extractContextClues(contentLower, confusedLower, term);
          
          if (contextClues.length > 0) {
            results.push({
              term: term.term,
              issue: 'confused_term',
              foundText: confused,
              suggestion: `Consider using "${term.term}" instead of "${confused}" in this context`,
              correctUse: term.correctUse,
              priority: term.priority,
            });
          }
        }
      }
    }
  }
  
  // Check for specific misuse patterns
  const misuses = checkSpecificMisuses(content, terms);
  results.push(...misuses);
  
  return results;
}

/**
 * Extract context clues that suggest term confusion
 */
function extractContextClues(
  contentLower: string,
  confusedTerm: string,
  glossaryEntry: GlossaryTerm,
): string[] {
  const clues: string[] = [];
  const confusedIndex = contentLower.indexOf(confusedTerm);
  if (confusedIndex === -1) return clues;
  
  // Get surrounding context (100 chars before/after)
  const start = Math.max(0, confusedIndex - 100);
  const end = Math.min(contentLower.length, confusedIndex + confusedTerm.length + 100);
  const context = contentLower.substring(start, end);
  
  // Check for context keywords from correct usage
  const correctUseLower = glossaryEntry.correctUse.toLowerCase();
  const correctWords = correctUseLower.split(/\s+/).filter(w => w.length > 4);
  
  for (const word of correctWords) {
    if (context.includes(word) && !confusedTerm.includes(word)) {
      clues.push(word);
    }
  }
  
  return clues;
}

/**
 * Check for specific misuse patterns defined in glossary
 */
function checkSpecificMisuses(
  content: string,
  terms: GlossaryTerm[],
): GlossaryValidationResult[] {
  const results: GlossaryValidationResult[] = [];
  const contentLower = content.toLowerCase();
  
  // Check for "Pack" instead of "Plan"
  const planTerm = terms.find(t => t.term === 'Plan');
  if (planTerm && /\bpack\b(?!\s*(of|up|age|ing|ed|s\s+of))/i.test(content)) {
    results.push({
      term: 'Plan',
      issue: 'misuse',
      foundText: 'Pack',
      suggestion: 'Use "Plan" instead of "Pack" for Jio offerings',
      correctUse: planTerm.correctUse,
      priority: 'critical',
    });
  }
  
  // Check for "recharge" used with postpaid
  if (contentLower.includes('recharge') && contentLower.includes('postpaid')) {
    const rechargeTerm = terms.find(t => t.term === 'Recharge');
    if (rechargeTerm) {
      results.push({
        term: 'Bill payment',
        issue: 'misuse',
        foundText: 'recharge postpaid',
        suggestion: 'Use "bill payment" for postpaid, not "recharge"',
        correctUse: 'Pay your postpaid bill using MyJio',
        priority: 'high',
      });
    }
  }
  
  // Check for "5G WiFi" confusion
  if (/5g\s*wifi|wifi\s*5g/i.test(content) && !contentLower.includes('5ghz')) {
    const fiveGTerm = terms.find(t => t.term === '5G');
    if (fiveGTerm) {
      results.push({
        term: '5G',
        issue: 'confused_term',
        foundText: '5G WiFi',
        suggestion: '5G is mobile network; for WiFi frequency, use "5GHz WiFi"',
        correctUse: fiveGTerm.correctUse,
        priority: 'high',
      });
    }
  }
  
  // Check for "unlimited data" context
  if (/true\s*unlimited.*data|unlimited.*speed/i.test(content)) {
    const unlimitedTerm = terms.find(t => t.term === 'True Unlimited');
    if (unlimitedTerm) {
      results.push({
        term: 'True Unlimited',
        issue: 'misuse',
        foundText: content.match(/true\s*unlimited.*data|unlimited.*speed/i)?.[0] || 'unlimited data',
        suggestion: '"True Unlimited" applies to calls, not data. Data has daily limits.',
        correctUse: unlimitedTerm.correctUse,
        priority: 'high',
      });
    }
  }
  
  // Check for "download Jio" (should be "download MyJio")
  if (/download\s+jio(?!\s*(cinema|mart|tv|fiber|air))/i.test(content)) {
    results.push({
      term: 'MyJio',
      issue: 'misuse',
      foundText: 'download Jio',
      suggestion: 'Specify the app: "download MyJio" or "download JioCinema"',
      correctUse: 'Download the MyJio app to manage your account',
      priority: 'critical',
    });
  }
  
  return results;
}

/**
 * Convert glossary validation to standard violations
 */
export function toViolations(
  validationResults: GlossaryValidationResult[],
): Array<{
  severity: 'error' | 'warning' | 'info';
  rule: string;
  text: string;
  suggestion: string;
  category: string;
  autoFixable: boolean;
}> {
  return validationResults.map(result => {
    const severityMap: Record<GlossaryValidationResult['priority'], 'error' | 'warning' | 'info'> = {
      critical: 'error',
      high: 'warning',
      medium: 'info',
      low: 'info',
    };
    
    return {
      severity: severityMap[result.priority],
      rule: `Terminology: ${result.issue === 'wrong_alias' ? 'Use correct term' : result.issue === 'confused_term' ? 'Term confusion' : 'Term misuse'}`,
      text: result.foundText,
      suggestion: result.suggestion,
      category: 'glossary',
      autoFixable: result.issue === 'wrong_alias', // Only alias issues can be auto-fixed
    };
  });
}
