import React from 'react';
import { Card, Button, Badge, EmptyState } from '@shared';
import './RecentCourses.css';

const RecentCourses = ({
  courses = [],
  onCourseClick,
  showAll = false,
  maxItems = 3
}) => {
  const displayCourses = showAll ? courses : courses.slice(0, maxItems);

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'var(--color-success)';
    if (progress >= 50) return 'var(--color-warning)';
    return 'var(--color-primary)';
  };

  const handleCourseClick = (course) => {
    if (onCourseClick) {
      onCourseClick(course);
    }
  };

  if (courses.length === 0) {
    return (
      <Card className="recent-courses-card">
        <div className="recent-courses-header">
          <h3>Recent Courses</h3>
        </div>
        <EmptyState
          icon="📚"
          title="No courses yet"
          description="Enroll in courses to see your progress here"
          size="small"
        />
      </Card>
    );
  }

  return (
    <Card className="recent-courses-card">
      <div className="recent-courses-header">
        <h3>Recent Courses</h3>
        {!showAll && courses.length > maxItems && (
          <Button variant="ghost" size="small">
            View All ({courses.length})
          </Button>
        )}
      </div>

      <div className="recent-courses-list">
        {displayCourses.map(course => (
          <div
            key={course.id}
            className="recent-course-item"
            onClick={() => handleCourseClick(course)}
          >
            <div className="course-thumbnail">
              <img
                src={course.thumbnail || course.image || '/images/course-placeholder.jpg'}
                alt={course.title}
              />
              <div className="course-progress-overlay">
                <span>{course.progress || 0}%</span>
              </div>
            </div>

            <div className="course-info">
              <h4 className="course-title">{course.title}</h4>
              <p className="course-instructor">
                {course.instructor || 'Instructor'}
              </p>

              <div className="course-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${course.progress || 0}%`,
                      backgroundColor: getProgressColor(course.progress || 0)
                    }}
                  />
                </div>
                <span className="progress-text">
                  {course.progress || 0}% Complete
                </span>
              </div>

              <div className="course-meta">
                {course.completedModules !== undefined && course.totalModules && (
                  <span className="modules-progress">
                    {course.completedModules}/{course.totalModules} modules
                  </span>
                )}
                {course.nextSession && (
                  <span className="next-session">
                    Next: {new Date(course.nextSession).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <div className="course-actions">
              <Button
                variant="primary"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCourseClick(course);
                }}
              >
                Continue
              </Button>

              {course.status && (
                <Badge
                  variant={course.status === 'completed' ? 'success' : 'primary'}
                  size="small"
                >
                  {course.status}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAll && courses.length === 0 && (
        <div className="no-courses-message">
          <p>No courses enrolled yet. Start learning today!</p>
        </div>
      )}
    </Card>
  );
};

export default RecentCourses;