/**
 * SearchableDropdown Component
 * 
 * A standardized, reusable dropdown with:
 * - Transparent trigger button (naked style)
 * - Opens upwards with solid white/dark background
 * - High z-index (z-[100]) to prevent overlaps
 * - Compact search input (auto-enabled when >5 options)
 * - Keyboard navigation (ArrowUp/Down, Enter, Escape)
 * - Grouped options support
 * - Icon support for options
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useThemeColors } from '../theme';

// =============================================================================
// Types
// =============================================================================

export interface SearchableDropdownOption {
  value: string;
  label: string;
  group?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SearchableDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableDropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  showSearch?: boolean; // auto-enabled when options > 5
  compact?: boolean;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export const SearchableDropdown = memo(function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  showSearch,
  compact = false,
  className = '',
}: SearchableDropdownProps) {
  const theme = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-enable search when more than 5 options
  const shouldShowSearch = showSearch ?? options.length > 5;

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      opt => opt.label.toLowerCase().includes(query) || 
             opt.value.toLowerCase().includes(query) ||
             (opt.group?.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  // Group filtered options
  const groupedOptions = useMemo(() => {
    const groups: Record<string, SearchableDropdownOption[]> = {};
    filteredOptions.forEach(opt => {
      const group = opt.group || '';
      if (!groups[group]) groups[group] = [];
      groups[group].push(opt);
    });
    return groups;
  }, [filteredOptions]);

  // Flat list for keyboard navigation
  const flatOptions = useMemo(() => filteredOptions, [filteredOptions]);

  // Find selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && shouldShowSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (isOpen) {
      // Set initial focused index to selected option
      const selectedIndex = flatOptions.findIndex(opt => opt.value === value);
      setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    } else {
      setFocusedIndex(-1);
      setSearchQuery('');
    }
  }, [isOpen, shouldShowSearch, value, flatOptions]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => {
            const next = prev + 1;
            return next >= flatOptions.length ? 0 : next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => {
            const next = prev - 1;
            return next < 0 ? flatOptions.length - 1 : next;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < flatOptions.length) {
            const option = flatOptions[focusedIndex];
            if (!option.disabled) {
              handleSelect(option.value);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          break;
        case 'Tab':
          setIsOpen(false);
          setSearchQuery('');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, flatOptions]);

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && menuRef.current) {
      const focusedElement = menuRef.current.querySelector(`[data-index="${focusedIndex}"]`);
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange]);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);

  // Get display text
  const displayText = compact 
    ? (selectedOption?.label?.split(' ')[0] || placeholder)
    : (selectedOption?.label || placeholder);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button - Naked/Transparent style */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}
        `}
        style={{ 
          backgroundColor: 'transparent', 
          color: theme.text.medium 
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedOption?.icon && (
          <span className="flex-shrink-0 w-4 h-4">{selectedOption.icon}</span>
        )}
        <span className="truncate max-w-[120px]">{displayText}</span>
        <svg
          className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu - Opens upward with solid background */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery('');
            }}
          />

          {/* Menu */}
          <div
            ref={menuRef}
            className="absolute z-[100] bottom-full mb-1 left-0 min-w-[200px] max-h-[320px] rounded-lg shadow-xl overflow-hidden flex flex-col"
            style={{
              backgroundColor: theme.isLight ? '#ffffff' : '#1f1f1f',
              border: `1px solid ${theme.stroke.low}`,
            }}
            role="listbox"
          >
            {/* Search Input */}
            {shouldShowSearch && (
              <div 
                className="p-2 border-b"
                style={{ borderColor: theme.stroke.low }}
              >
                <div className="relative">
                  <svg
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                    fill="none"
                    stroke={theme.text.low}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setFocusedIndex(0);
                    }}
                    placeholder="Search..."
                    className="w-full pl-7 pr-2 py-1.5 text-xs rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                    style={{
                      backgroundColor: theme.isLight ? '#f5f5f5' : '#2a2a2a',
                      color: theme.text.high,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {searchQuery && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/10"
                      style={{ color: theme.text.low }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto flex-1 py-1">
              {filteredOptions.length === 0 ? (
                <div 
                  className="px-3 py-4 text-xs text-center"
                  style={{ color: theme.text.low }}
                >
                  No results found
                </div>
              ) : (
                Object.entries(groupedOptions).map(([group, groupOpts]) => (
                  <div key={group || '__ungrouped__'}>
                    {/* Group Header */}
                    {group && Object.keys(groupedOptions).length > 1 && (
                      <div
                        className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider sticky top-0"
                        style={{
                          color: theme.text.low,
                          backgroundColor: theme.isLight ? '#f5f5f5' : '#2a2a2a',
                        }}
                      >
                        {group}
                      </div>
                    )}

                    {/* Group Options */}
                    {groupOpts.map((option) => {
                      const globalIndex = flatOptions.findIndex(o => o.value === option.value);
                      const isSelected = option.value === value;
                      const isFocused = globalIndex === focusedIndex;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          data-index={globalIndex}
                          onClick={() => !option.disabled && handleSelect(option.value)}
                          onMouseEnter={() => setFocusedIndex(globalIndex)}
                          disabled={option.disabled}
                          className={`
                            w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors
                            ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                          style={{
                            backgroundColor: isSelected
                              ? (theme.isLight ? '#fff7ed' : '#431407')
                              : isFocused && !option.disabled
                                ? (theme.isLight ? '#f5f5f5' : '#2a2a2a')
                                : 'transparent',
                            color: isSelected
                              ? (theme.isLight ? '#c2410c' : '#fdba74')
                              : theme.text.high,
                          }}
                          role="option"
                          aria-selected={isSelected}
                        >
                          {option.icon && (
                            <span className="flex-shrink-0 w-4 h-4">{option.icon}</span>
                          )}
                          <span className="flex-1 truncate">{option.label}</span>
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
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default SearchableDropdown;
