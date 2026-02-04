import React, { useState, useCallback, memo } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAudioLibrary } from '../context/AudioLibraryContext';
import { useThemeColors } from '../theme';

type SidebarView = 'projects' | 'library';

/**
 * Left sidebar for projects and audio library
 * Memoized to prevent unnecessary re-renders
 */
export const ProjectSidebar = memo(function ProjectSidebar() {
  const theme = useThemeColors();
  const { projects, activeProject, setActiveProject, createProject, deleteProject } = useProject();
  const { getAudiosByProject, playAudio, deleteAudio, playingAudioId, stopAudio } = useAudioLibrary();
  
  const [activeView, setActiveView] = useState<SidebarView>('projects');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const audios = activeProject ? getAudiosByProject(activeProject.id) : [];

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

  const handleDeleteAudio = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this audio?')) {
      deleteAudio(id);
    }
  }, [deleteAudio]);

  const handlePlayAudio = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingAudioId === id) {
      stopAudio();
    } else {
      try {
        await playAudio(id);
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  }, [playingAudioId, stopAudio, playAudio]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeView === 'projects' ? (
          <>
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
          </>
        ) : (
          <>
            {/* Audio Library View */}
            <div 
              className="p-2 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${theme.stroke.low}` }}
            >
              <h2 
                className="text-sm font-semibold"
                style={{ color: theme.text.high }}
              >
                Audio Library
              </h2>
              {activeProject && (
                <span 
                  className="text-xs"
                  style={{ color: theme.text.low }}
                >
                  {audios.length} {audios.length === 1 ? 'audio' : 'audios'}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-1.5 py-1.5">
              {audios.length === 0 ? (
                <div 
                  className="p-4 text-center text-xs"
                  style={{ color: theme.text.low }}
                >
                  No saved audios yet
                </div>
              ) : (
                <div className="space-y-1">
                  {audios.map((audio) => (
                    <div
                      key={audio.id}
                      className="p-2 rounded-lg group transition-all hover:scale-[0.98]"
                      style={{
                        backgroundColor: theme.background.minimal,
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={(e) => handlePlayAudio(audio.id, e)}
                          className="flex-shrink-0 p-1.5 rounded-full transition-colors"
                          style={{
                            backgroundColor: playingAudioId === audio.id ? '#f97316' : theme.background.ghost,
                            color: playingAudioId === audio.id ? 'white' : theme.text.high,
                          }}
                        >
                          {playingAudioId === audio.id ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div 
                            className="text-xs font-medium truncate"
                            style={{ color: theme.text.high }}
                          >
                            {audio.name}
                          </div>
                          <div 
                            className="text-xs mt-0.5"
                            style={{ color: theme.text.low }}
                          >
                            {formatDuration(audio.duration)}
                          </div>
                        </div>

                        <button
                          onClick={(e) => handleDeleteAudio(audio.id, e)}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                          style={{ color: theme.text.low }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation - Library */}
      <div 
        className="p-1.5"
        style={{ borderTop: `1px solid ${theme.stroke.low}` }}
      >
        <button
          onClick={() => setActiveView(activeView === 'library' ? 'projects' : 'library')}
          className="w-full px-2 py-2 flex items-center gap-2 rounded-lg transition-all hover:scale-[0.98]"
          style={{
            backgroundColor: activeView === 'library' ? theme.background.minimal : 'transparent',
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
          {activeView === 'library' && audios.length > 0 && (
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
