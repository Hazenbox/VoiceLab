import React, { useState, useMemo, useCallback } from 'react';
import type { DesignSystemNavItem, DesignSystemCategory } from '../../types';
import { useThemeColors } from '../../theme';

interface SidebarProps {
  items: DesignSystemNavItem[];
  selectedItem: DesignSystemNavItem | null;
  onSelectItem: (item: DesignSystemNavItem) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

/**
 * Sidebar navigation component for Design System Library
 * Displays hierarchical navigation tree with search capability
 */
export const Sidebar: React.FC<SidebarProps> = ({
  items,
  selectedItem,
  onSelectItem,
  searchQuery = '',
  onSearchChange,
}) => {
  const theme = useThemeColors();
  const [expandedCategories, setExpandedCategories] = useState<Set<DesignSystemCategory>>(
    new Set(['variables', 'components'])
  );

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const query = searchQuery.toLowerCase();
    const filterItems = (navItems: DesignSystemNavItem[]): DesignSystemNavItem[] => {
      const result: DesignSystemNavItem[] = [];
      
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

    return filterItems(items);
  }, [items, searchQuery]);

  const toggleCategory = useCallback((category: DesignSystemCategory) => {
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
    (item: DesignSystemNavItem, level: number = 0) => {
      const isSelected = selectedItem?.id === item.id;
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedCategories.has(item.category);

      return (
        <div key={item.id}>
          <button
            onClick={() => {
              if (hasChildren && level === 0) {
                toggleCategory(item.category);
              } else {
                onSelectItem(item);
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
          >
            {hasChildren && level === 0 && (
              <svg
                className="w-4 h-4 transition-transform"
                style={{
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            {!hasChildren && level > 0 && (
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.text.low }} />
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
    [selectedItem, expandedCategories, theme, toggleCategory, onSelectItem]
  );

  return (
    <div
      className="h-full flex flex-col"
      style={{
        backgroundColor: theme.background.ghost,
        borderRight: `1px solid ${theme.stroke.low}`,
      }}
    >
      {/* Search */}
      {onSearchChange && (
        <div className="p-3 border-b" style={{ borderColor: theme.stroke.low }}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: theme.text.low }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border-0 focus:outline-none focus:ring-2"
              style={{
                backgroundColor: theme.background.subtle,
                color: theme.text.high,
                '--tw-ring-color': theme.accent,
              } as React.CSSProperties}
            />
          </div>
        </div>
      )}

      {/* Navigation Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollable-container">
        {filteredItems.length === 0 ? (
          <div
            className="text-center py-8 text-sm"
            style={{ color: theme.text.low }}
          >
            No items found
          </div>
        ) : (
          filteredItems.map((item) => renderNavItem(item))
        )}
      </div>
    </div>
  );
};

export default Sidebar;
