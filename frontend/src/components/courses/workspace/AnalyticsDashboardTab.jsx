import React from 'react';

const AnalyticsDashboardTab = ({ courseId, workspaceState, onSelectionChange, onCreateContent, onBatchOperation, onRefresh }) => {
  return (
    <div className="analytics-dashboard-tab">
      <div className="tab-placeholder">
        <div className="placeholder-content">
          <span className="placeholder-icon">📊</span>
          <h3>Analytics Dashboard</h3>
          <p>Performance metrics and insights coming soon...</p>
          
          <div className="placeholder-features">
            <div className="feature-item">
              <span className="feature-icon">📈</span>
              <span className="feature-text">Engagement Analytics</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⏱️</span>
              <span className="feature-text">Time Tracking</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <span className="feature-text">Completion Rates</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💡</span>
              <span className="feature-text">Learning Insights</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboardTab;