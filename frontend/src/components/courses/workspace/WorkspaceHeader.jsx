import React from 'react';
import { formatCoursePrice } from '../../../utils/currency';
import { getTimezoneDisplayName } from '../../../utils/timeUtils';

const WorkspaceHeader = ({ course, onNavigateBack, isRefreshing }) => {
  return (
    <div className="course-detail-header">
      <div className="header-content-wrapper">
        <div className="header-top-row">
          <button onClick={onNavigateBack} className="back-btn">
            Back to Admin
          </button>
          
          <div className="course-actions-top">
            <div className={`status-badge ${(course.status || 'active').toLowerCase()}`}>
              {course.status || 'Active'}
            </div>
            {isRefreshing && (
              <div className="refresh-indicator">
                <div className="refresh-spinner"></div>
                <span>Syncing...</span>
              </div>
            )}
          </div>
        </div>

        <div className="course-title-section">
          <h1>{course.title}</h1>
          <p className="course-subtitle">{course.description}</p>
        </div>

        <div className="course-meta-info">
          <div className="meta-item">
            <span>Subject: {course.subject || 'Not specified'}</span>
          </div>
          <div className="meta-item">
            <span>Duration: {course.duration || 'Self-paced'}</span>
          </div>
          <div className="meta-item">
            <span>Price: {formatCoursePrice(course)}</span>
          </div>
          <div className="meta-item">
            <span>Level: {course.level || 'All levels'}</span>
          </div>
          {course.country && (
            <div className="meta-item">
              <span>Country: {course.country}</span>
            </div>
          )}
          {(course.grade_level || course.gradeLevel) && (
            <div className="meta-item">
              <span>Grade Level: {course.grade_level || course.gradeLevel}</span>
            </div>
          )}
          <div className="meta-item">
            <span>Timezone: {getTimezoneDisplayName(course.timezone)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceHeader;