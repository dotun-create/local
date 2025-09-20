import { useState, useEffect, useCallback } from 'react';
import { unifiedNotificationService } from '../services/unifiedNotificationService';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleNotificationUpdate = useCallback((event, data) => {
    switch (event) {
      case 'notifications_loaded':
        setNotifications(data);
        setIsLoading(false);
        break;

      case 'notification_added':
        setNotifications(prev => [data, ...prev]);
        break;

      case 'notification_updated':
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === data.id ? { ...notif, ...data } : notif
          )
        );
        break;

      case 'notification_deleted':
        setNotifications(prev =>
          prev.filter(notif => notif.id !== data)
        );
        break;

      case 'unread_count_changed':
        setUnreadCount(data);
        break;

      case 'all_marked_read':
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, read: true }))
        );
        break;

      default:
        break;
    }
  }, []);

  useEffect(() => {
    unifiedNotificationService.init();

    const unsubscribe = unifiedNotificationService.subscribe(handleNotificationUpdate);

    return () => {
      unsubscribe();
    };
  }, [handleNotificationUpdate]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const success = await unifiedNotificationService.markAsRead(notificationId);
      if (!success) {
        setError('Failed to mark notification as read');
      }
      return success;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const success = await unifiedNotificationService.markAllAsRead();
      if (!success) {
        setError('Failed to mark all notifications as read');
      }
      return success;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const success = await unifiedNotificationService.deleteNotification(notificationId);
      if (!success) {
        setError('Failed to delete notification');
      }
      return success;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearError
  };
};

export default useNotifications;