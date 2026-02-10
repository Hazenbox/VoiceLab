/**
 * Types Tests
 * 
 * Tests for type helpers related to ChatGPT-style edit flow:
 * - migrateMessageVersion
 * - getDisplayContent
 */

import { describe, it, expect } from 'vitest';
import type { ChatMessage, PromptVersion } from './types';
import { migrateMessageVersion, getDisplayContent } from './types';

// Helper to create a test user message
function createUserMessage(content: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    role: 'user',
    content,
    timestamp: Date.now(),
    type: 'text',
    sourceMode: 'copy',
    ...overrides,
  };
}

// Helper to create a test assistant message
function createAssistantMessage(content: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: `ai-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    role: 'assistant',
    content,
    timestamp: Date.now(),
    type: 'text',
    sourceMode: 'copy',
    ...overrides,
  };
}

describe('migrateMessageVersion', () => {
  it('should add promptVersions to user message without version tracking', () => {
    const message = createUserMessage('original prompt');
    const migrated = migrateMessageVersion(message);
    
    expect(migrated.promptVersions).toBeDefined();
    expect(migrated.promptVersions).toHaveLength(1);
    expect(migrated.promptVersions![0].content).toBe('original prompt');
    expect(migrated.promptVersions![0].responseId).toBe('');
  });
  
  it('should preserve existing promptVersions for already migrated messages', () => {
    const existingVersions: PromptVersion[] = [
      { content: 'v1', timestamp: 1000, responseId: 'ai-1' },
      { content: 'v2', timestamp: 2000, responseId: 'ai-2' },
    ];
    const message = createUserMessage('v2', { promptVersions: existingVersions });
    const migrated = migrateMessageVersion(message);
    
    expect(migrated.promptVersions).toEqual(existingVersions);
  });
  
  it('should not add promptVersions to assistant messages', () => {
    const message = createAssistantMessage('AI response');
    const migrated = migrateMessageVersion(message);
    
    expect(migrated.promptVersions).toBeUndefined();
  });
  
  it('should preserve timestamp from original message', () => {
    const originalTimestamp = 1234567890;
    const message = createUserMessage('test', { timestamp: originalTimestamp });
    const migrated = migrateMessageVersion(message);
    
    expect(migrated.promptVersions![0].timestamp).toBe(originalTimestamp);
  });
  
  it('should not set displayVersion on migration', () => {
    const message = createUserMessage('test');
    const migrated = migrateMessageVersion(message);
    
    expect(migrated.displayVersion).toBeUndefined();
  });
});

describe('getDisplayContent', () => {
  it('should return content for message without versions', () => {
    const message = createUserMessage('plain content');
    const content = getDisplayContent(message);
    
    expect(content).toBe('plain content');
  });
  
  it('should return latest version when displayVersion is undefined', () => {
    const versions: PromptVersion[] = [
      { content: 'version 1', timestamp: 1000, responseId: 'ai-1' },
      { content: 'version 2', timestamp: 2000, responseId: 'ai-2' },
      { content: 'version 3', timestamp: 3000, responseId: 'ai-3' },
    ];
    const message = createUserMessage('version 3', { promptVersions: versions });
    const content = getDisplayContent(message);
    
    expect(content).toBe('version 3');
  });
  
  it('should return specific version when displayVersion is set', () => {
    const versions: PromptVersion[] = [
      { content: 'version 1', timestamp: 1000, responseId: 'ai-1' },
      { content: 'version 2', timestamp: 2000, responseId: 'ai-2' },
      { content: 'version 3', timestamp: 3000, responseId: 'ai-3' },
    ];
    const message = createUserMessage('version 3', { 
      promptVersions: versions,
      displayVersion: 2,
    });
    const content = getDisplayContent(message);
    
    expect(content).toBe('version 2');
  });
  
  it('should return first version when displayVersion is 1', () => {
    const versions: PromptVersion[] = [
      { content: 'original', timestamp: 1000, responseId: 'ai-1' },
      { content: 'edited', timestamp: 2000, responseId: 'ai-2' },
    ];
    const message = createUserMessage('edited', { 
      promptVersions: versions,
      displayVersion: 1,
    });
    const content = getDisplayContent(message);
    
    expect(content).toBe('original');
  });
  
  it('should fallback to content for empty versions array', () => {
    const message = createUserMessage('fallback content', { promptVersions: [] });
    const content = getDisplayContent(message);
    
    expect(content).toBe('fallback content');
  });
  
  it('should fallback to content for invalid displayVersion', () => {
    const versions: PromptVersion[] = [
      { content: 'v1', timestamp: 1000, responseId: 'ai-1' },
    ];
    const message = createUserMessage('fallback', { 
      promptVersions: versions,
      displayVersion: 999, // Invalid - out of bounds
    });
    const content = getDisplayContent(message);
    
    // Should fallback to content since index is out of bounds
    expect(content).toBe('fallback');
  });
  
  it('should handle assistant messages without versions', () => {
    const message = createAssistantMessage('AI response text');
    const content = getDisplayContent(message);
    
    expect(content).toBe('AI response text');
  });
});
