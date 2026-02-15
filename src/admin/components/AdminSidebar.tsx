import { useState, memo } from 'react';
import { useThemeColors } from '../../theme/useColors';
import { DSIcon } from '../../components/DSIcon';
import { SidebarNavItem, SidebarContainer } from '../../components/sidebar';
import { Divider, Label } from '@marcelinodzn/ds-react';

// ── Types ────────────────────────────────────────────────────────
export type AdminSection = 'dashboard' | 'learning' | 'knowledge' | 'tokens' | 'usage' | 'users' | 'config';

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  onSignOut: () => void;
}

// Primary navigation items - always visible
const NAV_ITEMS: { id: AdminSection; label: string; iconName: string }[] = [
  { id: 'dashboard', label: 'dashboard', iconName: 'IcHome' },
  { id: 'learning', label: 'learning center', iconName: 'IcLightbulb' },
  { id: 'knowledge', label: 'knowledge base', iconName: 'IcLibrary' },
  { id: 'tokens', label: 'tokens', iconName: 'IcCode' },
  { id: 'usage', label: 'usage analytics', iconName: 'IcAnalytics' },
];

// Advanced navigation items - collapsible
const ADVANCED_ITEMS: { id: AdminSection; label: string; iconName: string }[] = [
  { id: 'users', label: 'users', iconName: 'IcUser' },
  { id: 'config', label: 'system config', iconName: 'IcSettings' },
];

// ── AdminSidebar ─────────────────────────────────────────────────
export const AdminSidebar = memo(function AdminSidebar({
  activeSection,
  onSectionChange,
  onSignOut,
}: AdminSidebarProps) {
  const theme = useThemeColors();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <SidebarContainer>
      {/* Logo */}
      <div className="p-3">
        <img
          src={theme.isLight ? '/jio-voice-lab-light.svg?v=3' : '/jio-voice-lab-dark.svg?v=3'}
          alt="Jio Voice Lab"
          className="h-8"
        />
      </div>

      {/* Section Label */}
      <div className="px-2 py-1.5">
        <Label size="XS" weight="medium" attention="low" as="span">admin panel</Label>
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
          <span>{showAdvanced ? 'hide advanced' : 'show advanced'}</span>
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

      {/* Bottom Actions */}
      <Divider attention="low" />
      <div className="p-2.5">
        {/* Back to App */}
        <SidebarNavItem
          icon={<DSIcon name="IcArrowBack" size="S" attention="high" />}
          label="back to app"
          onClick={() => { window.location.href = '/'; }}
          ariaLabel="Back to Voice Lab"
        />

        {/* Sign Out */}
        <SidebarNavItem
          icon={<DSIcon name="IcLogout" size="S" attention="high" />}
          label="sign out"
          onClick={onSignOut}
          ariaLabel="Sign out of admin"
        />
      </div>
    </SidebarContainer>
  );
});

export default AdminSidebar;
