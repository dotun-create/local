import React from 'react';
import { Button, Badge } from '@shared/components/ui';
import './NotificationItem.css';

const NotificationItem = ({
  notification,
  isSelected = false,
  onSelect,
  onClick,
  onDelete,
  timeAgo,
  showSelection = false,
  className = ''
}) => {
  const handleClick = (e) => {
    // Don't trigger if clicking on selection checkbox or action buttons
    if (e.target.type === 'checkbox' || e.target.closest('.notification-actions')) {
      return;
    }
    onClick?.(notification);
  };

  const handleSelect = (e) => {
    onSelect?.(e.target.checked);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(notification);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'var(--color-danger)',
      medium: 'var(--color-warning)',
      low: 'var(--color-info)'
    };
    return colors[priority] || colors.low;
  };

  const getTypeIcon = (type) => {
    const icons = {
      session: '📅',
      course: '📚',
      payment: '💳',
      system: '⚙️',
      message: '💬',
      reminder: '⏰',
      achievement: '🏆',
      update: '📢'
    };
    return icons[type] || '📢';
  };

  const getTypeColor = (type) => {
    const colors = {
      session: 'var(--color-primary)',
      course: 'var(--color-success)',
      payment: 'var(--color-warning)',
      system: 'var(--color-info)',
      message: 'var(--color-purple)',
      reminder: 'var(--color-orange)',
      achievement: 'var(--color-yellow)',
      update: 'var(--color-blue)'
    };
    return colors[type] || 'var(--color-text-secondary)';
  };

  return (
    <div
      className={`notification-item ${notification.isRead ? 'read' : 'unread'} ${
        isSelected ? 'selected' : ''
      } ${className}`}
      onClick={handleClick}
    >
      {/* Selection Checkbox */}
      {showSelection && (
        <div className="notification-selection">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelect}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Notification Icon */}
      <div
        className="notification-icon"
        style={{ backgroundColor: getTypeColor(notification.type) }}
      >
        {getTypeIcon(notification.type)}
      </div>

      {/* Notification Content */}
      <div className="notification-content">
        <div className="notification-header">
          <div className="notification-title">
            {notification.title}
          </div>

          <div className="notification-meta">
            {notification.priority && notification.priority !== 'low' && (
              <div
                className="priority-indicator"
                style={{ backgroundColor: getPriorityColor(notification.priority) }}
                title={`${notification.priority} priority`}
              />
            )}

            <Badge
              variant="secondary"
              className="type-badge"
              style={{ backgroundColor: getTypeColor(notification.type) }}
            >
              {notification.type}
            </Badge>

            <span className="notification-time">
              {timeAgo}
            </span>
          </div>
        </div>

        <div className="notification-message">
          {notification.message}
        </div>

        {/* Action URL Preview */}
        {notification.actionUrl && (
          <div className="notification-action">
            <span className="action-preview">
              Click to view details →
            </span>
          </div>
        )}

        {/* Additional Data */}
        {notification.data && Object.keys(notification.data).length > 0 && (
          <div className="notification-data">
            {notification.data.sessionId && (
              <span className="data-item">
                Session: {notification.data.sessionId}
              </span>
            )}
            {notification.data.courseId && (
              <span className="data-item">
                Course: {notification.data.courseId}
              </span>
            )}
            {notification.data.amount && (
              <span className="data-item">
                Amount: ${notification.data.amount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Notification Actions */}
      <div className="notification-actions">
        {!notification.isRead && (
          <div className="unread-indicator" title="Unread notification" />
        )}

        <Button
          variant="link"
          size="sm"
          onClick={handleDelete}
          className="delete-button"
          title="Delete notification"
        >
          ✕
        </Button>
      </div>
    </div>
  );
};

export default NotificationItem;