import { memo } from 'react';
import { useThemeColors } from '../../theme/useColors';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  colorClass?: string;
}

/**
 * Compact stat card matching the main app's dense aesthetic.
 * 13px label, 24px value, tight padding, outlined border.
 */
export const AdminStatCard = memo(function AdminStatCard({
  label,
  value,
  colorClass = '',
}: AdminStatCardProps) {
  const theme = useThemeColors();

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{
        border: `1px solid ${theme.stroke.low}`,
        backgroundColor: theme.background.subtle,
      }}
    >
      <span
        className="block uppercase tracking-wider font-medium"
        style={{ color: theme.text.low, fontSize: '11px' }}
      >
        {label}
      </span>
      <span
        className={`block font-semibold mt-1 ${colorClass}`}
        style={{ fontSize: '24px', lineHeight: 1.1, color: colorClass ? undefined : theme.text.high }}
      >
        {value}
      </span>
    </div>
  );
});

export default AdminStatCard;
