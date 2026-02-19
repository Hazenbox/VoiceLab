/**
 * DocsLayout -- documentation view with sidebar and docs panel.
 * Reads from conversationStore + uiStore + useProject directly to minimize props.
 */

import { useState } from 'react';
import type { ColorMode } from '../../types';
import { AppState } from '../../types';
import { useShallow } from 'zustand/shallow';
import {
  DocumentationPanel,
  ProjectSidebar,
} from '../../components';
import { SettingsModal } from '../../components/SettingsModal';
import { useThemeColors } from '../../theme';
import { useProject } from '../../context/ProjectContext';
import { useConversationStore } from '../../stores/conversationStore';
import { useUIStore } from '../../stores/uiStore';

interface DocsLayoutProps {
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  userName?: string;
  userRole?: string;
  onEditProfile: () => void;
  /** From useVoiceConversation -- true when voice is active */
  voiceAppState: typeof AppState[keyof typeof AppState];
}

export function DocsLayout({
  colorMode,
  onColorModeChange,
  userName,
  userRole,
  onEditProfile,
  voiceAppState,
}: DocsLayoutProps) {
  const theme = useThemeColors();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const {
    activeProject,
    updateProjectVoiceGender,
    updateProjectConfig,
  } = useProject();

  const {
    trustSettings, setTrustSettings,
    selectedLLMProvider, setSelectedLLMProvider,
    selectedTTSProvider, setSelectedTTSProvider,
  } = useConversationStore(useShallow((s) => ({
    trustSettings: s.trustSettings, setTrustSettings: s.setTrustSettings,
    selectedLLMProvider: s.selectedLLMProvider, setSelectedLLMProvider: s.setSelectedLLMProvider,
    selectedTTSProvider: s.selectedTTSProvider, setSelectedTTSProvider: s.setSelectedTTSProvider,
  })));

  const { setActiveView } = useUIStore(useShallow((s) => ({
    setActiveView: s.setActiveView,
  })));

  if (!activeProject) return null;

  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: theme.background.ghost }}
    >
      <ProjectSidebar
        onProjectSelect={() => setActiveView('main')}
        onNavigateToHowItWorks={() => setActiveView('how-it-works')}
        isHowItWorksActive={false}
        colorMode={colorMode}
        onColorModeChange={onColorModeChange}
        userName={userName}
        userRole={userRole}
        onEditProfile={onEditProfile}
        onSettingsOpen={() => setIsSettingsModalOpen(true)}
      />
      <main className="flex-1 overflow-hidden">
        <DocumentationPanel onBack={() => setActiveView('main')} />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        selectedLLMProvider={selectedLLMProvider}
        onLLMProviderChange={setSelectedLLMProvider}
        selectedTTSProvider={selectedTTSProvider}
        onTTSProviderChange={setSelectedTTSProvider}
        voiceGender={activeProject.voiceGender}
        onVoiceGenderChange={updateProjectVoiceGender}
        config={activeProject.config}
        onConfigChange={updateProjectConfig}
        trustSettings={trustSettings}
        onTrustSettingsChange={setTrustSettings}
        disabled={voiceAppState !== AppState.IDLE}
      />
    </div>
  );
}
