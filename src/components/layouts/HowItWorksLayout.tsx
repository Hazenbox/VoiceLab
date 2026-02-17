/**
 * HowItWorksLayout -- documentation-style page explaining the platform.
 * Reads activeView from uiStore directly.
 */

import type { ColorMode } from '../../types';
import { ProjectSidebar, HowItWorksPage } from '../../components';
import { useThemeColors } from '../../theme';
import { useUIStore } from '../../stores/uiStore';

interface HowItWorksLayoutProps {
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  userName?: string;
  userRole?: string;
  onEditProfile: () => void;
}

export function HowItWorksLayout({
  colorMode,
  onColorModeChange,
  userName,
  userRole,
  onEditProfile,
}: HowItWorksLayoutProps) {
  const theme = useThemeColors();
  const setActiveView = useUIStore((s) => s.setActiveView);

  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: theme.background.ghost }}
    >
      <ProjectSidebar
        onProjectSelect={() => setActiveView('main')}
        onNavigateToHowItWorks={() => setActiveView('how-it-works')}
        isHowItWorksActive={true}
        colorMode={colorMode}
        onColorModeChange={onColorModeChange}
        userName={userName}
        userRole={userRole}
        onEditProfile={onEditProfile}
      />
      <main className="flex-1 overflow-hidden">
        <HowItWorksPage onBack={() => setActiveView('main')} />
      </main>
    </div>
  );
}
