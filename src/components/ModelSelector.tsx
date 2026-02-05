/**
 * LLM Model Selector Component
 * Dropdown for selecting LLM provider with status indicators
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { getAvailableLLMProviders, type LLMProviderType } from '../services/providers/llm';
import { getOrchestratorInstance } from '../services/llm/orchestrator';
import { useThemeColors } from '../theme';

interface ModelSelectorProps {
  value: LLMProviderType;
  onChange: (provider: LLMProviderType) => void;
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

export function ModelSelector({
  value,
  onChange,
  showHealth = false,
  size = 'sm',
  disabled = false,
  className = '',
}: ModelSelectorProps) {
  const theme = useThemeColors();
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProviders = async () => {
      const available = getAvailableLLMProviders();
      
      // Add health status if requested
      if (showHealth) {
        const orchestrator = getOrchestratorInstance();
        const circuitStates = orchestrator.getCircuitStates();
        
        setProviders(
          available.map(p => ({
            ...p,
            isHealthy: circuitStates[p.type]?.state !== 'OPEN',
          }))
        );
      } else {
        setProviders(available.map(p => ({ ...p, isHealthy: undefined })));
      }
    };

    loadProviders();
  }, [showHealth]);

  // Reset focus index when opening
  useEffect(() => {
    if (isOpen) {
      const currentIndex = providers.findIndex(p => p.type === value);
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen, value, providers]);

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
          setFocusedIndex(prev => (prev + 1) % providers.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => (prev - 1 + providers.length) % providers.length);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0 && providers[focusedIndex]?.isConfigured) {
            handleSelect(providers[focusedIndex].type);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, providers]);

  const selectedProvider = useMemo(
    () => providers.find(p => p.type === value),
    [providers, value]
  );

  const handleSelect = (type: LLMProviderType) => {
    onChange(type);
    setIsOpen(false);
  };

  const sizeClasses = size === 'sm' 
    ? 'text-xs py-1 px-2' 
    : 'text-sm py-2 px-3';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-1.5 rounded-md
          transition-colors
          ${sizeClasses}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
        `}
        style={{
          backgroundColor: theme.stroke.low,
          color: theme.text.high,
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Status indicator */}
        {showHealth && selectedProvider && (
          <span
            className={`w-2 h-2 rounded-full ${
              selectedProvider.isHealthy === false
                ? 'bg-red-500'
                : selectedProvider.isConfigured
                  ? 'bg-green-500'
                  : 'bg-zinc-400'
            }`}
          />
        )}
        
        <span className="truncate">
          {selectedProvider?.displayName || 'Select Model'}
        </span>
        
        {/* Dropdown arrow */}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: theme.text.low }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu - Opens Upward */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu - Opens upward */}
          <div 
            className="absolute bottom-full left-0 mb-1 z-20 min-w-[160px] rounded-lg overflow-hidden py-1" 
            style={{
              backgroundColor: theme.background.ghost,
              border: `1px solid ${theme.stroke.medium}`,
            }}
            role="listbox"
          >
            {providers.map((provider, index) => {
              const isSelected = provider.type === value;
              const isFocused = index === focusedIndex;
              
              return (
                <button
                  key={provider.type}
                  onClick={() => provider.isConfigured && handleSelect(provider.type)}
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
                  {/* Health/config indicator */}
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      showHealth && provider.isHealthy === false
                        ? 'bg-red-500'
                        : provider.isConfigured
                          ? 'bg-green-500'
                          : 'bg-zinc-300 dark:bg-zinc-600'
                    }`}
                  />
                  
                  <span className="flex-1 truncate">{provider.displayName}</span>
                  
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
