import React, { useState, useRef, useEffect } from 'react';
import { useThemeColors } from '../theme';
import { DSIcon } from './DSIcon';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Custom dropdown select component
 */
export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const theme = useThemeColors();

  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="space-y-1.5" ref={selectRef}>
      <label 
        className="block text-xs font-medium"
        style={{ color: theme.text.medium }}
      >
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full flex items-center justify-between px-2.5 py-1.5 
            rounded-lg text-left text-sm
            transition-colors duration-200
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'focus:outline-none focus:ring-2 focus:ring-orange-500'
            }
          `}
          style={{
            backgroundColor: theme.background.ghost,
            border: `2px solid ${theme.stroke.medium}`,
          }}
        >
          <span style={{ color: theme.text.high }}>
            {selectedOption?.label || 'Select...'}
          </span>
          <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} style={{ color: theme.text.low }}>
            <DSIcon name="IcChevronDown" size="XS" attention="low" />
          </span>
        </button>

        {isOpen && (
          <div 
            className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden shadow-lg"
            style={{
              backgroundColor: theme.background.subtle,
              border: `2px solid ${theme.stroke.medium}`,
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-2.5 py-1.5 text-sm text-left transition-colors duration-150 hover:opacity-80"
                style={{
                  backgroundColor: option.value === value ? (theme.isLight ? '#fff7ed' : '#431407') : 'transparent',
                  color: option.value === value ? (theme.isLight ? '#c2410c' : '#fdba74') : theme.text.high,
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomSelect;
