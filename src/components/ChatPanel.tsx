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
import { TrustBadge } from './ContentTrust';
import { Button } from '@marcelinodzn/ds-react';

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
  /** Model selector component to render below input */
  modelSelector?: React.ReactNode;
  /** @deprecated Use contextSelector instead */
  channelSelector?: React.ReactNode;
  /** @deprecated Use contextSelector instead */
  platformSelector?: React.ReactNode;
  
  // Content Trust System props
  /** Combined Ecosystem + Channel selector component (replaces channelSelector + platformSelector) */
  contextSelector?: React.ReactNode;
  /** Callback when user clicks trust badge to view details */
  onTrustBadgeClick?: (messageId: string) => void;
  
  // Settings trigger
  /** Settings icon to render below input at the end of dropdowns */
  settingsTrigger?: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export const ChatPanel = memo(function ChatPanel({ 
  messages, 
  onSendMessage, 
  isLoading,
  mode: _mode = 'copy',
  placeholder = 'What do you want to know?',
  onSaveAudio,
  showEmptyState = true,
  emptyStateMessage = 'What would you like to create today?',
  inputDisabled = false,
  id,
  onVoiceClick,
  voiceSupported = true,
  modelSelector,
  channelSelector,
  platformSelector,
  // Content Trust System props
  contextSelector,
  onTrustBadgeClick,
  settingsTrigger,
}: ChatPanelProps) {
  const theme = useThemeColors();
  const [inputValue, setInputValue] = useState('');
  const [lineCount, setLineCount] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (inputValue.trim() && !isLoading && !inputDisabled) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      setLineCount(1);
    }
  }, [inputValue, isLoading, inputDisabled, onSendMessage]);

  // Handle input change and auto-grow
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Calculate line count
    const lines = value.split('\n').length;
    const maxLines = 3;
    setLineCount(Math.min(lines, maxLines));
    
    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      const lineHeight = 24; // Approximate line height in pixels
      const maxHeight = lineHeight * maxLines;
      
      if (scrollHeight <= maxHeight) {
        inputRef.current.style.height = `${scrollHeight}px`;
      } else {
        inputRef.current.style.height = `${maxHeight}px`;
      }
    }
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Shift+Enter allows new lines, so we don't prevent default
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
        {isUser ? (
          <div
            className={`max-w-[80%] px-4 pt-2 ${
              message.content.split('\n').length > 1 || message.content.length > 50 ? 'rounded-2xl' : 'rounded-full'
            }`}
            style={{
              backgroundColor: theme.stroke.low,
              color: theme.text.high,
            }}
          >
            <MessageContent content={message.content} role={message.role} />
          </div>
        ) : (
          <div
            className="max-w-[80%] px-3 py-2"
            style={{
              color: theme.text.high,
            }}
          >
            <MessageContent content={message.content} role={message.role} />
            
            {/* Trust Badge for assistant messages */}
            {message.trustScore && (
              <div className="flex items-center gap-2 mt-1.5">
                <TrustBadge
                  trustScore={message.trustScore}
                  onClick={() => onTrustBadgeClick?.(message.id)}
                  size="sm"
                  showScore={true}
                  messageContent={message.content}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [theme, onSaveAudio, handleSaveAudio, onTrustBadgeClick]);

  // Render input area (reusable for both layouts)
  const renderInputArea = useCallback(() => (
    <div className="w-full px-4">
      <div 
        className={`${lineCount === 1 ? 'rounded-full' : 'rounded-2xl'} flex items-center px-2 py-1.5 gap-1 transition-all duration-300`}
        style={{ 
          backgroundColor: theme.stroke.low,
        }}
      >
        {/* Mic/Stop button - pill shaped, on the left */}
        {onVoiceClick && (
          <button
            onClick={onVoiceClick}
            disabled={!voiceSupported}
            aria-label={!voiceSupported 
              ? "Voice chat not supported in this browser" 
              : _mode === 'voice' 
                ? "Stop voice chat and return to text" 
                : "Switch to voice chat"}
            title={!voiceSupported 
              ? "Voice chat not supported in this browser" 
              : _mode === 'voice'
                ? "Stop voice chat"
                : "Voice chat (speak with AI)"}
            className={`p-2 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              !voiceSupported 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:opacity-70 cursor-pointer'
            }`}
            style={{ 
              color: theme.text.medium,
            }}
          >
            {_mode === 'voice' ? (
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
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
            )}
          </button>
        )}

        {/* Multi-line textarea */}
        <textarea
          ref={inputRef}
          data-chat-input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={inputDisabled}
          aria-label="Message input"
          rows={1}
          className="flex-1 bg-transparent outline-none text-sm px-2 resize-none overflow-y-auto"
          style={{ 
            color: theme.text.high,
            minHeight: '28px',
            maxHeight: '84px', // 3 lines * 28px
            lineHeight: '22px',
            paddingTop: '0px',
            paddingBottom: '0px',
            fontSize: '14px',
            textAlign: 'center',
          }}
        />

        {/* Arrow send button - Jio DS Button (high attention style) */}
        <div className="flex-shrink-0" style={{ width: '36px', height: '36px' }}>
          <Button
            onPress={handleSubmit}
            isDisabled={!inputValue.trim() || isLoading || inputDisabled}
            aria-label="Send message"
            appearance="primary"
            size="S"
            style={{ 
              width: '36px', 
              height: '36px', 
              minHeight: '36px',
              padding: '0',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#3900AD',
              color: '#ffffff',
            }}
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#ffffff"
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Model + Context selectors - below input, centered */}
      {(modelSelector || contextSelector || channelSelector || platformSelector || settingsTrigger) && (
        <div className="flex items-center justify-center gap-0 mt-3">
          {modelSelector}
          {/* Prefer new contextSelector, fallback to legacy channel + platform */}
          {contextSelector || (
            <>
              {channelSelector}
              {platformSelector}
            </>
          )}
          {settingsTrigger}
        </div>
      )}
    </div>
  ), [lineCount, theme, onVoiceClick, voiceSupported, _mode, inputValue, handleInputChange, handleKeyDown, placeholder, inputDisabled, handleSubmit, isLoading, modelSelector, contextSelector, channelSelector, platformSelector, settingsTrigger]);

  return (
    <div 
      className="flex flex-col h-full"
      style={{ backgroundColor: theme.background.ghost }}
      role="region"
      aria-label="Chat conversation"
      id={id}
    >
      {/* Centered container with 75% max-width on medium+ screens */}
      <div className="w-full md:max-w-[75%] mx-auto h-full flex flex-col">
        {messages.length === 0 && showEmptyState ? (
          /* Empty State: Centered Layout */
          <div 
            className="flex-1 flex flex-col items-center justify-center p-4 gap-6 transition-all duration-300 ease-in-out"
            style={{
              animation: 'fadeIn 300ms ease-in-out',
            }}
          >
            <p 
              className="text-sm text-center max-w-xs"
              style={{ 
                color: theme.text.low,
                animation: 'fadeIn 300ms ease-in-out',
                fontWeight: 900,
                fontSize: '20px',
                letterSpacing: '-0.3px',
                width: '400px',
                maxWidth: '400px',
              }}
              role="status"
            >
              {emptyStateMessage}
            </p>
            
            {renderInputArea()}
          </div>
        ) : (
          /* Active State: Scrollable Messages + Bottom Input */
          <div 
            className="h-full flex flex-col"
            style={{
              animation: 'fadeIn 300ms ease-in-out',
            }}
          >
            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-8"
              role="log"
              aria-live="polite"
              aria-atomic="false"
              aria-relevant="additions"
              tabIndex={0}
            >
              <div role="list" aria-label="Messages">
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} aria-hidden="true" />
              </div>
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

            {/* Input Area at Bottom */}
            <div className="py-4 flex justify-center transition-all duration-300 ease-in-out">
              {renderInputArea()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default ChatPanel;
