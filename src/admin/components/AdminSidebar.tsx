import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useThemeColors } from '../../theme/useColors';
import { DSIcon } from '../../components/DSIcon';
import { SidebarNavItem, SidebarContainer } from '../../components/sidebar';
import { DropdownMenu, type DropdownMenuItem } from '../../components/DropdownMenu';
import { Divider, Label, Avatar, Text } from '@marcelinodzn/ds-react';
import type { ColorMode } from '../../types';

// ── Types ────────────────────────────────────────────────────────
export type AdminSection = 'dashboard' | 'learning' | 'knowledge' | 'tokens' | 'usage' | 'users' | 'config';

interface MenuOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  // User menu props
  userName?: string;
  userRole?: string;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  onEditProfile?: () => void;
  onNavigateToHowItWorks?: () => void;
}

// ── Helper Functions ─────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

function formatRole(role?: string): string {
  if (!role) return 'Not set';
  return role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
}

// Primary navigation items - always visible
const NAV_ITEMS: { id: AdminSection; label: string; iconName: string }[] = [
  { id: 'dashboard', label: 'Dashboard', iconName: 'IcHome' },
  { id: 'learning', label: 'Learning center', iconName: 'IcLightbulb' },
  { id: 'knowledge', label: 'Knowledge base', iconName: 'IcLibrary' },
  { id: 'tokens', label: 'Tokens', iconName: 'IcCode' },
  { id: 'usage', label: 'Usage analytics', iconName: 'IcAnalytics' },
];

// Advanced navigation items - collapsible
const ADVANCED_ITEMS: { id: AdminSection; label: string; iconName: string }[] = [
  { id: 'users', label: 'Users', iconName: 'IcUser' },
  { id: 'config', label: 'System config', iconName: 'IcSettings' },
];

// ── AdminSidebar ─────────────────────────────────────────────────
export const AdminSidebar = memo(function AdminSidebar({
  activeSection,
  onSectionChange,
  userName,
  userRole,
  colorMode,
  onColorModeChange,
  onEditProfile,
  onNavigateToHowItWorks,
}: AdminSidebarProps) {
  const theme = useThemeColors();
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // User menu state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isUserProfileHovered, setIsUserProfileHovered] = useState(false);
  const userMenuContainerRef = useRef<HTMLDivElement>(null);

  // Close user menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuContainerRef.current &&
        !userMenuContainerRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // User menu options (same as main app, but without Admin Panel option)
  const userMenuOptions: MenuOption[] = [
    {
      value: 'edit-profile',
      label: 'Edit Profile',
      icon: <DSIcon name="IcUser" size="S" attention="high" appearance="neutral" />,
    },
    ...(onNavigateToHowItWorks ? [{
      value: 'how-it-works',
      label: 'How it Works',
      icon: <DSIcon name="IcLightbulb" size="S" attention="high" appearance="neutral" />,
    }] : []),
    {
      value: 'toggle-theme',
      label: `${colorMode === 'Light' ? 'Dark' : 'Light'} Mode`,
      icon: colorMode === 'Light' 
        ? <DSIcon name="IcNightClear" size="S" attention="high" appearance="neutral" />
        : <DSIcon name="IcSunnyClear" size="S" attention="high" appearance="neutral" />,
    },
  ];

  // Handle user menu actions
  const handleUserMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'edit-profile':
        onEditProfile?.();
        break;
      case 'how-it-works':
        onNavigateToHowItWorks?.();
        break;
      case 'toggle-theme':
        onColorModeChange(colorMode === 'Light' ? 'Dark' : 'Light');
        break;
    }
    setIsUserMenuOpen(false);
  }, [onEditProfile, onNavigateToHowItWorks, onColorModeChange, colorMode]);

  return (
    <SidebarContainer>
      {/* Logo - clickable to go back to chat */}
      <div className="p-3">
        <button
          onClick={() => { window.location.href = '/'; }}
          className="cursor-pointer focus:outline-none"
          aria-label="Back to Voice Lab"
        >
          <img
            src={theme.isLight ? '/jio-voice-lab-light.svg?v=3' : '/jio-voice-lab-dark.svg?v=3'}
            alt="Jio Voice Lab"
            className="h-8"
          />
        </button>
      </div>

      {/* Section Label */}
      <div className="px-2 py-1.5">
        <Label size="XS" weight="medium" attention="low" as="span">Admin panel</Label>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-1.5">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.id}
            icon={<DSIcon name={item.iconName} size="S" attention="high" />}
            label={item.label}
            onClick={() => onSectionChange(item.id)}
            isActive={activeSection === item.id}
          />
        ))}

        {/* Advanced Section Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-2 flex items-center gap-2 rounded-lg transition-colors cursor-pointer mt-3"
          style={{
            height: '28px',
            color: theme.text.low,
            fontSize: '11px',
          }}
        >
          <DSIcon 
            name={showAdvanced ? 'IcChevronDown' : 'IcChevronRight'} 
            size="S" 
            attention="low" 
          />
          <span>{showAdvanced ? 'Hide advanced' : 'Show advanced'}</span>
        </button>

        {/* Advanced Navigation Items */}
        {showAdvanced && (
          <div className="mt-1">
            {ADVANCED_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.id}
                icon={<DSIcon name={item.iconName} size="S" attention="high" />}
                label={item.label}
                onClick={() => onSectionChange(item.id)}
                isActive={activeSection === item.id}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom Navigation - User Menu */}
      <Divider attention="low" />
      <div className="p-2.5">
        {/* User Profile Menu */}
        {userName && onEditProfile && (
          <div ref={userMenuContainerRef} className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              onMouseEnter={() => setIsUserProfileHovered(true)}
              onMouseLeave={() => setIsUserProfileHovered(false)}
              className="w-full px-2 py-2 rounded-xl cursor-pointer focus:outline-none"
              style={{
                backgroundColor: (isUserProfileHovered || isUserMenuOpen) ? theme.stroke.low : 'transparent',
              }}
              aria-label="User menu"
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
            >
              <div className="flex items-center gap-3">
                {/* Avatar with DS component */}
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
              isOpen={isUserMenuOpen}
              onClose={() => setIsUserMenuOpen(false)}
              items={userMenuOptions}
              onSelect={handleUserMenuAction}
              direction="up"
              width="239px"
              position="left"
              showIcons={true}
              anchorRef={userMenuContainerRef}
            />
          </div>
        )}
      </div>
    </SidebarContainer>
  );
});

export default AdminSidebar;
