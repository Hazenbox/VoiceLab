/**
 * DocsLayout -- documentation view with sidebar, docs panel, and settings.
 * Reads from conversationStore + uiStore + useProject directly to minimize props.
 */

import type { ColorMode } from '../../types';
import { AppState } from '../../types';
import { useShallow } from 'zustand/shallow';
import {
  DocumentationPanel,
  ProjectSidebar,
  AdvancedSettingsPanel,
} from '../../components';
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

  const {
    activeProject,
    updateProjectVoiceGender,
    updateProjectConfig,
    updateProjectDefaultEcosystem,
    updateProjectDefaultChannel,
    updateProjectDefaultLanguage,
    updateProjectDefaultRegion,
  } = useProject();

  const {
    ecosystem, setEcosystem,
    contentChannel, setContentChannel,
    trustSettings, setTrustSettings,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    streamResponse, setStreamResponse,
  } = useConversationStore(useShallow((s) => ({
    ecosystem: s.ecosystem, setEcosystem: s.setEcosystem,
    contentChannel: s.contentChannel, setContentChannel: s.setContentChannel,
    trustSettings: s.trustSettings, setTrustSettings: s.setTrustSettings,
    temperature: s.temperature, setTemperature: s.setTemperature,
    maxTokens: s.maxTokens, setMaxTokens: s.setMaxTokens,
    streamResponse: s.streamResponse, setStreamResponse: s.setStreamResponse,
  })));

  const {
    isConfigPanelCollapsed, setConfigPanelCollapsed, setActiveView,
  } = useUIStore(useShallow((s) => ({
    isConfigPanelCollapsed: s.isConfigPanelCollapsed,
    setConfigPanelCollapsed: s.setConfigPanelCollapsed,
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
      />
      <main className="flex-1 overflow-hidden">
        <DocumentationPanel onBack={() => setActiveView('main')} />
      </main>
      <AdvancedSettingsPanel
        voiceGender={activeProject.voiceGender}
        onVoiceGenderChange={updateProjectVoiceGender}
        config={activeProject.config}
        onConfigChange={updateProjectConfig}
        trustSettings={trustSettings}
        onTrustSettingsChange={setTrustSettings}
        disabled={voiceAppState !== AppState.IDLE}
        isCollapsed={isConfigPanelCollapsed}
        onToggleCollapse={() => setConfigPanelCollapsed(!isConfigPanelCollapsed)}
      />
    </div>
  );
}
