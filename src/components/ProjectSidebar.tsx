import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useThemeColors } from '../theme';
import type { ColorMode } from '../types';
import type { DropdownOption } from './Dropdown';
import { Button } from '@marcelinodzn/ds-react';

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
      <span 
        className="text-xs font-normal"
        style={{ color: theme.text.high, fontSize: '13px' }}
      >
        {label}
      </span>
      {badge}
    </button>
  );
});

/**
 * Simple Menu Component for Project Actions
 * Reuses Dropdown component's menu styling
 */
interface ProjectMenuProps {
  options: DropdownOption[];
  onSelect: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ProjectMenu = memo(function ProjectMenu({
  options,
  onSelect,
  isOpen,
  onToggle,
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="p-1 rounded transition-opacity hover:opacity-70 cursor-pointer"
        style={{ color: theme.text.low }}
        aria-label="Project options"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute z-50 min-w-[120px] rounded-lg overflow-hidden py-1 top-full mt-1 right-0"
          style={{
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
  menuOptions: DropdownOption[];
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
          <div 
            className="text-xs font-normal truncate"
            style={{ color: theme.text.high, fontSize: '13px' }}
          >
            {projectName}
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
  isDesignSystemActive = false,
  onNavigateToHowItWorks,
  isHowItWorksActive = false,
  colorMode,
  onColorModeChange,
  userName,
  userRole,
  onEditProfile,
}: ProjectSidebarProps) {
  const theme = useThemeColors();
  const { projects, activeProject, setActiveProject, createProject, deleteProject, updateProject } = useProject();
  
  
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
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Create</span>
              </div>
            </Button>
          </div>

          {/* Recent title */}
          <div 
            className="px-2 py-1.5 text-xs font-medium"
            style={{ 
              color: 'var(--color-zinc-500)',
              fontSize: '12px',
              letterSpacing: '-0.2px',
            }}
          >
            Recent
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
                    className="w-full px-2 flex items-center rounded-lg"
                    style={{ backgroundColor: theme.stroke.low, height: '32px' }}
                  >
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(project.id);
                        if (e.key === 'Escape') handleRenameCancel();
                      }}
                      onBlur={() => handleRenameSubmit(project.id)}
                      className="flex-1 text-xs font-normal bg-transparent outline-none"
                      style={{ color: theme.text.high }}
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

      {/* Profile Section */}
      {userName && onEditProfile && (
        <div
          onClick={onEditProfile}
          className="px-3 py-3 flex items-center gap-3 cursor-pointer transition-colors"
          style={{
            borderTop: `1px solid ${theme.stroke.low}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.stroke.low;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          role="button"
          aria-label="Edit profile"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onEditProfile();
            }
          }}
        >
          {/* Avatar with initials */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: theme.stroke.medium,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.text.medium,
              fontSize: '0.875rem',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {getInitials(userName)}
          </div>

          {/* Name and role */}
          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
            <div
              className="truncate"
              style={{
                color: theme.text.high,
                fontSize: '0.8125rem',
                fontWeight: 600,
                lineHeight: 1.2,
              }}
            >
              {userName}
            </div>
            <div
              style={{
                color: theme.text.medium,
                fontSize: '0.6875rem',
                lineHeight: 1.2,
              }}
            >
              {formatRole(userRole)}
            </div>
          </div>

          {/* Edit icon */}
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            style={{ color: theme.text.low }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
            />
          </svg>
        </div>
      )}

      {/* Bottom Navigation */}
      <div 
        className="p-2.5 space-y-0.5"
        style={{ borderTop: `1px solid ${theme.stroke.low}` }}
      >
        {/* How it Works Nav Item */}
        {onNavigateToHowItWorks && (
          <SidebarNavItem
            icon={
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: theme.text.high }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
            label="How it Works"
            onClick={onNavigateToHowItWorks}
            isActive={isHowItWorksActive}
            ariaLabel="Learn how the system works"
          />
        )}

        {/* Design System Nav Item */}
        {onNavigateToDesignSystem && (
          <SidebarNavItem
            icon={
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                style={{ color: isDesignSystemActive ? theme.accent : theme.text.high }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v9a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
              </svg>
            }
            label="Design System"
            onClick={onNavigateToDesignSystem}
            isActive={isDesignSystemActive}
            ariaLabel="Open design system library"
          />
        )}

        {/* Dark Mode Toggle */}
        <SidebarNavItem
          icon={
            colorMode === 'Light' ? (
              // Moon icon for dark mode
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" style={{ color: theme.text.high }}>
                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
              </svg>
            ) : (
              // Sun icon for light mode
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.text.high }}>
                <circle cx="12" cy="12" r="4" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            )
          }
          label={`${colorMode === 'Light' ? 'Dark' : 'Light'} Mode`}
          onClick={() => onColorModeChange(colorMode === 'Light' ? 'Dark' : 'Light')}
          ariaLabel={`Switch to ${colorMode === 'Light' ? 'dark' : 'light'} mode`}
        />
      </div>
    </aside>
  );
});

export default ProjectSidebar;
