import React, { useState, useRef, useEffect } from 'react';
import { DSIcon } from '../DSIcon';

interface Option {
  value: string;
  label: string;
}

interface TwCustomSelectProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Tailwind-styled custom dropdown select component
 */
export const TwCustomSelect: React.FC<TwCustomSelectProps> = ({
  label,
  value,
  options,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

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
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
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
            bg-white border-2 border-zinc-300 text-zinc-900
            dark:bg-zinc-900 dark:border-zinc-600 dark:text-zinc-50
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:border-zinc-400 dark:hover:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500'
            }
          `}
        >
          <span>
            {selectedOption?.label || 'Select...'}
          </span>
          <span className={`transition-transform duration-200 text-zinc-400 dark:text-zinc-500 ${isOpen ? 'rotate-180' : ''}`}>
            <DSIcon name="IcChevronDown" size="XS" attention="low" />
          </span>
        </button>

        {isOpen && (
          <div 
            className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden bg-zinc-50 border-2 border-zinc-300 dark:bg-zinc-800 dark:border-zinc-600"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-2.5 py-1.5 text-sm text-left transition-colors duration-150
                  ${option.value === value
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400'
                    : 'text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-700'
                  }
                `}
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

export default TwCustomSelect;
