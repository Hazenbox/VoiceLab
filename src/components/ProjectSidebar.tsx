import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useThemeColors } from '../theme';
import type { ColorMode } from '../types';
import { Button, Avatar, Text, Label, Divider, Input, Icon } from '@marcelinodzn/ds-react';
import { LazyIcon } from '@marcelinodzn/ds-react/icons';
import { DSIcon } from './DSIcon';
import { DropdownMenu, type DropdownMenuItem } from './DropdownMenu';

// ── Local Types ──────────────────────────────────────────────────
// Previously imported from ./Dropdown -- inlined here for independence
interface MenuOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
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

// ── Types ────────────────────────────────────────────────────────

interface ProjectSidebarProps {
  onProjectSelect?: () => void;
  onNavigateToDesignSystem?: () => void;
  isDesignSystemActive?: boolean;
  onNavigateToHowItWorks?: () => void;
  isHowItWorksActive?: boolean;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  userName?: string;
  userRole?: string;
  onEditProfile?: () => void;
}

/**
 * Base Sidebar Item Component
 * Supports both navigation and menu item variants
 */
interface SidebarItemProps {
  variant: 'nav' | 'menu';
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  isActive?: boolean;
  onClick: () => void;
  ariaLabel?: string;
  ariaCurrent?: boolean | 'page';
}

export const SidebarItem = memo(function SidebarItem({
  variant,
  label,
  icon,
  badge,
  isActive = false,
  onClick,
  ariaLabel,
  ariaCurrent,
}: SidebarItemProps) {
  const theme = useThemeColors();
  const [isHovered, setIsHovered] = useState(false);

  const isNav = variant === 'nav';
  const isMenu = variant === 'menu';

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-left transition-colors cursor-pointer w-full px-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset"
      style={{
        backgroundColor: isActive ? theme.stroke.low : (isHovered ? theme.stroke.low : 'transparent'),
        height: '32px',
      }}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      role={isMenu ? 'menuitem' : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon && (
        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">{icon}</span>
      )}
      <Text size="S" weight="low">
        {label}
      </Text>
      {badge}
    </button>
  );
});

/**
 * Reusable Sidebar Navigation Item Component
 * Wrapper around SidebarItem with nav variant
 */
interface SidebarNavItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  badge?: React.ReactNode;
  ariaLabel?: string;
  ariaCurrent?: 'page' | undefined;
}

const SidebarNavItem = memo(function SidebarNavItem({
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

/**
 * Simple Menu Component for Project Actions
 * Reuses Dropdown component's menu styling
 */
interface ProjectMenuProps {
  options: MenuOption[];
  onSelect: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  direction?: 'up' | 'down';
}

const ProjectMenu = memo(function ProjectMenu({
  options,
  onSelect,
  isOpen,
  onToggle,
  direction = 'down',
}: ProjectMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger Button */}
      <Button
        onPress={(e) => {
          e?.stopPropagation?.();
          onToggle();
        }}
        size="XS"
        appearance="neutral"
        attention="low"
        single
        aria-label="Project options"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Icon size="S" attention="low" asset={<LazyIcon name="IcMoreHorizontal" />} />
      </Button>

      <DropdownMenu
        isOpen={isOpen}
        onClose={onToggle}
        items={options}
        onSelect={onSelect}
        direction={direction}
        width="219px"
        showIcons={true}
        anchorRef={containerRef}
      />
    </div>
  );
});

/**
 * Sidebar Project Item Component
 * Specialized for project list items with dropdown menu
 */
interface SidebarProjectItemProps {
  projectName: string;
  isActive: boolean;
  onClick: () => void;
  menuOptions: MenuOption[];
  onMenuAction: (action: string) => void;
}

const SidebarProjectItem = memo(function SidebarProjectItem({
  projectName,
  isActive,
  onClick,
  menuOptions,
  onMenuAction,
}: SidebarProjectItemProps) {
  const theme = useThemeColors();
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div
      className="w-full group transition-colors rounded-xl"
      style={{
        backgroundColor: isActive ? theme.stroke.low : (isHovered ? theme.stroke.low : 'transparent'),
        height: '36px',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="option"
      aria-selected={isActive}
    >
      <div className="flex items-center justify-between h-full" style={{ paddingLeft: '10px', paddingRight: '4px' }}>
        {/* Project name button */}
        <button
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }}
          className="flex-1 text-left cursor-pointer focus:outline-none rounded py-1"
        >
          <div className="truncate">
            <Text size="S" weight="low">
              {projectName}
            </Text>
          </div>
        </button>
        
        {/* More menu - visible on hover or when open */}
        <div className={`transition-opacity ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <ProjectMenu
            options={menuOptions}
            onSelect={onMenuAction}
            isOpen={isMenuOpen}
            onToggle={() => setIsMenuOpen(!isMenuOpen)}
          />
        </div>
      </div>
    </div>
  );
});

/**
 * Left sidebar for projects navigation
 * Library navigation opens a full page instead of sidebar view
 * Memoized to prevent unnecessary re-renders
 */
export const ProjectSidebar = memo(function ProjectSidebar({ 
  onProjectSelect,
  onNavigateToDesignSystem,
  isDesignSystemActive: _isDesignSystemActive = false,
  onNavigateToHowItWorks,
  isHowItWorksActive = false,
  colorMode,
  onColorModeChange,
  userName,
  userRole,
  onEditProfile,
}: ProjectSidebarProps) {
  // Note: _isDesignSystemActive is available but not currently used
  void _isDesignSystemActive;
  const theme = useThemeColors();
  const { projects, activeProject, setActiveProject, createProject, deleteProject, updateProject } = useProject();
  
  // User menu state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isUserProfileHovered, setIsUserProfileHovered] = useState(false);
  const userMenuContainerRef = useRef<HTMLDivElement>(null);
  
  // Rename state
  const [renamingProject, setRenamingProject] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renamingProject && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingProject]);

  // Close user menu on click outside
  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuContainerRef.current && !userMenuContainerRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);


  const handleDeleteProject = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this project? All associated audios will be deleted.')) {
      deleteProject(id);
    }
  }, [deleteProject]);

  const handleStartRename = useCallback((project: { id: string; name: string }) => {
    setRenamingProject(project.id);
    setRenameValue(project.name);
  }, []);

  const handleRenameSubmit = useCallback((id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed.length > 0) {
      updateProject(id, { name: trimmed });
    }
    setRenamingProject(null);
    setRenameValue('');
  }, [renameValue, updateProject]);

  const handleRenameCancel = useCallback(() => {
    setRenamingProject(null);
    setRenameValue('');
  }, []);

  // User menu options
  const userMenuOptions: MenuOption[] = [
    {
      value: 'edit-profile',
      label: 'Edit Profile',
      icon: <DSIcon name="IcUser" size="S" attention="high" appearance="neutral" />,
    },
    ...(onNavigateToDesignSystem ? [{
      value: 'design-system',
      label: 'Design System',
      icon: <DSIcon name="IcLayout" size="S" attention="high" appearance="neutral" />,
    }] : []),
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
      case 'design-system':
        onNavigateToDesignSystem?.();
        break;
      case 'how-it-works':
        onNavigateToHowItWorks?.();
        break;
      case 'toggle-theme':
        onColorModeChange(colorMode === 'Light' ? 'Dark' : 'Light');
        break;
    }
    setIsUserMenuOpen(false);
  }, [onEditProfile, onNavigateToDesignSystem, onNavigateToHowItWorks, onColorModeChange, colorMode]);

  return (
    <aside 
      className="w-[240px] h-full flex flex-col overflow-hidden"
      style={{ 
        backgroundColor: theme.background.ghost,
        borderRight: `1px solid ${theme.stroke.low}`
      }}
    >
      {/* Logo */}
      <div className="p-3">
        <img 
          src={theme.isLight ? "/jio-voice-lab-light.svg?v=3" : "/jio-voice-lab-dark.svg?v=3"}
          alt="Jio Tone Studio" 
          className="h-8"
        />
      </div>

      {/* Main Content Area - Projects */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Projects List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1.5 scrollable-container">
          {/* New Project Button */}
          <div className="mb-4">
            <Button
              onPress={() => createProject()}
              appearance="primary"
              size="S"
              fullWidth
              aria-label="Create new project"
            >
              <div className="flex items-center gap-2">
                <DSIcon name="IcAdd" size="XS" attention="high" />
                <span>Create</span>
              </div>
            </Button>
          </div>

          {/* Recent title */}
          <div className="px-2 py-1.5">
            <Label size="XS" weight="medium" attention="low" as="span">
              Recents
            </Label>
          </div>

          <div className="space-y-0.5" role="listbox" aria-label="Projects list">
            {projects.map((project) => (
              <div
                key={project.id}
                className="relative"
              >
                {renamingProject === project.id ? (
                  // Rename input mode - match 32px height of normal items
                  <div 
                    className="w-full flex items-center rounded-lg"
                    style={{ backgroundColor: theme.stroke.low, height: '32px' }}
                  >
                    <Input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(val: string) => setRenameValue(val)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter') handleRenameSubmit(project.id);
                        if (e.key === 'Escape') handleRenameCancel();
                      }}
                      onBlur={() => handleRenameSubmit(project.id)}
                      aria-label="Rename project"
                    />
                  </div>
                ) : (
                  // Normal project item
                  <SidebarProjectItem
                    projectName={project.name}
                    isActive={activeProject?.id === project.id}
                    onClick={() => {
                      setActiveProject(project.id);
                      onProjectSelect?.();
                    }}
                    menuOptions={[
                      { value: 'rename', label: 'Rename' },
                      ...(projects.length > 1 ? [{ value: 'delete', label: 'Delete' }] : []),
                    ]}
                    onMenuAction={(action) => {
                      if (action === 'rename') {
                        handleStartRename(project);
                      } else if (action === 'delete') {
                        handleDeleteProject(project.id);
                      }
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <Divider attention="low" />
      <div className="p-2.5 space-y-0.5">
        {/* User Profile Menu */}
        {userName && onEditProfile && (
          <div ref={userMenuContainerRef} className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            onMouseEnter={() => setIsUserProfileHovered(true)}
            onMouseLeave={() => setIsUserProfileHovered(false)}
            className="w-full px-2 py-2 rounded-xl transition-colors cursor-pointer focus:outline-none"
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
            width="219px"
            showIcons={true}
            anchorRef={userMenuContainerRef}
          />
          </div>
        )}
      </div>
    </aside>
  );
});

export default ProjectSidebar;
