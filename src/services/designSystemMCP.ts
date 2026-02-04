/**
 * Design System Data Service
 * 
 * Provides design system data using static data from designSystemData.ts
 * Note: MCP tools are for Cursor AI integration, not browser runtime
 * This service uses direct imports for reliable data in the browser
 */

import { COMPONENTS, COMPONENT_INFO, type ComponentName } from '../data/designSystemData';

export interface ComponentInfo {
  name: string;
  platform: 'react' | 'native';
  code?: string;
  description?: string;
  props?: Record<string, unknown>;
}

export interface TokenInfo {
  name: string;
  value: string;
  cssValue?: string;
  context?: Record<string, string>;
}

export interface IconInfo {
  name: string;
  category: string;
}

export interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  components?: string[];
}

/**
 * Fetch component information from static data
 */
export async function fetchComponentInfo(
  componentName: string,
  platform: 'react' | 'native' = 'react'
): Promise<ComponentInfo | null> {
  const componentData = COMPONENT_INFO[componentName as ComponentName];
  
  if (componentData) {
    // Convert props to the expected format
    const props: Record<string, unknown> = {};
    Object.entries(componentData.props).forEach(([key, value]) => {
      props[key] = value.type;
    });

    return {
      name: componentName,
      platform,
      code: componentData.code,
      description: componentData.description,
      props,
    };
  }

  // Generic fallback for unknown components
  return {
    name: componentName,
    platform,
    description: `${componentName} component from Jio Design System`,
    code: `import { ${componentName} } from '@marcelinodzn/ds-react';

<${componentName} />`,
  };
}

/**
 * Resolve a design token value
 * Note: For reliable token resolution, use useThemeColors hook directly in components
 */
export async function resolveToken(
  _tokenName: string,
  _context?: {
    Platform?: string;
    'Color Mode'?: 'Light' | 'Dark';
    Density?: 'Compact' | 'Default' | 'Open';
    Surface?: string;
    Theme?: string;
  }
): Promise<TokenInfo | null> {
  // Token resolution is now handled directly by TokenPreview component
  // using useThemeColors hook for reliable values
  // This function is kept for backward compatibility
  return null;
}

/**
 * Get list of available components
 */
export async function getAvailableComponents(): Promise<string[]> {
  return [...COMPONENTS];
}

/**
 * Get package information
 */
export async function getPackageInfo(
  platform: 'react' | 'native' | 'tokens' = 'react'
): Promise<PackageInfo | null> {
  if (platform === 'react') {
    return {
      name: '@marcelinodzn/ds-react',
      version: 'latest',
      description: 'Jio Design System React components',
      components: [...COMPONENTS],
    };
  }
  
  if (platform === 'tokens') {
    return {
      name: '@marcelinodzn/ds-tokens',
      version: 'latest',
      description: 'Jio Design System design tokens',
    };
  }

  return null;
}

/**
 * Search for icons (returns static list filtered by query)
 */
export async function searchIcons(
  query: string,
  limit: number = 10
): Promise<IconInfo[]> {
  // Icon search is now handled by IconBrowser component
  // with static icon list from designSystemData.ts
  const { COMMON_ICONS } = await import('../data/designSystemData');
  
  const results = COMMON_ICONS
    .filter(icon => icon.toLowerCase().includes(query.toLowerCase()))
    .slice(0, limit)
    .map(name => ({
      name,
      category: getCategoryForIcon(name),
    }));
  
  return results;
}

/**
 * Helper to determine icon category
 */
function getCategoryForIcon(iconName: string): string {
  const name = iconName.toLowerCase();
  
  if (name.includes('arrow') || name.includes('chevron') || name.includes('home') || name.includes('search') || name.includes('menu')) {
    return 'Navigation';
  }
  if (name.includes('plus') || name.includes('minus') || name.includes('close') || name.includes('check') || name.includes('edit') || name.includes('delete')) {
    return 'Actions';
  }
  if (name.includes('user') || name.includes('settings') || name.includes('profile')) {
    return 'User & Account';
  }
  if (name.includes('mail') || name.includes('phone') || name.includes('chat') || name.includes('notification')) {
    return 'Communication';
  }
  if (name.includes('play') || name.includes('pause') || name.includes('stop') || name.includes('microphone') || name.includes('camera')) {
    return 'Media';
  }
  if (name.includes('info') || name.includes('warning') || name.includes('error') || name.includes('success')) {
    return 'Status';
  }
  if (name.includes('wallet') || name.includes('card') || name.includes('money') || name.includes('bank')) {
    return 'Finance';
  }
  
  return 'Objects';
}
