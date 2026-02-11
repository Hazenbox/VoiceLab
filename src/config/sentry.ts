/**
 * Sentry Error Tracking Configuration
 * 
 * Initializes Sentry for error monitoring and performance tracking.
 * Only active in production when VITE_SENTRY_DSN is configured.
 */

import * as Sentry from '@sentry/react';

// Environment detection
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// Sentry DSN from environment
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

/**
 * Initialize Sentry error tracking
 */
export function initSentry(): void {
  // Only initialize if DSN is configured
  if (!SENTRY_DSN) {
    if (isDevelopment) {
      console.log('[Sentry] Not initialized - VITE_SENTRY_DSN not configured');
    }
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      
      // Environment configuration
      environment: isProduction ? 'production' : 'development',
      
      // Release tracking (set via CI/CD)
      release: import.meta.env.VITE_APP_VERSION || 'unknown',
      
      // Performance monitoring
      tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev
      
      // Session replay (only in production)
      replaysSessionSampleRate: isProduction ? 0.1 : 0,
      replaysOnErrorSampleRate: isProduction ? 1.0 : 0,
      
      // Integrations
      integrations: [
        // Browser tracing for performance
        Sentry.browserTracingIntegration(),
        
        // Replay integration for session recording (production only)
        ...(isProduction ? [Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        })] : []),
      ],
      
      // Filter out noise
      ignoreErrors: [
        // Browser extensions
        'ResizeObserver loop',
        'Non-Error promise rejection',
        // Network errors that aren't actionable
        'Failed to fetch',
        'NetworkError',
        'Load failed',
        // User cancellation
        'AbortError',
        // Chrome-specific
        'chrome-extension',
        'extensions',
      ],
      
      // Sampling for breadcrumbs
      beforeBreadcrumb(breadcrumb) {
        // Filter out noisy console logs
        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
          return null;
        }
        return breadcrumb;
      },
      
      // Data scrubbing
      beforeSend(event) {
        // Remove sensitive data
        if (event.request?.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['Cookie'];
        }
        
        // Don't send events in development
        if (isDevelopment) {
          console.log('[Sentry] Would send event:', event.message || event.exception?.values?.[0]?.value);
          return null;
        }
        
        return event;
      },
    });

    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
}

/**
 * Capture an error with additional context
 */
export function captureError(
  error: Error | string,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: Sentry.SeverityLevel;
    user?: { id?: string; email?: string };
  }
): string | undefined {
  if (!SENTRY_DSN) {
    console.error('[Error]', error, context);
    return undefined;
  }

  const eventId = Sentry.captureException(
    typeof error === 'string' ? new Error(error) : error,
    {
      tags: context?.tags,
      extra: context?.extra,
      level: context?.level || 'error',
      user: context?.user,
    }
  );

  return eventId;
}

/**
 * Capture a message (info, warning, etc.)
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  extra?: Record<string, unknown>
): string | undefined {
  if (!SENTRY_DSN) {
    console.log(`[${level.toUpperCase()}]`, message, extra);
    return undefined;
  }

  return Sentry.captureMessage(message, {
    level,
    extra,
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  Sentry.setUser(user);
}

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
  level: Sentry.SeverityLevel = 'info'
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({ name, op });
}

/**
 * Wrap a component with Sentry error boundary
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * HOC for wrapping components with error boundary
 */
export function withSentryErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
): React.ComponentType<P> {
  return Sentry.withErrorBoundary(Component, {
    fallback: fallback || <DefaultErrorFallback />,
  });
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback(): JSX.Element {
  return (
    <div style={{
      padding: '20px',
      textAlign: 'center',
      color: '#666',
    }}>
      <h2 style={{ marginBottom: '10px', color: '#333' }}>Something went wrong</h2>
      <p>We've been notified and are working on a fix.</p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: '15px',
          padding: '8px 16px',
          background: '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Reload Page
      </button>
    </div>
  );
}

// Export Sentry instance for advanced usage
export { Sentry };
