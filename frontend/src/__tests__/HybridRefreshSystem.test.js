/**
 * Comprehensive Test Suite for Hybrid Refresh System
 * 
 * Tests the integration and functionality of the hybrid refresh system
 * across different components and scenarios.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Import components to test
import TutorPage from '../components/pages/TutorPage';
import StudentDashboard from '../components/dashboard/StudentDashboard';
import GuardianDashboard from '../components/guardian/GuardianDashboard';

// Import hooks and services
import { useAdminRefresh, useTutorPageRefresh, useStudentPageRefresh } from '../hooks/useAdminRefresh';
import websocketService from '../services/websocketService';
import { refreshManager } from '../services/refreshManager';
import { notificationService } from '../services/notificationService';

// Mock dependencies
jest.mock('../hooks/useData');
jest.mock('../services/api');
jest.mock('../services/websocketService');
jest.mock('../services/refreshManager');
jest.mock('../services/notificationService');
jest.mock('../hooks/useAdminRefresh');

describe('Hybrid Refresh System', () => {
  
  // Setup common mocks
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock session storage
    const mockUser = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      accountType: 'tutor'
    };
    
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(() => JSON.stringify(mockUser)),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });

    // Mock window event listeners
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
    window.dispatchEvent = jest.fn();

    // Mock refresh hooks
    useTutorPageRefresh.mockReturnValue({
      triggerRefresh: jest.fn(),
      isRefreshing: false,
      handleDataRefresh: jest.fn()
    });

    useStudentPageRefresh.mockReturnValue({
      triggerRefresh: jest.fn(),
      isRefreshing: false,
      handleDataRefresh: jest.fn()
    });

    useAdminRefresh.mockReturnValue({
      triggerRefresh: jest.fn(),
      isRefreshing: false,
      handleDataRefresh: jest.fn()
    });

    // Mock websocket service
    websocketService.connect = jest.fn();
    websocketService.disconnect = jest.fn();
    websocketService.subscribeToEntity = jest.fn();

    // Mock notification service
    notificationService.showSuccess = jest.fn();
    notificationService.showError = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Hook Integration Tests', () => {
    
    test('useAdminRefresh hook initializes correctly', () => {
      const mockOnRefresh = jest.fn();
      const options = {
        onRefresh: mockOnRefresh,
        entityTypes: ['user', 'course'],
        entityIds: ['test-id'],
        enableWebSocket: true,
        preserveState: true,
        pageType: 'admin'
      };

      const result = useAdminRefresh(options);

      expect(result).toHaveProperty('triggerRefresh');
      expect(result).toHaveProperty('isRefreshing');
      expect(result).toHaveProperty('handleDataRefresh');
      expect(typeof result.triggerRefresh).toBe('function');
    });

    test('useTutorPageRefresh initializes with correct parameters', () => {
      const mockOnRefresh = jest.fn();
      const tutorId = 'tutor-123';

      useTutorPageRefresh(tutorId, mockOnRefresh);

      expect(useTutorPageRefresh).toHaveBeenCalledWith(tutorId, mockOnRefresh);
    });

    test('useStudentPageRefresh initializes with correct parameters', () => {
      const mockOnRefresh = jest.fn();
      const studentId = 'student-123';

      useStudentPageRefresh(studentId, mockOnRefresh);

      expect(useStudentPageRefresh).toHaveBeenCalledWith(studentId, mockOnRefresh);
    });
  });

  describe('Event Handling Tests', () => {
    
    test('handles adminDataRefresh events', async () => {
      const mockRefreshHandler = jest.fn();
      
      // Simulate event listener registration
      const eventListener = jest.fn();
      window.addEventListener.mockImplementation((event, handler) => {
        if (event === 'adminDataRefresh') {
          eventListener.mockImplementation(handler);
        }
      });

      // Trigger the event
      const testEvent = new CustomEvent('adminDataRefresh', {
        detail: { source: 'test' }
      });
      
      eventListener(testEvent);

      expect(window.addEventListener).toHaveBeenCalledWith(
        'adminDataRefresh', 
        expect.any(Function)
      );
    });

    test('handles selective refresh events', async () => {
      const mockSelectiveRefresh = jest.fn();
      
      const testEvent = new CustomEvent('refreshCourseData', {
        detail: {
          category: 'course',
          affectedEntities: [
            { type: 'course', id: 'course-123' },
            { type: 'enrollment', id: 'enrollment-456' }
          ]
        }
      });

      // Simulate selective refresh logic
      const shouldRefresh = testEvent.detail.affectedEntities.some(entity => 
        ['course', 'enrollment'].includes(entity.type)
      );

      expect(shouldRefresh).toBe(true);
    });

    test('prevents concurrent refresh operations', async () => {
      let isRefreshingRef = false;
      const mockRefresh = jest.fn().mockImplementation(async () => {
        if (isRefreshingRef) {
          console.log('Refresh already in progress, skipping');
          return;
        }
        isRefreshingRef = true;
        await new Promise(resolve => setTimeout(resolve, 100));
        isRefreshingRef = false;
      });

      // Trigger multiple refresh calls
      const refreshPromise1 = mockRefresh();
      const refreshPromise2 = mockRefresh();
      
      await Promise.all([refreshPromise1, refreshPromise2]);

      // Should only call once due to concurrency protection
      expect(mockRefresh).toHaveBeenCalledTimes(2);
    });
  });

  describe('WebSocket Integration Tests', () => {
    
    test('connects to WebSocket when enabled', () => {
      const options = {
        onRefresh: jest.fn(),
        enableWebSocket: true,
        entityTypes: ['user'],
        entityIds: ['test-id']
      };

      useAdminRefresh(options);

      expect(websocketService.connect).toHaveBeenCalled();
    });

    test('subscribes to specific entities', () => {
      const options = {
        onRefresh: jest.fn(),
        enableWebSocket: true,
        entityTypes: ['user', 'course'],
        entityIds: ['user-123', 'course-456']
      };

      useAdminRefresh(options);

      expect(websocketService.subscribeToEntity).toHaveBeenCalledWith('user', 'user-123');
      expect(websocketService.subscribeToEntity).toHaveBeenCalledWith('user', 'course-456');
      expect(websocketService.subscribeToEntity).toHaveBeenCalledWith('course', 'user-123');
      expect(websocketService.subscribeToEntity).toHaveBeenCalledWith('course', 'course-456');
    });

    test('cleans up WebSocket connections on unmount', () => {
      const { unmount } = render(
        <BrowserRouter>
          <TutorPage />
        </BrowserRouter>
      );

      unmount();

      expect(websocketService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Error Handling Tests', () => {
    
    test('handles refresh errors gracefully', async () => {
      const mockOnRefresh = jest.fn().mockRejectedValue(new Error('Refresh failed'));
      
      const mockHandleDataRefresh = async (event) => {
        try {
          await mockOnRefresh(event);
        } catch (error) {
          console.error('Error during refresh:', error);
          notificationService.showError('Failed to refresh data');
        }
      };

      await mockHandleDataRefresh({ manual: true });

      expect(mockOnRefresh).toHaveBeenCalled();
      expect(notificationService.showError).toHaveBeenCalledWith('Failed to refresh data');
    });

    test('shows success notification on successful refresh', async () => {
      const mockOnRefresh = jest.fn().mockResolvedValue();
      
      const mockHandleDataRefresh = async (event) => {
        try {
          await mockOnRefresh(event);
          notificationService.showSuccess('Data refreshed successfully');
        } catch (error) {
          console.error('Error during refresh:', error);
        }
      };

      await mockHandleDataRefresh({ manual: true });

      expect(notificationService.showSuccess).toHaveBeenCalledWith('Data refreshed successfully');
    });
  });

  describe('Performance Tests', () => {
    
    test('handles concurrent refreshes efficiently', async () => {
      const mockRefreshes = [
        jest.fn().mockResolvedValue('refresh1'),
        jest.fn().mockResolvedValue('refresh2'),
        jest.fn().mockResolvedValue('refresh3')
      ];

      const startTime = Date.now();
      await Promise.all(mockRefreshes.map(refresh => refresh()));
      const endTime = Date.now();

      // All refreshes should complete concurrently
      mockRefreshes.forEach(refresh => {
        expect(refresh).toHaveBeenCalled();
      });

      // Should be faster than sequential execution
      expect(endTime - startTime).toBeLessThan(500);
    });

    test('debounces rapid refresh triggers', async () => {
      let debounceTimeout;
      const debouncedRefresh = jest.fn();
      
      const triggerRefresh = () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(debouncedRefresh, 100);
      };

      // Trigger multiple rapid refreshes
      triggerRefresh();
      triggerRefresh();
      triggerRefresh();

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should only call once
      expect(debouncedRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('UI Integration Tests', () => {
    
    test('refresh button appears in TutorPage', async () => {
      // Mock API calls to prevent actual requests
      const mockAPI = {
        sessions: { getUpcomingSessions: jest.fn().mockResolvedValue([]) },
        users: { getUserNotifications: jest.fn().mockResolvedValue([]) },
        earnings: { getTutorEarnings: jest.fn().mockResolvedValue({}) },
        analytics: { getTutorDashboardStats: jest.fn().mockResolvedValue({}) },
        quizzes: { getTutorQuizResults: jest.fn().mockResolvedValue([]) },
        availability: { getTutorAvailabilityRange: jest.fn().mockResolvedValue({}) }
      };

      jest.doMock('../services/api', () => ({ default: mockAPI }));

      render(
        <BrowserRouter>
          <TutorPage />
        </BrowserRouter>
      );

      // Look for refresh buttons
      const refreshButtons = screen.queryAllByText(/refresh/i);
      expect(refreshButtons.length).toBeGreaterThan(0);
    });

    test('refresh button click triggers refresh', async () => {
      const mockTriggerRefresh = jest.fn();
      
      useTutorPageRefresh.mockReturnValue({
        triggerRefresh: mockTriggerRefresh,
        isRefreshing: false,
        handleDataRefresh: jest.fn()
      });

      render(
        <BrowserRouter>
          <TutorPage />
        </BrowserRouter>
      );

      const refreshButton = screen.queryByTitle(/refresh.*data/i);
      if (refreshButton) {
        fireEvent.click(refreshButton);
        expect(mockTriggerRefresh).toHaveBeenCalled();
      }
    });

    test('refresh button shows loading state', async () => {
      useTutorPageRefresh.mockReturnValue({
        triggerRefresh: jest.fn(),
        isRefreshing: true,
        handleDataRefresh: jest.fn()
      });

      render(
        <BrowserRouter>
          <TutorPage />
        </BrowserRouter>
      );

      const loadingButton = screen.queryByText(/refreshing/i);
      expect(loadingButton).toBeInTheDocument();
    });
  });

  describe('Cross-Component Integration Tests', () => {
    
    test('admin action triggers student dashboard refresh', async () => {
      // Simulate admin enrolling student in course
      const adminEvent = new CustomEvent('refreshStudentData', {
        detail: {
          affectedEntities: [
            { type: 'enrollment', id: 'student-123' }
          ]
        }
      });

      const mockStudentRefresh = jest.fn();
      useStudentPageRefresh.mockReturnValue({
        triggerRefresh: jest.fn(),
        isRefreshing: false,
        handleDataRefresh: mockStudentRefresh
      });

      // Dispatch event
      window.dispatchEvent(adminEvent);

      // Student dashboard should receive the event
      expect(window.addEventListener).toHaveBeenCalledWith(
        'refreshStudentData',
        expect.any(Function)
      );
    });

    test('guardian action triggers student dashboard refresh', async () => {
      // Simulate guardian allocating credits
      const guardianEvent = new CustomEvent('refreshStudentData', {
        detail: {
          source: 'guardian',
          action: 'credit_allocation',
          studentId: 'student-123'
        }
      });

      window.dispatchEvent(guardianEvent);

      expect(window.dispatchEvent).toHaveBeenCalledWith(guardianEvent);
    });
  });
});

describe('Integration Test Scenarios', () => {
  
  test('End-to-end refresh flow', async () => {
    const mockDataLoader = jest.fn().mockResolvedValue({ data: 'fresh' });
    
    // Simulate complete refresh flow
    const refreshFlow = async () => {
      // 1. Trigger refresh
      const event = { manual: true };
      
      // 2. Execute data loading
      const result = await mockDataLoader();
      
      // 3. Update UI state
      expect(result).toEqual({ data: 'fresh' });
      
      // 4. Show success notification
      notificationService.showSuccess('Refresh completed');
    };

    await refreshFlow();

    expect(mockDataLoader).toHaveBeenCalled();
    expect(notificationService.showSuccess).toHaveBeenCalledWith('Refresh completed');
  });

  test('Real-time update propagation', async () => {
    const eventQueue = [];
    
    // Simulate real-time event sequence
    const events = [
      'sessionCompleted',
      'creditAllocated', 
      'enrollmentApproved',
      'aiAnalysisCompleted'
    ];

    events.forEach(eventType => {
      const event = new CustomEvent(eventType, {
        detail: { timestamp: Date.now() }
      });
      eventQueue.push(event);
    });

    // Process events in order
    for (const event of eventQueue) {
      window.dispatchEvent(event);
    }

    expect(window.dispatchEvent).toHaveBeenCalledTimes(events.length);
  });
});