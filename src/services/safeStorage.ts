/**
 * Safe Storage Utilities
 * 
 * Provides localStorage-like operations that work in both browser and server contexts.
 * On server (Node.js/Vercel), operations are no-ops that return sensible defaults.
 * 
 * Phase 6: Enables services to run in Vercel serverless without localStorage errors.
 */

import { isServer } from './env';

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (isServer) return false;
  
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

const storageAvailable = !isServer && isLocalStorageAvailable();

/**
 * Safe localStorage wrapper that works in both browser and server contexts.
 * On server, all operations are no-ops.
 */
export const safeStorage = {
  /**
   * Get item from localStorage (returns null on server)
   */
  getItem(key: string): string | null {
    if (!storageAvailable) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  /**
   * Set item in localStorage (no-op on server)
   */
  setItem(key: string, value: string): void {
    if (!storageAvailable) return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silently fail (quota exceeded, etc.)
    }
  },

  /**
   * Remove item from localStorage (no-op on server)
   */
  removeItem(key: string): void {
    if (!storageAvailable) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  },

  /**
   * Clear all localStorage (no-op on server)
   */
  clear(): void {
    if (!storageAvailable) return;
    try {
      localStorage.clear();
    } catch {
      // Silently fail
    }
  },

  /**
   * Check if storage is available
   */
  isAvailable(): boolean {
    return storageAvailable;
  },
};

/**
 * Get JSON data from storage with type safety
 */
export function getStorageJSON<T>(key: string, defaultValue: T): T {
  const data = safeStorage.getItem(key);
  if (!data) return defaultValue;
  
  try {
    return JSON.parse(data) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Set JSON data to storage
 */
export function setStorageJSON<T>(key: string, value: T): void {
  try {
    safeStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail
  }
}

export default safeStorage;
