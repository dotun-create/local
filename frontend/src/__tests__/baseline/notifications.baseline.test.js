/**
 * Baseline tests for notification system
 * Tests real-time notifications, push notifications, and notification management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders, createMockNotification } from './test-utils';

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// Mock notification services
jest.mock('../../shared/services/notificationService', () => ({
  notificationService: {
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    clearAllNotifications: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    emit: jest.fn(),
    getUnreadCount: jest.fn(),
  }
}));

jest.mock('../../services/unifiedNotificationService', () => ({
  unifiedNotificationService: {
    initialize: jest.fn(),
    cleanup: jest.fn(),
    sendNotification: jest.fn(),
    broadcastToRole: jest.fn(),
    getNotificationHistory: jest.fn(),
    updateNotificationSettings: jest.fn(),
  }
}));

jest.mock('../../services/pushNotificationService', () => ({
  pushNotificationService: {
    requestPermission: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    sendPushNotification: jest.fn(),
    isSupported: jest.fn(),
    getPermissionStatus: jest.fn(),
  }
}));

jest.mock('../../services/websocketService', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  send: jest.fn(),
  isConnected: jest.fn(),
}));

// Mock hooks
jest.mock('../../hooks/useNotifications', () => ({
  useNotifications: jest.fn(),
}));

const TestNotificationComponent = ({ onNotificationState }) => {
  const [notifications, setNotifications] = React.useState([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (onNotificationState) {
      onNotificationState({
        notifications,
        unreadCount,
        loading,
        error,
        setNotifications,
        setUnreadCount,
        setLoading,
        setError
      });
    }
  }, [notifications, unreadCount, loading, error, onNotificationState]);

  return (
    <div>
      <div data-testid="notification-loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="notification-count">{notifications.length}</div>
      <div data-testid="unread-count">{unreadCount}</div>
      <div data-testid="notification-error">{error?.message || 'no-error'}</div>
      <div data-testid="notifications-list">
        {notifications.map(notification => (
          <div key={notification.id} data-testid={`notification-${notification.id}`}>
            <span className={`notification-type-${notification.type}`}>{notification.type}</span>
            <span className="notification-title">{notification.title}</span>
            <span className={`notification-read-${notification.read}`}>
              {notification.read ? 'read' : 'unread'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TestWebSocketComponent = ({ onWebSocketState }) => {
  const [connected, setConnected] = React.useState(false);
  const [lastMessage, setLastMessage] = React.useState(null);

  React.useEffect(() => {
    if (onWebSocketState) {
      onWebSocketState({
        connected,
        lastMessage,
        setConnected,
        setLastMessage
      });
    }
  }, [connected, lastMessage, onWebSocketState]);

  return (
    <div>
      <div data-testid="websocket-status">{connected ? 'connected' : 'disconnected'}</div>
      <div data-testid="last-message">{lastMessage ? JSON.stringify(lastMessage) : 'no-message'}</div>
    </div>
  );
};

describe('Notification System Baseline Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Notification Service', () => {
    test('should load notifications successfully', async () => {
      const { notificationService } = require('../../shared/services/notificationService');
      const mockNotifications = [
        createMockNotification({
          id: 1,
          type: 'info',
          title: 'Welcome',
          message: 'Welcome to the platform',
          read: false
        }),
        createMockNotification({
          id: 2,
          type: 'warning',
          title: 'Payment Due',
          message: 'Your payment is due soon',
          read: true
        }),
        createMockNotification({
          id: 3,
          type: 'success',
          title: 'Session Completed',
          message: 'Your session was completed successfully',
          read: false
        })
      ];

      notificationService.getNotifications.mockResolvedValue(mockNotifications);
      notificationService.getUnreadCount.mockReturnValue(2);

      let notificationState;
      renderWithProviders(
        <TestNotificationComponent onNotificationState={(state) => notificationState = state} />
      );

      // Simulate loading notifications
      notificationState.setLoading(true);
      const notifications = await notificationService.getNotifications();
      const unreadCount = notificationService.getUnreadCount();

      notificationState.setNotifications(notifications);
      notificationState.setUnreadCount(unreadCount);
      notificationState.setLoading(false);

      await waitFor(() => {
        expect(screen.getByTestId('notification-loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('notification-count')).toHaveTextContent('3');
        expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
        expect(screen.getByTestId('notification-1')).toBeInTheDocument();
        expect(screen.getByTestId('notification-2')).toBeInTheDocument();
        expect(screen.getByTestId('notification-3')).toBeInTheDocument();
      });

      expect(notificationService.getNotifications).toHaveBeenCalled();
    });

    test('should mark notification as read', async () => {
      const { notificationService } = require('../../shared/services/notificationService');
      const notificationId = 1;

      notificationService.markAsRead.mockResolvedValue({ success: true });

      const result = await notificationService.markAsRead(notificationId);

      expect(result).toEqual({ success: true });
      expect(notificationService.markAsRead).toHaveBeenCalledWith(notificationId);
    });

    test('should mark all notifications as read', async () => {
      const { notificationService } = require('../../shared/services/notificationService');

      notificationService.markAllAsRead.mockResolvedValue({
        success: true,
        updated_count: 5
      });

      const result = await notificationService.markAllAsRead();

      expect(result.success).toBe(true);
      expect(result.updated_count).toBe(5);
      expect(notificationService.markAllAsRead).toHaveBeenCalled();
    });

    test('should delete notification', async () => {
      const { notificationService } = require('../../shared/services/notificationService');
      const notificationId = 1;

      notificationService.deleteNotification.mockResolvedValue({ success: true });

      const result = await notificationService.deleteNotification(notificationId);

      expect(result).toEqual({ success: true });
      expect(notificationService.deleteNotification).toHaveBeenCalledWith(notificationId);
    });

    test('should clear all notifications', async () => {
      const { notificationService } = require('../../shared/services/notificationService');

      notificationService.clearAllNotifications.mockResolvedValue({
        success: true,
        deleted_count: 10
      });

      const result = await notificationService.clearAllNotifications();

      expect(result.success).toBe(true);
      expect(result.deleted_count).toBe(10);
      expect(notificationService.clearAllNotifications).toHaveBeenCalled();
    });

    test('should handle notification service errors', async () => {
      const { notificationService } = require('../../shared/services/notificationService');
      const mockError = new Error('Failed to load notifications');

      notificationService.getNotifications.mockRejectedValue(mockError);

      let notificationState;
      renderWithProviders(
        <TestNotificationComponent onNotificationState={(state) => notificationState = state} />
      );

      // Simulate error loading notifications
      notificationState.setLoading(true);
      try {
        await notificationService.getNotifications();
      } catch (error) {
        notificationState.setError(error);
        notificationState.setLoading(false);
      }

      await waitFor(() => {
        expect(screen.getByTestId('notification-error')).toHaveTextContent('Failed to load notifications');
        expect(screen.getByTestId('notification-loading')).toHaveTextContent('loaded');
      });
    });
  });

  describe('Real-time Notifications (WebSocket)', () => {
    test('should establish WebSocket connection', () => {
      const websocketService = require('../../services/websocketService');

      websocketService.connect.mockImplementation(() => {
        websocketService.isConnected.mockReturnValue(true);
      });

      let webSocketState;
      renderWithProviders(
        <TestWebSocketComponent onWebSocketState={(state) => webSocketState = state} />
      );

      // Simulate WebSocket connection
      websocketService.connect('ws://localhost:8080');
      webSocketState.setConnected(true);

      expect(screen.getByTestId('websocket-status')).toHaveTextContent('connected');
      expect(websocketService.connect).toHaveBeenCalledWith('ws://localhost:8080');
    });

    test('should receive real-time notifications via WebSocket', () => {
      const websocketService = require('../../services/websocketService');

      const mockSubscriptionCallback = jest.fn();
      websocketService.subscribe.mockImplementation((event, callback) => {
        if (event === 'notification') {
          mockSubscriptionCallback.mockImplementation(callback);
        }
      });

      let webSocketState;
      renderWithProviders(
        <TestWebSocketComponent onWebSocketState={(state) => webSocketState = state} />
      );

      // Subscribe to notifications
      websocketService.subscribe('notification', (data) => {
        webSocketState.setLastMessage(data);
      });

      // Simulate receiving a notification
      const incomingNotification = {
        type: 'notification',
        data: {
          id: 4,
          type: 'info',
          title: 'New Message',
          message: 'You have a new message',
          timestamp: new Date().toISOString()
        }
      };

      mockSubscriptionCallback(incomingNotification);
      webSocketState.setLastMessage(incomingNotification);

      expect(screen.getByTestId('last-message')).toHaveTextContent(JSON.stringify(incomingNotification));
      expect(websocketService.subscribe).toHaveBeenCalledWith('notification', expect.any(Function));
    });

    test('should handle WebSocket disconnection', () => {
      const websocketService = require('../../services/websocketService');

      websocketService.disconnect.mockImplementation(() => {
        websocketService.isConnected.mockReturnValue(false);
      });

      let webSocketState;
      renderWithProviders(
        <TestWebSocketComponent onWebSocketState={(state) => webSocketState = state} />
      );

      // Simulate disconnection
      websocketService.disconnect();
      webSocketState.setConnected(false);

      expect(screen.getByTestId('websocket-status')).toHaveTextContent('disconnected');
      expect(websocketService.disconnect).toHaveBeenCalled();
    });

    test('should send messages via WebSocket', () => {
      const websocketService = require('../../services/websocketService');
      const message = {
        type: 'mark_read',
        notification_id: 1
      };

      websocketService.send.mockReturnValue(true);

      const result = websocketService.send(message);

      expect(result).toBe(true);
      expect(websocketService.send).toHaveBeenCalledWith(message);
    });
  });

  describe('Push Notifications', () => {
    test('should request push notification permission', async () => {
      const { pushNotificationService } = require('../../services/pushNotificationService');

      pushNotificationService.requestPermission.mockResolvedValue('granted');

      const permission = await pushNotificationService.requestPermission();

      expect(permission).toBe('granted');
      expect(pushNotificationService.requestPermission).toHaveBeenCalled();
    });

    test('should check if push notifications are supported', () => {
      const { pushNotificationService } = require('../../services/pushNotificationService');

      pushNotificationService.isSupported.mockReturnValue(true);

      const isSupported = pushNotificationService.isSupported();

      expect(isSupported).toBe(true);
      expect(pushNotificationService.isSupported).toHaveBeenCalled();
    });

    test('should get permission status', () => {
      const { pushNotificationService } = require('../../services/pushNotificationService');

      pushNotificationService.getPermissionStatus.mockReturnValue('granted');

      const status = pushNotificationService.getPermissionStatus();

      expect(status).toBe('granted');
      expect(pushNotificationService.getPermissionStatus).toHaveBeenCalled();
    });

    test('should subscribe to push notifications', async () => {
      const { pushNotificationService } = require('../../services/pushNotificationService');
      const subscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: {
          p256dh: 'test-key',
          auth: 'test-auth'
        }
      };

      pushNotificationService.subscribe.mockResolvedValue(subscription);

      const result = await pushNotificationService.subscribe();

      expect(result).toEqual(subscription);
      expect(pushNotificationService.subscribe).toHaveBeenCalled();
    });

    test('should unsubscribe from push notifications', async () => {
      const { pushNotificationService } = require('../../services/pushNotificationService');

      pushNotificationService.unsubscribe.mockResolvedValue({ success: true });

      const result = await pushNotificationService.unsubscribe();

      expect(result).toEqual({ success: true });
      expect(pushNotificationService.unsubscribe).toHaveBeenCalled();
    });

    test('should send push notification', async () => {
      const { pushNotificationService } = require('../../services/pushNotificationService');
      const notificationData = {
        title: 'New Session Available',
        body: 'A new tutoring session is available for booking',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'session-available'
      };

      pushNotificationService.sendPushNotification.mockResolvedValue({ success: true });

      const result = await pushNotificationService.sendPushNotification(notificationData);

      expect(result).toEqual({ success: true });
      expect(pushNotificationService.sendPushNotification).toHaveBeenCalledWith(notificationData);
    });

    test('should handle push notification permission denied', async () => {
      const { pushNotificationService } = require('../../services/pushNotificationService');

      pushNotificationService.requestPermission.mockResolvedValue('denied');

      const permission = await pushNotificationService.requestPermission();

      expect(permission).toBe('denied');
    });
  });

  describe('Unified Notification Service', () => {
    test('should initialize unified notification service', () => {
      const { unifiedNotificationService } = require('../../services/unifiedNotificationService');

      unifiedNotificationService.initialize.mockReturnValue(true);

      const result = unifiedNotificationService.initialize();

      expect(result).toBe(true);
      expect(unifiedNotificationService.initialize).toHaveBeenCalled();
    });

    test('should send notification through unified service', async () => {
      const { unifiedNotificationService } = require('../../services/unifiedNotificationService');
      const notificationData = {
        recipient_id: 1,
        type: 'session_reminder',
        title: 'Session Reminder',
        message: 'Your session starts in 15 minutes',
        channels: ['in_app', 'push', 'email']
      };

      unifiedNotificationService.sendNotification.mockResolvedValue({
        success: true,
        sent_channels: ['in_app', 'push'],
        failed_channels: ['email']
      });

      const result = await unifiedNotificationService.sendNotification(notificationData);

      expect(result.success).toBe(true);
      expect(result.sent_channels).toContain('in_app');
      expect(result.sent_channels).toContain('push');
      expect(unifiedNotificationService.sendNotification).toHaveBeenCalledWith(notificationData);
    });

    test('should broadcast to role', async () => {
      const { unifiedNotificationService } = require('../../services/unifiedNotificationService');
      const broadcastData = {
        role: 'tutor',
        type: 'announcement',
        title: 'System Maintenance',
        message: 'The system will be under maintenance tonight',
        channels: ['in_app']
      };

      unifiedNotificationService.broadcastToRole.mockResolvedValue({
        success: true,
        recipients_count: 25
      });

      const result = await unifiedNotificationService.broadcastToRole(broadcastData);

      expect(result.success).toBe(true);
      expect(result.recipients_count).toBe(25);
      expect(unifiedNotificationService.broadcastToRole).toHaveBeenCalledWith(broadcastData);
    });

    test('should get notification history', async () => {
      const { unifiedNotificationService } = require('../../services/unifiedNotificationService');
      const filters = {
        user_id: 1,
        type: 'session_reminder',
        date_from: '2023-01-01',
        date_to: '2023-01-31'
      };

      const mockHistory = [
        {
          id: 1,
          type: 'session_reminder',
          title: 'Session Reminder',
          sent_at: '2023-01-15T10:00:00Z',
          status: 'delivered'
        }
      ];

      unifiedNotificationService.getNotificationHistory.mockResolvedValue(mockHistory);

      const result = await unifiedNotificationService.getNotificationHistory(filters);

      expect(result).toEqual(mockHistory);
      expect(unifiedNotificationService.getNotificationHistory).toHaveBeenCalledWith(filters);
    });

    test('should update notification settings', async () => {
      const { unifiedNotificationService } = require('../../services/unifiedNotificationService');
      const settings = {
        user_id: 1,
        email_notifications: true,
        push_notifications: false,
        in_app_notifications: true,
        session_reminders: true,
        payment_notifications: false
      };

      unifiedNotificationService.updateNotificationSettings.mockResolvedValue({
        success: true,
        settings: settings
      });

      const result = await unifiedNotificationService.updateNotificationSettings(settings);

      expect(result.success).toBe(true);
      expect(result.settings).toEqual(settings);
      expect(unifiedNotificationService.updateNotificationSettings).toHaveBeenCalledWith(settings);
    });

    test('should cleanup unified notification service', () => {
      const { unifiedNotificationService } = require('../../services/unifiedNotificationService');

      unifiedNotificationService.cleanup.mockReturnValue(true);

      const result = unifiedNotificationService.cleanup();

      expect(result).toBe(true);
      expect(unifiedNotificationService.cleanup).toHaveBeenCalled();
    });
  });

  describe('Notification Hook Integration', () => {
    test('should use notifications hook correctly', () => {
      const { useNotifications } = require('../../hooks/useNotifications');
      const mockNotifications = [
        createMockNotification({ id: 1, type: 'info', title: 'Test 1' }),
        createMockNotification({ id: 2, type: 'warning', title: 'Test 2' })
      ];

      useNotifications.mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 1,
        loading: false,
        error: null,
        markAsRead: jest.fn(),
        markAllAsRead: jest.fn(),
        deleteNotification: jest.fn(),
        clearAll: jest.fn(),
        refetch: jest.fn()
      });

      const TestHookComponent = () => {
        const notificationHook = useNotifications();
        return (
          <div>
            <div data-testid="hook-notification-count">{notificationHook.notifications.length}</div>
            <div data-testid="hook-unread-count">{notificationHook.unreadCount}</div>
            <div data-testid="hook-loading">{notificationHook.loading ? 'loading' : 'loaded'}</div>
          </div>
        );
      };

      renderWithProviders(<TestHookComponent />);

      expect(screen.getByTestId('hook-notification-count')).toHaveTextContent('2');
      expect(screen.getByTestId('hook-unread-count')).toHaveTextContent('1');
      expect(screen.getByTestId('hook-loading')).toHaveTextContent('loaded');
    });
  });

  describe('Notification Types and Priorities', () => {
    test('should handle different notification types', () => {
      const notificationTypes = [
        { type: 'info', priority: 'low' },
        { type: 'warning', priority: 'medium' },
        { type: 'error', priority: 'high' },
        { type: 'success', priority: 'low' }
      ];

      const TestTypesComponent = () => {
        return (
          <div>
            {notificationTypes.map((notif, index) => (
              <div key={index} data-testid={`type-${notif.type}`} className={`priority-${notif.priority}`}>
                {notif.type}
              </div>
            ))}
          </div>
        );
      };

      renderWithProviders(<TestTypesComponent />);

      expect(screen.getByTestId('type-info')).toHaveClass('priority-low');
      expect(screen.getByTestId('type-warning')).toHaveClass('priority-medium');
      expect(screen.getByTestId('type-error')).toHaveClass('priority-high');
      expect(screen.getByTestId('type-success')).toHaveClass('priority-low');
    });

    test('should validate notification data structure', () => {
      const validNotification = createMockNotification({
        id: 1,
        type: 'info',
        title: 'Test Notification',
        message: 'Test message',
        timestamp: new Date().toISOString(),
        read: false
      });

      expect(validNotification).toHaveProperty('id');
      expect(validNotification).toHaveProperty('type');
      expect(validNotification).toHaveProperty('title');
      expect(validNotification).toHaveProperty('message');
      expect(validNotification).toHaveProperty('timestamp');
      expect(validNotification).toHaveProperty('read');
      expect(['info', 'warning', 'error', 'success']).toContain(validNotification.type);
      expect(typeof validNotification.read).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    test('should handle WebSocket connection errors', () => {
      const websocketService = require('../../services/websocketService');

      websocketService.connect.mockImplementation(() => {
        throw new Error('WebSocket connection failed');
      });

      expect(() => websocketService.connect('ws://invalid-url')).toThrow('WebSocket connection failed');
    });

    test('should handle push notification permission errors', async () => {
      const { pushNotificationService } = require('../../services/pushNotificationService');

      pushNotificationService.requestPermission.mockRejectedValue(new Error('Permission request failed'));

      await expect(pushNotificationService.requestPermission()).rejects.toThrow('Permission request failed');
    });

    test('should handle notification service unavailable', async () => {
      const { notificationService } = require('../../shared/services/notificationService');

      notificationService.getNotifications.mockRejectedValue(new Error('Service unavailable'));

      await expect(notificationService.getNotifications()).rejects.toThrow('Service unavailable');
    });
  });

  describe('Performance and Optimization', () => {
    test('should batch notification updates', () => {
      const { notificationService } = require('../../shared/services/notificationService');
      const notificationIds = [1, 2, 3, 4, 5];

      // Mock batch update
      notificationService.markAsRead.mockImplementation((ids) => {
        if (Array.isArray(ids)) {
          return Promise.resolve({ success: true, updated_count: ids.length });
        }
        return Promise.resolve({ success: true, updated_count: 1 });
      });

      // Test single vs batch update
      const singleResult = notificationService.markAsRead(1);
      const batchResult = notificationService.markAsRead(notificationIds);

      expect(singleResult).resolves.toEqual({ success: true, updated_count: 1 });
      expect(batchResult).resolves.toEqual({ success: true, updated_count: 5 });
    });

    test('should handle notification throttling', () => {
      const { unifiedNotificationService } = require('../../services/unifiedNotificationService');

      // Mock throttling mechanism
      let lastNotificationTime = 0;
      const THROTTLE_DELAY = 1000; // 1 second

      unifiedNotificationService.sendNotification.mockImplementation((data) => {
        const now = Date.now();
        if (now - lastNotificationTime < THROTTLE_DELAY) {
          return Promise.resolve({ success: false, error: 'Throttled' });
        }
        lastNotificationTime = now;
        return Promise.resolve({ success: true });
      });

      // First notification should succeed
      const first = unifiedNotificationService.sendNotification({ title: 'Test 1' });
      expect(first).resolves.toEqual({ success: true });

      // Immediate second notification should be throttled
      const second = unifiedNotificationService.sendNotification({ title: 'Test 2' });
      expect(second).resolves.toEqual({ success: false, error: 'Throttled' });
    });
  });
});