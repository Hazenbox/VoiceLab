/**
 * useNetworkStatus Hook
 * 
 * Monitors network connectivity and provides offline detection.
 * 
 * Features:
 * - Real-time online/offline status
 * - Connection quality estimation (when available)
 * - Reconnection callbacks
 * - Offline duration tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'unknown';
type ConnectionEffectiveType = '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';

interface NetworkInfo {
  /** Whether currently online */
  isOnline: boolean;
  /** Connection type (wifi, cellular, etc.) */
  connectionType: ConnectionType;
  /** Effective connection type (4g, 3g, etc.) */
  effectiveType: ConnectionEffectiveType;
  /** Estimated downlink speed in Mbps */
  downlink: number | null;
  /** Estimated round-trip time in ms */
  rtt: number | null;
  /** Whether data saver is enabled */
  saveData: boolean;
}

interface UseNetworkStatusOptions {
  /** Callback when connection is restored */
  onReconnect?: () => void;
  /** Callback when connection is lost */
  onDisconnect?: () => void;
  /** Polling interval for connection check (ms) */
  pollingInterval?: number;
}

interface UseNetworkStatusReturn extends NetworkInfo {
  /** Duration offline in seconds (0 if online) */
  offlineDuration: number;
  /** Timestamp when went offline (null if online) */
  offlineSince: number | null;
  /** Manually check connection status */
  checkConnection: () => Promise<boolean>;
}

// =============================================================================
// Network Information API types
// =============================================================================

interface NetworkInformation extends EventTarget {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  onchange?: ((this: NetworkInformation, ev: Event) => unknown) | null;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useNetworkStatus(
  options: UseNetworkStatusOptions = {}
): UseNetworkStatusReturn {
  const { onReconnect, onDisconnect, pollingInterval } = options;
  
  // Get network connection object (with browser prefixes)
  const getNetworkConnection = useCallback((): NetworkInformation | undefined => {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  }, []);
  
  // Parse connection info
  const parseNetworkInfo = useCallback((): Omit<NetworkInfo, 'isOnline'> => {
    const connection = getNetworkConnection();
    
    if (!connection) {
      return {
        connectionType: 'unknown',
        effectiveType: 'unknown',
        downlink: null,
        rtt: null,
        saveData: false,
      };
    }
    
    return {
      connectionType: (connection.type as ConnectionType) || 'unknown',
      effectiveType: (connection.effectiveType as ConnectionEffectiveType) || 'unknown',
      downlink: connection.downlink ?? null,
      rtt: connection.rtt ?? null,
      saveData: connection.saveData ?? false,
    };
  }, [getNetworkConnection]);
  
  // State
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [networkInfo, setNetworkInfo] = useState<Omit<NetworkInfo, 'isOnline'>>(() => parseNetworkInfo());
  const [offlineSince, setOfflineSince] = useState<number | null>(() => 
    navigator.onLine ? null : Date.now()
  );
  const [offlineDuration, setOfflineDuration] = useState(0);
  
  // Refs
  const wasOnlineRef = useRef(navigator.onLine);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Update offline duration
  useEffect(() => {
    if (offlineSince !== null) {
      durationIntervalRef.current = setInterval(() => {
        setOfflineDuration(Math.floor((Date.now() - offlineSince) / 1000));
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setOfflineDuration(0);
    }
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [offlineSince]);
  
  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineSince(null);
      setNetworkInfo(parseNetworkInfo());
      
      if (!wasOnlineRef.current) {
        onReconnect?.();
      }
      wasOnlineRef.current = true;
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setOfflineSince(Date.now());
      
      if (wasOnlineRef.current) {
        onDisconnect?.();
      }
      wasOnlineRef.current = false;
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Network Information API change event
    const connection = getNetworkConnection();
    const handleConnectionChange = () => {
      setNetworkInfo(parseNetworkInfo());
    };
    
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [onReconnect, onDisconnect, getNetworkConnection, parseNetworkInfo]);
  
  // Optional polling check
  useEffect(() => {
    if (!pollingInterval) return;
    
    const checkOnline = async () => {
      try {
        // Try to fetch a small resource to verify connectivity
        await fetch('/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
          mode: 'no-cors',
        });
        
        if (!isOnline) {
          setIsOnline(true);
          setOfflineSince(null);
          if (!wasOnlineRef.current) {
            onReconnect?.();
          }
          wasOnlineRef.current = true;
        }
      } catch {
        if (isOnline) {
          setIsOnline(false);
          setOfflineSince(Date.now());
          if (wasOnlineRef.current) {
            onDisconnect?.();
          }
          wasOnlineRef.current = false;
        }
      }
    };
    
    pollingIntervalRef.current = setInterval(checkOnline, pollingInterval);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [pollingInterval, isOnline, onReconnect, onDisconnect]);
  
  // Manual connection check
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'no-cors',
      });
      
      if (!isOnline) {
        setIsOnline(true);
        setOfflineSince(null);
        onReconnect?.();
      }
      
      return true;
    } catch {
      if (isOnline) {
        setIsOnline(false);
        setOfflineSince(Date.now());
        onDisconnect?.();
      }
      return false;
    }
  }, [isOnline, onReconnect, onDisconnect]);
  
  return {
    isOnline,
    ...networkInfo,
    offlineDuration,
    offlineSince,
    checkConnection,
  };
}

/**
 * Simple offline banner component hook
 */
export function useOfflineBanner(show: boolean = true) {
  const { isOnline, offlineDuration } = useNetworkStatus();
  
  if (!show || isOnline) {
    return null;
  }
  
  return {
    isOffline: true,
    duration: offlineDuration,
    message: offlineDuration > 0 
      ? `You've been offline for ${offlineDuration}s`
      : 'You are currently offline',
  };
}

export default useNetworkStatus;
