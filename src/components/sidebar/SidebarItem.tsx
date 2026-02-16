/**
 * SidebarItem - Base sidebar item component
 * 
 * Supports both navigation and menu item variants.
 * Used by SidebarNavItem for nav items and DropdownMenu for menu items.
 */

import { memo, useState } from 'react';
import { useThemeColors } from '../../theme';
import { Text } from '@marcelinodzn/ds-react';

export interface SidebarItemProps {
  variant: 'nav' | 'menu';
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  isActive?: boolean;
  onClick: (e?: React.MouseEvent) => void;
  ariaLabel?: string;
  ariaCurrent?: boolean | 'page';
}

export const SidebarItem = memo(function SidebarItem({
  variant,
  label,
  icon,
  badge,
  isActive = false,
  onClick,
  ariaLabel,
  ariaCurrent,
}: SidebarItemProps) {
  const theme = useThemeColors();
  const [isHovered, setIsHovered] = useState(false);

  const isMenu = variant === 'menu';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-left cursor-pointer w-full px-2.5 rounded-[14px] focus:outline-none"
      style={{
        backgroundColor: isActive ? theme.stroke.low : (isHovered ? theme.stroke.low : 'transparent'),
        height: '36px',
      }}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      role={isMenu ? 'menuitem' : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon && (
        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">{icon}</span>
      )}
      <Text size="S" weight="low">
        {label}
      </Text>
      {badge}
    </button>
  );
});
