import React from 'react';
import { AppState } from '../types';

interface StatusIndicatorProps {
  state: AppState;
}

// Status colors - using direct colors for semantic states
const stateStyles: Record<AppState, { label: string; textColor: string; bgColor: string }> = {
  [AppState.IDLE]: {
    label: 'Ready',
    textColor: '#52525b', // zinc-600
    bgColor: '#f4f4f5', // zinc-100
  },
  [AppState.CONNECTING]: {
    label: 'Connecting...',
    textColor: '#2563eb', // blue-600
    bgColor: '#dbeafe', // blue-100
  },
  [AppState.LISTENING]: {
    label: 'Listening',
    textColor: '#16a34a', // green-600
    bgColor: '#dcfce7', // green-100
  },
  [AppState.SPEAKING]: {
    label: 'Speaking',
    textColor: '#ea580c', // orange-600
    bgColor: '#ffedd5', // orange-100
  },
  [AppState.ERROR]: {
    label: 'Error',
    textColor: '#dc2626', // red-600
    bgColor: '#fee2e2', // red-100
  },
};

const stateIcons: Record<AppState, React.ReactNode> = {
  [AppState.IDLE]: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
    </svg>
  ),
  [AppState.CONNECTING]: (
    <svg className="animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  [AppState.LISTENING]: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  ),
  [AppState.SPEAKING]: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  ),
  [AppState.ERROR]: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

/**
 * Status indicator badge showing current app state
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ state }) => {
  const styles = stateStyles[state];
  const icon = stateIcons[state];

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors duration-300"
      style={{
        backgroundColor: styles.bgColor,
        color: styles.textColor,
      }}
    >
      {React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className: 'w-3 h-3'
      })}
      <span className="text-xs font-medium">{styles.label}</span>
      
      {/* Animated dot for active states */}
      {(state === AppState.LISTENING || state === AppState.SPEAKING) && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{
              backgroundColor: state === AppState.LISTENING ? '#00A85980' : '#fb923c',
            }}
          />
          <span
            className="relative inline-flex rounded-full h-1.5 w-1.5"
            style={{
              backgroundColor: state === AppState.LISTENING ? '#00A859' : '#f97316',
            }}
          />
        </span>
      )}
    </div>
  );
};

export default StatusIndicator;
