import type { Project, SavedAudio } from '../types';

export const STORAGE_KEYS = {
  PROJECTS: 'voicelab_projects',
  AUDIOS: 'voicelab_audios',
  ACTIVE_PROJECT: 'voicelab_active_project',
} as const;

// Generate a unique ID
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Projects CRUD operations
export const storageProjects = {
  getAll: (): Project[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading projects from localStorage:', error);
      return [];
    }
  },

  getById: (id: string): Project | null => {
    const projects = storageProjects.getAll();
    return projects.find(p => p.id === id) || null;
  },

  save: (project: Project): void => {
    try {
      const projects = storageProjects.getAll();
      const index = projects.findIndex(p => p.id === project.id);
      
      if (index >= 0) {
        projects[index] = project;
      } else {
        projects.push(project);
      }
      
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch (error) {
      console.error('Error saving project to localStorage:', error);
      throw error;
    }
  },

  delete: (id: string): void => {
    try {
      const projects = storageProjects.getAll();
      const filtered = projects.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting project from localStorage:', error);
      throw error;
    }
  },

  update: (id: string, updates: Partial<Project>): void => {
    const project = storageProjects.getById(id);
    if (project) {
      const updated = { ...project, ...updates, updatedAt: Date.now() };
      storageProjects.save(updated);
    }
  },
};

// Audios CRUD operations
export const storageAudios = {
  getAll: (): SavedAudio[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIOS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading audios from localStorage:', error);
      return [];
    }
  },

  getByProjectId: (projectId: string): SavedAudio[] => {
    const audios = storageAudios.getAll();
    return audios.filter(a => a.projectId === projectId);
  },

  getById: (id: string): SavedAudio | null => {
    const audios = storageAudios.getAll();
    return audios.find(a => a.id === id) || null;
  },

  save: (audio: SavedAudio): void => {
    try {
      const audios = storageAudios.getAll();
      const index = audios.findIndex(a => a.id === audio.id);
      
      if (index >= 0) {
        audios[index] = audio;
      } else {
        audios.push(audio);
      }
      
      localStorage.setItem(STORAGE_KEYS.AUDIOS, JSON.stringify(audios));
    } catch (error) {
      console.error('Error saving audio to localStorage:', error);
      throw error;
    }
  },

  delete: (id: string): void => {
    try {
      const audios = storageAudios.getAll();
      const filtered = audios.filter(a => a.id !== id);
      localStorage.setItem(STORAGE_KEYS.AUDIOS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting audio from localStorage:', error);
      throw error;
    }
  },

  deleteByProjectId: (projectId: string): void => {
    try {
      const audios = storageAudios.getAll();
      const filtered = audios.filter(a => a.projectId !== projectId);
      localStorage.setItem(STORAGE_KEYS.AUDIOS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting project audios from localStorage:', error);
      throw error;
    }
  },

  update: (id: string, updates: Partial<SavedAudio>): void => {
    const audio = storageAudios.getById(id);
    if (audio) {
      const updated = { ...audio, ...updates };
      storageAudios.save(updated);
    }
  },
};

// Active project operations
export const storageActiveProject = {
  get: (): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT);
    } catch (error) {
      console.error('Error reading active project from localStorage:', error);
      return null;
    }
  },

  set: (projectId: string): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, projectId);
    } catch (error) {
      console.error('Error saving active project to localStorage:', error);
      throw error;
    }
  },

  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROJECT);
    } catch (error) {
      console.error('Error clearing active project from localStorage:', error);
      throw error;
    }
  },
};
