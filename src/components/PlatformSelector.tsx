/**
 * Platform Selector Component
 * Dropdown for selecting content platform (Notifications, Banner, Ads)
 * Opens upward since it's positioned at the bottom of the screen
 */

import { useState, useRef, useEffect, memo } from 'react';
import type { Platform } from '../types';
import { useThemeColors } from '../theme';

interface PlatformSelectorProps {
  value: Platform;
  onChange: (platform: Platform) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

interface PlatformOption {
  value: Platform;
  label: string;
  icon: React.ReactNode;
}

const PLATFORM_OPTIONS: PlatformOption[] = [
  {
    value: 'notifications',
    label: 'Notifications',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    ),
  },
  {
    value: 'banner',
    label: 'Banner',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    value: 'ads',
    label: 'Ads',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    ),
  },
];

export const PlatformSelector = memo(function PlatformSelector({
  value,
  onChange,
  size: _size = 'sm',
  disabled = false,
  className = '',
}: PlatformSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useThemeColors();

  const selectedOption = PLATFORM_OPTIONS.find(opt => opt.value === value);

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
      const currentIndex = PLATFORM_OPTIONS.findIndex(opt => opt.value === value);
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
          setFocusedIndex(prev => (prev + 1) % PLATFORM_OPTIONS.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => (prev - 1 + PLATFORM_OPTIONS.length) % PLATFORM_OPTIONS.length);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0) {
            handleSelect(PLATFORM_OPTIONS[focusedIndex].value);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex]);

  const handleSelect = (platform: Platform) => {
    onChange(platform);
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
        aria-label="Select platform"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">{selectedOption?.label || 'Platform'}</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu - Opens Upward */}
      {isOpen && (
        <div 
          className="absolute bottom-full left-0 mb-1 z-50 min-w-[130px] rounded-lg overflow-hidden py-1"
          style={{
            backgroundColor: theme.background.ghost,
            border: `1px solid ${theme.stroke.medium}`,
          }}
          role="listbox"
          aria-label="Platform options"
        >
          {PLATFORM_OPTIONS.map((option, index) => {
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

export default PlatformSelector;
