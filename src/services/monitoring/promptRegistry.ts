/**
 * Prompt Version Registry
 * Manages prompt versioning, A/B testing, and change tracking
 */

export interface PromptVersion {
  id: string;
  name: string;
  version: string;
  content: string;
  createdAt: number;
  createdBy?: string;
  description?: string;
  tags?: string[];
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export class PromptRegistry {
  private prompts: Map<string, PromptVersion[]> = new Map();
  private readonly STORAGE_KEY = 'voicelab_prompt_versions';

  constructor() {
    this.loadFromStorage();
  }

  register(prompt: Omit<PromptVersion, 'id' | 'createdAt'>): string {
    const version: PromptVersion = {
      ...prompt,
      id: this.generateId(),
      createdAt: Date.now(),
    };

    const versions = this.prompts.get(prompt.name) || [];
    
    // If this is set as active, deactivate others
    if (version.isActive) {
      versions.forEach(v => { v.isActive = false; });
    }
    
    versions.push(version);
    this.prompts.set(prompt.name, versions);
    this.saveToStorage();

    console.log(
      `[PromptRegistry] Registered ${prompt.name} v${prompt.version} ` +
      `(${version.isActive ? 'ACTIVE' : 'inactive'})`
    );

    return version.id;
  }

  getActive(name: string): PromptVersion | null {
    const versions = this.prompts.get(name) || [];
    const active = versions.find(v => v.isActive);
    
    if (!active && versions.length > 0) {
      // If no active version, return the latest
      return versions[versions.length - 1];
    }
    
    return active || null;
  }

  getVersion(name: string, version: string): PromptVersion | null {
    const versions = this.prompts.get(name) || [];
    return versions.find(v => v.version === version) || null;
  }

  getAllVersions(name: string): PromptVersion[] {
    return this.prompts.get(name) || [];
  }

  setActive(name: string, version: string): boolean {
    const versions = this.prompts.get(name) || [];
    const targetVersion = versions.find(v => v.version === version);
    
    if (!targetVersion) {
      console.error(
        `[PromptRegistry] Version ${version} not found for ${name}`
      );
      return false;
    }

    versions.forEach(v => {
      v.isActive = v.version === version;
    });
    
    this.saveToStorage();
    
    console.log(
      `[PromptRegistry] Activated ${name} v${version}`
    );
    
    return true;
  }

  deleteVersion(name: string, version: string): boolean {
    const versions = this.prompts.get(name) || [];
    const index = versions.findIndex(v => v.version === version);
    
    if (index === -1) return false;

    const deletedVersion = versions[index];
    versions.splice(index, 1);
    
    // If we deleted the active version, activate the latest
    if (deletedVersion.isActive && versions.length > 0) {
      versions[versions.length - 1].isActive = true;
    }
    
    if (versions.length === 0) {
      this.prompts.delete(name);
    } else {
      this.prompts.set(name, versions);
    }
    
    this.saveToStorage();
    
    console.log(
      `[PromptRegistry] Deleted ${name} v${version}`
    );
    
    return true;
  }

  listPrompts(): string[] {
    return Array.from(this.prompts.keys());
  }

  getStats(): {
    totalPrompts: number;
    totalVersions: number;
    byPrompt: Record<string, { versions: number; activeVersion?: string }>;
  } {
    const byPrompt: Record<string, { versions: number; activeVersion?: string }> = {};
    let totalVersions = 0;

    this.prompts.forEach((versions, name) => {
      const active = versions.find(v => v.isActive);
      byPrompt[name] = {
        versions: versions.length,
        activeVersion: active?.version,
      };
      totalVersions += versions.length;
    });

    return {
      totalPrompts: this.prompts.size,
      totalVersions,
      byPrompt,
    };
  }

  export(): Record<string, PromptVersion[]> {
    const exported: Record<string, PromptVersion[]> = {};
    this.prompts.forEach((versions, name) => {
      exported[name] = versions;
    });
    return exported;
  }

  import(data: Record<string, PromptVersion[]>): void {
    Object.entries(data).forEach(([name, versions]) => {
      this.prompts.set(name, versions);
    });
    this.saveToStorage();
  }

  clear(): void {
    this.prompts.clear();
    this.saveToStorage();
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.prompts = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error('[PromptRegistry] Failed to load from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const obj = Object.fromEntries(this.prompts);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.error('[PromptRegistry] Failed to save to storage:', error);
    }
  }

  private generateId(): string {
    return `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
