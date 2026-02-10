import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, ChatMode } from '../../types';
import { useThemeColors } from '../../theme';
import { MessageContent } from '../MessageContent';
import { DSIcon } from '../DSIcon';

interface TwChatPanelProps {
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
  /** Channel selector component to render below input */
  channelSelector?: React.ReactNode;
  /** Platform selector component to render below input */
  platformSelector?: React.ReactNode;
}

export function TwChatPanel({ 
  messages, 
  onSendMessage, 
  isLoading,
  placeholder = 'Ask or describe what you need...',
  emptyStateMessage = 'Start a conversation to generate copy',
  inputDisabled = false,
  onVoiceClick,
  voiceSupported = true,
  modelSelector,
  channelSelector,
  platformSelector,
}: TwChatPanelProps) {
  const theme = useThemeColors();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = () => {
    if (inputValue.trim() && !isLoading && !inputDisabled) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div 
      className="flex flex-col h-full"
      style={{ backgroundColor: theme.background.ghost }}
    >
      {/* Centered container with 75% max-width on medium+ screens */}
      <div className="w-full md:max-w-[75%] mx-auto h-full flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollable-container">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p 
                className="text-sm"
                style={{ color: theme.text.low }}
              >
                {emptyStateMessage}
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[80%] rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: message.role === 'user' 
                        ? '#f97316' 
                        : theme.isLight ? '#f5f5f5' : '#27272a',
                      color: message.role === 'user' 
                        ? '#ffffff' 
                        : theme.text.high,
                    }}
                  >
                    <MessageContent content={message.content} role={message.role} />
                    <p 
                      className="text-xs mt-1 opacity-70"
                    >
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="px-4 py-2">
            <div 
              className="flex items-center gap-2 text-sm"
              style={{ color: theme.text.medium }}
            >
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
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
                className={`p-2 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  !voiceSupported 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:opacity-70 cursor-pointer'
                }`}
                style={{ 
                  color: theme.text.medium,
                }}
              >
                <DSIcon name="IcMic" size="S" attention="medium" />
              </button>
            )}

            {/* Single-line text input */}
            <input
              ref={inputRef}
              data-chat-input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={inputDisabled}
              aria-label="Message input"
              className="flex-1 bg-transparent outline-none text-sm px-2"
              style={{ 
                color: theme.text.high,
              }}
            />

            {/* Arrow send button - pill shaped */}
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isLoading || inputDisabled}
              aria-label="Send message"
              className={`p-2 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                !inputValue.trim() || isLoading || inputDisabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:opacity-70 cursor-pointer'
              }`}
              style={{ 
                backgroundColor: theme.background.ghost,
                color: theme.text.medium,
              }}
            >
              <DSIcon name="IcArrowUp" size="S" attention="high" style={{ color: '#ffffff' }} />
            </button>
          </div>

          {/* Model + Channel/Platform selectors - below input */}
          {(modelSelector || channelSelector || platformSelector) && (
            <div className="flex items-center justify-start gap-3 mt-3">
              {modelSelector}
              {channelSelector}
              {platformSelector}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
