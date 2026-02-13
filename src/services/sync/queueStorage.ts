/**
 * IndexedDB-backed Queue Storage for Cross-Session Persistence
 * 
 * Provides persistent storage for sync events that survives browser restarts.
 * Falls back to localStorage if IndexedDB is unavailable.
 */

const DB_NAME = 'voicelab_sync';
const STORE_NAME = 'events';
const DB_VERSION = 1;
const FALLBACK_STORAGE_KEY = 'voicelab_sync_queue_fallback';
const MAX_RETRY_ATTEMPTS = 5;
const EVENT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // P1-FIX: 7 days expiry

export interface QueuedEvent {
  id?: number;  // auto-increment key from IndexedDB
  type: 'analytics' | 'correction' | 'heartbeat' | 'user_sync' | 'session_create' | 'session_update' | 'session_end' | 'interaction';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  timestamp: number;
  attempts?: number;  // retry counter
  idempotencyKey?: string;  // P0-FIX: Unique key for deduplication
}

/**
 * P0-FIX: Generate a unique idempotency key for an event
 * This prevents duplicate events on queue replay
 */
export function generateIdempotencyKey(event: Omit<QueuedEvent, 'id' | 'idempotencyKey'>): string {
  // Create a hash-like key from type, timestamp, and stringified data
  const dataStr = JSON.stringify(event.data);
  // Simple hash function for browser environments
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${event.type}-${event.timestamp}-${Math.abs(hash).toString(36)}`;
}

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;
let useLocalStorageFallback = false;

/**
 * Open IndexedDB database (cached)
 */
async function openDatabase(): Promise<IDBDatabase> {
  // Return cached instance if available
  if (dbInstance) return dbInstance;
  
  // Return in-flight promise if already initializing
  if (dbInitPromise) return dbInitPromise;
  
  dbInitPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.warn('[QueueStorage] IndexedDB open failed, falling back to localStorage');
        useLocalStorageFallback = true;
        reject(request.error);
      };
      
      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store with auto-increment key
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          
          // Create indexes for querying
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('attempts', 'attempts', { unique: false });
        }
      };
    } catch (error) {
      console.warn('[QueueStorage] IndexedDB not available, using localStorage fallback:', error);
      useLocalStorageFallback = true;
      reject(error);
    }
  });
  
  return dbInitPromise;
}

/**
 * P0-FIX: Check if an event with the given idempotency key already exists
 */
export async function hasIdempotencyKey(key: string): Promise<boolean> {
  const queue = await getQueue();
  return queue.some(event => event.idempotencyKey === key);
}

/**
 * Add event to queue
 * P0-FIX: Now includes idempotency key generation and duplicate detection
 */
export async function addToQueue(event: Omit<QueuedEvent, 'id'>): Promise<void> {
  // P0-FIX: Generate idempotency key if not provided
  const idempotencyKey = event.idempotencyKey ?? generateIdempotencyKey(event);
  
  // P0-FIX: Check for duplicates before adding
  if (await hasIdempotencyKey(idempotencyKey)) {
    console.log('[QueueStorage] Duplicate event detected, skipping:', idempotencyKey);
    return;
  }
  
  // Initialize attempts counter and add idempotency key
  const eventWithMeta = { 
    ...event, 
    attempts: event.attempts ?? 0,
    idempotencyKey,
  };
  
  // Try IndexedDB first
  if (!useLocalStorageFallback) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.add(eventWithMeta);
        
        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn('[QueueStorage] Failed to add to IndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn('[QueueStorage] IndexedDB add failed, falling back to localStorage');
      useLocalStorageFallback = true;
    }
  }
  
  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(FALLBACK_STORAGE_KEY);
    const queue: QueuedEvent[] = stored ? JSON.parse(stored) : [];
    queue.push({ ...eventWithMeta, id: Date.now() + Math.random() });
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[QueueStorage] Failed to add to localStorage:', error);
  }
}

/**
 * Get all events from queue (excluding expired events)
 * P1-FIX: Filters out events older than 7 days
 */
export async function getQueue(): Promise<QueuedEvent[]> {
  const expiryThreshold = Date.now() - EVENT_EXPIRY_MS;
  
  // Try IndexedDB first
  if (!useLocalStorageFallback) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          // P1-FIX: Filter out expired events
          const allEvents = request.result || [];
          const validEvents = allEvents.filter(event => event.timestamp >= expiryThreshold);
          resolve(validEvents);
        };
        request.onerror = () => {
          console.warn('[QueueStorage] Failed to get from IndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn('[QueueStorage] IndexedDB getAll failed, falling back to localStorage');
      useLocalStorageFallback = true;
    }
  }
  
  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(FALLBACK_STORAGE_KEY);
    const allEvents: QueuedEvent[] = stored ? JSON.parse(stored) : [];
    // P1-FIX: Filter out expired events
    return allEvents.filter(event => event.timestamp >= expiryThreshold);
  } catch (error) {
    console.error('[QueueStorage] Failed to get from localStorage:', error);
    return [];
  }
}

/**
 * Remove event from queue by ID
 */
export async function removeFromQueue(id: number): Promise<void> {
  // Try IndexedDB first
  if (!useLocalStorageFallback) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn('[QueueStorage] Failed to remove from IndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn('[QueueStorage] IndexedDB delete failed, falling back to localStorage');
      useLocalStorageFallback = true;
    }
  }
  
  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (!stored) return;
    
    const queue: QueuedEvent[] = JSON.parse(stored);
    const filtered = queue.filter(e => e.id !== id);
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[QueueStorage] Failed to remove from localStorage:', error);
  }
}

/**
 * Update attempts counter for an event (for exponential backoff)
 */
export async function updateAttempts(id: number, attempts: number): Promise<void> {
  // Skip if too many attempts
  if (attempts > MAX_RETRY_ATTEMPTS) {
    console.warn(`[QueueStorage] Event ${id} exceeded max retry attempts, removing`);
    await removeFromQueue(id);
    return;
  }
  
  // Try IndexedDB first
  if (!useLocalStorageFallback) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          const event = getRequest.result;
          if (!event) {
            resolve();
            return;
          }
          
          event.attempts = attempts;
          const putRequest = store.put(event);
          
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => {
            console.warn('[QueueStorage] Failed to update attempts in IndexedDB:', putRequest.error);
            reject(putRequest.error);
          };
        };
        
        getRequest.onerror = () => {
          console.warn('[QueueStorage] Failed to get event for update from IndexedDB:', getRequest.error);
          reject(getRequest.error);
        };
      });
    } catch (error) {
      console.warn('[QueueStorage] IndexedDB update failed, falling back to localStorage');
      useLocalStorageFallback = true;
    }
  }
  
  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (!stored) return;
    
    const queue: QueuedEvent[] = JSON.parse(stored);
    const event = queue.find(e => e.id === id);
    if (event) {
      event.attempts = attempts;
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(queue));
    }
  } catch (error) {
    console.error('[QueueStorage] Failed to update attempts in localStorage:', error);
  }
}

/**
 * Clear all events from queue
 */
export async function clearQueue(): Promise<void> {
  // Try IndexedDB first
  if (!useLocalStorageFallback) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn('[QueueStorage] Failed to clear IndexedDB:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn('[QueueStorage] IndexedDB clear failed, falling back to localStorage');
      useLocalStorageFallback = true;
    }
  }
  
  // Fallback to localStorage
  try {
    localStorage.removeItem(FALLBACK_STORAGE_KEY);
  } catch (error) {
    console.error('[QueueStorage] Failed to clear localStorage:', error);
  }
}

/**
 * Get queue size
 */
export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * P1-FIX: Remove expired events from queue (older than 7 days)
 * Should be called periodically to prevent queue bloat
 */
export async function removeExpiredEvents(): Promise<number> {
  const now = Date.now();
  const expiryThreshold = now - EVENT_EXPIRY_MS;
  
  const queue = await getQueue();
  const expiredEvents = queue.filter(event => event.timestamp < expiryThreshold);
  
  if (expiredEvents.length === 0) {
    return 0;
  }
  
  console.log(`[QueueStorage] Removing ${expiredEvents.length} expired events (older than 7 days)`);
  
  for (const event of expiredEvents) {
    if (event.id) {
      await removeFromQueue(event.id);
    }
  }
  
  return expiredEvents.length;
}

/**
 * P1-FIX: Check if an event is expired
 */
export function isEventExpired(event: QueuedEvent): boolean {
  const now = Date.now();
  return event.timestamp < (now - EVENT_EXPIRY_MS);
}
