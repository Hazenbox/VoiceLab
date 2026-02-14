import { useState, useRef, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useThemeColors, SELECTION_COLORS } from '../theme';
import { Label } from '@marcelinodzn/ds-react';
import { DSIcon } from './DSIcon';

// ── Types ────────────────────────────────────────────────────────

export interface ComboboxOption {
  id: string;
  label: string;
  description?: string;
  searchableText: string;
}

interface SearchableComboboxProps {
  label: string;
  placeholder: string;
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string) => void;
}

// ── Component ────────────────────────────────────────────────────

export default function SearchableCombobox({
  label,
  placeholder,
  options,
  value,
  onChange,
}: SearchableComboboxProps) {
  const theme = useThemeColors();
  const sel = theme.isLight ? SELECTION_COLORS.light : SELECTION_COLORS.dark;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(options, {
        keys: ['searchableText'],
        threshold: 0.4, // 0 = exact, 1 = match anything
        ignoreLocation: true,
        minMatchCharLength: 1,
        includeMatches: true,
      }),
    [options]
  );

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return options;
    }
    const results = fuse.search(searchQuery);
    return results.map((result) => result.item);
  }, [searchQuery, fuse, options]);

  // Get selected option label
  const selectedOption = options.find((opt) => opt.id === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'Enter' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  };

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchQuery('');
    inputRef.current?.blur();
  };

  const handleInputClick = () => {
    setIsOpen(true);
    if (!isOpen) {
      inputRef.current?.select();
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', marginBottom: '1rem' }}>
      {/* Label -- DS Label */}
      <div style={{ marginBottom: '0.375rem' }}>
        <Label size="XS" weight="high" attention="high" as="label">
          {label}
        </Label>
      </div>

      {/* Input Field */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : displayValue}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={handleInputClick}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${label}-listbox`}
          aria-activedescendant={
            isOpen && filteredOptions[highlightedIndex]
              ? `option-${filteredOptions[highlightedIndex].id}`
              : undefined
          }
          style={{
            width: '100%',
            padding: '0.625rem 2.5rem 0.625rem 0.75rem',
            borderRadius: '8px',
            border: `1px solid ${theme.stroke.medium}`,
            background: theme.background.subtle,
            color: theme.text.high,
            fontSize: '0.8125rem',
            outline: 'none',
            boxSizing: 'border-box',
            cursor: 'pointer',
          }}
        />

        {/* Chevron Icon */}
        <div
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? '180deg' : '0deg'})`,
            transition: 'transform 0.2s ease',
            pointerEvents: 'none',
            color: theme.text.low,
          }}
        >
          <DSIcon name="IcChevronDown" size="XS" attention="low" />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          id={`${label}-listbox`}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.25rem)',
            left: 0,
            right: 0,
            background: theme.background.ghost,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxHeight: '280px',
            overflowY: 'auto',
            zIndex: 1000,
            border: `1px solid ${theme.stroke.low}`,
          }}
        >
          {filteredOptions.length === 0 ? (
            <div
              style={{
                padding: '0.75rem',
                color: theme.text.low,
                fontSize: '0.8125rem',
                textAlign: 'center',
              }}
            >
              No results found
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={option.id}
                id={`option-${option.id}`}
                role="option"
                aria-selected={value === option.id}
                onClick={() => handleSelect(option.id)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                  background:
                    index === highlightedIndex
                      ? theme.background.bold
                      : value === option.id
                      ? sel.background
                      : 'transparent',
                  borderLeft: value === option.id ? `3px solid ${sel.text}` : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      color: value === option.id ? sel.text : theme.text.high,
                      fontSize: '0.8125rem',
                      fontWeight: value === option.id ? 600 : 400,
                    }}
                  >
                    {option.label}
                  </span>
                  {option.description && (
                    <>
                      <span style={{ color: theme.stroke.medium, fontSize: '0.75rem' }}>•</span>
                      <span
                        style={{
                          color: theme.text.low,
                          fontSize: '0.75rem',
                        }}
                      >
                        {option.description}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Screen reader announcement */}
      {isOpen && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
        >
          {filteredOptions.length} {filteredOptions.length === 1 ? 'result' : 'results'} available
        </div>
      )}
    </div>
  );
}
