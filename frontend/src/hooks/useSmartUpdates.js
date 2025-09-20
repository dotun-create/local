/**
 * React Hook for Smart Update Service Integration
 *
 * This hook provides an easy way for React components to:
 * - Subscribe to real-time updates
 * - Provide context to optimize polling frequency
 * - Trigger immediate update checks
 * - Access service status for debugging
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import smartUpdateService from '../services/smartUpdateService';

/**
 * Custom hook for smart update integration
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onUpdate - Callback when updates are received
 * @param {Object} options.context - Context to optimize polling (isInSession, userActivity, etc.)
 * @param {boolean} options.autoStart - Whether to auto-start the service (default: true)
 * @returns {Object} Hook interface with control methods and status
 */
export const useSmartUpdates = (options = {}) => {
  const {
    onUpdate = null,
    context = {},
    autoStart = true
  } = options;

  const [status, setStatus] = useState(() => smartUpdateService.getStatus());
  const [lastUpdate, setLastUpdate] = useState(null);
  const onUpdateRef = useRef(onUpdate);
  const unsubscribeRef = useRef(null);

  // Keep onUpdate reference current
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Setup update subscription
  useEffect(() => {
    if (onUpdateRef.current) {
      // Subscribe to updates
      unsubscribeRef.current = smartUpdateService.onUpdate((updates) => {
        setLastUpdate({
          updates,
          timestamp: new Date(),
          count: updates.length
        });

        // Call user's update handler
        if (onUpdateRef.current) {
          onUpdateRef.current(updates);
        }
      });

      // Cleanup subscription
      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    }
  }, []);

  // Update context when it changes
  useEffect(() => {
    if (Object.keys(context).length > 0) {
      smartUpdateService.setContext(context);
    }
  }, [context]);

  // Auto-start service
  useEffect(() => {
    if (autoStart) {
      smartUpdateService.start();
    }

    // Cleanup on unmount
    return () => {
      if (autoStart) {
        // Only stop if this was the component that started it
        // In practice, the service should remain running across components
      }
    };
  }, [autoStart]);

  // Status update interval
  useEffect(() => {
    const statusInterval = setInterval(() => {
      setStatus(smartUpdateService.getStatus());
    }, 5000); // Update status every 5 seconds

    return () => clearInterval(statusInterval);
  }, []);

  // Control methods
  const triggerUpdate = useCallback((reason = 'manual') => {
    smartUpdateService.triggerImmediateCheck(reason);
  }, []);

  const start = useCallback(() => {
    smartUpdateService.start();
  }, []);

  const stop = useCallback(() => {
    smartUpdateService.stop();
  }, []);

  const setServiceContext = useCallback((newContext) => {
    smartUpdateService.setContext(newContext);
  }, []);

  return {
    // Status information
    status,
    lastUpdate,
    isActive: status.isActive,
    currentInterval: status.currentInterval,
    consecutiveErrors: status.consecutiveErrors,

    // Control methods
    triggerUpdate,
    start,
    stop,
    setContext: setServiceContext,

    // Utility methods
    getStatus: () => smartUpdateService.getStatus()
  };
};

/**
 * Hook for session-aware updates
 * Optimized for tutoring sessions with real-time requirements
 */
export const useSessionUpdates = (sessionId = null, onUpdate = null) => {
  const isInSession = Boolean(sessionId);

  return useSmartUpdates({
    onUpdate,
    context: {
      isInSession,
      userActivity: isInSession ? 'activeSession' : 'browsing'
    },
    autoStart: true
  });
};

/**
 * Hook for dashboard updates
 * Optimized for dashboard browsing with moderate frequency
 */
export const useDashboardUpdates = (onUpdate = null) => {
  return useSmartUpdates({
    onUpdate,
    context: {
      isInSession: false,
      userActivity: 'browsing'
    },
    autoStart: true
  });
};

/**
 * Hook for admin updates
 * Higher frequency for admin interfaces that need quick updates
 */
export const useAdminUpdates = (onUpdate = null) => {
  return useSmartUpdates({
    onUpdate,
    context: {
      isInSession: false,
      userActivity: 'admin'
    },
    autoStart: true
  });
};

/**
 * Hook for background updates
 * Lower frequency for components that don't need immediate updates
 */
export const useBackgroundUpdates = (onUpdate = null) => {
  return useSmartUpdates({
    onUpdate,
    context: {
      isInSession: false,
      userActivity: 'background'
    },
    autoStart: true
  });
};

export default useSmartUpdates;