import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAudioLibrary } from '../context/AudioLibraryContext';
import { useThemeColors } from '../theme';

interface ProjectSidebarProps {
  onNavigateToLibrary: () => void;
  isLibraryActive: boolean;
  onNavigateToUsage?: () => void;
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
}: ProjectSidebarProps) {
  const theme = useThemeColors();
  const { projects, activeProject, setActiveProject, createProject, deleteProject, updateProject } = useProject();
  const { audios } = useAudioLibrary();
  
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  // More menu state
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
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

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renamingProject && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingProject]);

  const handleCreateProject = useCallback(() => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName('');
      setIsCreatingProject(false);
    }
  }, [newProjectName, createProject]);

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

  return (
    <aside 
      className="w-[240px] h-full flex flex-col overflow-hidden"
      style={{ 
        backgroundColor: theme.background.ghost,
        borderRight: `1px solid ${theme.stroke.low}`
      }}
    >
      {/* Logo */}
      <div className="p-2">
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
          className="p-2 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${theme.stroke.low}` }}
        >
          <h2 
            className="text-sm font-semibold"
            style={{ color: theme.text.high }}
          >
            Projects
          </h2>
          <button
            onClick={() => setIsCreatingProject(true)}
            className="p-1.5 rounded-full transition-colors hover:opacity-70"
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
        <div className="flex-1 overflow-y-auto px-1.5 py-1.5">
          {isCreatingProject && (
            <div className="mb-2 p-1.5 space-y-2 rounded-lg" style={{ backgroundColor: theme.background.minimal }}>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject();
                  if (e.key === 'Escape') setIsCreatingProject(false);
                }}
                placeholder="Project name..."
                autoFocus
                className="w-full px-2 py-1.5 text-xs rounded-md border"
                style={{
                  backgroundColor: theme.background.ghost,
                  borderColor: theme.stroke.medium,
                  color: theme.text.high,
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateProject}
                  className="flex-1 px-1.5 py-0.5 text-xs rounded-md font-medium"
                  style={{
                    backgroundColor: '#f97316',
                    color: 'white',
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreatingProject(false)}
                  className="flex-1 px-1.5 py-0.5 text-xs rounded-md font-medium"
                  style={{
                    backgroundColor: theme.background.minimal,
                    border: `1px solid ${theme.stroke.medium}`,
                    color: theme.text.high,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-0.5">
            {projects.map((project) => (
              <div
                key={project.id}
                className="relative"
              >
                {renamingProject === project.id ? (
                  // Rename input mode
                  <div 
                    className="w-full px-2 py-1 flex items-center rounded-lg"
                    style={{ backgroundColor: theme.stroke.low }}
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
                      className="flex-1 text-xs font-medium bg-transparent outline-none"
                      style={{ color: theme.text.high }}
                    />
                  </div>
                ) : (
                  // Normal project item
                  <button
                    onClick={() => setActiveProject(project.id)}
                    className="w-full px-2 py-1 flex items-center justify-between group transition-colors rounded-lg"
                    style={{
                      backgroundColor: activeProject?.id === project.id ? theme.stroke.low : 'transparent',
                      height: '32px',
                    }}
                  >
                    <div className="flex-1 text-left">
                      <div 
                        className="text-xs font-medium truncate"
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
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity hover:opacity-70"
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
                    className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-lg shadow-lg overflow-hidden"
                    style={{
                      backgroundColor: theme.background.ghost,
                      border: `1px solid ${theme.stroke.medium}`,
                    }}
                  >
                    <button
                      onClick={() => handleStartRename(project)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:opacity-80"
                      style={{ color: theme.text.high }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Rename
                    </button>
                    {projects.length > 1 && (
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:opacity-80"
                        style={{ color: '#ef4444' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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
        className="p-1.5 space-y-1"
        style={{ borderTop: `1px solid ${theme.stroke.low}` }}
      >
        <button
          onClick={onNavigateToLibrary}
          className="w-full px-2 py-2 flex items-center gap-2 rounded-lg transition-colors"
          style={{
            backgroundColor: isLibraryActive ? theme.stroke.low : 'transparent',
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
            className="text-xs font-medium"
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
            className="w-full px-2 py-2 flex items-center gap-2 rounded-lg transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'transparent',
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
              className="text-xs font-medium"
              style={{ color: theme.text.high }}
            >
              Usage
            </span>
          </button>
        )}
      </div>
    </aside>
  );
});

export default ProjectSidebar;
