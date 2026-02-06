/**
 * Unified Model Selector Component
 * Dropdown for selecting both LLM and TTS providers with sections
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { getAvailableLLMProviders, type LLMProviderType } from '../services/providers/llm';
import { getOrchestratorInstance } from '../services/llm/orchestrator';
import { useThemeColors } from '../theme';

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

  // Calculate total items for keyboard navigation
  const totalItems = llmProviders.length + (ttsProviders.length > 0 ? ttsProviders.length + 1 : 0); // +1 for divider

  useEffect(() => {
    const loadProviders = async () => {
      const available = getAvailableLLMProviders();
      
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

  // Reset focus index when opening
  useEffect(() => {
    if (isOpen) {
      const currentIndex = llmProviders.findIndex(p => p.type === value);
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen, value, llmProviders]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev => {
            let next = prev + 1;
            // Skip divider index (llmProviders.length)
            if (ttsProviders.length > 0 && next === llmProviders.length) {
              next++;
            }
            return next >= totalItems ? 0 : next;
          });
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => {
            let next = prev - 1;
            // Skip divider index (llmProviders.length)
            if (ttsProviders.length > 0 && next === llmProviders.length) {
              next--;
            }
            return next < 0 ? totalItems - 1 : next;
          });
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0) {
            if (focusedIndex < llmProviders.length) {
              const provider = llmProviders[focusedIndex];
              if (provider?.isConfigured) {
                handleSelectLLM(provider.type);
              }
            } else if (focusedIndex > llmProviders.length) {
              const ttsIndex = focusedIndex - llmProviders.length - 1;
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
  }, [isOpen, focusedIndex, llmProviders, ttsProviders, totalItems]);

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

      {/* Dropdown Menu - Opens Upward */}
      {isOpen && (
        <>
          {/* Backdrop - high z-index to catch clicks */}
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu - Opens upward with solid background and high z-index, no shadow */}
          <div 
            className="absolute bottom-full left-0 mb-1 z-[100] min-w-[180px] rounded-lg overflow-hidden py-1" 
            style={{
              backgroundColor: theme.isLight ? '#ffffff' : '#1f1f1f',
              border: `1px solid ${theme.stroke.low}`,
            }}
            role="listbox"
          >
            {/* Section: Chat Models */}
            {ttsProviders.length > 0 && (
              <div 
                className="px-2 py-1 text-[10px] font-normal"
                style={{ color: theme.text.low }}
              >
                Chat Models
              </div>
            )}
            
            {llmProviders.map((provider, index) => {
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
                      Not configured
                    </span>
                  )}
                </button>
              );
            })}

            {/* Divider and Voice Models Section */}
            {ttsProviders.length > 0 && (
              <>
                {/* Divider */}
                <div 
                  className="my-1 mx-2 border-t"
                  style={{ borderColor: theme.stroke.low }}
                />
                
                {/* Section: Voice Models */}
                <div 
                  className="px-2 py-1 text-[10px] font-normal"
                  style={{ color: theme.text.low }}
                >
                  Voice Models
                </div>
                
                {ttsProviders.map((provider, index) => {
                  const isSelected = provider.type === ttsValue;
                  const globalIndex = llmProviders.length + 1 + index; // +1 for divider
                  const isFocused = globalIndex === focusedIndex;
                  
                  return (
                    <button
                      key={provider.type}
                      onClick={() => provider.isConfigured && handleSelectTTS(provider.type)}
                      onMouseEnter={() => setFocusedIndex(globalIndex)}
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
                          Not configured
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
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
