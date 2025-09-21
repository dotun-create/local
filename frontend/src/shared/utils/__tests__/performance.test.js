/**
 * Performance Monitor Tests
 * Tests for performance monitoring utilities in the new architecture
 */

import { renderWithProviders } from '@shared/testing/test-utils';
import { performanceMonitor, generatePerformanceReport } from '../performance';

describe('Performance Monitor', () => {
  beforeEach(() => {
    performanceMonitor.metrics.clear();
    jest.clearAllMocks();
  });

  describe('Metric Recording', () => {
    it('records metrics correctly', () => {
      const testData = { value: 123, timestamp: Date.now() };

      performanceMonitor.recordMetric('test-metric', testData);

      const metrics = performanceMonitor.getAllMetrics();
      expect(metrics['test-metric']).toEqual([testData]);
    });

    it('accumulates multiple metrics of same type', () => {
      const data1 = { value: 100, timestamp: Date.now() };
      const data2 = { value: 200, timestamp: Date.now() + 1000 };

      performanceMonitor.recordMetric('load-time', data1);
      performanceMonitor.recordMetric('load-time', data2);

      const metrics = performanceMonitor.getAllMetrics();
      expect(metrics['load-time']).toHaveLength(2);
      expect(metrics['load-time']).toEqual([data1, data2]);
    });

    it('logs metrics in development mode', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      performanceMonitor.recordMetric('test', { value: 42 });

      expect(consoleSpy).toHaveBeenCalledWith('[Performance] test:', { value: 42 });

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Report Generation', () => {
    it('generates comprehensive performance report', () => {
      // Record some test metrics
      performanceMonitor.recordMetric('page-load', { duration: 1200 });
      performanceMonitor.recordMetric('api-call', { duration: 350 });
      performanceMonitor.recordMetric('render-time', { duration: 45 });

      const report = generatePerformanceReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('metrics');
      expect(report.metrics).toHaveProperty('page-load');
      expect(report.metrics).toHaveProperty('api-call');
      expect(report.metrics).toHaveProperty('render-time');
    });

    it('includes browser information when available', () => {
      // Mock window and navigator
      const originalWindow = global.window;
      const originalNavigator = global.navigator;

      global.window = { location: { href: 'https://test.com/page' } };
      global.navigator = { userAgent: 'Test Browser 1.0' };

      const report = performanceMonitor.getPerformanceReport();

      expect(report.url).toBe('https://test.com/page');
      expect(report.userAgent).toBe('Test Browser 1.0');

      global.window = originalWindow;
      global.navigator = originalNavigator;
    });

    it('handles missing browser APIs gracefully', () => {
      const originalWindow = global.window;
      const originalNavigator = global.navigator;

      global.window = undefined;
      global.navigator = undefined;

      const report = performanceMonitor.getPerformanceReport();

      expect(report.url).toBe('');
      expect(report.userAgent).toBe('');

      global.window = originalWindow;
      global.navigator = originalNavigator;
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('measures component render performance', async () => {
      const TestComponent = ({ children }) => {
        React.useEffect(() => {
          performanceMonitor.recordMetric('component-mount', {
            component: 'TestComponent',
            timestamp: Date.now()
          });
        }, []);

        return <div>{children}</div>;
      };

      renderWithProviders(<TestComponent>Test Content</TestComponent>);

      const metrics = performanceMonitor.getAllMetrics();
      expect(metrics['component-mount']).toHaveLength(1);
      expect(metrics['component-mount'][0]).toHaveProperty('component', 'TestComponent');
    });

    it('tracks user interaction performance', () => {
      const startTime = performance.now();

      // Simulate user interaction
      performanceMonitor.recordMetric('user-interaction', {
        type: 'click',
        element: 'button',
        duration: performance.now() - startTime
      });

      const metrics = performanceMonitor.getAllMetrics();
      expect(metrics['user-interaction']).toHaveLength(1);
      expect(metrics['user-interaction'][0].type).toBe('click');
    });

    it('monitors API call performance', async () => {
      const mockApiCall = async () => {
        const startTime = performance.now();

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));

        const endTime = performance.now();
        performanceMonitor.recordMetric('api-performance', {
          endpoint: '/api/test',
          duration: endTime - startTime,
          success: true
        });
      };

      await mockApiCall();

      const metrics = performanceMonitor.getAllMetrics();
      expect(metrics['api-performance']).toHaveLength(1);
      expect(metrics['api-performance'][0].endpoint).toBe('/api/test');
      expect(metrics['api-performance'][0].duration).toBeGreaterThan(90);
    });
  });

  describe('Memory and Resource Monitoring', () => {
    it('tracks memory usage when available', () => {
      const mockMemoryInfo = {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000
      };

      // Mock performance.memory
      Object.defineProperty(performance, 'memory', {
        value: mockMemoryInfo,
        configurable: true
      });

      performanceMonitor.recordMetric('memory-usage', {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        timestamp: Date.now()
      });

      const metrics = performanceMonitor.getAllMetrics();
      expect(metrics['memory-usage'][0].used).toBe(10000000);
    });

    it('handles missing performance APIs gracefully', () => {
      const originalPerformance = global.performance;

      // Remove performance API
      global.performance = undefined;

      expect(() => {
        performanceMonitor.recordMetric('test', { value: 1 });
      }).not.toThrow();

      global.performance = originalPerformance;
    });
  });

  describe('Performance Optimization Metrics', () => {
    it('tracks Core Web Vitals metrics', () => {
      // Simulate LCP (Largest Contentful Paint)
      performanceMonitor.recordMetric('lcp', {
        value: 2400,
        timestamp: Date.now(),
        element: 'main-image'
      });

      // Simulate FID (First Input Delay)
      performanceMonitor.recordMetric('fid', {
        value: 120,
        timestamp: Date.now(),
        inputType: 'click'
      });

      // Simulate CLS (Cumulative Layout Shift)
      performanceMonitor.recordMetric('cls', {
        value: 0.15,
        timestamp: Date.now(),
        sources: ['dynamic-content']
      });

      const metrics = performanceMonitor.getAllMetrics();
      expect(metrics.lcp[0].value).toBe(2400);
      expect(metrics.fid[0].value).toBe(120);
      expect(metrics.cls[0].value).toBe(0.15);
    });

    it('measures bundle size impact', () => {
      performanceMonitor.recordMetric('bundle-analysis', {
        totalSize: 512000,
        gzippedSize: 128000,
        chunks: ['main', 'vendor', 'shared'],
        loadTime: 850
      });

      const metrics = performanceMonitor.getAllMetrics();
      expect(metrics['bundle-analysis'][0].totalSize).toBe(512000);
      expect(metrics['bundle-analysis'][0].chunks).toHaveLength(3);
    });
  });
});