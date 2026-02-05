/**
 * AIOrb Component
 * Futuristic AI visualization orb with audio-reactive effects
 * 
 * Uses Unicorn Studio for the base animation with CSS-driven
 * audio reactivity effects layered on top.
 */

import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { AppState } from '../../types';
import { useThemeColors } from '../../theme';
import { useOrbState, checkWebGLSupport } from './useOrbState';
import './AIOrb.css';

export interface AIOrbProps {
  /** Current application state */
  state: AppState;
  /** Web Audio AnalyserNode for audio reactivity */
  audioAnalyzer?: AnalyserNode | null;
  /** Click handler to toggle conversation */
  onClick: () => void;
  /** Size of the orb in pixels */
  size?: number;
  /** Whether the orb interaction is disabled */
  disabled?: boolean;
}

// Frequency band indices for analysis
const BASS_START = 0;
const BASS_END = 4;
// Reserved for future use: mid/high frequency analysis
// const MID_START = 4;
// const MID_END = 12;

/**
 * AIOrb - The central AI voice interaction visualization
 */
export const AIOrb = memo(function AIOrb({
  state,
  audioAnalyzer,
  onClick,
  size = 140,
  disabled = false,
}: AIOrbProps) {
  const theme = useThemeColors();
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sceneRef = useRef<any>(null);
  
  // Audio analysis state
  const [volume, setVolume] = useState(0);
  const [bassLevel, setBassLevel] = useState(0);
  const [isSceneLoaded, setIsSceneLoaded] = useState(false);
  const [webGLSupported] = useState(() => checkWebGLSupport());

  // Get visual state based on app state and audio levels
  const orbState = useOrbState(state, {
    volume,
    bassLevel,
    isLight: theme.isLight,
  });

  // Audio analysis loop
  useEffect(() => {
    if (!audioAnalyzer || (state !== AppState.LISTENING && state !== AppState.SPEAKING)) {
      setVolume(0);
      setBassLevel(0);
      return;
    }

    const frequencyData = new Uint8Array(audioAnalyzer.frequencyBinCount);
    const timeDomainData = new Uint8Array(audioAnalyzer.fftSize);

    const analyze = () => {
      // Get frequency data
      audioAnalyzer.getByteFrequencyData(frequencyData);
      
      // Calculate bass level (average of low frequencies)
      let bassSum = 0;
      for (let i = BASS_START; i < BASS_END && i < frequencyData.length; i++) {
        bassSum += frequencyData[i];
      }
      const newBassLevel = bassSum / ((BASS_END - BASS_START) * 255);
      
      // Get time domain data for volume
      audioAnalyzer.getByteTimeDomainData(timeDomainData);
      
      // Calculate RMS volume
      let sumSquares = 0;
      for (let i = 0; i < timeDomainData.length; i++) {
        const normalized = (timeDomainData[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / timeDomainData.length);
      const newVolume = Math.min(1, rms * 2); // Scale up for visibility

      // Update state with smoothing
      setVolume((prev) => prev * 0.7 + newVolume * 0.3);
      setBassLevel((prev) => prev * 0.7 + newBassLevel * 0.3);

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioAnalyzer, state]);

  // Update CSS variables for audio reactivity
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.style.setProperty('--orb-glow-color', orbState.glowColor);
    container.style.setProperty('--orb-glow-intensity', String(orbState.glowIntensity));
    container.style.setProperty('--orb-scale', String(orbState.baseScale));
  }, [orbState]);

  // Initialize Unicorn Studio scene
  useEffect(() => {
    if (!webGLSupported || !containerRef.current) return;

    // Dynamically import Unicorn Studio
    const initScene = async () => {
      try {
        // Check if UnicornStudio is available globally or import it
        const UnicornStudio = (window as any).UnicornStudio;
        
        if (UnicornStudio) {
          const scene = await UnicornStudio.addScene({
            elementId: `ai-orb-scene-${Date.now()}`,
            fps: 60,
            scale: 1,
            dpi: window.devicePixelRatio || 1.5,
            projectId: 'fFH60AeCV7d3qxP32uwJ', // From the JSON
            filePath: '/scenes/ai-orb.json',
            interactivity: {
              mouse: { disableMobile: false },
            },
          });
          sceneRef.current = scene;
          setIsSceneLoaded(true);
        } else {
          // UnicornStudio not loaded, use fallback
          setIsSceneLoaded(false);
        }
      } catch (error) {
        console.warn('Failed to initialize Unicorn Studio scene:', error);
        setIsSceneLoaded(false);
      }
    };

    initScene();

    return () => {
      if (sceneRef.current) {
        try {
          const UnicornStudio = (window as any).UnicornStudio;
          if (UnicornStudio?.destroy) {
            UnicornStudio.destroy();
          }
        } catch {
          // Ignore cleanup errors
        }
        sceneRef.current = null;
      }
    };
  }, [webGLSupported]);

  // Pause/resume scene based on state
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.paused = orbState.isPaused;
    }
  }, [orbState.isPaused]);

  // Handle keyboard interaction
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onClick();
      } else if (e.key === 'Escape' && state !== AppState.IDLE && state !== AppState.ERROR) {
        e.preventDefault();
        onClick();
      }
    },
    [onClick, disabled, state]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      onClick();
    }
  }, [onClick, disabled]);

  return (
    <div
      ref={containerRef}
      className={`ai-orb-container ${orbState.animationClass}`}
      style={{
        width: size,
        height: size,
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={orbState.ariaLabel}
      aria-pressed={state !== AppState.IDLE}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Focus ring for accessibility */}
      <div 
        className="ai-orb-focus-ring"
        style={{ color: theme.accent }}
      />

      {/* Audio-reactive outer ring */}
      <div className="ai-orb-audio-ring" />

      {/* Glow layer */}
      <div className="ai-orb-glow" />

      {/* Orb canvas */}
      <div className="ai-orb-canvas">
        {!isSceneLoaded && webGLSupported && (
          <div className="ai-orb-skeleton" />
        )}
        
        {webGLSupported ? (
          <div 
            id={`ai-orb-scene-${Date.now()}`}
            className="ai-orb-scene"
          />
        ) : (
          <FallbackOrb state={state} theme={theme} />
        )}
      </div>
    </div>
  );
});

/**
 * Fallback orb for browsers without WebGL support
 */
interface FallbackOrbProps {
  state: AppState;
  theme: ReturnType<typeof useThemeColors>;
}

const FallbackOrb = memo(function FallbackOrb({ state, theme }: FallbackOrbProps) {
  // Gradient colors based on state
  const getGradient = () => {
    switch (state) {
      case AppState.IDLE:
        return theme.isLight
          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.7) 0%, rgba(139, 92, 246, 0.7) 50%, rgba(59, 130, 246, 0.7) 100%)'
          : 'linear-gradient(135deg, rgba(129, 140, 248, 0.8) 0%, rgba(167, 139, 250, 0.8) 50%, rgba(96, 165, 250, 0.8) 100%)';
      case AppState.CONNECTING:
        return theme.isLight
          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.7) 0%, rgba(99, 102, 241, 0.7) 100%)'
          : 'linear-gradient(135deg, rgba(96, 165, 250, 0.8) 0%, rgba(129, 140, 248, 0.8) 100%)';
      case AppState.LISTENING:
        return theme.isLight
          ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.7) 0%, rgba(251, 146, 60, 0.7) 100%)'
          : 'linear-gradient(135deg, rgba(251, 146, 60, 0.8) 0%, rgba(253, 186, 116, 0.8) 100%)';
      case AppState.SPEAKING:
        return theme.isLight
          ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.7) 0%, rgba(253, 186, 116, 0.7) 100%)'
          : 'linear-gradient(135deg, rgba(253, 186, 116, 0.8) 0%, rgba(254, 215, 170, 0.8) 100%)';
      case AppState.ERROR:
        return theme.isLight
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.7) 0%, rgba(248, 113, 113, 0.7) 100%)'
          : 'linear-gradient(135deg, rgba(248, 113, 113, 0.8) 0%, rgba(252, 165, 165, 0.8) 100%)';
      default:
        return 'linear-gradient(135deg, rgba(99, 102, 241, 0.7) 0%, rgba(139, 92, 246, 0.7) 100%)';
    }
  };

  return (
    <div
      className="ai-orb-fallback"
      style={{
        background: getGradient(),
      }}
    >
      {/* Inner glow effect */}
      <div
        style={{
          position: 'absolute',
          inset: '20%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
        }}
      />
    </div>
  );
});

export default AIOrb;
