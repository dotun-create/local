/**
 * Performance Monitoring and Optimization Utilities
 * Tools for measuring and improving application performance
 */

import React from 'react';

// Performance metrics collection
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.initialized = false;
    this.init();
  }

  init() {
    if (typeof window === 'undefined' || this.initialized) return;
    this.initialized = true;
  }

  recordMetric(type, data) {
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }
    this.metrics.get(type).push(data);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${type}:`, data);
    }
  }

  getPerformanceReport() {
    const metrics = this.getAllMetrics();
    return {
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      metrics,
      summary: {}
    };
  }

  getAllMetrics() {
    const result = {};
    for (const [type, metrics] of this.metrics.entries()) {
      result[type] = metrics;
    }
    return result;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Performance report generator
export const generatePerformanceReport = () => {
  const report = performanceMonitor.getPerformanceReport();
  return {
    ...report,
    generatedAt: new Date().toISOString()
  };
};

export default {
  performanceMonitor,
  generatePerformanceReport
};