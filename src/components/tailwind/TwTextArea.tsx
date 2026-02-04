import React from 'react';

export type TextAreaSize = 'S' | 'M' | 'L';

interface TwTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  size?: TextAreaSize;
  isDisabled?: boolean;
}

const sizeClasses: Record<TextAreaSize, string> = {
  S: 'text-sm px-2.5 py-1.5',
  M: 'text-base px-3 py-2',
  L: 'text-lg px-4 py-2.5',
};

/**
 * Tailwind-styled textarea component
 * Matches Jio DS TextArea API but uses Tailwind classes
 */
export const TwTextArea: React.FC<TwTextAreaProps> = ({
  value,
  onChange,
  placeholder = '',
  rows = 3,
  size = 'M',
  isDisabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const sizeClass = sizeClasses[size];
  const baseClasses = 'w-full rounded-lg border-2 resize-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent';
  
  const stateClasses = isDisabled
    ? 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-600'
    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-orange-500 dark:bg-zinc-900 dark:border-zinc-600 dark:text-zinc-50 dark:placeholder-zinc-500 dark:hover:border-zinc-500';

  return (
    <textarea
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      rows={rows}
      disabled={isDisabled}
      className={`${baseClasses} ${sizeClass} ${stateClasses}`}
    />
  );
};

export default TwTextArea;
