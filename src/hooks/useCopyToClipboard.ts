/**
 * useCopyToClipboard Hook
 * Provides clipboard copy functionality with feedback
 */

import { useState, useCallback } from 'react';

interface UseCopyToClipboardReturn {
  isCopied: boolean;
  error: Error | null;
  copyToClipboard: (text: string) => Promise<void>;
  resetCopyState: () => void;
}

export function useCopyToClipboard(resetDelay = 2000): UseCopyToClipboardReturn {
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      // Modern clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        setError(null);

        // Reset after delay
        if (resetDelay > 0) {
          setTimeout(() => {
            setIsCopied(false);
          }, resetDelay);
        }
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        const successful = document.execCommand('copy');
        textarea.remove();

        if (successful) {
          setIsCopied(true);
          setError(null);
          
          if (resetDelay > 0) {
            setTimeout(() => {
              setIsCopied(false);
            }, resetDelay);
          }
        } else {
          throw new Error('Copy command failed');
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to copy');
      setError(error);
      setIsCopied(false);
      console.error('Copy to clipboard failed:', error);
    }
  }, [resetDelay]);

  const resetCopyState = useCallback(() => {
    setIsCopied(false);
    setError(null);
  }, []);

  return {
    isCopied,
    error,
    copyToClipboard,
    resetCopyState,
  };
}
