/**
 * DelayedTooltip Component
 * 
 * Reusable tooltip that shows after a configurable delay (similar to ChatGPT's ~500ms delay).
 * Uses existing theme system and follows established tooltip patterns from Toggle.tsx/TooltipIcon.tsx.
 * 
 * Features:
 * - Configurable delay before showing (default 500ms)
 * - Immediate hide on mouse leave
 * - Smart width calculation based on content length
 * - Proper cleanup on unmount to prevent memory leaks
 * - Theme-aware colors (dark bg in light mode, light bg in dark mode)
 */

import { useState, useRef, useCallback, useEffect, memo, type ReactNode } from 'react';
import { useThemeColors } from '../theme';

interface DelayedTooltipProps {
  /** Tooltip content */
  content: string;
  /** Delay before showing tooltip in ms (default: 500) */
  delay?: number;
  /** Position relative to trigger */
  position?: 'top' | 'bottom';
  /** Trigger element */
  children: ReactNode;
  /** Whether tooltip is disabled */
  disabled?: boolean;
}

export const DelayedTooltip = memo(function DelayedTooltip({
  content,
  delay = 500,
  position = 'bottom',
  children,
  disabled = false,
}: DelayedTooltipProps) {
  const theme = useThemeColors();
  const [isVisible, setIsVisible] = useState(false);
  // Use ReturnType<typeof setTimeout> for browser compatibility (not NodeJS.Timeout)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // CRITICAL: Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Smart width calculation (from existing TooltipIcon pattern)
  const getTooltipWidth = (text: string) => {
    const length = text.length;
    if (length < 15) return 'auto';
    if (length < 30) return '140px';
    if (length < 60) return '200px';
    return '260px';
  };
  
  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay, disabled]);
  
  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);
  
  // Handle focus for keyboard accessibility
  const handleFocus = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay, disabled]);
  
  const handleBlur = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);
  
  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
      {isVisible && !disabled && (
        <div
          className={`absolute z-50 px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none
            ${position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}
            left-1/2 -translate-x-1/2`}
          style={{
            backgroundColor: theme.isLight ? '#262626' : '#f5f5f5',
            color: theme.isLight ? '#ffffff' : '#000000',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            width: getTooltipWidth(content),
            textAlign: 'center',
          }}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
});

export default DelayedTooltip;
