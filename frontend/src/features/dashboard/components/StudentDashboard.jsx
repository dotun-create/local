import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Badge,
  LoadingSpinner,
  ErrorBoundary,
  Modal,
  EmptyState
} from '@shared';
import { useAuth } from '@features/auth';
import { useCourses } from '@features/courses';
import DashboardLayout from './DashboardLayout';
import StatCard, { StatCardGrid } from './StatCard';
import RecentCourses from './RecentCourses';
import UpcomingTasks from './UpcomingTasks';
import NextSession from './NextSession';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();

  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sidebar navigation items
  const sidebarItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: '📊'
    },
    {
      id: 'courses',
      label: 'My Courses',
      icon: '📚',
      badge: { text: courses?.filter(c => c.isEnrolled)?.length || 0, variant: 'primary' }
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: '📝',
      badge: upcomingTasks.length > 0 ? { text: upcomingTasks.length, variant: 'warning' } : null
    },
    {
      id: 'sessions',
      label: 'Sessions',
      icon: '🎥',
      badge: upcomingSessions.length > 0 ? { text: upcomingSessions.length, variant: 'success' } : null
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: '📈'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: '👤'
    }
  ];

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!isAuthenticated || !user) return;

      try {
        setLoading(true);
        setError(null);

        // Simulate analytics data (replace with actual API call)
        const mockAnalytics = {
          completedCourses: 3,
          ongoingCourses: courses?.filter(c => c.isEnrolled)?.length || 0,
          totalCredits: 45,
          currentLevel: 'Intermediate',
          weeklyProgress: 12,
          monthlyProgress: 25,
          streakDays: 7,
          averageScore: 85
        };

        // Simulate upcoming tasks (replace with actual API call)
        const mockTasks = [
          {
            id: 1,
            name: 'Math Quiz Chapter 5',
            course: 'Advanced Mathematics',
            type: 'quiz',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'high'
          },
          {
            id: 2,
            name: 'Science Project',
            course: 'Physics Fundamentals',
            type: 'project',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'medium'
          }
        ];

        // Simulate upcoming sessions (replace with actual API call)
        const mockSessions = [
          {
            id: 1,
            title: 'Advanced Calculus',
            course: 'Mathematics',
            instructor: 'Dr. Smith',
            date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            duration: '60 min',
            zoomLink: '#'
          }
        ];

        setAnalytics(mockAnalytics);
        setUpcomingTasks(mockTasks);
        setUpcomingSessions(mockSessions);

      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [isAuthenticated, user, courses]);

  // Handle tab navigation
  const handleTabSelect = (tabId) => {
    setActiveTab(tabId);
  };

  // Header actions
  const headerActions = (
    <>
      <Button
        variant="outline-primary"
        size="small"
        onClick={() => window.location.reload()}
        disabled={loading}
      >
        {loading ? '⏳' : '🔄'} Refresh
      </Button>
    </>
  );

  // Loading state
  if (loading || coursesLoading) {
    return (
      <DashboardLayout
        title="Student Dashboard"
        subtitle="Loading your data..."
        sidebarItems={sidebarItems}
        activeItem={activeTab}
        onItemSelect={handleTabSelect}
        actions={headerActions}
      >
        <div className="dashboard-loading">
          <LoadingSpinner size="large" />
          <p>Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout
        title="Student Dashboard"
        subtitle="Error loading dashboard"
        sidebarItems={sidebarItems}
        activeItem={activeTab}
        onItemSelect={handleTabSelect}
        actions={headerActions}
      >
        <div className="dashboard-error">
          <EmptyState
            icon="⚠️"
            title="Failed to load dashboard"
            description={error}
            action={{
              text: 'Retry',
              onClick: () => window.location.reload()
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="dashboard-overview">
            {/* Stats Grid */}
            <StatCardGrid columns={{ base: 1, sm: 2, lg: 4 }}>
              <StatCard
                title="Completed Courses"
                value={analytics?.completedCourses || 0}
                icon="🎓"
                variant="success"
                change={analytics?.weeklyProgress}
                changeType="positive"
              />
              <StatCard
                title="Ongoing Courses"
                value={analytics?.ongoingCourses || 0}
                icon="📖"
                variant="primary"
                onClick={() => setActiveTab('courses')}
              />
              <StatCard
                title="Total Credits"
                value={analytics?.totalCredits || 0}
                icon="⭐"
                variant="warning"
                change={analytics?.monthlyProgress}
                changeType="positive"
              />
              <StatCard
                title="Current Level"
                value={analytics?.currentLevel || 'Beginner'}
                icon="📈"
                description="Learning progress"
              />
            </StatCardGrid>

            {/* Dashboard Sections */}
            <div className="dashboard-sections">
              <div className="dashboard-section">
                <RecentCourses
                  courses={courses?.filter(c => c.isEnrolled)?.slice(0, 3) || []}
                  onCourseClick={(course) => navigate(`/courses/${course.id}`)}
                />
              </div>

              <div className="dashboard-section">
                <UpcomingTasks
                  tasks={upcomingTasks.slice(0, 4)}
                  onTaskClick={(task) => console.log('Task clicked:', task)}
                />
              </div>

              <div className="dashboard-section">
                <NextSession
                  session={upcomingSessions[0]}
                  onJoinSession={(session) => window.open(session.zoomLink, '_blank')}
                />
              </div>
            </div>
          </div>
        );

      case 'courses':
        return (
          <div className="dashboard-courses">
            <div className="section-header">
              <h2>My Courses</h2>
              <Button
                variant="primary"
                onClick={() => navigate('/courses')}
              >
                Browse Courses
              </Button>
            </div>

            {courses?.filter(c => c.isEnrolled)?.length > 0 ? (
              <div className="enrolled-courses">
                {courses.filter(c => c.isEnrolled).map(course => (
                  <Card key={course.id} className="course-summary-card">
                    <div className="course-summary-content">
                      <div className="course-summary-info">
                        <h3>{course.title}</h3>
                        <p>{course.description}</p>
                        <div className="course-progress">
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${course.progress || 0}%` }}
                            />
                          </div>
                          <span>{course.progress || 0}% Complete</span>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        onClick={() => navigate(`/courses/${course.id}`)}
                      >
                        Continue
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="📚"
                title="No courses enrolled"
                description="Explore our course catalog to get started"
                action={{
                  text: 'Browse Courses',
                  onClick: () => navigate('/courses')
                }}
              />
            )}
          </div>
        );

      case 'tasks':
        return (
          <div className="dashboard-tasks">
            <div className="section-header">
              <h2>Upcoming Tasks</h2>
            </div>
            <UpcomingTasks
              tasks={upcomingTasks}
              onTaskClick={(task) => console.log('Task clicked:', task)}
              showAll
            />
          </div>
        );

      case 'sessions':
        return (
          <div className="dashboard-sessions">
            <div className="section-header">
              <h2>Upcoming Sessions</h2>
            </div>

            {upcomingSessions.length > 0 ? (
              <div className="sessions-list">
                {upcomingSessions.map(session => (
                  <Card key={session.id} className="session-card">
                    <div className="session-content">
                      <div className="session-info">
                        <h3>{session.title}</h3>
                        <p>Course: {session.course}</p>
                        <p>Instructor: {session.instructor}</p>
                        <p>Date: {new Date(session.date).toLocaleDateString()}</p>
                        <p>Time: {new Date(session.date).toLocaleTimeString()}</p>
                      </div>
                      <Button
                        variant="success"
                        onClick={() => window.open(session.zoomLink, '_blank')}
                      >
                        Join Session
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon="🎥"
                title="No upcoming sessions"
                description="Your scheduled sessions will appear here"
              />
            )}
          </div>
        );

      case 'progress':
        return (
          <div className="dashboard-progress">
            <div className="section-header">
              <h2>Learning Progress</h2>
            </div>

            <StatCardGrid columns={{ base: 1, sm: 2, lg: 3 }}>
              <StatCard
                title="Learning Streak"
                value={`${analytics?.streakDays || 0} days`}
                icon="🔥"
                variant="success"
                description="Consecutive learning days"
              />
              <StatCard
                title="Average Score"
                value={`${analytics?.averageScore || 0}%`}
                icon="🎯"
                variant="primary"
                description="Across all assessments"
              />
              <StatCard
                title="Time This Week"
                value="12.5 hrs"
                icon="⏰"
                variant="warning"
                description="Study time logged"
              />
            </StatCardGrid>
          </div>
        );

      case 'profile':
        return (
          <div className="dashboard-profile">
            <div className="section-header">
              <h2>Profile Settings</h2>
            </div>

            <Card className="profile-card">
              <div className="profile-content">
                <div className="profile-info">
                  <div className="profile-avatar">
                    <img
                      src={user?.avatar || user?.profile?.avatar || '/images/default-avatar.png'}
                      alt="Profile"
                    />
                  </div>
                  <div className="profile-details">
                    <h3>{user?.name || user?.profile?.name || 'Student'}</h3>
                    <p>{user?.email}</p>
                    <Badge variant="primary">
                      {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'Student'}
                    </Badge>
                  </div>
                </div>
                <div className="profile-actions">
                  <Button variant="primary">Edit Profile</Button>
                  <Button variant="outline-secondary">Change Password</Button>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return (
          <EmptyState
            icon="🚧"
            title="Coming Soon"
            description="This section is under development"
          />
        );
    }
  };

  return (
    <ErrorBoundary>
      <DashboardLayout
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'Student'}!`}
        subtitle={`Today is ${new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`}
        sidebarItems={sidebarItems}
        activeItem={activeTab}
        onItemSelect={handleTabSelect}
        actions={headerActions}
        showRoleSwitcher={false}
      >
        <div className="student-dashboard-content">
          {renderTabContent()}
        </div>
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default StudentDashboard;