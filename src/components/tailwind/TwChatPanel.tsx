import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, ChatMode } from '../../types';
import { useThemeColors } from '../../theme';
import { TwButton } from './TwButton';
import { MessageContent } from '../MessageContent';

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
}

export function TwChatPanel({ 
  messages, 
  onSendMessage, 
  isLoading,
  placeholder = 'Type your prompt here...',
  emptyStateMessage = 'Start a conversation to generate copy',
  inputDisabled = false,
  onVoiceClick,
  voiceSupported = true,
}: TwChatPanelProps) {
  const theme = useThemeColors();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputValue]);

  const handleSubmit = () => {
    if (inputValue.trim() && !isLoading && !inputDisabled) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div 
      className="flex flex-col h-full"
      style={{ backgroundColor: theme.background.ghost }}
    >
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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

      {/* Input Area */}
      <div 
        className="border-t p-4"
        style={{ borderColor: theme.stroke.low }}
      >
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              data-chat-input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              className="w-full px-3 py-2 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{
                backgroundColor: theme.isLight ? '#ffffff' : '#18181b',
                color: theme.text.high,
                border: `1px solid ${theme.stroke.low}`,
                minHeight: '40px',
                maxHeight: '120px',
              }}
              rows={1}
              disabled={isLoading || inputDisabled}
            />
          </div>
          {/* Voice chat button - only shown in copy mode */}
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
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                !voiceSupported 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:opacity-80'
              }`}
              style={{ 
                backgroundColor: theme.background.subtle,
                color: theme.text.medium,
              }}
            >
              <svg 
                width="20" 
                height="20" 
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
          <TwButton
            onPress={handleSubmit}
            isDisabled={!inputValue.trim() || isLoading || inputDisabled}
            appearance="primary"
            size="S"
          >
            Send
          </TwButton>
        </div>
      </div>
    </div>
  );
}
