import React from 'react';
import { AppState } from '../types';
import { DSIcon } from './DSIcon';
import { SEMANTIC_COLORS } from '../theme';

interface StatusIndicatorProps {
  state: AppState;
}

// Status colors - using SEMANTIC_COLORS from DS tokens
const stateStyles: Record<AppState, { label: string; textColor: string; bgColor: string }> = {
  [AppState.IDLE]: {
    label: 'Ready',
    textColor: '#52525b',
    bgColor: '#f4f4f5',
  },
  [AppState.CONNECTING]: {
    label: 'Connecting...',
    textColor: SEMANTIC_COLORS.informative,
    bgColor: `${SEMANTIC_COLORS.informative}1A`,
  },
  [AppState.LISTENING]: {
    label: 'Listening',
    textColor: SEMANTIC_COLORS.positive,
    bgColor: `${SEMANTIC_COLORS.positive}1A`,
  },
  [AppState.SPEAKING]: {
    label: 'Speaking',
    textColor: SEMANTIC_COLORS.warning,
    bgColor: `${SEMANTIC_COLORS.warning}1A`,
  },
  [AppState.ERROR]: {
    label: 'Error',
    textColor: SEMANTIC_COLORS.negative,
    bgColor: `${SEMANTIC_COLORS.negative}1A`,
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
              backgroundColor: state === AppState.LISTENING ? `${SEMANTIC_COLORS.positive}80` : `${SEMANTIC_COLORS.warning}80`,
            }}
          />
          <span
            className="relative inline-flex rounded-full h-1.5 w-1.5"
            style={{
              backgroundColor: state === AppState.LISTENING ? SEMANTIC_COLORS.positive : SEMANTIC_COLORS.warning,
            }}
          />
        </span>
      )}
    </div>
  );
};

export default StatusIndicator;
