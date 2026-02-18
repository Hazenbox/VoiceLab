/**
 * PII Detector & Masker
 *
 * Detects and masks personally identifiable information in generated content.
 * Focused on Indian PII formats (Aadhaar, PAN, phone, bank account, etc.).
 *
 * @module services/postprocess/piiDetector
 */

const PII_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  mask: (match: string) => string;
}> = [
  {
    name: 'aadhaar',
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    mask: (m) => m.slice(0, 4) + ' XXXX XXXX',
  },
  {
    name: 'pan',
    pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    mask: (m) => m.slice(0, 2) + 'XXX' + m.slice(5, 8) + 'XX',
  },
  {
    name: 'phone',
    pattern: /\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g,
    mask: (m) => {
      const digits = m.replace(/\D/g, '');
      const last4 = digits.slice(-4);
      return 'XXXXXX' + last4;
    },
  },
  {
    name: 'email',
    pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    mask: (m) => {
      const [local, domain] = m.split('@');
      return local.slice(0, 2) + '***@' + domain;
    },
  },
  {
    name: 'credit_card',
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    mask: (m) => 'XXXX XXXX XXXX ' + m.replace(/\D/g, '').slice(-4),
  },
  {
    name: 'bank_account',
    pattern: /\b\d{9,18}\b/g,
    mask: (m) => 'XXXXX' + m.slice(-4),
  },
  {
    name: 'ifsc',
    pattern: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    mask: () => 'XXXXXXXXXXX',
  },
  {
    name: 'upi_id',
    pattern: /\b[a-zA-Z0-9._-]+@[a-zA-Z]{2,}\b/g,
    mask: (m) => m.slice(0, 3) + '***@' + m.split('@')[1],
  },
];

export interface PIIDetectionResult {
  content: string;
  detectedCount: number;
  detections: Array<{ type: string; masked: boolean }>;
}

/**
 * Detect and mask PII in content.
 * Run order: after entity normalization, before compliance checks.
 */
export function detectAndMaskPII(content: string): PIIDetectionResult {
  let masked = content;
  const detections: Array<{ type: string; masked: boolean }> = [];

  for (const { name, pattern, mask } of PII_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      // Skip short matches for bank_account (too many false positives)
      if (name === 'bank_account' && match[0].length < 11) continue;
      // Skip UPI IDs that look like normal emails (already caught)
      if (name === 'upi_id' && match[0].includes('.com')) continue;

      detections.push({ type: name, masked: true });
    }

    masked = masked.replace(new RegExp(pattern.source, pattern.flags), (m) => {
      if (name === 'bank_account' && m.length < 11) return m;
      if (name === 'upi_id' && m.includes('.com')) return m;
      return mask(m);
    });
  }

  return {
    content: masked,
    detectedCount: detections.length,
    detections,
  };
}

/**
 * Quick check: does content contain any PII?
 */
export function containsPII(content: string): boolean {
  return PII_PATTERNS.some(({ pattern }) =>
    new RegExp(pattern.source, pattern.flags).test(content)
  );
}
