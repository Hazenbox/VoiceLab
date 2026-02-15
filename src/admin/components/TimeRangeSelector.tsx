import { memo } from 'react';
import { useThemeColors } from '../../theme/useColors';

export type TimeRange = 'hour' | 'day' | 'week' | 'month' | 'all';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  options?: TimeRange[];
  className?: string;
}

const RANGE_LABELS: Record<TimeRange, string> = {
  hour: '1h',
  day: '24h',
  week: '7d',
  month: '30d',
  all: 'All',
};

/**
 * Converts a time range to milliseconds since timestamp
 */
export function getTimestampForRange(range: TimeRange): number {
  const now = Date.now();
  switch (range) {
    case 'hour':
      return now - 60 * 60 * 1000;
    case 'day':
      return now - 24 * 60 * 60 * 1000;
    case 'week':
      return now - 7 * 24 * 60 * 60 * 1000;
    case 'month':
      return now - 30 * 24 * 60 * 60 * 1000;
    case 'all':
      return 0;
  }
}

export const TimeRangeSelector = memo(function TimeRangeSelector({
  value,
  onChange,
  options = ['hour', 'day', 'week', 'all'],
  className = '',
}: TimeRangeSelectorProps) {
  const theme = useThemeColors();

  return (
    <div className={`flex gap-1 ${className}`}>
      {options.map((range) => {
        const isActive = value === range;
        return (
          <button
            key={range}
            onClick={() => onChange(range)}
            className="px-2 py-1 rounded text-xs transition-colors"
            style={{
              backgroundColor: isActive ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
              color: isActive ? theme.accent : theme.text.low,
              fontWeight: isActive ? 500 : 400,
            }}
            aria-pressed={isActive}
            aria-label={`Show data for ${RANGE_LABELS[range]}`}
          >
            {RANGE_LABELS[range]}
          </button>
        );
      })}
    </div>
  );
});
