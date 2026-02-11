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
import type { ChatMessage, ChatMode, FeedbackPayload } from '../types';
import { getDisplayContent } from '../types';
import { useThemeColors } from '../theme';
import { MessageContent } from './MessageContent';
import { AudioBubble } from './AudioBubble';
import { TrustBadge } from './ContentTrust';
import { AssistantMessageActions, UserMessageActions } from './MessageActions';
import { VersionNavigator } from './VersionNavigator';
import { DislikeFeedbackModal } from './DislikeFeedbackModal';
import { Button } from '@marcelinodzn/ds-react';
import { DSIcon } from './DSIcon';

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
  /** Callback when user clicks search button */
  onSearchClick?: () => void;
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
  
  // Voice streaming props
  /** Streaming user transcript (while user is speaking) */
  streamingUserTranscript?: string;
  /** Streaming AI response text (while AI is responding) */
  streamingAIResponse?: string;
  
  // Feedback props (Phase 3) - moved from MessageFeedback to types.ts
  /** @deprecated Use onLike/onDislike instead for new ChatGPT-style actions */
  onMessageFeedback?: (payload: FeedbackPayload) => void;
  /** @deprecated No longer needed - use MessageActions instead */
  onSaveAsExample?: (content: string) => void;
  
  // New ChatGPT-style action callbacks
  /** Callback when user clicks "like" on assistant message */
  onLike?: (messageId: string) => void;
  /** Callback when user clicks "dislike" on assistant message */
  onDislike?: (messageId: string) => void;
  /** Callback when user clicks "try again" to regenerate response */
  onTryAgain?: (messageId: string) => void;
  
  // Edit flow callbacks
  /** Currently editing message ID (controlled by parent) */
  editingMessageId?: string | null;
  /** Current edit value (controlled by parent) */
  editValue?: string;
  /** Callback when user initiates edit */
  onStartEdit?: (messageId: string, content: string) => void;
  /** Callback when edit value changes */
  onEditChange?: (value: string) => void;
  /** Callback when edit is submitted */
  onSubmitEdit?: (messageId: string, newContent: string) => void;
  /** Callback when edit is cancelled */
  onCancelEdit?: () => void;
  /** Callback when user navigates to a different version */
  onVersionChange?: (messageId: string, newVersion: number) => void;
  
  // Dislike feedback modal props
  /** Message ID for which dislike modal is open (null = closed) */
  dislikeModalMessageId?: string | null;
  /** Callback when user submits dislike modal with reasons + comment */
  onDislikeModalSubmit?: (reasons: string[], comment: string) => void;
  /** Callback when user closes dislike modal without detailed feedback */
  onDislikeModalClose?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export const ChatPanel = memo(function ChatPanel({ 
  messages, 
  onSendMessage, 
  isLoading,
  mode: _mode = 'copy',
  placeholder = 'Ask or describe what you need...',
  showEmptyState = true,
  emptyStateMessage = 'What would you like to create today?',
  inputDisabled = false,
  id,
  onVoiceClick,
  voiceSupported = true,
  onSearchClick,
  modelSelector,
  channelSelector,
  platformSelector,
  // Content Trust System props
  contextSelector,
  onTrustBadgeClick,
  settingsTrigger,
  // Voice streaming props
  streamingUserTranscript,
  streamingAIResponse,
  // Feedback props (Phase 3) - deprecated
  onMessageFeedback: _onMessageFeedback,
  onSaveAsExample: _onSaveAsExampleProp,
  // New ChatGPT-style action callbacks
  onLike,
  onDislike,
  onTryAgain,
  // Edit flow
  editingMessageId,
  editValue,
  onStartEdit,
  onEditChange,
  onSubmitEdit,
  onCancelEdit,
  onVersionChange,
  // Dislike feedback modal
  dislikeModalMessageId,
  onDislikeModalSubmit,
  onDislikeModalClose,
}: ChatPanelProps) {
  const theme = useThemeColors();
  const [inputValue, setInputValue] = useState('');
  const [lineCount, setLineCount] = useState(1);
  const [hasMultipleLines, setHasMultipleLines] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingUserTranscript, streamingAIResponse]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (inputValue.trim() && !isLoading && !inputDisabled) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      setLineCount(1);
      setHasMultipleLines(false);
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
      
      // Detect multiple visual lines (including word-wrapped text)
      // Single line height is approximately 34px (28px minHeight + 6px padding)
      setHasMultipleLines(scrollHeight > 34);
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


  // Render individual message
  const renderMessage = useCallback((message: ChatMessage) => {
    const isUser = message.role === 'user';
    const displayContent = getDisplayContent(message);
    const isEditing = editingMessageId === message.id;
    
    // Audio message
    if (message.type === 'audio' && message.audioData) {
      return (
        <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`} role="listitem">
          <div className="flex flex-col items-end gap-1">
            <AudioBubble
              messageId={message.id}
              audioData={message.audioData}
              sampleRate={message.audioSampleRate || 24000}
              duration={message.audioDuration || 0}
              transcript={message.content}
              role={message.role}
              showTranscript={true}
            />
            {/* User audio message actions (copy only, no edit for audio) */}
            {isUser && (
              <div className="flex items-center gap-2">
                <UserMessageActions
                  messageId={message.id}
                  content={message.content}
                  onEdit={() => {}} // no-op for audio
                  disabled={isLoading}
                  hideEdit={true}
                />
              </div>
            )}
            {/* Assistant audio message actions */}
            {!isUser && onLike && onDislike && onTryAgain && (
              <div className="flex items-center gap-2">
                <AssistantMessageActions
                  messageId={message.id}
                  content={message.content}
                  onLike={onLike}
                  onDislike={onDislike}
                  onTryAgain={onTryAgain}
                  disabled={isLoading}
                  feedbackGiven={message.userFeedback}
                />
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Text message - User
    if (isUser) {
      return (
        <div
          key={message.id}
          className="flex justify-end"
          role="listitem"
        >
          {isEditing ? (
            // Edit mode: inline textarea
            <div className="max-w-[80%] flex flex-col gap-2">
              <textarea
                value={editValue}
                onChange={(e) => onEditChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSubmitEdit?.(message.id, editValue || '');
                  }
                  if (e.key === 'Escape') {
                    onCancelEdit?.();
                  }
                }}
                className="w-full px-4 py-2 rounded-2xl text-sm resize-none outline-none"
                style={{
                  backgroundColor: theme.stroke.low,
                  color: theme.text.high,
                  minHeight: '60px',
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={onCancelEdit}
                  className="text-xs px-3 py-1 rounded-full hover:opacity-80"
                  style={{ color: theme.text.low }}
                >
                  cancel
                </button>
                <button
                  onClick={() => onSubmitEdit?.(message.id, editValue || '')}
                  disabled={!editValue?.trim() || editValue === displayContent}
                  className="text-xs px-3 py-1 rounded-full disabled:opacity-40"
                  style={{
                    backgroundColor: theme.accent,
                    color: '#fff',
                  }}
                >
                  submit
                </button>
              </div>
            </div>
          ) : (
            // Normal view mode
            <div className="flex flex-col items-end gap-1 group">
              <div
                className={`max-w-[80%] px-4 pt-2 ${
                  displayContent.split('\n').length > 1 || displayContent.length > 50 ? 'rounded-2xl' : 'rounded-full'
                }`}
                style={{
                  backgroundColor: theme.stroke.low,
                  color: theme.text.high,
                }}
              >
                <MessageContent content={displayContent} role="user" />
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <UserMessageActions
                  messageId={message.id}
                  content={displayContent}
                  onEdit={onStartEdit || (() => {})}
                  disabled={isLoading}
                />
                {(message.promptVersions?.length ?? 0) > 1 && (
                  <VersionNavigator
                    currentVersion={message.displayVersion ?? message.promptVersions!.length}
                    totalVersions={message.promptVersions!.length}
                    onVersionChange={(newVersion) => onVersionChange?.(message.id, newVersion)}
                    disabled={isLoading}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
    
    // Text message - Assistant
    return (
      <div
        key={message.id}
        className="flex justify-start"
        role="listitem"
      >
        <div
          className="max-w-[80%] px-3 py-2"
          style={{
            color: theme.text.high,
          }}
        >
          <MessageContent content={message.content} role="assistant" />
          
          {/* Actions row: Trust Badge + Message Actions */}
          <div className="flex items-center gap-2 mt-1.5">
            {message.trustScore && (
              <TrustBadge
                trustScore={message.trustScore}
                onClick={() => onTrustBadgeClick?.(message.id)}
                size="sm"
                showScore={true}
                // messageContent removed - copy now in MessageActions
              />
            )}
            {onLike && onDislike && onTryAgain && (
              <AssistantMessageActions
                messageId={message.id}
                content={message.content}
                onLike={onLike}
                onDislike={onDislike}
                onTryAgain={onTryAgain}
                disabled={isLoading}
                feedbackGiven={message.userFeedback}
              />
            )}
          </div>
        </div>
      </div>
    );
  }, [
    theme, 
    onTrustBadgeClick, 
    isLoading,
    onLike, 
    onDislike, 
    onTryAgain,
    editingMessageId,
    editValue,
    onStartEdit,
    onEditChange,
    onSubmitEdit,
    onCancelEdit,
    onVersionChange,
  ]);

  // Render input area (reusable for both layouts)
  const renderInputArea = useCallback(() => (
    <div className="w-full px-4">
      <div 
        className={`${hasMultipleLines ? 'rounded-2xl' : 'rounded-full'} flex ${hasMultipleLines ? 'items-end' : 'items-center'} px-2 py-1.5 gap-1 transition-all duration-300`}
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
              <DSIcon name="IcStop" size="S" attention="high" />
            ) : (
              <DSIcon name="IcMic" size="S" attention="medium" />
            )}
          </button>
        )}

        {/* Search button - using Jio DS Button */}
        {onSearchClick && (
          <div style={{ width: '36px', height: '36px' }}>
            <Button
              onPress={onSearchClick}
              aria-label="Search"
              appearance="ghost"
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
              }}
            >
              <DSIcon name="IcSearch" size="S" attention="medium" />
            </Button>
          </div>
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
          className={`flex-1 bg-transparent outline-none text-sm px-2 resize-none ${lineCount > 1 ? 'overflow-y-auto' : 'overflow-y-hidden'}`}
          style={{ 
            color: theme.text.high,
            minHeight: '28px',
            maxHeight: '84px', // 3 lines * 28px
            lineHeight: '22px',
            paddingTop: '3px',
            paddingBottom: '3px',
            fontSize: '14px',
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
            <DSIcon name="IcArrowUp" size="S" attention="high" style={{ color: '#ffffff' }} />
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
  ), [hasMultipleLines, theme, onVoiceClick, voiceSupported, _mode, inputValue, handleInputChange, handleKeyDown, placeholder, inputDisabled, handleSubmit, isLoading, modelSelector, contextSelector, channelSelector, platformSelector, settingsTrigger]);

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
              className="flex-1 overflow-y-auto pt-6 px-4 pb-4 scrollable-container"
              role="log"
              aria-live="polite"
              aria-atomic="false"
              aria-relevant="additions"
              tabIndex={0}
            >
              <div role="list" aria-label="Messages" className="space-y-4">
                {messages.map(renderMessage)}
                
                {/* Streaming User Transcript (while user is speaking) */}
                {streamingUserTranscript && (
                  <div className="flex justify-end" role="listitem">
                    <div 
                      className="max-w-[80%] px-4 py-2 rounded-2xl rounded-br-md"
                      style={{ 
                        backgroundColor: theme.stroke.low,
                        color: theme.text.high,
                      }}
                    >
                      <span>{streamingUserTranscript}</span>
                      <span 
                        className="inline-block w-0.5 h-4 ml-1 align-middle animate-pulse"
                        style={{ backgroundColor: theme.text.medium }}
                      />
                    </div>
                  </div>
                )}
                
                {/* Streaming AI Response (while AI is responding) */}
                {streamingAIResponse && (
                  <div className="flex justify-start" role="listitem">
                    <div 
                      className="max-w-[80%] px-3 py-2"
                      style={{ color: theme.text.high }}
                    >
                      <span>{streamingAIResponse}</span>
                      <span 
                        className="inline-block w-2 h-4 ml-1 align-middle animate-pulse rounded-sm"
                        style={{ backgroundColor: theme.accent }}
                      />
                    </div>
                  </div>
                )}
                
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
      
      {/* Dislike Feedback Modal */}
      {onDislikeModalSubmit && onDislikeModalClose && (
        <DislikeFeedbackModal
          isOpen={!!dislikeModalMessageId}
          onSubmit={onDislikeModalSubmit}
          onClose={onDislikeModalClose}
        />
      )}
    </div>
  );
});

export default ChatPanel;
