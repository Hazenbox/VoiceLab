/**
 * IndexedDB Audio Storage Service
 * 
 * Provides large-capacity audio storage using IndexedDB instead of localStorage.
 * IndexedDB can store 50MB-500MB+ depending on browser, compared to localStorage's 5MB limit.
 * 
 * Features:
 * - Binary blob storage (more efficient than base64)
 * - Automatic database versioning and migration
 * - LRU eviction when approaching quota
 * - Promise-based async API
 */

// =============================================================================
// Constants
// =============================================================================

const DB_NAME = 'voicelab_audio_db';
const DB_VERSION = 1;
const STORE_NAME = 'audio_data';

// Storage limits - IndexedDB allows much more than localStorage
const MAX_AUDIO_ENTRIES = 200; // Increased from 50
const MAX_TOTAL_STORAGE_MB = 100; // 100MB target (IndexedDB allows much more)
const WARN_STORAGE_THRESHOLD = 0.8; // Warn at 80%

// =============================================================================
// Types
// =============================================================================

export interface AudioEntry {
  id: string;           // Unique identifier (usually messageId)
  projectId: string;    // Associated project
  data: Blob;           // Binary audio data (more efficient than base64)
  size: number;         // Size in bytes
  duration: number;     // Duration in seconds
  sampleRate: number;   // Sample rate for decoding
  accessedAt: number;   // Last access timestamp for LRU
  createdAt: number;    // Creation timestamp
}

export interface AudioMetadata {
  id: string;
  projectId: string;
  size: number;
  duration: number;
  sampleRate: number;
  accessedAt: number;
  createdAt: number;
}

export interface StorageStats {
  entryCount: number;
  totalSize: number;
  maxSize: number;
  usagePercent: number;
  isNearQuota: boolean;
}

// =============================================================================
// Database Initialization & Fallback
// =============================================================================

let dbPromise: Promise<IDBDatabase> | null = null;
let isIndexedDBAvailable: boolean | null = null;

/**
 * Check if IndexedDB is available and working.
 * Returns false in Safari private mode or other restricted environments.
 */
function checkIndexedDBAvailability(): Promise<boolean> {
  if (isIndexedDBAvailable !== null) {
    return Promise.resolve(isIndexedDBAvailable);
  }

  return new Promise((resolve) => {
    // Check if indexedDB exists at all
    if (typeof indexedDB === 'undefined') {
      console.warn('[AudioIndexedDB] IndexedDB not available in this environment');
      isIndexedDBAvailable = false;
      resolve(false);
      return;
    }

    // Try to open a test database to verify it actually works
    // Safari private mode will fail here
    try {
      const testDbName = '_idb_test_' + Date.now();
      const request = indexedDB.open(testDbName);
      
      request.onerror = () => {
        console.warn('[AudioIndexedDB] IndexedDB blocked (possibly private browsing mode)');
        isIndexedDBAvailable = false;
        resolve(false);
      };
      
      request.onsuccess = () => {
        // Clean up test database
        request.result.close();
        indexedDB.deleteDatabase(testDbName);
        isIndexedDBAvailable = true;
        resolve(true);
      };
    } catch (e) {
      console.warn('[AudioIndexedDB] IndexedDB check failed:', e);
      isIndexedDBAvailable = false;
      resolve(false);
    }
  });
}

/**
 * Check if IndexedDB is available (synchronous version, returns cached result)
 * Call checkIndexedDBAvailability() first to initialize.
 */
export function isIndexedDBSupported(): boolean {
  return isIndexedDBAvailable === true;
}

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise(async (resolve, reject) => {
    // Check availability first
    const available = await checkIndexedDBAvailability();
    if (!available) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[AudioIndexedDB] Failed to open database:', request.error);
      dbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      const db = request.result;
      
      // Handle connection errors
      db.onerror = (event) => {
        console.error('[AudioIndexedDB] Database error:', event);
      };

      // Handle version change (another tab upgraded the DB)
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
        console.warn('[AudioIndexedDB] Database version changed, please reload');
      };

      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        
        // Create indexes for efficient queries
        store.createIndex('projectId', 'projectId', { unique: false });
        store.createIndex('accessedAt', 'accessedAt', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        
        console.log('[AudioIndexedDB] Created audio store with indexes');
      }
    };
  });

  return dbPromise;
}

// =============================================================================
// Core Operations
// =============================================================================

/**
 * Save audio data to IndexedDB
 */
export async function saveAudio(entry: AudioEntry): Promise<void> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.put(entry);
    
    request.onsuccess = () => {
      console.log(`[AudioIndexedDB] Saved audio ${entry.id} (${(entry.size / 1024).toFixed(1)}KB)`);
      resolve();
    };
    
    request.onerror = () => {
      console.error('[AudioIndexedDB] Failed to save audio:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Get audio data by ID
 */
export async function getAudio(id: string): Promise<AudioEntry | null> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.get(id);
    
    request.onsuccess = () => {
      const entry = request.result as AudioEntry | undefined;
      
      if (entry) {
        // Update access time for LRU tracking
        entry.accessedAt = Date.now();
        store.put(entry);
      }
      
      resolve(entry || null);
    };
    
    request.onerror = () => {
      console.error('[AudioIndexedDB] Failed to get audio:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Delete audio by ID
 */
export async function deleteAudio(id: string): Promise<void> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.delete(id);
    
    request.onsuccess = () => {
      console.log(`[AudioIndexedDB] Deleted audio ${id}`);
      resolve();
    };
    
    request.onerror = () => {
      console.error('[AudioIndexedDB] Failed to delete audio:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Delete all audio for a project
 */
export async function deleteProjectAudio(projectId: string): Promise<number> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('projectId');
    
    const request = index.openCursor(IDBKeyRange.only(projectId));
    let deletedCount = 0;
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      } else {
        console.log(`[AudioIndexedDB] Deleted ${deletedCount} audio entries for project ${projectId}`);
        resolve(deletedCount);
      }
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Get all audio metadata (without the actual data) for a project
 */
export async function getProjectAudioMetadata(projectId: string): Promise<AudioMetadata[]> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('projectId');
    
    const request = index.getAll(IDBKeyRange.only(projectId));
    
    request.onsuccess = () => {
      const entries = request.result as AudioEntry[];
      // Return metadata only (exclude blob data)
      const metadata: AudioMetadata[] = entries.map(({ data: _, ...rest }) => rest);
      resolve(metadata);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Check if audio exists
 */
export async function hasAudio(id: string): Promise<boolean> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.count(IDBKeyRange.only(id));
    
    request.onsuccess = () => {
      resolve(request.result > 0);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// =============================================================================
// Storage Management
// =============================================================================

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<StorageStats> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    // const countRequest = store.count();
    const allRequest = store.getAll();
    
    allRequest.onsuccess = () => {
      const entries = allRequest.result as AudioEntry[];
      const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
      const maxSize = MAX_TOTAL_STORAGE_MB * 1024 * 1024;
      const usagePercent = (totalSize / maxSize) * 100;
      
      resolve({
        entryCount: entries.length,
        totalSize,
        maxSize,
        usagePercent,
        isNearQuota: usagePercent >= WARN_STORAGE_THRESHOLD * 100,
      });
    };
    
    allRequest.onerror = () => {
      reject(allRequest.error);
    };
  });
}

/**
 * Evict oldest entries to free up space (LRU eviction)
 */
export async function evictOldestEntries(count: number): Promise<string[]> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('accessedAt');
    
    const request = index.openCursor();
    const evictedIds: string[] = [];
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      
      if (cursor && evictedIds.length < count) {
        const entry = cursor.value as AudioEntry;
        evictedIds.push(entry.id);
        cursor.delete();
        cursor.continue();
      } else {
        if (evictedIds.length > 0) {
          console.log(`[AudioIndexedDB] Evicted ${evictedIds.length} oldest entries`);
        }
        resolve(evictedIds);
      }
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Ensure storage is within limits, evicting if necessary
 */
export async function ensureStorageLimit(): Promise<void> {
  const stats = await getStorageStats();
  
  // Evict if we have too many entries
  if (stats.entryCount > MAX_AUDIO_ENTRIES) {
    const toEvict = stats.entryCount - MAX_AUDIO_ENTRIES + 10; // Evict extra 10 for buffer
    await evictOldestEntries(toEvict);
  }
  
  // Evict if we're over storage limit
  if (stats.usagePercent > 95) {
    console.log('[AudioIndexedDB] Storage near limit, evicting oldest entries');
    await evictOldestEntries(20);
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert base64 string to Blob
 */
export function base64ToBlob(base64: string, mimeType: string = 'audio/pcm'): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Convert Blob to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/pcm;base64,")
      const base64 = dataUrl.split(',')[1] || dataUrl;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Clear all audio data (use with caution!)
 */
export async function clearAllAudio(): Promise<void> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.clear();
    
    request.onsuccess = () => {
      console.log('[AudioIndexedDB] Cleared all audio data');
      resolve();
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// =============================================================================
// Export singleton-like API
// =============================================================================

export const audioIndexedDB = {
  save: saveAudio,
  get: getAudio,
  delete: deleteAudio,
  deleteProject: deleteProjectAudio,
  getProjectMetadata: getProjectAudioMetadata,
  has: hasAudio,
  getStats: getStorageStats,
  evictOldest: evictOldestEntries,
  ensureLimit: ensureStorageLimit,
  base64ToBlob,
  blobToBase64,
  clearAll: clearAllAudio,
  isSupported: isIndexedDBSupported,
  checkAvailability: checkIndexedDBAvailability,
};
