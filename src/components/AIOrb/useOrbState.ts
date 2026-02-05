/**
 * useOrbState Hook
 * Maps AppState to visual properties for the AI Orb
 */

import { useMemo } from 'react';
import { AppState } from '../../types';

export interface OrbVisualState {
  glowColor: string;
  glowIntensity: number;
  baseScale: number;
  animationClass: string;
  isPaused: boolean;
  ariaLabel: string;
  statusText: string;
}

interface UseOrbStateOptions {
  volume?: number;
  bassLevel?: number;
  isLight?: boolean;
}

/**
 * Get visual state properties based on app state and audio levels
 */
export function useOrbState(
  state: AppState,
  options: UseOrbStateOptions = {}
): OrbVisualState {
  const { volume = 0, bassLevel = 0, isLight = false } = options;

  return useMemo(() => {
    // Base configurations for each state
    const stateConfigs: Record<AppState, Omit<OrbVisualState, 'glowIntensity' | 'baseScale'>> = {
      [AppState.IDLE]: {
        glowColor: isLight 
          ? 'rgba(99, 102, 241, 0.25)' 
          : 'rgba(129, 140, 248, 0.3)',
        animationClass: 'ai-orb--idle',
        isPaused: false,
        ariaLabel: 'Start voice conversation',
        statusText: 'Tap to talk',
      },
      [AppState.CONNECTING]: {
        glowColor: isLight 
          ? 'rgba(59, 130, 246, 0.4)' 
          : 'rgba(96, 165, 250, 0.5)',
        animationClass: 'ai-orb--connecting',
        isPaused: false,
        ariaLabel: 'Connecting to AI...',
        statusText: 'Connecting...',
      },
      [AppState.LISTENING]: {
        glowColor: isLight 
          ? 'rgba(249, 115, 22, 0.5)' 
          : 'rgba(251, 146, 60, 0.6)',
        animationClass: 'ai-orb--listening',
        isPaused: false,
        ariaLabel: 'Listening - tap to stop',
        statusText: 'Listening...',
      },
      [AppState.SPEAKING]: {
        glowColor: isLight 
          ? 'rgba(251, 146, 60, 0.5)' 
          : 'rgba(253, 186, 116, 0.7)',
        animationClass: 'ai-orb--speaking',
        isPaused: false,
        ariaLabel: 'AI speaking - tap to stop',
        statusText: 'Speaking...',
      },
      [AppState.ERROR]: {
        glowColor: isLight 
          ? 'rgba(239, 68, 68, 0.5)' 
          : 'rgba(248, 113, 113, 0.6)',
        animationClass: 'ai-orb--error',
        isPaused: true,
        ariaLabel: 'Error occurred - tap to retry',
        statusText: 'Error - tap to retry',
      },
    };

    const config = stateConfigs[state];

    // Calculate dynamic values based on audio
    let glowIntensity = 0;
    let baseScale = 1;

    switch (state) {
      case AppState.IDLE:
        glowIntensity = 0.2;
        baseScale = 1;
        break;
      case AppState.CONNECTING:
        glowIntensity = 0.4;
        baseScale = 1.02;
        break;
      case AppState.LISTENING:
        // Audio-reactive: glow and scale respond to volume
        glowIntensity = 0.4 + volume * 0.6;
        baseScale = 1 + volume * 0.1;
        break;
      case AppState.SPEAKING:
        // Audio-reactive: respond to bass frequencies
        glowIntensity = 0.5 + bassLevel * 0.5;
        baseScale = 1.02 + bassLevel * 0.08;
        break;
      case AppState.ERROR:
        glowIntensity = 0.6;
        baseScale = 1;
        break;
    }

    return {
      ...config,
      glowIntensity,
      baseScale,
    };
  }, [state, volume, bassLevel, isLight]);
}

/**
 * Check if WebGL is supported in the browser
 */
export function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}
