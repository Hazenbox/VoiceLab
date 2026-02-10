/**
 * TrustBadge Component
 * 
 * Simple inline icon showing trust certification status.
 */

import { memo } from 'react';
import { useThemeColors } from '../../theme';
import type { TrustScore, TrustCertification } from '../../types';
import { getCertificationBadge } from '../../services/trust';
import { Button } from '@marcelinodzn/ds-react';
import { DSIcon } from '../DSIcon';

interface TrustBadgeProps {
  trustScore?: TrustScore;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showTooltip?: boolean;
  /**
   * @deprecated Copy functionality moved to MessageActions component.
   * Will be removed in a future version. Leave undefined to hide copy button.
   */
  messageContent?: string;
}

const BADGE_COLORS: Record<TrustCertification, {
  bg: string;
  border: string;
  text: string;
}> = {
  certified: {
    bg: 'rgba(0, 168, 89, 0.15)',
    border: 'rgba(0, 168, 89, 0.4)',
    text: '#00A859',
  },
  review_recommended: {
    bg: 'rgba(234, 179, 8, 0.15)',
    border: 'rgba(234, 179, 8, 0.4)',
    text: '#eab308',
  },
  issues_found: {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    text: '#ef4444',
  },
};

const SIZES = {
  sm: { container: 'h-4 px-1.5', text: 'text-[10px]', score: 'text-[9px] ml-1' },
  md: { container: 'h-5 px-2', text: 'text-xs', score: 'text-[10px] ml-1' },
  lg: { container: 'h-6 px-2.5', text: 'text-sm', score: 'text-xs ml-1.5' },
};

export const TrustBadge = memo(function TrustBadge({
  trustScore,
  onClick,
  size = 'md',
  showScore: _showScore = false,
  showTooltip = true,
  messageContent: _messageContent,
}: TrustBadgeProps) {
  const theme = useThemeColors();
  
  // Development warning for deprecated prop
  // Note: Warning logged in constructor pattern to avoid every-render logs
  
  if (!trustScore) return null;
  
  const { certification, overall } = trustScore;
  const badge = getCertificationBadge(certification);
  
  // Shield icon with grey color to match other action icons
  const ShieldIcon = () => {
    const iconName = certification === 'certified' ? 'IcProtection' : 'IcProtectionThreats';
    return (
      <span style={{ color: theme.text.low }}>
        <DSIcon name={iconName} size="XS" attention="low" />
      </span>
    );
  };

  return (
    <Button
      onPress={onClick}
      aria-label={showTooltip ? `${badge.label}: ${badge.description} (Score: ${overall})` : `Trust badge: ${badge.label}`}
      appearance="ghost"
      style={{
        width: '32px',
        height: '32px',
        minHeight: '32px',
        minWidth: '32px',
        padding: '0',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      }}
    >
      <ShieldIcon />
    </Button>
  );
});

export const InlineTrustBadge = memo(function InlineTrustBadge({
  trustScore,
  onClick,
}: { trustScore?: TrustScore; onClick?: () => void }) {
  if (!trustScore) return null;
  
  const colors = BADGE_COLORS[trustScore.certification];
  const badge = getCertificationBadge(trustScore.certification);
  const iconName = trustScore.certification === 'certified' ? 'IcProtection' : 'IcProtectionThreats';
  
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
      title={`${badge.label} - Click for details`}
      type="button"
    >
      <DSIcon name={iconName} size="XS" attention="high" />
      <span>{trustScore.overall}</span>
    </button>
  );
});

export const TrustBadgeLoading = memo(function TrustBadgeLoading({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = SIZES[size];
  
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full animate-pulse ${sizeClasses.container}`}
      style={{ backgroundColor: 'rgba(156, 163, 175, 0.2)', border: '1px solid rgba(156, 163, 175, 0.3)' }}
    />
  );
});

export default TrustBadge;
