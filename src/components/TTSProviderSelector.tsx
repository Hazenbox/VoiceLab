/**
 * TTS Provider Selector Component
 * Dropdown for selecting TTS service with status indicators
 */

import { useState, useMemo } from 'react';
import { DSIcon } from './DSIcon';

export type TTSProviderType = 'dashscope' | 'gemini' | 'elevenlabs';

interface TTSProvider {
  type: TTSProviderType;
  displayName: string;
  isConfigured: boolean;
}

interface TTSProviderSelectorProps {
  value: TTSProviderType;
  onChange: (provider: TTSProviderType) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
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

export function TTSProviderSelector({
  value,
  onChange,
  size = 'sm',
  disabled = false,
  className = '',
}: TTSProviderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const providers = useMemo(() => getAvailableTTSProviders(), []);

  const selectedProvider = useMemo(
    () => providers.find(p => p.type === value),
    [providers, value]
  );

  const handleSelect = (type: TTSProviderType) => {
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
        <span
          className={`w-2 h-2 rounded-full ${
            selectedProvider?.isConfigured ? 'bg-green-500' : 'bg-zinc-400'
          }`}
        />
        
        <span className="text-zinc-700 dark:text-zinc-200 truncate">
          {selectedProvider?.displayName || 'Select TTS'}
        </span>
        
        {/* Voice icon */}
        <span className="text-zinc-400">
          <DSIcon name="IcVolumeUp" size="XS" attention="low" />
        </span>
        
        {/* Dropdown arrow */}
        <span className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <DSIcon name="IcChevronDown" size="XS" attention="low" />
        </span>
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
                {/* Config indicator */}
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    provider.isConfigured
                      ? 'bg-green-500'
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                />
                
                <span className="flex-1 truncate">{provider.displayName}</span>
                
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
 * Compact inline version
 */
export function TTSProviderSelectorInline({
  value,
  onChange,
  disabled = false,
}: Pick<TTSProviderSelectorProps, 'value' | 'onChange' | 'disabled'>) {
  const providers = useMemo(() => 
    getAvailableTTSProviders().filter(p => p.isConfigured),
    []
  );

  if (providers.length <= 1) {
    return null;
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as TTSProviderType)}
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

/**
 * Get configured TTS providers
 */
export function getConfiguredTTSProviders(): TTSProvider[] {
  return getAvailableTTSProviders().filter(p => p.isConfigured);
}

/**
 * Get default TTS provider
 */
export function getDefaultTTSProviderType(): TTSProviderType {
  const configured = getConfiguredTTSProviders();
  return configured[0]?.type || 'dashscope';
}
