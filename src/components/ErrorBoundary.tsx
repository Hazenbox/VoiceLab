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
import { Button, Title, Text, Label } from '@marcelinodzn/ds-react';
import { getErrorLogger } from '../services/analytics/errorLogger';
import { DSIcon } from './DSIcon';
import { useThemeColors } from '../theme';

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
  const theme = useThemeColors();
  const isWarning = severity === 'warning';
  
  const semanticColor = isWarning ? theme.semantic.warning : theme.semantic.negative;
  const bgColor = theme.isLight 
    ? (isWarning ? '#fffbeb' : '#fef2f2')
    : (isWarning ? '#451a03' : '#450a0a');
  const borderColor = theme.isLight
    ? (isWarning ? '#fbbf24' : '#fca5a5')
    : (isWarning ? '#b45309' : '#b91c1c');
  
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
        <DSIcon 
          name={isWarning ? 'IcWarning' : 'IcClose'} 
          size="M" 
          appearance={isWarning ? 'warning' : 'negative'}
        />
        <div style={{ flex: 1 }}>
          <Label size="M" weight="high" style={{ color: semanticColor }}>
            {boundaryName ? `${boundaryName} failed to load` : 'something went wrong'}
          </Label>
          {error && import.meta.env.DEV && (
            <Label size="S" weight="low" style={{ color: semanticColor, opacity: 0.8, marginTop: '4px', display: 'block' }}>
              {error.message}
            </Label>
          )}
        </div>
        <Button
          appearance="primary"
          size="XS"
          onPress={onRetry}
        >
          retry
        </Button>
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
  const theme = useThemeColors();
  const isFatal = severity === 'fatal';
  
  const errorDetailsBg = theme.isLight ? '#fef2f2' : '#450a0a';
  const errorDetailsText = theme.isLight ? '#991b1b' : '#fca5a5';
  
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        backgroundColor: theme.background.ghost,
      }}
    >
      <div
        style={{
          maxWidth: '1000px',
          width: '100%',
          textAlign: 'left',
          padding: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <DSIcon 
            name="IcWarning" 
            size="M" 
            appearance="negative"
          />
          <Title 
            size="L" 
            as="h1" 
            weight="high" 
            color="high"
          >
            Something went wrong
          </Title>
        </div>
        
        <Text 
          size="S" 
          color="medium"
          style={{ marginBottom: '24px', lineHeight: 1.5 }}
        >
          {isFatal 
            ? 'A critical error occurred. Please reload the page to continue.'
            : 'We\'ve logged this error and will look into it. You can try again or reload the page.'}
        </Text>

        {error && import.meta.env.DEV && (
          <div
            style={{
              textAlign: 'left',
              marginBottom: '24px',
              padding: '12px',
              backgroundColor: errorDetailsBg,
              borderRadius: '8px',
            }}
          >
            <Label size="S" weight="high" style={{ color: errorDetailsText, marginBottom: '8px', display: 'block' }}>
              Error details (dev only)
            </Label>
            <pre
              style={{
                marginTop: '8px',
                fontSize: '11px',
                color: errorDetailsText,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '12px',
          }}
        >
          <Button
            appearance="primary"
            size="S"
            onPress={onRetry}
          >
            Try again
          </Button>
          
          <Button
            appearance="ghost"
            size="S"
            onPress={onReload}
          >
            Reload page
          </Button>
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
