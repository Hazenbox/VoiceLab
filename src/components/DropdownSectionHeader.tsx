/**
 * DropdownSectionHeader Component
 * 
 * Standardized section header for dropdown menus
 * Used in SearchableDropdown, ModelSelector, and other dropdown components
 * 
 * Design specs:
 * - Horizontal padding: 12px (px-3)
 * - Vertical padding: 4px (py-1)
 * - Top margin: 2px (mt-0.5) for spacing with menu edge
 * - Font size: 10px
 * - Opacity: 0.75 for subtle visual hierarchy
 * - Color: theme.text.low
 */

import React from 'react';
import { useThemeColors } from '../theme';

interface DropdownSectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const DropdownSectionHeader: React.FC<DropdownSectionHeaderProps> = ({
  children,
  className = '',
}) => {
  const theme = useThemeColors();

  return (
    <div
      className={`px-3 py-1 mt-0.5 text-[10px] font-normal ${className}`}
      style={{
        color: theme.text.low,
        opacity: 0.75,
      }}
    >
      {children}
    </div>
  );
};

export default DropdownSectionHeader;
