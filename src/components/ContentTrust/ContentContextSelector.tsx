/**
 * ContentContextSelector Component
 * 
 * Ecosystem + Channel dropdowns for content generation context.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useThemeColors } from '../../theme';
import type { EcosystemType, ContentChannelType } from '../../types';
import { getEcosystemOptions, getChannelOptions, getChannelDefaults } from '../../services/guidelines';

interface ContentContextSelectorProps {
  ecosystem: EcosystemType;
  channel: ContentChannelType;
  onEcosystemChange: (ecosystem: EcosystemType) => void;
  onChannelChange: (channel: ContentChannelType) => void;
  showChannelDefaults?: boolean;
  compact?: boolean;
  disabled?: boolean;
}

interface DropdownOption {
  value: string;
  label: string;
  group?: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  label: string;
  disabled?: boolean;
  compact?: boolean;
}

function Dropdown({ value, onChange, options, label, disabled = false, compact = false }: DropdownProps) {
  const theme = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
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
  const groups = options.reduce((acc, option) => {
    const group = option.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(option);
    return acc;
  }, {} as Record<string, DropdownOption[]>);
  
  const selectedOption = options.find(o => o.value === value);
  
  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button - transparent/naked background */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}`}
        style={{ backgroundColor: 'transparent', color: theme.text.medium }}
      >
        <span className="truncate max-w-[100px]">
          {compact ? selectedOption?.label?.split(' ')[0] : selectedOption?.label || label}
        </span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Dropdown menu - opens upwards, white background, high z-index */}
      {isOpen && (
        <div 
          className="absolute z-[100] bottom-full mb-1 min-w-[220px] max-h-[300px] overflow-auto rounded-lg shadow-xl"
          style={{ 
            backgroundColor: theme.isLight ? '#ffffff' : '#1f1f1f',
            border: `1px solid ${theme.stroke.low}`,
          }}
        >
          {Object.entries(groups).map(([group, groupOptions]) => (
            <div key={group}>
              {Object.keys(groups).length > 1 && (
                <div 
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider sticky top-0"
                  style={{ 
                    color: theme.text.low,
                    backgroundColor: theme.isLight ? '#f5f5f5' : '#2a2a2a',
                  }}
                >
                  {group}
                </div>
              )}
              {groupOptions.map(option => (
                <button key={option.value}
                  onClick={() => { onChange(option.value); setIsOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    option.value === value 
                      ? 'bg-orange-500/10' 
                      : theme.isLight ? 'hover:bg-gray-100' : 'hover:bg-white/5'
                  }`}
                  style={{ color: option.value === value ? theme.accent : theme.text.high }}>
                  {option.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  
  // Flatten ecosystem options
  const ecosystemOptions: DropdownOption[] = getEcosystemOptions().map(o => ({
    value: o.value,
    label: o.label,
  }));
  
  // Flatten and group channel options  
  const channelGroups = getChannelOptions();
  const channelOptions: DropdownOption[] = channelGroups.flatMap(g => 
    g.channels.map(c => ({
      value: c.value,
      label: c.label,
      group: g.group,
    }))
  );
  
  const channelDefaults = getChannelDefaults(channel);
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Dropdown
        value={ecosystem}
        onChange={(v) => onEcosystemChange(v as EcosystemType)}
        options={ecosystemOptions}
        label="Ecosystem"
        disabled={disabled}
        compact={compact}
      />
      
      <Dropdown
        value={channel}
        onChange={(v) => onChannelChange(v as ContentChannelType)}
        options={channelOptions}
        label="Channel"
        disabled={disabled}
        compact={compact}
      />
      
      {showChannelDefaults && !compact && (
        <div className="flex items-center gap-2 px-2 py-1 rounded text-[10px]" style={{ color: theme.text.low }}>
          <span title="Warmth level">🔥 {channelDefaults.warmth}</span>
          <span title="Detail level">📝 {channelDefaults.detail}</span>
          <span title="Goal">{channelDefaults.goal}</span>
        </div>
      )}
    </div>
  );
};

export default ContentContextSelector;
