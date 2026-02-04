import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAudioLibrary } from '../context/AudioLibraryContext';
import { useThemeColors } from '../theme';

export const ProjectSidebar: React.FC = () => {
  const theme = useThemeColors();
  const { projects, activeProject, setActiveProject, createProject, deleteProject } = useProject();
  const { getAudiosByProject, playAudio, deleteAudio, playingAudioId, stopAudio } = useAudioLibrary();
  
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showLibrary, setShowLibrary] = useState(true);

  const audios = activeProject ? getAudiosByProject(activeProject.id) : [];

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName('');
      setIsCreatingProject(false);
    }
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? All associated audios will be deleted.')) {
      deleteProject(id);
    }
  };

  const handleDeleteAudio = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this audio?')) {
      deleteAudio(id);
    }
  };

  const handlePlayAudio = async (id: string, e: React.MouseEvent) => {
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
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <aside 
      className="w-[280px] h-full flex flex-col overflow-hidden"
      style={{ 
        backgroundColor: theme.background.ghost,
        borderRight: `1px solid ${theme.stroke.low}`
      }}
    >
      {/* Projects Header */}
      <div 
        className="p-3 flex items-center justify-between"
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
          className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors hover:opacity-80"
          style={{
            backgroundColor: theme.background.subtle,
            border: `1px solid ${theme.stroke.medium}`,
            color: theme.text.high,
          }}
        >
          + New
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-shrink-0 overflow-y-auto max-h-[40%]">
        {isCreatingProject && (
          <div className="p-2 space-y-2" style={{ backgroundColor: theme.background.subtle }}>
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
              className="w-full px-2 py-1.5 text-xs rounded border"
              style={{
                backgroundColor: theme.background.ghost,
                borderColor: theme.stroke.medium,
                color: theme.text.high,
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateProject}
                className="flex-1 px-2 py-1 text-xs rounded font-medium"
                style={{
                  backgroundColor: '#f97316',
                  color: 'white',
                }}
              >
                Create
              </button>
              <button
                onClick={() => setIsCreatingProject(false)}
                className="flex-1 px-2 py-1 text-xs rounded font-medium"
                style={{
                  backgroundColor: theme.background.subtle,
                  border: `1px solid ${theme.stroke.medium}`,
                  color: theme.text.high,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => setActiveProject(project.id)}
            className="w-full p-2.5 flex items-center justify-between group transition-colors"
            style={{
              backgroundColor: activeProject?.id === project.id ? theme.background.subtle : 'transparent',
              borderBottom: `1px solid ${theme.stroke.low}`,
            }}
          >
            <div className="flex-1 text-left">
              <div 
                className="text-sm font-medium truncate"
                style={{ color: theme.text.high }}
              >
                {project.name}
              </div>
              <div 
                className="text-xs"
                style={{ color: theme.text.low }}
              >
                {formatDate(project.updatedAt)}
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

      {/* Audio Library */}
      <div 
        className="flex-1 flex flex-col overflow-hidden"
        style={{ borderTop: `1px solid ${theme.stroke.low}` }}
      >
        <button
          onClick={() => setShowLibrary(!showLibrary)}
          className="p-3 flex items-center justify-between transition-colors hover:opacity-80"
          style={{ borderBottom: `1px solid ${theme.stroke.low}` }}
        >
          <h3 
            className="text-sm font-semibold"
            style={{ color: theme.text.high }}
          >
            Audio Library
          </h3>
          <svg 
            className={`w-4 h-4 transition-transform ${showLibrary ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            style={{ color: theme.text.medium }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showLibrary && (
          <div className="flex-1 overflow-y-auto">
            {audios.length === 0 ? (
              <div 
                className="p-4 text-center text-xs"
                style={{ color: theme.text.low }}
              >
                No saved audios yet
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {audios.map((audio) => (
                  <div
                    key={audio.id}
                    className="p-2 rounded-lg group"
                    style={{
                      backgroundColor: theme.background.subtle,
                      border: `1px solid ${theme.stroke.low}`,
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
                          className="text-xs flex items-center gap-2 mt-0.5"
                          style={{ color: theme.text.low }}
                        >
                          <span>{formatDuration(audio.duration)}</span>
                          <span>•</span>
                          <span>{formatDate(audio.createdAt)}</span>
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
        )}
      </div>
    </aside>
  );
};

export default ProjectSidebar;
