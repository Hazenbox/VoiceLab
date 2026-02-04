/**
 * Tailwind-based theme color utilities
 * 
 * Provides the same API as useThemeColors() but uses Tailwind color values
 * instead of Design System tokens.
 */

import { useMemo } from 'react';

// Tailwind color values
const TAILWIND_COLORS = {
  // Light mode colors
  light: {
    background: {
      ghost: '#ffffff',      // white
      subtle: '#fafafa',     // zinc-50
      bold: '#f4f4f5',       // zinc-100
      minimal: '#fafafa',    // zinc-50
    },
    text: {
      high: '#18181b',       // zinc-900
      medium: '#52525b',     // zinc-600
      low: '#a1a1aa',        // zinc-400
    },
    stroke: {
      high: '#a1a1aa',       // zinc-400
      medium: '#e4e4e7',     // zinc-200
      low: '#f4f4f5',        // zinc-100
    },
  },
  // Dark mode colors
  dark: {
    background: {
      ghost: '#09090b',      // zinc-950
      subtle: '#18181b',     // zinc-900
      bold: '#27272a',       // zinc-800
      minimal: '#18181b',    // zinc-900
    },
    text: {
      high: '#fafafa',       // zinc-50
      medium: '#a1a1aa',     // zinc-400
      low: '#71717a',        // zinc-500
    },
    stroke: {
      high: '#52525b',       // zinc-600
      medium: '#3f3f46',     // zinc-700
      low: '#27272a',        // zinc-800
    },
  },
  // Shared colors
  accent: '#f97316',       // orange-500
  white: '#ffffff',
} as const;

/**
 * Hook to get Tailwind-based theme colors
 * Mirrors the API of useThemeColors() from theme/useColors.ts
 */
export function useTailwindTheme() {
  // Detect dark mode from document body class
  const isLight = useMemo(() => {
    return !document.body.classList.contains('dark');
  }, []);

  // Force re-render when dark mode changes
  // Note: This is a simple implementation. For production, consider using MutationObserver
  // or a more robust dark mode state management
  
  const colors = isLight ? TAILWIND_COLORS.light : TAILWIND_COLORS.dark;

  return {
    isLight,
    colorMode: (isLight ? 'Light' : 'Dark') as 'Light' | 'Dark',
    background: colors.background,
    text: colors.text,
    stroke: colors.stroke,
    accent: TAILWIND_COLORS.accent,
    local: {
      white: TAILWIND_COLORS.white,
    },
  };
}

export default useTailwindTheme;
