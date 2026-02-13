/**
 * Region Resolver
 * 
 * Resolves regional tokens: state, city, locale, connectivity_profile.
 * Provides geographical context for localized responses.
 * 
 * @module services/user/regionResolver
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Indian states and union territories
 */
export type IndianState =
  | 'andhra_pradesh' | 'arunachal_pradesh' | 'assam' | 'bihar' | 'chhattisgarh'
  | 'goa' | 'gujarat' | 'haryana' | 'himachal_pradesh' | 'jharkhand'
  | 'karnataka' | 'kerala' | 'madhya_pradesh' | 'maharashtra' | 'manipur'
  | 'meghalaya' | 'mizoram' | 'nagaland' | 'odisha' | 'punjab'
  | 'rajasthan' | 'sikkim' | 'tamil_nadu' | 'telangana' | 'tripura'
  | 'uttar_pradesh' | 'uttarakhand' | 'west_bengal'
  | 'delhi' | 'jammu_kashmir' | 'ladakh' | 'chandigarh' | 'puducherry'
  | 'andaman_nicobar' | 'dadra_nagar_haveli' | 'daman_diu' | 'lakshadweep'
  | 'unknown';

/**
 * City tier classification
 */
export type CityTier = 'tier1' | 'tier2' | 'tier3' | 'rural' | 'unknown';

/**
 * Connectivity profile based on region
 */
export type ConnectivityProfile =
  | 'metro_excellent'      // Major metros, 5G
  | 'urban_good'           // Tier 1/2 cities
  | 'semi_urban_moderate'  // Tier 3, towns
  | 'rural_basic'          // Villages, basic coverage
  | 'remote_limited'       // Remote areas, limited
  | 'unknown';

/**
 * Regional language preference
 */
export type RegionalLanguage =
  | 'hindi' | 'english' | 'bengali' | 'telugu' | 'marathi' | 'tamil'
  | 'gujarati' | 'urdu' | 'kannada' | 'odia' | 'malayalam' | 'punjabi'
  | 'assamese' | 'maithili' | 'santali' | 'kashmiri' | 'nepali'
  | 'konkani' | 'sindhi' | 'dogri' | 'manipuri' | 'bodo';

/**
 * Resolved region
 */
export interface ResolvedRegion {
  state: IndianState;
  city: string;
  cityTier: CityTier;
  locale: string;
  connectivityProfile: ConnectivityProfile;
  regionalLanguage: RegionalLanguage;
  timezone: string;
  circle: string; // Telecom circle
}

/**
 * Input for region resolution
 */
export interface RegionResolutionInput {
  state?: string;
  city?: string;
  pincode?: string;
  phonePrefix?: string; // Mobile number prefix for circle detection
  ipGeoLocation?: {
    state?: string;
    city?: string;
    lat?: number;
    lon?: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFERENCE DATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tier 1 cities (Metro)
 */
const TIER1_CITIES: Record<string, IndianState> = {
  'mumbai': 'maharashtra',
  'delhi': 'delhi',
  'new delhi': 'delhi',
  'bangalore': 'karnataka',
  'bengaluru': 'karnataka',
  'hyderabad': 'telangana',
  'chennai': 'tamil_nadu',
  'kolkata': 'west_bengal',
  'pune': 'maharashtra',
  'ahmedabad': 'gujarat',
};

/**
 * Tier 2 cities
 */
const TIER2_CITIES: Record<string, IndianState> = {
  'jaipur': 'rajasthan',
  'lucknow': 'uttar_pradesh',
  'kanpur': 'uttar_pradesh',
  'nagpur': 'maharashtra',
  'indore': 'madhya_pradesh',
  'thane': 'maharashtra',
  'bhopal': 'madhya_pradesh',
  'visakhapatnam': 'andhra_pradesh',
  'patna': 'bihar',
  'vadodara': 'gujarat',
  'ghaziabad': 'uttar_pradesh',
  'ludhiana': 'punjab',
  'agra': 'uttar_pradesh',
  'nashik': 'maharashtra',
  'faridabad': 'haryana',
  'meerut': 'uttar_pradesh',
  'rajkot': 'gujarat',
  'varanasi': 'uttar_pradesh',
  'srinagar': 'jammu_kashmir',
  'aurangabad': 'maharashtra',
  'dhanbad': 'jharkhand',
  'amritsar': 'punjab',
  'allahabad': 'uttar_pradesh',
  'prayagraj': 'uttar_pradesh',
  'ranchi': 'jharkhand',
  'coimbatore': 'tamil_nadu',
  'jabalpur': 'madhya_pradesh',
  'gwalior': 'madhya_pradesh',
  'vijayawada': 'andhra_pradesh',
  'jodhpur': 'rajasthan',
  'madurai': 'tamil_nadu',
  'raipur': 'chhattisgarh',
  'kota': 'rajasthan',
  'chandigarh': 'chandigarh',
  'guwahati': 'assam',
  'solapur': 'maharashtra',
  'hubli': 'karnataka',
  'dharwad': 'karnataka',
  'tiruchirappalli': 'tamil_nadu',
  'bareilly': 'uttar_pradesh',
  'moradabad': 'uttar_pradesh',
  'mysore': 'karnataka',
  'mysuru': 'karnataka',
  'gurgaon': 'haryana',
  'gurugram': 'haryana',
  'aligarh': 'uttar_pradesh',
  'jalandhar': 'punjab',
  'bhubaneswar': 'odisha',
  'noida': 'uttar_pradesh',
  'salem': 'tamil_nadu',
  'warangal': 'telangana',
  'kochi': 'kerala',
  'cochin': 'kerala',
  'thiruvananthapuram': 'kerala',
  'trivandrum': 'kerala',
};

/**
 * State to primary regional language mapping
 */
const STATE_LANGUAGES: Record<IndianState, RegionalLanguage> = {
  andhra_pradesh: 'telugu',
  arunachal_pradesh: 'english',
  assam: 'assamese',
  bihar: 'hindi',
  chhattisgarh: 'hindi',
  goa: 'konkani',
  gujarat: 'gujarati',
  haryana: 'hindi',
  himachal_pradesh: 'hindi',
  jharkhand: 'hindi',
  karnataka: 'kannada',
  kerala: 'malayalam',
  madhya_pradesh: 'hindi',
  maharashtra: 'marathi',
  manipur: 'manipuri',
  meghalaya: 'english',
  mizoram: 'english',
  nagaland: 'english',
  odisha: 'odia',
  punjab: 'punjabi',
  rajasthan: 'hindi',
  sikkim: 'nepali',
  tamil_nadu: 'tamil',
  telangana: 'telugu',
  tripura: 'bengali',
  uttar_pradesh: 'hindi',
  uttarakhand: 'hindi',
  west_bengal: 'bengali',
  delhi: 'hindi',
  jammu_kashmir: 'kashmiri',
  ladakh: 'hindi',
  chandigarh: 'hindi',
  puducherry: 'tamil',
  andaman_nicobar: 'hindi',
  dadra_nagar_haveli: 'gujarati',
  daman_diu: 'gujarati',
  lakshadweep: 'malayalam',
  unknown: 'hindi',
};

/**
 * State to telecom circle mapping
 */
const STATE_CIRCLES: Record<IndianState, string> = {
  andhra_pradesh: 'andhra_pradesh',
  arunachal_pradesh: 'north_east',
  assam: 'assam',
  bihar: 'bihar',
  chhattisgarh: 'madhya_pradesh',
  goa: 'mumbai',
  gujarat: 'gujarat',
  haryana: 'haryana',
  himachal_pradesh: 'himachal_pradesh',
  jharkhand: 'bihar',
  karnataka: 'karnataka',
  kerala: 'kerala',
  madhya_pradesh: 'madhya_pradesh',
  maharashtra: 'maharashtra',
  manipur: 'north_east',
  meghalaya: 'north_east',
  mizoram: 'north_east',
  nagaland: 'north_east',
  odisha: 'orissa',
  punjab: 'punjab',
  rajasthan: 'rajasthan',
  sikkim: 'kolkata',
  tamil_nadu: 'tamil_nadu',
  telangana: 'andhra_pradesh',
  tripura: 'north_east',
  uttar_pradesh: 'uttar_pradesh_west',
  uttarakhand: 'uttar_pradesh_west',
  west_bengal: 'kolkata',
  delhi: 'delhi',
  jammu_kashmir: 'jammu_kashmir',
  ladakh: 'jammu_kashmir',
  chandigarh: 'punjab',
  puducherry: 'chennai',
  andaman_nicobar: 'chennai',
  dadra_nagar_haveli: 'gujarat',
  daman_diu: 'gujarat',
  lakshadweep: 'kerala',
  unknown: 'unknown',
};

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize state name to enum value
 */
export function normalizeState(state?: string): IndianState {
  if (!state) return 'unknown';
  
  const normalized = state.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/&/g, '_')
    .replace(/-/g, '_');
  
  // Handle common variations
  const stateMap: Record<string, IndianState> = {
    'ap': 'andhra_pradesh',
    'up': 'uttar_pradesh',
    'mp': 'madhya_pradesh',
    'hp': 'himachal_pradesh',
    'wb': 'west_bengal',
    'tn': 'tamil_nadu',
    'uk': 'uttarakhand',
    'jk': 'jammu_kashmir',
    'j_k': 'jammu_kashmir',
    'jammu_and_kashmir': 'jammu_kashmir',
    'andaman_and_nicobar': 'andaman_nicobar',
    'dadra_and_nagar_haveli': 'dadra_nagar_haveli',
    'daman_and_diu': 'daman_diu',
    'ncr': 'delhi',
    'nct': 'delhi',
    'new_delhi': 'delhi',
    'orissa': 'odisha',
    'uttaranchal': 'uttarakhand',
  };
  
  if (stateMap[normalized]) {
    return stateMap[normalized];
  }
  
  // Check if it's already a valid state
  const validStates: IndianState[] = [
    'andhra_pradesh', 'arunachal_pradesh', 'assam', 'bihar', 'chhattisgarh',
    'goa', 'gujarat', 'haryana', 'himachal_pradesh', 'jharkhand',
    'karnataka', 'kerala', 'madhya_pradesh', 'maharashtra', 'manipur',
    'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab',
    'rajasthan', 'sikkim', 'tamil_nadu', 'telangana', 'tripura',
    'uttar_pradesh', 'uttarakhand', 'west_bengal',
    'delhi', 'jammu_kashmir', 'ladakh', 'chandigarh', 'puducherry',
    'andaman_nicobar', 'dadra_nagar_haveli', 'daman_diu', 'lakshadweep',
  ];
  
  if (validStates.includes(normalized as IndianState)) {
    return normalized as IndianState;
  }
  
  return 'unknown';
}

/**
 * Detect city tier
 */
export function detectCityTier(city?: string): CityTier {
  if (!city) return 'unknown';
  
  const normalized = city.toLowerCase().trim();
  
  if (TIER1_CITIES[normalized]) return 'tier1';
  if (TIER2_CITIES[normalized]) return 'tier2';
  
  // Check for known tier 1/2 variations
  for (const tier1City of Object.keys(TIER1_CITIES)) {
    if (normalized.includes(tier1City) || tier1City.includes(normalized)) {
      return 'tier1';
    }
  }
  
  for (const tier2City of Object.keys(TIER2_CITIES)) {
    if (normalized.includes(tier2City) || tier2City.includes(normalized)) {
      return 'tier2';
    }
  }
  
  return 'tier3';
}

/**
 * Determine connectivity profile
 */
export function determineConnectivityProfile(
  cityTier: CityTier,
  state: IndianState
): ConnectivityProfile {
  // Metro cities have excellent connectivity
  if (cityTier === 'tier1') {
    return 'metro_excellent';
  }
  
  // Tier 2 cities have good connectivity
  if (cityTier === 'tier2') {
    return 'urban_good';
  }
  
  // Remote states have limited connectivity
  const remoteStates: IndianState[] = [
    'arunachal_pradesh', 'ladakh', 'andaman_nicobar', 'lakshadweep',
  ];
  if (remoteStates.includes(state)) {
    return 'remote_limited';
  }
  
  // North east has moderate connectivity
  const northEastStates: IndianState[] = [
    'assam', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'sikkim', 'tripura',
  ];
  if (northEastStates.includes(state)) {
    return 'semi_urban_moderate';
  }
  
  // Tier 3 cities
  if (cityTier === 'tier3') {
    return 'semi_urban_moderate';
  }
  
  // Rural areas
  if (cityTier === 'rural') {
    return 'rural_basic';
  }
  
  return 'semi_urban_moderate';
}

/**
 * Detect state from city name
 */
export function detectStateFromCity(city?: string): IndianState {
  if (!city) return 'unknown';
  
  const normalized = city.toLowerCase().trim();
  
  // Check tier 1 cities
  if (TIER1_CITIES[normalized]) {
    return TIER1_CITIES[normalized];
  }
  
  // Check tier 2 cities
  if (TIER2_CITIES[normalized]) {
    return TIER2_CITIES[normalized];
  }
  
  // Check for partial matches
  for (const [cityName, state] of Object.entries(TIER1_CITIES)) {
    if (normalized.includes(cityName)) {
      return state;
    }
  }
  
  for (const [cityName, state] of Object.entries(TIER2_CITIES)) {
    if (normalized.includes(cityName)) {
      return state;
    }
  }
  
  return 'unknown';
}

/**
 * Get locale from state
 */
export function getLocale(state: IndianState, language?: RegionalLanguage): string {
  const lang = language || STATE_LANGUAGES[state];
  
  // Map language to locale code
  const localeMap: Record<RegionalLanguage, string> = {
    hindi: 'hi-IN',
    english: 'en-IN',
    bengali: 'bn-IN',
    telugu: 'te-IN',
    marathi: 'mr-IN',
    tamil: 'ta-IN',
    gujarati: 'gu-IN',
    urdu: 'ur-IN',
    kannada: 'kn-IN',
    odia: 'or-IN',
    malayalam: 'ml-IN',
    punjabi: 'pa-IN',
    assamese: 'as-IN',
    maithili: 'mai-IN',
    santali: 'sat-IN',
    kashmiri: 'ks-IN',
    nepali: 'ne-IN',
    konkani: 'kok-IN',
    sindhi: 'sd-IN',
    dogri: 'doi-IN',
    manipuri: 'mni-IN',
    bodo: 'brx-IN',
  };
  
  return localeMap[lang] || 'en-IN';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve complete region information
 */
export function resolveRegion(input: RegionResolutionInput): ResolvedRegion {
  // Determine state
  let state = normalizeState(input.state);
  
  // If no state, try to detect from city
  if (state === 'unknown' && input.city) {
    state = detectStateFromCity(input.city);
  }
  
  // If no state but we have IP geo, use that
  if (state === 'unknown' && input.ipGeoLocation?.state) {
    state = normalizeState(input.ipGeoLocation.state);
  }
  
  // Get city info
  const city = input.city || input.ipGeoLocation?.city || 'unknown';
  const cityTier = detectCityTier(city);
  
  // Get connectivity profile
  const connectivityProfile = determineConnectivityProfile(cityTier, state);
  
  // Get regional language
  const regionalLanguage = STATE_LANGUAGES[state];
  
  // Get locale
  const locale = getLocale(state, regionalLanguage);
  
  // Get telecom circle
  const circle = STATE_CIRCLES[state];
  
  return {
    state,
    city,
    cityTier,
    locale,
    connectivityProfile,
    regionalLanguage,
    timezone: 'Asia/Kolkata', // India has single timezone
    circle,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format region for prompt injection
 */
export function formatRegionForPrompt(region: ResolvedRegion): string {
  const lines = [
    '## regional context',
    `state: ${region.state.replace(/_/g, ' ')}`,
    `city: ${region.city}`,
    `city_tier: ${region.cityTier}`,
    `connectivity: ${region.connectivityProfile}`,
    `regional_language: ${region.regionalLanguage}`,
    `telecom_circle: ${region.circle}`,
  ];
  
  // Connectivity-specific guidance
  if (region.connectivityProfile === 'remote_limited' || region.connectivityProfile === 'rural_basic') {
    lines.push('');
    lines.push('**note**: limited connectivity area - suggest offline options if available');
  }
  
  // Language guidance
  if (region.regionalLanguage !== 'hindi' && region.regionalLanguage !== 'english') {
    lines.push('');
    lines.push(`**note**: regional language is ${region.regionalLanguage} - be prepared for code-switching`);
  }
  
  return lines.join('\n');
}

/**
 * Get connectivity guidance for user
 */
export function getConnectivityGuidance(profile: ConnectivityProfile): string {
  const guidance: Record<ConnectivityProfile, string> = {
    metro_excellent: 'full digital experience available',
    urban_good: 'most features available, may have occasional issues',
    semi_urban_moderate: 'basic features available, suggest lighter options',
    rural_basic: 'limited connectivity, suggest offline/SMS options',
    remote_limited: 'very limited, prefer store/call center guidance',
    unknown: 'suggest checking connectivity',
  };
  return guidance[profile];
}

/**
 * Check if region supports a feature
 */
export function supportsFeature(
  region: ResolvedRegion,
  feature: 'high_speed_data' | 'video_streaming' | '5g' | 'fiber' | 'esim'
): boolean {
  const connectivityRequirements: Record<string, ConnectivityProfile[]> = {
    high_speed_data: ['metro_excellent', 'urban_good'],
    video_streaming: ['metro_excellent', 'urban_good', 'semi_urban_moderate'],
    '5g': ['metro_excellent'],
    fiber: ['metro_excellent', 'urban_good'],
    esim: ['metro_excellent', 'urban_good', 'semi_urban_moderate'],
  };
  
  return connectivityRequirements[feature]?.includes(region.connectivityProfile) ?? false;
}
