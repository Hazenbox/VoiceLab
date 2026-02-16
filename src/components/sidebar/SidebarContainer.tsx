/**
 * SidebarContainer - Consistent sidebar wrapper
 * 
 * Provides standardized sidebar styling:
 * - 260px width (default)
 * - Theme-aware background and border
 * - Full height flex column layout
 */

import { memo } from 'react';
import { useThemeColors } from '../../theme';

export interface SidebarContainerProps {
  children: React.ReactNode;
  width?: number;
}

export const SidebarContainer = memo(function SidebarContainer({
  children,
  width = 260,
}: SidebarContainerProps) {
  const theme = useThemeColors();

  return (
    <aside
      className="h-full flex flex-col overflow-hidden"
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        backgroundColor: theme.background.ghost,
        borderRight: `1px solid ${theme.stroke.high}`,
      }}
    >
      {children}
    </aside>
  );
});
