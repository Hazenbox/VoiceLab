/**
 * Ecosystem Registry
 * 
 * 10 Ecosystems representing different Jio business contexts.
 * Each ecosystem has a specific tone that guides content generation.
 * 
 * @module services/guidelines/ecosystems
 */

import type { EcosystemType } from '../../types';

/**
 * Ecosystem definition with tone and description
 */
export interface Ecosystem {
  id: EcosystemType;
  name: string;
  tone: string;
  description: string;
  keywords: string[];
}

/**
 * 10 Ecosystems - Complete registry
 */
export const ECOSYSTEMS: readonly Ecosystem[] = [
  {
    id: 'connectivity',
    name: 'Connectivity',
    tone: 'Quick, crisp, confident',
    description: 'Jio mobile, fiber, network services - keeping India connected',
    keywords: ['network', 'signal', 'data', 'recharge', 'plan', '5G', '4G', 'SIM'],
  },
  {
    id: 'home',
    name: 'Home',
    tone: 'Warm, familiar, relaxed',
    description: 'JioFiber, home entertainment, smart home solutions',
    keywords: ['fiber', 'broadband', 'wifi', 'router', 'home', 'family', 'streaming'],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    tone: 'Playful, expressive, energetic',
    description: 'JioCinema, JioTV, JioSaavn - entertainment for every mood',
    keywords: ['movies', 'shows', 'music', 'streaming', 'watch', 'listen', 'live'],
  },
  {
    id: 'shopping',
    name: 'Shopping',
    tone: 'Cheerful, helpful, straight-talking',
    description: 'JioMart, retail, e-commerce - shopping made easy',
    keywords: ['order', 'delivery', 'cart', 'discount', 'offer', 'grocery', 'buy'],
  },
  {
    id: 'finance',
    name: 'Finance',
    tone: 'Calm, clear, trustworthy',
    description: 'JioPayments, banking, insurance - secure financial services',
    keywords: ['payment', 'UPI', 'wallet', 'bank', 'insurance', 'loan', 'money'],
  },
  {
    id: 'health',
    name: 'Health',
    tone: 'Caring, steady, informed',
    description: 'JioHealthHub, wellness, telemedicine - health at your fingertips',
    keywords: ['doctor', 'medicine', 'health', 'wellness', 'appointment', 'pharmacy'],
  },
  {
    id: 'business',
    name: 'Business',
    tone: 'Sharp, professional, future-focused',
    description: 'Enterprise solutions, B2B services - empowering businesses',
    keywords: ['enterprise', 'business', 'cloud', 'solution', 'corporate', 'partner'],
  },
  {
    id: 'support',
    name: 'Support',
    tone: 'Empathetic, patient, solution-focused',
    description: 'Customer care, troubleshooting, service requests',
    keywords: ['help', 'issue', 'problem', 'complaint', 'resolve', 'support', 'assist'],
  },
  {
    id: 'internal',
    name: 'Internal',
    tone: 'Respectful, sincere, supportive',
    description: 'Employee communications, internal announcements, HR',
    keywords: ['team', 'employee', 'announcement', 'policy', 'hr', 'training'],
  },
  {
    id: 'government',
    name: 'Government',
    tone: 'Formal, respectful, precise',
    description: 'G2C services, compliance communications, regulatory',
    keywords: ['government', 'compliance', 'regulatory', 'official', 'mandate'],
  },
] as const;

/**
 * Get ecosystem by ID
 */
export function getEcosystem(id: EcosystemType): Ecosystem {
  const ecosystem = ECOSYSTEMS.find(e => e.id === id);
  if (!ecosystem) {
    throw new Error(`Unknown ecosystem: ${id}`);
  }
  return ecosystem;
}

/**
 * Get ecosystem by detecting keywords in text
 */
export function detectEcosystem(text: string): EcosystemType | null {
  const lowerText = text.toLowerCase();
  
  for (const ecosystem of ECOSYSTEMS) {
    const matchCount = ecosystem.keywords.filter(kw => 
      lowerText.includes(kw.toLowerCase())
    ).length;
    
    if (matchCount >= 2) {
      return ecosystem.id;
    }
  }
  
  return null;
}

// =============================================================================
// PRODUCT DETECTION - Separate from ecosystem (for transparency layer)
// =============================================================================

/**
 * Jio product definition for detection
 */
export interface JioProduct {
  id: string;
  name: string;
  displayName: string;
  keywords: string[];
  relatedEcosystem: EcosystemType;
  description: string;
}

/**
 * Jio Products Registry - All detectable Jio products
 */
export const JIO_PRODUCTS: readonly JioProduct[] = [
  // Connectivity Products
  {
    id: 'jio_recharge',
    name: 'Jio Recharge',
    displayName: 'Jio Recharge',
    keywords: ['recharge', 'prepaid', 'top up', 'topup', 'validity', 'talktime'],
    relatedEcosystem: 'connectivity',
    description: 'Mobile recharge and prepaid plans',
  },
  {
    id: 'jio_sim',
    name: 'Jio SIM',
    displayName: 'Jio SIM',
    keywords: ['sim', 'new connection', 'port', 'mnp', 'number'],
    relatedEcosystem: 'connectivity',
    description: 'SIM cards and new connections',
  },
  {
    id: 'jio_postpaid',
    name: 'Jio Postpaid',
    displayName: 'Jio Postpaid',
    keywords: ['postpaid', 'bill', 'billing', 'monthly plan'],
    relatedEcosystem: 'connectivity',
    description: 'Postpaid mobile plans',
  },
  {
    id: 'jio_5g',
    name: 'Jio 5G',
    displayName: 'Jio True 5G',
    keywords: ['5g', 'true 5g', '5g network', '5g speed'],
    relatedEcosystem: 'connectivity',
    description: '5G network services',
  },
  // Home Products
  {
    id: 'jio_fiber',
    name: 'Jio Fiber',
    displayName: 'JioFiber',
    keywords: ['fiber', 'fibre', 'jiofiber', 'broadband', 'home internet', 'wifi'],
    relatedEcosystem: 'home',
    description: 'Home broadband and fiber internet',
  },
  {
    id: 'jio_airfiber',
    name: 'Jio AirFiber',
    displayName: 'Jio AirFiber',
    keywords: ['airfiber', 'air fiber', 'wireless broadband'],
    relatedEcosystem: 'home',
    description: 'Wireless home broadband',
  },
  // Entertainment Products
  {
    id: 'jio_cinema',
    name: 'JioCinema',
    displayName: 'JioCinema',
    keywords: ['jiocinema', 'cinema', 'movies', 'shows', 'watch', 'streaming', 'ott'],
    relatedEcosystem: 'entertainment',
    description: 'OTT streaming platform for movies and shows',
  },
  {
    id: 'jio_tv',
    name: 'JioTV',
    displayName: 'JioTV',
    keywords: ['jiotv', 'tv', 'live tv', 'channels', 'television'],
    relatedEcosystem: 'entertainment',
    description: 'Live TV streaming',
  },
  {
    id: 'jio_saavn',
    name: 'JioSaavn',
    displayName: 'JioSaavn',
    keywords: ['jiosaavn', 'saavn', 'music', 'songs', 'playlist', 'podcast'],
    relatedEcosystem: 'entertainment',
    description: 'Music and podcast streaming',
  },
  // Shopping Products
  {
    id: 'jio_mart',
    name: 'JioMart',
    displayName: 'JioMart',
    keywords: ['jiomart', 'mart', 'grocery', 'shopping', 'delivery', 'order'],
    relatedEcosystem: 'shopping',
    description: 'Online grocery and shopping',
  },
  // Finance Products
  {
    id: 'jio_pay',
    name: 'Jio Pay',
    displayName: 'JioPay',
    keywords: ['jiopay', 'pay', 'upi', 'payment', 'wallet', 'money transfer'],
    relatedEcosystem: 'finance',
    description: 'Digital payments and UPI',
  },
  // Health Products
  {
    id: 'jio_health',
    name: 'JioHealthHub',
    displayName: 'JioHealthHub',
    keywords: ['jiohealth', 'health', 'doctor', 'medicine', 'consultation'],
    relatedEcosystem: 'health',
    description: 'Healthcare and telemedicine',
  },
  // Business Products
  {
    id: 'jio_business',
    name: 'Jio Business',
    displayName: 'Jio Business Solutions',
    keywords: ['jio business', 'enterprise', 'corporate', 'b2b', 'iot'],
    relatedEcosystem: 'business',
    description: 'Enterprise and business solutions',
  },
] as const;

/**
 * Detection result for product identification
 */
export interface ProductDetectionResult {
  product: JioProduct | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  matchedKeywords: string[];
  suggestedEcosystem: EcosystemType | null;
  ecosystemMismatch: boolean;
}

/**
 * Detect Jio product mentioned in user text
 * This is separate from ecosystem detection to support the transparency layer
 */
export function detectProduct(text: string, selectedEcosystem?: EcosystemType): ProductDetectionResult {
  const lowerText = text.toLowerCase();
  
  let bestMatch: JioProduct | null = null;
  let bestMatchCount = 0;
  let matchedKeywords: string[] = [];
  
  for (const product of JIO_PRODUCTS) {
    const matches = product.keywords.filter(kw => lowerText.includes(kw.toLowerCase()));
    
    if (matches.length > bestMatchCount) {
      bestMatchCount = matches.length;
      bestMatch = product;
      matchedKeywords = matches;
    }
  }
  
  // Determine confidence based on match count
  let confidence: ProductDetectionResult['confidence'] = 'none';
  if (bestMatchCount >= 3) confidence = 'high';
  else if (bestMatchCount >= 2) confidence = 'medium';
  else if (bestMatchCount >= 1) confidence = 'low';
  
  // Check for ecosystem mismatch
  const ecosystemMismatch = bestMatch !== null && 
    selectedEcosystem !== undefined && 
    bestMatch.relatedEcosystem !== selectedEcosystem;
  
  return {
    product: bestMatch,
    confidence,
    matchedKeywords,
    suggestedEcosystem: bestMatch?.relatedEcosystem || null,
    ecosystemMismatch,
  };
}

/**
 * Get product by ID
 */
export function getProduct(id: string): JioProduct | undefined {
  return JIO_PRODUCTS.find(p => p.id === id);
}

/**
 * Get all products for a given ecosystem
 */
export function getProductsByEcosystem(ecosystem: EcosystemType): JioProduct[] {
  return JIO_PRODUCTS.filter(p => p.relatedEcosystem === ecosystem);
}

/**
 * Get ecosystems for dropdown display
 */
export function getEcosystemOptions(): Array<{ value: EcosystemType; label: string; description: string }> {
  return ECOSYSTEMS.map(e => ({
    value: e.id,
    label: e.name,
    description: e.tone,
  }));
}

export default ECOSYSTEMS;
