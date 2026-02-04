/**
 * ChatPanel Component
 * 
 * Unified chat interface supporting both text and audio messages.
 * 
 * Features:
 * - Mixed content (text + audio in same conversation)
 * - ARIA roles for accessibility
 * - Keyboard navigation
 * - Auto-scroll to bottom
 * - Loading indicators
 * - Grok-style pill-shaped input with embedded controls
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import type { ChatMessage, ChatMode } from '../types';
import { useThemeColors } from '../theme';
import { MessageContent } from './MessageContent';
import { AudioBubble } from './AudioBubble';

// =============================================================================
// Types
// =============================================================================

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  /** Current chat mode for styling */
  mode?: ChatMode;
  /** Placeholder text for input */
  placeholder?: string;
  /** Callback when user wants to save an audio message */
  onSaveAudio?: (messageId: string) => void;
  /** Whether to show empty state */
  showEmptyState?: boolean;
  /** Custom empty state message */
  emptyStateMessage?: string;
  /** Whether input is disabled */
  inputDisabled?: boolean;
  /** ID for ARIA panel reference */
  id?: string;
  /** Callback when user clicks mic button to start voice mode */
  onVoiceClick?: () => void;
  /** Whether voice is supported in this browser */
  voiceSupported?: boolean;
  /** Model selector component to render inside the input bar */
  modelSelector?: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export const ChatPanel = memo(function ChatPanel({ 
  messages, 
  onSendMessage, 
  isLoading,
  mode = 'copy',
  placeholder = 'What do you want to know?',
  onSaveAudio,
  showEmptyState = true,
  emptyStateMessage = 'Start a conversation to generate copy',
  inputDisabled = false,
  id,
  onVoiceClick,
  voiceSupported = true,
  modelSelector,
}: ChatPanelProps) {
  const theme = useThemeColors();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (inputValue.trim() && !isLoading && !inputDisabled) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  }, [inputValue, isLoading, inputDisabled, onSendMessage]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Handle save audio
  const handleSaveAudio = useCallback((messageId: string) => {
    onSaveAudio?.(messageId);
  }, [onSaveAudio]);

  // Render individual message
  const renderMessage = useCallback((message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    // Audio message
    if (message.type === 'audio' && message.audioData) {
      return (
        <AudioBubble
          key={message.id}
          messageId={message.id}
          audioData={message.audioData}
          sampleRate={message.audioSampleRate || 24000}
          duration={message.audioDuration || 0}
          transcript={message.content}
          role={message.role}
          onSave={onSaveAudio ? () => handleSaveAudio(message.id) : undefined}
          showTranscript={true}
        />
      );
    }
    
    // Text message
    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
        role="listitem"
      >
        <div
          className={`max-w-[80%] rounded-lg px-3 py-2 ${
            isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
          }`}
          style={{
            backgroundColor: isUser 
              ? theme.accent 
              : theme.isLight ? '#f5f5f5' : '#27272a',
            color: isUser 
              ? '#ffffff' 
              : theme.text.high,
          }}
        >
          <MessageContent content={message.content} role={message.role} />
          <p 
            className="text-xs mt-1 opacity-70"
            aria-label={`Sent at ${new Date(message.timestamp).toLocaleTimeString()}`}
          >
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      </div>
    );
  }, [theme, onSaveAudio, handleSaveAudio]);

  return (
    <div 
      className="flex flex-col h-full"
      style={{ backgroundColor: theme.background.ghost }}
      role="region"
      aria-label="Chat conversation"
      id={id}
    >
      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
        tabIndex={0}
      >
        {messages.length === 0 && showEmptyState ? (
          <div 
            className="flex items-center justify-center h-full"
            role="status"
          >
            <p 
              className="text-sm text-center max-w-xs"
              style={{ color: theme.text.low }}
            >
              {emptyStateMessage}
            </p>
          </div>
        ) : (
          <div role="list" aria-label="Messages">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div 
          className="px-4 py-2"
          role="status"
          aria-live="polite"
          aria-label="Generating response"
        >
          <div 
            className="flex items-center gap-2 text-sm"
            style={{ color: theme.text.medium }}
          >
            <div className="flex gap-1" aria-hidden="true">
              <span 
                className="w-2 h-2 rounded-full animate-bounce" 
                style={{ backgroundColor: theme.accent, animationDelay: '0ms' }} 
              />
              <span 
                className="w-2 h-2 rounded-full animate-bounce" 
                style={{ backgroundColor: theme.accent, animationDelay: '150ms' }} 
              />
              <span 
                className="w-2 h-2 rounded-full animate-bounce" 
                style={{ backgroundColor: theme.accent, animationDelay: '300ms' }} 
              />
            </div>
            <span>Generating...</span>
          </div>
        </div>
      )}

      {/* Input Area - Grok-style pill-shaped input */}
      <div className="p-4">
        <div 
          className="rounded-full flex items-center px-2 py-1.5 gap-1"
          style={{ 
            backgroundColor: theme.stroke.low,
          }}
        >
          {/* Mic button - pill shaped, on the left */}
          {onVoiceClick && (
            <button
              onClick={onVoiceClick}
              disabled={!voiceSupported}
              aria-label={!voiceSupported 
                ? "Voice chat not supported in this browser" 
                : "Switch to voice chat"}
              title={!voiceSupported 
                ? "Voice chat not supported in this browser" 
                : "Voice chat (speak with AI)"}
              className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                !voiceSupported 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:opacity-70'
              }`}
              style={{ 
                color: theme.text.medium,
              }}
            >
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
          )}

          {/* Single-line text input */}
          <input
            ref={inputRef}
            data-chat-input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={inputDisabled}
            aria-label="Message input"
            className="flex-1 bg-transparent outline-none text-sm px-2"
            style={{ 
              color: theme.text.high,
            }}
          />

          {/* Model selector - rendered inside input bar */}
          {modelSelector}

          {/* Arrow send button - pill shaped */}
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isLoading || inputDisabled}
            aria-label="Send message"
            className={`p-2 rounded-full transition-colors flex-shrink-0 ${
              !inputValue.trim() || isLoading || inputDisabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:opacity-70'
            }`}
            style={{ 
              backgroundColor: theme.background.ghost,
              color: theme.text.medium,
            }}
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

export default ChatPanel;
