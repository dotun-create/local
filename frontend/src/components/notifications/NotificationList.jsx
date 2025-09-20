import React, { useState } from 'react';
import useNotifications from '../../hooks/useNotifications';
import NotificationItem from './NotificationItem';
import './NotificationList.css';

const NotificationList = ({ isOpen, onClose, className = '' }) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearError
  } = useNotifications();

  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleClearAll = async () => {
    const deletePromises = notifications.map(notification =>
      deleteNotification(notification.id)
    );
    await Promise.all(deletePromises);
  };

  if (!isOpen) return null;

  return (
    <div className={`notification-list-overlay ${className}`} onClick={onClose}>
      <div className="notification-list-container" onClick={(e) => e.stopPropagation()}>
        <div className="notification-list-header">
          <div className="notification-header-left">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </div>
          <div className="notification-header-actions">
            <button
              className="header-action-btn"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              title="Mark all as read"
            >
              Mark All Read
            </button>
            <button
              className="header-action-btn danger"
              onClick={handleClearAll}
              disabled={notifications.length === 0}
              title="Clear all notifications"
            >
              Clear All
            </button>
            <button className="close-btn" onClick={onClose} title="Close">
              ×
            </button>
          </div>
        </div>

        <div className="notification-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>

        {error && (
          <div className="notification-error">
            <span>{error}</span>
            <button onClick={clearError} className="error-close">×</button>
          </div>
        )}

        <div className="notification-list-content">
          {isLoading ? (
            <div className="notification-loading">
              <div className="loading-spinner"></div>
              <span>Loading notifications...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notification-empty">
              <div className="empty-icon">🔔</div>
              <h4>No notifications</h4>
              <p>
                {filter === 'unread'
                  ? "You're all caught up!"
                  : filter === 'read'
                  ? "No read notifications yet"
                  : "You don't have any notifications yet"
                }
              </p>
            </div>
          ) : (
            <div className="notification-items">
              {filteredNotifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationList;