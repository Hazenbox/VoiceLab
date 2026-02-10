/**
 * Icon Browser Component
 * 
 * Displays and searches through available icons in the design system
 */

import React, { useState, useMemo } from 'react';
import { Icon } from '@marcelinodzn/ds-react';
import { LazyIcon } from '@marcelinodzn/ds-react/icons';
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

  // Group icons by category with improved categorization
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
      'Shopping & Commerce': [],
      'Technology': [],
      'Files & Documents': [],
      'Social & Sharing': [],
      'UI Elements': [],
      'Time & Date': [],
      'Security': [],
      'Miscellaneous': [],
    };

    filteredIcons.forEach(icon => {
      const name = icon.toLowerCase();
      
      // Navigation
      if (name.includes('arrow') || name.includes('chevron') || name.includes('home') || 
          name.includes('search') || name.includes('menu') || name.includes('back') || 
          name.includes('forward') || name.includes('next') || name.includes('previous')) {
        groups['Navigation'].push(icon);
      }
      // Actions
      else if (name.includes('plus') || name.includes('minus') || name.includes('close') || 
               name.includes('check') || name.includes('edit') || name.includes('delete') || 
               name.includes('refresh') || name.includes('download') || name.includes('upload') || 
               name.includes('share') || name.includes('copy') || name.includes('save') ||
               name.includes('filter') || name.includes('more') || name.includes('add') || 
               name.includes('remove')) {
        groups['Actions'].push(icon);
      }
      // User & Account
      else if (name.includes('user') || name.includes('settings') || name.includes('profile') || 
               name.includes('logout') || name.includes('login') || name.includes('account') || 
               name.includes('avatar')) {
        groups['User & Account'].push(icon);
      }
      // Communication
      else if (name.includes('mail') || name.includes('phone') || name.includes('chat') || 
               name.includes('notification') || name.includes('bell') || name.includes('message') ||
               name.includes('send') || name.includes('reply')) {
        groups['Communication'].push(icon);
      }
      // Media
      else if (name.includes('play') || name.includes('pause') || name.includes('stop') || 
               name.includes('microphone') || name.includes('speaker') || name.includes('volume') || 
               name.includes('camera') || name.includes('image') || name.includes('video') ||
               name.includes('music') || name.includes('headphone')) {
        groups['Media'].push(icon);
      }
      // Status
      else if (name.includes('info') || name.includes('warning') || name.includes('error') || 
               name.includes('success') || name.includes('question') || name.includes('alert') ||
               name.includes('circle')) {
        groups['Status'].push(icon);
      }
      // Shopping & Commerce
      else if (name.includes('cart') || name.includes('shopping') || name.includes('store') || 
               name.includes('gift')) {
        groups['Shopping & Commerce'].push(icon);
      }
      // Technology
      else if (name.includes('wifi') || name.includes('bluetooth') || name.includes('battery') || 
               name.includes('signal') || name.includes('cloud') || name.includes('database') ||
               name.includes('server')) {
        groups['Technology'].push(icon);
      }
      // Files & Documents
      else if (name.includes('file') || name.includes('archive') || name.includes('zip') || 
               name.includes('pdf') || name.includes('excel') || name.includes('word')) {
        groups['Files & Documents'].push(icon);
      }
      // Social & Sharing
      else if (name.includes('facebook') || name.includes('twitter') || name.includes('instagram') || 
               name.includes('linkedin') || name.includes('whatsapp') || name.includes('telegram') ||
               name.includes('youtube')) {
        groups['Social & Sharing'].push(icon);
      }
      // UI Elements
      else if (name.includes('grid') || name.includes('list') || name.includes('layout') || 
               name.includes('column') || name.includes('row') || name.includes('drag') ||
               name.includes('resize') || name.includes('fullscreen') || name.includes('minimize') ||
               name.includes('maximize')) {
        groups['UI Elements'].push(icon);
      }
      // Time & Date
      else if (name.includes('time') || name.includes('date') || name.includes('schedule') || 
               name.includes('history') || name.includes('recent')) {
        groups['Time & Date'].push(icon);
      }
      // Security
      else if (name.includes('shield') || name.includes('security') || name.includes('verified') || 
               name.includes('fingerprint') || name.includes('eye') || name.includes('hide') ||
               name.includes('show') || name.includes('key')) {
        groups['Security'].push(icon);
      }
      // Finance
      else if (name.includes('wallet') || name.includes('card') || name.includes('money') || 
               name.includes('currency') || name.includes('bank') || name.includes('payment') ||
               name.includes('transaction') || name.includes('receipt')) {
        groups['Finance'].push(icon);
      }
      // Objects (catch-all for remaining icons)
      else if (name.includes('calendar') || name.includes('clock') || name.includes('location') || 
               name.includes('star') || name.includes('heart') || name.includes('bookmark') || 
               name.includes('document') || name.includes('folder') || name.includes('link') || 
               name.includes('lock') || name.includes('unlock') || name.includes('tag') ||
               name.includes('label') || name.includes('flag') || name.includes('pin')) {
        groups['Objects'].push(icon);
      }
      // Miscellaneous (catch-all)
      else {
        groups['Miscellaneous'].push(icon);
      }
    });

    // Filter out empty groups and sort categories
    const sortedGroups = Object.fromEntries(
      Object.entries(groups)
        .filter(([, icons]) => icons.length > 0)
        .sort(([a], [b]) => a.localeCompare(b))
    );

    return sortedGroups;
  }, [filteredIcons]);

  const handleCopyIcon = (iconName: string) => {
    const importCode = `import { Icon } from '@marcelinodzn/ds-react';\nimport { LazyIcon } from '@marcelinodzn/ds-react/icons';\n\n<Icon size="M" asset={<LazyIcon name="${iconName}" />} />`;
    navigator.clipboard.writeText(importCode);
    setCopiedIcon(iconName);
    setTimeout(() => setCopiedIcon(null), 2000);
    onSelectIcon?.(iconName);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">
          <Icon size="S" attention="medium" asset={<LazyIcon name="IcSearch" />} />
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
                  className="flex flex-col items-center p-3 rounded-lg transition-colors group hover:scale-105"
                  style={{
                    backgroundColor: copiedIcon === icon ? theme.accent : theme.background.ghost,
                    border: `1px solid ${theme.stroke.low}`,
                  }}
                  title={`Click to copy: ${icon}`}
                >
                  <div 
                    className="mb-1" 
                    style={{ 
                      color: copiedIcon === icon ? '#fff' : theme.text.high,
                      minHeight: '48px',
                      minWidth: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size="L" attention="high" asset={<LazyIcon name={icon} />} />
                  </div>
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
import { LazyIcon } from '@marcelinodzn/ds-react/icons';

// Basic usage (recommended - lazy loads icons)
<Icon size="M" asset={<LazyIcon name="IcHome" />} />

// Different sizes
<Icon size="S" asset={<LazyIcon name="IcSearch" />} />

<Icon size="L" asset={<LazyIcon name="IcUser" />} />

// With attention level (color)
<Icon size="M" attention="high" asset={<LazyIcon name="IcSettings" />} />`}
        </code>
        <p className="text-xs mt-2" style={{ color: theme.text.low }}>
          Click any icon above to copy its usage code. 1,600+ icons available via LazyIcon for optimal bundle size. Icons are from the Jio Design System icon library.
        </p>
      </div>
    </div>
  );
};

export default IconBrowser;
