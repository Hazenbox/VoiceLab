import React, { useState } from 'react';
import { useThemeColors } from '../theme';
import { DSIcon } from './DSIcon';

interface TooltipIconProps {
  tooltip: string;
}

/**
 * TooltipIcon Component
 * 
 * Reusable info icon with hover tooltip for standalone labels.
 * Uses smart width calculation based on content length.
 */
export const TooltipIcon: React.FC<TooltipIconProps> = ({ tooltip }) => {
  const theme = useThemeColors();
  const [showTooltip, setShowTooltip] = useState(false);

  // Smart width calculation based on content length
  const getTooltipWidth = (text: string) => {
    const length = text.length;
    if (length < 40) return '180px';      // Short text
    if (length < 80) return '240px';      // Medium text
    if (length < 120) return '280px';     // Long text
    return '320px';                        // Very long text
  };

  return (
    <div className="relative">
      <div
        className="cursor-help opacity-50"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <DSIcon name="IcInfo" size="XS" attention="medium" aria-label="Information" />
      </div>
      {showTooltip && (
        <div
          className="absolute left-0 top-full mt-1 z-[300] px-2 py-1.5 rounded text-xs whitespace-normal"
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
    </div>
  );
};

export default TooltipIcon;
