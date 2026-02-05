/**
 * TrustBadge Component
 * 
 * Simple inline icon showing trust certification status.
 * Three states:
 * - Green (✓): Certified (90+)
 * - Yellow (!): Review recommended (70-89)
 * - Red (✕): Violations found (<70)
 * 
 * Clicking opens the TrustContextPanel.
 */

import React, { memo } from 'react';
import type { TrustScore, TrustCertification } from '../../types';
import { getCertificationBadge } from '../../services/trust';

// =============================================================================
// Types
// =============================================================================

interface TrustBadgeProps {
  /** Trust score data */
  trustScore?: TrustScore;
  /** Callback when clicked to open details panel */
  onClick?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show score number */
  showScore?: boolean;
  /** Show tooltip on hover */
  showTooltip?: boolean;
}

// =============================================================================
// Badge Colors
// =============================================================================

const BADGE_COLORS: Record<TrustCertification, {
  bg: string;
  border: string;
  text: string;
  icon: string;
}> = {
  certified: {
    bg: 'rgba(34, 197, 94, 0.15)',
    border: 'rgba(34, 197, 94, 0.4)',
    text: '#22c55e',
    icon: '✓',
  },
  review: {
    bg: 'rgba(234, 179, 8, 0.15)',
    border: 'rgba(234, 179, 8, 0.4)',
    text: '#eab308',
    icon: '!',
  },
  blocked: {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    text: '#ef4444',
    icon: '✕',
  },
};

const SIZES = {
  sm: {
    container: 'w-4 h-4',
    text: 'text-[10px]',
    score: 'text-[9px] ml-1',
  },
  md: {
    container: 'w-5 h-5',
    text: 'text-xs',
    score: 'text-[10px] ml-1',
  },
  lg: {
    container: 'w-6 h-6',
    text: 'text-sm',
    score: 'text-xs ml-1.5',
  },
};

// =============================================================================
// Component
// =============================================================================

export const TrustBadge = memo(function TrustBadge({
  trustScore,
  onClick,
  size = 'md',
  showScore = false,
  showTooltip = true,
}: TrustBadgeProps) {
  // No score available
  if (!trustScore) {
    return null;
  }
  
  const { certification, overall } = trustScore;
  const colors = BADGE_COLORS[certification];
  const sizeClasses = SIZES[size];
  const badge = getCertificationBadge(certification);
  
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center justify-center rounded-full
        transition-all duration-200
        ${sizeClasses.container}
        ${onClick ? 'cursor-pointer hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500' : 'cursor-default'}
      `}
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
      title={showTooltip ? `${badge.label}: ${badge.description} (Score: ${overall})` : undefined}
      aria-label={`Trust status: ${badge.label}. Score: ${overall}. ${badge.description}`}
      type="button"
    >
      <span
        className={`font-bold leading-none ${sizeClasses.text}`}
        style={{ color: colors.text }}
      >
        {colors.icon}
      </span>
      
      {showScore && (
        <span
          className={`font-medium ${sizeClasses.score}`}
          style={{ color: colors.text }}
        >
          {overall}
        </span>
      )}
    </button>
  );
});

// =============================================================================
// Inline Badge (for message list)
// =============================================================================

interface InlineTrustBadgeProps {
  trustScore?: TrustScore;
  onClick?: () => void;
}

export const InlineTrustBadge = memo(function InlineTrustBadge({
  trustScore,
  onClick,
}: InlineTrustBadgeProps) {
  if (!trustScore) return null;
  
  const colors = BADGE_COLORS[trustScore.certification];
  const badge = getCertificationBadge(trustScore.certification);
  
  return (
    <button
      onClick={onClick}
      className="
        inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
        transition-colors hover:opacity-80
        focus:outline-none focus:ring-1 focus:ring-orange-500
      "
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
      title={`${badge.label} - Click for details`}
      type="button"
    >
      <span>{colors.icon}</span>
      <span>{trustScore.overall}</span>
    </button>
  );
});

// =============================================================================
// Loading Badge
// =============================================================================

export const TrustBadgeLoading = memo(function TrustBadgeLoading({
  size = 'md',
}: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = SIZES[size];
  
  return (
    <div
      className={`
        inline-flex items-center justify-center rounded-full
        animate-pulse ${sizeClasses.container}
      `}
      style={{
        backgroundColor: 'rgba(156, 163, 175, 0.2)',
        border: '1px solid rgba(156, 163, 175, 0.3)',
      }}
      aria-label="Loading trust score"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
});

export default TrustBadge;
