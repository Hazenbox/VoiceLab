import React from 'react';

export type ButtonAppearance = 'primary' | 'secondary';
export type ButtonSize = 'S' | 'M' | 'L';

interface TwButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  onClick?: () => void;
  isDisabled?: boolean;
  appearance?: ButtonAppearance;
  size?: ButtonSize;
  'aria-label'?: string;
}

const sizeClasses: Record<ButtonSize, string> = {
  S: 'px-3 py-1.5 text-sm',
  M: 'px-4 py-2 text-base',
  L: 'px-5 py-2.5 text-lg',
};

/**
 * Tailwind-styled button component
 * Matches Jio DS Button API but uses Tailwind classes
 */
export const TwButton: React.FC<TwButtonProps> = ({
  children,
  onPress,
  onClick,
  isDisabled = false,
  appearance = 'primary',
  size = 'M',
  'aria-label': ariaLabel,
}) => {
  const handleClick = () => {
    if (!isDisabled) {
      onPress?.();
      onClick?.();
    }
  };

  const baseClasses = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2';
  const sizeClass = sizeClasses[size];

  let appearanceClasses = '';
  if (appearance === 'primary') {
    appearanceClasses = isDisabled
      ? 'bg-orange-300 text-white cursor-not-allowed dark:bg-orange-800'
      : 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 cursor-pointer dark:bg-orange-600 dark:hover:bg-orange-700';
  } else {
    appearanceClasses = isDisabled
      ? 'bg-transparent border-2 border-zinc-200 text-zinc-400 cursor-not-allowed dark:border-zinc-700 dark:text-zinc-600'
      : 'bg-transparent border-2 border-zinc-300 text-zinc-700 hover:border-orange-500 hover:text-orange-500 active:bg-orange-50 cursor-pointer dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-orange-500 dark:hover:text-orange-500 dark:active:bg-zinc-800';
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      className={`${baseClasses} ${sizeClass} ${appearanceClasses}`}
    >
      {children}
    </button>
  );
};

export default TwButton;
