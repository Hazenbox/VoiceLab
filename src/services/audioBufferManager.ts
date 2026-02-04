/**
 * AudioBufferManager
 * 
 * Singleton service for managing AudioContext lifecycle and AudioBuffer operations:
 * - Single shared AudioContext to prevent resource leaks
 * - LRU cache for decoded AudioBuffers
 * - Base64 <-> AudioBuffer conversion utilities
 * - Memory tracking and cleanup
 */

import { encode, decode, decodeAudioData } from './audioUtils';

// =============================================================================
// Types
// =============================================================================

interface CacheEntry {
  buffer: AudioBuffer;
  accessedAt: number;
  size: number; // Approximate memory size in bytes
}

interface MemoryUsage {
  cachedBuffers: number;
  estimatedBytes: number;
  maxBytes: number;
}

// =============================================================================
// AudioBufferManager Singleton
// =============================================================================

class AudioBufferManager {
  private static instance: AudioBufferManager | null = null;
  
  private audioContext: AudioContext | null = null;
  private bufferCache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];
  
  // Configuration
  private readonly maxCacheSize = 20; // Maximum number of cached buffers
  private readonly maxCacheBytes = 50 * 1024 * 1024; // 50MB max cache
  private currentCacheBytes = 0;
  
  // State tracking
  private isClosing = false;
  private pendingOperations = 0;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AudioBufferManager {
    if (!AudioBufferManager.instance) {
      AudioBufferManager.instance = new AudioBufferManager();
    }
    return AudioBufferManager.instance;
  }

  /**
   * Reset the singleton (mainly for testing)
   */
  static resetInstance(): void {
    if (AudioBufferManager.instance) {
      AudioBufferManager.instance.dispose();
      AudioBufferManager.instance = null;
    }
  }

  // ===========================================================================
  // AudioContext Management
  // ===========================================================================

  /**
   * Get or create the shared AudioContext
   */
  getContext(sampleRate?: number): AudioContext {
    if (this.isClosing) {
      throw new Error('AudioBufferManager is being disposed');
    }

    if (!this.audioContext || this.audioContext.state === 'closed') {
      const options: AudioContextOptions = {};
      if (sampleRate) {
        options.sampleRate = sampleRate;
      }
      
      const AudioContextClass = window.AudioContext || 
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      
      if (!AudioContextClass) {
        throw new Error('AudioContext is not supported in this browser');
      }
      
      this.audioContext = new AudioContextClass(options);
      
      // Handle context state changes
      this.audioContext.onstatechange = () => {
        console.log(`[AudioBufferManager] Context state: ${this.audioContext?.state}`);
      };
    }

    // Resume if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(console.error);
    }

    return this.audioContext;
  }

  /**
   * Close the AudioContext gracefully
   */
  async closeContext(): Promise<void> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      return;
    }

    // Wait for pending operations
    if (this.pendingOperations > 0) {
      console.log(`[AudioBufferManager] Waiting for ${this.pendingOperations} pending operations`);
      await new Promise<void>(resolve => {
        const check = () => {
          if (this.pendingOperations === 0) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });
    }

    try {
      await this.audioContext.close();
      console.log('[AudioBufferManager] Context closed');
    } catch (error) {
      console.error('[AudioBufferManager] Error closing context:', error);
    }
    
    this.audioContext = null;
  }

  /**
   * Check if context is available and running
   */
  isContextReady(): boolean {
    return this.audioContext !== null && this.audioContext.state === 'running';
  }

  // ===========================================================================
  // Base64 Conversion
  // ===========================================================================

  /**
   * Convert AudioBuffer to Base64 string (PCM16 format)
   */
  toBase64(buffer: AudioBuffer): string {
    // Get channel data (mono - first channel)
    const channelData = buffer.getChannelData(0);
    
    // Convert Float32 to PCM16
    const pcm16 = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    
    // Convert to Uint8Array and encode
    const uint8 = new Uint8Array(pcm16.buffer);
    return encode(uint8);
  }

  /**
   * Convert Base64 string (PCM16 format) to AudioBuffer
   */
  async fromBase64(
    base64: string,
    sampleRate: number = 24000,
    cacheKey?: string
  ): Promise<AudioBuffer> {
    // Check cache first
    if (cacheKey) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    this.pendingOperations++;
    
    try {
      const ctx = this.getContext(sampleRate);
      const uint8 = decode(base64);
      const buffer = decodeAudioData(uint8, ctx, sampleRate, 1);
      
      // Cache the result
      if (cacheKey) {
        this.addToCache(cacheKey, buffer);
      }
      
      return buffer;
    } finally {
      this.pendingOperations--;
    }
  }

  /**
   * Decode MP3 ArrayBuffer to AudioBuffer
   */
  async decodeMP3(data: ArrayBuffer, cacheKey?: string): Promise<AudioBuffer> {
    // Check cache first
    if (cacheKey) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    this.pendingOperations++;
    
    try {
      const ctx = this.getContext();
      const buffer = await ctx.decodeAudioData(data.slice(0)); // Clone buffer as decodeAudioData consumes it
      
      if (cacheKey) {
        this.addToCache(cacheKey, buffer);
      }
      
      return buffer;
    } finally {
      this.pendingOperations--;
    }
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Add a buffer to the cache
   */
  addToCache(key: string, buffer: AudioBuffer): void {
    // Calculate approximate size: samples * channels * 4 bytes (Float32)
    const size = buffer.length * buffer.numberOfChannels * 4;
    
    // Check if already cached
    if (this.bufferCache.has(key)) {
      const existing = this.bufferCache.get(key)!;
      this.currentCacheBytes -= existing.size;
      
      // Update access order
      const idx = this.accessOrder.indexOf(key);
      if (idx !== -1) {
        this.accessOrder.splice(idx, 1);
      }
    }
    
    // Evict if necessary
    while (
      (this.bufferCache.size >= this.maxCacheSize || 
       this.currentCacheBytes + size > this.maxCacheBytes) &&
      this.accessOrder.length > 0
    ) {
      this.evictOldest();
    }
    
    // Add to cache
    this.bufferCache.set(key, {
      buffer,
      accessedAt: Date.now(),
      size,
    });
    this.accessOrder.push(key);
    this.currentCacheBytes += size;
  }

  /**
   * Get a buffer from the cache (updates access time)
   */
  getFromCache(key: string): AudioBuffer | undefined {
    const entry = this.bufferCache.get(key);
    if (entry) {
      // Update access time and order (LRU)
      entry.accessedAt = Date.now();
      const idx = this.accessOrder.indexOf(key);
      if (idx !== -1) {
        this.accessOrder.splice(idx, 1);
        this.accessOrder.push(key);
      }
      return entry.buffer;
    }
    return undefined;
  }

  /**
   * Check if a key is in the cache
   */
  hasInCache(key: string): boolean {
    return this.bufferCache.has(key);
  }

  /**
   * Remove a specific entry from cache
   */
  removeFromCache(key: string): void {
    const entry = this.bufferCache.get(key);
    if (entry) {
      this.currentCacheBytes -= entry.size;
      this.bufferCache.delete(key);
      const idx = this.accessOrder.indexOf(key);
      if (idx !== -1) {
        this.accessOrder.splice(idx, 1);
      }
    }
  }

  /**
   * Clear all cached buffers
   */
  clearCache(): void {
    this.bufferCache.clear();
    this.accessOrder = [];
    this.currentCacheBytes = 0;
    console.log('[AudioBufferManager] Cache cleared');
  }

  /**
   * Evict the oldest (least recently used) entry
   */
  private evictOldest(): void {
    if (this.accessOrder.length === 0) return;
    
    const oldestKey = this.accessOrder.shift()!;
    const entry = this.bufferCache.get(oldestKey);
    if (entry) {
      this.currentCacheBytes -= entry.size;
      this.bufferCache.delete(oldestKey);
      console.log(`[AudioBufferManager] Evicted: ${oldestKey}`);
    }
  }

  // ===========================================================================
  // Memory Management
  // ===========================================================================

  /**
   * Get current memory usage
   */
  getMemoryUsage(): MemoryUsage {
    return {
      cachedBuffers: this.bufferCache.size,
      estimatedBytes: this.currentCacheBytes,
      maxBytes: this.maxCacheBytes,
    };
  }

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    this.isClosing = true;
    this.clearCache();
    await this.closeContext();
    this.isClosing = false;
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Create an empty AudioBuffer
   */
  createBuffer(
    numberOfChannels: number,
    length: number,
    sampleRate: number
  ): AudioBuffer {
    const ctx = this.getContext(sampleRate);
    return ctx.createBuffer(numberOfChannels, length, sampleRate);
  }

  /**
   * Create a buffer source node for playback
   */
  createBufferSource(): AudioBufferSourceNode {
    const ctx = this.getContext();
    return ctx.createBufferSource();
  }

  /**
   * Get the audio destination for playback
   */
  getDestination(): AudioDestinationNode {
    const ctx = this.getContext();
    return ctx.destination;
  }

  /**
   * Get current time from the AudioContext
   */
  getCurrentTime(): number {
    const ctx = this.getContext();
    return ctx.currentTime;
  }
}

// =============================================================================
// Export
// =============================================================================

// Export singleton instance getter
export const audioBufferManager = AudioBufferManager.getInstance();

// Export class for testing
export { AudioBufferManager };

// Export types
export type { MemoryUsage };
