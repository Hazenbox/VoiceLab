import React, { useState } from 'react';
import { useThemeColors } from '../theme';

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
        className="cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 16 16" 
          fill="none"
          style={{ opacity: 0.5 }}
        >
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M8 12V8M8 5.5V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
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
