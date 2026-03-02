/**
 * Music Topic Detector
 * 
 * Detects music-related content in AI responses and extracts search queries
 * for JioSaavn exploration.
 */

import type { MusicTopicResult } from './types';

const MUSIC_KEYWORDS = {
  high: [
    'music', 'song', 'songs', 'playlist', 'playlists', 'album', 'albums',
    'artist', 'artists', 'singer', 'singers', 'band', 'bands', 'concert',
    'concerts', 'jiosaavn', 'saavn', 'spotify', 'musician', 'musicians',
    'soundtrack', 'soundtracks', 'discography', 'ep', 'single', 'singles',
    'track', 'tracks', 'tune', 'tunes', 'composition', 'compositions',
  ],
  medium: [
    'jazz', 'rock', 'pop', 'classical', 'bollywood', 'hip-hop', 'hip hop',
    'indie', 'folk', 'country', 'blues', 'soul', 'r&b', 'rnb', 'reggae',
    'electronic', 'edm', 'techno', 'house', 'trance', 'dubstep', 'metal',
    'punk', 'alternative', 'grunge', 'disco', 'funk', 'gospel', 'opera',
    'symphony', 'orchestra', 'carnatic', 'hindustani', 'ghazal', 'qawwali',
    'sufi', 'devotional', 'bhajan', 'kirtan', 'filmi', 'playback',
    'rap', 'rapper', 'rappers', 'lo-fi', 'lofi', 'ambient', 'acoustic',
    'unplugged', 'remix', 'mashup', 'cover', 'covers',
  ],
  low: [
    'guitar', 'piano', 'drums', 'violin', 'flute', 'sitar', 'tabla',
    'harmonium', 'veena', 'sarod', 'santoor', 'saxophone', 'trumpet',
    'bass', 'keyboard', 'synthesizer', 'melody', 'rhythm', 'beat',
    'beats', 'chord', 'chords', 'raga', 'ragas', 'taal', 'tempo',
    'harmony', 'lyrics', 'lyricist', 'composer', 'composers', 'vocal',
    'vocals', 'vocalist', 'duet', 'trio', 'quartet', 'ensemble',
  ],
};

const CONFIDENCE_WEIGHTS = {
  high: 0.9,
  medium: 0.6,
  low: 0.3,
};

const MIN_CONFIDENCE_THRESHOLD = 0.4;

const GENRE_PATTERNS = [
  /\b(indian|hindi|tamil|telugu|punjabi|bengali|marathi|gujarati|kannada|malayalam)\s+(music|songs?|jazz|rock|pop|classical|folk)\b/gi,
  /\b(jazz|rock|pop|classical|bollywood|indie|folk|blues|soul|hip-hop|electronic)\s+(music|songs?|artists?|bands?|scene)\b/gi,
  /\b(music|songs?)\s+(from|of|in)\s+\w+/gi,
];

const ARTIST_CONTEXT_PATTERNS = [
  /\bartists?\s+like\s+([^,.]+)/gi,
  /\bsinger[s]?\s+(?:like|such as|including)\s+([^,.]+)/gi,
  /\bmusician[s]?\s+(?:like|such as|including)\s+([^,.]+)/gi,
  /\bband[s]?\s+(?:like|such as|including)\s+([^,.]+)/gi,
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function findMatchedKeywords(text: string): {
  matched: string[];
  confidence: number;
} {
  const normalizedText = normalizeText(text);
  const words = new Set(normalizedText.split(/\s+/));
  const matched: string[] = [];
  let totalWeight = 0;
  let matchCount = 0;
  
  for (const [level, keywords] of Object.entries(MUSIC_KEYWORDS)) {
    const weight = CONFIDENCE_WEIGHTS[level as keyof typeof CONFIDENCE_WEIGHTS];
    
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      
      if (keywordLower.includes(' ')) {
        if (normalizedText.includes(keywordLower)) {
          matched.push(keyword);
          totalWeight += weight;
          matchCount++;
        }
      } else {
        if (words.has(keywordLower)) {
          matched.push(keyword);
          totalWeight += weight;
          matchCount++;
        }
      }
    }
  }
  
  const confidence = matchCount > 0 
    ? Math.min(1, totalWeight / Math.max(1, matchCount * 0.5))
    : 0;
  
  return { matched, confidence };
}

function extractGenrePhrase(text: string): string | null {
  const normalizedText = normalizeText(text);
  
  for (const pattern of GENRE_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(normalizedText);
    if (match) {
      return match[0].trim();
    }
  }
  
  return null;
}

function extractArtistMention(text: string): string | null {
  const normalizedText = normalizeText(text);
  
  for (const pattern of ARTIST_CONTEXT_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(normalizedText);
    if (match && match[1]) {
      const artistName = match[1].trim();
      if (artistName.length > 2 && artistName.length < 50) {
        return artistName;
      }
    }
  }
  
  return null;
}

export function extractSearchQuery(text: string, matchedKeywords: string[]): string {
  const genrePhrase = extractGenrePhrase(text);
  if (genrePhrase) {
    const cleaned = genrePhrase
      .replace(/\b(music|songs?|artists?|bands?|scene)\b/gi, '')
      .trim();
    if (cleaned.length > 2) {
      return `${cleaned} music`.slice(0, 50);
    }
    return genrePhrase.slice(0, 50);
  }
  
  const artistMention = extractArtistMention(text);
  if (artistMention) {
    return artistMention.slice(0, 50);
  }
  
  const highPriorityGenres = matchedKeywords.filter(kw => 
    MUSIC_KEYWORDS.medium.includes(kw.toLowerCase())
  );
  
  if (highPriorityGenres.length > 0) {
    const genre = highPriorityGenres[0];
    return `${genre} music`.slice(0, 50);
  }
  
  if (matchedKeywords.length > 0) {
    const topKeywords = matchedKeywords.slice(0, 2);
    return topKeywords.join(' ').slice(0, 50);
  }
  
  return 'popular music';
}

export function detectMusicTopic(content: string): MusicTopicResult {
  if (!content || content.trim().length < 20) {
    return {
      detected: false,
      searchQuery: '',
      confidence: 0,
      matchedKeywords: [],
    };
  }
  
  const { matched, confidence } = findMatchedKeywords(content);
  
  const hasGenrePattern = GENRE_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(content);
  });
  
  const adjustedConfidence = hasGenrePattern 
    ? Math.min(1, confidence + 0.2)
    : confidence;
  
  const detected = adjustedConfidence >= MIN_CONFIDENCE_THRESHOLD && matched.length >= 2;
  
  const searchQuery = detected ? extractSearchQuery(content, matched) : '';
  
  return {
    detected,
    searchQuery,
    confidence: adjustedConfidence,
    matchedKeywords: matched,
  };
}

export function isMusicRelated(content: string): boolean {
  const result = detectMusicTopic(content);
  return result.detected;
}
