/**
 * Dropdown Component
 * 
 * A reusable dropdown/select component with consistent styling.
 * 
 * Features:
 * - Compact design with no shadows
 * - Keyboard navigation (Escape, ArrowUp/Down, Enter)
 * - Opens upward by default
 * - Hover and selected states with margin
 * - Theme-aware styling
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useThemeColors, SELECTION_COLORS } from '../theme';
import { DSIcon } from './DSIcon';

// =============================================================================
// Types
// =============================================================================

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  direction?: 'up' | 'down';
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export const Dropdown = memo(function Dropdown({
  options,
  value,
  onChange,
  size = 'sm',
  direction = 'up',
  disabled = false,
  placeholder = 'Select...',
  className = '',
}: DropdownProps) {
  const theme = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Find current selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Size classes
  const sizeClasses = size === 'sm' 
    ? 'text-xs py-1 px-2' 
    : 'text-sm py-1.5 px-3';

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset focus index when opening/closing
  useEffect(() => {
    if (isOpen) {
      const currentIndex = options.findIndex(opt => opt.value === value);
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen, value, options]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    // const enabledOptions = options.filter(opt => !opt.disabled);

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => {
            const next = prev + 1;
            return next >= options.length ? 0 : next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => {
            const next = prev - 1;
            return next < 0 ? options.length - 1 : next;
          });
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < options.length) {
            const option = options[focusedIndex];
            if (!option.disabled) {
              onChange(option.value);
              setIsOpen(false);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        case 'Tab':
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, options, onChange]);

  // Handle option click
  const handleOptionClick = useCallback((option: DropdownOption) => {
    if (!option.disabled) {
      onChange(option.value);
      setIsOpen(false);
    }
  }, [onChange]);

  // Toggle dropdown
  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          flex items-center gap-1.5 rounded-md transition-colors
          ${sizeClasses}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
        `}
        style={{
          backgroundColor: theme.stroke.low,
          color: theme.text.high,
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedOption?.icon && (
          <span className="flex-shrink-0">{selectedOption.icon}</span>
        )}
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <span className={`flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <DSIcon name="IcChevronDown" size="XS" attention="low" />
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className={`
            absolute z-50 min-w-[120px] rounded-lg overflow-hidden py-1
            ${direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'}
            left-0
          `}
          style={{
            backgroundColor: theme.background.ghost,
            border: `1px solid ${theme.stroke.medium}`,
          }}
          role="listbox"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isFocused = index === focusedIndex;
            
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleOptionClick(option)}
                onMouseEnter={() => setFocusedIndex(index)}
                disabled={option.disabled}
                className={`
                  w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors
                  mx-1 rounded-md
                  ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                style={{
                  width: 'calc(100% - 8px)',
                  backgroundColor: isSelected 
                    ? (theme.isLight ? SELECTION_COLORS.light.background : SELECTION_COLORS.dark.background)
                    : isFocused 
                      ? theme.stroke.low 
                      : 'transparent',
                  color: isSelected 
                    ? (theme.isLight ? SELECTION_COLORS.light.text : SELECTION_COLORS.dark.text)
                    : theme.text.high,
                }}
                role="option"
                aria-selected={isSelected}
              >
                {option.icon && (
                  <span className="flex-shrink-0 w-4 h-4">{option.icon}</span>
                )}
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default Dropdown;
