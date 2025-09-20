import React, { useState, useEffect } from 'react';
import NotificationBadge from './NotificationBadge';
import NotificationList from './NotificationList';
import useNotifications from '../../hooks/useNotifications';

const NotificationCenter = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className={`notification-center ${className}`}>
      <NotificationBadge
        count={unreadCount}
        onClick={handleToggle}
        className={isOpen ? 'active' : ''}
      />
      <NotificationList
        isOpen={isOpen}
        onClose={handleClose}
      />
    </div>
  );
};

export default NotificationCenter;