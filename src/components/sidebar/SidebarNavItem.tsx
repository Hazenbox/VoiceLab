/**
 * SidebarNavItem - Reusable sidebar navigation item
 * 
 * Wrapper around SidebarItem with nav variant for consistent navigation styling.
 */

import { memo } from 'react';
import { SidebarItem } from './SidebarItem';

export interface SidebarNavItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  badge?: React.ReactNode;
  ariaLabel?: string;
  ariaCurrent?: 'page' | undefined;
}

export const SidebarNavItem = memo(function SidebarNavItem({
  icon,
  label,
  onClick,
  isActive = false,
  badge,
  ariaLabel,
  ariaCurrent,
}: SidebarNavItemProps) {
  return (
    <SidebarItem
      variant="nav"
      icon={icon}
      label={label}
      onClick={onClick}
      isActive={isActive}
      badge={badge}
      ariaLabel={ariaLabel}
      ariaCurrent={ariaCurrent}
    />
  );
});
