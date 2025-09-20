import React from 'react';

const WorkspaceNavigation = ({ activeTab, onTabChange, counts = {} }) => {
  const tabs = [
    {
      id: 'content-structure',
      label: 'Content Structure',
      icon: '📚',
      description: 'Modules, lessons, and quizzes',
      count: counts.modules || 0
    },
    {
      id: 'sessions-manager',
      label: 'Sessions Manager',
      icon: '🎥',
      description: 'Schedule and manage sessions',
      count: counts.sessions || 0
    },
    {
      id: 'enrollment-hub',
      label: 'Enrollment Hub',
      icon: '👥',
      description: 'Student management and progress',
      count: counts.students || 0
    },
    {
      id: 'analytics-dashboard',
      label: 'Analytics',
      icon: '📊',
      description: 'Performance and insights',
      count: null
    },
    {
      id: 'course-settings',
      label: 'Settings',
      icon: '⚙️',
      description: 'Course configuration',
      count: null
    }
  ];

  return (
    <div className="workspace-navigation">
      <div className="nav-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            title={tab.description}
          >
            <div className="tab-content">
              <div className="tab-header">
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
                {tab.count !== null && (
                  <span className="tab-count">{tab.count}</span>
                )}
              </div>
              <div className="tab-description">
                {tab.description}
              </div>
            </div>
            <div className="tab-indicator"></div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WorkspaceNavigation;