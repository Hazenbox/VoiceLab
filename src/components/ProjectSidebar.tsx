import React, { useState, useCallback, memo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAudioLibrary } from '../context/AudioLibraryContext';
import { useThemeColors } from '../theme';

interface ProjectSidebarProps {
  onNavigateToLibrary: () => void;
  isLibraryActive: boolean;
}

/**
 * Left sidebar for projects navigation
 * Library navigation opens a full page instead of sidebar view
 * Memoized to prevent unnecessary re-renders
 */
export const ProjectSidebar = memo(function ProjectSidebar({ 
  onNavigateToLibrary, 
  isLibraryActive 
}: ProjectSidebarProps) {
  const theme = useThemeColors();
  const { projects, activeProject, setActiveProject, createProject, deleteProject } = useProject();
  const { audios } = useAudioLibrary();
  
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = useCallback(() => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName('');
      setIsCreatingProject(false);
    }
  }, [newProjectName, createProject]);

  const handleDeleteProject = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? All associated audios will be deleted.')) {
      deleteProject(id);
    }
  }, [deleteProject]);

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
          src={theme.isLight ? "/jio-voice-lab-light.svg" : "/jio-voice-lab-dark.svg"}
          alt="Jio Voice Lab" 
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
            className="px-2 py-0.5 rounded-md text-xs font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: theme.background.minimal,
              border: `1px solid ${theme.stroke.medium}`,
              color: theme.text.high,
            }}
          >
            + New
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
              <button
                key={project.id}
                onClick={() => setActiveProject(project.id)}
                className="w-full px-2 py-1.5 flex items-center justify-between group transition-all rounded-lg hover:scale-[0.98]"
                style={{
                  backgroundColor: activeProject?.id === project.id ? theme.background.subtle : 'transparent',
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
                
                {projects.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteProject(project.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                    style={{ color: theme.text.low }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Library */}
      <div 
        className="p-1.5"
        style={{ borderTop: `1px solid ${theme.stroke.low}` }}
      >
        <button
          onClick={onNavigateToLibrary}
          className="w-full px-2 py-2 flex items-center gap-2 rounded-lg transition-all hover:scale-[0.98]"
          style={{
            backgroundColor: isLibraryActive ? theme.background.minimal : 'transparent',
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
                backgroundColor: theme.background.subtle,
                color: theme.text.medium 
              }}
            >
              {audios.length}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
});

export default ProjectSidebar;
