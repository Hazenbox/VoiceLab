/**
 * Error Boundary Component
 * 
 * Catches React render errors and logs them to analytics.
 * Provides a fallback UI when errors occur.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { getErrorLogger } from '../services/analytics/errorLogger';

// ── Types ────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ── Error Boundary Component ─────────────────────────────────────────

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to analytics
    const errorLogger = getErrorLogger();
    errorLogger.logReactError(error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Also log to console for debugging
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

// ── Default Fallback UI ──────────────────────────────────────────────

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  onReload: () => void;
}

function ErrorFallback({ error, onRetry, onReload }: ErrorFallbackProps): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        backgroundColor: '#f8f9fa',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}
        >
          ⚠️
        </div>
        
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#1a1a1a',
            marginBottom: '8px',
          }}
        >
          something went wrong
        </h1>
        
        <p
          style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '24px',
            lineHeight: 1.5,
          }}
        >
          we've logged this error and will look into it.
          you can try again or reload the page.
        </p>

        {error && process.env.NODE_ENV === 'development' && (
          <details
            style={{
              textAlign: 'left',
              marginBottom: '24px',
              padding: '12px',
              backgroundColor: '#fff5f5',
              borderRadius: '8px',
              border: '1px solid #feb2b2',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                color: '#c53030',
              }}
            >
              error details (dev only)
            </summary>
            <pre
              style={{
                marginTop: '8px',
                fontSize: '11px',
                color: '#742a2a',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}

        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={onRetry}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'white',
              backgroundColor: '#5046e5',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#4338ca';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#5046e5';
            }}
          >
            try again
          </button>
          
          <button
            onClick={onReload}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            reload page
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Higher-Order Component ───────────────────────────────────────────

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.ComponentType<P> {
  return function WithErrorBoundaryWrapper(props: P): JSX.Element {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
