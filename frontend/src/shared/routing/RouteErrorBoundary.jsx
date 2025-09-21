/**
 * Route Error Boundary Component
 * Catches and handles errors in route components
 */

import React, { Component } from 'react';

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log error for monitoring
    console.error('Route Error:', error);
    console.error('Error Info:', errorInfo);

    // You can integrate with error reporting services here
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  componentDidUpdate(prevProps) {
    // Reset error state when route changes
    if (prevProps.route?.path !== this.props.route?.path && this.state.hasError) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: 0
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReportError = () => {
    const { error, errorInfo } = this.state;
    const { route } = this.props;

    // Create error report
    const errorReport = {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      route: route?.path,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // You can send this to your error reporting service
    console.log('Error Report:', errorReport);

    // For demo purposes, copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => alert('Error report copied to clipboard'))
      .catch(() => alert('Failed to copy error report'));
  };

  render() {
    if (this.state.hasError) {
      const { route } = this.props;
      const { error, retryCount } = this.state;

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: 'var(--color-background-primary, #ffffff)',
          color: 'var(--color-text-primary, #1a1a1a)'
        }}>
          {/* Error Icon */}
          <div style={{
            fontSize: '4rem',
            marginBottom: '1rem',
            color: 'var(--color-state-error, #dc2626)'
          }}>
            ⚠️
          </div>

          {/* Error Title */}
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: 'var(--color-text-primary, #1a1a1a)'
          }}>
            Something went wrong
          </h1>

          {/* Error Description */}
          <p style={{
            fontSize: '1rem',
            color: 'var(--color-text-secondary, #6b7280)',
            marginBottom: '1.5rem',
            maxWidth: '500px',
            lineHeight: '1.5'
          }}>
            {route?.title ? `There was an error loading the ${route.title} page.` : 'An unexpected error occurred.'}
            {retryCount > 0 && ` (Retry attempt: ${retryCount})`}
          </p>

          {/* Error Details (Development only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <details style={{
              marginBottom: '2rem',
              padding: '1rem',
              backgroundColor: 'var(--color-surface-secondary, #f9fafb)',
              border: '1px solid var(--color-border-primary, #d1d5db)',
              borderRadius: '0.5rem',
              maxWidth: '600px',
              textAlign: 'left'
            }}>
              <summary style={{
                cursor: 'pointer',
                fontWeight: '500',
                marginBottom: '0.5rem'
              }}>
                Error Details
              </summary>
              <pre style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-tertiary, #9ca3af)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {error.message}
              </pre>
              {error.stack && (
                <pre style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-tertiary, #9ca3af)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  marginTop: '0.5rem'
                }}>
                  {error.stack}
                </pre>
              )}
            </details>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--color-interactive-primary, #0066cc)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              Try Again
            </button>

            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary, #6b7280)',
                border: '1px solid var(--color-border-primary, #d1d5db)',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Go Home
            </button>

            <button
              onClick={() => window.history.back()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary, #6b7280)',
                border: '1px solid var(--color-border-primary, #d1d5db)',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Go Back
            </button>

            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={this.handleReportError}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'var(--color-state-warning, #f59e0b)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Copy Error Report
              </button>
            )}
          </div>

          {/* Additional Help */}
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: 'var(--color-surface-secondary, #f9fafb)',
            border: '1px solid var(--color-border-primary, #d1d5db)',
            borderRadius: '0.5rem',
            maxWidth: '500px'
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
              color: 'var(--color-text-primary, #1a1a1a)'
            }}>
              Need Help?
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary, #6b7280)',
              margin: 0
            }}>
              If this problem persists, please contact our support team with the error details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;