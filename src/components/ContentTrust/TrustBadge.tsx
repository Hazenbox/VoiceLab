/**
 * TrustBadge Component
 * 
 * Simple inline icon showing trust certification status.
 */

import { memo } from 'react';
import { useThemeColors, SEMANTIC_COLORS } from '../../theme';
import type { TrustScore, TrustCertification } from '../../types';
import { getCertificationBadge } from '../../services/trust';
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
    bg: `${SEMANTIC_COLORS.positive}26`,  // 15% opacity
    border: `${SEMANTIC_COLORS.positive}66`, // 40% opacity
    text: SEMANTIC_COLORS.positive,
  },
  review_recommended: {
    bg: `${SEMANTIC_COLORS.warning}26`,
    border: `${SEMANTIC_COLORS.warning}66`,
    text: SEMANTIC_COLORS.warning,
  },
  issues_found: {
    bg: `${SEMANTIC_COLORS.negative}26`,
    border: `${SEMANTIC_COLORS.negative}66`,
    text: SEMANTIC_COLORS.negative,
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
  
  // Determine button size based on size prop - match action buttons (32px for sm)
  const buttonSize = size === 'sm' ? '32px' : size === 'lg' ? '32px' : '28px';
  
  // Shield icon with grey color to match other action icons
  const ShieldIcon = () => {
    const iconName = certification === 'certified' ? 'IcProtection' : 'IcProtectionThreats';
    return (
      <DSIcon 
        name={iconName} 
        size={size === 'sm' ? 'S' : size === 'lg' ? 'M' : 'S'} 
        attention="low" 
        appearance="neutral" 
      />
    );
  };

  return (
    <button
      onClick={onClick}
      className="rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
      style={{
        width: buttonSize,
        height: buttonSize,
        color: theme.text.low,
      }}
      title={showTooltip ? `${badge.label}: ${badge.description} (Score: ${overall})` : undefined}
      type="button"
      aria-label={`Trust badge: ${badge.label}`}
    >
      <ShieldIcon />
    </button>
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
