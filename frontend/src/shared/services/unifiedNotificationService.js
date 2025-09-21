import websocketService from './websocketService';
import { notificationService as toastService } from './notificationService';
import pushNotificationService from './pushNotificationService';
import api from './api';

class UnifiedNotificationService {
  constructor() {
    this.websocketService = websocketService;
    this.toastService = toastService;
    this.pushService = pushNotificationService;
    this.notifications = new Map(); // In-memory store
    this.unreadCount = 0;
    this.listeners = new Set();
    this.isInitialized = false;
    this.pushEnabled = false;
  }

  /**
   * Initialize the service
   */
  async init() {
    if (this.isInitialized) return;

    this._setupWebSocketListeners();
    this._loadInitialNotifications();
    await this._initializePushNotifications();
    this.isInitialized = true;

    console.log('Unified Notification Service initialized');
  }

  /**
   * Setup WebSocket event listeners
   */
  _setupWebSocketListeners() {
    // Listen for new notifications
    this.websocketService.socket?.on('notification_event', (data) => {
      this._handleNotificationEvent(data);
    });

    // Listen for unread count updates
    this.websocketService.socket?.on('notification_count_update', (data) => {
      this._handleUnreadCountUpdate(data);
    });

    // Re-setup listeners when WebSocket reconnects
    this.websocketService.socket?.on('connect', () => {
      this._setupWebSocketListeners();
    });
  }

  /**
   * Handle incoming notification events
   */
  _handleNotificationEvent(data) {
    const { type, notification } = data;

    console.log('Received notification event:', type, notification);

    switch (type) {
      case 'new':
        this._handleNewNotification(notification);
        break;
      case 'read':
        this._handleNotificationRead(notification);
        break;
      case 'deleted':
        this._handleNotificationDeleted(notification);
        break;
    }
  }

  /**
   * Handle new notification
   */
  _handleNewNotification(notification) {
    // Store in memory
    this.notifications.set(notification.id, notification);

    // Update unread count
    if (!notification.read) {
      this.unreadCount++;
    }

    // Show toast for important notifications
    if (this._shouldShowToast(notification)) {
      this.toastService.showInfo(
        notification.title || notification.message,
        5000
      );
    }

    // Show push notification if page is not visible
    if (this.pushEnabled && document.hidden) {
      this._showPushNotification(notification);
    }

    // Notify listeners
    this._notifyListeners('notification_added', notification);
    this._notifyListeners('unread_count_changed', this.unreadCount);
  }

  /**
   * Handle notification marked as read
   */
  _handleNotificationRead(notification) {
    if (this.notifications.has(notification.id)) {
      this.notifications.set(notification.id, notification);
      this._notifyListeners('notification_updated', notification);
    }
  }

  /**
   * Handle notification deleted
   */
  _handleNotificationDeleted(data) {
    const notificationId = data.id;
    if (this.notifications.has(notificationId)) {
      this.notifications.delete(notificationId);
      this._notifyListeners('notification_deleted', notificationId);
    }
  }

  /**
   * Handle unread count updates
   */
  _handleUnreadCountUpdate(data) {
    this.unreadCount = data.unread_count;
    this._notifyListeners('unread_count_changed', this.unreadCount);
  }

  /**
   * Load initial notifications from API
   */
  async _loadInitialNotifications() {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) return;

      const data = await api.notifications.getNotifications({ per_page: 50 });

      if (data) {
        // Store notifications
        data.notifications.forEach(notification => {
          this.notifications.set(notification.id, notification);
        });

        // Set unread count
        this.unreadCount = data.unreadCount || 0;

        // Notify listeners
        this._notifyListeners('notifications_loaded', data.notifications);
        this._notifyListeners('unread_count_changed', this.unreadCount);
      }
    } catch (error) {
      console.error('Failed to load initial notifications:', error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const result = await api.notifications.markNotificationRead(notificationId);
      if (result) {
        // WebSocket will handle the update
        return true;
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
    return false;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const result = await api.notifications.markAllNotificationsRead();
      if (result) {
        // Update local state
        this.notifications.forEach(notification => {
          notification.read = true;
        });
        this.unreadCount = 0;

        this._notifyListeners('all_marked_read');
        this._notifyListeners('unread_count_changed', 0);
        return true;
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
    return false;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    try {
      const result = await api.notifications.deleteNotification(notificationId);
      if (result) {
        // WebSocket will handle the update
        return true;
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
    return false;
  }

  /**
   * Get all notifications
   */
  getNotifications() {
    return Array.from(this.notifications.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Get unread count
   */
  getUnreadCount() {
    return this.unreadCount;
  }

  /**
   * Subscribe to notification events
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Determine if notification should show toast
   */
  _shouldShowToast(notification) {
    const importantTypes = ['ai_feedback', 'session_reminder', 'payment', 'test_api_websocket'];
    return importantTypes.includes(notification.type);
  }

  /**
   * Notify all listeners
   */
  _notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  /**
   * Initialize push notifications
   */
  async _initializePushNotifications() {
    try {
      const initialized = await this.pushService.init();
      if (initialized && this.pushService.getPermissionStatus() === 'granted') {
        await this.pushService.subscribe();
        this.pushEnabled = true;
        console.log('Push notifications enabled');
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  /**
   * Show push notification
   */
  _showPushNotification(notification) {
    try {
      this.pushService.showLocalNotification(
        notification.title || 'New Notification',
        {
          body: notification.message,
          tag: `notification-${notification.id}`,
          data: {
            notificationId: notification.id,
            type: notification.type
          }
        }
      );
    } catch (error) {
      console.error('Failed to show push notification:', error);
    }
  }

  /**
   * Enable push notifications
   */
  async enablePushNotifications() {
    try {
      const subscription = await this.pushService.subscribe();
      if (subscription) {
        this.pushEnabled = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      return false;
    }
  }

  /**
   * Disable push notifications
   */
  async disablePushNotifications() {
    try {
      const unsubscribed = await this.pushService.unsubscribe();
      if (unsubscribed) {
        this.pushEnabled = false;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to disable push notifications:', error);
      return false;
    }
  }

  /**
   * Get push notification status
   */
  getPushNotificationStatus() {
    return {
      supported: this.pushService.isSupported(),
      permission: this.pushService.getPermissionStatus(),
      subscribed: this.pushService.isSubscribed(),
      enabled: this.pushEnabled
    };
  }

  /**
   * Destroy service
   */
  destroy() {
    this.listeners.clear();
    this.notifications.clear();
    this.isInitialized = false;
  }
}

// Create and export singleton
export const unifiedNotificationService = new UnifiedNotificationService();
export default unifiedNotificationService;