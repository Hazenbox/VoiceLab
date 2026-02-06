/**
 * Icon Browser Component
 * 
 * Displays and searches through available icons in the design system
 */

import React, { useState, useMemo } from 'react';
import { useThemeColors } from '../../theme';
import { COMMON_ICONS } from '../../data/designSystemData';

interface IconBrowserProps {
  onSelectIcon?: (iconName: string) => void;
}

/**
 * Browse and search icons from the design system
 */
export const IconBrowser: React.FC<IconBrowserProps> = ({ onSelectIcon }) => {
  const theme = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIcon, setCopiedIcon] = useState<string | null>(null);

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) return COMMON_ICONS;
    const query = searchQuery.toLowerCase();
    return COMMON_ICONS.filter(icon => 
      icon.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group icons by category
  const iconGroups = useMemo(() => {
    const groups: Record<string, string[]> = {
      'Navigation': [],
      'Actions': [],
      'User & Account': [],
      'Communication': [],
      'Media': [],
      'Status': [],
      'Objects': [],
      'Finance': [],
    };

    filteredIcons.forEach(icon => {
      const name = icon.toLowerCase();
      if (name.includes('arrow') || name.includes('chevron') || name.includes('home') || name.includes('search') || name.includes('menu')) {
        groups['Navigation'].push(icon);
      } else if (name.includes('plus') || name.includes('minus') || name.includes('close') || name.includes('check') || name.includes('edit') || name.includes('delete') || name.includes('refresh') || name.includes('download') || name.includes('upload') || name.includes('share') || name.includes('copy') || name.includes('save')) {
        groups['Actions'].push(icon);
      } else if (name.includes('user') || name.includes('settings') || name.includes('profile') || name.includes('logout') || name.includes('login')) {
        groups['User & Account'].push(icon);
      } else if (name.includes('mail') || name.includes('phone') || name.includes('chat') || name.includes('notification') || name.includes('bell')) {
        groups['Communication'].push(icon);
      } else if (name.includes('play') || name.includes('pause') || name.includes('stop') || name.includes('microphone') || name.includes('speaker') || name.includes('volume') || name.includes('camera') || name.includes('image') || name.includes('video')) {
        groups['Media'].push(icon);
      } else if (name.includes('info') || name.includes('warning') || name.includes('error') || name.includes('success') || name.includes('question')) {
        groups['Status'].push(icon);
      } else if (name.includes('calendar') || name.includes('clock') || name.includes('location') || name.includes('star') || name.includes('heart') || name.includes('bookmark') || name.includes('document') || name.includes('folder') || name.includes('link') || name.includes('lock')) {
        groups['Objects'].push(icon);
      } else if (name.includes('wallet') || name.includes('card') || name.includes('money') || name.includes('currency') || name.includes('bank')) {
        groups['Finance'].push(icon);
      }
    });

    // Filter out empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([, icons]) => icons.length > 0)
    );
  }, [filteredIcons]);

  const handleCopyIcon = (iconName: string) => {
    const importCode = `import { Icon } from '@marcelinodzn/ds-react';\n\n<Icon name="${iconName}" size="M" />`;
    navigator.clipboard.writeText(importCode);
    setCopiedIcon(iconName);
    setTimeout(() => setCopiedIcon(null), 2000);
    onSelectIcon?.(iconName);
  };

  // Emoji mapping for visual representation (since actual icons need the Icon component)
  const getIconEmoji = (name: string): string => {
    const emojiMap: Record<string, string> = {
      'IcHome': '🏠',
      'IcSearch': '🔍',
      'IcMenu': '☰',
      'IcArrowLeft': '←',
      'IcArrowRight': '→',
      'IcArrowUp': '↑',
      'IcArrowDown': '↓',
      'IcChevronLeft': '‹',
      'IcChevronRight': '›',
      'IcChevronUp': '⌃',
      'IcChevronDown': '⌄',
      'IcPlus': '+',
      'IcMinus': '−',
      'IcClose': '✕',
      'IcCheck': '✓',
      'IcEdit': '✏️',
      'IcDelete': '🗑️',
      'IcRefresh': '↻',
      'IcDownload': '⬇️',
      'IcUpload': '⬆️',
      'IcShare': '↗️',
      'IcCopy': '📋',
      'IcSave': '💾',
      'IcUser': '👤',
      'IcUsers': '👥',
      'IcSettings': '⚙️',
      'IcProfile': '👤',
      'IcLogout': '🚪',
      'IcLogin': '🔐',
      'IcMail': '✉️',
      'IcPhone': '📱',
      'IcChat': '💬',
      'IcNotification': '🔔',
      'IcBell': '🔔',
      'IcPlay': '▶️',
      'IcPause': '⏸️',
      'IcStop': '⏹️',
      'IcMicrophone': '🎤',
      'IcSpeaker': '🔊',
      'IcVolume': '🔉',
      'IcCamera': '📷',
      'IcImage': '🖼️',
      'IcVideo': '🎥',
      'IcInfo': 'ℹ️',
      'IcWarning': '⚠️',
      'IcError': '❌',
      'IcSuccess': '✅',
      'IcQuestion': '❓',
      'IcCalendar': '📅',
      'IcClock': '🕐',
      'IcLocation': '📍',
      'IcStar': '⭐',
      'IcHeart': '❤️',
      'IcBookmark': '🔖',
      'IcDocument': '📄',
      'IcFolder': '📁',
      'IcLink': '🔗',
      'IcLock': '🔒',
      'IcUnlock': '🔓',
      'IcWallet': '👛',
      'IcCard': '💳',
      'IcMoney': '💰',
      'IcCurrency': '💲',
      'IcBank': '🏦',
    };
    return emojiMap[name] || '📦';
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: theme.text.low }}
        >
          🔍
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search icons..."
          className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: theme.background.ghost,
            border: `1px solid ${theme.stroke.medium}`,
            color: theme.text.high,
          }}
        />
      </div>

      {/* Results count */}
      <p className="text-sm" style={{ color: theme.text.low }}>
        {filteredIcons.length} icons found
      </p>

      {/* Icon grid by category */}
      {Object.keys(iconGroups).length > 0 ? (
        Object.entries(iconGroups).map(([category, icons]) => (
          <div key={category}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text.high }}>
              {category}
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {icons.map((icon) => (
                <button
                  key={icon}
                  onClick={() => handleCopyIcon(icon)}
                  className="flex flex-col items-center p-3 rounded-lg transition-colors group"
                  style={{
                    backgroundColor: copiedIcon === icon ? theme.accent : theme.background.ghost,
                    border: `1px solid ${theme.stroke.low}`,
                  }}
                  title={`Click to copy: ${icon}`}
                >
                  <span className="text-2xl mb-1">{getIconEmoji(icon)}</span>
                  <span 
                    className="text-xs truncate w-full text-center"
                    style={{ 
                      color: copiedIcon === icon ? '#fff' : theme.text.medium,
                    }}
                  >
                    {copiedIcon === icon ? 'Copied!' : icon.replace('Ic', '')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8" style={{ color: theme.text.low }}>
          No icons found matching "{searchQuery}"
        </div>
      )}

      {/* Usage info */}
      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: theme.background.subtle,
          border: `1px solid ${theme.stroke.low}`,
        }}
      >
        <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text.high }}>
          Usage
        </h4>
        <code
          className="block text-xs p-3 rounded overflow-x-auto scrollable-container"
          style={{
            backgroundColor: theme.background.ghost,
            color: theme.text.medium,
          }}
        >
          {`import { Icon } from '@marcelinodzn/ds-react';

<Icon name="IcHome" size="M" />
<Icon name="IcSearch" size="L" color="#f97316" />`}
        </code>
        <p className="text-xs mt-2" style={{ color: theme.text.low }}>
          Click any icon above to copy its usage code
        </p>
      </div>
    </div>
  );
};

export default IconBrowser;
