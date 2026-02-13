import { useState, memo } from 'react';
import { useThemeColors } from '../../theme/useColors';
import { DSIcon } from '../../components/DSIcon';

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
  { id: 'tokens', label: 'tokens v2', iconName: 'IcCode' },
  { id: 'usage', label: 'usage analytics', iconName: 'IcAnalytics' },
];

// Advanced navigation items - collapsible
const ADVANCED_ITEMS: { id: AdminSection; label: string; iconName: string }[] = [
  { id: 'users', label: 'users', iconName: 'IcUser' },
  { id: 'config', label: 'system config', iconName: 'IcSettings' },
];

// ── Sidebar Nav Item (mirrors ProjectSidebar SidebarNavItem) ─────
const SidebarNavItem = memo(function SidebarNavItem({
  icon,
  label,
  onClick,
  isActive = false,
  ariaLabel,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  ariaLabel?: string;
}) {
  const theme = useThemeColors();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      className="w-full px-2 flex items-center gap-2 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset"
      style={{
        backgroundColor: isActive ? theme.stroke.low : (isHovered ? theme.stroke.low : 'transparent'),
        height: '32px',
      }}
      aria-label={ariaLabel}
      aria-current={isActive ? 'page' : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon}
      <span
        className="text-xs font-normal"
        style={{ color: theme.text.high, fontSize: '13px' }}
      >
        {label}
      </span>
    </button>
  );
});

// ── AdminSidebar ─────────────────────────────────────────────────
export const AdminSidebar = memo(function AdminSidebar({
  activeSection,
  onSectionChange,
  onSignOut,
}: AdminSidebarProps) {
  const theme = useThemeColors();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <aside
      className="w-[240px] min-w-[240px] h-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: theme.background.ghost,
        borderRight: `1px solid ${theme.stroke.low}`,
      }}
    >
      {/* Logo */}
      <div className="p-3">
        <img
          src={theme.isLight ? '/jio-voice-lab-light.svg?v=3' : '/jio-voice-lab-dark.svg?v=3'}
          alt="Jio Voice Lab"
          className="h-8"
        />
      </div>

      {/* Section Label */}
      <div
        className="px-4 py-1.5"
        style={{
          color: theme.text.low,
          fontSize: '12px',
          fontWeight: 500,
          letterSpacing: '-0.2px',
        }}
      >
        admin panel
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-1 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.id}
            icon={<DSIcon name={item.iconName} size="XS" attention="high" />}
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
            size="XS" 
            attention="low" 
          />
          <span>{showAdvanced ? 'hide advanced' : 'show advanced'}</span>
        </button>

        {/* Advanced Navigation Items */}
        {showAdvanced && (
          <div className="space-y-0.5 mt-1">
            {ADVANCED_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.id}
                icon={<DSIcon name={item.iconName} size="XS" attention="high" />}
                label={item.label}
                onClick={() => onSectionChange(item.id)}
                isActive={activeSection === item.id}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom Actions */}
      <div
        className="p-2.5 space-y-0.5"
        style={{ borderTop: `1px solid ${theme.stroke.low}` }}
      >
        {/* Back to App */}
        <SidebarNavItem
          icon={<DSIcon name="IcArrowBack" size="XS" attention="high" />}
          label="back to app"
          onClick={() => { window.location.href = '/'; }}
          ariaLabel="Back to Voice Lab"
        />

        {/* Sign Out */}
        <SidebarNavItem
          icon={<DSIcon name="IcLogout" size="XS" attention="high" />}
          label="sign out"
          onClick={onSignOut}
          ariaLabel="Sign out of admin"
        />
      </div>
    </aside>
  );
});

export default AdminSidebar;
