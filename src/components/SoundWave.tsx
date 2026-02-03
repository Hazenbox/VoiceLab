import React from 'react';
import { AppState } from '../types';

interface SoundWaveProps {
  state: AppState;
}

/**
 * Animated sound wave visualization for active states
 */
export const SoundWave: React.FC<SoundWaveProps> = ({ state }) => {
  const isActive = state === AppState.LISTENING || state === AppState.SPEAKING;
  const animationClass = state === AppState.SPEAKING ? 'speaking' : state === AppState.LISTENING ? 'listening' : '';

  if (!isActive) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center gap-1 h-8 ${animationClass}`}>
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={index}
          className={`
            sound-wave-bar w-1 rounded-full
            ${state === AppState.SPEAKING ? 'bg-orange-500' : 'bg-green-500'}
          `}
          style={{
            height: '100%',
            transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  );
};

export default SoundWave;
