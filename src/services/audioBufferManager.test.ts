/**
 * AudioBufferManager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioBufferManager, audioBufferManager } from './audioBufferManager';

describe('AudioBufferManager', () => {
  beforeEach(() => {
    // Reset the singleton for fresh tests
    AudioBufferManager.resetInstance();
  });

  afterEach(async () => {
    // Clean up
    const instance = AudioBufferManager.getInstance();
    await instance.dispose();
    AudioBufferManager.resetInstance();
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const instance1 = AudioBufferManager.getInstance();
      const instance2 = AudioBufferManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = AudioBufferManager.getInstance();
      AudioBufferManager.resetInstance();
      const instance2 = AudioBufferManager.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('getContext', () => {
    it('should return an AudioContext', () => {
      const manager = AudioBufferManager.getInstance();
      const ctx = manager.getContext();
      expect(ctx).toBeDefined();
      expect(ctx.state).toBe('running');
    });

    it('should return the same context on subsequent calls', () => {
      const manager = AudioBufferManager.getInstance();
      const ctx1 = manager.getContext();
      const ctx2 = manager.getContext();
      expect(ctx1).toBe(ctx2);
    });
  });

  describe('closeContext', () => {
    it('should close the audio context', async () => {
      const manager = AudioBufferManager.getInstance();
      manager.getContext();
      await manager.closeContext();
      expect(manager.isContextReady()).toBe(false);
    });
  });

  describe('toBase64 and fromBase64', () => {
    it('should convert AudioBuffer to base64 and back', async () => {
      const manager = AudioBufferManager.getInstance();
      const ctx = manager.getContext();
      
      // Create a test buffer
      const originalBuffer = ctx.createBuffer(1, 1000, 44100);
      const channelData = originalBuffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(i * 0.1);
      }
      
      // Convert to base64
      const base64 = manager.toBase64(originalBuffer);
      expect(base64).toBeDefined();
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
      
      // Convert back
      const decodedBuffer = await manager.fromBase64(base64, 44100);
      expect(decodedBuffer).toBeDefined();
      expect(decodedBuffer.sampleRate).toBe(44100);
    });
  });

  describe('cache management', () => {
    it('should cache buffers', async () => {
      const manager = AudioBufferManager.getInstance();
      const ctx = manager.getContext();
      
      const buffer = ctx.createBuffer(1, 100, 44100);
      manager.addToCache('test-key', buffer);
      
      expect(manager.hasInCache('test-key')).toBe(true);
    });

    it('should retrieve cached buffers', async () => {
      const manager = AudioBufferManager.getInstance();
      const ctx = manager.getContext();
      
      const buffer = ctx.createBuffer(1, 100, 44100);
      manager.addToCache('test-key', buffer);
      
      const cached = manager.getFromCache('test-key');
      expect(cached).toBe(buffer);
    });

    it('should return undefined for non-cached keys', () => {
      const manager = AudioBufferManager.getInstance();
      const cached = manager.getFromCache('non-existent');
      expect(cached).toBeUndefined();
    });

    it('should remove from cache', () => {
      const manager = AudioBufferManager.getInstance();
      const ctx = manager.getContext();
      
      const buffer = ctx.createBuffer(1, 100, 44100);
      manager.addToCache('test-key', buffer);
      manager.removeFromCache('test-key');
      
      expect(manager.hasInCache('test-key')).toBe(false);
    });

    it('should clear all cache', () => {
      const manager = AudioBufferManager.getInstance();
      const ctx = manager.getContext();
      
      manager.addToCache('key1', ctx.createBuffer(1, 100, 44100));
      manager.addToCache('key2', ctx.createBuffer(1, 100, 44100));
      
      manager.clearCache();
      
      expect(manager.hasInCache('key1')).toBe(false);
      expect(manager.hasInCache('key2')).toBe(false);
    });

    it('should evict oldest entries when cache is full', () => {
      const manager = AudioBufferManager.getInstance();
      const ctx = manager.getContext();
      
      // Add more than max cache size (20)
      for (let i = 0; i < 25; i++) {
        manager.addToCache(`key-${i}`, ctx.createBuffer(1, 100, 44100));
      }
      
      const usage = manager.getMemoryUsage();
      expect(usage.cachedBuffers).toBeLessThanOrEqual(20);
      
      // Oldest keys should be evicted
      expect(manager.hasInCache('key-0')).toBe(false);
      expect(manager.hasInCache('key-1')).toBe(false);
      
      // Newest keys should still be there
      expect(manager.hasInCache('key-24')).toBe(true);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage info', () => {
      const manager = AudioBufferManager.getInstance();
      const usage = manager.getMemoryUsage();
      
      expect(usage).toHaveProperty('cachedBuffers');
      expect(usage).toHaveProperty('estimatedBytes');
      expect(usage).toHaveProperty('maxBytes');
    });

    it('should track cached buffer count', () => {
      const manager = AudioBufferManager.getInstance();
      const ctx = manager.getContext();
      
      expect(manager.getMemoryUsage().cachedBuffers).toBe(0);
      
      manager.addToCache('key1', ctx.createBuffer(1, 100, 44100));
      expect(manager.getMemoryUsage().cachedBuffers).toBe(1);
      
      manager.addToCache('key2', ctx.createBuffer(1, 100, 44100));
      expect(manager.getMemoryUsage().cachedBuffers).toBe(2);
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', async () => {
      const manager = AudioBufferManager.getInstance();
      const ctx = manager.getContext();
      
      manager.addToCache('key1', ctx.createBuffer(1, 100, 44100));
      
      await manager.dispose();
      
      expect(manager.getMemoryUsage().cachedBuffers).toBe(0);
      expect(manager.isContextReady()).toBe(false);
    });
  });
});

// Test the exported singleton
describe('audioBufferManager singleton export', () => {
  it('should be a valid AudioBufferManager instance', () => {
    expect(audioBufferManager).toBeDefined();
    expect(typeof audioBufferManager.getContext).toBe('function');
    expect(typeof audioBufferManager.toBase64).toBe('function');
    expect(typeof audioBufferManager.fromBase64).toBe('function');
  });
});
