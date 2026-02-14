import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useThemeColors } from '../theme';
import type { ColorMode } from '../types';
import { Button, Avatar, Text, Label, Divider, Input, Icon } from '@marcelinodzn/ds-react';
import { LazyIcon } from '@marcelinodzn/ds-react/icons';
import { DSIcon } from './DSIcon';

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
 * Reusable Sidebar Navigation Item Component
 * Single source of truth for all sidebar navigation items
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
      aria-current={ariaCurrent}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon}
      <Text size="S" weight="low">
        {label}
      </Text>
      {badge}
    </button>
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
  const theme = useThemeColors();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside (excluding both trigger and menu)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => (prev + 1) % options.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => (prev - 1 + options.length) % options.length);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0) {
            onSelect(options[focusedIndex].value);
            onToggle();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onToggle();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, options, onSelect, onToggle]);

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

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute z-50 min-w-[120px] rounded-lg overflow-hidden py-1 right-0"
          style={{
            ...(direction === 'up'
              ? { bottom: 'calc(100% + 0.25rem)' }
              : { top: 'calc(100% + 0.25rem)' }
            ),
            backgroundColor: theme.isLight ? '#ffffff' : '#1f1f1f',
            border: `1px solid ${theme.stroke.low}`,
          }}
          role="menu"
          aria-orientation="vertical"
        >
          {options.map((option, index) => {
            const isFocused = index === focusedIndex;
            
            return (
              <button
                key={option.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(option.value);
                  onToggle();
                }}
                onMouseEnter={() => setFocusedIndex(index)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors mx-1 rounded-md cursor-pointer"
                style={{
                  width: 'calc(100% - 8px)',
                  backgroundColor: isFocused ? theme.stroke.low : 'transparent',
                  color: theme.text.high,
                }}
                role="menuitem"
              >
                {option.icon && (
                  <span className="flex-shrink-0 w-4 h-4">{option.icon}</span>
                )}
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
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
      className="w-full group transition-colors rounded-lg"
      style={{
        backgroundColor: isActive ? theme.stroke.low : (isHovered ? theme.stroke.low : 'transparent'),
        height: '32px',
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
          className="flex-1 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset rounded py-1"
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
      icon: <DSIcon name="IcUser" size="XS" attention="medium" />,
    },
    ...(onNavigateToDesignSystem ? [{
      value: 'design-system',
      label: 'Design System',
      icon: <DSIcon name="IcLayout" size="XS" attention="medium" />,
    }] : []),
    {
      value: 'toggle-theme',
      label: `${colorMode === 'Light' ? 'Dark' : 'Light'} Mode`,
      icon: colorMode === 'Light' 
        ? <DSIcon name="IcNightClear" size="XS" attention="medium" />
        : <DSIcon name="IcSunnyClear" size="XS" attention="medium" />,
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
      case 'toggle-theme':
        onColorModeChange(colorMode === 'Light' ? 'Dark' : 'Light');
        break;
    }
    setIsUserMenuOpen(false);
  }, [onEditProfile, onNavigateToDesignSystem, onColorModeChange, colorMode]);

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
      <Divider />
      <div className="p-2.5 space-y-0.5">
        {/* How it Works Nav Item */}
        {onNavigateToHowItWorks && (
          <SidebarNavItem
            icon={<DSIcon name="IcLightbulb" size="S" attention="high" />}
            label="How it Works"
            onClick={onNavigateToHowItWorks}
            isActive={isHowItWorksActive}
            ariaLabel="Learn how the system works"
          />
        )}

        {/* User Profile Menu */}
        {userName && onEditProfile && (
          <div ref={userMenuContainerRef} className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            onMouseEnter={() => setIsUserProfileHovered(true)}
            onMouseLeave={() => setIsUserProfileHovered(false)}
            className="w-full px-2 py-2 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset"
            style={{
              backgroundColor: isUserProfileHovered ? theme.stroke.low : 'transparent',
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
          
          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div
              className="absolute z-50 min-w-[120px] rounded-lg overflow-hidden py-1 right-0 bottom-full mb-1"
              style={{
                backgroundColor: theme.isLight ? '#ffffff' : '#1f1f1f',
                border: `1px solid ${theme.stroke.low}`,
              }}
              role="menu"
              aria-orientation="vertical"
            >
              {userMenuOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserMenuAction(option.value);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors mx-1 rounded-md cursor-pointer"
                  style={{
                    width: 'calc(100% - 8px)',
                    backgroundColor: 'transparent',
                    color: theme.text.high,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.stroke.low;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  role="menuitem"
                >
                  {option.icon && (
                    <span className="flex-shrink-0 w-4 h-4">{option.icon}</span>
                  )}
                  <span className="truncate">{option.label}</span>
                </button>
              ))}
            </div>
          )}
          </div>
        )}
      </div>
    </aside>
  );
});

export default ProjectSidebar;
