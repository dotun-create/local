import React from 'react';
import { Card, Button, Badge, EmptyState } from '@shared';
import './UpcomingTasks.css';

const UpcomingTasks = ({
  tasks = [],
  onTaskClick,
  showAll = false,
  maxItems = 4
}) => {
  const displayTasks = showAll ? tasks : tasks.slice(0, maxItems);

  const getTaskIcon = (type) => {
    const icons = {
      quiz: '📝',
      assignment: '📄',
      project: '💼',
      review: '👥',
      video: '🎥',
      reading: '📚',
      exam: '📋',
      discussion: '💬'
    };
    return icons[type] || '📋';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'var(--color-danger)';
      case 'medium':
        return 'var(--color-warning)';
      case 'low':
        return 'var(--color-success)';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getTimeRemaining = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;

    if (diff < 0) return { text: 'Overdue', urgent: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 7) return { text: `${days} days left`, urgent: false };
    if (days > 0) return { text: `${days} day${days > 1 ? 's' : ''} left`, urgent: days <= 2 };
    if (hours > 0) return { text: `${hours} hour${hours > 1 ? 's' : ''} left`, urgent: true };

    return { text: 'Due soon', urgent: true };
  };

  const handleTaskClick = (task) => {
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  if (tasks.length === 0) {
    return (
      <Card className="upcoming-tasks-card">
        <div className="upcoming-tasks-header">
          <h3>Upcoming Tasks</h3>
        </div>
        <EmptyState
          icon="✅"
          title="All caught up!"
          description="You have no pending tasks"
          size="small"
        />
      </Card>
    );
  }

  return (
    <Card className="upcoming-tasks-card">
      <div className="upcoming-tasks-header">
        <h3>Upcoming Tasks</h3>
        {!showAll && tasks.length > maxItems && (
          <Button variant="ghost" size="small">
            View All ({tasks.length})
          </Button>
        )}
      </div>

      <div className="upcoming-tasks-list">
        {displayTasks.map(task => {
          const timeRemaining = getTimeRemaining(task.dueDate);

          return (
            <div
              key={task.id}
              className={`task-item ${timeRemaining.urgent ? 'task-item--urgent' : ''}`}
              onClick={() => handleTaskClick(task)}
            >
              <div className="task-icon">
                <span className="task-type-icon">{getTaskIcon(task.type)}</span>
              </div>

              <div className="task-content">
                <div className="task-header">
                  <h4 className="task-name">{task.name}</h4>
                  <div className="task-badges">
                    <Badge
                      variant={getPriorityVariant(task.priority)}
                      size="small"
                      className="priority-badge"
                    >
                      {task.priority}
                    </Badge>
                    {timeRemaining.urgent && (
                      <Badge variant="danger" size="small">
                        Urgent
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="task-details">
                  <p className="task-course">{task.course}</p>
                  <div className="task-meta">
                    <span className="task-type">{task.type}</span>
                    <span className="task-due">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="task-footer">
                  <span
                    className="time-remaining"
                    style={{
                      color: timeRemaining.urgent ? 'var(--color-danger)' : 'var(--color-text-secondary)'
                    }}
                  >
                    {timeRemaining.text}
                  </span>

                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}
                </div>
              </div>

              <div className="task-actions">
                <Button
                  variant={timeRemaining.urgent ? 'primary' : 'outline-primary'}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTaskClick(task);
                  }}
                >
                  {task.type === 'quiz' ? 'Take Quiz' : 'View Task'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {showAll && displayTasks.length === 0 && (
        <div className="no-tasks-message">
          <p>No upcoming tasks. Great job staying on top of your work!</p>
        </div>
      )}
    </Card>
  );
};

export default UpcomingTasks;