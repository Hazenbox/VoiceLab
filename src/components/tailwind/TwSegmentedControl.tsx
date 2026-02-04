import React from 'react';

export type SegmentedControlSize = 'S' | 'M' | 'L';

interface TwSegmentedControlItemProps {
  value: string;
  children: React.ReactNode;
}

interface TwSegmentedControlProps {
  value: string;
  onChange: (value: string) => void;
  size?: SegmentedControlSize;
  'aria-label'?: string;
  children: React.ReactElement<TwSegmentedControlItemProps>[];
}

const sizeClasses: Record<SegmentedControlSize, string> = {
  S: 'text-sm px-3 py-1.5',
  M: 'text-base px-4 py-2',
  L: 'text-lg px-5 py-2.5',
};

/**
 * Tailwind-styled segmented control item
 */
export const TwSegmentedControlItem: React.FC<TwSegmentedControlItemProps> = ({
  value,
  children,
}) => {
  // This component is just a placeholder for typing
  // The actual rendering is done by TwSegmentedControl
  return <>{children}</>;
};

/**
 * Tailwind-styled segmented control component
 * Matches Jio DS SegmentedControl API but uses Tailwind classes
 */
export const TwSegmentedControl: React.FC<TwSegmentedControlProps> = ({
  value,
  onChange,
  size = 'M',
  'aria-label': ariaLabel,
  children,
}) => {
  const sizeClass = sizeClasses[size];

  return (
    <div
      className="inline-flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 gap-1"
      role="tablist"
      aria-label={ariaLabel}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const isActive = child.props.value === value;
          return (
            <button
              key={child.props.value}
              onClick={() => onChange(child.props.value)}
              role="tab"
              aria-selected={isActive}
              className={`
                ${sizeClass}
                rounded-md font-medium transition-all duration-200
                ${isActive
                  ? 'bg-white text-orange-500 shadow-sm dark:bg-zinc-700 dark:text-orange-400'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                }
              `}
            >
              {child.props.children}
            </button>
          );
        }
        return child;
      })}
    </div>
  );
};

export default TwSegmentedControl;
