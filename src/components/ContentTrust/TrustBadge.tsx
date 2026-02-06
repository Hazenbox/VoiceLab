/**
 * TrustBadge Component
 * 
 * Simple inline icon showing trust certification status.
 */

import { memo } from 'react';
import type { TrustScore, TrustCertification } from '../../types';
import { getCertificationBadge } from '../../services/trust';

interface TrustBadgeProps {
  trustScore?: TrustScore;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showTooltip?: boolean;
}

const BADGE_COLORS: Record<TrustCertification, {
  bg: string;
  border: string;
  text: string;
}> = {
  certified: {
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.4)',
    text: '#22c55e',
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
  showScore = false,
  showTooltip = true,
}: TrustBadgeProps) {
  if (!trustScore) return null;
  
  const { certification, overall } = trustScore;
  const colors = BADGE_COLORS[certification];
  const sizeClasses = SIZES[size];
  const badge = getCertificationBadge(certification);
  
  // Shield icon with functional color based on score
  const ShieldIcon = () => (
    <svg 
      width={size === 'sm' ? '12' : size === 'lg' ? '16' : '14'} 
      height={size === 'sm' ? '12' : size === 'lg' ? '16' : '14'}
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={colors.text}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center justify-center rounded-full
        transition-all duration-200
        ${sizeClasses.container}
        ${onClick ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
      `}
      style={{
        backgroundColor: colors.bg,
      }}
      title={showTooltip ? `${badge.label}: ${badge.description} (Score: ${overall})` : undefined}
      type="button"
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
      <svg 
        width="12" 
        height="12"
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={colors.text}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
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
