/**
 * Performance Benchmarking and Optimization Tools
 * Comprehensive performance monitoring, measurement, and optimization utilities
 */

import { performanceMonitor } from './performance';

// Core Web Vitals thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },      // Largest Contentful Paint
  FID: { good: 100, poor: 300 },        // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },       // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 },      // First Contentful Paint
  TTI: { good: 3800, poor: 7300 },      // Time to Interactive
};

// Bundle size thresholds (in KB)
const BUNDLE_THRESHOLDS = {
  main: { good: 250, poor: 500 },
  vendor: { good: 500, poor: 1000 },
  total: { good: 1000, poor: 2000 },
};

// Memory usage thresholds (in MB)
const MEMORY_THRESHOLDS = {
  heapUsed: { good: 50, poor: 100 },
  heapTotal: { good: 100, poor: 200 },
};

class PerformanceBenchmark {
  constructor() {
    this.measurements = new Map();
    this.observers = new Map();
    this.initialized = false;
    this.init();
  }

  init() {
    if (typeof window === 'undefined' || this.initialized) return;

    this.initialized = true;
    this.setupCoreWebVitalsObserver();
    this.setupNavigationObserver();
    this.setupResourceObserver();
    this.startMemoryMonitoring();
  }

  // Core Web Vitals Monitoring
  setupCoreWebVitalsObserver() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];

          this.recordMetric('LCP', {
            value: lastEntry.renderTime || lastEntry.loadTime,
            timestamp: Date.now(),
            rating: this.getRating(lastEntry.renderTime || lastEntry.loadTime, PERFORMANCE_THRESHOLDS.LCP),
            element: lastEntry.element?.tagName || 'unknown'
          });
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('LCP', lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.recordMetric('FID', {
              value: entry.processingStart - entry.startTime,
              timestamp: Date.now(),
              rating: this.getRating(entry.processingStart - entry.startTime, PERFORMANCE_THRESHOLDS.FID),
              inputType: entry.name
            });
          });
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('FID', fidObserver);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });

          this.recordMetric('CLS', {
            value: clsValue,
            timestamp: Date.now(),
            rating: this.getRating(clsValue, PERFORMANCE_THRESHOLDS.CLS)
          });
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('CLS', clsObserver);
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }
    }
  }

  // Navigation timing
  setupNavigationObserver() {
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.recordMetric('Navigation', {
              dns: entry.domainLookupEnd - entry.domainLookupStart,
              tcp: entry.connectEnd - entry.connectStart,
              request: entry.responseStart - entry.requestStart,
              response: entry.responseEnd - entry.responseStart,
              domProcessing: entry.domContentLoadedEventStart - entry.responseEnd,
              domComplete: entry.domComplete - entry.domContentLoadedEventStart,
              loadComplete: entry.loadEventEnd - entry.loadEventStart,
              totalTime: entry.loadEventEnd - entry.navigationStart,
              timestamp: Date.now()
            });
          });
        });

        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('Navigation', navObserver);
      } catch (error) {
        console.warn('Navigation observer not supported:', error);
      }
    }
  }

  // Resource loading performance
  setupResourceObserver() {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const size = entry.transferSize || entry.encodedBodySize || 0;
            const duration = entry.responseEnd - entry.startTime;

            this.recordMetric('Resource', {
              name: entry.name,
              type: entry.initiatorType,
              duration,
              size,
              timestamp: Date.now(),
              rating: this.getResourceRating(duration, size)
            });
          });
        });

        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('Resource', resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported:', error);
      }
    }
  }

  // Memory monitoring
  startMemoryMonitoring() {
    if ('memory' in performance) {
      const measureMemory = () => {
        const memInfo = performance.memory;

        this.recordMetric('Memory', {
          usedJSHeapSize: Math.round(memInfo.usedJSHeapSize / 1048576), // MB
          totalJSHeapSize: Math.round(memInfo.totalJSHeapSize / 1048576), // MB
          jsHeapSizeLimit: Math.round(memInfo.jsHeapSizeLimit / 1048576), // MB
          timestamp: Date.now(),
          rating: this.getMemoryRating(memInfo.usedJSHeapSize / 1048576)
        });
      };

      // Measure memory every 30 seconds
      measureMemory();
      setInterval(measureMemory, 30000);
    }
  }

  // Bundle size analysis
  async analyzeBundleSize() {
    try {
      // Estimate bundle sizes from loaded scripts
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const bundleData = await Promise.all(
        scripts.map(async (script) => {
          try {
            const response = await fetch(script.src, { method: 'HEAD' });
            const size = parseInt(response.headers.get('content-length')) || 0;
            return {
              url: script.src,
              size: size / 1024, // KB
              type: this.getBundleType(script.src)
            };
          } catch {
            return { url: script.src, size: 0, type: 'unknown' };
          }
        })
      );

      const bundleAnalysis = bundleData.reduce((acc, bundle) => {
        if (!acc[bundle.type]) acc[bundle.type] = { size: 0, files: [] };
        acc[bundle.type].size += bundle.size;
        acc[bundle.type].files.push(bundle);
        return acc;
      }, {});

      const totalSize = bundleData.reduce((sum, bundle) => sum + bundle.size, 0);

      this.recordMetric('BundleAnalysis', {
        bundles: bundleAnalysis,
        totalSize,
        rating: this.getBundleRating(totalSize),
        timestamp: Date.now()
      });

      return bundleAnalysis;
    } catch (error) {
      console.warn('Bundle analysis failed:', error);
      return {};
    }
  }

  // Component performance measurement
  measureComponentRender(componentName, renderFn) {
    return async (...args) => {
      const startTime = performance.now();
      const startMemory = performance.memory?.usedJSHeapSize || 0;

      try {
        const result = await renderFn(...args);

        const endTime = performance.now();
        const endMemory = performance.memory?.usedJSHeapSize || 0;
        const renderTime = endTime - startTime;
        const memoryUsage = (endMemory - startMemory) / 1048576; // MB

        this.recordMetric('ComponentRender', {
          component: componentName,
          renderTime,
          memoryUsage,
          timestamp: Date.now(),
          rating: this.getComponentRating(renderTime)
        });

        return result;
      } catch (error) {
        const endTime = performance.now();
        const renderTime = endTime - startTime;

        this.recordMetric('ComponentRender', {
          component: componentName,
          renderTime,
          error: error.message,
          timestamp: Date.now(),
          rating: 'error'
        });

        throw error;
      }
    };
  }

  // Rating functions
  getRating(value, thresholds) {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  getResourceRating(duration, size) {
    if (duration < 100 && size < 50000) return 'good';
    if (duration < 500 && size < 200000) return 'needs-improvement';
    return 'poor';
  }

  getMemoryRating(usedMB) {
    return this.getRating(usedMB, MEMORY_THRESHOLDS.heapUsed);
  }

  getBundleRating(totalSizeKB) {
    return this.getRating(totalSizeKB, BUNDLE_THRESHOLDS.total);
  }

  getComponentRating(renderTime) {
    if (renderTime < 16) return 'good'; // 60fps
    if (renderTime < 33) return 'needs-improvement'; // 30fps
    return 'poor';
  }

  getBundleType(url) {
    if (url.includes('vendor')) return 'vendor';
    if (url.includes('main')) return 'main';
    if (url.includes('runtime')) return 'runtime';
    if (url.includes('chunk')) return 'chunk';
    return 'other';
  }

  // Record metrics
  recordMetric(type, data) {
    if (!this.measurements.has(type)) {
      this.measurements.set(type, []);
    }

    this.measurements.get(type).push(data);
    performanceMonitor.recordMetric(type, data);

    // Emit performance event for real-time monitoring
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performance-metric', {
        detail: { type, data }
      }));
    }
  }

  // Generate comprehensive performance report
  generatePerformanceReport() {
    const report = {
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      metrics: {},
      summary: {},
      recommendations: []
    };

    // Process all measurements
    for (const [type, measurements] of this.measurements.entries()) {
      report.metrics[type] = measurements;
      report.summary[type] = this.generateSummary(type, measurements);
    }

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report.summary);

    return report;
  }

  generateSummary(type, measurements) {
    if (measurements.length === 0) return null;

    const values = measurements.map(m => typeof m.value === 'number' ? m.value : 0);
    const ratings = measurements.map(m => m.rating).filter(Boolean);

    return {
      count: measurements.length,
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      latest: measurements[measurements.length - 1],
      ratings: {
        good: ratings.filter(r => r === 'good').length,
        needsImprovement: ratings.filter(r => r === 'needs-improvement').length,
        poor: ratings.filter(r => r === 'poor').length
      }
    };
  }

  generateRecommendations(summary) {
    const recommendations = [];

    // LCP recommendations
    if (summary.LCP && summary.LCP.average > PERFORMANCE_THRESHOLDS.LCP.good) {
      recommendations.push({
        metric: 'LCP',
        priority: 'high',
        issue: 'Largest Contentful Paint is slow',
        suggestions: [
          'Optimize images and use next-gen formats (WebP, AVIF)',
          'Implement lazy loading for below-the-fold content',
          'Reduce server response times',
          'Eliminate render-blocking resources',
          'Use a CDN for static assets'
        ]
      });
    }

    // FID recommendations
    if (summary.FID && summary.FID.average > PERFORMANCE_THRESHOLDS.FID.good) {
      recommendations.push({
        metric: 'FID',
        priority: 'high',
        issue: 'First Input Delay is high',
        suggestions: [
          'Break up long-running JavaScript tasks',
          'Use code splitting to reduce bundle sizes',
          'Implement service workers for caching',
          'Defer non-critical JavaScript',
          'Use requestIdleCallback for non-urgent work'
        ]
      });
    }

    // CLS recommendations
    if (summary.CLS && summary.CLS.average > PERFORMANCE_THRESHOLDS.CLS.good) {
      recommendations.push({
        metric: 'CLS',
        priority: 'medium',
        issue: 'Cumulative Layout Shift is high',
        suggestions: [
          'Set explicit dimensions for images and videos',
          'Reserve space for dynamic content',
          'Avoid inserting content above existing content',
          'Use CSS containment for dynamic elements',
          'Preload critical fonts'
        ]
      });
    }

    // Memory recommendations
    if (summary.Memory && summary.Memory.average > MEMORY_THRESHOLDS.heapUsed.good) {
      recommendations.push({
        metric: 'Memory',
        priority: 'medium',
        issue: 'High memory usage detected',
        suggestions: [
          'Implement component memoization with React.memo',
          'Use useCallback and useMemo for expensive computations',
          'Clean up event listeners and subscriptions',
          'Implement virtual scrolling for large lists',
          'Optimize Redux store structure'
        ]
      });
    }

    // Bundle size recommendations
    if (summary.BundleAnalysis && summary.BundleAnalysis.latest?.totalSize > BUNDLE_THRESHOLDS.total.good) {
      recommendations.push({
        metric: 'Bundle Size',
        priority: 'high',
        issue: 'Bundle size is too large',
        suggestions: [
          'Implement dynamic imports for route-based code splitting',
          'Remove unused dependencies',
          'Use tree shaking to eliminate dead code',
          'Implement component-level code splitting',
          'Consider using lighter alternative libraries'
        ]
      });
    }

    return recommendations;
  }

  // Cleanup
  cleanup() {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
    this.measurements.clear();
  }
}

// Export singleton instance
export const performanceBenchmark = new PerformanceBenchmark();

// Helper functions for components
export const withPerformanceTracking = (Component, componentName) => {
  return React.forwardRef((props, ref) => {
    const measureRender = performanceBenchmark.measureComponentRender(
      componentName,
      () => Component
    );

    return React.createElement(measureRender(), { ...props, ref });
  });
};

export const usePerformanceMetric = (metricName) => {
  const [metric, setMetric] = React.useState(null);

  React.useEffect(() => {
    const handleMetric = (event) => {
      if (event.detail.type === metricName) {
        setMetric(event.detail.data);
      }
    };

    window.addEventListener('performance-metric', handleMetric);
    return () => window.removeEventListener('performance-metric', handleMetric);
  }, [metricName]);

  return metric;
};

export default performanceBenchmark;