/**
 * VersionNavigator Component
 * 
 * Displays version navigation for edited user messages (ChatGPT-style < 2/2 >).
 * Uses callback-based navigation to avoid stale closure issues.
 * 
 * Features:
 * - Chevron buttons for previous/next navigation
 * - Current/total version display (e.g., "2/2")
 * - Disabled state when at boundaries
 * - Keyboard accessible
 */

import { memo, useCallback } from 'react';
import { useThemeColors } from '../theme';
import { DSIcon } from './DSIcon';

interface VersionNavigatorProps {
  /** Current version number (1-indexed) */
  currentVersion: number;
  /** Total number of versions */
  totalVersions: number;
  /** Callback receives the NEW version number to navigate to */
  onVersionChange: (newVersion: number) => void;
  /** Whether navigation is disabled */
  disabled?: boolean;
}

export const VersionNavigator = memo(function VersionNavigator({
  currentVersion,
  totalVersions,
  onVersionChange,
  disabled = false,
}: VersionNavigatorProps) {
  const theme = useThemeColors();
  
  const canGoPrevious = currentVersion > 1;
  const canGoNext = currentVersion < totalVersions;
  
  const handlePrevious = useCallback(() => {
    if (canGoPrevious && !disabled) {
      onVersionChange(currentVersion - 1);
    }
  }, [canGoPrevious, disabled, currentVersion, onVersionChange]);
  
  const handleNext = useCallback(() => {
    if (canGoNext && !disabled) {
      onVersionChange(currentVersion + 1);
    }
  }, [canGoNext, disabled, currentVersion, onVersionChange]);
  
  // Don't render if only one version
  if (totalVersions <= 1) {
    return null;
  }
  
  return (
    <div 
      className="flex items-center gap-0.5"
      style={{ color: theme.text.low }}
      role="navigation"
      aria-label="message version navigation"
    >
      <button
        onClick={handlePrevious}
        disabled={disabled || !canGoPrevious}
        aria-label={`go to version ${currentVersion - 1} of ${totalVersions}`}
        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 
          disabled:opacity-30 disabled:cursor-not-allowed
          focus:outline-none focus:ring-1 focus:ring-orange-500"
      >
        <span style={{ color: theme.text.low }}>
          <DSIcon name="IcChevronLeft" size="S" attention="low" />
        </span>
      </button>
      <span 
        className="text-xs font-medium px-0.5 min-w-[28px] text-center select-none" 
        aria-live="polite"
        aria-atomic="true"
      >
        {currentVersion}/{totalVersions}
      </span>
      <button
        onClick={handleNext}
        disabled={disabled || !canGoNext}
        aria-label={`go to version ${currentVersion + 1} of ${totalVersions}`}
        className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 
          disabled:opacity-30 disabled:cursor-not-allowed
          focus:outline-none focus:ring-1 focus:ring-orange-500"
      >
        <span style={{ color: theme.text.low }}>
          <DSIcon name="IcChevronRight" size="S" attention="low" />
        </span>
      </button>
    </div>
  );
});

export default VersionNavigator;
