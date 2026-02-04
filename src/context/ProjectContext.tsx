import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Project, ConversationConfig, VoiceGender } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { 
  storageProjects, 
  storageActiveProject, 
  storageAudios,
  generateId 
} from '../services/storage';

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project | null;
  createProject: (name: string) => Project;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  updateProjectConfig: (config: ConversationConfig) => void;
  updateProjectVoiceGender: (gender: VoiceGender) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const useProject = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
};

interface ProjectProviderProps {
  children: React.ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Initialize projects from localStorage
  useEffect(() => {
    const loadedProjects = storageProjects.getAll();
    
    if (loadedProjects.length === 0) {
      // Create default project on first launch
      const defaultProject: Project = {
        id: generateId(),
        name: 'My First Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config: DEFAULT_CONFIG,
        voiceGender: 'female',
      };
      
      storageProjects.save(defaultProject);
      storageActiveProject.set(defaultProject.id);
      setProjects([defaultProject]);
      setActiveProjectId(defaultProject.id);
    } else {
      setProjects(loadedProjects);
      
      // Load active project
      const activeId = storageActiveProject.get();
      if (activeId && loadedProjects.find(p => p.id === activeId)) {
        setActiveProjectId(activeId);
      } else {
        // Set first project as active if no active project or invalid
        setActiveProjectId(loadedProjects[0].id);
        storageActiveProject.set(loadedProjects[0].id);
      }
    }
  }, []);

  const createProject = useCallback((name: string): Project => {
    const newProject: Project = {
      id: generateId(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      config: DEFAULT_CONFIG,
      voiceGender: 'female',
    };

    storageProjects.save(newProject);
    setProjects(prev => [...prev, newProject]);
    
    // Set as active project
    setActiveProjectId(newProject.id);
    storageActiveProject.set(newProject.id);

    return newProject;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => {
    storageProjects.update(id, updates);
    setProjects(prev => 
      prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p)
    );
  }, []);

  const deleteProject = useCallback((id: string) => {
    // Don't delete if it's the last project
    if (projects.length <= 1) {
      console.warn('Cannot delete the last project');
      return;
    }

    storageProjects.delete(id);
    storageAudios.deleteByProjectId(id);
    
    setProjects(prev => {
      const filtered = prev.filter(p => p.id !== id);
      
      // If deleting active project, switch to first remaining project
      if (id === activeProjectId) {
        const newActiveId = filtered[0]?.id;
        if (newActiveId) {
          setActiveProjectId(newActiveId);
          storageActiveProject.set(newActiveId);
        }
      }
      
      return filtered;
    });
  }, [projects.length, activeProjectId]);

  const setActiveProject = useCallback((id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      setActiveProjectId(id);
      storageActiveProject.set(id);
    }
  }, [projects]);

  const updateProjectConfig = useCallback((config: ConversationConfig) => {
    if (activeProjectId) {
      updateProject(activeProjectId, { config });
    }
  }, [activeProjectId, updateProject]);

  const updateProjectVoiceGender = useCallback((gender: VoiceGender) => {
    if (activeProjectId) {
      updateProject(activeProjectId, { voiceGender: gender });
    }
  }, [activeProjectId, updateProject]);

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  const value: ProjectContextValue = {
    projects,
    activeProject,
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
    updateProjectConfig,
    updateProjectVoiceGender,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
