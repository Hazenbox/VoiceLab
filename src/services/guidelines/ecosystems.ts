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
