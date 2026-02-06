/**
 * Unified Model Selector Component
 * Dropdown for selecting both LLM and TTS providers with sections
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { getAvailableLLMProviders, type LLMProviderType } from '../services/providers/llm';
import { getOrchestratorInstance } from '../services/llm/orchestrator';
import { useThemeColors } from '../theme';
import { DropdownSectionHeader } from './DropdownSectionHeader';

export type TTSProviderType = 'dashscope' | 'gemini' | 'elevenlabs';

interface ModelSelectorProps {
  value: LLMProviderType;
  onChange: (provider: LLMProviderType) => void;
  /** TTS provider value (optional - if provided, shows unified view) */
  ttsValue?: TTSProviderType;
  /** TTS provider change handler */
  onTTSChange?: (provider: TTSProviderType) => void;
  showHealth?: boolean;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

interface ProviderStatus {
  type: LLMProviderType;
  displayName: string;
  isConfigured: boolean;
  isHealthy?: boolean;
  supportsStreaming: boolean;
}

interface TTSProvider {
  type: TTSProviderType;
  displayName: string;
  isConfigured: boolean;
}

/**
 * Get available TTS providers with configuration status
 */
function getAvailableTTSProviders(): TTSProvider[] {
  return [
    {
      type: 'dashscope',
      displayName: 'Alibaba DashScope',
      isConfigured: Boolean(import.meta.env.VITE_DASHSCOPE_API_KEY),
    },
    {
      type: 'gemini',
      displayName: 'Google Gemini',
      isConfigured: Boolean(import.meta.env.VITE_GEMINI_API_KEY),
    },
    {
      type: 'elevenlabs',
      displayName: 'ElevenLabs',
      isConfigured: Boolean(import.meta.env.VITE_ELEVENLABS_API_KEY),
    },
  ];
}

export function ModelSelector({
  value,
  onChange,
  ttsValue,
  onTTSChange,
  showHealth = false,
  disabled = false,
  className = '',
}: ModelSelectorProps) {
  const theme = useThemeColors();
  const [llmProviders, setLlmProviders] = useState<ProviderStatus[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get TTS providers (only if unified view is enabled)
  const ttsProviders = useMemo(() => 
    ttsValue !== undefined ? getAvailableTTSProviders() : [],
    [ttsValue]
  );

  // Track which column is focused for horizontal navigation (0 = left/LLM, 1 = right/TTS)
  const [focusedColumn, setFocusedColumn] = useState(0);

  useEffect(() => {
    const loadProviders = async () => {
      // Filter out OpenAI and Claude - only show Qwen, HuggingFace, Gemini, Inworld
      const available = getAvailableLLMProviders()
        .filter(p => p.type !== 'openai' && p.type !== 'claude');
      
      // Add health status if requested
      if (showHealth) {
        const orchestrator = getOrchestratorInstance();
        const circuitStates = orchestrator.getCircuitStates();
        
        setLlmProviders(
          available.map(p => ({
            ...p,
            isHealthy: circuitStates[p.type]?.state !== 'OPEN',
          }))
        );
      } else {
        setLlmProviders(available.map(p => ({ ...p, isHealthy: undefined })));
      }
    };

    loadProviders();
  }, [showHealth]);

  // Reset focus index and column when opening
  useEffect(() => {
    if (isOpen) {
      const currentLLMIndex = llmProviders.findIndex(p => p.type === value);
      if (currentLLMIndex >= 0) {
        setFocusedIndex(currentLLMIndex);
        setFocusedColumn(0);
      } else {
        setFocusedIndex(0);
        setFocusedColumn(0);
      }
    } else {
      setFocusedIndex(-1);
      setFocusedColumn(0);
    }
  }, [isOpen, value, llmProviders]);

  // Keyboard navigation - supports horizontal layout
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (focusedColumn === 0) {
            // Navigate within LLM column
            setFocusedIndex(prev => (prev + 1) % llmProviders.length);
          } else {
            // Navigate within TTS column
            const ttsIndex = focusedIndex - llmProviders.length;
            const nextTTSIndex = (ttsIndex + 1) % ttsProviders.length;
            setFocusedIndex(llmProviders.length + nextTTSIndex);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (focusedColumn === 0) {
            // Navigate within LLM column
            setFocusedIndex(prev => (prev - 1 + llmProviders.length) % llmProviders.length);
          } else {
            // Navigate within TTS column
            const ttsIndex = focusedIndex - llmProviders.length;
            const nextTTSIndex = (ttsIndex - 1 + ttsProviders.length) % ttsProviders.length;
            setFocusedIndex(llmProviders.length + nextTTSIndex);
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (ttsProviders.length > 0 && focusedColumn === 0) {
            // Move to TTS column
            setFocusedColumn(1);
            setFocusedIndex(llmProviders.length); // First TTS item
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (focusedColumn === 1) {
            // Move to LLM column
            setFocusedColumn(0);
            setFocusedIndex(0); // First LLM item
          }
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0) {
            if (focusedColumn === 0 && focusedIndex < llmProviders.length) {
              const provider = llmProviders[focusedIndex];
              if (provider?.isConfigured) {
                handleSelectLLM(provider.type);
              }
            } else if (focusedColumn === 1 && focusedIndex >= llmProviders.length) {
              const ttsIndex = focusedIndex - llmProviders.length;
              const provider = ttsProviders[ttsIndex];
              if (provider?.isConfigured) {
                handleSelectTTS(provider.type);
              }
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, focusedColumn, llmProviders, ttsProviders]);

  const selectedLLMProvider = useMemo(
    () => llmProviders.find(p => p.type === value),
    [llmProviders, value]
  );

  const selectedTTSProvider = useMemo(
    () => ttsProviders.find(p => p.type === ttsValue),
    [ttsProviders, ttsValue]
  );

  const handleSelectLLM = (type: LLMProviderType) => {
    onChange(type);
    setIsOpen(false);
  };

  const handleSelectTTS = (type: TTSProviderType) => {
    onTTSChange?.(type);
    setIsOpen(false);
  };

  // Determine display text - show both if TTS is enabled
  const displayText = useMemo(() => {
    if (ttsValue !== undefined && selectedTTSProvider) {
      return `${selectedLLMProvider?.displayName || 'Model'} / ${selectedTTSProvider?.displayName || 'Voice'}`;
    }
    return selectedLLMProvider?.displayName || 'Select Model';
  }, [selectedLLMProvider, selectedTTSProvider, ttsValue]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button - Standardized 28px pill-shaped style */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          h-[28px] px-3 rounded-full
          flex items-center gap-1.5 text-xs font-normal
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}
        `}
        style={{
          backgroundColor: isOpen ? theme.stroke.low : 'transparent',
          color: theme.text.medium,
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = theme.stroke.low;
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <span className="truncate">
          {displayText}
        </span>
        
        {/* Dropdown arrow */}
        <svg
          className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu - Opens Upward with Horizontal Layout */}
      {isOpen && (
        <>
          {/* Backdrop - high z-index to catch clicks */}
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu - Opens upward with horizontal two-column layout */}
          <div 
            className="absolute bottom-full left-0 mb-1 z-[100] rounded-lg overflow-hidden py-2" 
            style={{
              backgroundColor: theme.isLight ? '#ffffff' : '#1f1f1f',
              border: `1px solid ${theme.stroke.low}`,
              minWidth: ttsProviders.length > 0 ? '340px' : '180px',
            }}
            role="listbox"
          >
            {/* Horizontal Layout: Chat Models | Voice Models */}
            {ttsProviders.length > 0 ? (
              <div className="flex">
                {/* Left Column: Chat Models */}
                <div className="flex-1 min-w-[160px]">
                  <DropdownSectionHeader>
                    Chat Models
                  </DropdownSectionHeader>
                  
                  {llmProviders.map((provider, index) => {
                    const isSelected = provider.type === value;
                    const isFocused = focusedColumn === 0 && focusedIndex === index;
                    
                    return (
                      <button
                        key={provider.type}
                        onClick={() => provider.isConfigured && handleSelectLLM(provider.type)}
                        onMouseEnter={() => { setFocusedIndex(index); setFocusedColumn(0); }}
                        disabled={!provider.isConfigured}
                        className="flex items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors mx-1 rounded-md"
                        style={{
                          width: 'calc(100% - 8px)',
                          backgroundColor: isSelected 
                            ? (theme.isLight ? '#fff7ed' : '#431407')
                            : isFocused && provider.isConfigured
                              ? theme.stroke.low
                              : 'transparent',
                          color: !provider.isConfigured
                            ? theme.text.low
                            : isSelected 
                              ? (theme.isLight ? '#c2410c' : '#fdba74')
                              : theme.text.high,
                          cursor: provider.isConfigured ? 'pointer' : 'not-allowed',
                        }}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="flex-1 truncate">{provider.displayName}</span>
                        
                        {/* Selected checkmark */}
                        {isSelected && (
                          <svg
                            className="w-3.5 h-3.5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        
                        {/* Streaming badge */}
                        {provider.supportsStreaming && provider.isConfigured && (
                          <span 
                            className="text-[10px] px-1 py-0.5 rounded"
                            style={{
                              backgroundColor: theme.isLight ? '#dbeafe' : 'rgba(59, 130, 246, 0.2)',
                              color: theme.isLight ? '#2563eb' : '#93c5fd',
                            }}
                          >
                            Stream
                          </span>
                        )}
                        
                        {!provider.isConfigured && (
                          <span className="text-[10px]" style={{ color: theme.text.low }}>
                            N/A
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Vertical Separator */}
                <div 
                  className="w-px self-stretch my-1"
                  style={{ backgroundColor: theme.stroke.low }}
                />
                
                {/* Right Column: Voice Models */}
                <div className="flex-1 min-w-[160px]">
                  <DropdownSectionHeader>
                    Voice Models
                  </DropdownSectionHeader>
                  
                  {ttsProviders.map((provider, index) => {
                    const isSelected = provider.type === ttsValue;
                    const globalIndex = llmProviders.length + index;
                    const isFocused = focusedColumn === 1 && globalIndex === focusedIndex;
                    
                    return (
                      <button
                        key={provider.type}
                        onClick={() => provider.isConfigured && handleSelectTTS(provider.type)}
                        onMouseEnter={() => { setFocusedIndex(globalIndex); setFocusedColumn(1); }}
                        disabled={!provider.isConfigured}
                        className="flex items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors mx-1 rounded-md"
                        style={{
                          width: 'calc(100% - 8px)',
                          backgroundColor: isSelected 
                            ? (theme.isLight ? '#fff7ed' : '#431407')
                            : isFocused && provider.isConfigured
                              ? theme.stroke.low
                              : 'transparent',
                          color: !provider.isConfigured
                            ? theme.text.low
                            : isSelected 
                              ? (theme.isLight ? '#c2410c' : '#fdba74')
                              : theme.text.high,
                          cursor: provider.isConfigured ? 'pointer' : 'not-allowed',
                        }}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="flex-1 truncate">{provider.displayName}</span>
                        
                        {/* Selected checkmark */}
                        {isSelected && (
                          <svg
                            className="w-3.5 h-3.5 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        
                        {!provider.isConfigured && (
                          <span className="text-[10px]" style={{ color: theme.text.low }}>
                            N/A
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Single column for LLM only (no TTS) */
              llmProviders.map((provider, index) => {
                const isSelected = provider.type === value;
                const isFocused = index === focusedIndex;
                
                return (
                  <button
                    key={provider.type}
                    onClick={() => provider.isConfigured && handleSelectLLM(provider.type)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    disabled={!provider.isConfigured}
                    className="flex items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors mx-1 rounded-md"
                    style={{
                      width: 'calc(100% - 8px)',
                      backgroundColor: isSelected 
                        ? (theme.isLight ? '#fff7ed' : '#431407')
                        : isFocused && provider.isConfigured
                          ? theme.stroke.low
                          : 'transparent',
                      color: !provider.isConfigured
                        ? theme.text.low
                        : isSelected 
                          ? (theme.isLight ? '#c2410c' : '#fdba74')
                          : theme.text.high,
                      cursor: provider.isConfigured ? 'pointer' : 'not-allowed',
                    }}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="flex-1 truncate">{provider.displayName}</span>
                    
                    {isSelected && (
                      <svg
                        className="w-3.5 h-3.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    
                    {provider.supportsStreaming && provider.isConfigured && (
                      <span 
                        className="text-[10px] px-1 py-0.5 rounded"
                        style={{
                          backgroundColor: theme.isLight ? '#dbeafe' : 'rgba(59, 130, 246, 0.2)',
                          color: theme.isLight ? '#2563eb' : '#93c5fd',
                        }}
                      >
                        Stream
                      </span>
                    )}
                    
                    {!provider.isConfigured && (
                      <span className="text-[10px]" style={{ color: theme.text.low }}>
                        Not configured
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Compact inline version for tight spaces
 */
export function ModelSelectorInline({
  value,
  onChange,
  disabled = false,
}: Pick<ModelSelectorProps, 'value' | 'onChange' | 'disabled'>) {
  const providers = useMemo(() => 
    getAvailableLLMProviders().filter(p => p.isConfigured),
    []
  );

  if (providers.length <= 1) {
    return null; // No need for selector with 0-1 options
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as LLMProviderType)}
      disabled={disabled}
      className="text-xs bg-transparent border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-zinc-600 dark:text-zinc-300 focus:outline-none focus:border-orange-400"
    >
      {providers.map(p => (
        <option key={p.type} value={p.type}>
          {p.displayName}
        </option>
      ))}
    </select>
  );
}
