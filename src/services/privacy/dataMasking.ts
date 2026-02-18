/**
 * Data Masking Service
 * 
 * Masks sensitive data in responses to protect user privacy.
 * Handles PII, financial data, and other sensitive information.
 * 
 * @module services/privacy/dataMasking
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sensitive data types
 */
export type SensitiveDataType =
  | 'phone_number'
  | 'email'
  | 'aadhaar'
  | 'pan'
  | 'credit_card'
  | 'bank_account'
  | 'upi_id'
  | 'otp'
  | 'password'
  | 'address'
  | 'name'
  | 'date_of_birth'
  | 'ifsc_code';

/**
 * Masking result
 */
export interface MaskingResult {
  maskedText: string;
  sensitiveDataFound: DetectedSensitiveData[];
  wasModified: boolean;
}

/**
 * Detected sensitive data
 */
export interface DetectedSensitiveData {
  type: SensitiveDataType;
  original: string;
  masked: string;
  position: number;
  confidence: number;
}

/**
 * Masking configuration
 */
export interface MaskingConfig {
  maskCharacter: string;
  preserveStart: number;
  preserveEnd: number;
  fullyMask: SensitiveDataType[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_MASKING_CONFIG: MaskingConfig = {
  maskCharacter: '*',
  preserveStart: 2,
  preserveEnd: 2,
  fullyMask: ['password', 'otp', 'credit_card', 'bank_account'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns for detecting sensitive data
 */
const SENSITIVE_PATTERNS: Record<SensitiveDataType, {
  pattern: RegExp;
  confidence: number;
  validator?: (match: string) => boolean;
}> = {
  phone_number: {
    pattern: /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g,
    confidence: 0.95,
    validator: (match) => /^\+?91?[6-9]\d{9}$/.test(match.replace(/[-\s]/g, '')),
  },
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    confidence: 0.95,
  },
  aadhaar: {
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    confidence: 0.85,
    validator: (match) => {
      const digits = match.replace(/[\s-]/g, '');
      return digits.length === 12 && /^\d+$/.test(digits);
    },
  },
  pan: {
    pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/gi,
    confidence: 0.90,
  },
  credit_card: {
    pattern: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
    confidence: 0.85,
    validator: (match) => {
      const digits = match.replace(/[\s-]/g, '');
      return digits.length === 16 && /^\d+$/.test(digits);
    },
  },
  bank_account: {
    pattern: /\b\d{9,18}\b/g,
    confidence: 0.70,
    validator: (match) => match.length >= 9 && match.length <= 18,
  },
  upi_id: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z]+\b/g,
    confidence: 0.80,
    validator: (match) => {
      // Comprehensive list of Indian UPI providers
      const knownUPIs = [
        // Major banks
        'paytm', 'ybl', 'ibl', 'upi', 'okaxis', 'okhdfcbank', 'okicici', 'oksbi', 'axl', 'yesbank',
        // Payment apps
        'apl', 'gpay', 'phonepe', 'freecharge', 'mobikwik', 'amazonpay',
        // Telecom/Jio
        'jio', 'airtel', 'vi',
        // Other banks
        'kotak', 'pnb', 'boi', 'bob', 'canara', 'union', 'indian', 'federal', 'rbl', 'indus',
        // Neo banks
        'jupiter', 'fi', 'niyo', 'slice',
      ];
      const domain = match.split('@')[1]?.toLowerCase();
      return knownUPIs.some(upi => domain?.includes(upi));
    },
  },
  otp: {
    pattern: /\b(?:OTP|otp|code|Code)[\s:]*(\d{4,6})\b/g,
    confidence: 0.90,
  },
  password: {
    pattern: /\b(?:password|pwd|pass)[\s:]+["']?(\S+)["']?\b/gi,
    confidence: 0.85,
  },
  address: {
    pattern: /\b\d+[,\s]+[\w\s]+(?:road|street|lane|nagar|colony|society|apt|apartment|flat|floor|building|block)[\w\s,]*\d{6}\b/gi,
    confidence: 0.75,
  },
  name: {
    // Names are tricky - only mask if preceded by name indicators
    // Added validator to prevent masking common English words that might follow these triggers
    pattern: /\b(?:name|customer|user)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/gi,
    confidence: 0.60,
    validator: (match) => {
      // Common English words that should NOT be masked even if they follow "name:", "user:", "customer:"
      // These often appear in LLM-generated content in contexts like "user interaction", "customer experience"
      const commonEnglishWords = [
        // Common nouns that could follow "user/customer"
        'interaction', 'interactions', 'experience', 'experiences', 'engagement', 'engagements',
        'satisfaction', 'service', 'services', 'support', 'feedback', 'journey', 'journeys',
        'behavior', 'behaviour', 'preference', 'preferences', 'profile', 'profiles',
        'account', 'accounts', 'session', 'sessions', 'request', 'requests', 'response', 'responses',
        'action', 'actions', 'activity', 'activities', 'input', 'inputs', 'output', 'outputs',
        'data', 'information', 'details', 'settings', 'options', 'choice', 'choices',
        'interface', 'interfaces', 'portal', 'portals', 'dashboard', 'dashboards',
        'guide', 'guides', 'manual', 'manuals', 'documentation', 'tutorial', 'tutorials',
        'story', 'stories', 'case', 'cases', 'scenario', 'scenarios', 'example', 'examples',
        'role', 'roles', 'type', 'types', 'level', 'levels', 'tier', 'tiers',
        'base', 'group', 'groups', 'segment', 'segments', 'category', 'categories',
        'flow', 'flows', 'path', 'paths', 'step', 'steps', 'process', 'processes',
        'issue', 'issues', 'problem', 'problems', 'concern', 'concerns', 'query', 'queries',
        'mention', 'mentioned', 'message', 'messages', 'conversation', 'conversations',
        'initiated', 'completed', 'started', 'ended', 'successful', 'friendly', 'helpful',
        // Words from the bug report
        'mentioned', 'mentionable', 'experiencing', 'important', 'simple', 'straightforward',
        // Common abstract nouns
        'value', 'values', 'success', 'closure', 'conclusion', 'point', 'points', 'key', 'keys',
      ];
      
      // Check each word in the match against the common words list
      const words = match.toLowerCase().split(/\s+/);
      const hasCommonWord = words.some(word => commonEnglishWords.includes(word));
      
      // If ANY word is a common English word, don't mask
      if (hasCommonWord) {
        return false;
      }
      
      // Additional heuristic: Real names typically:
      // - Have at least 2 characters per word
      // - Don't have words longer than 15 characters (typical name max)
      // - Don't contain common suffixes like -tion, -ment, -ing, -ness, -able, -ible
      const suspiciousSuffixes = /(?:tion|ment|ing|ness|able|ible|ance|ence|ous|ive|ful|less|ship|hood)$/i;
      const hasSuspiciousSuffix = words.some(word => suspiciousSuffixes.test(word));
      
      if (hasSuspiciousSuffix) {
        return false;
      }
      
      return true;
    },
  },
  date_of_birth: {
    pattern: /\b(?:dob|date of birth|born|birthday)[\s:]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/gi,
    confidence: 0.85,
  },
  ifsc_code: {
    // Indian Financial System Code: 4 letters (bank) + 0 + 6 alphanumeric (branch)
    // Examples: HDFC0001234, SBIN0012345, ICIC0006789
    pattern: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    confidence: 0.90,
    validator: (match) => {
      // Known bank codes (first 4 letters)
      const knownBanks = [
        'HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK', 'PUNB', 'BARB', 'CNRB', 'UBIN', 'IOBA',
        'BKID', 'CBIN', 'CORP', 'IDIB', 'MAHB', 'ORBC', 'PSIB', 'SYNB', 'VIJB', 'ALLA',
        'ANDB', 'UCBA', 'FDRL', 'KARB', 'SIBL', 'YESB', 'RATN', 'INDB', 'CITI', 'HSBC',
        'SCBL', 'DBSS', 'AXIS', 'AIRP', 'PAYT', 'IPPB', 'PYTM', 'JAKA', 'SVCB', 'TMBL',
      ];
      const bankCode = match.substring(0, 4).toUpperCase();
      return knownBanks.includes(bankCode);
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MASKING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mask a single sensitive value
 */
export function maskValue(
  value: string,
  type: SensitiveDataType,
  config: MaskingConfig = DEFAULT_MASKING_CONFIG
): string {
  // Full mask for certain types
  if (config.fullyMask.includes(type)) {
    return config.maskCharacter.repeat(value.length);
  }
  
  // Partial masking
  const start = value.slice(0, config.preserveStart);
  const end = value.slice(-config.preserveEnd);
  const middleLength = Math.max(0, value.length - config.preserveStart - config.preserveEnd);
  const masked = config.maskCharacter.repeat(middleLength);
  
  return start + masked + end;
}

/**
 * Mask phone number with specific format
 */
function maskPhoneNumber(phone: string): string {
  // Keep country code and last 2 digits visible
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+91') || cleaned.startsWith('91')) {
    const prefix = cleaned.startsWith('+91') ? '+91 ' : '';
    const number = cleaned.replace(/^\+?91/, '');
    return `${prefix}${number.slice(0, 2)}****${number.slice(-2)}`;
  }
  return `${cleaned.slice(0, 2)}****${cleaned.slice(-2)}`;
}

/**
 * Mask email with specific format
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 
    ? `${local[0]}***${local.slice(-1)}`
    : `${local[0]}***`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask Aadhaar with specific format
 */
function maskAadhaar(aadhaar: string): string {
  const cleaned = aadhaar.replace(/[\s-]/g, '');
  return `****-****-${cleaned.slice(-4)}`;
}

/**
 * Mask PAN with specific format
 */
function maskPAN(pan: string): string {
  return `${pan.slice(0, 2)}***${pan.slice(-2)}`.toUpperCase();
}

/**
 * Mask credit card with specific format
 */
function maskCreditCard(card: string): string {
  const cleaned = card.replace(/[\s-]/g, '');
  return `****-****-****-${cleaned.slice(-4)}`;
}

/**
 * Get type-specific masking function
 */
function getMasker(type: SensitiveDataType): (value: string) => string {
  const maskers: Partial<Record<SensitiveDataType, (value: string) => string>> = {
    phone_number: maskPhoneNumber,
    email: maskEmail,
    aadhaar: maskAadhaar,
    pan: maskPAN,
    credit_card: maskCreditCard,
  };
  
  return maskers[type] || ((v) => maskValue(v, type));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MASKING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mask all sensitive data in text
 */
export function maskSensitiveData(
  text: string,
  config: MaskingConfig = DEFAULT_MASKING_CONFIG
): MaskingResult {
  let maskedText = text;
  const sensitiveDataFound: DetectedSensitiveData[] = [];
  
  // Process each type of sensitive data
  for (const [type, { pattern, confidence, validator }] of Object.entries(SENSITIVE_PATTERNS)) {
    const dataType = type as SensitiveDataType;
    let match;
    
    // Reset pattern
    const regex = new RegExp(pattern.source, pattern.flags);
    
    while ((match = regex.exec(text)) !== null) {
      // Get the actual sensitive value (might be in a capture group)
      const original = match[1] || match[0];
      
      // Validate if validator exists
      if (validator && !validator(original)) {
        continue;
      }
      
      // Get appropriate masker
      const masker = getMasker(dataType);
      const masked = masker(original);
      
      sensitiveDataFound.push({
        type: dataType,
        original,
        masked,
        position: match.index,
        confidence,
      });
      
      // Replace ALL occurrences in masked text (not just first)
      maskedText = maskedText.replaceAll(original, masked);
    }
  }
  
  return {
    maskedText,
    sensitiveDataFound,
    wasModified: sensitiveDataFound.length > 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if text contains sensitive data
 */
export function containsSensitiveData(text: string): boolean {
  for (const { pattern, validator } of Object.values(SENSITIVE_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const value = match[1] || match[0];
      if (!validator || validator(value)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Detect sensitive data types in text
 */
export function detectSensitiveTypes(text: string): SensitiveDataType[] {
  const types: SensitiveDataType[] = [];
  
  for (const [type, { pattern, validator }] of Object.entries(SENSITIVE_PATTERNS)) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const value = match[1] || match[0];
      if (!validator || validator(value)) {
        types.push(type as SensitiveDataType);
        break;
      }
    }
  }
  
  return types;
}

/**
 * Format masking result for logging
 */
export function formatMaskingResult(result: MaskingResult): string {
  if (!result.wasModified) {
    return 'no sensitive data detected';
  }
  
  const summary = result.sensitiveDataFound
    .map(d => `${d.type}: ${d.original} → ${d.masked}`)
    .join('\n');
  
  return `masked ${result.sensitiveDataFound.length} sensitive item(s):\n${summary}`;
}

/**
 * Mask response before sending to user
 */
export function maskResponseForUser(response: string): string {
  const result = maskSensitiveData(response);
  return result.maskedText;
}

/**
 * Mask response for logging (more aggressive)
 */
export function maskForLogging(response: string): string {
  const config: MaskingConfig = {
    ...DEFAULT_MASKING_CONFIG,
    fullyMask: ['password', 'otp', 'credit_card', 'bank_account', 'aadhaar', 'pan'],
    preserveStart: 1,
    preserveEnd: 1,
  };
  
  const result = maskSensitiveData(response, config);
  return result.maskedText;
}
