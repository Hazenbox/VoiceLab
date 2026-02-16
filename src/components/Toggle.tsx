import React from 'react';
import { useThemeColors } from '../theme';
import { Switch, Label } from '@marcelinodzn/ds-react';
import { DSIcon } from './DSIcon';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  tooltip?: string;
}

/**
 * Toggle switch component for boolean settings.
 * 
 * DS Migration:
 * - Switch control: DS Switch component
 * - Label: DS Label component
 * - Tooltip: custom (DS Tooltip not yet available in package)
 */
export const Toggle: React.FC<ToggleProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  tooltip,
}) => {
  const theme = useThemeColors();
  const [showTooltip, setShowTooltip] = React.useState(false);

  // Smart width calculation based on content length
  const getTooltipWidth = (text: string) => {
    const length = text.length;
    if (length < 40) return '180px';
    if (length < 80) return '240px';
    if (length < 120) return '280px';
    return '320px';
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 relative">
        <Label size="XS" weight="medium" attention="high" as="label">
          {label}
        </Label>
        {tooltip && (
          <>
            <div
              className="cursor-help flex items-center"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <DSIcon name="IcInfo" size="XS" attention="medium" />
            </div>
            {showTooltip && (
              <div
                className="absolute left-0 top-full mt-1 z-50 px-2 py-1.5 rounded text-xs whitespace-normal"
                style={{
                  backgroundColor: theme.isLight ? '#262626' : '#f5f5f5',
                  color: theme.isLight ? '#ffffff' : '#000000',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  width: getTooltipWidth(tooltip),
                  maxWidth: '95vw',
                }}
              >
                {tooltip}
              </div>
            )}
          </>
        )}
      </div>
      <Switch
        isSelected={checked}
        onChange={onChange}
        isDisabled={disabled}
        size="S"
      />
    </div>
  );
};

export default Toggle;
