import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
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
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    if (window.reportError) {
      window.reportError(error, errorInfo);
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

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-header">
              <span className="error-icon">⚠️</span>
              <h3>Something went wrong</h3>
            </div>

            <div className="error-boundary-message">
              <p>
                {this.props.userMessage ||
                 "We're sorry, but something unexpected happened. Please try again."}
              </p>

              {this.props.showDetails && this.state.error && (
                <details className="error-details">
                  <summary>Technical details</summary>
                  <pre className="error-stack">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="error-boundary-actions">
              <button
                className="btn btn-primary"
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= 3}
              >
                {this.state.retryCount >= 3 ? 'Max retries reached' : 'Try Again'}
              </button>

              {this.props.onReport && (
                <button
                  className="btn btn-outline"
                  onClick={() => this.props.onReport(this.state.error, this.state.errorInfo)}
                >
                  Report Issue
                </button>
              )}

              <button
                className="btn btn-outline"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;