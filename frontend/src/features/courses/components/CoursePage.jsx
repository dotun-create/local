import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  PageLayout,
  HeroSection,
  LoadingSpinner,
  ErrorBoundary,
  SearchInput,
  FilterSelect,
  Button,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel
} from '@shared';
import { CourseGrid, CourseGridWithSections } from './CourseGrid';
import CourseDetailView from './CourseDetailView';
import { useCourses } from '../hooks/useCourses';
import { useAuth } from '@features/auth';
import { getCourseImage } from '../utils/courseUtils';
import { formatCoursePrice } from '@shared/utils/currency';
import './CoursePage.css';

const CoursePage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  // Local state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || 'all');
  const [selectedLevel, setSelectedLevel] = useState(searchParams.get('level') || 'all');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all');

  // Course data
  const {
    courses,
    courseById,
    loading,
    error,
    refetch,
    searchCourses,
    getCourseById
  } = useCourses();

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [organizedCourses, setOrganizedCourses] = useState({});

  // Load individual course if courseId is provided
  useEffect(() => {
    if (courseId) {
      const loadCourse = async () => {
        try {
          const course = await getCourseById(courseId);
          setSelectedCourse(course);
        } catch (error) {
          console.error('Failed to load course:', error);
          navigate('/courses', { replace: true });
        }
      };
      loadCourse();
    } else {
      setSelectedCourse(null);
    }
  }, [courseId, getCourseById, navigate]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedSubject !== 'all') params.set('subject', selectedSubject);
    if (selectedLevel !== 'all') params.set('level', selectedLevel);
    if (activeTab !== 'all') params.set('tab', activeTab);

    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedSubject, selectedLevel, activeTab, setSearchParams]);

  // Filter and organize courses
  useEffect(() => {
    if (!courses || !Array.isArray(courses)) return;

    let filtered = [...courses];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        course =>
          course.title?.toLowerCase().includes(query) ||
          course.description?.toLowerCase().includes(query) ||
          course.subject?.toLowerCase().includes(query)
      );
    }

    // Apply subject filter
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(course => course.subject === selectedSubject);
    }

    // Apply level filter
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(course => course.level === selectedLevel);
    }

    // Apply tab filter based on user enrollment
    if (isAuthenticated && user) {
      switch (activeTab) {
        case 'enrolled':
          filtered = filtered.filter(course =>
            user.enrolledCourses?.includes(course.id)
          );
          break;
        case 'teaching':
          filtered = filtered.filter(course =>
            course.tutorId === user.id ||
            course.assignedTutors?.includes(user.id)
          );
          break;
        case 'available':
          filtered = filtered.filter(course =>
            !user.enrolledCourses?.includes(course.id) &&
            course.status === 'active'
          );
          break;
        default:
          // 'all' - no additional filtering
          break;
      }
    }

    setFilteredCourses(filtered);

    // Organize by subject for sectioned display
    const organized = filtered.reduce((acc, course) => {
      const subject = course.subject || 'General';
      if (!acc[subject]) {
        acc[subject] = [];
      }
      acc[subject].push({
        ...course,
        // Normalize properties for CourseCard
        image: getCourseImage(course),
        courseTitle: course.title,
        courseDescription: course.description,
        courseCost: formatCoursePrice(course),
        buttonName: getButtonText(course, user, activeTab)
      });
      return acc;
    }, {});

    setOrganizedCourses(organized);
  }, [courses, searchQuery, selectedSubject, selectedLevel, activeTab, user, isAuthenticated]);

  // Get unique subjects and levels for filters
  const subjects = React.useMemo(() => {
    if (!courses) return [];
    const uniqueSubjects = [...new Set(courses.map(course => course.subject).filter(Boolean))];
    return uniqueSubjects.sort();
  }, [courses]);

  const levels = React.useMemo(() => {
    if (!courses) return [];
    const uniqueLevels = [...new Set(courses.map(course => course.level).filter(Boolean))];
    return uniqueLevels.sort();
  }, [courses]);

  // Helper function to get button text based on context
  const getButtonText = (course, user, tab) => {
    if (!isAuthenticated) return 'View Course';

    if (tab === 'enrolled') return 'Continue';
    if (tab === 'teaching') return 'Manage';
    if (user?.enrolledCourses?.includes(course.id)) return 'Continue';
    if (course.tutorId === user?.id) return 'Manage';

    return 'Enroll';
  };

  // Handle course action
  const handleCourseAction = (courseData) => {
    navigate(`/courses/${courseData.id}`);
  };

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // Get tab variant for course grid
  const getGridVariant = () => {
    switch (activeTab) {
      case 'enrolled': return 'enrolled';
      case 'teaching': return 'teaching';
      default: return 'default';
    }
  };

  // Hero section configuration
  const heroConfig = {
    title: 'Discover Courses',
    subtitle: 'Explore our comprehensive learning platform',
    description: 'Find the perfect course to advance your knowledge and skills',
    backgroundImage: '/images/courses-hero.jpg'
  };

  // If viewing individual course
  if (courseId && selectedCourse) {
    return (
      <ErrorBoundary>
        <CourseDetailView
          course={selectedCourse}
          onBack={() => navigate('/courses')}
          onEnroll={handleCourseAction}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <PageLayout className="course-page">
        <HeroSection {...heroConfig} />

        <div className="course-page__content">
          <div className="course-page__header">
            <div className="course-page__title-section">
              <h1>Courses</h1>
              <p>Browse and enroll in courses that match your learning goals</p>
            </div>

            <div className="course-page__actions">
              <Button
                variant="outline-primary"
                onClick={() => refetch()}
                loading={loading}
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Tabs for authenticated users */}
          {isAuthenticated && (
            <div className="course-page__tabs">
              <Tabs value={activeTab} onChange={setActiveTab}>
                <TabList>
                  <Tab value="all">All Courses</Tab>
                  <Tab value="available">Available</Tab>
                  <Tab value="enrolled">My Courses</Tab>
                  {user?.role === 'tutor' && (
                    <Tab value="teaching">Teaching</Tab>
                  )}
                </TabList>
              </Tabs>
            </div>
          )}

          {/* Filters */}
          <div className="course-page__filters">
            <div className="course-page__search">
              <SearchInput
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search courses..."
                debounceMs={300}
              />
            </div>

            <div className="course-page__filter-selects">
              <FilterSelect
                value={selectedSubject}
                onChange={setSelectedSubject}
                label="Subject"
                options={[
                  { value: 'all', label: 'All Subjects' },
                  ...subjects.map(subject => ({ value: subject, label: subject }))
                ]}
              />

              <FilterSelect
                value={selectedLevel}
                onChange={setSelectedLevel}
                label="Level"
                options={[
                  { value: 'all', label: 'All Levels' },
                  ...levels.map(level => ({ value: level, label: level }))
                ]}
              />
            </div>
          </div>

          {/* Course results */}
          <div className="course-page__results">
            {loading ? (
              <div className="course-page__loading">
                <LoadingSpinner size="large" />
                <p>Loading courses...</p>
              </div>
            ) : error ? (
              <div className="course-page__error">
                <p>Failed to load courses: {error.message}</p>
                <Button onClick={() => refetch()}>Retry</Button>
              </div>
            ) : Object.keys(organizedCourses).length > 0 ? (
              <CourseGridWithSections
                coursesBySection={organizedCourses}
                onCourseAction={handleCourseAction}
                variant={getGridVariant()}
                emptyMessage={getEmptyMessage(activeTab)}
                emptyDescription={getEmptyDescription(activeTab)}
              />
            ) : (
              <CourseGrid
                courses={[]}
                variant={getGridVariant()}
                emptyMessage={getEmptyMessage(activeTab)}
                emptyDescription={getEmptyDescription(activeTab)}
              />
            )}
          </div>
        </div>
      </PageLayout>
    </ErrorBoundary>
  );
};

// Helper functions for empty states
const getEmptyMessage = (tab) => {
  switch (tab) {
    case 'enrolled': return 'No enrolled courses';
    case 'teaching': return 'No courses assigned';
    case 'available': return 'No available courses';
    default: return 'No courses found';
  }
};

const getEmptyDescription = (tab) => {
  switch (tab) {
    case 'enrolled': return 'Enroll in courses to see them here.';
    case 'teaching': return 'Contact admin to get courses assigned to you.';
    case 'available': return 'Check back later for new courses.';
    default: return 'Try adjusting your search or filters.';
  }
};

export default CoursePage;