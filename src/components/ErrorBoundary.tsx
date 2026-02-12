/**
 * Error Boundary Component
 * 
 * Catches React render errors and logs them to analytics.
 * Provides a fallback UI when errors occur.
 * 
 * Phase 5 Enhancements:
 * - Granular error boundaries for individual features
 * - Error classification (recoverable vs fatal)
 * - Session recovery support
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { getErrorLogger } from '../services/analytics/errorLogger';

// ── Error Classification ──────────────────────────────────────────────

type ErrorSeverity = 'recoverable' | 'warning' | 'fatal';

function classifyError(error: Error): ErrorSeverity {
  const message = error.message.toLowerCase();
  
  // Fatal errors that require reload
  if (message.includes('chunk') || message.includes('loading')) return 'fatal'; // Code splitting failure
  if (message.includes('out of memory')) return 'fatal';
  if (message.includes('maximum call stack')) return 'fatal';
  
  // Warnings that don't need full recovery
  if (message.includes('failed to fetch')) return 'warning';
  if (message.includes('network')) return 'warning';
  if (message.includes('timeout')) return 'warning';
  
  // Most errors are recoverable
  return 'recoverable';
}

// ── Types ────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional name for this boundary (for analytics) */
  name?: string;
  /** Render a minimal inline error instead of full-page */
  inline?: boolean;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Auto-retry after this many ms (0 = no auto-retry) */
  autoRetryMs?: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorSeverity: ErrorSeverity;
  retryCount: number;
}

// ── Error Boundary Component ─────────────────────────────────────────

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private autoRetryTimeout: ReturnType<typeof setTimeout> | null = null;
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorSeverity: 'recoverable',
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { 
      hasError: true, 
      error,
      errorSeverity: classifyError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const boundaryName = this.props.name || 'unknown';
    
    // Log to console first (before analytics that could fail)
    console.error(`[ErrorBoundary:${boundaryName}] Caught error:`, error?.message);
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Stack:', error?.stack);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }
    
    // Classify and log to analytics
    let severity: 'recoverable' | 'warning' | 'fatal' = 'recoverable';
    try {
      severity = classifyError(error);
      const errorLogger = getErrorLogger();
      errorLogger.logReactError(error, {
        componentStack: errorInfo.componentStack ?? undefined,
        boundaryName,
        severity,
        retryCount: this.state.retryCount,
      });
    } catch (analyticsError) {
      console.warn('[ErrorBoundary] Analytics logging failed:', analyticsError);
    }

    // Update state with error info
    this.setState({ errorInfo, errorSeverity: severity });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Auto-retry for recoverable errors (max 3 times)
    if (
      this.props.autoRetryMs && 
      this.props.autoRetryMs > 0 && 
      severity === 'recoverable' && 
      this.state.retryCount < 3
    ) {
      this.autoRetryTimeout = setTimeout(() => {
        this.handleRetry();
      }, this.props.autoRetryMs);
    }
  }
  
  componentWillUnmount(): void {
    if (this.autoRetryTimeout) {
      clearTimeout(this.autoRetryTimeout);
    }
  }

  handleRetry = (): void => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorSeverity: 'recoverable',
      retryCount: prevState.retryCount + 1,
    }));
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
      
      // Render inline error for non-critical boundaries
      if (this.props.inline) {
        return (
          <InlineErrorFallback
            error={this.state.error}
            severity={this.state.errorSeverity}
            onRetry={this.handleRetry}
            boundaryName={this.props.name}
          />
        );
      }

      // Default full-page fallback UI
      return (
        <ErrorFallback
          error={this.state.error}
          severity={this.state.errorSeverity}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

// ── Inline Error Fallback (for feature boundaries) ──────────────────

interface InlineErrorFallbackProps {
  error: Error | null;
  severity: ErrorSeverity;
  onRetry: () => void;
  boundaryName?: string;
}

function InlineErrorFallback({ error, severity, onRetry, boundaryName }: InlineErrorFallbackProps): JSX.Element {
  const isWarning = severity === 'warning';
  const bgColor = isWarning ? '#fffbeb' : '#fef2f2';
  const borderColor = isWarning ? '#fbbf24' : '#fca5a5';
  const textColor = isWarning ? '#92400e' : '#991b1b';
  
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: bgColor,
        borderRadius: '8px',
        border: `1px solid ${borderColor}`,
        margin: '8px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '20px' }}>{isWarning ? '⚠️' : '❌'}</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: textColor }}>
            {boundaryName ? `${boundaryName} failed to load` : 'something went wrong'}
          </p>
          {error && process.env.NODE_ENV === 'development' && (
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: textColor, opacity: 0.8 }}>
              {error.message}
            </p>
          )}
        </div>
        <button
          onClick={onRetry}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'white',
            backgroundColor: '#5046e5',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          retry
        </button>
      </div>
    </div>
  );
}

// ── Default Full-Page Fallback UI ────────────────────────────────────

interface ErrorFallbackProps {
  error: Error | null;
  severity: ErrorSeverity;
  onRetry: () => void;
  onReload: () => void;
}

function ErrorFallback({ error, severity, onRetry, onReload }: ErrorFallbackProps): JSX.Element {
  const isFatal = severity === 'fatal';
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
          {isFatal 
            ? 'a critical error occurred. please reload the page to continue.'
            : 'we\'ve logged this error and will look into it. you can try again or reload the page.'}
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
