import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge } from '@shared/components/ui';
import { LoadingSpinner } from '@shared/components/feedback';
import { useStore } from '@shared/store';
import NotificationItem from './NotificationItem';
import './NotificationPanel.css';

const NotificationPanel = ({
  isOpen,
  onClose,
  position = 'right',
  showMarkAllRead = true,
  showClearAll = true,
  maxHeight = '400px',
  className = ''
}) => {
  const panelRef = useRef(null);
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const {
    notifications,
    unreadCount,
    loading,
    error,
    actions: {
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      markSelectedAsRead,
      deleteSelected,
      clearError
    }
  } = useStore((state) => state.notifications);

  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications({ limit: 20 });
    }
  }, [isOpen, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate to notification target if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const handleSelectNotification = (notificationId, selected) => {
    const newSelected = new Set(selectedNotifications);
    if (selected) {
      newSelected.add(notificationId);
    } else {
      newSelected.delete(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setBulkActionLoading(true);
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleMarkSelectedAsRead = async () => {
    if (selectedNotifications.size === 0) return;

    try {
      setBulkActionLoading(true);
      await markSelectedAsRead(Array.from(selectedNotifications));
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Failed to mark selected as read:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedNotifications.size === 0) return;

    try {
      setBulkActionLoading(true);
      await deleteSelected(Array.from(selectedNotifications));
      setSelectedNotifications(new Set());
    } catch (error) {
      console.error('Failed to delete selected notifications:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className={`notification-panel-overlay ${position}`}>
      <Card
        ref={panelRef}
        className={`notification-panel ${className}`}
        style={{ maxHeight }}
      >
        {/* Panel Header */}
        <div className="panel-header">
          <div className="header-title">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="primary" className="unread-badge">
                {unreadCount}
              </Badge>
            )}
          </div>

          <div className="header-actions">
            {showMarkAllRead && unreadCount > 0 && (
              <Button
                variant="link"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={bulkActionLoading}
              >
                Mark all read
              </Button>
            )}

            <Button
              variant="link"
              size="sm"
              onClick={onClose}
              className="close-button"
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedNotifications.size > 0 && (
          <div className="bulk-actions">
            <div className="selection-info">
              <label className="select-all-checkbox">
                <input
                  type="checkbox"
                  checked={selectedNotifications.size === notifications.length}
                  onChange={handleSelectAll}
                />
                {selectedNotifications.size} selected
              </label>
            </div>

            <div className="bulk-buttons">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleMarkSelectedAsRead}
                disabled={bulkActionLoading}
              >
                Mark read
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={bulkActionLoading}
              >
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="panel-error">
            <p>{error}</p>
            <Button variant="link" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <div className="notifications-container">
          {loading && notifications.length === 0 ? (
            <div className="panel-loading">
              <LoadingSpinner size="md" />
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="no-notifications">
              <div className="no-notifications-icon">🔔</div>
              <h4>No notifications</h4>
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  isSelected={selectedNotifications.has(notification.id)}
                  onSelect={(selected) => handleSelectNotification(notification.id, selected)}
                  onClick={() => handleNotificationClick(notification)}
                  onDelete={() => deleteNotification(notification.id)}
                  timeAgo={getTimeAgo(notification.createdAt)}
                  showSelection={selectedNotifications.size > 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* Panel Footer */}
        {notifications.length > 0 && (
          <div className="panel-footer">
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                // Navigate to full notifications page
                window.location.href = '/notifications';
              }}
            >
              View all notifications
            </Button>

            {showClearAll && (
              <Button
                variant="link"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedNotifications.size === 0}
                className="clear-all-button"
              >
                Clear selected
              </Button>
            )}
          </div>
        )}

        {loading && notifications.length > 0 && (
          <div className="loading-overlay">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificationPanel;