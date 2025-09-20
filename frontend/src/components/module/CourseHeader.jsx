import React from 'react';
import './css/CourseHeader.css';

const CourseHeader = ({ 
  courseTitle, 
  userAvatar, 
  headerTitle, 
  hasNotification = false 
}) => {
  return (
    <div className="course-header">
      {/* Notification Indicator */}
      <div className="notification-section">
        {hasNotification && (
          <div className="notification-indicator" title="New notifications">
            <span className="notification-dot"></span>
          </div>
        )}
      </div>

      {/* Header Title */}
      <div className="header-title-section">
        <h2 className="header-title">{headerTitle || courseTitle}</h2>
      </div>

      {/* User Avatar */}
      <div className="user-avatar-section">
        <img 
          src={userAvatar} 
          alt="User avatar" 
          className="user-avatar"
          title="Your profile"
        />
      </div>
    </div>
  );
};

export default CourseHeader;