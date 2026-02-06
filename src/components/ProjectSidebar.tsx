import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAudioLibrary } from '../context/AudioLibraryContext';
import { useThemeColors } from '../theme';
import type { ColorMode } from '../types';

interface ProjectSidebarProps {
  onNavigateToLibrary: () => void;
  isLibraryActive: boolean;
  onNavigateToUsage?: () => void;
  onProjectSelect?: () => void;
  onNavigateToDesignSystem?: () => void;
  isDesignSystemActive?: boolean;
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
}

/**
 * Left sidebar for projects navigation
 * Library navigation opens a full page instead of sidebar view
 * Memoized to prevent unnecessary re-renders
 */
export const ProjectSidebar = memo(function ProjectSidebar({ 
  onNavigateToLibrary, 
  isLibraryActive,
  onNavigateToUsage,
  onProjectSelect,
  onNavigateToDesignSystem,
  isDesignSystemActive = false,
  colorMode,
  onColorModeChange,
}: ProjectSidebarProps) {
  const theme = useThemeColors();
  const { projects, activeProject, setActiveProject, createProject, deleteProject, updateProject } = useProject();
  const { audios } = useAudioLibrary();
  
  
  // More menu state
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [menuFocusIndex, setMenuFocusIndex] = useState(0);
  const [renamingProject, setRenamingProject] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenFor(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset focus index when menu opens
  useEffect(() => {
    if (menuOpenFor) {
      setMenuFocusIndex(0);
    }
  }, [menuOpenFor]);

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
    setMenuOpenFor(null);
  }, [deleteProject]);

  const handleStartRename = useCallback((project: { id: string; name: string }) => {
    setRenamingProject(project.id);
    setRenameValue(project.name);
    setMenuOpenFor(null);
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

  // Keyboard navigation for more menu
  useEffect(() => {
    if (!menuOpenFor) return;
    
    const currentProject = projects.find(p => p.id === menuOpenFor);
    const menuItemCount = projects.length > 1 ? 2 : 1; // Rename + Delete (if allowed)

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setMenuFocusIndex(prev => (prev + 1) % menuItemCount);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setMenuFocusIndex(prev => (prev - 1 + menuItemCount) % menuItemCount);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (menuFocusIndex === 0 && currentProject) {
            handleStartRename(currentProject);
          } else if (menuFocusIndex === 1 && menuOpenFor) {
            handleDeleteProject(menuOpenFor);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setMenuOpenFor(null);
          break;
        case 'Tab':
          e.preventDefault();
          setMenuFocusIndex(prev => (prev + 1) % menuItemCount);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpenFor, menuFocusIndex, projects, handleStartRename, handleDeleteProject]);

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
          className="h-7"
        />
      </div>

      {/* Main Content Area - Projects */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Projects Header */}
        <div 
          className="px-3 py-2 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${theme.stroke.low}` }}
        >
          <h2 
            className="text-sm font-semibold"
            style={{ color: theme.text.high }}
          >
            Projects
          </h2>
          <button
            onClick={() => createProject()}
            className="p-1.5 rounded-full transition-colors hover:opacity-70 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
            style={{
              backgroundColor: theme.stroke.low,
              color: theme.text.medium,
            }}
            aria-label="Create new project"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1.5">
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
                  <button
                    onClick={() => {
                      setActiveProject(project.id);
                      onProjectSelect?.();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveProject(project.id);
                        onProjectSelect?.();
                      }
                    }}
                    className="w-full px-2 py-1 flex items-center justify-between group transition-colors rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset"
                    style={{
                      backgroundColor: activeProject?.id === project.id ? theme.stroke.low : 'transparent',
                      height: '32px',
                    }}
                    aria-selected={activeProject?.id === project.id}
                    role="option"
                  >
                    <div className="flex-1 text-left">
                      <div 
                        className="text-xs font-normal truncate"
                        style={{ color: theme.text.high }}
                      >
                        {project.name}
                      </div>
                    </div>
                    
                    {/* More menu button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenFor(menuOpenFor === project.id ? null : project.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity hover:opacity-70 cursor-pointer"
                      style={{ color: theme.text.low }}
                      aria-label="Project options"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </button>
                )}

                {/* Dropdown menu */}
                {menuOpenFor === project.id && (
                  <div 
                    ref={menuRef}
                    className="absolute right-0 top-full mt-1 z-50 min-w-[100px] rounded-lg overflow-hidden py-1"
                    style={{
                      backgroundColor: theme.background.ghost,
                      border: `1px solid ${theme.stroke.medium}`,
                    }}
                    role="menu"
                    aria-orientation="vertical"
                  >
                    <button
                      onClick={() => handleStartRename(project)}
                      onMouseEnter={() => setMenuFocusIndex(0)}
                      className="w-full px-3 py-1.5 text-left text-xs transition-colors mx-0 cursor-pointer"
                      style={{ 
                        color: theme.text.high,
                        backgroundColor: menuFocusIndex === 0 ? theme.stroke.low : 'transparent',
                      }}
                      role="menuitem"
                    >
                      Rename
                    </button>
                    {projects.length > 1 && (
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        onMouseEnter={() => setMenuFocusIndex(1)}
                        className="w-full px-3 py-1.5 text-left text-xs transition-colors mx-0 cursor-pointer"
                        style={{ 
                          color: theme.text.high,
                          backgroundColor: menuFocusIndex === 1 ? theme.stroke.low : 'transparent',
                        }}
                        role="menuitem"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Library & Usage */}
      <div 
        className="p-2.5 space-y-0.5"
        style={{ borderTop: `1px solid ${theme.stroke.low}` }}
      >
        <button
          onClick={onNavigateToLibrary}
          className="w-full px-2 flex items-center gap-2 rounded-lg transition-colors group cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset"
          style={{
            backgroundColor: isLibraryActive ? theme.stroke.low : 'transparent',
            height: '32px',
          }}
          aria-current={isLibraryActive ? 'page' : undefined}
          onMouseEnter={(e) => {
            if (!isLibraryActive) {
              e.currentTarget.style.backgroundColor = theme.stroke.low;
            }
          }}
          onMouseLeave={(e) => {
            if (!isLibraryActive) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            style={{ color: theme.text.high }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <span 
            className="text-xs font-normal"
            style={{ color: theme.text.high }}
          >
            Library
          </span>
          {audios.length > 0 && (
            <span 
              className="ml-auto text-xs px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: theme.stroke.low,
                color: theme.text.medium 
              }}
            >
              {audios.length}
            </span>
          )}
        </button>

        {onNavigateToUsage && (
          <button
            onClick={onNavigateToUsage}
            className="w-full px-2 flex items-center gap-2 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset"
            style={{
              backgroundColor: 'transparent',
              height: '32px',
            }}
            aria-label="View usage statistics"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.stroke.low;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: theme.text.high }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span 
              className="text-xs font-normal"
              style={{ color: theme.text.high }}
            >
              Usage
            </span>
          </button>
        )}

        {/* Design System Nav Item */}
        {onNavigateToDesignSystem && (
          <button
            onClick={onNavigateToDesignSystem}
            className="w-full px-2 flex items-center gap-2 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset"
            style={{
              backgroundColor: isDesignSystemActive ? theme.stroke.low : 'transparent',
              height: '32px',
            }}
            aria-label="Open design system library"
            onMouseEnter={(e) => {
              if (!isDesignSystemActive) {
                e.currentTarget.style.backgroundColor = theme.stroke.low;
              }
            }}
            onMouseLeave={(e) => {
              if (!isDesignSystemActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: isDesignSystemActive ? theme.accent : theme.text.high }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v9a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
            </svg>
            <span 
              className="text-xs font-normal"
              style={{ color: isDesignSystemActive ? theme.accent : theme.text.high }}
            >
              Design System
            </span>
          </button>
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={() => onColorModeChange(colorMode === 'Light' ? 'Dark' : 'Light')}
          className="w-full px-2 flex items-center gap-2 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset"
          style={{
            backgroundColor: 'transparent',
            height: '32px',
          }}
          aria-label={`Switch to ${colorMode === 'Light' ? 'dark' : 'light'} mode`}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.stroke.low;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {colorMode === 'Light' ? (
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
          )}
          <span 
            className="text-xs font-normal"
            style={{ color: theme.text.high }}
          >
            {colorMode === 'Light' ? 'Dark' : 'Light'} Mode
          </span>
        </button>
      </div>
    </aside>
  );
});

export default ProjectSidebar;
