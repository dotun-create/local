/**
 * React Hook for Admin Refresh Integration
 * 
 * This hook integrates components with the hybrid refresh strategy,
 * listening for admin events and triggering appropriate refreshes.
 */

import { useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocketService';
import { refreshManager } from '../services/refreshManager';
import { notificationService } from '../services/notificationService';

/**
 * Hook to integrate admin refresh functionality
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.onRefresh - Callback to refresh data
 * @param {Array} options.entityTypes - Entity types to subscribe to
 * @param {Array} options.entityIds - Specific entity IDs to watch
 * @param {boolean} options.enableWebSocket - Enable WebSocket connection
 * @param {boolean} options.preserveState - Preserve UI state on refresh
 * @param {string} options.pageType - Type of page (admin, course, tutor, student)
 */
export const useAdminRefresh = (options = {}) => {
  const {
    onRefresh,
    entityTypes = [],
    entityIds = [],
    enableWebSocket = true,
    preserveState = true,
    pageType = 'general'
  } = options;

  const refreshCallbackRef = useRef(onRefresh);
  const isRefreshingRef = useRef(false);

  // Update callback ref when it changes
  useEffect(() => {
    refreshCallbackRef.current = onRefresh;
  }, [onRefresh]);

  // Handle data refresh
  const handleDataRefresh = useCallback(async (event) => {
    if (isRefreshingRef.current) {
      console.log('Refresh already in progress, skipping');
      return;
    }

    try {
      isRefreshingRef.current = true;
      console.log('Handling data refresh:', event);

      // Call the refresh callback if provided
      if (refreshCallbackRef.current) {
        await refreshCallbackRef.current(event);
      }

      // Show success notification
      notificationService.showSuccess('Data refreshed successfully');
      
    } catch (error) {
      console.error('Error during refresh:', error);
      notificationService.showError('Failed to refresh data');
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  // Handle selective refresh based on event type
  const handleSelectiveRefresh = useCallback(async (event) => {
    const { category, affectedEntities } = event.detail || {};
    
    console.log('Selective refresh for category:', category);
    
    // Check if this component should refresh
    const shouldRefresh = affectedEntities?.some(entity => {
      return entityTypes.includes(entity.type) || 
             entityIds.includes(entity.id);
    });

    if (shouldRefresh || entityTypes.length === 0) {
      await handleDataRefresh(event);
    }
  }, [entityTypes, entityIds, handleDataRefresh]);

  // Setup WebSocket and event listeners
  useEffect(() => {
    if (!enableWebSocket) return;

    // Connect WebSocket
    websocketService.connect();

    // Subscribe to specific entities
    entityTypes.forEach(type => {
      entityIds.forEach(id => {
        websocketService.subscribeToEntity(type, id);
      });
    });

    // Add event listeners for different refresh events
    const refreshHandlers = {
      'adminDataRefresh': handleDataRefresh,
      'refreshAdminData': handleDataRefresh,
      'refreshCourseData': handleSelectiveRefresh,
      'refreshUserData': handleSelectiveRefresh,
      'refreshSessionData': handleSelectiveRefresh,
      'refreshEnrollmentData': handleSelectiveRefresh,
    };

    // Register all handlers
    Object.entries(refreshHandlers).forEach(([event, handler]) => {
      window.addEventListener(event, handler);
    });

    // Page-specific refresh events
    if (pageType === 'admin') {
      window.addEventListener('refreshAdminData', handleDataRefresh);
    } else if (pageType === 'course') {
      window.addEventListener('refreshCourseData', handleDataRefresh);
    } else if (pageType === 'tutor') {
      window.addEventListener('refreshTutorData', handleDataRefresh);
    } else if (pageType === 'student') {
      window.addEventListener('refreshStudentData', handleDataRefresh);
    }

    // Cleanup
    return () => {
      Object.entries(refreshHandlers).forEach(([event, handler]) => {
        window.removeEventListener(event, handler);
      });

      if (pageType === 'admin') {
        window.removeEventListener('refreshAdminData', handleDataRefresh);
      } else if (pageType === 'course') {
        window.removeEventListener('refreshCourseData', handleDataRefresh);
      } else if (pageType === 'tutor') {
        window.removeEventListener('refreshTutorData', handleDataRefresh);
      } else if (pageType === 'student') {
        window.removeEventListener('refreshStudentData', handleDataRefresh);
      }
    };
  }, [enableWebSocket, entityTypes, entityIds, pageType, handleDataRefresh, handleSelectiveRefresh]);

  // Manual refresh trigger
  const triggerRefresh = useCallback(() => {
    handleDataRefresh({ manual: true });
  }, [handleDataRefresh]);

  // Check if refresh is in progress
  const isRefreshing = () => isRefreshingRef.current;

  // Return utilities
  return {
    triggerRefresh,
    isRefreshing: isRefreshing(),
    handleDataRefresh
  };
};

/**
 * Hook for admin-specific pages
 */
export const useAdminPageRefresh = (onRefresh) => {
  return useAdminRefresh({
    onRefresh,
    pageType: 'admin',
    entityTypes: ['user', 'course', 'enrollment', 'payment'],
    enableWebSocket: true,
    preserveState: true
  });
};

/**
 * Hook for course detail pages
 */
export const useCoursePageRefresh = (courseId, onRefresh) => {
  return useAdminRefresh({
    onRefresh,
    pageType: 'course',
    entityTypes: ['course', 'session', 'module', 'enrollment'],
    entityIds: courseId ? [courseId] : [],
    enableWebSocket: true,
    preserveState: true
  });
};

/**
 * Hook for tutor pages
 */
export const useTutorPageRefresh = (tutorId, onRefresh) => {
  return useAdminRefresh({
    onRefresh,
    pageType: 'tutor',
    entityTypes: ['user', 'session', 'availability'],
    entityIds: tutorId ? [tutorId] : [],
    enableWebSocket: true,
    preserveState: true
  });
};

/**
 * Hook for student pages
 */
export const useStudentPageRefresh = (studentId, onRefresh) => {
  return useAdminRefresh({
    onRefresh,
    pageType: 'student',
    entityTypes: ['user', 'enrollment', 'session', 'quiz'],
    entityIds: studentId ? [studentId] : [],
    enableWebSocket: true,
    preserveState: true
  });
};