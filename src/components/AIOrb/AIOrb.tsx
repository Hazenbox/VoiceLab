/**
 * AIOrb Component
 * Futuristic AI visualization orb using Unicorn Studio
 * 
 * States are communicated through animation speed and scale only,
 * preserving the orb's native visual design.
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

// Frequency band indices for bass analysis
const BASS_START = 0;
const BASS_END = 4;

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
  const orbState = useOrbState(state, { volume, bassLevel });

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
      // Get frequency data for bass
      audioAnalyzer.getByteFrequencyData(frequencyData);
      
      let bassSum = 0;
      for (let i = BASS_START; i < BASS_END && i < frequencyData.length; i++) {
        bassSum += frequencyData[i];
      }
      const newBassLevel = bassSum / ((BASS_END - BASS_START) * 255);
      
      // Get time domain data for volume
      audioAnalyzer.getByteTimeDomainData(timeDomainData);
      
      let sumSquares = 0;
      for (let i = 0; i < timeDomainData.length; i++) {
        const normalized = (timeDomainData[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / timeDomainData.length);
      const newVolume = Math.min(1, rms * 2);

      // Smooth the values
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

  // Initialize Unicorn Studio scene
  useEffect(() => {
    if (!webGLSupported || !containerRef.current) return;

    const sceneContainer = containerRef.current.querySelector('.ai-orb-scene');
    if (!sceneContainer) return;

    const initScene = async () => {
      try {
        const UnicornStudio = (window as any).UnicornStudio;
        
        if (!UnicornStudio) {
          console.error('[AIOrb] UnicornStudio SDK not loaded. Check if the script tag is present in index.html');
          setIsSceneLoaded(false);
          return;
        }

        if (!UnicornStudio.addScene) {
          console.error('[AIOrb] UnicornStudio.addScene not available. SDK version may be incompatible.');
          setIsSceneLoaded(false);
          return;
        }

        console.log('[AIOrb] Initializing Unicorn Studio scene...');
        const scene = await UnicornStudio.addScene({
          element: sceneContainer,
          fps: 60,
          scale: 1,
          dpi: window.devicePixelRatio || 1.5,
          filePath: '/scenes/ai-orb.json',
          interactivity: {
            mouse: { disableMobile: true },
          },
        });
        
        if (scene) {
          sceneRef.current = scene;
          setIsSceneLoaded(true);
          console.log('[AIOrb] Scene loaded successfully');
        } else {
          console.error('[AIOrb] Scene returned null/undefined');
          setIsSceneLoaded(false);
        }
      } catch (error) {
        console.error('[AIOrb] Failed to initialize Unicorn Studio scene:', error);
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

  // Update animation speed based on state
  useEffect(() => {
    if (sceneRef.current) {
      // Control animation speed via Unicorn SDK
      sceneRef.current.speed = orbState.speed;
      sceneRef.current.paused = orbState.isPaused;
    }
  }, [orbState.speed, orbState.isPaused]);

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
        transform: `scale(${orbState.scale})`,
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={orbState.ariaLabel}
      aria-pressed={state !== AppState.IDLE}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Focus ring for accessibility - color applied via CSS custom property */}
      <div 
        className="ai-orb-focus-ring"
        style={{ '--focus-ring-color': theme.accent } as React.CSSProperties}
      />

      {/* Orb scene container */}
      <div className="ai-orb-canvas">
        {!isSceneLoaded && webGLSupported && (
          <div className="ai-orb-skeleton" />
        )}
        
        {webGLSupported ? (
          <div 
            className="ai-orb-scene" 
            style={{ opacity: isSceneLoaded ? 1 : 0 }}
          />
        ) : (
          <FallbackOrb />
        )}
      </div>
    </div>
  );
});

/**
 * Simple fallback orb for browsers without WebGL support
 */
const FallbackOrb = memo(function FallbackOrb() {
  return (
    <div className="ai-orb-fallback">
      <div className="ai-orb-fallback-inner" />
    </div>
  );
});

export default AIOrb;
