/**
 * Badge Component
 * 
 * A reusable badge/tag component for status indicators.
 * Supports semantic color variants.
 */

import { memo } from 'react';
import { Label } from '@marcelinodzn/ds-react';
import { useThemeColors } from '../../theme';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'positive' | 'negative' | 'warning' | 'informative' | 'neutral';
}

export const Badge = memo(function Badge({ children, variant = 'neutral' }: BadgeProps) {
  const theme = useThemeColors();
  
  const colorMap: Record<string, string> = {
    positive:    theme.isLight ? '#DCFCE7' : 'rgba(34, 197, 94, 0.2)',
    negative:    theme.isLight ? '#FEE2E2' : 'rgba(239, 68, 68, 0.2)',
    warning:     theme.isLight ? '#FEF3C7' : 'rgba(234, 179, 8, 0.2)',
    informative: theme.isLight ? '#DBEAFE' : 'rgba(59, 130, 246, 0.2)',
    neutral:     theme.isLight ? '#F3F4F6' : 'rgba(107, 114, 128, 0.2)',
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: colorMap[variant],
      borderRadius: '4px',
      padding: '0 6px',
      height: '20px',
    }}>
      <Label size="XS" weight="medium" attention="high" as="span">
        {children}
      </Label>
    </span>
  );
});

export default Badge;
