import { useState, memo } from 'react';
import { useThemeColors } from '../../theme/useColors';

// ── Types ────────────────────────────────────────────────────────
export type AdminSection = 'dashboard' | 'analytics' | 'memory' | 'knowledge' | 'users' | 'config';

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  onSignOut: () => void;
}

const NAV_ITEMS: { id: AdminSection; label: string; svgPath: string }[] = [
  { id: 'dashboard', label: 'Dashboard', svgPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { id: 'analytics', label: 'Analytics', svgPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'memory', label: 'Memory', svgPath: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
  { id: 'knowledge', label: 'Knowledge', svgPath: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { id: 'users', label: 'Users', svgPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { id: 'config', label: 'Config', svgPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
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
        Admin
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-1 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.id}
            icon={
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: theme.text.high }}
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={item.svgPath} />
              </svg>
            }
            label={item.label}
            onClick={() => onSectionChange(item.id)}
            isActive={activeSection === item.id}
          />
        ))}
      </nav>

      {/* Bottom Actions */}
      <div
        className="p-2.5 space-y-0.5"
        style={{ borderTop: `1px solid ${theme.stroke.low}` }}
      >
        {/* Back to App */}
        <SidebarNavItem
          icon={
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: theme.text.high }}
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          }
          label="Back to App"
          onClick={() => { window.location.href = '/'; }}
          ariaLabel="Back to Voice Lab"
        />

        {/* Sign Out */}
        <SidebarNavItem
          icon={
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: theme.text.high }}
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          }
          label="Sign out"
          onClick={onSignOut}
          ariaLabel="Sign out of admin"
        />
      </div>
    </aside>
  );
});

export default AdminSidebar;
