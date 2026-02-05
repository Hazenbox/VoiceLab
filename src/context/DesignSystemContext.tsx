import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

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
  // Always return 'jio' - tailwind support removed
  const designSystem: DesignSystem = 'jio';
  
  // No-op functions for backward compatibility
  const setDesignSystem = () => {
    // No-op - design system is locked to Jio
  };
  
  const toggleDesignSystem = () => {
    // No-op - design system is locked to Jio
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
