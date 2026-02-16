import { memo, useState } from 'react';
import { useThemeColors, SEMANTIC_COLORS } from '../../theme/useColors';

interface KPICardProps {
  label: string;
  value: string | number | null;
  description?: string;
  target?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorClass?: string;
  format?: 'number' | 'percent' | 'duration' | 'ms';
  loading?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
}

/**
 * Format a value based on type
 */
function formatValue(value: string | number | null, format?: string): string {
  if (value === null || value === undefined) return '—';
  
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'percent':
      return `${value}%`;
    case 'duration': {
      if (value < 60) return `${value}s`;
      const mins = Math.floor(value / 60);
      const secs = value % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    case 'ms':
      if (value < 1000) return `${Math.round(value)}ms`;
      return `${(value / 1000).toFixed(1)}s`;
    default:
      // Format large numbers with commas
      if (value >= 1000) {
        return value.toLocaleString();
      }
      // For decimal numbers, limit to 1 decimal place
      if (value % 1 !== 0) {
        return value.toFixed(1);
      }
      return String(value);
  }
}

export const KPICard = memo(function KPICard({
  label,
  value,
  description,
  target,
  trend,
  colorClass = 'text-orange-500',
  format,
  loading = false,
  onClick,
  isSelected = false,
}: KPICardProps) {
  const theme = useThemeColors();
  const [showTooltip, setShowTooltip] = useState(false);

  const formattedValue = formatValue(value, format);

  if (loading) {
    return (
      <div
        className="rounded-lg p-3 animate-pulse"
        style={{
          border: `1px solid ${theme.stroke.low}`,
          backgroundColor: 'transparent',
        }}
      >
        <div className="h-3 w-16 rounded mb-2" style={{ backgroundColor: theme.stroke.low }} />
        <div className="h-6 w-12 rounded" style={{ backgroundColor: theme.stroke.low }} />
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-3 relative transition-colors ${onClick ? 'cursor-pointer hover:opacity-90' : ''}`}
      style={{
        border: `1px solid ${isSelected ? theme.accent : theme.stroke.low}`,
        backgroundColor: isSelected ? `${theme.accent}14` : 'transparent',
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Label row with info button */}
      <div className="flex items-center gap-1 mb-1">
        <span
          className="block font-medium"
          style={{ color: theme.text.low, fontSize: '11px' }}
        >
          {label}
        </span>
        {description && (
          <span
            className="opacity-50 hover:opacity-100 transition-opacity p-0.5 cursor-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label={`Info about ${label}`}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke={theme.text.low} strokeWidth="1.5" />
              <path d="M8 7v4" stroke={theme.text.low} strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="5" r="0.75" fill={theme.text.low} />
            </svg>
          </span>
        )}
        {target && (
          <span
            className="ml-auto text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${SEMANTIC_COLORS.positive}1A`,
              color: SEMANTIC_COLORS.positive,
              fontSize: '9px',
            }}
          >
            target: {target}
          </span>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && description && (
        <div
          className="absolute left-0 right-0 top-full mt-1 p-2 rounded-lg z-10 text-xs"
          style={{
            backgroundColor: theme.background.elevated || theme.background.subtle,
            border: `1px solid ${theme.stroke.medium}`,
            color: theme.text.medium,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {description}
        </div>
      )}

      {/* Value row */}
      <div className="flex items-baseline gap-2">
        <span
          className={`text-xl font-bold ${colorClass}`}
          style={{ lineHeight: 1.2 }}
        >
          {formattedValue}
        </span>
        {trend && (
          <span
            className="text-xs font-medium"
            style={{
              color: trend.isPositive ? SEMANTIC_COLORS.positive : SEMANTIC_COLORS.negative,
            }}
          >
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
});

/**
 * Mini KPI for inline display
 */
export const MiniKPI = memo(function MiniKPI({
  label,
  value,
  colorClass = '',
}: {
  label: string;
  value: string | number | null;
  colorClass?: string;
}) {
  const theme = useThemeColors();
  const displayValue = value === null || value === undefined ? '—' : value;

  return (
    <div className="text-center min-w-[60px]">
      <span
        className={`block font-semibold ${colorClass}`}
        style={{ fontSize: '16px', color: colorClass ? undefined : theme.text.high }}
      >
        {displayValue}
      </span>
      <span
        className="block"
        style={{ fontSize: '10px', color: theme.text.low }}
      >
        {label}
      </span>
    </div>
  );
});

/**
 * Simple KPI card with colors prop for dashboard components
 * Phase 4.4: Used by ChannelDashboard, IntentAccuracyDashboard, TonalityComplianceDashboard
 */
interface SimpleKPICardProps {
  label: string;
  value: string;
  valueColor?: string;
  subtext?: string;
  subtextColor?: string;
  colors: {
    surface: string;
    surfaceSecondary: string;
    text: string;
    textSecondary: string;
    border: string;
  };
}

export function SimpleKPICard({
  label,
  value,
  valueColor,
  subtext,
  subtextColor,
  colors,
}: SimpleKPICardProps) {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: colors.surfaceSecondary,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: valueColor || colors.text }}>
        {value}
      </div>
      {subtext && (
        <div style={{ fontSize: '11px', color: subtextColor || colors.textSecondary, marginTop: '4px' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

// Re-export with both names for backwards compatibility
export { SimpleKPICard as KPICardSimple };
