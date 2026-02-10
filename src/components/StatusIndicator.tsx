import React from 'react';
import { AppState } from '../types';
import { DSIcon } from './DSIcon';

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
  [AppState.IDLE]: <DSIcon name="IcCircle" size="XS" attention="low" />,
  [AppState.CONNECTING]: (
    <span className="animate-spin inline-block">
      <DSIcon name="IcRefresh" size="XS" attention="medium" />
    </span>
  ),
  [AppState.LISTENING]: <DSIcon name="IcMic" size="XS" attention="high" />,
  [AppState.SPEAKING]: <DSIcon name="IcVolumeUp" size="XS" attention="high" />,
  [AppState.ERROR]: <DSIcon name="IcWarning" size="XS" attention="high" />,
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
