/**
 * Entity Name Normalizer
 *
 * Deterministic find-replace for Jio brand names.
 * Ensures consistent capitalization and spacing per brand guidelines.
 *
 * @module services/postprocess/entityNormalizer
 */

const ENTITY_MAP: Array<{ pattern: RegExp; replacement: string }> = [
  // Core brand
  { pattern: /\bJio\s+Fiber\b/gi, replacement: 'JioFiber' },
  { pattern: /\bJio\s+Cinema\b/gi, replacement: 'JioCinema' },
  { pattern: /\bJio\s+Saavn\b/gi, replacement: 'JioSaavn' },
  { pattern: /\bJio\s+Mart\b/gi, replacement: 'JioMart' },
  { pattern: /\bJio\s+Cloud\b/gi, replacement: 'JioCloud' },
  { pattern: /\bJio\s+TV\b/gi, replacement: 'JioTV' },
  { pattern: /\bJio\s+TV\+\b/gi, replacement: 'JioTV+' },
  { pattern: /\bJio\s+Phone\b/gi, replacement: 'JioPhone' },
  { pattern: /\bJio\s+Pay\b/gi, replacement: 'JioPay' },
  { pattern: /\bJio\s+Meet\b/gi, replacement: 'JioMeet' },
  { pattern: /\bJio\s+Switch\b/gi, replacement: 'JioSwitch' },
  { pattern: /\bJio\s+Games\b/gi, replacement: 'JioGames' },
  { pattern: /\bJio\s+News\b/gi, replacement: 'JioNews' },
  { pattern: /\bJio\s+Health\b/gi, replacement: 'JioHealth' },
  { pattern: /\bJio\s+Things\b/gi, replacement: 'JioThings' },
  { pattern: /\bJio\s+Business\b/gi, replacement: 'JioBusiness' },
  { pattern: /\bJio\s+Security\b/gi, replacement: 'JioSecurity' },
  { pattern: /\bJio\s+Money\b/gi, replacement: 'JioMoney' },
  { pattern: /\bJio\s+Together\b/gi, replacement: 'JioTogether' },

  // AirFiber
  { pattern: /\bJio\s+Air\s*Fiber\b/gi, replacement: 'JioAirFiber' },
  { pattern: /\bJioAir\s*Fiber\b/g, replacement: 'JioAirFiber' },

  // My Jio
  { pattern: /\bMy\s+Jio\b/g, replacement: 'MyJio' },
  { pattern: /\bmyjio\b/gi, replacement: 'MyJio' },

  // Jio Brain / Jio Platforms
  { pattern: /\bJio\s+Brain\b/gi, replacement: 'JioBrain' },
  { pattern: /\bJio\s+Platforms\b/gi, replacement: 'Jio Platforms' },

  // Common misspellings
  { pattern: /\bjiofibre\b/gi, replacement: 'JioFiber' },
  { pattern: /\bjio\s*fi\b/gi, replacement: 'JioFiber' },
  { pattern: /\bjiocinema\b/g, replacement: 'JioCinema' },
  { pattern: /\bjiosaavn\b/g, replacement: 'JioSaavn' },
  { pattern: /\bjiomart\b/g, replacement: 'JioMart' },
  { pattern: /\bjiotv\b/g, replacement: 'JioTV' },
  { pattern: /\bjiocloud\b/g, replacement: 'JioCloud' },
  { pattern: /\bjiogames\b/g, replacement: 'JioGames' },
  { pattern: /\bjionews\b/g, replacement: 'JioNews' },
  { pattern: /\bjiophone\b/g, replacement: 'JioPhone' },

  // Currency normalization
  { pattern: /\bRs\.?\s*/g, replacement: '₹' },
  { pattern: /\bINR\s*/g, replacement: '₹' },
  { pattern: /\bRupees?\s*/gi, replacement: '₹' },

  // Parent company
  { pattern: /\bReliance\s+Jio\b/gi, replacement: 'Jio' },
];

export interface NormalizerResult {
  content: string;
  replacementCount: number;
  replacements: Array<{ from: string; to: string }>;
}

/**
 * Normalize entity names in content.
 * Safe, deterministic, idempotent.
 */
export function normalizeEntities(content: string): NormalizerResult {
  let result = content;
  const replacements: Array<{ from: string; to: string }> = [];
  let totalCount = 0;

  for (const { pattern, replacement } of ENTITY_MAP) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(result)) !== null) {
      if (match[0] !== replacement) {
        replacements.push({ from: match[0], to: replacement });
        totalCount++;
      }
    }
    result = result.replace(pattern, replacement);
  }

  return {
    content: result,
    replacementCount: totalCount,
    replacements,
  };
}
