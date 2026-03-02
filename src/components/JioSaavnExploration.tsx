/**
 * JioSaavnExploration Component
 * 
 * Displays JioSaavn exploration cards when music topics are detected in AI responses.
 * Shows playlists, songs, artists, and albums in a horizontal scrollable layout.
 * 
 * Features:
 * - Auto-detects music topics from message content
 * - Horizontal scrollable card layout
 * - Loading skeleton state
 * - Dismissible with X button
 * - Opens JioSaavn links in new tab
 * - Responsive design
 */

import { memo, useCallback } from 'react';
import { useThemeColors } from '../theme';
import { useJioSaavnSearch } from '../hooks/useJioSaavnSearch';
import { ActionButton } from './ActionButton';
import { DSIcon } from './DSIcon';
import type { ExplorationItem } from '../services/jiosaavn/types';

interface JioSaavnExplorationProps {
  messageId: string;
  messageContent: string;
  isDismissed?: boolean;
  onDismiss?: (messageId: string) => void;
}

const JIOSAAVN_GREEN = '#2bc5b4';

const TypeIcon = memo(function TypeIcon({ 
  type, 
  color 
}: { 
  type: ExplorationItem['type']; 
  color: string;
}) {
  switch (type) {
    case 'playlist':
      return <DSIcon name="IcPlaylist" size="XS" style={{ color }} />;
    case 'song':
      return <DSIcon name="IcPlay" size="XS" style={{ color }} />;
    case 'artist':
      return <DSIcon name="IcUser" size="XS" style={{ color }} />;
    case 'album':
      return <DSIcon name="IcAlbum" size="XS" style={{ color }} />;
    default:
      return <DSIcon name="IcMusic" size="XS" style={{ color }} />;
  }
});

const ExplorationCard = memo(function ExplorationCard({
  item,
  theme,
}: {
  item: ExplorationItem;
  theme: ReturnType<typeof useThemeColors>;
}) {
  const handleClick = useCallback(() => {
    if (item.jiosaavnUrl) {
      window.open(item.jiosaavnUrl, '_blank', 'noopener,noreferrer');
    }
  }, [item.jiosaavnUrl]);
  
  const isArtist = item.type === 'artist';
  
  return (
    <button
      onClick={handleClick}
      className={`flex-shrink-0 flex items-center gap-3 p-2 rounded-xl cursor-pointer
        hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-150
        focus:outline-none focus:ring-2 focus:ring-offset-2`}
      style={{
        backgroundColor: theme.background.bold,
        minWidth: '200px',
        maxWidth: '240px',
      }}
      aria-label={`Open ${item.name} on JioSaavn`}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          className={`object-cover flex-shrink-0 ${isArtist ? 'rounded-full' : 'rounded-lg'}`}
          style={{
            width: '48px',
            height: '48px',
          }}
          loading="lazy"
        />
      ) : (
        <div
          className={`flex items-center justify-center flex-shrink-0 ${isArtist ? 'rounded-full' : 'rounded-lg'}`}
          style={{
            width: '48px',
            height: '48px',
            backgroundColor: theme.stroke.low,
          }}
        >
          <TypeIcon type={item.type} color={theme.text.low} />
        </div>
      )}
      
      <div className="flex-1 min-w-0 text-left">
        <div
          className="font-medium truncate"
          style={{
            color: theme.text.high,
            fontSize: '14px',
            lineHeight: '1.3',
          }}
        >
          {item.name}
        </div>
        <div
          className="truncate flex items-center gap-1"
          style={{
            color: theme.text.medium,
            fontSize: '12px',
            lineHeight: '1.3',
          }}
        >
          <TypeIcon type={item.type} color={theme.text.low} />
          <span>{item.subtitle || item.type}</span>
        </div>
      </div>
    </button>
  );
});

const LoadingSkeleton = memo(function LoadingSkeleton({
  theme,
}: {
  theme: ReturnType<typeof useThemeColors>;
}) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex-shrink-0 flex items-center gap-3 p-2 rounded-xl animate-pulse"
          style={{
            backgroundColor: theme.background.bold,
            minWidth: '200px',
          }}
        >
          <div
            className="rounded-lg flex-shrink-0"
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: theme.stroke.low,
            }}
          />
          <div className="flex-1 space-y-2">
            <div
              className="rounded"
              style={{
                height: '14px',
                width: '80%',
                backgroundColor: theme.stroke.low,
              }}
            />
            <div
              className="rounded"
              style={{
                height: '12px',
                width: '60%',
                backgroundColor: theme.stroke.low,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

export const JioSaavnExploration = memo(function JioSaavnExploration({
  messageId,
  messageContent,
  isDismissed = false,
  onDismiss,
}: JioSaavnExplorationProps) {
  const theme = useThemeColors();
  
  const { data, isLoading, error, musicTopic } = useJioSaavnSearch(messageContent, {
    enabled: !isDismissed,
    limit: 5,
  });
  
  const handleDismiss = useCallback(() => {
    onDismiss?.(messageId);
  }, [messageId, onDismiss]);
  
  if (isDismissed) {
    return null;
  }
  
  if (!musicTopic?.detected) {
    return null;
  }
  
  if (error && !isLoading) {
    return null;
  }
  
  if (!isLoading && (!data || data.items.length === 0)) {
    return null;
  }
  
  return (
    <div
      className="mt-3 rounded-xl overflow-hidden"
      style={{
        backgroundColor: theme.background.subtle,
        border: `1px solid ${theme.stroke.low}`,
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          borderBottom: `1px solid ${theme.stroke.low}`,
        }}
      >
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              fill={JIOSAAVN_GREEN}
            />
          </svg>
          <span
            style={{
              color: theme.text.high,
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            Explore on JioSaavn
          </span>
          {data?.query && (
            <span
              style={{
                color: theme.text.low,
                fontSize: '12px',
              }}
            >
              "{data.query}"
            </span>
          )}
        </div>
        
        {onDismiss && (
          <ActionButton
            icon={<DSIcon name="IcClose" size="XS" style={{ color: theme.text.medium }} />}
            label="Dismiss"
            onClick={handleDismiss}
            size={24}
          />
        )}
      </div>
      
      <div
        className="p-3 overflow-x-auto scrollable-container"
        style={{
          scrollbarWidth: 'thin',
        }}
      >
        {isLoading ? (
          <LoadingSkeleton theme={theme} />
        ) : (
          <div className="flex gap-3">
            {data?.items.map((item) => (
              <ExplorationCard
                key={`${item.type}-${item.id}`}
                item={item}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default JioSaavnExploration;
