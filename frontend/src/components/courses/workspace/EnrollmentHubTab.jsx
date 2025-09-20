import React from 'react';

const EnrollmentHubTab = ({ courseId, workspaceState, onSelectionChange, onCreateContent, onBatchOperation, onRefresh }) => {
  return (
    <div className="enrollment-hub-tab">
      <div className="tab-placeholder">
        <div className="placeholder-content">
          <span className="placeholder-icon">👥</span>
          <h3>Enrollment Hub</h3>
          <p>Student management and progress tracking coming soon...</p>
          
          <div className="placeholder-features">
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span className="feature-text">Student Progress Analytics</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✉️</span>
              <span className="feature-text">Bulk Communication Tools</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <span className="feature-text">Performance Tracking</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📝</span>
              <span className="feature-text">Assignment Management</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentHubTab;