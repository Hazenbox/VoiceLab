/**
 * Session Memory Service
 * Phase F: Finishing Layer - Session memory tokens for prompt context
 * 
 * Provides short-term, single-session memory via localStorage/sessionStorage
 * for injection into LLM prompts as memory tokens.
 * 
 * Per Tokens v2 specification (Section 12):
 * - memory.session.last_intent: Most recent user intent
 * - memory.session.last_step: Last action step completed
 * - memory.session.last_entity: Key entity from last turn
 */

export interface SessionMemoryTokens {
  'memory.session.last_intent': string | null;
  'memory.session.last_step': string | null;
  'memory.session.last_entity': string | null;
  'memory.session.turn_count': number;
  'memory.session.started_at': number;
  'memory.session.duration_seconds': number;
}

export interface SessionMemoryContext {
  lastIntent: string | null;
  lastStep: string | null;
  lastEntity: string | null;
  turnCount: number;
  startedAt: number;
  lastUpdatedAt: number;
  conversationId?: string;
}

const SESSION_STORAGE_KEY = 'jio_voice_session_memory';
const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get current session memory from storage
 */
export function getSessionMemory(): SessionMemoryContext | null {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    
    const memory: SessionMemoryContext = JSON.parse(stored);
    
    // Check expiry
    const now = Date.now();
    if (now - memory.lastUpdatedAt > SESSION_EXPIRY_MS) {
      clearSessionMemory();
      return null;
    }
    
    return memory;
  } catch {
    return null;
  }
}

/**
 * Initialize a new session memory
 */
export function initSessionMemory(conversationId?: string): SessionMemoryContext {
  const now = Date.now();
  const memory: SessionMemoryContext = {
    lastIntent: null,
    lastStep: null,
    lastEntity: null,
    turnCount: 0,
    startedAt: now,
    lastUpdatedAt: now,
    conversationId,
  };
  
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(memory));
  return memory;
}

/**
 * Update session memory with new turn data
 */
export function updateSessionMemory(updates: {
  intent?: string;
  step?: string;
  entity?: string;
  incrementTurn?: boolean;
}): SessionMemoryContext {
  let memory = getSessionMemory();
  
  if (!memory) {
    memory = initSessionMemory();
  }
  
  if (updates.intent) {
    memory.lastIntent = updates.intent;
  }
  if (updates.step) {
    memory.lastStep = updates.step;
  }
  if (updates.entity) {
    memory.lastEntity = updates.entity;
  }
  if (updates.incrementTurn) {
    memory.turnCount++;
  }
  
  memory.lastUpdatedAt = Date.now();
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(memory));
  
  return memory;
}

/**
 * Clear session memory
 */
export function clearSessionMemory(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Get session memory tokens for prompt injection
 * Returns tokens in the format expected by the token serializer
 */
export function getSessionMemoryTokens(): SessionMemoryTokens {
  const memory = getSessionMemory();
  const now = Date.now();
  
  if (!memory) {
    return {
      'memory.session.last_intent': null,
      'memory.session.last_step': null,
      'memory.session.last_entity': null,
      'memory.session.turn_count': 0,
      'memory.session.started_at': now,
      'memory.session.duration_seconds': 0,
    };
  }
  
  return {
    'memory.session.last_intent': memory.lastIntent,
    'memory.session.last_step': memory.lastStep,
    'memory.session.last_entity': memory.lastEntity,
    'memory.session.turn_count': memory.turnCount,
    'memory.session.started_at': memory.startedAt,
    'memory.session.duration_seconds': Math.floor((now - memory.startedAt) / 1000),
  };
}

/**
 * Format session memory for prompt context block
 */
export function formatSessionMemoryForPrompt(): string {
  const tokens = getSessionMemoryTokens();
  
  const lines: string[] = ['## session memory'];
  
  if (tokens['memory.session.last_intent']) {
    lines.push(`- last intent: ${tokens['memory.session.last_intent']}`);
  }
  if (tokens['memory.session.last_step']) {
    lines.push(`- last step: ${tokens['memory.session.last_step']}`);
  }
  if (tokens['memory.session.last_entity']) {
    lines.push(`- last entity: ${tokens['memory.session.last_entity']}`);
  }
  
  lines.push(`- turn count: ${tokens['memory.session.turn_count']}`);
  lines.push(`- session duration: ${tokens['memory.session.duration_seconds']}s`);
  
  return lines.join('\n');
}

/**
 * Check if we have active session memory
 */
export function hasActiveSession(): boolean {
  return getSessionMemory() !== null;
}

/**
 * Get session age in seconds
 */
export function getSessionAge(): number {
  const memory = getSessionMemory();
  if (!memory) return 0;
  return Math.floor((Date.now() - memory.startedAt) / 1000);
}

/**
 * Extract entity from text (basic implementation)
 * Can be enhanced with NER or pattern matching
 */
export function extractPrimaryEntity(text: string): string | null {
  // Phone numbers
  const phoneMatch = text.match(/\b\d{10}\b/);
  if (phoneMatch) return `phone:${phoneMatch[0]}`;
  
  // Account/order IDs
  const idMatch = text.match(/\b[A-Z]{2,3}\d{6,12}\b/i);
  if (idMatch) return `id:${idMatch[0].toUpperCase()}`;
  
  // Amounts
  const amountMatch = text.match(/(?:rs\.?|₹)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
  if (amountMatch) return `amount:${amountMatch[1].replace(/,/g, '')}`;
  
  // Plan names
  const planPatterns = [
    /\b(prepaid|postpaid|fiber|broadband)\b/i,
    /\b(unlimited|data pack|combo)\b/i,
  ];
  for (const pattern of planPatterns) {
    const match = text.match(pattern);
    if (match) return `plan:${match[1].toLowerCase()}`;
  }
  
  return null;
}
