/**
 * Badge Component
 * 
 * A reusable badge/tag component for status indicators.
 * Supports semantic color variants and emphasis levels.
 */

import { memo } from 'react';
import { Label } from '@marcelinodzn/ds-react';
import { useThemeColors } from '../../theme';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'positive' | 'negative' | 'warning' | 'informative' | 'neutral';
  /** Emphasis level: 'low' for subtle bg, 'high' for solid bg with white text */
  emphasis?: 'low' | 'high';
  /** Optional tooltip text */
  title?: string;
}

export const Badge = memo(function Badge({ children, variant = 'neutral', emphasis = 'low', title }: BadgeProps) {
  const theme = useThemeColors();
  
  // Low emphasis: subtle background colors
  const lowEmphasisColors: Record<string, string> = {
    positive:    theme.isLight ? '#DCFCE7' : 'rgba(34, 197, 94, 0.2)',
    negative:    theme.isLight ? '#FEE2E2' : 'rgba(239, 68, 68, 0.2)',
    warning:     theme.isLight ? '#FEF3C7' : 'rgba(234, 179, 8, 0.2)',
    informative: theme.isLight ? '#DBEAFE' : 'rgba(59, 130, 246, 0.2)',
    neutral:     theme.isLight ? '#F3F4F6' : 'rgba(107, 114, 128, 0.2)',
  };
  
  // High emphasis: solid background colors
  const highEmphasisColors: Record<string, string> = {
    positive:    '#00A859',
    negative:    '#EF4444',
    warning:     '#EAB308',
    informative: '#3B82F6',
    neutral:     '#6B7280',
  };

  const isHighEmphasis = emphasis === 'high';
  const backgroundColor = isHighEmphasis ? highEmphasisColors[variant] : lowEmphasisColors[variant];
  const textColor = isHighEmphasis ? '#ffffff' : undefined;

  return (
    <span 
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor,
        borderRadius: isHighEmphasis ? '9999px' : '4px',
        padding: '0 6px',
        height: '20px',
      }}
    >
      <Label 
        size="XS" 
        weight="medium" 
        attention="high" 
        as="span"
        style={textColor ? { color: textColor } : undefined}
      >
        {children}
      </Label>
    </span>
  );
});

export default Badge;
