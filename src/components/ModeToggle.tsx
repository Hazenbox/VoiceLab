/**
 * ModeToggle Component
 * 
 * Accessible toggle for switching between "Copy Generation" (text) and "Voice Chat" (audio) modes.
 * 
 * Features:
 * - Full keyboard navigation (arrow keys, Enter, Space)
 * - ARIA roles and states for screen readers
 * - Visual focus indicators
 * - Animated selection indicator
 */

import React, { useCallback, useRef, useEffect, memo } from 'react';
import { useThemeColors } from '../theme/useColors';
import type { ChatMode } from '../types';

// =============================================================================
// Types
// =============================================================================

interface ModeToggleProps {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
  disabled?: boolean;
  className?: string;
}

interface ModeOption {
  value: ChatMode;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
}

// =============================================================================
// Mode Options
// =============================================================================

const modes: ModeOption[] = [
  {
    value: 'copy',
    label: 'Generate Copy',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
    shortcut: '1',
  },
  {
    value: 'voice',
    label: 'Voice Chat',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    ),
    shortcut: '2',
  },
];

// =============================================================================
// Component
// =============================================================================

export const ModeToggle = memo(function ModeToggle({
  mode,
  onChange,
  disabled = false,
  className = '',
}: ModeToggleProps) {
  const theme = useThemeColors();
  const tabRefs = useRef<Map<ChatMode, HTMLButtonElement>>(new Map());
  
  // Find current mode index
  const currentIndex = modes.findIndex(m => m.value === mode);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    let newIndex = currentIndex;
    let handled = false;
    
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        newIndex = currentIndex > 0 ? currentIndex - 1 : modes.length - 1;
        handled = true;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        newIndex = currentIndex < modes.length - 1 ? currentIndex + 1 : 0;
        handled = true;
        break;
      case 'Home':
        newIndex = 0;
        handled = true;
        break;
      case 'End':
        newIndex = modes.length - 1;
        handled = true;
        break;
      case '1':
      case '2':
        newIndex = parseInt(event.key) - 1;
        if (newIndex >= 0 && newIndex < modes.length) {
          handled = true;
        }
        break;
    }
    
    if (handled) {
      event.preventDefault();
      const newMode = modes[newIndex].value;
      onChange(newMode);
      // Focus the new tab
      tabRefs.current.get(newMode)?.focus();
    }
  }, [currentIndex, disabled, onChange]);
  
  // Handle tab click
  const handleTabClick = useCallback((modeValue: ChatMode) => {
    if (disabled || modeValue === mode) return;
    onChange(modeValue);
  }, [disabled, mode, onChange]);
  
  // Focus management - focus active tab when mode changes externally
  useEffect(() => {
    const activeTab = tabRefs.current.get(mode);
    if (activeTab && document.activeElement?.closest('[role="tablist"]') === activeTab.closest('[role="tablist"]')) {
      activeTab.focus();
    }
  }, [mode]);
  
  return (
    <div
      role="tablist"
      aria-label="Chat mode selection"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={`relative inline-flex rounded-lg p-1 ${className}`}
      style={{
        backgroundColor: theme.background.subtle,
      }}
    >
      {/* Animated selection indicator */}
      <div
        className="absolute top-1 bottom-1 rounded-md transition-all duration-200 ease-out"
        style={{
          backgroundColor: theme.background.ghost,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          left: `calc(${currentIndex * 50}% + 4px)`,
          width: 'calc(50% - 8px)',
        }}
        aria-hidden="true"
      />
      
      {modes.map((modeOption) => {
        const isActive = mode === modeOption.value;
        
        return (
          <button
            key={modeOption.value}
            ref={(el) => {
              if (el) {
                tabRefs.current.set(modeOption.value, el);
              } else {
                tabRefs.current.delete(modeOption.value);
              }
            }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${modeOption.value}-panel`}
            tabIndex={isActive ? 0 : -1}
            id={`${modeOption.value}-tab`}
            disabled={disabled}
            onClick={() => handleTabClick(modeOption.value)}
            className={`
              relative z-10 flex items-center gap-2 px-4 py-2 rounded-md
              text-sm font-medium whitespace-nowrap
              transition-colors duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
            style={{
              color: isActive ? theme.text.high : theme.text.medium,
              ...(disabled ? {} : {
                '--tw-ring-color': theme.accent,
              } as React.CSSProperties),
            }}
            aria-label={`${modeOption.label} (Press ${modeOption.shortcut})`}
          >
            <span
              className="flex-shrink-0 transition-colors duration-150"
              style={{
                color: isActive ? theme.accent : 'currentColor',
              }}
            >
              {modeOption.icon}
            </span>
            <span>{modeOption.label}</span>
          </button>
        );
      })}
    </div>
  );
});

// =============================================================================
// Compact Version for Mobile
// =============================================================================

export const ModeToggleCompact = memo(function ModeToggleCompact({
  mode,
  onChange,
  disabled = false,
  className = '',
}: ModeToggleProps) {
  const theme = useThemeColors();
  
  const handleToggle = useCallback(() => {
    if (disabled) return;
    onChange(mode === 'copy' ? 'voice' : 'copy');
  }, [disabled, mode, onChange]);
  
  const currentMode = modes.find(m => m.value === mode)!;
  const otherMode = modes.find(m => m.value !== mode)!;
  
  return (
    <button
      onClick={handleToggle}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        text-sm font-medium
        transition-all duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-90'}
        ${className}
      `}
      style={{
        backgroundColor: theme.background.subtle,
        color: theme.text.high,
        '--tw-ring-color': theme.accent,
      } as React.CSSProperties}
      aria-label={`Current mode: ${currentMode.label}. Click to switch to ${otherMode.label}`}
      aria-pressed={mode === 'voice'}
    >
      <span
        className="flex-shrink-0"
        style={{ color: theme.accent }}
      >
        {currentMode.icon}
      </span>
      <span className="hidden sm:inline">{currentMode.label}</span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-50"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
});

export default ModeToggle;
