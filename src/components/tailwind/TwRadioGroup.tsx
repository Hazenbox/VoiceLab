import React from 'react';

export type RadioOrientation = 'horizontal' | 'vertical';
export type RadioSize = 'S' | 'M' | 'L';
export type RadioAppearance = 'primary' | 'secondary';

interface TwRadioProps {
  value: string;
  label: string;
  checked: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: RadioSize;
  appearance?: RadioAppearance;
}

interface TwRadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  orientation?: RadioOrientation;
  size?: RadioSize;
  appearance?: RadioAppearance;
  isDisabled?: boolean;
  children: React.ReactElement<TwRadioProps>[];
}

const sizeClasses: Record<RadioSize, { radio: string; label: string }> = {
  S: { radio: 'w-4 h-4', label: 'text-sm' },
  M: { radio: 'w-5 h-5', label: 'text-base' },
  L: { radio: 'w-6 h-6', label: 'text-lg' },
};

/**
 * Tailwind-styled radio button
 */
export const TwRadio: React.FC<TwRadioProps> = ({
  value,
  label,
  checked,
  onChange,
  disabled = false,
  size = 'M',
  appearance = 'secondary',
}) => {
  const handleChange = () => {
    if (!disabled) {
      onChange(value);
    }
  };

  const { radio: radioSize, label: labelSize } = sizeClasses[size];

  // Appearance colors
  const accentColor = appearance === 'secondary' ? 'orange-500' : 'blue-500';

  return (
    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input
        type="radio"
        value={value}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
      />
      <div className={`${radioSize} rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
        checked
          ? `border-${accentColor} bg-${accentColor}`
          : 'border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900'
      } ${!disabled && !checked ? 'hover:border-zinc-400 dark:hover:border-zinc-500' : ''}`}
        style={{
          borderColor: checked ? (appearance === 'secondary' ? '#f97316' : '#3b82f6') : undefined,
          backgroundColor: checked ? (appearance === 'secondary' ? '#f97316' : '#3b82f6') : undefined,
        }}
      >
        {checked && (
          <div className={`rounded-full bg-white ${size === 'S' ? 'w-1.5 h-1.5' : size === 'M' ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} />
        )}
      </div>
      <span className={`${labelSize} text-zinc-900 dark:text-zinc-50 select-none`}>
        {label}
      </span>
    </label>
  );
};

/**
 * Tailwind-styled radio group component
 * Matches Jio DS RadioGroup API but uses Tailwind classes
 */
export const TwRadioGroup: React.FC<TwRadioGroupProps> = ({
  name,
  value,
  onChange,
  orientation = 'vertical',
  size = 'M',
  appearance = 'secondary',
  isDisabled = false,
  children,
}) => {
  const containerClasses = orientation === 'horizontal' ? 'flex gap-4' : 'flex flex-col gap-2';

  return (
    <div className={containerClasses} role="radiogroup" aria-label={name}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            checked: child.props.value === value,
            onChange,
            disabled: isDisabled || child.props.disabled,
            size,
            appearance,
          } as Partial<TwRadioProps>);
        }
        return child;
      })}
    </div>
  );
};

export default TwRadioGroup;
