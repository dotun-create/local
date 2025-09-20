import React, { useState } from 'react';
import './NotificationItem.css';

const NotificationItem = ({ notification, onMarkAsRead, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const handleMarkAsRead = async (e) => {
    e.stopPropagation();
    if (notification.read || isMarking) return;

    setIsMarking(true);
    try {
      await onMarkAsRead(notification.id);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    } finally {
      setIsMarking(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await onDelete(notification.id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      setIsDeleting(false);
    }
  };

  const getTypeIcon = (type) => {
    const iconMap = {
      ai_feedback: '🤖',
      session_reminder: '⏰',
      payment: '💳',
      test_api_websocket: '🧪',
      test_phase2_websocket: '🔧',
      general: '📢',
      course_update: '📚',
      system: '⚙️',
    };
    return iconMap[type] || '📝';
  };

  const getTypeColor = (type) => {
    const colorMap = {
      ai_feedback: '#28a745',
      session_reminder: '#ffc107',
      payment: '#dc3545',
      test_api_websocket: '#6f42c1',
      test_phase2_websocket: '#17a2b8',
      general: '#007bff',
      course_update: '#fd7e14',
      system: '#6c757d',
    };
    return colorMap[type] || '#007bff';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`notification-item ${!notification.read ? 'unread' : ''} ${isDeleting ? 'deleting' : ''}`}
      onClick={handleMarkAsRead}
    >
      <div className="notification-content">
        <div className="notification-header">
          <div className="notification-type">
            <span
              className="type-icon"
              style={{ backgroundColor: getTypeColor(notification.type) }}
            >
              {getTypeIcon(notification.type)}
            </span>
            <span className="type-label">
              {notification.type.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="notification-time">
            {formatDate(notification.createdAt)}
          </div>
        </div>

        <div className="notification-body">
          {notification.title && (
            <h4 className="notification-title">{notification.title}</h4>
          )}
          <p className="notification-message">{notification.message}</p>

          {notification.data && Object.keys(notification.data).length > 0 && (
            <div className="notification-data">
              {Object.entries(notification.data).map(([key, value]) => (
                <span key={key} className="data-item">
                  <strong>{key}:</strong> {String(value)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="notification-actions">
          {!notification.read && (
            <button
              className="action-btn mark-read"
              onClick={handleMarkAsRead}
              disabled={isMarking}
              title="Mark as read"
            >
              {isMarking ? '...' : '✓'}
            </button>
          )}
          <button
            className="action-btn delete"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete notification"
          >
            {isDeleting ? '...' : '🗑️'}
          </button>
        </div>
      </div>

      {!notification.read && <div className="unread-indicator"></div>}
    </div>
  );
};

export default NotificationItem;