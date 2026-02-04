/**
 * Theme color utilities using Jio Design System tokens
 * 
 * These hooks provide access to DS token-based colors that automatically
 * respond to the DsProvider's colorMode setting.
 */

import { useMemo } from 'react';
import { 
  useDsContext, 
  useSurfaceBackground,
  type SurfaceEmphasis 
} from '@marcelinodzn/ds-react';
import { 
  getVariableByName, 
  createTokenContext,
  COLLECTION_NAMES 
} from '@marcelinodzn/ds-tokens';

export type TextEmphasis = 'high' | 'medium' | 'low';
export type BackgroundEmphasis = SurfaceEmphasis;

// Local color tokens (not available in design system)
const LOCAL_COLORS = {
  white: '#ffffff',
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
  const result = useSurfaceBackground({
    appearance: 'neutral',
    emphasis,
    state: 'idle',
  });
  return result.hex;
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
    const tokenContext = createTokenContext({
      [COLLECTION_NAMES.PLATFORM]: dsContext.platform,
      [COLLECTION_NAMES.DENSITY]: dsContext.density,
      [COLLECTION_NAMES.COLOR_MODE]: dsContext.colorMode,
    });
    
    const tokenName = emphasis === 'high' 
      ? 'Text/High'
      : emphasis === 'medium'
      ? 'Text/Medium'
      : 'Text/Low';
    
    const color = getVariableByName(tokenName, tokenContext);
    
    // Fallback colors if token resolution fails
    if (!color || typeof color !== 'string') {
      const isLight = dsContext.colorMode === 'Light';
      if (emphasis === 'high') return isLight ? '#18181b' : '#fafafa';
      if (emphasis === 'medium') return isLight ? '#52525b' : '#a1a1aa';
      return isLight ? '#a1a1aa' : '#71717a';
    }
    
    return color;
  }, [dsContext.platform, dsContext.density, dsContext.colorMode, emphasis]);
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
    const tokenContext = createTokenContext({
      [COLLECTION_NAMES.PLATFORM]: dsContext.platform,
      [COLLECTION_NAMES.DENSITY]: dsContext.density,
      [COLLECTION_NAMES.COLOR_MODE]: dsContext.colorMode,
    });
    
    const tokenName = emphasis === 'high'
      ? 'Stroke/High'
      : emphasis === 'medium'
      ? 'Stroke/Medium'
      : 'Stroke/Low';
    
    const color = getVariableByName(tokenName, tokenContext);
    
    // Fallback colors if token resolution fails
    if (!color || typeof color !== 'string') {
      const isLight = dsContext.colorMode === 'Light';
      if (emphasis === 'high') return isLight ? '#3f3f46' : '#d4d4d8';
      if (emphasis === 'medium') return isLight ? '#e4e4e7' : '#3f3f46';
      return isLight ? '#f4f4f5' : '#27272a';
    }
    
    return color;
  }, [dsContext.platform, dsContext.density, dsContext.colorMode, emphasis]);
}

/**
 * Hook to get accent/primary color
 * 
 * @returns CSS color string (hex)
 * 
 * Usage:
 * - Primary brand color, typically orange (#f97316)
 * - Used for active states, highlights, and brand elements
 */
export function useAccentColor(): string {
  // Try to get a primary/accent color using bold emphasis
  // This typically gives orange/primary brand color
  try {
    const result = useSurfaceBackground({
      appearance: 'secondary' as any,
      emphasis: 'bold',
      state: 'idle',
    });
    return result?.hex || '#f97316';
  } catch {
    // Fallback to orange if not available
    return '#f97316';
  }
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
  
  // Try to get minimal background - fallback to ghost if not available
  let bgMinimal: string;
  try {
    bgMinimal = useSurfaceBackground({
      appearance: 'neutral',
      emphasis: 'minimal' as any,
      state: 'idle',
    }).hex;
  } catch {
    bgMinimal = bgGhost;
  }
  
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
    local: {
      white: LOCAL_COLORS.white,
    },
  };
}

export default useThemeColors;
