/**
 * Project Naming Service
 * Generates meaningful project names from user queries and AI responses
 * ChatGPT-style: Uses user message first, falls back to AI response for greetings
 */

// Common greetings to detect
const GREETINGS = [
  'hi', 'hello', 'hey', 'hii', 'hiii', 'hiiii',
  'good morning', 'good afternoon', 'good evening', 'good night',
  'howdy', 'greetings', 'sup', 'yo', 'hola', 'namaste',
  'what\'s up', 'whats up', 'wassup',
];

// Common filler prefixes to remove from queries
const FILLER_PREFIXES = [
  'can you', 'could you', 'would you', 'will you',
  'please', 'pls', 'plz',
  'help me', 'help me to', 'help me with',
  'i want to', 'i need to', 'i would like to', 'i\'d like to',
  'create a', 'create an', 'create', 
  'write a', 'write an', 'write me', 'write',
  'generate a', 'generate an', 'generate me', 'generate',
  'make a', 'make an', 'make me', 'make',
  'give me a', 'give me an', 'give me',
  'draft a', 'draft an', 'draft',
  'compose a', 'compose an', 'compose',
  'prepare a', 'prepare an', 'prepare',
];

// Common filler words to remove from AI responses
const AI_RESPONSE_FILLERS = [
  'hello', 'hi', 'hey',
  'i\'m here to help', 'i am here to help',
  'i can help you', 'i\'d be happy to',
  'certainly', 'of course', 'sure', 'absolutely',
  'let me', 'here\'s', 'here is',
];

// Stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
  'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just',
  'about', 'some', 'any', 'each', 'every', 'all', 'most', 'other', 'such',
  'this', 'that', 'these', 'those', 'it', 'its',
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
]);

/**
 * Check if a message is just a greeting
 */
export function isGreeting(message: string): boolean {
  if (!message) return true;
  
  const cleaned = message
    .toLowerCase()
    .trim()
    .replace(/[!.,?]+$/g, '') // Remove trailing punctuation
    .replace(/\s+/g, ' '); // Normalize whitespace
  
  // Check if it's a pure greeting or greeting with simple follow-up
  return GREETINGS.some(greeting => 
    cleaned === greeting || 
    cleaned.startsWith(greeting + ' ') ||
    cleaned.startsWith(greeting + ',') ||
    cleaned.startsWith(greeting + '!')
  ) && cleaned.split(' ').length <= 5; // Short messages only
}

/**
 * Clean and normalize text for name extraction
 */
function cleanText(text: string): string {
  return text
    .replace(/[^\w\s-]/g, ' ') // Remove special chars except hyphens
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Remove common filler prefixes from user queries
 */
function removeFillerPrefixes(text: string): string {
  let cleaned = text.toLowerCase().trim();
  
  // Try to remove each filler prefix
  for (const filler of FILLER_PREFIXES) {
    if (cleaned.startsWith(filler + ' ')) {
      cleaned = cleaned.slice(filler.length).trim();
      break; // Only remove one prefix
    }
  }
  
  return cleaned;
}

/**
 * Remove common filler phrases from AI responses
 */
function removeAIFillers(text: string): string {
  let cleaned = text.toLowerCase().trim();
  
  // Remove greeting-style openings
  for (const filler of AI_RESPONSE_FILLERS) {
    if (cleaned.startsWith(filler + ' ') || cleaned.startsWith(filler + ',') || cleaned.startsWith(filler + '!')) {
      const idx = cleaned.indexOf(' ', filler.length);
      if (idx > 0) {
        cleaned = cleaned.slice(idx).trim();
      }
    }
  }
  
  return cleaned;
}

/**
 * Extract key words from text (filter stop words)
 */
function extractKeyWords(text: string, maxWords: number = 5): string[] {
  const words = cleanText(text)
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
  
  return words.slice(0, maxWords);
}

/**
 * Convert text to title case
 */
function toTitleCase(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate a project name from text (user query or AI response)
 * Returns null if no meaningful name can be extracted
 */
export function generateProjectName(text: string): string | null {
  if (!text || text.trim().length < 3) return null;
  
  // Clean and extract meaningful content
  let content = cleanText(text);
  
  // Remove filler prefixes (works for both user and AI text)
  content = removeFillerPrefixes(content);
  content = removeAIFillers(content);
  
  // Extract key words
  const keyWords = extractKeyWords(content, 5);
  
  if (keyWords.length === 0) return null;
  
  // Build name from key words
  let name = keyWords.join(' ');
  
  // Truncate to max 30 characters at word boundary
  if (name.length > 30) {
    const truncated = name.slice(0, 30);
    const lastSpace = truncated.lastIndexOf(' ');
    name = lastSpace > 10 ? truncated.slice(0, lastSpace) : truncated;
  }
  
  // Convert to title case
  name = toTitleCase(name);
  
  // Final validation
  if (name.length < 3) return null;
  
  return name;
}

/**
 * Generate a fallback name based on current date/time
 */
function generateFallbackName(): string {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Chat ${months[now.getMonth()]} ${now.getDate()}`;
}

/**
 * Main function: Generate project name from user message + AI response
 * ChatGPT-style: Uses user message first, falls back to AI response for greetings
 */
export function generateProjectNameFromExchange(
  userMessage: string,
  aiResponse: string
): string | null {
  // Try user message first (if not a greeting)
  if (!isGreeting(userMessage)) {
    const nameFromUser = generateProjectName(userMessage);
    if (nameFromUser) return nameFromUser;
  }
  
  // Fall back to AI response (ChatGPT-style for greetings)
  const nameFromAI = generateProjectName(aiResponse);
  if (nameFromAI) return nameFromAI;
  
  // Ultimate fallback: timestamp-based name
  return generateFallbackName();
}
