/**
 * Chat Storage Service Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { chatStorage } from './chatStorage';
import type { ChatMessage } from '../types';

// Helper to create test messages
function createTestMessage(
  role: 'user' | 'assistant',
  content: string,
  sourceMode: 'copy' | 'voice' = 'copy',
  type: 'text' | 'audio' = 'text'
): ChatMessage {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    role,
    content,
    timestamp: Date.now(),
    type,
    sourceMode,
  };
}

describe('chatStorage', () => {
  const testProjectId = 'test-project-123';

  beforeEach(() => {
    // Clear storage before each test
    chatStorage.clearAll();
  });

  afterEach(() => {
    // Clean up after each test
    chatStorage.clearAll();
    chatStorage.cancel();
  });

  describe('save and load', () => {
    it('should save and load messages for a project', () => {
      const messages: ChatMessage[] = [
        createTestMessage('user', 'Hello'),
        createTestMessage('assistant', 'Hi there.'),
      ];

      chatStorage.save(testProjectId, messages);
      chatStorage.flush(); // Force immediate save

      const loaded = chatStorage.load(testProjectId);
      expect(loaded).toHaveLength(2);
      expect(loaded[0].content).toBe('Hello');
      expect(loaded[1].content).toBe('Hi there.');
    });

    it('should return empty array for non-existent project', () => {
      const loaded = chatStorage.load('non-existent-project');
      expect(loaded).toHaveLength(0);
    });

    it('should preserve message properties', () => {
      const message = createTestMessage('user', 'Test message', 'voice');
      message.parentMessageId = 'parent-123';

      chatStorage.save(testProjectId, [message]);
      chatStorage.flush();

      const loaded = chatStorage.load(testProjectId);
      expect(loaded[0].role).toBe('user');
      expect(loaded[0].content).toBe('Test message');
      expect(loaded[0].sourceMode).toBe('voice');
      expect(loaded[0].parentMessageId).toBe('parent-123');
    });
  });

  describe('clear', () => {
    it('should clear messages for a specific project', () => {
      const messages = [createTestMessage('user', 'Hello')];
      
      chatStorage.save(testProjectId, messages);
      chatStorage.flush();
      
      chatStorage.clear(testProjectId);
      
      const loaded = chatStorage.load(testProjectId);
      expect(loaded).toHaveLength(0);
    });

    it('should not affect other projects when clearing', () => {
      const project1 = 'project-1';
      const project2 = 'project-2';
      
      chatStorage.save(project1, [createTestMessage('user', 'Message 1')]);
      chatStorage.save(project2, [createTestMessage('user', 'Message 2')]);
      chatStorage.flush();
      
      chatStorage.clear(project1);
      
      expect(chatStorage.load(project1)).toHaveLength(0);
      expect(chatStorage.load(project2)).toHaveLength(1);
    });
  });

  describe('clearAll', () => {
    it('should clear all messages from all projects', () => {
      chatStorage.save('project-1', [createTestMessage('user', 'Hello')]);
      chatStorage.save('project-2', [createTestMessage('user', 'World')]);
      chatStorage.flush();
      
      chatStorage.clearAll();
      
      expect(chatStorage.load('project-1')).toHaveLength(0);
      expect(chatStorage.load('project-2')).toHaveLength(0);
    });
  });

  describe('getStorageUsage', () => {
    it('should return storage usage info', () => {
      const usage = chatStorage.getStorageUsage();
      
      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('limit');
      expect(usage).toHaveProperty('percentage');
      expect(usage.percentage).toBeGreaterThanOrEqual(0);
      expect(usage.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('getMessageCount', () => {
    it('should return correct message count', () => {
      const messages = [
        createTestMessage('user', 'Hello'),
        createTestMessage('assistant', 'Hi'),
        createTestMessage('user', 'How are you?'),
      ];
      
      chatStorage.save(testProjectId, messages);
      chatStorage.flush();
      
      expect(chatStorage.getMessageCount(testProjectId)).toBe(3);
    });

    it('should return 0 for non-existent project', () => {
      expect(chatStorage.getMessageCount('non-existent')).toBe(0);
    });
  });

  describe('getProjectIds', () => {
    it('should return all project IDs with chat history', () => {
      // Save project A first and flush
      chatStorage.save('project-a', [createTestMessage('user', 'A')]);
      chatStorage.flush();
      
      // Then save project B and flush
      chatStorage.save('project-b', [createTestMessage('user', 'B')]);
      chatStorage.flush();
      
      const projectIds = chatStorage.getProjectIds();
      
      expect(projectIds).toContain('project-a');
      expect(projectIds).toContain('project-b');
    });
  });

  describe('filterByMode', () => {
    it('should filter messages by mode', () => {
      const messages: ChatMessage[] = [
        createTestMessage('user', 'Text message', 'copy'),
        createTestMessage('assistant', 'Text reply', 'copy'),
        createTestMessage('user', 'Voice message', 'voice'),
        createTestMessage('assistant', 'Voice reply', 'voice'),
      ];
      
      const copyMessages = chatStorage.filterByMode(messages, 'copy');
      const voiceMessages = chatStorage.filterByMode(messages, 'voice');
      
      expect(copyMessages).toHaveLength(2);
      expect(voiceMessages).toHaveLength(2);
      expect(copyMessages[0].content).toBe('Text message');
      expect(voiceMessages[0].content).toBe('Voice message');
    });
  });

  describe('message limit', () => {
    it('should enforce maximum messages per project', () => {
      // Create more than MAX_MESSAGES_PER_PROJECT (100)
      const messages: ChatMessage[] = [];
      for (let i = 0; i < 110; i++) {
        messages.push(createTestMessage('user', `Message ${i}`));
      }
      
      chatStorage.save(testProjectId, messages);
      chatStorage.flush();
      
      const loaded = chatStorage.load(testProjectId);
      expect(loaded.length).toBeLessThanOrEqual(100);
      // Should keep the most recent messages
      expect(loaded[loaded.length - 1].content).toBe('Message 109');
    });
  });

  describe('audio data handling', () => {
    it('should store and retrieve audio messages', async () => {
      const audioMessage: ChatMessage = {
        id: 'audio-msg-1',
        role: 'assistant',
        content: 'Audio response',
        timestamp: Date.now(),
        type: 'audio',
        sourceMode: 'voice',
        audioData: btoa('fake-audio-data'),
        audioDuration: 2.5,
        audioSampleRate: 24000,
      };
      
      chatStorage.save(testProjectId, [audioMessage]);
      chatStorage.flush();
      
      // sync load() returns messages WITHOUT audio data (it's in IndexedDB)
      const loadedSync = chatStorage.load(testProjectId);
      expect(loadedSync).toHaveLength(1);
      expect(loadedSync[0].type).toBe('audio');
      expect(loadedSync[0].hasAudio).toBe(true); // Flag indicates audio is stored separately
      
      // async loadWithAudio() returns messages WITH audio data from IndexedDB
      const loadedWithAudio = await chatStorage.loadWithAudio(testProjectId);
      expect(loadedWithAudio).toHaveLength(1);
      expect(loadedWithAudio[0].type).toBe('audio');
      // Note: audioData comes from IndexedDB mock, value depends on mock implementation
      expect(loadedWithAudio[0].audioDuration).toBe(2.5);
    });
  });
});
