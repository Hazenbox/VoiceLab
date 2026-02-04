import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type DesignSystem = 'jio' | 'tailwind';

interface DesignSystemContextType {
  designSystem: DesignSystem;
  setDesignSystem: (system: DesignSystem) => void;
  toggleDesignSystem: () => void;
}

const DesignSystemContext = createContext<DesignSystemContextType | undefined>(undefined);

interface DesignSystemProviderProps {
  children: ReactNode;
}

export const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({ children }) => {
  // Initialize from localStorage or default to 'jio'
  const [designSystem, setDesignSystemState] = useState<DesignSystem>(() => {
    const stored = localStorage.getItem('designSystem');
    return (stored === 'jio' || stored === 'tailwind') ? stored : 'jio';
  });

  // Persist to localStorage when changed
  useEffect(() => {
    localStorage.setItem('designSystem', designSystem);
  }, [designSystem]);

  const setDesignSystem = (system: DesignSystem) => {
    setDesignSystemState(system);
  };

  const toggleDesignSystem = () => {
    setDesignSystemState(prev => prev === 'jio' ? 'tailwind' : 'jio');
  };

  return (
    <DesignSystemContext.Provider value={{ designSystem, setDesignSystem, toggleDesignSystem }}>
      {children}
    </DesignSystemContext.Provider>
  );
};

export const useDesignSystem = (): DesignSystemContextType => {
  const context = useContext(DesignSystemContext);
  if (!context) {
    throw new Error('useDesignSystem must be used within a DesignSystemProvider');
  }
  return context;
};
