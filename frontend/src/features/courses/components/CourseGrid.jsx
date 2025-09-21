import React from 'react';
import { Grid, LoadingSpinner, EmptyState } from '@shared';
import CourseCard from './CourseCard';
import './CourseGrid.css';

const CourseGrid = ({
  courses = [],
  loading = false,
  error = null,
  onCourseAction,
  variant = 'default', // 'default', 'enrolled', 'teaching'
  emptyMessage = 'No courses available',
  emptyDescription = 'Check back later for new courses.',
  columns = { base: 1, sm: 2, lg: 3, xl: 4 },
  gap = '1.5rem',
  ...props
}) => {
  // Loading state
  if (loading) {
    return (
      <div className="course-grid course-grid--loading">
        <LoadingSpinner size="large" />
        <p className="course-grid__loading-text">
          Loading courses...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="course-grid course-grid--error">
        <EmptyState
          icon="⚠️"
          title="Failed to load courses"
          description={error.message || 'Please try again later.'}
          action={{
            text: 'Retry',
            onClick: () => window.location.reload()
          }}
        />
      </div>
    );
  }

  // Empty state
  if (!courses || courses.length === 0) {
    return (
      <div className="course-grid course-grid--empty">
        <EmptyState
          icon="📚"
          title={emptyMessage}
          description={emptyDescription}
        />
      </div>
    );
  }

  // Handle course action
  const handleCourseAction = (courseData) => {
    if (onCourseAction) {
      onCourseAction(courseData);
    }
  };

  return (
    <div className={`course-grid course-grid--${variant}`} {...props}>
      <Grid
        columns={columns}
        gap={gap}
        className="course-grid__grid"
      >
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            id={course.id}
            image={course.image || course.thumbnail}
            title={course.title || course.courseTitle}
            description={course.description || course.courseDescription}
            price={course.price || course.courseCost}
            level={course.level}
            duration={course.duration}
            subject={course.subject}
            status={course.status}
            enrolledCount={course.enrolledCount || course.enrolledStudents}
            maxCapacity={course.maxCapacity}
            buttonText={course.buttonName || course.buttonText}
            onAction={handleCourseAction}
            variant={variant}
            loading={course.loading}
          />
        ))}
      </Grid>
    </div>
  );
};

// Course grid with sections/categories
export const CourseGridWithSections = ({
  coursesBySection = {},
  loading = false,
  error = null,
  onCourseAction,
  variant = 'default',
  showSectionTitles = true,
  maxItemsPerSection = null,
  ...props
}) => {
  // Loading state
  if (loading) {
    return (
      <CourseGrid
        courses={[]}
        loading={loading}
        variant={variant}
        {...props}
      />
    );
  }

  // Error state
  if (error) {
    return (
      <CourseGrid
        courses={[]}
        error={error}
        variant={variant}
        {...props}
      />
    );
  }

  // Empty state
  const hasAnyCourses = Object.values(coursesBySection).some(
    courses => courses && courses.length > 0
  );

  if (!hasAnyCourses) {
    return (
      <CourseGrid
        courses={[]}
        variant={variant}
        {...props}
      />
    );
  }

  return (
    <div className={`course-grid-sections course-grid-sections--${variant}`}>
      {Object.entries(coursesBySection).map(([sectionTitle, courses]) => {
        if (!courses || courses.length === 0) return null;

        const displayCourses = maxItemsPerSection
          ? courses.slice(0, maxItemsPerSection)
          : courses;

        return (
          <div key={sectionTitle} className="course-grid-section">
            {showSectionTitles && (
              <div className="course-grid-section__header">
                <h2 className="course-grid-section__title">{sectionTitle}</h2>
                {maxItemsPerSection && courses.length > maxItemsPerSection && (
                  <span className="course-grid-section__count">
                    Showing {maxItemsPerSection} of {courses.length} courses
                  </span>
                )}
              </div>
            )}

            <CourseGrid
              courses={displayCourses}
              onCourseAction={onCourseAction}
              variant={variant}
              {...props}
            />
          </div>
        );
      })}
    </div>
  );
};

export default CourseGrid;