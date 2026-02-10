/**
 * Error Boundary Component
 * Catches React rendering errors and displays a fallback UI
 */

import React, { Component, type ReactNode } from 'react';
import { DSIcon } from './DSIcon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center h-full min-h-[200px] p-4">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 mx-auto mb-4 text-red-500 flex items-center justify-center">
              <DSIcon name="IcWarning" size="L" attention="high" />
            </div>
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Minimal error fallback for inline use
 */
export function ErrorFallback({ 
  error, 
  onReset 
}: { 
  error?: Error; 
  onReset?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <span className="text-red-500 flex-shrink-0">
        <DSIcon name="IcInfo" size="S" attention="high" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-700 dark:text-red-300 truncate">
          {error?.message || 'Something went wrong'}
        </p>
      </div>
      {onReset && (
        <button
          onClick={onReset}
          className="text-xs text-red-600 dark:text-red-400 hover:underline flex-shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
}
