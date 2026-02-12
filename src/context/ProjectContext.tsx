import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  Project, 
  ConversationConfig, 
  VoiceGender, 
  Channel, 
  Platform,
  // New Content Trust System types
  ContentChannelType,
  EcosystemType,
  SupportedLanguage,
  IndianRegion,
} from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { 
  storageProjects, 
  storageActiveProject, 
  storageAudios,
  generateId 
} from '../services/storage';

// =============================================================================
// Migration Maps: Old Types -> New Types
// =============================================================================

/** Map old Channel type to new ContentChannelType */
const CHANNEL_MIGRATION: Record<Channel, ContentChannelType> = {
  'sms': 'sms',
  'whatsapp': 'whatsapp_alert',
  'email': 'transactional_email',
};

/** Map old Platform type to new EcosystemType */
const PLATFORM_MIGRATION: Record<Platform, EcosystemType> = {
  'notifications': 'connectivity',
  'banner': 'entertainment',
  'ads': 'shopping',
};

/** Migrate a project's old fields to new Content Trust fields */
function migrateProject(project: Project): Project {
  const migrated = { ...project };
  
  // Migrate channel -> defaultChannel if not already set
  if (!migrated.defaultChannel && migrated.channel) {
    migrated.defaultChannel = CHANNEL_MIGRATION[migrated.channel];
  }
  
  // Migrate platform -> defaultEcosystem if not already set
  if (!migrated.defaultEcosystem && migrated.platform) {
    migrated.defaultEcosystem = PLATFORM_MIGRATION[migrated.platform];
  }
  
  return migrated;
}

// =============================================================================
// Context Interface
// =============================================================================

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project | null;
  createProject: (name?: string) => Project;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  updateProjectConfig: (config: ConversationConfig) => void;
  updateProjectVoiceGender: (gender: VoiceGender) => void;
  
  // Legacy methods (kept for backward compatibility)
  /** @deprecated Use updateProjectDefaultChannel instead */
  updateProjectChannel: (channel: Channel) => void;
  /** @deprecated Use updateProjectDefaultEcosystem instead */
  updateProjectPlatform: (platform: Platform) => void;
  
  // New Content Trust System methods
  updateProjectDefaultChannel: (channel: ContentChannelType) => void;
  updateProjectDefaultEcosystem: (ecosystem: EcosystemType) => void;
  updateProjectDefaultLanguage: (language: SupportedLanguage) => void;
  updateProjectDefaultRegion: (region: IndianRegion) => void;
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

  // Initialize projects from localStorage with migration
  useEffect(() => {
    const rawProjects = storageProjects.getAll();
    
    if (rawProjects.length === 0) {
      // Create default project on first launch with new Content Trust defaults
      const defaultProject: Project = {
        id: generateId(),
        name: 'My First Project',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config: DEFAULT_CONFIG,
        voiceGender: 'female',
        // New Content Trust defaults
        defaultEcosystem: 'connectivity',
        defaultChannel: 'push_notification',
        defaultLanguage: 'english',
        defaultRegion: 'pan_india',
      };
      
      storageProjects.save(defaultProject);
      storageActiveProject.set(defaultProject.id);
      setProjects([defaultProject]);
      setActiveProjectId(defaultProject.id);
    } else {
      // Migrate old projects to new Content Trust fields
      const migratedProjects = rawProjects.map(project => {
        const migrated = migrateProject(project);
        // Only save if migration changed something
        if (migrated.defaultChannel !== project.defaultChannel || 
            migrated.defaultEcosystem !== project.defaultEcosystem) {
          storageProjects.update(project.id, {
            defaultChannel: migrated.defaultChannel,
            defaultEcosystem: migrated.defaultEcosystem,
          });
        }
        return migrated;
      });
      
      setProjects(migratedProjects);
      
      // Load active project
      const activeId = storageActiveProject.get();
      if (activeId && migratedProjects.find(p => p.id === activeId)) {
        setActiveProjectId(activeId);
      } else {
        // Set first project as active if no active project or invalid
        setActiveProjectId(migratedProjects[0].id);
        storageActiveProject.set(migratedProjects[0].id);
      }
    }
  }, []);

  const createProject = useCallback((name?: string): Project => {
    // Generate name if not provided - count existing Untitled projects
    const projectName = name?.trim() || `Untitled ${
      projects.filter(p => p.name.startsWith('Untitled')).length + 1
    }`;
    
    const newProject: Project = {
      id: generateId(),
      name: projectName,
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
  }, [projects]);

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

  // Legacy methods (kept for backward compatibility)
  /** @deprecated Use updateProjectDefaultChannel instead */
  const updateProjectChannel = useCallback((channel: Channel) => {
    if (activeProjectId) {
      // Also update new field for consistency
      const newChannel = CHANNEL_MIGRATION[channel];
      updateProject(activeProjectId, { channel, defaultChannel: newChannel });
    }
  }, [activeProjectId, updateProject]);

  /** @deprecated Use updateProjectDefaultEcosystem instead */
  const updateProjectPlatform = useCallback((platform: Platform) => {
    if (activeProjectId) {
      // Also update new field for consistency
      const newEcosystem = PLATFORM_MIGRATION[platform];
      updateProject(activeProjectId, { platform, defaultEcosystem: newEcosystem });
    }
  }, [activeProjectId, updateProject]);

  // New Content Trust System methods
  const updateProjectDefaultChannel = useCallback((channel: ContentChannelType) => {
    if (activeProjectId) {
      updateProject(activeProjectId, { defaultChannel: channel });
    }
  }, [activeProjectId, updateProject]);

  const updateProjectDefaultEcosystem = useCallback((ecosystem: EcosystemType) => {
    if (activeProjectId) {
      updateProject(activeProjectId, { defaultEcosystem: ecosystem });
    }
  }, [activeProjectId, updateProject]);

  const updateProjectDefaultLanguage = useCallback((language: SupportedLanguage) => {
    if (activeProjectId) {
      updateProject(activeProjectId, { defaultLanguage: language });
    }
  }, [activeProjectId, updateProject]);

  const updateProjectDefaultRegion = useCallback((region: IndianRegion) => {
    if (activeProjectId) {
      updateProject(activeProjectId, { defaultRegion: region });
    }
  }, [activeProjectId, updateProject]);

  const activeProject = useMemo(
    () => projects.find(p => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  // Memoize context value to prevent unnecessary re-renders of consumers
  // Only recreates when actual dependencies change
  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      activeProject,
      createProject,
      updateProject,
      deleteProject,
      setActiveProject,
      updateProjectConfig,
      updateProjectVoiceGender,
      // Legacy methods
      updateProjectChannel,
      updateProjectPlatform,
      // New Content Trust System methods
      updateProjectDefaultChannel,
      updateProjectDefaultEcosystem,
      updateProjectDefaultLanguage,
      updateProjectDefaultRegion,
    }),
    [
      projects,
      activeProject,
      createProject,
      updateProject,
      deleteProject,
      setActiveProject,
      updateProjectConfig,
      updateProjectVoiceGender,
      updateProjectChannel,
      updateProjectPlatform,
      updateProjectDefaultChannel,
      updateProjectDefaultEcosystem,
      updateProjectDefaultLanguage,
      updateProjectDefaultRegion,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
