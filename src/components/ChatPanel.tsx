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

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { ChatMessage, ChatMode, FeedbackPayload } from '../types';
import { getDisplayContent } from '../types';
import { useThemeColors, SEMANTIC_COLORS } from '../theme';
import { useUIStore } from '../stores/uiStore';
import { MessageContent } from './MessageContent';
import { AudioBubble } from './AudioBubble';
import { TrustBadge } from './ContentTrust';
import { AssistantMessageActions, UserMessageActions } from './MessageActions';
import { VersionNavigator } from './VersionNavigator';
import { DislikeFeedbackModal } from './DislikeFeedbackModal';
import { ActionButton } from './ActionButton';
import { Button } from '@marcelinodzn/ds-react';
import { Badge } from './ui/Badge';
import { DSIcon } from './DSIcon';
import { useRotatingPlaceholder } from '../hooks/useRotatingPlaceholder';
import { JioSaavnExploration } from './JioSaavnExploration';
import { JioHealthHubAction } from './JioHealthHubAction';

/** Send button brand purple */
const SEND_BUTTON_COLOR = '#3900AD';

// =============================================================================
// Streaming Text Hook - ChatGPT-like word-by-word animation
// =============================================================================

/**
 * Builds streaming units from text, processing line-by-line first then word-by-word.
 * This preserves markdown structure (numbered lists, bullets, code blocks).
 * 
 * Returns array of { text: string, isInstant: boolean } units.
 * - Regular words: isInstant = false (35ms delay)
 * - Newlines/empty lines: isInstant = true (0ms delay)
 * - Code block lines: isInstant = false but streamed as whole lines
 */
function buildStreamingUnits(text: string): Array<{ text: string; isInstant: boolean }> {
  const units: Array<{ text: string; isInstant: boolean }> = [];
  const lines = text.split('\n');
  let inCodeBlock = false;
  
  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    
    // Track code block state (``` toggles in/out)
    if (trimmedLine.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      // Code fence line - stream as single unit
      units.push({ text: line, isInstant: false });
    } else if (inCodeBlock) {
      // Inside code block - stream entire line as single unit
      units.push({ text: line, isInstant: false });
    } else if (trimmedLine === '') {
      // Empty line - no content unit needed, just the newline below
    } else {
      // Regular line - split into words (preserving spaces between words)
      const words = line.split(/(\s+)/).filter(w => w);
      words.forEach(word => {
        units.push({ text: word, isInstant: false });
      });
    }
    
    // Add newline after each line except the last
    if (lineIndex < lines.length - 1) {
      units.push({ text: '\n', isInstant: true }); // Newlines are instant
    }
  });
  
  return units;
}

/**
 * Custom hook for ChatGPT-like word-by-word streaming animation.
 * 
 * Key behaviors:
 * - Normal pace: 30ms per word while chunks are still arriving
 * - Catch-up: accelerates to 10ms when animation falls behind incoming content
 * - Finish mode: when isStreaming goes false (committed message ready), 
 *   quickly finishes remaining words at 5ms instead of showing all at once
 * - displayedText is NOT in the deps array to avoid re-trigger loops
 */
const useStreamingText = (fullText: string, isStreaming: boolean) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const lastFullTextRef = useRef('');
  const displayedTextRef = useRef('');
  const unitsRef = useRef<Array<{ text: string; isInstant: boolean }>>([]);
  const currentIndexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animatingRef = useRef(false);
  const lastChunkTimeRef = useRef(0);
  const isStreamingRef = useRef(isStreaming);

  // Keep isStreamingRef in sync so the animation loop can read it
  isStreamingRef.current = isStreaming;

  // Compute dynamic delay based on how far behind the animation is
  const getDelay = useCallback((unit: { isInstant: boolean }, wordsBehind: number): number => {
    if (unit.isInstant) return 0;
    // Stream ended or committed message arrived -- finish fast
    if (!isStreamingRef.current) return 5;
    // Far behind -- batch quickly
    if (wordsBehind > 30) return 8;
    // Moderately behind
    if (wordsBehind > 15) return 15;
    // Normal streaming pace
    return 30;
  }, []);

  // The animation loop. Reads refs only, no deps on state.
  const startAnimation = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;

    const animateNext = () => {
      const units = unitsRef.current;
      const idx = currentIndexRef.current;

      if (idx >= units.length) {
        // Caught up to current content -- pause animation until new content arrives
        animatingRef.current = false;
        // If streaming is done and we've shown everything, mark complete
        if (!isStreamingRef.current) {
          setIsComplete(true);
          console.log('[Streaming] animation: complete (all units shown)');
        }
        return;
      }

      const unit = units[idx];
      currentIndexRef.current = idx + 1;

      // Build displayed text from units
      const text = units
        .slice(0, currentIndexRef.current)
        .map(u => u.text)
        .join('');
      displayedTextRef.current = text;
      setDisplayedText(text);

      const wordsBehind = units.length - currentIndexRef.current;
      const delay = getDelay(unit, wordsBehind);

      timeoutRef.current = setTimeout(animateNext, delay);
    };

    animateNext();
  }, [getDelay]);

  // Main effect: reacts to fullText or isStreaming changes
  useEffect(() => {
    // Stream just ended (committed message is ready) -- 
    // if animation is still running, it will pick up the fast finish via isStreamingRef.
    // If animation was paused (caught up), restart it to finish any remaining units.
    if (!isStreaming && fullText && lastFullTextRef.current) {
      console.log(`[Streaming] hook: isStreaming=false, animation behind by ${unitsRef.current.length - currentIndexRef.current} units`);
      if (!animatingRef.current && currentIndexRef.current < unitsRef.current.length) {
        startAnimation();
      }
      // If animation already caught up and fullText matches, just mark complete
      if (currentIndexRef.current >= unitsRef.current.length && unitsRef.current.length > 0) {
        setIsComplete(true);
      }
      return;
    }

    // If not streaming and no text, reset everything
    if (!isStreaming && !fullText) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      animatingRef.current = false;
      setDisplayedText('');
      displayedTextRef.current = '';
      setIsComplete(false);
      lastFullTextRef.current = '';
      unitsRef.current = [];
      currentIndexRef.current = 0;
      return;
    }

    // Empty text while streaming -- reset and wait
    if (!fullText) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      animatingRef.current = false;
      setDisplayedText('');
      displayedTextRef.current = '';
      setIsComplete(false);
      lastFullTextRef.current = '';
      unitsRef.current = [];
      currentIndexRef.current = 0;
      return;
    }

    // New content arrived
    if (fullText !== lastFullTextRef.current) {
      const prevText = lastFullTextRef.current;
      lastFullTextRef.current = fullText;
      lastChunkTimeRef.current = performance.now();

      const newUnits = buildStreamingUnits(fullText);

      // Detect if this is a continuation (same prefix) or completely new content
      const isContinuation = prevText && fullText.startsWith(
        prevText.substring(0, Math.min(prevText.length, 20))
      );

      if (isContinuation) {
        // Update units but keep the current animation position
        unitsRef.current = newUnits;
      } else {
        // Completely new content -- reset animation
        console.log('[Streaming] animation: new content detected, resetting');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        animatingRef.current = false;
        unitsRef.current = newUnits;
        currentIndexRef.current = 0;
        displayedTextRef.current = '';
        setDisplayedText('');
        setIsComplete(false);
      }

      // Start or resume animation if not already running
      if (!animatingRef.current) {
        startAnimation();
      }
    }
  }, [fullText, isStreaming, startAnimation]);

  // Reset when streaming starts fresh
  useEffect(() => {
    if (isStreaming && !fullText) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      animatingRef.current = false;
      setDisplayedText('');
      displayedTextRef.current = '';
      setIsComplete(false);
      unitsRef.current = [];
      currentIndexRef.current = 0;
    }
  }, [isStreaming, fullText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      animatingRef.current = false;
    };
  }, []);

  return { displayedText, isComplete };
};

// =============================================================================
// Types
// =============================================================================

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  /** Current chat mode for styling */
  mode?: ChatMode;
  /** Placeholder text for input. Pass an array to enable rotating animation. */
  placeholder?: string | string[];
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
  /** @deprecated Use contextSelector instead */
  channelSelector?: React.ReactNode;
  /** @deprecated Use contextSelector instead */
  platformSelector?: React.ReactNode;
  
  // Content Trust System props
  /** Combined Ecosystem + Channel selector component (replaces channelSelector + platformSelector) */
  contextSelector?: React.ReactNode;
  /** Callback when user clicks trust badge to view details */
  onTrustBadgeClick?: (messageId: string) => void;
  
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
  
  // Auto-fix preview props
  /** Callback when user accepts the recommended auto-fixed content */
  onAcceptAutoFix?: (messageId: string) => void;
  
  // Stop generation
  /** Callback when user clicks stop to cancel ongoing generation */
  onStopGeneration?: () => void;
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
  channelSelector,
  platformSelector,
  // Content Trust System props
  contextSelector,
  onTrustBadgeClick,
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
  // Auto-fix preview
  onAcceptAutoFix,
  // Stop generation
  onStopGeneration,
}: ChatPanelProps) {
  const theme = useThemeColors();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isRotating = Array.isArray(placeholder);
  const placeholderArray = isRotating ? placeholder : [placeholder];
  const { currentText: rotatingText, animKey } = useRotatingPlaceholder({
    placeholders: placeholderArray,
    intervalMs: 1500,
    paused: !isRotating || inputValue.length > 0,
  });
  
  // User message bubble: Dynamic multi-line detection (ChatGPT approach)
  const userMessageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [multiLineMessages, setMultiLineMessages] = useState<Set<string>>(new Set());
  
  // Highlight state from trust panel interactions
  const { highlightedText, highlightedMessageId, clearHighlight } = useUIStore(
    useShallow((s) => ({
      highlightedText: s.highlightedText,
      highlightedMessageId: s.highlightedMessageId,
      clearHighlight: s.clearHighlight,
    }))
  );
  
  // Ref for scrolling to highlighted message
  const highlightedMessageRef = useRef<HTMLDivElement>(null);

  // ChatGPT-like word-by-word streaming animation for AI responses
  const { displayedText: streamingDisplayText } = useStreamingText(
    streamingAIResponse || '',
    isLoading && !!streamingAIResponse
  );

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingUserTranscript, streamingAIResponse, streamingDisplayText]);
  
  // Scroll to highlighted message when highlight changes
  useEffect(() => {
    if (highlightedMessageId && highlightedMessageRef.current) {
      highlightedMessageRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [highlightedMessageId]);
  
  // Auto-clear highlight after 3 seconds
  useEffect(() => {
    if (highlightedText) {
      const timer = setTimeout(clearHighlight, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedText, clearHighlight]);

  // Detect multi-line wrapping for user messages (ChatGPT approach)
  useLayoutEffect(() => {
    const newMultiLineMessages = new Set<string>();
    
    userMessageRefs.current.forEach((element, messageId) => {
      if (element) {
        // Check if content has wrapped (scrollHeight > clientHeight)
        const hasWrapped = element.scrollHeight > element.clientHeight + 1;
        const message = messages.find(m => m.id === messageId);
        const hasLineBreaks = message?.content.includes('\n');
        
        if (hasWrapped || hasLineBreaks) {
          newMultiLineMessages.add(messageId);
        }
      }
    });
    
    setMultiLineMessages(newMultiLineMessages);
  }, [messages]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (inputValue.trim() && !isLoading && !inputDisabled) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  }, [inputValue, isLoading, inputDisabled, onSendMessage]);

  // Handle input change and auto-grow
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      const maxLines = 5;
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

  // Reset textarea height when input is cleared
  useEffect(() => {
    if (inputRef.current && inputValue === '') {
      inputRef.current.style.height = 'auto';
    }
  }, [inputValue]);

  // Render individual message
  const renderMessage = useCallback((message: ChatMessage) => {
    const isUser = message.role === 'user';
    const displayContent = getDisplayContent(message);
    const isEditing = editingMessageId === message.id;
    
    // Audio message
    if (message.type === 'audio' && message.audioData) {
      return (
        <div
          key={message.id}
          className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
          role="listitem"
        >
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
      );
    }
    
    // Text message - User
    if (isUser) {
      return (
        <div
          key={message.id}
          className="flex flex-col items-end gap-1 group"
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
                className="w-full px-4 py-2 rounded-2xl resize-none outline-none"
                style={{
                  backgroundColor: theme.stroke.low,
                  color: theme.text.high,
                  minHeight: '60px',
                  fontSize: '15px',
                  lineHeight: 1.5,
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  appearance="ghost"
                  size="S"
                  onPress={onCancelEdit}
                >
                  cancel
                </Button>
                <Button
                  appearance="primary"
                  size="S"
                  onPress={() => onSubmitEdit?.(message.id, editValue || '')}
                  isDisabled={!editValue?.trim() || editValue === displayContent}
                >
                  submit
                </Button>
              </div>
            </div>
          ) : (
            // Normal view mode (ChatGPT-matched: 70% width, 18px radius, dynamic padding)
            <>
              <div
                ref={(el) => {
                  if (el) {
                    userMessageRefs.current.set(message.id, el);
                  } else {
                    userMessageRefs.current.delete(message.id);
                  }
                }}
                className={`max-w-[70%] rounded-[18px] ${
                  multiLineMessages.has(message.id) ? 'px-4 py-4' : 'px-4 py-2'
                }`}
                style={{
                  backgroundColor: theme.background.bold,
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
            </>
          )}
        </div>
      );
    }
    
    // Text message - Assistant
    // Check if this message has auto-fixes applied
    const hasAutoFixPreview = message.autoFixPreview && message.autoFixPreview.appliedFixes.length > 0;
    
    // Use auto-fixed content if available, otherwise use regular content
    const assistantContent = hasAutoFixPreview && message.autoFixPreview 
      ? message.autoFixPreview.fixedContent 
      : message.content;
    
    // Highlighting support for both regular and auto-fixed messages
    const isHighlighted = message.id === highlightedMessageId;
    
    return (
      <div
        key={message.id}
        ref={isHighlighted ? highlightedMessageRef : undefined}
        className="flex justify-start"
        role="listitem"
      >
        <div
          className="max-w-[80%] px-3 py-2"
          style={{
            color: theme.text.high,
          }}
        >
          <MessageContent 
            content={assistantContent} 
            role="assistant" 
            highlightedText={isHighlighted ? highlightedText ?? undefined : undefined}
          />
          
          {/* JioSaavn Exploration - shows when music topics are detected */}
          {/* TEMPORARILY HIDDEN - uncomment to re-enable
          <JioSaavnExploration
            messageId={message.id}
            messageContent={assistantContent}
          />
          */}
          
          {/* JioHealthHub Action - shows when health topics are detected (LLM-based) */}
          {/* TEMPORARILY HIDDEN - uncomment to re-enable
          <JioHealthHubAction
            messageId={message.id}
            messageContent={assistantContent}
          />
          */}
          
          {/* Actions row: Message Actions + Trust Badge + Auto-fixed badge */}
          {/* Trust badge and auto-fixed label only shown for branded content, not general chat */}
          <div className="flex items-center gap-0 mt-1.5 -ml-2">
            {onLike && onDislike && onTryAgain && (
              <AssistantMessageActions
                messageId={message.id}
                content={assistantContent}
                onLike={onLike}
                onDislike={onDislike}
                onTryAgain={onTryAgain}
                disabled={isLoading}
                feedbackGiven={message.userFeedback}
              />
            )}
            {message.trustScore && message.messageIntent !== 'general_chat' && (
              <TrustBadge
                trustScore={message.trustScore}
                onClick={() => onTrustBadgeClick?.(message.id)}
                size="sm"
                showScore={true}
              />
            )}
            {hasAutoFixPreview && message.messageIntent !== 'general_chat' && (
              <Badge variant="positive">auto-fixed</Badge>
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
    highlightedText,
    highlightedMessageId,
  ]);

  // Render input area (reusable for both layouts)
  const renderInputArea = useCallback(() => (
    <div className="w-full">
      <div 
        className="rounded-[28px] flex items-center py-2.5 pr-2.5 pl-4 gap-1"
        style={{ 
          backgroundColor: theme.background.bold,
        }}
      >
        <div className="flex-1 relative flex items-center">
          <textarea
            ref={inputRef}
            data-chat-input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isRotating ? undefined : (placeholder as string)}
            disabled={inputDisabled}
            aria-label="Message input"
            rows={1}
            className="w-full bg-transparent outline-none resize-none overflow-y-auto"
            style={{ 
              color: theme.text.high,
              minHeight: '28px',
              maxHeight: '110px',
              lineHeight: '22px',
              paddingTop: '3px',
              paddingBottom: '3px',
              paddingLeft: '8px',
              paddingRight: '8px',
              fontSize: '15px',
            }}
          />
          {isRotating && inputValue.length === 0 && (
            <span
              key={animKey}
              className="rotating-placeholder"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '8px',
                top: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                lineHeight: '22px',
                fontSize: '15px',
                color: theme.text.low,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 'calc(100% - 16px)',
              }}
            >
              {rotatingText}
            </span>
          )}
        </div>

        {/* Voice button - uses ActionButton for consistency with chat bubble actions */}
        {onVoiceClick && (
          <div className="flex-shrink-0 self-end">
            <ActionButton
              icon={_mode === 'voice' 
                ? <DSIcon name="IcStop" size="S" style={{ color: theme.text.medium }} />
                : <DSIcon name="IcMic" size="S" style={{ color: theme.text.medium }} />
              }
              label={!voiceSupported 
                ? "Voice chat not supported in this browser" 
                : _mode === 'voice' 
                  ? "Stop voice chat" 
                  : "Voice chat"}
              onClick={onVoiceClick}
              disabled={!voiceSupported}
              size={36}
            />
          </div>
        )}

        {/* Send/Stop button - swaps between send and stop during loading */}
        <div className="flex-shrink-0 self-end" style={{ width: '36px', height: '36px' }}>
          {isLoading && onStopGeneration ? (
            <Button
              onPress={onStopGeneration}
              aria-label="Stop generating"
              appearance="neutral"
              single
              style={{ 
                width: '36px', 
                height: '36px', 
                minHeight: '36px',
                paddingTop: '0',
                paddingBottom: '0',
                paddingLeft: '0',
                paddingRight: '0',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.text.high,
              }}
            >
              <DSIcon name="IcStop" size="S" attention="high" style={{ color: theme.background.ghost }} />
            </Button>
          ) : (
            <Button
              onPress={handleSubmit}
              isDisabled={!inputValue.trim() || inputDisabled}
              aria-label="Send message"
              appearance="primary"
              size="S"
              style={{ 
                width: '36px', 
                height: '36px', 
                minHeight: '36px',
                paddingTop: '0',
                paddingBottom: '0',
                paddingLeft: '0',
                paddingRight: '0',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: SEND_BUTTON_COLOR,
                color: '#ffffff',
              }}
            >
              <DSIcon name="IcArrowUp" size="S" attention="high" style={{ color: '#ffffff' }} />
            </Button>
          )}
        </div>
      </div>

      {/* Context selectors - below input, centered */}
      {(contextSelector || channelSelector || platformSelector) && (
        <div className="flex items-center justify-center gap-0 mt-3">
          {/* Prefer new contextSelector, fallback to legacy channel + platform */}
          {contextSelector || (
            <>
              {channelSelector}
              {platformSelector}
            </>
          )}
        </div>
      )}
    </div>
  ), [theme, onVoiceClick, voiceSupported, _mode, inputValue, handleInputChange, handleKeyDown, placeholder, isRotating, rotatingText, animKey, inputDisabled, handleSubmit, isLoading, onStopGeneration, contextSelector, channelSelector, platformSelector]);

  return (
    <div 
      className="flex flex-col h-full"
      style={{ backgroundColor: theme.background.ghost }}
      role="region"
      aria-label="Chat conversation"
      id={id}
    >
      {messages.length === 0 && showEmptyState ? (
        /* Empty State: Centered Layout - takes full height */
        <div 
          className="flex-1 flex flex-col items-center justify-center p-4 gap-6 transition-all duration-300 ease-in-out"
          style={{
            animation: 'fadeIn 300ms ease-in-out',
          }}
        >
          <p 
            className="text-center"
            style={{ 
              color: theme.text.high,
              animation: 'fadeIn 300ms ease-in-out',
              fontWeight: 900,
              fontSize: '24px',
              lineHeight: 1.3,
              letterSpacing: '-0.3px',
              width: '400px',
              maxWidth: '400px',
            }}
            role="status"
          >
            {emptyStateMessage}
          </p>
          
          <div className="max-w-3xl mx-auto w-full px-4">
            {renderInputArea()}
          </div>
        </div>
      ) : (
        /* Active State: Scrollable Messages + Fixed Input at Bottom */
        <>
          {/* Scrollable Messages Area - scrollbar at container edge */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto scrollable-container"
            style={{
              animation: 'fadeIn 300ms ease-in-out',
            }}
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-relevant="additions"
            tabIndex={0}
          >
            {/* Centered content within scrollable area */}
            <div className="max-w-3xl mx-auto px-4 pt-6 pb-4">
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
                
                {/* Streaming AI Response (while AI is responding) - ChatGPT-like animation */}
                {streamingAIResponse && (
                  <div className="flex justify-start" role="listitem">
                    <div 
                      className="max-w-[80%] px-3 py-2"
                      style={{ color: theme.text.high }}
                    >
                      {/* Render markdown progressively as it streams */}
                      <MessageContent content={streamingDisplayText} role="assistant" />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Loading Indicator - hidden once streaming text appears */}
          {isLoading && !streamingAIResponse && (
            <div 
              className="max-w-3xl mx-auto w-full px-4 py-2"
              role="status"
              aria-live="polite"
              aria-label="Generating response"
            >
              <div 
                className="flex items-center gap-2"
                style={{ color: theme.text.medium, fontSize: '14px' }}
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
          
          {/* Input Area - fixed at bottom, centered */}
          <div className="max-w-3xl mx-auto w-full px-4 pb-4">
            {renderInputArea()}
          </div>
        </>
      )}
      
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
