/**
 * ContentContextSelector Component
 * 
 * Ecosystem + Channel dropdowns for content generation context.
 * Uses the standardized SearchableDropdown component.
 */

import React from 'react';
import { useThemeColors } from '../../theme';
import type { EcosystemType, ContentChannelType } from '../../types';
import { getEcosystemOptions, getChannelOptions, getChannelDefaults } from '../../services/guidelines';
import { SearchableDropdown } from '../SearchableDropdown';

interface ContentContextSelectorProps {
  ecosystem: EcosystemType;
  channel: ContentChannelType;
  onEcosystemChange: (ecosystem: EcosystemType) => void;
  onChannelChange: (channel: ContentChannelType) => void;
  showChannelDefaults?: boolean;
  compact?: boolean;
  disabled?: boolean;
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
  
  // Prepare ecosystem options for SearchableDropdown
  const ecosystemOptions = getEcosystemOptions().map(o => ({
    value: o.value,
    label: o.label,
  }));
  
  // Prepare channel options with groups for SearchableDropdown
  const channelGroups = getChannelOptions();
  const channelOptions = channelGroups.flatMap(g => 
    g.channels.map(c => ({
      value: c.value,
      label: c.label,
      group: g.group,
    }))
  );
  
  const channelDefaults = getChannelDefaults(channel);
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <SearchableDropdown
        value={ecosystem}
        onChange={(v) => onEcosystemChange(v as EcosystemType)}
        options={ecosystemOptions}
        placeholder="Ecosystem"
        title="Ecosystem"
        disabled={disabled}
        compact={compact}
        direction="up"
      />
      
      <SearchableDropdown
        value={channel}
        onChange={(v) => onChannelChange(v as ContentChannelType)}
        options={channelOptions}
        placeholder="Channel"
        title="Channel"
        disabled={disabled}
        compact={compact}
        direction="up"
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
