/**
 * Lazy Loading Utilities
 * Enhanced lazy loading with error handling, retry logic, and loading states
 */

import React, { Suspense, Component } from 'react';
import { Spinner } from '../components/ui/Spinner';

// Enhanced lazy loading wrapper with retry logic
export const createLazyComponent = (importFunction, options = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    fallbackComponent: FallbackComponent = DefaultLoadingFallback,
    errorComponent: ErrorComponent = DefaultErrorFallback,
    preload = false
  } = options;

  let retryCount = 0;

  const LazyComponent = React.lazy(async () => {
    try {
      const module = await importFunction();
      retryCount = 0; // Reset on success
      return module;
    } catch (error) {
      // Log error for debugging
      console.error('Failed to load component:', error);

      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying component load (attempt ${retryCount}/${maxRetries})`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));

        // Retry the import
        return importFunction();
      }

      // If all retries failed, throw the error
      throw error;
    }
  });

  // Add preloading capability
  if (preload) {
    // Preload the component after a delay
    setTimeout(() => {
      importFunction().catch(() => {
        // Ignore preload errors
      });
    }, 100);
  }

  // Return wrapper component with error boundary
  const WrappedComponent = React.forwardRef((props, ref) => (
    <LazyErrorBoundary ErrorComponent={ErrorComponent}>
      <Suspense fallback={<FallbackComponent />}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    </LazyErrorBoundary>
  ));

  WrappedComponent.displayName = `LazyLoaded(${LazyComponent.displayName || 'Component'})`;
  WrappedComponent.preload = () => importFunction();

  return WrappedComponent;
};

// Default loading fallback component
const DefaultLoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    flexDirection: 'column',
    gap: '1rem'
  }}>
    <Spinner size="lg" />
    <span style={{ color: 'var(--color-text-secondary, #666)' }}>
      Loading...
    </span>
  </div>
);

// Default error fallback component
const DefaultErrorFallback = ({ error, retry }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    flexDirection: 'column',
    gap: '1rem',
    padding: '2rem',
    textAlign: 'center'
  }}>
    <div style={{ color: 'var(--color-state-error, #dc2626)' }}>
      ⚠️ Failed to load component
    </div>
    <div style={{
      color: 'var(--color-text-secondary, #666)',
      fontSize: '0.875rem',
      marginBottom: '1rem'
    }}>
      {error?.message || 'Something went wrong while loading this page.'}
    </div>
    <button
      onClick={retry}
      style={{
        padding: '0.5rem 1rem',
        backgroundColor: 'var(--color-interactive-primary, #0066cc)',
        color: 'white',
        border: 'none',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        fontSize: '0.875rem'
      }}
    >
      Try Again
    </button>
  </div>
);

// Error boundary for lazy components
class LazyErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { ErrorComponent } = this.props;
      return <ErrorComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

// Route-specific loading components
export const PageLoadingFallback = ({ title = 'Loading page...' }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
    flexDirection: 'column',
    gap: '1.5rem'
  }}>
    <Spinner size="xl" />
    <div style={{
      fontSize: '1.125rem',
      fontWeight: '500',
      color: 'var(--color-text-primary, #1a1a1a)'
    }}>
      {title}
    </div>
  </div>
);

export const ComponentLoadingFallback = ({ height = '200px' }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: height,
    flexDirection: 'column',
    gap: '1rem'
  }}>
    <Spinner size="md" />
  </div>
);

// Preloading utilities
export const preloadComponent = (lazyComponent) => {
  if (lazyComponent.preload) {
    return lazyComponent.preload();
  }
  return Promise.resolve();
};

export const preloadMultipleComponents = (lazyComponents) => {
  return Promise.allSettled(
    lazyComponents.map(component => preloadComponent(component))
  );
};

// Route-based preloading
export const preloadRouteComponents = (routes) => {
  const componentsToPreload = routes
    .filter(route => route.preload)
    .map(route => route.component);

  return preloadMultipleComponents(componentsToPreload);
};

// Intersection Observer for preloading
export const createPreloadObserver = (components, options = {}) => {
  const {
    rootMargin = '50px',
    threshold = 0.1
  } = options;

  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const component = components[entry.target.dataset.preloadComponent];
        if (component) {
          preloadComponent(component);
        }
      }
    });
  }, { rootMargin, threshold });
};

// Bundle analysis utilities (development only)
export const logBundleInfo = (componentName, startTime) => {
  if (process.env.NODE_ENV === 'development') {
    const loadTime = performance.now() - startTime;
    console.log(`📦 ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
  }
};

// Progressive loading for complex pages
export class ProgressiveLoader {
  constructor(components, options = {}) {
    this.components = components;
    this.options = {
      delay: 100,
      priority: 'high',
      ...options
    };
    this.loaded = new Set();
  }

  async loadNext() {
    for (const [name, component] of Object.entries(this.components)) {
      if (!this.loaded.has(name)) {
        try {
          await preloadComponent(component);
          this.loaded.add(name);
          await new Promise(resolve => setTimeout(resolve, this.options.delay));
        } catch (error) {
          console.warn(`Failed to progressively load ${name}:`, error);
        }
      }
    }
  }

  async loadAll() {
    try {
      await preloadMultipleComponents(Object.values(this.components));
      Object.keys(this.components).forEach(name => this.loaded.add(name));
    } catch (error) {
      console.warn('Failed to load some components:', error);
    }
  }

  isLoaded(componentName) {
    return this.loaded.has(componentName);
  }

  getLoadedCount() {
    return this.loaded.size;
  }

  getTotalCount() {
    return Object.keys(this.components).length;
  }

  getProgress() {
    return (this.getLoadedCount() / this.getTotalCount()) * 100;
  }
}

export default {
  createLazyComponent,
  PageLoadingFallback,
  ComponentLoadingFallback,
  preloadComponent,
  preloadMultipleComponents,
  preloadRouteComponents,
  createPreloadObserver,
  logBundleInfo,
  ProgressiveLoader
};