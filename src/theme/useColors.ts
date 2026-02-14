/**
 * Theme color utilities using Jio Design System tokens
 * 
 * These hooks provide access to DS token-based colors that automatically
 * respond to the DsProvider's colorMode setting.
 */

import { useMemo } from 'react';
import { 
  useDsContext, 
  type SurfaceEmphasis 
} from '@marcelinodzn/ds-react';

export type TextEmphasis = 'high' | 'medium' | 'low';
export type BackgroundEmphasis = SurfaceEmphasis;

/**
 * Local color tokens - Colors not yet exposed by Jio Design System
 * 
 * These colors match design system component appearances but aren't
 * available as direct tokens. Keep in sync with design system updates.
 */
const LOCAL_COLORS = {
  /**
   * Pure white - used for slider knob
   * @token Not available in DS - custom local token
   */
  white: '#ffffff',
  
  /**
   * Brand accent indigo - primary button color in design system
   * @token Primary accent color used for buttons, CTAs, and interactive elements
   * @value #6366f1 (Tailwind indigo-500)
   * @usage Primary buttons, active states, highlights, brand elements
   */
  accent: '#6366f1',
  
  /**
   * Semantic colors for status and feedback
   * @token Not yet exposed by DS - based on component implementations
   */
  positive: '#00A859',   // Success green - used in trust badges, status indicators
  negative: '#ef4444',   // Error red - used for errors, failures, warnings
  warning: '#eab308',    // Warning yellow - used for caution states
  informative: '#3b82f6', // Info blue - used for informational messages
} as const;

/**
 * Hook to get background color based on surface emphasis level
 * 
 * @param emphasis - Surface emphasis: 'ghost' | 'subtle' | 'bold'
 * @returns CSS color string (hex)
 * 
 * Usage:
 * - ghost: Lightest surface, white/light backgrounds in light mode, page backgrounds
 * - subtle: Medium surface, gray backgrounds, card containers
 * - bold: Strongest surface, darkest backgrounds, emphasized containers
 */
export function useBackgroundColor(emphasis: BackgroundEmphasis = 'subtle'): string {
  const dsContext = useDsContext();
  const isLight = dsContext.colorMode === 'Light';
  
  // Using hardcoded fallbacks instead of useSurfaceBackground to avoid token warnings
  // The DS token package doesn't expose neutral/700, neutral/500 etc. tokens
  if (emphasis === 'ghost') {
    return isLight ? '#ffffff' : '#09090b';
  } else if (emphasis === 'bold') {
    return isLight ? '#f4f4f5' : '#27272a';
  } else { // subtle
    return isLight ? '#fafafa' : '#18181b';
  }
}

/**
 * Hook to get text color based on emphasis level using DS tokens
 * 
 * @param emphasis - Text emphasis: 'high' | 'medium' | 'low'
 * @returns CSS color string (hex)
 * 
 * Usage:
 * - high: Primary headings, important labels, main content
 * - medium: Body text, secondary labels, descriptions
 * - low: Placeholders, hints, disabled text, tertiary content
 */
export function useTextColor(emphasis: TextEmphasis = 'high'): string {
  const dsContext = useDsContext();
  
  return useMemo(() => {
    // Skip token lookup - Text/High, Text/Medium, Text/Low tokens don't exist in the DS package
    // Use hardcoded fallbacks directly to avoid console warnings
    const isLight = dsContext.colorMode === 'Light';
    if (emphasis === 'high') return isLight ? '#18181b' : '#fafafa';
    if (emphasis === 'medium') return isLight ? '#52525b' : '#a1a1aa';
    return isLight ? '#a1a1aa' : '#71717a';
  }, [dsContext.colorMode, emphasis]);
}

/**
 * Hook to get border/stroke color based on emphasis level
 * 
 * @param emphasis - Stroke emphasis: 'high' | 'medium' | 'low'
 * @returns CSS color string (hex)
 */
export function useStrokeColor(emphasis: TextEmphasis = 'medium'): string {
  const dsContext = useDsContext();
  
  return useMemo(() => {
    // Skip token lookup - Stroke/High, Stroke/Medium, Stroke/Low tokens don't exist in the DS package
    // Use hardcoded fallbacks directly to avoid console warnings
    const isLight = dsContext.colorMode === 'Light';
    if (emphasis === 'high') return isLight ? '#3f3f46' : '#d4d4d8';
    if (emphasis === 'medium') return isLight ? '#e4e4e7' : '#3f3f46';
    return isLight ? '#f4f4f5' : '#27272a';
  }, [dsContext.colorMode, emphasis]);
}

/**
 * Hook to get accent/primary brand color
 * 
 * @returns CSS color string (hex)
 * 
 * Usage:
 * - Matches Radio button appearance="secondary" color
 * - Used for active states, highlights, brand elements
 * - Applied to slider filled track, status indicators, etc.
 * 
 * Note: This color is not yet exposed as a design system token.
 * When DS exposes secondary/brand color tokens, migrate to use those.
 */
export function useAccentColor(): string {
  return LOCAL_COLORS.accent;
}

/**
 * Hook to get all theme colors at once
 * Useful when you need multiple colors in the same component
 */
export function useThemeColors() {
  const dsContext = useDsContext();
  const isLight = dsContext.colorMode === 'Light';
  
  // Get background colors - valid SurfaceEmphasis levels
  const bgGhost = useBackgroundColor('ghost');
  const bgSubtle = useBackgroundColor('subtle');
  const bgBold = useBackgroundColor('bold');
  
  // Minimal background - using hardcoded values to avoid token warnings
  const bgMinimal = isLight ? '#f9fafb' : '#0a0a0b';
  
  // Get text colors
  const textHigh = useTextColor('high');
  const textMedium = useTextColor('medium');
  const textLow = useTextColor('low');
  
  // Get stroke colors
  const strokeHigh = useStrokeColor('high');
  const strokeMedium = useStrokeColor('medium');
  const strokeLow = useStrokeColor('low');
  
  // Get accent color
  const accent = useAccentColor();
  
  return {
    isLight,
    colorMode: dsContext.colorMode,
    background: {
      ghost: bgGhost,
      subtle: bgSubtle,
      bold: bgBold,
      minimal: bgMinimal,
    },
    text: {
      high: textHigh,
      medium: textMedium,
      low: textLow,
    },
    stroke: {
      high: strokeHigh,
      medium: strokeMedium,
      low: strokeLow,
    },
    accent,
    semantic: {
      positive: LOCAL_COLORS.positive,
      negative: LOCAL_COLORS.negative,
      warning: LOCAL_COLORS.warning,
      informative: LOCAL_COLORS.informative,
    },
    local: {
      white: LOCAL_COLORS.white,
    },
  };
}

export default useThemeColors;

// Export the return type for use in memoization
export type ThemeColors = ReturnType<typeof useThemeColors>;

/**
 * Shared status color map
 * 
 * Use this constant for any status/severity/trust color mapping
 * instead of hardcoding hex values in individual components.
 * 
 * Maps common status names to the semantic colors defined in LOCAL_COLORS.
 */
export const STATUS_COLORS = {
  // Positive states
  pass: LOCAL_COLORS.positive,
  success: LOCAL_COLORS.positive,
  healthy: LOCAL_COLORS.positive,
  active: LOCAL_COLORS.positive,
  approved: LOCAL_COLORS.positive,
  high: LOCAL_COLORS.positive,

  // Negative states
  fail: LOCAL_COLORS.negative,
  error: LOCAL_COLORS.negative,
  rejected: LOCAL_COLORS.negative,
  offline: LOCAL_COLORS.negative,

  // Warning states
  warning: LOCAL_COLORS.warning,
  medium: LOCAL_COLORS.warning,
  degraded: LOCAL_COLORS.warning,
  pending: LOCAL_COLORS.warning,

  // Informative states
  info: LOCAL_COLORS.informative,
  edit: LOCAL_COLORS.informative,
  informative: LOCAL_COLORS.informative,
} as const;

export type StatusKey = keyof typeof STATUS_COLORS;

/**
 * Convenience function to get a status color with optional fallback
 */
export function getStatusColor(status: string, fallback = LOCAL_COLORS.informative): string {
  return STATUS_COLORS[status as StatusKey] ?? fallback;
}

/**
 * Re-export LOCAL_COLORS for direct use when semantic tokens are needed
 */
export const SEMANTIC_COLORS = LOCAL_COLORS;

/**
 * Selected item colors for dropdowns, selects, and list items.
 * Consistent orange-tinted selection indicator across all selects.
 */
export const SELECTION_COLORS = {
  light: {
    background: '#fff7ed',
    text: '#c2410c',
  },
  dark: {
    background: '#431407',
    text: '#fdba74',
  },
} as const;
