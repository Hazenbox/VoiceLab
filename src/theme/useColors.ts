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

/**
 * Hook to get background color based on surface emphasis level
 * 
 * @param emphasis - Surface emphasis: 'ghost' | 'subtle' | 'moderate' | 'elevated'
 * @returns CSS color string (hex)
 * 
 * Usage:
 * - ghost: Page backgrounds (most transparent)
 * - subtle: Card backgrounds, secondary containers
 * - moderate: Input backgrounds, tertiary containers
 * - elevated: Dropdowns, modals, overlays
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
 * Hook to get all theme colors at once
 * Useful when you need multiple colors in the same component
 */
export function useThemeColors() {
  const dsContext = useDsContext();
  const isLight = dsContext.colorMode === 'Light';
  
  // Get background colors
  const bgGhost = useBackgroundColor('ghost');
  const bgSubtle = useBackgroundColor('subtle');
  const bgModerate = useBackgroundColor('moderate');
  const bgElevated = useBackgroundColor('elevated');
  
  // Get text colors
  const textHigh = useTextColor('high');
  const textMedium = useTextColor('medium');
  const textLow = useTextColor('low');
  
  // Get stroke colors
  const strokeHigh = useStrokeColor('high');
  const strokeMedium = useStrokeColor('medium');
  const strokeLow = useStrokeColor('low');
  
  return {
    isLight,
    colorMode: dsContext.colorMode,
    background: {
      ghost: bgGhost,
      subtle: bgSubtle,
      moderate: bgModerate,
      elevated: bgElevated,
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
  };
}

export default useThemeColors;
