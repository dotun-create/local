import React from 'react';
import './NotificationBadge.css';

const NotificationBadge = ({ count, onClick, className = '' }) => {
  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <div
      className={`notification-badge ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick && onClick(e);
        }
      }}
    >
      <div className="notification-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
        {count > 0 && (
          <span className="notification-count">
            {displayCount}
          </span>
        )}
      </div>
    </div>
  );
};

export default NotificationBadge;