import { useState, useCallback, memo } from 'react';
import { useThemeColors } from '../../theme/useColors';
import { DSIcon } from '../../components/DSIcon';
import { SidebarNavItem, SidebarContainer } from '../../components/sidebar';
import { UserMenu } from '../../components/UserMenu';
import { Divider, Label } from '@marcelinodzn/ds-react';
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
  onSettingsOpen?: () => void;
  onNavigateToHowItWorks?: () => void;
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
  onSettingsOpen,
  onNavigateToHowItWorks,
}: AdminSidebarProps) {
  const theme = useThemeColors();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Admin menu additional items (matching main app for consistency)
  const adminMenuAdditionalItems: MenuOption[] = [
    ...(onNavigateToHowItWorks ? [{
      value: 'how-it-works',
      label: 'How it Works',
      icon: <DSIcon name="IcLightbulb" size="S" attention="high" appearance="neutral" />,
    }] : []),
    {
      value: 'compliance-tests',
      label: 'Compliance Tests',
      icon: <DSIcon name="IcCode" size="S" attention="high" appearance="neutral" />,
    },
    {
      value: 'back-to-chat',
      label: 'Back to Chat',
      icon: <DSIcon name="IcChat" size="S" attention="high" appearance="neutral" />,
    },
  ];

  // Handle additional menu actions
  const handleAdditionalAction = useCallback((action: string) => {
    switch (action) {
      case 'how-it-works':
        onNavigateToHowItWorks?.();
        break;
      case 'compliance-tests':
        window.location.href = '/testrunner';
        break;
      case 'back-to-chat':
        window.location.href = '/';
        break;
    }
  }, [onNavigateToHowItWorks]);

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
          <UserMenu
            userName={userName}
            userRole={userRole}
            colorMode={colorMode}
            onColorModeChange={onColorModeChange}
            onEditProfile={onEditProfile}
            onSettingsOpen={onSettingsOpen}
            additionalItems={adminMenuAdditionalItems}
            onAdditionalAction={handleAdditionalAction}
          />
        )}
      </div>
    </SidebarContainer>
  );
});

export default AdminSidebar;
