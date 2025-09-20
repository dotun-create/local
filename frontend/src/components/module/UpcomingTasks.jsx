import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/UpcomingTasks.css';

const UpcomingTasks = ({ tasksData = [] }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Handle task navigation
  const handleTaskClick = (task) => {
    if (task.type === 'quiz' && task.link) {
      navigate(task.link);
    } else if (task.link) {
      // For external links or other task types
      window.open(task.link, '_blank');
    }
  };

  // Get task icon based on type
  const getTaskIcon = (taskType) => {
    switch(taskType?.toLowerCase()) {
      case 'quiz': return '📝';
      case 'assignment': return '📋';
      case 'reading': return '📖';
      case 'video': return '🎥';
      case 'session': return '💼';
      default: return '📌';
    }
  };

  // Get priority class for styling
  const getPriorityClass = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium'; 
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  return (
    <div className="upcoming-tasks-card">
      {/* Header */}
      <div 
        className="tasks-header"
        onClick={toggleCollapse}
        title="Click to expand/collapse"
      >
        <h3 className="tasks-title">Upcoming Tasks</h3>
        <button className={`collapse-toggle ${isCollapsed ? 'collapsed' : ''}`}>
          <span className="toggle-icon">▼</span>
        </button>
      </div>

      {/* Tasks List */}
      {!isCollapsed && (
        <div className="tasks-list">
          {tasksData.length === 0 ? (
            <div className="no-tasks">
              <span className="no-tasks-icon">📝</span>
              <p className="no-tasks-text">No upcoming tasks</p>
            </div>
          ) : (
            tasksData.map((task) => (
              <div 
                key={task.id} 
                className={`task-item ${getPriorityClass(task.priority)} task-${task.type || 'default'}`}
                onClick={() => handleTaskClick(task)}
                title={`${task.taskType || task.type} - ${task.urgencyText || task.dueDate || 'No due date'}`}
              >
                <div className="task-icon">
                  {getTaskIcon(task.taskType || task.type)}
                </div>
                <div className="task-info">
                  <span className="task-name">{task.name}</span>
                  <div className="task-meta">
                    <span className="task-type">{task.taskType || task.type}</span>
                    {task.course && (
                      <span className="task-course">{task.course}</span>
                    )}
                  </div>
                  {(task.urgencyText || task.dueDate) && (
                    <div className="task-urgency">
                      {task.urgencyText || (task.dueDate && new Date(task.dueDate).toLocaleDateString())}
                    </div>
                  )}
                </div>
                <div className="task-actions">
                  {task.priority === 'high' && (
                    <span className="urgency-indicator" title="High priority">⚡</span>
                  )}
                  <span className="action-icon">→</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Task Count Badge */}
      {tasksData.length > 0 && (
        <div className="task-count-badge" title={`${tasksData.length} tasks pending`}>
          {tasksData.length}
        </div>
      )}
    </div>
  );
};

export default UpcomingTasks;