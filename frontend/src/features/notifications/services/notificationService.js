import { apiClient } from '@shared/services/apiClient';

class NotificationService {
  // Fetch notifications
  async getNotifications(params = {}) {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response.data;
  }

  // Mark all notifications as read
  async markAllAsRead() {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  }

  // Mark selected notifications as read
  async markSelectedAsRead(notificationIds) {
    const response = await apiClient.patch('/notifications/read-selected', {
      notificationIds
    });
    return response.data;
  }

  // Delete notification
  async deleteNotification(notificationId) {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  }

  // Delete all notifications
  async deleteAllNotifications() {
    const response = await apiClient.delete('/notifications');
    return response.data;
  }

  // Delete selected notifications
  async deleteSelected(notificationIds) {
    const response = await apiClient.delete('/notifications/delete-selected', {
      data: { notificationIds }
    });
    return response.data;
  }

  // Create notification (system use)
  async createNotification(notificationData) {
    const response = await apiClient.post('/notifications', notificationData);
    return response.data;
  }

  // Get notification settings
  async getSettings() {
    const response = await apiClient.get('/notifications/settings');
    return response.data;
  }

  // Update notification settings
  async updateSettings(settings) {
    const response = await apiClient.put('/notifications/settings', settings);
    return response.data;
  }

  // Get unread count
  async getUnreadCount() {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  }

  // Subscribe to push notifications
  async subscribeToPush(subscription) {
    const response = await apiClient.post('/notifications/push/subscribe', subscription);
    return response.data;
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush() {
    const response = await apiClient.delete('/notifications/push/unsubscribe');
    return response.data;
  }

  // Test notification (for debugging)
  async sendTestNotification(type = 'info') {
    const response = await apiClient.post('/notifications/test', { type });
    return response.data;
  }

  // Batch operations
  async getBulkActions() {
    return [
      { id: 'mark_read', label: 'Mark as Read', icon: 'check' },
      { id: 'delete', label: 'Delete', icon: 'trash', dangerous: true }
    ];
  }

  async executeBulkAction(action, notificationIds) {
    switch (action) {
      case 'mark_read':
        return this.markSelectedAsRead(notificationIds);
      case 'delete':
        return this.deleteSelected(notificationIds);
      default:
        throw new Error(`Unknown bulk action: ${action}`);
    }
  }

  // Notification types
  getNotificationTypes() {
    return [
      { id: 'all', label: 'All Notifications' },
      { id: 'session', label: 'Session Updates' },
      { id: 'course', label: 'Course Updates' },
      { id: 'payment', label: 'Payment Alerts' },
      { id: 'system', label: 'System Announcements' },
      { id: 'message', label: 'Messages' }
    ];
  }

  // Priority levels
  getPriorityLevels() {
    return [
      { id: 'all', label: 'All Priorities' },
      { id: 'high', label: 'High Priority', color: 'danger' },
      { id: 'medium', label: 'Medium Priority', color: 'warning' },
      { id: 'low', label: 'Low Priority', color: 'info' }
    ];
  }

  // Real-time notification handling
  handleRealtimeNotification(notification) {
    // This would be called by WebSocket/SSE handler
    // Emit custom event that components can listen to
    window.dispatchEvent(new CustomEvent('notification-received', {
      detail: notification
    }));

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'high'
      });
    }
  }

  // Request browser notification permission
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  // Format notification for display
  formatNotification(notification) {
    const timeAgo = this.getTimeAgo(new Date(notification.createdAt));

    return {
      ...notification,
      timeAgo,
      priorityColor: this.getPriorityColor(notification.priority),
      typeIcon: this.getTypeIcon(notification.type)
    };
  }

  // Helper methods
  getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  }

  getPriorityColor(priority) {
    const colors = {
      high: 'var(--color-danger)',
      medium: 'var(--color-warning)',
      low: 'var(--color-info)'
    };
    return colors[priority] || colors.low;
  }

  getTypeIcon(type) {
    const icons = {
      session: '📅',
      course: '📚',
      payment: '💳',
      system: '⚙️',
      message: '💬'
    };
    return icons[type] || '📢';
  }
}

export const notificationService = new NotificationService();
export default notificationService;