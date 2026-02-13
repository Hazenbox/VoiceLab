/**
 * Query Expander
 * 
 * Expands user queries with Jio-specific synonyms and related terms
 * to improve RAG retrieval recall.
 * 
 * @module services/rag/queryExpander
 */

// ═══════════════════════════════════════════════════════════════════════════════
// JIO-SPECIFIC SYNONYM DICTIONARY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Jio ecosystem synonyms - maps common terms to related search terms
 */
export const JIO_SYNONYMS: Record<string, string[]> = {
  // ── Telecom / Connectivity ─────────────────────────────────────────
  'recharge': ['top up', 'prepaid', 'balance', 'validity', 'pack', 'plan'],
  'plan': ['pack', 'offer', 'tariff', 'scheme', 'subscription'],
  'data': ['internet', 'mb', 'gb', 'bandwidth', 'speed', 'network'],
  'network': ['signal', 'connectivity', 'coverage', 'tower', '4g', '5g'],
  'sim': ['number', 'mobile', 'connection', 'porting', 'mnp'],
  'balance': ['credit', 'amount', 'validity', 'remaining'],
  'call': ['voice', 'minutes', 'talktime', 'incoming', 'outgoing'],
  'sms': ['text', 'message', 'messages'],
  'roaming': ['international', 'ir', 'abroad', 'travel'],
  
  // ── Jio Products ───────────────────────────────────────────────────
  'jiofiber': ['fiber', 'broadband', 'wifi', 'home internet', 'ftth'],
  'jiotv': ['tv', 'live tv', 'channels', 'streaming'],
  'jiocinema': ['cinema', 'movies', 'ott', 'streaming', 'shows'],
  'jiosavan': ['saavn', 'music', 'songs', 'podcast'],
  'jiocloud': ['cloud', 'storage', 'backup', 'photos'],
  'jiomeet': ['meet', 'video call', 'conference', 'meeting'],
  'jiomart': ['mart', 'grocery', 'shopping', 'delivery'],
  'jiomoney': ['money', 'wallet', 'upi', 'payment'],
  'jiopos': ['pos', 'retailer', 'merchant', 'partner'],
  
  // ── Account & Billing ──────────────────────────────────────────────
  'bill': ['invoice', 'payment', 'due', 'postpaid', 'amount'],
  'payment': ['pay', 'transaction', 'upi', 'debit', 'credit'],
  'account': ['profile', 'login', 'myjio', 'user'],
  'password': ['pin', 'otp', 'security', 'reset', 'forgot'],
  'kyc': ['verification', 'aadhaar', 'document', 'identity'],
  
  // ── Support & Issues ───────────────────────────────────────────────
  'issue': ['problem', 'error', 'not working', 'failed', 'stuck'],
  'slow': ['speed', 'buffering', 'lag', 'latency'],
  'complaint': ['grievance', 'feedback', 'problem', 'issue'],
  'refund': ['reversal', 'cashback', 'credit', 'return'],
  'cancel': ['deactivate', 'stop', 'unsubscribe', 'remove'],
  'activate': ['enable', 'start', 'subscribe', 'add'],
  
  // ── Device Related ─────────────────────────────────────────────────
  'phone': ['mobile', 'handset', 'device', 'smartphone'],
  'router': ['wifi', 'modem', 'ont', 'gateway'],
  'settop': ['stb', 'set top box', 'cable box'],
  
  // ── Content / Communication ────────────────────────────────────────
  'notification': ['alert', 'message', 'sms', 'push'],
  'offer': ['deal', 'discount', 'promotion', 'cashback'],
  'help': ['support', 'assist', 'guide', 'how to'],
  
  // ── Indian Context ─────────────────────────────────────────────────
  'rupees': ['rs', 'inr', '₹', 'amount'],
  'aadhaar': ['aadhar', 'uid', 'uidai', 'identity'],
  'upi': ['bhim', 'gpay', 'phonepe', 'paytm'],
};

/**
 * Channel-specific terms that should be expanded
 */
export const CHANNEL_EXPANSIONS: Record<string, string[]> = {
  'push_notification': ['notification', 'alert', 'push', 'mobile alert'],
  'email': ['mail', 'email', 'inbox', 'newsletter'],
  'sms': ['text', 'message', 'sms', 'text message'],
  'ivr': ['call', 'voice', 'phone', 'automated'],
  'whatsapp': ['wa', 'whatsapp', 'chat'],
  'chatbot': ['bot', 'chat', 'assistant', 'automated'],
  'social_media': ['social', 'facebook', 'twitter', 'instagram'],
};

/**
 * Ecosystem-specific terms
 */
export const ECOSYSTEM_EXPANSIONS: Record<string, string[]> = {
  'jio_platforms': ['jio', 'reliance jio', 'jio infocomm'],
  'jio_telecom': ['mobile', 'prepaid', 'postpaid', 'sim', 'network'],
  'jio_fiber': ['broadband', 'fiber', 'home', 'wifi', 'internet'],
  'jio_entertainment': ['ott', 'streaming', 'tv', 'music', 'cinema'],
  'jio_financial': ['payment', 'wallet', 'upi', 'money'],
  'jio_retail': ['mart', 'shopping', 'grocery', 'delivery'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY EXPANSION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExpandedQuery {
  /** Original query */
  original: string;
  /** Expanded query with synonyms added */
  expanded: string;
  /** Individual synonyms that were added */
  addedTerms: string[];
  /** Whether the query was modified */
  wasExpanded: boolean;
}

/**
 * Expand a query with Jio-specific synonyms
 * 
 * @param query - Original search query
 * @param maxExpansions - Maximum number of synonym expansions per term (default: 3)
 * @returns Expanded query object
 */
export function expandQuery(
  query: string,
  maxExpansions: number = 3
): ExpandedQuery {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  const addedTerms: string[] = [];
  
  // Find matching synonyms
  for (const word of words) {
    // Check direct matches in synonym dictionary
    if (JIO_SYNONYMS[word]) {
      const synonyms = JIO_SYNONYMS[word].slice(0, maxExpansions);
      for (const synonym of synonyms) {
        if (!lowerQuery.includes(synonym) && !addedTerms.includes(synonym)) {
          addedTerms.push(synonym);
        }
      }
    }
    
    // Check if any synonym maps back to this word
    for (const [key, values] of Object.entries(JIO_SYNONYMS)) {
      if (values.includes(word) && !lowerQuery.includes(key) && !addedTerms.includes(key)) {
        addedTerms.push(key);
        break; // Only add one reverse mapping per word
      }
    }
  }
  
  // Build expanded query
  const expanded = addedTerms.length > 0
    ? `${query} ${addedTerms.join(' ')}`
    : query;
  
  return {
    original: query,
    expanded,
    addedTerms,
    wasExpanded: addedTerms.length > 0,
  };
}

/**
 * Expand query with channel context
 */
export function expandWithChannel(
  query: string,
  channel: string
): ExpandedQuery {
  const baseExpansion = expandQuery(query);
  
  // Add channel-specific terms
  const channelTerms = CHANNEL_EXPANSIONS[channel] || [];
  const newTerms = channelTerms.filter(
    term => !baseExpansion.expanded.toLowerCase().includes(term)
  ).slice(0, 2);
  
  if (newTerms.length > 0) {
    return {
      original: query,
      expanded: `${baseExpansion.expanded} ${newTerms.join(' ')}`,
      addedTerms: [...baseExpansion.addedTerms, ...newTerms],
      wasExpanded: true,
    };
  }
  
  return baseExpansion;
}

/**
 * Expand query with ecosystem context
 */
export function expandWithEcosystem(
  query: string,
  ecosystem: string
): ExpandedQuery {
  const baseExpansion = expandQuery(query);
  
  // Add ecosystem-specific terms
  const ecosystemTerms = ECOSYSTEM_EXPANSIONS[ecosystem] || [];
  const newTerms = ecosystemTerms.filter(
    term => !baseExpansion.expanded.toLowerCase().includes(term)
  ).slice(0, 2);
  
  if (newTerms.length > 0) {
    return {
      original: query,
      expanded: `${baseExpansion.expanded} ${newTerms.join(' ')}`,
      addedTerms: [...baseExpansion.addedTerms, ...newTerms],
      wasExpanded: true,
    };
  }
  
  return baseExpansion;
}

/**
 * Full expansion with both channel and ecosystem context
 */
export function expandQueryFull(
  query: string,
  options: {
    channel?: string;
    ecosystem?: string;
    maxExpansions?: number;
  } = {}
): ExpandedQuery {
  let result = expandQuery(query, options.maxExpansions);
  
  if (options.channel) {
    const channelTerms = CHANNEL_EXPANSIONS[options.channel] || [];
    const newChannelTerms = channelTerms.filter(
      term => !result.expanded.toLowerCase().includes(term)
    ).slice(0, 2);
    
    if (newChannelTerms.length > 0) {
      result = {
        ...result,
        expanded: `${result.expanded} ${newChannelTerms.join(' ')}`,
        addedTerms: [...result.addedTerms, ...newChannelTerms],
        wasExpanded: true,
      };
    }
  }
  
  if (options.ecosystem) {
    const ecosystemTerms = ECOSYSTEM_EXPANSIONS[options.ecosystem] || [];
    const newEcosystemTerms = ecosystemTerms.filter(
      term => !result.expanded.toLowerCase().includes(term)
    ).slice(0, 2);
    
    if (newEcosystemTerms.length > 0) {
      result = {
        ...result,
        expanded: `${result.expanded} ${newEcosystemTerms.join(' ')}`,
        addedTerms: [...result.addedTerms, ...newEcosystemTerms],
        wasExpanded: true,
      };
    }
  }
  
  return result;
}

/**
 * Get synonyms for a specific term (for UI autocomplete)
 */
export function getSynonyms(term: string): string[] {
  const lower = term.toLowerCase();
  
  // Direct lookup
  if (JIO_SYNONYMS[lower]) {
    return JIO_SYNONYMS[lower];
  }
  
  // Reverse lookup
  for (const [key, values] of Object.entries(JIO_SYNONYMS)) {
    if (values.includes(lower)) {
      return [key, ...values.filter(v => v !== lower)];
    }
  }
  
  return [];
}
