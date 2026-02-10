import React, { useState, useMemo, useEffect } from 'react';
import type { DesignSystemNavItem, ColorMode } from '../types';
import { useThemeColors } from '../theme';
import { Sidebar } from './DesignSystemLibrary/Sidebar';
import { Preview } from './DesignSystemLibrary/Preview';
import { DSIcon } from './DSIcon';
import { 
  COMPONENTS, 
  COMPONENT_CATEGORIES, 
  TOKEN_CATEGORIES, 
  PATTERNS,
  DENSITY_OPTIONS,
  EXTERNAL_LINKS,
} from '../data/designSystemData';

interface DesignSystemLibraryProps {
  onBack: () => void;
  colorMode: ColorMode;
}

/**
 * Main Design System Library Component
 * Storybook-like interface for browsing design system resources
 */
export const DesignSystemLibrary: React.FC<DesignSystemLibraryProps> = ({
  onBack,
  colorMode,
}) => {
  const theme = useThemeColors();
  const [selectedItem, setSelectedItem] = useState<DesignSystemNavItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Build navigation items structure from static data
  const navItems = useMemo<DesignSystemNavItem[]>(() => {
    const items: DesignSystemNavItem[] = [
      // Design Tokens
      {
        id: 'tokens',
        label: 'Design Tokens',
        type: 'token',
        category: 'variables',
        children: [
          {
            id: 'colors',
            label: 'Colors',
            type: 'token',
            category: 'variables',
            children: TOKEN_CATEGORIES.colors.tokens.map(token => ({
              id: token.id,
              label: token.name,
              type: 'token' as const,
              category: 'variables' as const,
            })),
          },
          {
            id: 'spacing',
            label: 'Spacing',
            type: 'token',
            category: 'variables',
            children: TOKEN_CATEGORIES.spacing.tokens.map(token => ({
              id: token.id,
              label: token.name,
              type: 'token' as const,
              category: 'variables' as const,
            })),
          },
          {
            id: 'border-radius',
            label: 'Border Radius',
            type: 'token',
            category: 'variables',
            children: TOKEN_CATEGORIES.borderRadius.tokens.map(token => ({
              id: token.id,
              label: token.name,
              type: 'token' as const,
              category: 'variables' as const,
            })),
          },
          {
            id: 'typography',
            label: 'Typography',
            type: 'token',
            category: 'variables',
            children: TOKEN_CATEGORIES.typography.tokens.map(token => ({
              id: token.id,
              label: token.name,
              type: 'token' as const,
              category: 'variables' as const,
            })),
          },
        ],
      },
      
      // Components (30 total)
      {
        id: 'components',
        label: `Components (${COMPONENTS.length})`,
        type: 'component',
        category: 'components',
        children: Object.entries(COMPONENT_CATEGORIES).map(([key, category]) => ({
          id: key,
          label: `${category.label} (${category.components.length})`,
          type: 'component' as const,
          category: 'components' as const,
          children: category.components.map(componentName => ({
            id: componentName,
            label: componentName,
            type: 'component' as const,
            category: 'components' as const,
          })),
        })),
      },
      
      // Icons
      {
        id: 'icons',
        label: 'Icons',
        type: 'component', // Using component type for icon browser
        category: 'components',
      },
      
      // Patterns
      {
        id: 'patterns',
        label: 'Patterns',
        type: 'pattern',
        category: 'patterns',
        children: Object.entries(PATTERNS).map(([key, pattern]) => ({
          id: key,
          label: pattern.label,
          type: 'pattern' as const,
          category: 'patterns' as const,
          children: pattern.examples.map(example => ({
            id: example.id,
            label: example.name,
            type: 'pattern' as const,
            category: 'patterns' as const,
          })),
        })),
      },
      
      // Densities
      {
        id: 'densities',
        label: 'Densities',
        type: 'density',
        category: 'densities',
        children: DENSITY_OPTIONS.map(density => ({
          id: density.id,
          label: density.name,
          type: 'density' as const,
          category: 'densities' as const,
        })),
      },
      
      // Guidelines
      {
        id: 'guidelines',
        label: 'Guidelines',
        type: 'guideline',
        category: 'guidelines',
        children: [
          { id: 'accessibility', label: 'Accessibility', type: 'guideline' as const, category: 'guidelines' as const },
          { id: 'usage', label: 'Usage', type: 'guideline' as const, category: 'guidelines' as const },
          { id: 'best-practices', label: 'Best Practices', type: 'guideline' as const, category: 'guidelines' as const },
        ],
      },
    ];

    return items;
  }, []);

  // Auto-select first color token if none selected
  useEffect(() => {
    if (!selectedItem && navItems.length > 0) {
      // Default to colors overview
      setSelectedItem({
        id: 'colors',
        label: 'Colors',
        type: 'token',
        category: 'variables',
      });
    }
  }, [navItems, selectedItem]);

  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: theme.background.ghost }}
    >
      {/* Header */}
      <div
        className="absolute top-0 left-0 right-0 z-10 px-4 py-3 border-b flex items-center justify-between"
        style={{
          backgroundColor: theme.background.ghost,
          borderColor: theme.stroke.low,
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: theme.text.medium }}
            aria-label="Back to main view"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h1
            className="text-xl font-semibold"
            style={{ color: theme.text.high }}
          >
            Design System Library
          </h1>
        </div>
        
        {/* External links */}
        <div className="flex items-center gap-3">
          <a
            href={EXTERNAL_LINKS.storybook}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm rounded-lg transition-colors hover:opacity-80 flex items-center gap-2"
            style={{
              backgroundColor: theme.background.subtle,
              color: theme.text.medium,
              border: `1px solid ${theme.stroke.low}`,
            }}
          >
            <DSIcon name="IcLibrary" size="XS" attention="medium" />
            Storybook
          </a>
          <a
            href={EXTERNAL_LINKS.npm}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm rounded-lg transition-colors hover:opacity-80 flex items-center gap-2"
            style={{
              backgroundColor: theme.background.subtle,
              color: theme.text.medium,
              border: `1px solid ${theme.stroke.low}`,
            }}
          >
            <span>📦</span>
            NPM
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 pt-16 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0">
          <Sidebar
            items={navItems}
            selectedItem={selectedItem}
            onSelectItem={setSelectedItem}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-hidden">
          <Preview item={selectedItem} colorMode={colorMode} />
        </div>
      </div>
    </div>
  );
};

export default DesignSystemLibrary;
