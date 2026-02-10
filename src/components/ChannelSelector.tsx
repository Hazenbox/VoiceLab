/**
 * Channel Selector Component
 * Dropdown for selecting communication channel (SMS, WhatsApp, Email)
 * Opens upward since it's positioned at the bottom of the screen
 */

import { useState, useRef, useEffect, memo } from 'react';
import type { Channel } from '../types';
import { useThemeColors } from '../theme';
import { DSIcon } from './DSIcon';

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
    icon: <DSIcon name="IcChat" size="XS" attention="medium" />,
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    icon: <DSIcon name="IcWhatsapp" size="XS" attention="medium" />,
  },
  {
    value: 'email',
    label: 'Email',
    icon: <DSIcon name="IcMail" size="XS" attention="medium" />,
  },
];

export const ChannelSelector = memo(function ChannelSelector({
  value,
  onChange,
  size: _size = 'sm',
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

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button - Naked style (transparent bg, text + chevron only) */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-1 text-xs
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-70'}
        `}
        style={{
          color: theme.text.medium,
        }}
        aria-label="Select channel"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">{selectedOption?.label || 'Channel'}</span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <DSIcon name="IcChevronDown" size="XS" attention="medium" />
        </span>
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
