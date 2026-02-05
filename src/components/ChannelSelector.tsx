/**
 * Channel Selector Component
 * Dropdown for selecting communication channel (SMS, WhatsApp, Email)
 * Opens upward since it's positioned at the bottom of the screen
 */

import { useState, useRef, useEffect, memo } from 'react';
import type { Channel } from '../types';
import { useThemeColors } from '../theme';

interface ChannelSelectorProps {
  value: Channel;
  onChange: (channel: Channel) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

interface ChannelOption {
  value: Channel;
  label: string;
  icon: React.ReactNode;
}

const CHANNEL_OPTIONS: ChannelOption[] = [
  {
    value: 'sms',
    label: 'SMS',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    value: 'email',
    label: 'Email',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
];

export const ChannelSelector = memo(function ChannelSelector({
  value,
  onChange,
  size = 'sm',
  disabled = false,
  className = '',
}: ChannelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useThemeColors();

  const selectedOption = CHANNEL_OPTIONS.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset focus index and handle keyboard navigation
  useEffect(() => {
    if (isOpen) {
      const currentIndex = CHANNEL_OPTIONS.findIndex(opt => opt.value === value);
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen, value]);

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
          setFocusedIndex(prev => (prev + 1) % CHANNEL_OPTIONS.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => (prev - 1 + CHANNEL_OPTIONS.length) % CHANNEL_OPTIONS.length);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0) {
            handleSelect(CHANNEL_OPTIONS[focusedIndex].value);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex]);

  const handleSelect = (channel: Channel) => {
    onChange(channel);
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
        aria-label="Select channel"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="flex-shrink-0" style={{ color: theme.text.medium }}>
          {selectedOption?.icon}
        </span>
        <span className="truncate">{selectedOption?.label || 'Channel'}</span>
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
        <div 
          className="absolute bottom-full left-0 mb-1 z-50 min-w-[120px] rounded-lg overflow-hidden py-1"
          style={{
            backgroundColor: theme.background.ghost,
            border: `1px solid ${theme.stroke.medium}`,
          }}
          role="listbox"
          aria-label="Channel options"
        >
          {CHANNEL_OPTIONS.map((option, index) => {
            const isSelected = option.value === value;
            const isFocused = index === focusedIndex;
            
            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setFocusedIndex(index)}
                className="flex items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors mx-1 rounded-md"
                style={{
                  width: 'calc(100% - 8px)',
                  backgroundColor: isSelected 
                    ? (theme.isLight ? '#fff7ed' : '#431407')
                    : isFocused
                      ? theme.stroke.low
                      : 'transparent',
                  color: isSelected 
                    ? (theme.isLight ? '#c2410c' : '#fdba74') 
                    : theme.text.high,
                }}
                role="option"
                aria-selected={isSelected}
              >
                <span className="flex-shrink-0">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default ChannelSelector;
