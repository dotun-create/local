import React, { useState } from 'react';
import {
  PageLayout,
  Button,
  Badge,
  Card,
  Image,
  LoadingSpinner,
  ErrorBoundary,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Modal
} from '@shared';
import { useAuth } from '@features/auth';
import { useCourseEnrollment } from '../hooks/useCourses';
import {
  getCourseImage,
  formatCoursePrice,
  getCourseLevelBadgeVariant,
  getCourseStatusBadgeVariant,
  formatCourseDuration
} from '../utils/courseUtils';
import './CourseDetailView.css';

const CourseDetailView = ({ course, onBack, onEnroll }) => {
  const { user, isAuthenticated } = useAuth();
  const { enrollment, isEnrolled, loading: enrollmentLoading, enroll, unenroll } = useCourseEnrollment(course?.id);

  const [activeTab, setActiveTab] = useState('overview');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // Loading state
  if (!course) {
    return (
      <PageLayout className="course-detail-view">
        <div className="course-detail-view__loading">
          <LoadingSpinner size="large" />
          <p>Loading course details...</p>
        </div>
      </PageLayout>
    );
  }

  // Helper functions
  const canEnroll = () => {
    if (!isAuthenticated) return false;
    if (isEnrolled) return false;
    if (course.status !== 'active') return false;
    if (course.maxCapacity && course.enrolledCount >= course.maxCapacity) return false;
    return true;
  };

  const getActionButtonText = () => {
    if (!isAuthenticated) return 'Sign in to Enroll';
    if (isEnrolled) return 'Continue Learning';
    if (course.status !== 'active') return 'Course Not Available';
    if (course.maxCapacity && course.enrolledCount >= course.maxCapacity) return 'Course Full';
    return 'Enroll Now';
  };

  // Handle enrollment
  const handleEnrollment = async () => {
    if (!canEnroll()) {
      if (!isAuthenticated) {
        // Redirect to login
        return;
      }
      return;
    }

    try {
      setEnrolling(true);
      await enroll();
      setShowEnrollModal(false);

      if (onEnroll) {
        onEnroll(course);
      }
    } catch (error) {
      console.error('Enrollment failed:', error);
      // Show error message
    } finally {
      setEnrolling(false);
    }
  };

  const handleAction = () => {
    if (isEnrolled) {
      // Navigate to course content
      if (onEnroll) {
        onEnroll(course);
      }
    } else if (canEnroll()) {
      setShowEnrollModal(true);
    }
  };

  return (
    <ErrorBoundary>
      <PageLayout className="course-detail-view">
        {/* Header */}
        <div className="course-detail-view__header">
          <div className="course-detail-view__breadcrumb">
            <Button
              variant="ghost"
              onClick={onBack}
              className="course-detail-view__back-button"
            >
              ← Back to Courses
            </Button>
          </div>

          <div className="course-detail-view__hero">
            <div className="course-detail-view__hero-content">
              <div className="course-detail-view__title-section">
                <div className="course-detail-view__badges">
                  {course.subject && (
                    <Badge variant="primary">{course.subject}</Badge>
                  )}
                  {course.level && (
                    <Badge variant={getCourseLevelBadgeVariant(course.level)}>
                      {course.level}
                    </Badge>
                  )}
                  {course.status && (
                    <Badge variant={getCourseStatusBadgeVariant(course.status)}>
                      {course.status}
                    </Badge>
                  )}
                </div>

                <h1 className="course-detail-view__title">{course.title}</h1>

                {course.description && (
                  <p className="course-detail-view__description">
                    {course.description}
                  </p>
                )}

                <div className="course-detail-view__meta">
                  {course.instructor && (
                    <div className="course-detail-view__meta-item">
                      <span className="course-detail-view__meta-label">Instructor:</span>
                      <span className="course-detail-view__meta-value">
                        {course.instructor.name || course.instructor}
                      </span>
                    </div>
                  )}

                  {course.duration && (
                    <div className="course-detail-view__meta-item">
                      <span className="course-detail-view__meta-label">Duration:</span>
                      <span className="course-detail-view__meta-value">
                        {formatCourseDuration(course.duration)}
                      </span>
                    </div>
                  )}

                  {course.maxCapacity && (
                    <div className="course-detail-view__meta-item">
                      <span className="course-detail-view__meta-label">Capacity:</span>
                      <span className="course-detail-view__meta-value">
                        {course.enrolledCount || 0}/{course.maxCapacity}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="course-detail-view__hero-image">
                <Image
                  src={getCourseImage(course)}
                  alt={course.title}
                  ratio="16:9"
                  loading="eager"
                />
              </div>
            </div>

            <div className="course-detail-view__action-card">
              <Card className="course-detail-view__enrollment-card">
                <div className="course-detail-view__price">
                  {formatCoursePrice(course)}
                </div>

                {isEnrolled && enrollment && (
                  <div className="course-detail-view__progress">
                    <div className="course-detail-view__progress-text">
                      <span>Course Progress</span>
                      <span>{enrollment.progress || 0}%</span>
                    </div>
                    <div className="course-detail-view__progress-bar">
                      <div
                        className="course-detail-view__progress-fill"
                        style={{ width: `${enrollment.progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                <Button
                  variant={isEnrolled ? "primary" : "primary"}
                  size="large"
                  fullWidth
                  onClick={handleAction}
                  disabled={!canEnroll() && !isEnrolled}
                  loading={enrollmentLoading}
                >
                  {enrollmentLoading ? 'Loading...' : getActionButtonText()}
                </Button>

                {isEnrolled && (
                  <div className="course-detail-view__enrolled-info">
                    <p>Enrolled on {new Date(enrollment.enrolledAt).toLocaleDateString()}</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="course-detail-view__content">
          <Tabs value={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab value="overview">Overview</Tab>
              <Tab value="curriculum">Curriculum</Tab>
              <Tab value="instructor">Instructor</Tab>
              {isEnrolled && <Tab value="materials">Materials</Tab>}
            </TabList>

            <TabPanels>
              <TabPanel value="overview">
                <div className="course-detail-view__overview">
                  <div className="course-detail-view__section">
                    <h2>About This Course</h2>
                    <p>{course.description || course.longDescription || 'No description available.'}</p>
                  </div>

                  {course.learningOutcomes && course.learningOutcomes.length > 0 && (
                    <div className="course-detail-view__section">
                      <h2>What You'll Learn</h2>
                      <ul className="course-detail-view__outcomes">
                        {course.learningOutcomes.map((outcome, index) => (
                          <li key={index}>{outcome}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div className="course-detail-view__section">
                      <h2>Prerequisites</h2>
                      <ul className="course-detail-view__prerequisites">
                        {course.prerequisites.map((prerequisite, index) => (
                          <li key={index}>{prerequisite}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </TabPanel>

              <TabPanel value="curriculum">
                <div className="course-detail-view__curriculum">
                  <div className="course-detail-view__section">
                    <h2>Course Curriculum</h2>
                    {course.modules && course.modules.length > 0 ? (
                      <div className="course-detail-view__modules">
                        {course.modules.map((module, index) => (
                          <Card key={module.id || index} className="course-detail-view__module">
                            <div className="course-detail-view__module-header">
                              <h3>{module.title}</h3>
                              {module.duration && (
                                <span className="course-detail-view__module-duration">
                                  {module.duration}
                                </span>
                              )}
                            </div>
                            {module.description && (
                              <p className="course-detail-view__module-description">
                                {module.description}
                              </p>
                            )}
                            {module.lessons && module.lessons.length > 0 && (
                              <div className="course-detail-view__lessons">
                                <span className="course-detail-view__lesson-count">
                                  {module.lessons.length} lesson{module.lessons.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p>Curriculum information will be available after enrollment.</p>
                    )}
                  </div>
                </div>
              </TabPanel>

              <TabPanel value="instructor">
                <div className="course-detail-view__instructor">
                  <div className="course-detail-view__section">
                    <h2>Meet Your Instructor</h2>
                    {course.instructor ? (
                      <Card className="course-detail-view__instructor-card">
                        <div className="course-detail-view__instructor-info">
                          {course.instructor.avatar && (
                            <Image
                              src={course.instructor.avatar}
                              alt={course.instructor.name}
                              className="course-detail-view__instructor-avatar"
                              width={80}
                              height={80}
                            />
                          )}
                          <div>
                            <h3>{course.instructor.name}</h3>
                            {course.instructor.title && (
                              <p className="course-detail-view__instructor-title">
                                {course.instructor.title}
                              </p>
                            )}
                            {course.instructor.bio && (
                              <p className="course-detail-view__instructor-bio">
                                {course.instructor.bio}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <p>Instructor information not available.</p>
                    )}
                  </div>
                </div>
              </TabPanel>

              {isEnrolled && (
                <TabPanel value="materials">
                  <div className="course-detail-view__materials">
                    <div className="course-detail-view__section">
                      <h2>Course Materials</h2>
                      <p>Access your course materials, assignments, and resources.</p>
                      {/* Course materials would be loaded here */}
                    </div>
                  </div>
                </TabPanel>
              )}
            </TabPanels>
          </Tabs>
        </div>

        {/* Enrollment Confirmation Modal */}
        <Modal
          isOpen={showEnrollModal}
          onClose={() => setShowEnrollModal(false)}
          title="Confirm Enrollment"
          size="medium"
        >
          <div className="course-detail-view__enrollment-modal">
            <p>Are you sure you want to enroll in <strong>{course.title}</strong>?</p>

            <div className="course-detail-view__enrollment-details">
              <div className="course-detail-view__detail-item">
                <span>Price:</span>
                <span>{formatCoursePrice(course)}</span>
              </div>
              {course.duration && (
                <div className="course-detail-view__detail-item">
                  <span>Duration:</span>
                  <span>{formatCourseDuration(course.duration)}</span>
                </div>
              )}
            </div>

            <div className="course-detail-view__modal-actions">
              <Button
                variant="outline-secondary"
                onClick={() => setShowEnrollModal(false)}
                disabled={enrolling}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleEnrollment}
                loading={enrolling}
                disabled={enrolling}
              >
                {enrolling ? 'Enrolling...' : 'Confirm Enrollment'}
              </Button>
            </div>
          </div>
        </Modal>
      </PageLayout>
    </ErrorBoundary>
  );
};

export default CourseDetailView;