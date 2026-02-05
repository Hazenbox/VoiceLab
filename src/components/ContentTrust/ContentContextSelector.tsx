/**
 * ContentContextSelector Component
 * 
 * Ecosystem + Channel dropdowns for content generation context.
 * Displays below the chat input for easy access.
 * 
 * Features:
 * - Ecosystem dropdown (10 business contexts)
 * - Channel dropdown (18 output formats)
 * - Auto-applied channel defaults (warmth, detail, goal)
 * - Compact inline display
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useThemeColors } from '../../theme';
import type { EcosystemType, ContentChannelType } from '../../types';
import { getEcosystemOptions, getChannelOptions, getChannelDefaults } from '../../services/guidelines';

// =============================================================================
// Types
// =============================================================================

interface ContentContextSelectorProps {
  /** Current ecosystem */
  ecosystem: EcosystemType;
  /** Current channel */
  channel: ContentChannelType;
  /** Callback when ecosystem changes */
  onEcosystemChange: (ecosystem: EcosystemType) => void;
  /** Callback when channel changes */
  onChannelChange: (channel: ContentChannelType) => void;
  /** Whether to show channel defaults in dropdown */
  showChannelDefaults?: boolean;
  /** Compact mode for small spaces */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

// =============================================================================
// Dropdown Component
// =============================================================================

interface DropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<{
    value: T;
    label: string;
    description?: string;
    group?: string;
  }>;
  label: string;
  disabled?: boolean;
  compact?: boolean;
}

function Dropdown<T extends string>({
  value,
  onChange,
  options,
  label,
  disabled = false,
  compact = false,
}: DropdownProps<T>) {
  const theme = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Group options
  const groupedOptions = options.reduce((acc, option) => {
    const group = option.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(option);
    return acc;
  }, {} as Record<string, typeof options>);
  
  const selectedOption = options.find(o => o.value === value);
  
  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
          transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}
        `}
        style={{
          backgroundColor: theme.stroke.low,
          color: theme.text.medium,
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
      >
        <span className="truncate max-w-[100px]">
          {compact ? selectedOption?.label?.split(' ')[0] : selectedOption?.label || label}
        </span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 min-w-[220px] max-h-[300px] overflow-auto rounded-lg shadow-lg"
          style={{
            backgroundColor: theme.background.ghost,
            border: `1px solid ${theme.stroke.low}`,
          }}
          role="listbox"
        >
          {Object.entries(groupedOptions).map(([group, groupOptions]) => (
            <div key={group}>
              {/* Group header */}
              {Object.keys(groupedOptions).length > 1 && (
                <div
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: theme.text.low }}
                >
                  {group}
                </div>
              )}
              
              {/* Options */}
              {groupOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full text-left px-3 py-2 text-sm transition-colors
                    ${option.value === value ? 'bg-orange-500/10' : 'hover:bg-white/5'}
                  `}
                  style={{
                    color: option.value === value ? theme.accent : theme.text.high,
                  }}
                  role="option"
                  aria-selected={option.value === value}
                >
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div
                      className="text-xs mt-0.5 line-clamp-1"
                      style={{ color: theme.text.low }}
                    >
                      {option.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export const ContentContextSelector: React.FC<ContentContextSelectorProps> = ({
  ecosystem,
  channel,
  onEcosystemChange,
  onChannelChange,
  showChannelDefaults = true,
  compact = false,
  disabled = false,
}) => {
  const theme = useThemeColors();
  const ecosystemOptions = getEcosystemOptions();
  const channelOptions = getChannelOptions();
  
  // Get current channel defaults for display
  const channelDefaults = getChannelDefaults(channel);
  
  // Handle channel change with defaults notification
  const handleChannelChange = useCallback((newChannel: ContentChannelType) => {
    onChannelChange(newChannel);
  }, [onChannelChange]);
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Ecosystem dropdown */}
      <Dropdown
        value={ecosystem}
        onChange={onEcosystemChange}
        options={ecosystemOptions}
        label="Ecosystem"
        disabled={disabled}
        compact={compact}
      />
      
      {/* Channel dropdown */}
      <Dropdown
        value={channel}
        onChange={handleChannelChange}
        options={channelOptions}
        label="Channel"
        disabled={disabled}
        compact={compact}
      />
      
      {/* Channel defaults indicator (optional) */}
      {showChannelDefaults && !compact && (
        <div
          className="flex items-center gap-2 px-2 py-1 rounded text-[10px]"
          style={{ color: theme.text.low }}
        >
          <span title="Warmth level">🔥 {channelDefaults.warmth}</span>
          <span title="Detail level">📝 {channelDefaults.detail}</span>
          <span title="Goal">{channelDefaults.goal}</span>
        </div>
      )}
    </div>
  );
};

export default ContentContextSelector;
