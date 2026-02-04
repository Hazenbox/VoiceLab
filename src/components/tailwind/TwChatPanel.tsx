import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../types';
import { useThemeColors } from '../../theme';
import { TwButton } from './TwButton';

interface TwChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function TwChatPanel({ messages, onSendMessage, isLoading }: TwChatPanelProps) {
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
    if (inputValue.trim() && !isLoading) {
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
              Start a conversation to generate copy
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
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
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
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your prompt here..."
              className="w-full px-3 py-2 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{
                backgroundColor: theme.isLight ? '#ffffff' : '#18181b',
                color: theme.text.high,
                border: `1px solid ${theme.stroke.low}`,
                minHeight: '40px',
                maxHeight: '120px',
              }}
              rows={1}
              disabled={isLoading}
            />
          </div>
          <TwButton
            onPress={handleSubmit}
            isDisabled={!inputValue.trim() || isLoading}
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
