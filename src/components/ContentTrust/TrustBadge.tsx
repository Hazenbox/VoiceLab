/**
 * TrustBadge Component
 * 
 * Simple inline icon showing trust certification status.
 */

import { memo, useState } from 'react';
import { useThemeColors } from '../../theme';
import type { TrustScore, TrustCertification } from '../../types';
import { getCertificationBadge } from '../../services/trust';

interface TrustBadgeProps {
  trustScore?: TrustScore;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showTooltip?: boolean;
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
  messageContent,
}: TrustBadgeProps) {
  const theme = useThemeColors();
  const [isHoveredTrust, setIsHoveredTrust] = useState(false);
  const [isHoveredCopy, setIsHoveredCopy] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  if (!trustScore) return null;
  
  const { certification, overall } = trustScore;
  const colors = BADGE_COLORS[certification];
  const badge = getCertificationBadge(certification);
  
  // Determine button size based on size prop
  const buttonSize = size === 'sm' ? '24px' : size === 'lg' ? '32px' : '28px';
  const iconSize = size === 'sm' ? '14' : size === 'lg' ? '18' : '16';
  
  // Shield icon with functional color based on score
  const ShieldIcon = () => (
    <svg 
      width={iconSize} 
      height={iconSize}
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

  // Copy icon
  const CopyIcon = () => (
    <svg 
      width={iconSize} 
      height={iconSize}
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {copySuccess ? (
        // Checkmark icon when copied
        <path d="M20 6L9 17l-5-5" />
      ) : (
        // Copy icon
        <>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </>
      )}
    </svg>
  );

  // Handle copy to clipboard
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!messageContent) return;
    
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Trust Badge Button */}
      <button
        onClick={onClick}
        className="rounded-full flex items-center justify-center transition-colors hover:opacity-90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
        style={{
          width: buttonSize,
          height: buttonSize,
          backgroundColor: isHoveredTrust ? theme.stroke.low : 'transparent',
          color: colors.text,
        }}
        title={showTooltip ? `${badge.label}: ${badge.description} (Score: ${overall})` : undefined}
        type="button"
        aria-label={`Trust badge: ${badge.label}`}
        onMouseEnter={() => setIsHoveredTrust(true)}
        onMouseLeave={() => setIsHoveredTrust(false)}
      >
        <ShieldIcon />
      </button>

      {/* Copy Button */}
      {messageContent && (
        <button
          onClick={handleCopy}
          className="rounded-full flex items-center justify-center transition-colors hover:opacity-90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
          style={{
            width: buttonSize,
            height: buttonSize,
            backgroundColor: isHoveredCopy ? theme.stroke.low : 'transparent',
            color: theme.text.medium,
          }}
          title={copySuccess ? 'Copied!' : 'Copy message'}
          type="button"
          aria-label={copySuccess ? 'Copied to clipboard' : 'Copy message to clipboard'}
          onMouseEnter={() => setIsHoveredCopy(true)}
          onMouseLeave={() => setIsHoveredCopy(false)}
        >
          <CopyIcon />
        </button>
      )}
    </div>
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
