import React, { useState, useMemo } from 'react';
import { useAudioLibrary } from '../context/AudioLibraryContext';
import { useProject } from '../context/ProjectContext';
import { useThemeColors } from '../theme';
import type { SavedAudio } from '../types';

type ViewMode = 'list' | 'grid';

interface LibraryPageProps {
  onBack: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ onBack }) => {
  const theme = useThemeColors();
  const { audios, playAudio, stopAudio, playingAudioId, deleteAudio, updateAudioName, downloadAudio } = useAudioLibrary();
  const { projects } = useProject();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAudioId, setEditingAudioId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Get project name by ID
  const getProjectName = (projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  // Filter audios by search query
  const filteredAudios = useMemo(() => {
    if (!searchQuery.trim()) return audios;
    const query = searchQuery.toLowerCase();
    return audios.filter(audio => 
      audio.name.toLowerCase().includes(query) ||
      getProjectName(audio.projectId).toLowerCase().includes(query)
    );
  }, [audios, searchQuery, projects]);

  // Sort by creation date (newest first)
  const sortedAudios = useMemo(() => {
    return [...filteredAudios].sort((a, b) => b.createdAt - a.createdAt);
  }, [filteredAudios]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const handlePlayAudio = async (id: string) => {
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

  const handleDeleteAudio = (id: string) => {
    if (confirm('Are you sure you want to delete this audio?')) {
      deleteAudio(id);
    }
  };

  const handleStartEdit = (audio: SavedAudio) => {
    setEditingAudioId(audio.id);
    setEditingName(audio.name);
  };

  const handleSaveEdit = () => {
    if (editingAudioId && editingName.trim()) {
      updateAudioName(editingAudioId, editingName.trim());
    }
    setEditingAudioId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingAudioId(null);
    setEditingName('');
  };

  return (
    <div 
      className="h-full flex flex-col"
      style={{ backgroundColor: theme.background.ghost }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: `1px solid ${theme.stroke.low}` }}
      >
        <div className="flex items-center gap-2">
          <h1 
            className="text-lg font-semibold"
            style={{ color: theme.text.high }}
          >
            Audio Library
          </h1>
          <span 
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ 
              backgroundColor: theme.stroke.low,
              color: theme.text.medium 
            }}
          >
            {audios.length} {audios.length === 1 ? 'audio' : 'audios'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audios..."
              className="pl-8 pr-4 py-1.5 text-sm rounded-full border"
              style={{
                backgroundColor: theme.background.ghost,
                borderColor: theme.stroke.medium,
                color: theme.text.high,
                width: '200px'
              }}
            />
            <svg 
              className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: theme.text.low }}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* View Toggle */}
          <div 
            className="flex rounded-lg overflow-hidden"
            style={{ border: `1px solid ${theme.stroke.medium}` }}
          >
            <button
              onClick={() => setViewMode('list')}
              className="p-1.5 transition-colors cursor-pointer"
              style={{
                backgroundColor: viewMode === 'list' ? theme.stroke.low : 'transparent',
                color: theme.text.high
              }}
              title="List view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className="p-1.5 transition-colors cursor-pointer"
              style={{
                backgroundColor: viewMode === 'grid' ? theme.stroke.low : 'transparent',
                color: theme.text.high
              }}
              title="Grid view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {sortedAudios.length === 0 ? (
          /* Empty State */
          <div 
            className="flex flex-col items-center justify-center h-full text-center"
            style={{ color: theme.text.low }}
          >
            <svg 
              className="w-16 h-16 mb-4"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style={{ color: theme.text.low }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <h3 className="text-base font-medium mb-1" style={{ color: theme.text.medium }}>
              {searchQuery ? 'No audios found' : 'No audios saved yet'}
            </h3>
            <p className="text-sm">
              {searchQuery 
                ? 'Try a different search term'
                : 'Generate audio and save it to your library'
              }
            </p>
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="space-y-1">
            {sortedAudios.map((audio) => (
              <div
                key={audio.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg group transition-colors"
                style={{ backgroundColor: theme.stroke.low }}
              >
                {/* Play Button */}
                <button
                  onClick={() => handlePlayAudio(audio.id)}
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                  style={{
                    backgroundColor: playingAudioId === audio.id ? '#f97316' : theme.background.ghost,
                    color: playingAudioId === audio.id ? 'white' : theme.text.high,
                  }}
                >
                  {playingAudioId === audio.id ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  {editingAudioId === audio.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      onBlur={handleSaveEdit}
                      autoFocus
                      className="w-full px-2 py-0.5 text-sm rounded border"
                      style={{
                        backgroundColor: theme.background.ghost,
                        borderColor: theme.stroke.medium,
                        color: theme.text.high,
                      }}
                    />
                  ) : (
                    <div 
                      className="text-sm font-medium truncate cursor-pointer hover:underline"
                      style={{ color: theme.text.high }}
                      onClick={() => handleStartEdit(audio)}
                      title="Click to edit name"
                    >
                      {audio.name}
                    </div>
                  )}
                </div>

                {/* Project Badge */}
                <span 
                  className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ 
                    backgroundColor: theme.background.subtle,
                    color: theme.text.medium 
                  }}
                >
                  {getProjectName(audio.projectId)}
                </span>

                {/* Duration */}
                <span 
                  className="text-xs flex-shrink-0 w-12 text-right"
                  style={{ color: theme.text.low }}
                >
                  {formatDuration(audio.duration)}
                </span>

                {/* Date */}
                <span 
                  className="text-xs flex-shrink-0 w-16 text-right"
                  style={{ color: theme.text.low }}
                >
                  {formatDate(audio.createdAt)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => downloadAudio(audio.id)}
                    className="p-1.5 rounded transition-colors hover:opacity-80 cursor-pointer"
                    style={{ color: theme.text.medium }}
                    title="Download"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteAudio(audio.id)}
                    className="p-1.5 rounded transition-colors hover:opacity-80 cursor-pointer"
                    style={{ color: theme.text.low }}
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedAudios.map((audio) => (
              <div
                key={audio.id}
                className="rounded-lg overflow-hidden group transition-colors"
                style={{ backgroundColor: theme.stroke.low }}
              >
                {/* Waveform/Thumbnail Area */}
                <div 
                  className="relative h-24 flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.isLight ? '#f97316' : '#ea580c'}20, ${theme.isLight ? '#f97316' : '#ea580c'}40)` 
                  }}
                >
                  {/* Waveform visualization placeholder */}
                  <div className="flex items-end gap-0.5 h-12">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full"
                        style={{
                          height: `${Math.random() * 100}%`,
                          backgroundColor: theme.isLight ? '#f9731680' : '#ea580c80',
                        }}
                      />
                    ))}
                  </div>
                  
                  {/* Play overlay */}
                  <button
                    onClick={() => handlePlayAudio(audio.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: playingAudioId === audio.id ? '#f97316' : 'white',
                        color: playingAudioId === audio.id ? 'white' : '#1a1a1a',
                      }}
                    >
                      {playingAudioId === audio.id ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </div>
                  </button>
                </div>

                {/* Info */}
                <div className="p-3">
                  {editingAudioId === audio.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      onBlur={handleSaveEdit}
                      autoFocus
                      className="w-full px-2 py-0.5 text-sm rounded border mb-2"
                      style={{
                        backgroundColor: theme.background.ghost,
                        borderColor: theme.stroke.medium,
                        color: theme.text.high,
                      }}
                    />
                  ) : (
                    <div 
                      className="text-sm font-medium truncate mb-1 cursor-pointer hover:underline"
                      style={{ color: theme.text.high }}
                      onClick={() => handleStartEdit(audio)}
                      title="Click to edit name"
                    >
                      {audio.name}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-xs truncate"
                      style={{ color: theme.text.low }}
                    >
                      {getProjectName(audio.projectId)}
                    </span>
                    <span 
                      className="text-xs"
                      style={{ color: theme.text.low }}
                    >
                      {formatDuration(audio.duration)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => downloadAudio(audio.id)}
                      className="p-1 rounded transition-colors hover:opacity-80 cursor-pointer"
                      style={{ color: theme.text.medium }}
                      title="Download"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteAudio(audio.id)}
                      className="p-1 rounded transition-colors hover:opacity-80 cursor-pointer"
                      style={{ color: theme.text.low }}
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryPage;
