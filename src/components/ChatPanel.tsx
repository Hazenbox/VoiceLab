import { useState, useRef, useEffect } from 'react';
import { Button, TextArea } from '@marcelinodzn/ds-react';
import type { ChatMessage } from '../types';
import { useThemeColors } from '../theme';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatPanel({ messages, onSendMessage, isLoading }: ChatPanelProps) {
  const theme = useThemeColors();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        <div className="flex gap-2">
          <div className="flex-1">
            <TextArea
              value={inputValue}
              onChange={(value: string) => setInputValue(value)}
              placeholder="Type your prompt here..."
              rows={2}
              size="S"
              onKeyDown={handleKeyPress}
            />
          </div>
          <Button
            onPress={handleSubmit}
            isDisabled={!inputValue.trim() || isLoading}
            appearance="primary"
            size="S"
            aria-label="Send message"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
