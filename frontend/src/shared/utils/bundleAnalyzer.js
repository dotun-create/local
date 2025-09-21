/**
 * Bundle Analyzer Utilities
 * Tools for analyzing and optimizing bundle sizes and dependencies
 */

// Webpack Bundle Analyzer Configuration
export const bundleAnalyzerConfig = {
  analyzerMode: 'server',
  analyzerHost: '127.0.0.1',
  analyzerPort: 8888,
  reportFilename: 'bundle-report.html',
  defaultSizes: 'parsed',
  openAnalyzer: true,
  generateStatsFile: true,
  statsFilename: 'stats.json',
  logLevel: 'info',
};

// Bundle size tracking
class BundleSizeTracker {
  constructor() {
    this.history = [];
    this.thresholds = {
      main: 250 * 1024,      // 250KB
      vendor: 500 * 1024,    // 500KB
      total: 1024 * 1024,    // 1MB
    };
  }

  // Analyze current bundle sizes
  async analyzeBundles() {
    try {
      const bundles = await this.getBundleInfo();
      const analysis = {
        timestamp: Date.now(),
        bundles,
        total: bundles.reduce((sum, bundle) => sum + bundle.size, 0),
        recommendations: this.generateRecommendations(bundles),
      };

      this.history.push(analysis);
      return analysis;
    } catch (error) {
      console.error('Bundle analysis failed:', error);
      return null;
    }
  }

  // Get bundle information from network tab
  async getBundleInfo() {
    const bundles = [];

    try {
      // Get all script elements
      const scripts = Array.from(document.querySelectorAll('script[src]'));

      for (const script of scripts) {
        try {
          const response = await fetch(script.src, { method: 'HEAD' });
          const size = parseInt(response.headers.get('content-length')) || 0;
          const gzipSize = parseInt(response.headers.get('content-encoding') === 'gzip' ?
            response.headers.get('content-length') : 0) || 0;

          bundles.push({
            name: this.getBundleName(script.src),
            url: script.src,
            size,
            gzipSize: gzipSize || size * 0.3, // Estimate if not available
            type: this.getBundleType(script.src),
          });
        } catch (error) {
          console.warn(`Failed to analyze bundle: ${script.src}`, error);
        }
      }

      return bundles;
    } catch (error) {
      console.error('Failed to get bundle info:', error);
      return [];
    }
  }

  getBundleName(url) {
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0];
  }

  getBundleType(url) {
    const filename = this.getBundleName(url);

    if (filename.includes('vendor') || filename.includes('vendors')) return 'vendor';
    if (filename.includes('main')) return 'main';
    if (filename.includes('runtime')) return 'runtime';
    if (filename.includes('chunk')) return 'chunk';
    return 'other';
  }

  // Generate optimization recommendations
  generateRecommendations(bundles) {
    const recommendations = [];
    const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);

    // Check total bundle size
    if (totalSize > this.thresholds.total) {
      recommendations.push({
        type: 'bundle-size',
        severity: 'high',
        message: `Total bundle size (${(totalSize / 1024).toFixed(1)}KB) exceeds recommended limit`,
        suggestions: [
          'Implement code splitting for routes',
          'Use dynamic imports for heavy components',
          'Remove unused dependencies',
          'Enable tree shaking',
        ]
      });
    }

    // Check individual bundle sizes
    bundles.forEach(bundle => {
      const threshold = this.thresholds[bundle.type] || this.thresholds.main;

      if (bundle.size > threshold) {
        recommendations.push({
          type: 'individual-bundle',
          severity: bundle.size > threshold * 2 ? 'high' : 'medium',
          bundle: bundle.name,
          message: `${bundle.name} (${(bundle.size / 1024).toFixed(1)}KB) is too large`,
          suggestions: this.getBundleSpecificSuggestions(bundle.type)
        });
      }
    });

    // Check vendor bundle composition
    const vendorBundles = bundles.filter(b => b.type === 'vendor');
    if (vendorBundles.length > 0) {
      const vendorSize = vendorBundles.reduce((sum, b) => sum + b.size, 0);

      if (vendorSize > this.thresholds.vendor) {
        recommendations.push({
          type: 'vendor-optimization',
          severity: 'medium',
          message: `Vendor bundles are too large (${(vendorSize / 1024).toFixed(1)}KB)`,
          suggestions: [
            'Split vendor chunks by usage frequency',
            'Use lighter alternative libraries',
            'Import only needed functions from large libraries',
            'Consider using a CDN for common libraries',
          ]
        });
      }
    }

    return recommendations;
  }

  getBundleSpecificSuggestions(type) {
    switch (type) {
      case 'main':
        return [
          'Move feature-specific code to separate chunks',
          'Implement route-based code splitting',
          'Use React.lazy for component-level splitting',
          'Remove unused code and imports',
        ];
      case 'vendor':
        return [
          'Use lighter alternative libraries',
          'Import only specific functions instead of entire libraries',
          'Consider polyfill strategies for modern browsers',
          'Use bundle analyzer to identify largest dependencies',
        ];
      case 'chunk':
        return [
          'Optimize chunk splitting strategy',
          'Combine small chunks to reduce HTTP requests',
          'Use prefetching for critical chunks',
        ];
      default:
        return [
          'Analyze bundle content for optimization opportunities',
          'Consider lazy loading strategies',
          'Remove unnecessary code',
        ];
    }
  }

  // Get historical trend
  getTrend(days = 7) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentHistory = this.history.filter(entry => entry.timestamp > cutoff);

    if (recentHistory.length < 2) return null;

    const oldest = recentHistory[0];
    const newest = recentHistory[recentHistory.length - 1];

    return {
      totalSizeChange: newest.total - oldest.total,
      percentChange: ((newest.total - oldest.total) / oldest.total) * 100,
      period: days,
      entries: recentHistory.length,
    };
  }

  // Export analysis data
  exportAnalysis() {
    const data = {
      timestamp: Date.now(),
      currentAnalysis: this.history[this.history.length - 1],
      history: this.history,
      trend: this.getTrend(),
      thresholds: this.thresholds,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bundle-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Webpack optimization helpers
export const getOptimizationConfig = (isProduction) => ({
  splitChunks: {
    chunks: 'all',
    minSize: 20000,
    maxSize: isProduction ? 250000 : 0,
    minChunks: 1,
    maxAsyncRequests: 30,
    maxInitialRequests: 30,
    cacheGroups: {
      // React and related libraries
      react: {
        test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
        name: 'react',
        priority: 20,
        reuseExistingChunk: true,
      },

      // UI libraries
      ui: {
        test: /[\\/]node_modules[\\/](styled-components|@emotion|material-ui)[\\/]/,
        name: 'ui',
        priority: 15,
        reuseExistingChunk: true,
      },

      // Utilities
      utils: {
        test: /[\\/]node_modules[\\/](lodash|moment|date-fns|axios)[\\/]/,
        name: 'utils',
        priority: 10,
        reuseExistingChunk: true,
      },

      // Shared application code
      shared: {
        test: /[\\/]src[\\/]shared[\\/]/,
        name: 'shared',
        priority: 8,
        minChunks: 2,
        reuseExistingChunk: true,
      },

      // Feature-specific chunks
      features: {
        test: /[\\/]src[\\/]features[\\/]/,
        name(module) {
          const featureName = module.context.match(/[\\/]features[\\/]([^[\\/]*)/);
          return featureName ? `feature-${featureName[1]}` : 'features';
        },
        priority: 5,
        minChunks: 1,
        reuseExistingChunk: true,
      },

      // Default vendor chunk
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendor',
        priority: 1,
        reuseExistingChunk: true,
      },
    },
  },

  usedExports: isProduction,
  sideEffects: false,

  minimizer: isProduction ? [
    // Add TerserPlugin configuration
    {
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
        },
        mangle: {
          safari10: true,
        },
        output: {
          comments: false,
          ascii_only: true,
        },
      },
      extractComments: false,
    },
  ] : [],
});

// Performance budget checker
export const checkPerformanceBudget = (bundles, budgets) => {
  const results = {
    passed: true,
    violations: [],
    summary: {},
  };

  Object.entries(budgets).forEach(([type, limit]) => {
    const relevantBundles = bundles.filter(b =>
      type === 'total' || b.type === type
    );

    const totalSize = relevantBundles.reduce((sum, b) => sum + b.size, 0);

    results.summary[type] = {
      size: totalSize,
      limit,
      percentage: (totalSize / limit) * 100,
    };

    if (totalSize > limit) {
      results.passed = false;
      results.violations.push({
        type,
        size: totalSize,
        limit,
        overage: totalSize - limit,
        percentage: ((totalSize - limit) / limit) * 100,
      });
    }
  });

  return results;
};

// Export singleton instance
export const bundleSizeTracker = new BundleSizeTracker();

export default {
  bundleAnalyzerConfig,
  bundleSizeTracker,
  getOptimizationConfig,
  checkPerformanceBudget,
};