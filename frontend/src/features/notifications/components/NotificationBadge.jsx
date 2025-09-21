import React, { useState, useEffect } from 'react';
import { Badge, Button } from '@shared/components/ui';
import { useStore } from '@shared/store';
import NotificationPanel from './NotificationPanel';
import './NotificationBadge.css';

const NotificationBadge = ({
  showPanel = true,
  position = 'right',
  maxCount = 99,
  showZero = false,
  onClick,
  className = ''
}) => {
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  const { unreadCount, notifications } = useStore((state) => state.notifications);

  // Check for new notifications
  useEffect(() => {
    if (unreadCount > 0) {
      setHasNewNotifications(true);

      // Auto-hide the "new" indicator after 3 seconds
      const timer = setTimeout(() => {
        setHasNewNotifications(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  // Handle real-time notifications
  useEffect(() => {
    const handleNewNotification = (event) => {
      const notification = event.detail;

      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.priority === 'high'
        });
      }

      // Visual indicator for new notification
      setHasNewNotifications(true);
      setTimeout(() => setHasNewNotifications(false), 3000);
    };

    window.addEventListener('notification-received', handleNewNotification);
    return () => window.removeEventListener('notification-received', handleNewNotification);
  }, []);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (onClick) {
      onClick();
    } else if (showPanel) {
      setShowNotificationPanel(!showNotificationPanel);
    }

    // Clear the "new" indicator when clicked
    setHasNewNotifications(false);
  };

  const handlePanelClose = () => {
    setShowNotificationPanel(false);
  };

  const formatCount = (count) => {
    if (count === 0 && !showZero) return null;
    if (count > maxCount) return `${maxCount}+`;
    return count.toString();
  };

  const badgeContent = formatCount(unreadCount);

  return (
    <>
      <div className={`notification-badge-container ${className}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          className={`notification-toggle ${showNotificationPanel ? 'active' : ''} ${
            hasNewNotifications ? 'has-new' : ''
          }`}
          title={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
        >
          <div className="notification-icon-wrapper">
            {/* Bell Icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="notification-bell"
            >
              <path
                d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.73 21a2 2 0 0 1-3.46 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Badge Count */}
            {badgeContent && (
              <Badge
                variant="danger"
                className="notification-count-badge"
              >
                {badgeContent}
              </Badge>
            )}

            {/* New Notification Indicator */}
            {hasNewNotifications && (
              <div className="new-notification-pulse" />
            )}
          </div>
        </Button>
      </div>

      {/* Notification Panel */}
      {showPanel && (
        <NotificationPanel
          isOpen={showNotificationPanel}
          onClose={handlePanelClose}
          position={position}
        />
      )}
    </>
  );
};

export default NotificationBadge;