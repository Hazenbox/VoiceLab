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

export interface QueuedEvent {
  id?: number;  // auto-increment key from IndexedDB
  type: 'analytics' | 'correction' | 'heartbeat' | 'user_sync';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  timestamp: number;
  attempts?: number;  // retry counter
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
 * Add event to queue
 */
export async function addToQueue(event: Omit<QueuedEvent, 'id'>): Promise<void> {
  // Initialize attempts counter
  const eventWithAttempts = { ...event, attempts: event.attempts ?? 0 };
  
  // Try IndexedDB first
  if (!useLocalStorageFallback) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.add(eventWithAttempts);
        
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
    queue.push({ ...eventWithAttempts, id: Date.now() + Math.random() });
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[QueueStorage] Failed to add to localStorage:', error);
  }
}

/**
 * Get all events from queue
 */
export async function getQueue(): Promise<QueuedEvent[]> {
  // Try IndexedDB first
  if (!useLocalStorageFallback) {
    try {
      const db = await openDatabase();
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
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
    return stored ? JSON.parse(stored) : [];
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
