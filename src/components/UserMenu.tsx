/**
 * UserMenu Component
 * 
 * Shared user menu component used in both main app sidebar and admin sidebar.
 * Displays user avatar, name, role, and provides dropdown menu with actions.
 */

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useThemeColors } from '../theme';
import { Avatar, Text } from '@marcelinodzn/ds-react';
import { DSIcon } from './DSIcon';
import { DropdownMenu } from './DropdownMenu';
import type { ColorMode } from '../types';

// ── Helper Functions ─────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

function formatRole(role?: string): string {
  if (!role) return 'Not set';
  return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
}

// ── Types ────────────────────────────────────────────────────────

interface MenuOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface UserMenuProps {
  userName: string;
  userRole?: string;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  onEditProfile?: () => void;
  onSettingsOpen?: () => void;
  /** Additional menu items to show (e.g., "How it Works", "Compliance Tests", "Admin Panel") */
  additionalItems?: MenuOption[];
  /** Custom action handler for additional items */
  onAdditionalAction?: (action: string) => void;
}

// ── UserMenu Component ───────────────────────────────────────────

export const UserMenu = memo(function UserMenu({
  userName,
  userRole,
  colorMode,
  onColorModeChange,
  onEditProfile,
  onSettingsOpen,
  additionalItems = [],
  onAdditionalAction,
}: UserMenuProps) {
  const theme = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Build menu options
  const menuOptions: MenuOption[] = [
    {
      value: 'edit-profile',
      label: 'Edit Profile',
      icon: <DSIcon name="IcUser" size="S" attention="high" appearance="neutral" />,
    },
    ...(onSettingsOpen ? [{
      value: 'settings',
      label: 'Settings',
      icon: <DSIcon name="IcSettings" size="S" attention="high" appearance="neutral" />,
    }] : []),
    ...additionalItems,
    {
      value: 'toggle-theme',
      label: `${colorMode === 'Light' ? 'Dark' : 'Light'} Mode`,
      icon: colorMode === 'Light' 
        ? <DSIcon name="IcNightClear" size="S" attention="high" appearance="neutral" />
        : <DSIcon name="IcSunnyClear" size="S" attention="high" appearance="neutral" />,
    },
  ];

  // Handle menu actions
  const handleMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'edit-profile':
        onEditProfile?.();
        break;
      case 'settings':
        onSettingsOpen?.();
        break;
      case 'toggle-theme':
        onColorModeChange(colorMode === 'Light' ? 'Dark' : 'Light');
        break;
      default:
        onAdditionalAction?.(action);
        break;
    }
    setIsOpen(false);
  }, [onEditProfile, onSettingsOpen, onColorModeChange, colorMode, onAdditionalAction]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="w-full px-2 py-2 rounded-xl cursor-pointer focus:outline-none"
        style={{
          backgroundColor: (isHovered || isOpen) ? theme.stroke.low : 'transparent',
        }}
        aria-label="User menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <Avatar 
            content="initials" 
            initials={getInitials(userName)} 
            size="L" 
            attention="medium"
          />

          {/* Name and role */}
          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
            <div className="truncate">
              <Text size="S" weight="low">
                {userName}
              </Text>
            </div>
            <Text size="XS" weight="low" color="low-tinted">
              {formatRole(userRole)}
            </Text>
          </div>
        </div>
      </button>
      
      <DropdownMenu
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        items={menuOptions}
        onSelect={handleMenuAction}
        direction="up"
        width="239px"
        position="left"
        showIcons={true}
        anchorRef={containerRef}
      />
    </div>
  );
});

export default UserMenu;
