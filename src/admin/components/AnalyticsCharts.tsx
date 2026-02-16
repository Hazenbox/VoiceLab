import { memo } from 'react';
import { useThemeColors, SEMANTIC_COLORS } from '../../theme/useColors';

/** Default chart accent (brand orange) */
const CHART_ACCENT = '#f97316';

// Note: VerticalBarChart and LineChart are available from @marcelinodzn/ds-react
// but may need specific styling. We'll create custom chart components that work
// with the admin panel's design system.

interface BarDataItem {
  label: string;
  value: number;
}

interface ChartContainerProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  height?: number;
  className?: string;
}

/**
 * Chart container with loading and empty states
 */
export const ChartContainer = memo(function ChartContainer({
  title,
  subtitle,
  children,
  loading = false,
  empty = false,
  emptyMessage = 'No data available',
  height = 200,
  className = '',
}: ChartContainerProps) {
  const theme = useThemeColors();

  if (loading) {
    return (
      <div
        className={`rounded-lg p-4 ${className}`}
        style={{ border: `1px solid ${theme.stroke.low}` }}
      >
        {title && (
          <div className="h-4 w-24 rounded mb-2 animate-pulse" style={{ backgroundColor: theme.stroke.low }} />
        )}
        <div
          className="rounded animate-pulse"
          style={{ height, backgroundColor: theme.stroke.low }}
        />
      </div>
    );
  }

  if (empty) {
    return (
      <div
        className={`rounded-lg p-4 ${className}`}
        style={{ border: `1px solid ${theme.stroke.low}` }}
      >
        {title && (
          <span className="block font-medium mb-1" style={{ fontSize: '11px', color: theme.text.low }}>
            {title}
          </span>
        )}
        <div
          className="flex items-center justify-center rounded"
          style={{ height, backgroundColor: theme.background.ghost }}
        >
          <span style={{ color: theme.text.low, fontSize: '13px' }}>{emptyMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-4 ${className}`}
      style={{ border: `1px solid ${theme.stroke.low}` }}
    >
      {title && (
        <span className="block font-medium mb-1" style={{ fontSize: '11px', color: theme.text.low }}>
          {title}
        </span>
      )}
      {subtitle && (
        <span className="block mb-3" style={{ fontSize: '10px', color: theme.text.low }}>
          {subtitle}
        </span>
      )}
      {children}
    </div>
  );
});

/**
 * Simple horizontal bar chart for admin dashboard
 */
export const HorizontalBarChart = memo(function HorizontalBarChart({
  data,
  color = CHART_ACCENT,
  maxValue,
  showValues = true,
}: {
  data: BarDataItem[];
  color?: string;
  maxValue?: number;
  showValues?: boolean;
}) {
  const theme = useThemeColors();
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <span style={{ color: theme.text.low, fontSize: '13px' }}>No data</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((item) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span
              className="w-24 truncate text-right"
              style={{ fontSize: '12px', color: theme.text.high }}
            >
              {item.label}
            </span>
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: theme.stroke.low }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            {showValues && (
              <span
                className="w-10 text-right font-medium"
                style={{ fontSize: '12px', color }}
              >
                {item.value}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});

/**
 * Simple vertical bar chart for hourly data
 */
export const VerticalBars = memo(function VerticalBars({
  data,
  color = CHART_ACCENT,
  height = 120,
  showLabels = true,
}: {
  data: BarDataItem[];
  color?: string;
  height?: number;
  showLabels?: boolean;
}) {
  const theme = useThemeColors();
  const max = Math.max(...data.map(d => d.value), 1);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span style={{ color: theme.text.low, fontSize: '13px' }}>No data</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Bars */}
      <div
        className="flex items-end gap-0.5"
        style={{ height }}
      >
        {data.map((item, i) => {
          const pct = max > 0 ? (item.value / max) * 100 : 0;
          return (
            <div
              key={i}
              className="flex-1 rounded-t transition-all duration-300 hover:opacity-80"
              style={{
                height: `${Math.max(pct, 2)}%`,
                backgroundColor: color,
                minHeight: item.value > 0 ? '4px' : '2px',
                opacity: item.value > 0 ? 1 : 0.3,
              }}
              title={`${item.label}: ${item.value}`}
            />
          );
        })}
      </div>
      {/* Labels (show every 4th label for 24 items) */}
      {showLabels && (
        <div className="flex gap-0.5 mt-1">
          {data.map((item, i) => (
            <div key={i} className="flex-1 text-center">
              {i % 4 === 0 && (
                <span style={{ fontSize: '9px', color: theme.text.low }}>
                  {item.label}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Progress bar with label
 */
export const ProgressBar = memo(function ProgressBar({
  label,
  value,
  max = 100,
  color = CHART_ACCENT,
  showPercentage = true,
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
  showPercentage?: boolean;
}) {
  const theme = useThemeColors();
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span style={{ fontSize: '12px', color: theme.text.medium }}>{label}</span>
        {showPercentage && (
          <span style={{ fontSize: '12px', color, fontWeight: 500 }}>{pct.toFixed(1)}%</span>
        )}
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: theme.stroke.low }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
});

/**
 * Stat breakdown - shows multiple values in a row
 * Uses JioType Var font to match DataCard styling
 */
export const StatBreakdown = memo(function StatBreakdown({
  items,
}: {
  items: Array<{ label: string; value: number | string; color?: string }>;
}) {
  const theme = useThemeColors();

  return (
    <div className="flex flex-wrap gap-4">
      {items.map((item) => (
        <div key={item.label} className="text-center min-w-[70px]">
          <span
            className="block"
            style={{ 
              fontFamily: '"JioType Var"',
              fontWeight: 900,
              fontSize: '26px',
              lineHeight: 1,
              letterSpacing: '0px',
              fontVariationSettings: '"opsz" 24',
              color: item.color || theme.text.high,
            }}
          >
            {item.value}
          </span>
          <span
            className="block"
            style={{ 
              fontFamily: '"JioType Var"',
              fontWeight: 400,
              fontSize: '12px',
              lineHeight: 1.3,
              fontVariationSettings: '"opsz" 24',
              color: theme.text.low,
              marginTop: '4px',
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
});

/**
 * Sentiment bar - shows positive vs negative feedback ratio
 * Used in Dashboard and Learning Center for POC demo
 */
export const SentimentBar = memo(function SentimentBar({
  likes,
  dislikes,
  showLabels = true,
  showCounts = true,
}: {
  likes: number;
  dislikes: number;
  showLabels?: boolean;
  showCounts?: boolean;
}) {
  const theme = useThemeColors();
  const total = likes + dislikes;
  const likePercent = total > 0 ? (likes / total) * 100 : 50;
  
  return (
    <div>
      {showCounts && (
        <div className="flex justify-between mb-2">
          <span className="text-2xl font-bold" style={{ color: SEMANTIC_COLORS.positive }}>{likes}</span>
          <span className="text-2xl font-bold" style={{ color: SEMANTIC_COLORS.negative }}>{dislikes}</span>
        </div>
      )}
      {showLabels && (
        <div className="flex justify-between text-xs mb-1" style={{ color: theme.text.low }}>
          <span>Positive</span>
          <span>Negative</span>
        </div>
      )}
      <div className="h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: theme.stroke.low }}>
        <div 
          className="h-full transition-all duration-300"
          style={{ width: `${likePercent}%`, backgroundColor: SEMANTIC_COLORS.positive }}
        />
        <div 
          className="h-full transition-all duration-300"
          style={{ width: `${100 - likePercent}%`, backgroundColor: SEMANTIC_COLORS.negative }}
        />
      </div>
      {total === 0 && (
        <span 
          className="block mt-2"
          style={{ 
            fontFamily: '"JioType Var"',
            fontWeight: 400,
            fontSize: '12px',
            lineHeight: 1.3,
            fontVariationSettings: '"opsz" 24',
            color: theme.text.low,
          }}
        >
          No feedback yet
        </span>
      )}
    </div>
  );
});
