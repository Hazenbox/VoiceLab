/**
 * LLM Model Selector Component
 * Dropdown for selecting LLM provider with status indicators
 */

import { useState, useEffect, useMemo } from 'react';
import { getAvailableLLMProviders, type LLMProviderType } from '../services/providers/llm';
import { getOrchestratorInstance } from '../services/llm/orchestrator';

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
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [isOpen, setIsOpen] = useState(false);

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
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 rounded-md border
          bg-white dark:bg-zinc-800
          border-zinc-200 dark:border-zinc-700
          hover:border-orange-400 dark:hover:border-orange-500
          transition-colors
          ${sizeClasses}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
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
        
        <span className="text-zinc-700 dark:text-zinc-200 truncate">
          {selectedProvider?.displayName || 'Select Model'}
        </span>
        
        {/* Dropdown arrow */}
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-0 mt-1 z-20 min-w-[180px] bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 overflow-hidden">
            {providers.map(provider => (
              <button
                key={provider.type}
                onClick={() => provider.isConfigured && handleSelect(provider.type)}
                disabled={!provider.isConfigured}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                  ${provider.type === value
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                    : provider.isConfigured
                      ? 'hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                      : 'text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
                  }
                `}
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
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                    Stream
                  </span>
                )}
                
                {!provider.isConfigured && (
                  <span className="text-[10px] text-zinc-400">Not configured</span>
                )}
              </button>
            ))}
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
