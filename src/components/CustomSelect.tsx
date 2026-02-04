import React, { useState, useRef, useEffect } from 'react';
import { useThemeColors } from '../theme';

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
            border: `1px solid ${theme.stroke.low}`,
          }}
        >
          <span style={{ color: theme.text.high }}>
            {selectedOption?.label || 'Select...'}
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: theme.text.low }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div 
            className="absolute z-10 w-full mt-1 rounded-lg overflow-hidden"
            style={{
              backgroundColor: theme.background.ghost,
              border: `1px solid ${theme.stroke.low}`,
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
                className="w-full px-2.5 py-1.5 text-sm text-left transition-colors duration-150"
                style={{
                  backgroundColor: option.value === value ? '#fff7ed' : 'transparent',
                  color: option.value === value ? '#c2410c' : theme.text.high,
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
