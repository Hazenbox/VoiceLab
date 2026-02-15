/**
 * DropdownMenu - Reusable dropdown menu component
 * 
 * Provides consistent dropdown behavior across the application with:
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Click-outside to close
 * - Configurable direction, width, and position
 * - Optional icon display
 * - Automatic focus management
 */

import { memo, useState, useEffect, useRef } from 'react';
import { useThemeColors } from '../theme';
import { SidebarItem } from './sidebar';

export interface DropdownMenuItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface DropdownMenuProps {
  /** Whether the menu is currently open */
  isOpen: boolean;
  /** Callback to close the menu */
  onClose: () => void;
  /** Menu items to display */
  items: DropdownMenuItem[];
  /** Callback when an item is selected */
  onSelect: (value: string) => void;
  /** Direction the menu opens - 'up' or 'down' */
  direction?: 'up' | 'down';
  /** Width of the menu (CSS value) */
  width?: string;
  /** Horizontal position alignment */
  position?: 'right' | 'left';
  /** Whether to show icons in menu items */
  showIcons?: boolean;
  /** Reference to the anchor element (for click-outside detection) */
  anchorRef?: React.RefObject<HTMLElement>;
}

export const DropdownMenu = memo(function DropdownMenu({
  isOpen,
  onClose,
  items,
  onSelect,
  direction = 'down',
  width = '219px',
  position = 'right',
  showIcons = true,
  anchorRef,
}: DropdownMenuProps) {
  const theme = useThemeColors();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside both menu and anchor
      const isOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      const isOutsideAnchor = anchorRef?.current && !anchorRef.current.contains(target);
      
      if (isOutsideMenu && isOutsideAnchor) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => (prev + 1) % items.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => (prev - 1 + items.length) % items.length);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && items[focusedIndex]) {
            onSelect(items[focusedIndex].value);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, items, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={`absolute z-50 rounded-xl overflow-hidden p-1 ${position === 'right' ? 'right-0' : 'left-0'}`}
      style={{
        width,
        ...(direction === 'up'
          ? { bottom: 'calc(100% + 0.25rem)' }
          : { top: 'calc(100% + 0.25rem)' }
        ),
        backgroundColor: theme.isLight ? '#ffffff' : '#1f1f1f',
        border: `1px solid ${theme.stroke.medium}`,
      }}
      role="menu"
      aria-orientation="vertical"
    >
      {items.map((item, index) => (
        <div
          key={item.value}
          onMouseEnter={() => setFocusedIndex(index)}
        >
          <SidebarItem
            variant="menu"
            label={item.label}
            icon={showIcons ? item.icon : undefined}
            isActive={index === focusedIndex}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item.value);
              onClose();
            }}
            ariaLabel={item.label}
          />
        </div>
      ))}
    </div>
  );
});
