/**
 * useOrbState Hook
 * Maps AppState to animation speed and scale for the AI Orb
 * 
 * States are communicated through animation speed and size only,
 * keeping the orb's native Unicorn Studio visuals.
 */

import { useMemo } from 'react';
import { AppState } from '../../types';

export interface OrbVisualState {
  /** Animation speed multiplier (0 = paused, 1 = normal) */
  speed: number;
  /** Base scale of the orb */
  scale: number;
  /** CSS class for special animations (e.g., shake on error) */
  animationClass: string;
  /** Whether the animation should be paused */
  isPaused: boolean;
  /** Accessibility label */
  ariaLabel: string;
  /** Status text to display */
  statusText: string;
}

// Animation speed multipliers per state
const SPEED_MAP: Record<AppState, number> = {
  [AppState.IDLE]: 0.3,        // Slow, calm breathing
  [AppState.CONNECTING]: 0.8,  // Building up energy
  [AppState.LISTENING]: 1.0,   // Normal, attentive
  [AppState.SPEAKING]: 1.5,    // Fast, energetic
  [AppState.ERROR]: 0,         // Paused
};

// Base scale per state
const SCALE_MAP: Record<AppState, number> = {
  [AppState.IDLE]: 1.0,
  [AppState.CONNECTING]: 1.0,
  [AppState.LISTENING]: 1.0,
  [AppState.SPEAKING]: 1.05,
  [AppState.ERROR]: 1.0,
};

// Animation classes per state
const ANIMATION_CLASS_MAP: Record<AppState, string> = {
  [AppState.IDLE]: 'ai-orb--idle',
  [AppState.CONNECTING]: 'ai-orb--connecting',
  [AppState.LISTENING]: 'ai-orb--listening',
  [AppState.SPEAKING]: 'ai-orb--speaking',
  [AppState.ERROR]: 'ai-orb--error',
};

// ARIA labels per state
const ARIA_LABEL_MAP: Record<AppState, string> = {
  [AppState.IDLE]: 'Start voice conversation',
  [AppState.CONNECTING]: 'Connecting to AI...',
  [AppState.LISTENING]: 'Listening - tap to stop',
  [AppState.SPEAKING]: 'AI speaking - tap to stop',
  [AppState.ERROR]: 'Error occurred - tap to retry',
};

// Status text per state
const STATUS_TEXT_MAP: Record<AppState, string> = {
  [AppState.IDLE]: 'Tap orb to talk',
  [AppState.CONNECTING]: 'Connecting...',
  [AppState.LISTENING]: 'Listening...',
  [AppState.SPEAKING]: 'AI is speaking...',
  [AppState.ERROR]: 'Error - tap to retry',
};

interface UseOrbStateOptions {
  /** Volume level for audio-reactive scaling (0-1) */
  volume?: number;
  /** Bass level for additional scaling effect (0-1) */
  bassLevel?: number;
}

/**
 * Get visual state properties based on app state and audio levels
 */
export function useOrbState(
  state: AppState,
  options: UseOrbStateOptions = {}
): OrbVisualState {
  const { volume = 0, bassLevel = 0 } = options;

  return useMemo(() => {
    const baseSpeed = SPEED_MAP[state];
    const baseScale = SCALE_MAP[state];
    const animationClass = ANIMATION_CLASS_MAP[state];
    const ariaLabel = ARIA_LABEL_MAP[state];
    const statusText = STATUS_TEXT_MAP[state];
    const isPaused = state === AppState.ERROR;

    // Calculate audio-reactive scale adjustment
    let audioScaleBoost = 0;
    if (state === AppState.LISTENING) {
      // React to volume when listening
      audioScaleBoost = volume * 0.1;
    } else if (state === AppState.SPEAKING) {
      // React to bass when speaking
      audioScaleBoost = bassLevel * 0.08;
    }

    const finalScale = baseScale + audioScaleBoost;

    return {
      speed: baseSpeed,
      scale: finalScale,
      animationClass,
      isPaused,
      ariaLabel,
      statusText,
    };
  }, [state, volume, bassLevel]);
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
