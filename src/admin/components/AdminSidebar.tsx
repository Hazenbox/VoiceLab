import React, { useState, useMemo, useCallback, memo } from 'react';
import { useThemeColors } from '../../theme/useColors';
import { DSIcon } from '../../components/DSIcon';

// ── Types ────────────────────────────────────────────────────────
export type AdminSection = 'dashboard' | 'learning' | 'knowledge' | 'tokens' | 'usage' | 'users' | 'config';
type AdminCategory = 'main' | 'content' | 'developer' | 'settings';

interface AdminNavItem {
  id: AdminSection | string;
  label: string;
  iconName?: string;
  children?: AdminNavItem[];
  category: AdminCategory;
}

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  onSignOut: () => void;
}

// ── Navigation Tree Structure ─────────────────────────────────────
const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'dashboard', label: 'dashboard', iconName: 'IcHome', category: 'main' },
  {
    id: 'content',
    label: 'content',
    iconName: 'IcFolder',
    category: 'content',
    children: [
      { id: 'learning', label: 'learning center', category: 'content' },
      { id: 'knowledge', label: 'knowledge base', category: 'content' },
    ],
  },
  {
    id: 'developer',
    label: 'developer',
    iconName: 'IcCode',
    category: 'developer',
    children: [
      { id: 'tokens', label: 'tokens', category: 'developer' },
      { id: 'usage', label: 'usage analytics', category: 'developer' },
    ],
  },
  {
    id: 'settings',
    label: 'settings',
    iconName: 'IcSettings',
    category: 'settings',
    children: [
      { id: 'users', label: 'users', category: 'settings' },
      { id: 'config', label: 'system config', category: 'settings' },
    ],
  },
];

// ── AdminSidebar ─────────────────────────────────────────────────
export const AdminSidebar = memo(function AdminSidebar({
  activeSection,
  onSectionChange,
  onSignOut,
}: AdminSidebarProps) {
  const theme = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<AdminCategory>>(
    new Set(['main', 'content', 'developer'])
  );

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return ADMIN_NAV_ITEMS;

    const query = searchQuery.toLowerCase();
    const filterItems = (navItems: AdminNavItem[]): AdminNavItem[] => {
      const result: AdminNavItem[] = [];
      
      for (const item of navItems) {
        const matches = item.label.toLowerCase().includes(query);
        const filteredChildren = item.children
          ? filterItems(item.children)
          : undefined;

        if (matches || (filteredChildren && filteredChildren.length > 0)) {
          result.push({
            ...item,
            children: filteredChildren,
          });
        }
      }
      
      return result;
    };

    return filterItems(ADMIN_NAV_ITEMS);
  }, [searchQuery]);

  const toggleCategory = useCallback((category: AdminCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const renderNavItem = useCallback(
    (item: AdminNavItem, level: number = 0) => {
      const isSelected = activeSection === item.id;
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedCategories.has(item.category);

      return (
        <div key={item.id}>
          <button
            onClick={() => {
              if (hasChildren && level === 0) {
                toggleCategory(item.category);
              } else if (!hasChildren || level > 0) {
                onSectionChange(item.id as AdminSection);
              }
            }}
            className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
            style={{
              backgroundColor: isSelected
                ? theme.background.subtle
                : 'transparent',
              color: isSelected ? theme.text.high : theme.text.medium,
              paddingLeft: `${12 + level * 16}px`,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = theme.background.ghost;
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
            aria-current={isSelected ? 'page' : undefined}
          >
            {/* Chevron for expandable items */}
            {hasChildren && level === 0 && (
              <span
                className="transition-transform duration-150"
                style={{
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
              >
                <DSIcon name="IcChevronRight" size="XS" attention="medium" />
              </span>
            )}
            {/* Icon for top-level items without children, or bullet for nested */}
            {!hasChildren && level === 0 && item.iconName && (
              <DSIcon name={item.iconName} size="XS" attention={isSelected ? 'high' : 'medium'} />
            )}
            {!hasChildren && level > 0 && (
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.text.low }} />
            )}
            {/* Icon for parent items */}
            {hasChildren && level === 0 && item.iconName && (
              <DSIcon name={item.iconName} size="XS" attention={isSelected ? 'high' : 'medium'} />
            )}
            <span className="text-sm font-medium">{item.label}</span>
          </button>
          {hasChildren && isExpanded && (
            <div className="ml-4">
              {item.children!.map((child) => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    },
    [activeSection, expandedCategories, theme, toggleCategory, onSectionChange]
  );

  return (
    <aside
      className="w-[260px] min-w-[260px] h-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: theme.background.ghost,
        borderRight: `1px solid ${theme.stroke.low}`,
      }}
    >
      {/* Logo */}
      <div className="p-3">
        <img
          src={theme.isLight ? '/jio-voice-lab-light.svg?v=3' : '/jio-voice-lab-dark.svg?v=3'}
          alt="Jio Voice Lab"
          className="h-8"
        />
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.text.low }}>
            <DSIcon name="IcSearch" size="XS" attention="low" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="search..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border-0 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: theme.background.subtle,
              color: theme.text.high,
              // @ts-expect-error CSS custom property
              '--tw-ring-color': theme.accent,
            }}
          />
        </div>
      </div>

      {/* Section Label */}
      <div
        className="px-4 py-1.5"
        style={{
          color: theme.text.low,
          fontSize: '12px',
          fontWeight: 500,
          letterSpacing: '-0.2px',
        }}
      >
        admin panel
      </div>

      {/* Navigation Tree */}
      <nav className="flex-1 overflow-y-auto p-2 scrollable-container">
        {filteredItems.length === 0 ? (
          <div
            className="text-center py-8 text-sm"
            style={{ color: theme.text.low }}
          >
            no items found
          </div>
        ) : (
          filteredItems.map((item) => renderNavItem(item))
        )}
      </nav>

      {/* Bottom Actions */}
      <div
        className="p-2.5"
        style={{ borderTop: `1px solid ${theme.stroke.low}` }}
      >
        {/* Back to App */}
        <button
          onClick={() => { window.location.href = '/'; }}
          className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
          style={{ color: theme.text.medium }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.background.ghost;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Back to Voice Lab"
        >
          <DSIcon name="IcArrowBack" size="XS" attention="medium" />
          <span className="text-sm font-medium">back to app</span>
        </button>

        {/* Sign Out */}
        <button
          onClick={onSignOut}
          className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
          style={{ color: theme.text.medium }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.background.ghost;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Sign out of admin"
        >
          <DSIcon name="IcLogout" size="XS" attention="medium" />
          <span className="text-sm font-medium">sign out</span>
        </button>
      </div>
    </aside>
  );
});

export default AdminSidebar;
