import { memo } from 'react';
import { useThemeColors } from '../../theme/useColors';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  colorClass?: string;
  onClick?: () => void;
  isSelected?: boolean;
}

/**
 * Compact stat card matching the main app's dense aesthetic.
 * 13px label, 24px value, tight padding, outlined border.
 * Optional onClick makes it interactive.
 */
export const AdminStatCard = memo(function AdminStatCard({
  label,
  value,
  colorClass = '',
  onClick,
  isSelected = false,
}: AdminStatCardProps) {
  const theme = useThemeColors();

  const Element = onClick ? 'button' : 'div';
  
  return (
    <Element
      onClick={onClick}
      className={`rounded-lg px-3 py-2.5 ${onClick ? 'cursor-pointer transition-all hover:shadow-sm' : ''}`}
      style={{
        border: `1px solid ${isSelected ? theme.accent : theme.stroke.low}`,
        backgroundColor: 'transparent',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <span
        className="block font-medium text-left"
        style={{ color: theme.text.low, fontSize: '11px' }}
      >
        {label}
      </span>
      <span
        className={`block font-semibold mt-1.5 text-left ${colorClass}`}
        style={{ fontSize: '24px', lineHeight: 1.1, color: colorClass ? undefined : theme.text.high }}
      >
        {value}
      </span>
    </Element>
  );
});

export default AdminStatCard;
