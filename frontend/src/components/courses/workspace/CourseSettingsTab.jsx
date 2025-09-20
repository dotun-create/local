import React from 'react';

const CourseSettingsTab = ({ courseId, workspaceState, onSelectionChange, onCreateContent, onBatchOperation, onRefresh }) => {
  return (
    <div className="course-settings-tab">
      <div className="tab-placeholder">
        <div className="placeholder-content">
          <span className="placeholder-icon">⚙️</span>
          <h3>Course Settings</h3>
          <p>Course configuration and advanced options coming soon...</p>
          
          <div className="placeholder-features">
            <div className="feature-item">
              <span className="feature-icon">🎨</span>
              <span className="feature-text">Theme & Branding</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔐</span>
              <span className="feature-text">Access Controls</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📧</span>
              <span className="feature-text">Notification Settings</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🌐</span>
              <span className="feature-text">Localization</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseSettingsTab;