/**
 * HowItWorksLayout -- documentation-style page explaining the platform.
 * Uses react-router-dom for navigation.
 */

import { useNavigate } from 'react-router-dom';
import type { ColorMode } from '../../types';
import { ProjectSidebar, HowItWorksPage } from '../../components';
import { useThemeColors } from '../../theme';

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
  const navigate = useNavigate();

  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: theme.background.ghost }}
    >
      <ProjectSidebar
        onProjectSelect={() => navigate('/')}
        onNavigateToHowItWorks={() => navigate('/how-it-works')}
        isHowItWorksActive={true}
        colorMode={colorMode}
        onColorModeChange={onColorModeChange}
        userName={userName}
        userRole={userRole}
        onEditProfile={onEditProfile}
      />
      <main className="flex-1 overflow-hidden">
        <HowItWorksPage onBack={() => navigate('/')} />
      </main>
    </div>
  );
}
