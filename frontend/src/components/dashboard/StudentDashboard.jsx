import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { useAnalytics, useSessions, useEnrollments, useAuth } from '../../hooks/useData';
import { useMultiRoleAuth } from '../../hooks/useMultiRoleAuth';
import { useStudentPageRefresh } from '../../hooks/useAdminRefresh';
import ChangePasswordModal from '../common/ChangePasswordModal';
import EditProfileModal from '../common/EditProfileModal';
import RequestGuardianModal from '../student/RequestGuardianModal';
import UpcomingTasks from '../module/UpcomingTasks';
import RoleSwitcher from '../common/RoleSwitcher';
import TimeslotManagement from '../tutor/TimeslotManagement';
import SessionOverview from '../tutor/SessionOverview';
import TutorQualificationInfo from '../tutor/TutorQualificationInfo';
import './css/StudentDashboard.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const {
    user: multiRoleUser,
    activeRole,
    isMultiRole,
    canAccessTutorDashboard,
    isStudent,
    isTutor
  } = useMultiRoleAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [studentProfile, setStudentProfile] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [showRequestGuardianModal, setShowRequestGuardianModal] = useState(false);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Tutor stats state for dual-role users in tutor mode
  const [tutorStats, setTutorStats] = useState({
    dashboardStats: {},
    earnings: {},
    availabilityStats: {
      totalSlots: 0,
      bookedSlots: 0,
      availableHours: 0,
      weeklyHours: 0,
      utilizationRate: 0,
      estimatedWeeklyEarnings: 0,
      completionRate: 85,
      peakPeriod: 'afternoon',
      courseTypes: 0,
      mostActiveDay: 'N/A',
      mostActiveHour: 'N/A',
      recurringSlots: 0,
      conflicts: 0
    },
    upcomingSessions: [],
    sessionHistory: []
  });
  const [tutorStatsLoading, setTutorStatsLoading] = useState(false);

  // Get current user from session storage - use state to ensure re-renders
  const [sessionUser, setSessionUser] = useState(() =>
    JSON.parse(sessionStorage.getItem('currentUser') || '{}')
  );

  // Prefer multi-role user data when available, fallback to session user
  const currentUser = multiRoleUser || sessionUser;
  const userId = currentUser.id;
  
  // Use hooks for analytics, sessions, and enrollments
  const { data: analytics } = useAnalytics('student', userId);
  const { upcomingSessions } = useSessions(userId, activeRole || 'student');
  const { enrollments, loading: enrollmentsLoading, error: enrollmentsError } = useEnrollments({ status: 'active' });

  // Update session user when multi-role user changes
  useEffect(() => {
    if (multiRoleUser) {
      setSessionUser(multiRoleUser);
    }
  }, [multiRoleUser]);

  // Load student data from backend
  useEffect(() => {
    loadStudentData();
  }, [userId, analytics, enrollments]);

  // Load tasks when Tasks tab is selected
  useEffect(() => {
    if (activeTab === 'tasks' && userId) {
      loadQuizTasks();
    }
  }, [activeTab, userId]);

  // Load tutor stats when role switches to tutor or overview tab is accessed in tutor mode
  useEffect(() => {
    if (activeRole === 'tutor' && (activeTab === 'overview' || activeTab === 'tutor-sessions')) {
      loadTutorStats();
    }
  }, [activeRole, activeTab, userId]);

  const loadQuizTasks = async () => {
    try {
      console.log('Loading quiz tasks from API...');
      const quizTasksResponse = await API.studentTasks.getUpcomingTasks();
      console.log('Quiz tasks loaded:', quizTasksResponse);
      setUpcomingTasks(quizTasksResponse.tasks || []);
    } catch (error) {
      console.error('Failed to load quiz tasks:', error);
      // Keep existing tasks if API fails
    }
  };


  // Use upcoming sessions from hook or fallback to sample data
  const upcomingZoomSessions = upcomingSessions || [];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getTimeRemaining = (dateString) => {
    const now = new Date();
    const due = new Date(dateString);
    const diff = due - now;
    
    if (diff < 0) return 'Overdue';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
    return 'Due soon';
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#26de81';
      default: return '#747d8c';
    }
  };

  const getTaskIcon = (type) => {
    switch(type) {
      case 'quiz': return '📝';
      case 'assignment': return '📄';
      case 'review': return '👥';
      case 'video': return '🎥';
      case 'project': return '💼';
      case 'reading': return '📚';
      default: return '📋';
    }
  };

  const handleCourseClick = (courseId) => {
    navigate(`/student-course-detail/${courseId}`);
  };

  const handleRecentCourseClick = (course) => {
    navigate(`/student-course-detail/${course.id}`, { 
      state: { 
        courseData: course,
        fromDashboard: true
      } 
    });
  };

  const handleTaskClick = (task) => {
    if (task.type === 'quiz' && task.link) {
      navigate(task.link);
    } else if (task.link) {
      // For external links or other task types
      window.open(task.link, '_blank');
    }
  };

  const handleJoinZoom = (zoomLink) => {
    window.open(zoomLink, '_blank');
  };

  const handleLogout = () => {
    logout();
  };

  const handleGuardianRequestSent = (request) => {
    // Refresh student data to reflect any updates
    loadStudentData();
  };

  const handleEnrollInCourse = async (courseId, courseTitle) => {
    try {
      const confirmEnroll = window.confirm(`Do you want to enroll in "${courseTitle}"?`);
      if (!confirmEnroll) return;

      const response = await API.courses.enrollStudent(courseId, userId);
      
      // Handle different enrollment scenarios
      if (response.requires_approval) {
        alert(
          `Enrollment request submitted for "${courseTitle}"!\n\n` +
          `Your guardian has been notified and will need to:\n` +
          `• Review and approve your enrollment\n` +
          `• Allocate lesson credits for this course\n\n` +
          `You'll receive confirmation once approved.`
        );
      } else {
        alert(`Successfully enrolled in "${courseTitle}"!`);
      }
      
      // Refresh courses to update enrollment status
      await loadAvailableCourses(studentProfile.gradeLevel);
      
      // Also refresh enrolled courses data
      await loadStudentData();
      
    } catch (error) {
      console.error('Failed to enroll in course:', error);
      const errorMessage = error.response?.data?.error || 'Failed to enroll in course. Please try again.';
      alert(errorMessage);
    }
  };

  const handleContinueCourse = (courseId) => {
    navigate(`/student-course-detail/${courseId}`);
  };

  const handleChangePassword = async (passwordData) => {
    try {
      setChangePasswordLoading(true);
      
      await API.auth.changePassword(passwordData);
      
      setShowChangePasswordModal(false);
      
      alert('Password changed successfully! Please log in with your new password.');
      
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('currentUser');
      navigate('/login');
      
    } catch (error) {
      console.error('Failed to change password:', error);
      alert('Failed to change password. Please check your current password and try again.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const loadAvailableCourses = async (gradeLevel) => {
    if (!gradeLevel) return;
    
    try {
      setCoursesLoading(true);
      
      // Make both API calls in parallel for better performance
      const [coursesResponse, enrollmentsResponse] = await Promise.all([
        API.courses.getCourses({
          gradeLevel: gradeLevel,
          status: 'active'
        }),
        API.enrollments.getEnrollments()
      ]);
      
      const studentEnrollments = enrollmentsResponse.enrollments || [];
      
      // Create a set of enrolled course IDs for quick lookup
      const enrolledCourseIds = new Set(
        studentEnrollments.map(enrollment => enrollment.courseId)
      );
      
      // Debug: Log key info only when needed
      if (studentEnrollments.length > 0) {
        console.log('Found enrollments:', studentEnrollments.length, 'courses');
      } else {
        console.log('No active enrollments found for student');
      }
      
      const coursesData = (coursesResponse.courses || []).map(course => {
        const isEnrolled = enrolledCourseIds.has(course.id);
        const enrollment = studentEnrollments.find(e => e.courseId === course.id);
        
        return {
          id: course.id,
          title: course.title,
          description: course.description,
          thumbnail: course.thumbnail || '/images/courses/default.jpg',
          price: course.price || 0,
          currency: course.currency || 'GBP',
          duration: course.duration,
          level: course.level,
          subject: course.subject,
          gradeLevel: course.gradeLevel,
          totalModules: course.totalModules || 0,
          enrolledStudents: course.enrolledStudents || 0,
          assignedTutors: course.assignedTutors || [],
          isEnrolled: isEnrolled,
          enrollmentStatus: enrollment?.status || null,
          progress: enrollment?.progress || 0,
          enrollmentId: enrollment?.id || null
        };
      });
      
      // Ensure all enrollment data is processed before updating state
      setAvailableCourses(coursesData);
      
    } catch (error) {
      console.error('Failed to load available courses:', error);
      setAvailableCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  const loadStudentData = async () => {
    if (!userId) {
      setError('No user session found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get fresh user data from session storage (in case it was updated)
      const freshCurrentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

      // Get real-time credit balance from backend
      let realTimeCredits = 0;
      try {
        console.log('📊 Dashboard: Fetching real-time credits for user:', userId);
        const userProfile = await API.users.getProfile(userId);
        realTimeCredits = userProfile.credits || userProfile.availableCredits || 0;
        console.log('📊 Dashboard: Real-time credits fetched:', realTimeCredits);
      } catch (creditError) {
        console.warn('📊 Dashboard: Failed to fetch real-time credits:', creditError);
        // Fallback to analytics data if API call fails
        realTimeCredits = analytics?.totalCredits || 0;
      }

      // Set profile from session storage with real credit balance
      const profile = {
        name: freshCurrentUser.profile?.name || freshCurrentUser.name || freshCurrentUser.email || 'Student',
        email: freshCurrentUser.email,
        studentId: freshCurrentUser.id,
        enrollmentDate: new Date(freshCurrentUser.created_at || Date.now()).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        avatar: freshCurrentUser.profile?.avatar || '/images/user-avatar.png',
        level: freshCurrentUser.profile?.level || 'Beginner',
        academicCountry: freshCurrentUser.academicCountry || '',
        gradeLevel: freshCurrentUser.grade || '',
        completedCourses: analytics?.completedCourses || 0,
        ongoingCourses: analytics?.ongoingCourses || 0,
        totalCredits: realTimeCredits // Use real-time credit balance
      };
      setStudentProfile(profile);

      // Load available courses based on student's grade level
      if (profile.gradeLevel) {
        await loadAvailableCourses(profile.gradeLevel);
      }

      // Process enrolled courses from hook data
      const coursesData = (enrollments || []).map(enrollment => ({
        id: enrollment.course?.id || enrollment.id,
        title: enrollment.course?.title || 'Unknown Course',
        instructor: 'Instructor', // Will be updated when we have tutor info
        progress: enrollment.progress || 0,
        nextSession: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        thumbnail: enrollment.course?.thumbnail || '/images/courses/default.jpg',
        modules: enrollment.course?.modules?.length || 0,
        completedModules: enrollment.completed_modules || 0,
        status: enrollment.status
      }));
      setEnrolledCourses(coursesData);

      // Load quiz tasks using the same function as Tasks tab
      await loadQuizTasks();

    } catch (err) {
      console.error('Failed to load student data:', err);
      setError('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  // Load tutor stats for dual-role users in tutor mode
  const loadTutorStats = async () => {
    if (!userId || activeRole !== 'tutor') {
      return;
    }

    try {
      setTutorStatsLoading(true);
      console.log('🔄 Loading tutor stats for dual-role user:', userId);

      // Load tutor data similar to TutorPage component
      const [sessionsData, earningsData, statsData, historyData] = await Promise.all([
        API.sessions.getUpcomingSessions(userId, 'tutor').catch(err => {
          console.warn('Sessions endpoint not available:', err.message);
          return [];
        }),
        API.analytics.getEarnings(userId).catch(err => {
          console.warn('Earnings endpoint not available:', err.message);
          return {
            totalEarnings: 0,
            pendingPayouts: 0,
            thisMonth: 0,
            lastMonth: 0,
            upcoming: {},
            hourlyRate: 21,
            currency: 'GBP'
          };
        }),
        API.analytics.getDashboardStats('tutor', userId).catch(err => {
          console.warn('Analytics endpoint not available:', err.message);
          return {};
        }),
        API.sessions.getSessionHistory(userId, 'tutor').catch(err => {
          console.warn('Session history endpoint not available:', err.message);
          return [];
        })
      ]);

      // Calculate availability stats (simplified version)
      const availabilityStats = {
        totalSlots: 0,
        bookedSlots: 0,
        availableHours: 0,
        weeklyHours: 0,
        utilizationRate: 0,
        estimatedWeeklyEarnings: 0,
        completionRate: 85,
        peakPeriod: 'afternoon',
        courseTypes: 3,
        mostActiveDay: 'Monday',
        mostActiveHour: '14:00',
        recurringSlots: 0,
        conflicts: 0
      };

      setTutorStats({
        dashboardStats: statsData || {},
        earnings: earningsData || {},
        availabilityStats,
        upcomingSessions: sessionsData || [],
        sessionHistory: historyData || []
      });

      console.log('✅ Tutor stats loaded successfully');

    } catch (error) {
      console.error('Failed to load tutor stats:', error);
      setTutorStats({
        dashboardStats: {},
        earnings: {},
        availabilityStats: {},
        upcomingSessions: [],
        sessionHistory: []
      });
    } finally {
      setTutorStatsLoading(false);
    }
  };

  const handleEditProfile = async (profileData) => {
    try {
      setEditProfileLoading(true);
      
      // Create FormData for image upload
      const formData = new FormData();
      
      
      // Add profile data to FormData
      const profilePayload = {
        name: profileData.name,
        email: profileData.email,
        profile: {
          phone: profileData.phone,
          bio: profileData.bio,
          address: {
            street: profileData.street,
            city: profileData.city,
            state: profileData.state,
            zipCode: profileData.zipCode,
            country: profileData.country
          },
          guardianName: profileData.guardianName,
          guardianEmail: profileData.guardianEmail,
          guardianId: profileData.guardianId
        },
        academicCountry: profileData.academicCountry,
        grade: profileData.gradeLevel
      };
      
      formData.append('profileData', JSON.stringify(profilePayload));
      
      // Add image if provided
      if (profileData.image) {
        formData.append('image', profileData.image);
      }
      
      // Use the appropriate API method
      let response;
      if (profileData.image) {
        response = await API.users.updateUserProfileWithImage(userId, formData);
      } else {
        response = await API.users.updateUserProfile(userId, profilePayload);
      }
      
      // Update local state with new profile data
      const updatedUser = { ...currentUser, ...response.user };
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setSessionUser(updatedUser); // Update component state to trigger re-render
      
      // Update student profile state immediately with the fresh data
      setStudentProfile(prev => ({
        ...prev,
        name: updatedUser.profile?.name || updatedUser.name || prev.name,
        email: updatedUser.email || prev.email,
        avatar: updatedUser.profile?.avatar || prev.avatar,
        academicCountry: updatedUser.academicCountry || '',
        gradeLevel: updatedUser.grade || ''
      }));
      
      // Also refresh the entire data to ensure consistency
      await loadStudentData();
      
      // Reload courses if grade level changed
      if (updatedUser.grade && updatedUser.grade !== currentUser.grade) {
        await loadAvailableCourses(updatedUser.grade);
      }
      
      setShowEditProfileModal(false);
      
      // Check if guardian was successfully linked
      if (profileData.guardianId && response.user.profile?.guardian_id) {
        alert('Profile updated successfully! You have been linked to your guardian.');
      } else if (profileData.guardianId && !response.user.profile?.guardian_id) {
        alert('Profile updated successfully, but guardian linking may have failed. Please verify the Guardian ID.');
      } else {
        alert('Profile updated successfully!');
      }
      
    } catch (error) {
      console.error('Failed to update profile:', error);
      
      // Check if error is related to guardian ID not found
      if (error.response && error.response.data && error.response.data.error) {
        const errorMessage = error.response.data.error;
        if (errorMessage.includes('Guardian with ID') && errorMessage.includes('not found')) {
          alert(`Failed to update profile: ${errorMessage}\n\nPlease check the Guardian ID and try again.`);
        } else {
          alert(`Failed to update profile: ${errorMessage}`);
        }
      } else {
        alert('Failed to update profile. Please try again.');
      }
    } finally {
      setEditProfileLoading(false);
    }
  };

  // Comprehensive refresh handler for hybrid refresh system
  const handleStudentDataRefresh = useCallback(async (event) => {
    console.log('🔄 Student dashboard refresh triggered by event:', event);
    
    if (!userId) {
      console.warn('Cannot refresh - no user ID');
      return;
    }

    try {
      const refreshPromises = [];
      
      // Core student data refresh
      refreshPromises.push(
        loadStudentData()
      );
      
      // Refresh tasks if tasks tab is active
      if (activeTab === 'tasks') {
        refreshPromises.push(
          loadQuizTasks()
        );
      }
      
      // Refresh available courses if courses tab is active and grade level exists
      if (activeTab === 'courses' && studentProfile?.gradeLevel) {
        refreshPromises.push(
          loadAvailableCourses(studentProfile.gradeLevel)
        );
      }
      
      // Execute all refreshes concurrently
      await Promise.all(refreshPromises);
      
      console.log('✅ Student dashboard refresh completed successfully');
      
    } catch (error) {
      console.error('❌ Error during student dashboard refresh:', error);
    }
  }, [userId, activeTab, studentProfile?.gradeLevel]);

  // Initialize hybrid refresh system
  const { triggerRefresh, isRefreshing } = useStudentPageRefresh(
    userId, 
    handleStudentDataRefresh
  );

  // Loading state
  if (loading || enrollmentsLoading) {
    return (
      <div className="student-dashboard">
        <div className="loading-container" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '1.2rem'
        }}>
          Loading student dashboard...
        </div>
      </div>
    );
  }

  // Error state
  if (error || enrollmentsError) {
    return (
      <div className="student-dashboard">
        <div className="error-container" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          color: '#ff4757'
        }}>
          <h2>Error Loading Dashboard</h2>
          <p>{error || enrollmentsError?.message || 'An error occurred'}</p>
          <button onClick={() => window.location.reload()} style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No profile data
  if (!studentProfile) {
    return (
      <div className="student-dashboard">
        <div className="no-data-container" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}>
          No student profile found
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <div className="dashboard-sidebar">
        <div className="sidebar-profile">
          <div className="profile-avatar">
            <img src={studentProfile.avatar} alt="Profile" />
          </div>
          <h3>{studentProfile.name}</h3>
          <p>{studentProfile.email}</p>
        </div>
        
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="nav-icon">📊</span>
            Overview
          </button>

          {activeRole === 'student' && (
            <>
              <button
                className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`}
                onClick={() => setActiveTab('courses')}
              >
                <span className="nav-icon">📚</span>
                Courses
              </button>
              <button
                className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
                onClick={() => setActiveTab('tasks')}
              >
                <span className="nav-icon">📝</span>
                Tasks
              </button>
              <button
                className={`nav-item ${activeTab === 'sessions' ? 'active' : ''}`}
                onClick={() => setActiveTab('sessions')}
              >
                <span className="nav-icon">🎥</span>
                Zoom Sessions
              </button>
            </>
          )}

          {activeRole === 'tutor' && (
            <>
              <button
                className={`nav-item ${activeTab === 'timeslots' ? 'active' : ''}`}
                onClick={() => setActiveTab('timeslots')}
              >
                <span className="nav-icon">🕒</span>
                Timeslots
              </button>
              <button
                className={`nav-item ${activeTab === 'tutor-sessions' ? 'active' : ''}`}
                onClick={() => setActiveTab('tutor-sessions')}
              >
                <span className="nav-icon">🎥</span>
                Sessions
              </button>
              <button
                className={`nav-item ${activeTab === 'qualifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('qualifications')}
              >
                <span className="nav-icon">🏆</span>
                Qualifications
              </button>
            </>
          )}

          <button
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="nav-icon">👤</span>
            Profile
          </button>
        </nav>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <div className="header-left">
            <h1>
              Welcome back, {(studentProfile.name || '').split(' ')[0] || 'Student'}!
              {activeRole === 'tutor' && <span className="role-indicator"> (Tutor Mode)</span>}
            </h1>
            <p className="dashboard-date">Today is {formatDate(new Date())}</p>
          </div>
          <div className="header-right">
            <RoleSwitcher />
{/* Temporarily disabled - Request Guardian button
            <button
              className="request-guardian-btn"
              onClick={() => setShowRequestGuardianModal(true)}
              title="Request a guardian to manage your courses"
            >
              👤 Request Guardian
            </button>
            */}
            <button
              className={`refresh-btn ${isRefreshing ? 'loading' : ''}`}
              onClick={triggerRefresh}
              disabled={isRefreshing}
              title="Refresh dashboard data"
            >
              {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
            </button>
            <button className="header-logout-btn" onClick={handleLogout}>
              <span className="nav-icon">🚪</span>
              Logout
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="overview-section">
            {activeRole === 'tutor' ? (
              // Tutor Stats Overview (replaces student overview in tutor mode)
              <div className="tutor-overview">
                {tutorStatsLoading ? (
                  <div className="loading-message">Loading tutor stats...</div>
                ) : (
                  <>
                    {/* Dashboard Stats - Matching regular tutor dashboard structure */}
                    <div className="dual-role-tutor-dashboard-stats">
                      <div className="dual-role-tutor-stat-item">
                        <h4>Rating</h4>
                        <p className="dual-role-tutor-stat-value">⭐ {currentUser?.rating || 0}/5.0</p>
                      </div>
                      <div className="dual-role-tutor-stat-item">
                        <h4>Total Sessions</h4>
                        <p className="dual-role-tutor-stat-value">{currentUser?.totalSessions || 0}</p>
                      </div>
                      <div className="dual-role-tutor-stat-item">
                        <h4>Subjects</h4>
                        <p className="dual-role-tutor-stat-value">{(currentUser?.subjects || []).join(', ')}</p>
                      </div>
                    </div>

                    {/* Earnings Overview - Complete 5-card structure matching regular tutor dashboard */}
                    <div className="dual-role-tutor-earnings-overview">
                      <div className="dual-role-tutor-earnings-card">
                        <div className="dual-role-tutor-earnings-icon">💰</div>
                        <div className="dual-role-tutor-earnings-info">
                          <h3>Total Earnings</h3>
                          <p className="dual-role-tutor-amount">£{(tutorStats.earnings.totalEarnings || 0).toFixed(2)}</p>
                          <p className="dual-role-tutor-earnings-detail">
                            {tutorStats.earnings.total?.totalHours || 0} hours taught
                          </p>
                        </div>
                      </div>

                      <div className="dual-role-tutor-earnings-card">
                        <div className="dual-role-tutor-earnings-icon">📈</div>
                        <div className="dual-role-tutor-earnings-info">
                          <h3>This Month</h3>
                          <p className="dual-role-tutor-amount">£{(tutorStats.earnings.thisMonth || 0).toFixed(2)}</p>
                          <p className="dual-role-tutor-earnings-detail">
                            {tutorStats.earnings.monthly?.monthName || 'Current month'}
                          </p>
                        </div>
                      </div>

                      <div className="dual-role-tutor-earnings-card">
                        <div className="dual-role-tutor-earnings-icon">⚡</div>
                        <div className="dual-role-tutor-earnings-info">
                          <h3>This Week (Actual)</h3>
                          <p className="dual-role-tutor-amount">£{(tutorStats.earnings.actualWeekly?.actualEarnings || 0).toFixed(2)}</p>
                          <p className="dual-role-tutor-earnings-detail">
                            {tutorStats.earnings.actualWeekly?.totalSessions || 0} sessions completed
                          </p>
                        </div>
                      </div>

                      <div className="dual-role-tutor-earnings-card">
                        <div className="dual-role-tutor-earnings-icon">🎯</div>
                        <div className="dual-role-tutor-earnings-info">
                          <h3>This Week (Potential)</h3>
                          <p className="dual-role-tutor-amount">£{(tutorStats.earnings.potentialWeekly?.potentialEarnings || 0).toFixed(2)}</p>
                          <p className="dual-role-tutor-earnings-detail">
                            {(tutorStats.earnings.potentialWeekly?.totalHours || 0).toFixed(1)} hours available
                          </p>
                        </div>
                      </div>

                      {tutorStats.earnings.efficiency?.rate && (
                        <div className="dual-role-tutor-earnings-card dual-role-tutor-efficiency">
                          <div className="dual-role-tutor-earnings-icon">📊</div>
                          <div className="dual-role-tutor-earnings-info">
                            <h3>Efficiency</h3>
                            <p className="dual-role-tutor-amount">{tutorStats.earnings.efficiency.rate}%</p>
                            <p className="dual-role-tutor-earnings-detail">Potential to actual ratio</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Upcoming Sessions Section - Matching regular tutor dashboard */}
                    {tutorStats.earnings.upcoming?.upcomingSessions?.length > 0 && (
                      <div className="dual-role-tutor-upcoming-sessions-section">
                        <h3>Upcoming Sessions This Week ({tutorStats.earnings.upcoming.totalSessions})</h3>
                        <div className="dual-role-tutor-upcoming-sessions-grid">
                          {tutorStats.earnings.upcoming.upcomingSessions.map((session, index) => (
                            <div key={session.id || index} className="dual-role-tutor-upcoming-session-card">
                              <div className="dual-role-tutor-session-header">
                                <div className="dual-role-tutor-session-icon">📅</div>
                                <div className="dual-role-tutor-session-title">{session.title || session.courseTitle}</div>
                              </div>
                              <div className="dual-role-tutor-session-details">
                                <p className="dual-role-tutor-session-date">
                                  {new Date(session.date).toLocaleDateString('en-GB', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </p>
                                <p className="dual-role-tutor-session-time">
                                  {session.startTime} - {session.endTime}
                                </p>
                                <p className="dual-role-tutor-session-students">
                                  👥 {session.enrolledStudents}/{session.maxStudents} students
                                </p>
                                <p className="dual-role-tutor-session-status">
                                  <span className={`dual-role-tutor-status-badge ${session.status}`}>
                                    {session.status === 'scheduled' ? '⏱️ Scheduled' : '✅ Confirmed'}
                                  </span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Availability Stats - Enhanced 5-card structure matching regular tutor dashboard */}
                    <div className="dual-role-tutor-availability-stats">
                      <div className="dual-role-tutor-stat-card dual-role-tutor-total-slots">
                        <div className="dual-role-tutor-stat-header">
                          <div className="dual-role-tutor-stat-icon">📊</div>
                          <h3>Total Slots</h3>
                        </div>
                        <div className="dual-role-tutor-stat-value">{tutorStats.availabilityStats.totalSlots || 0}</div>
                        <div className="dual-role-tutor-stat-trend">
                          {tutorStats.availabilityStats.recurringSlots > 0 && `${tutorStats.availabilityStats.recurringSlots} recurring`}
                          {tutorStats.availabilityStats.recurringSlots === 0 && 'Active time slots'}
                        </div>
                      </div>

                      <div className="dual-role-tutor-stat-card dual-role-tutor-utilization">
                        <div className="dual-role-tutor-stat-header">
                          <div className="dual-role-tutor-stat-icon">📈</div>
                          <h3>Utilization</h3>
                        </div>
                        <div className="dual-role-tutor-stat-value">
                          {tutorStats.availabilityStats.utilizationRate || 0}%
                        </div>
                        <div className="dual-role-tutor-stat-trend">
                          {tutorStats.availabilityStats.bookedSlots || 0}/{tutorStats.availabilityStats.totalSlots || 0} booked
                        </div>
                      </div>

                      <div className="dual-role-tutor-stat-card dual-role-tutor-weekly-hours">
                        <div className="dual-role-tutor-stat-header">
                          <div className="dual-role-tutor-stat-icon">⏰</div>
                          <h3>This Week</h3>
                        </div>
                        <div className="dual-role-tutor-stat-value">{tutorStats.availabilityStats.weeklyHours || 0}h</div>
                        <div className="dual-role-tutor-stat-trend">Available hours</div>
                      </div>

                      <div className="dual-role-tutor-stat-card dual-role-tutor-earnings">
                        <div className="dual-role-tutor-stat-header">
                          <div className="dual-role-tutor-stat-icon">💰</div>
                          <h3>Potential</h3>
                        </div>
                        <div className="dual-role-tutor-stat-value">£{(tutorStats.availabilityStats.estimatedWeeklyEarnings || 0).toFixed(2)}</div>
                        <div className="dual-role-tutor-stat-trend">Weekly estimate</div>
                      </div>

                      <div className="dual-role-tutor-stat-card dual-role-tutor-completion-rate">
                        <div className="dual-role-tutor-stat-header">
                          <div className="dual-role-tutor-stat-icon">✅</div>
                          <h3>Completion</h3>
                        </div>
                        <div className="dual-role-tutor-stat-value">{tutorStats.availabilityStats.completionRate || 0}%</div>
                        <div className="dual-role-tutor-stat-trend">Session success rate</div>
                      </div>
                    </div>

                    {/* Cash Out Actions - Matching regular tutor dashboard */}
                    <div className="dual-role-tutor-earnings-actions">
                      <button
                        className="dual-role-tutor-cash-earnings-btn"
                        onClick={() => alert('Cash out request initiated!')}
                      >
                        💳 Cash Out Earnings
                      </button>
                      <div className="dual-role-tutor-earnings-note">
                        <p>💡 Check your profile for minimum cash out requirements and processing times</p>
                      </div>
                    </div>

                    {/* Insights Panel - With unique dual-role class names */}
                    {(tutorStats.availabilityStats.totalSlots > 0 || tutorStats.sessionHistory.length > 0) && (
                      <div className="dual-role-tutor-availability-insights">
                        <h3 className="dual-role-tutor-insights-title">📈 Teaching Insights</h3>
                        <div className="dual-role-tutor-insights-grid">
                          <div className="dual-role-tutor-insight-item">
                            <div className="dual-role-tutor-insight-icon">📚</div>
                            <div className="dual-role-tutor-insight-content">
                              <h4>Course Variety</h4>
                              <p>{tutorStats.availabilityStats.courseTypes} different course{tutorStats.availabilityStats.courseTypes !== 1 ? 's' : ''}</p>
                            </div>
                          </div>

                          <div className="dual-role-tutor-insight-item">
                            <div className="dual-role-tutor-insight-icon">📅</div>
                            <div className="dual-role-tutor-insight-content">
                              <h4>Most Active Day</h4>
                              <p>{tutorStats.availabilityStats.mostActiveDay || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="dual-role-tutor-insight-item">
                            <div className="dual-role-tutor-insight-icon">🕐</div>
                            <div className="dual-role-tutor-insight-content">
                              <h4>Popular Hour</h4>
                              <p>{tutorStats.availabilityStats.mostActiveHour || 'N/A'}</p>
                            </div>
                          </div>

                          <div className="dual-role-tutor-insight-item">
                            <div className="dual-role-tutor-insight-icon">👥</div>
                            <div className="dual-role-tutor-insight-content">
                              <h4>Total Sessions</h4>
                              <p>{tutorStats.sessionHistory.length || 0} completed</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              // Student Overview (original content)
              <div className="student-overview">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">🎓</div>
                    <div className="stat-info">
                      <h3>{studentProfile.completedCourses || 0}</h3>
                      <p>Completed Courses</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📖</div>
                    <div className="stat-info">
                      <h3>{enrolledCourses.length || 0}</h3>
                      <p>Ongoing Courses</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">⭐</div>
                    <div className="stat-info">
                      <h3>{studentProfile.totalCredits || 0}</h3>
                      <p>Total Credits</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div className="stat-info">
                      <h3>{studentProfile.level || 'Beginner'}</h3>
                      <p>Current Level</p>
                    </div>
                  </div>
                </div>

                <div className="overview-grid">
                  <div className="overview-card">
                    <h2>Recent Courses</h2>
                    <div className="recent-courses">
                      {enrolledCourses.slice(0, 3).map(course => (
                        <div key={course.id} className="mini-course-card" onClick={() => handleRecentCourseClick(course)}>
                          <div className="course-progress-bar">
                            <div className="progress-fill" style={{width: `${course.progress}%`}}></div>
                          </div>
                          <h4>{course.title}</h4>
                          <p>{course.progress}% Complete</p>
                          <div className="course-details">
                            <span className="instructor-name">with {course.instructor}</span>
                            <span className="modules-progress">{course.completedModules}/{course.modules} modules</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overview-card">
                    <h2>Upcoming Tasks</h2>
                    <div className="task-list-mini">
                      {upcomingTasks.slice(0, 4).map(task => (
                        <div
                          key={task.id}
                          className="mini-task clickable-task"
                          onClick={() => handleTaskClick(task)}
                          title={`${task.taskType || task.type} - Click to open`}
                        >
                          <span className="task-icon">{getTaskIcon(task.type)}</span>
                          <div className="mini-task-info">
                            <p className="task-name">{task.name}</p>
                            <p className="task-course-mini">{task.course}</p>
                          </div>
                          <span className="task-time-mini">{getTimeRemaining(task.dueDate)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overview-card">
                    <h2>Next Zoom Session</h2>
                    {upcomingZoomSessions.length > 0 ? (
                      <div className="next-session-card">
                        <div className="session-time">
                          <span className="session-date">{formatDate(upcomingZoomSessions[0].date || new Date())}</span>
                          <span className="session-hour">{formatTime(upcomingZoomSessions[0].date || new Date())}</span>
                        </div>
                        <div className="session-details">
                          <h4>{upcomingZoomSessions[0].topic || 'Upcoming Session'}</h4>
                          <p>{upcomingZoomSessions[0].course || 'Course Session'}</p>
                          <p className="session-instructor">with {upcomingZoomSessions[0].tutorName || upcomingZoomSessions[0].instructor || 'Instructor'}</p>
                        </div>
                        <button className="join-session-btn" onClick={() => handleJoinZoom(upcomingZoomSessions[0].zoomLink || '#')}>
                          Join Session
                        </button>
                      </div>
                    ) : (
                      <div className="no-sessions-message">
                        <p>No upcoming sessions scheduled</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="courses-section">
            <div className="courses-header">
              <h2>Courses for {studentProfile.gradeLevel || 'Your Grade Level'}</h2>
              {studentProfile.gradeLevel && (
                <p className="courses-description">
                  Discover courses designed for {studentProfile.gradeLevel} students
                </p>
              )}
            </div>
            
            {coursesLoading ? (
              <div className="courses-loading">
                <p>Loading courses...</p>
              </div>
            ) : availableCourses.length > 0 ? (
              <div className="courses-container">
                {/* Enrolled Courses Section */}
                {availableCourses.filter(course => course.isEnrolled).length > 0 && (
                  <div className="enrolled-courses-section">
                    <h3 className="section-title">📚 Your Enrolled Courses</h3>
                    <div className="courses-grid">
                      {availableCourses.filter(course => course.isEnrolled).map(course => (
                        <div key={course.id} className="course-card enrolled">
                          <div 
                            className="course-content" 
                            onClick={() => handleContinueCourse(course.id)}
                            style={{ cursor: 'pointer' }}
                          >
                            <div className="course-thumbnail">
                              <img src={course.thumbnail} alt={course.title} />
                              {course.progress > 0 && (
                                <div className="course-progress-overlay">
                                  <span>{course.progress}%</span>
                                </div>
                              )}
                            </div>
                            <div className="course-info">
                              <h3>{course.title}</h3>
                              <p className="course-description">{course.description}</p>
                              <div className="course-stats">
                                <span className="course-modules">
                                  {course.totalModules} Modules
                                </span>
                                <span className="course-level">
                                  Level: {course.level}
                                </span>
                              </div>
                              <div className="course-meta">
                                <span className="course-subject">{course.subject}</span>
                                <span className="course-duration">{course.duration}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="course-actions">
                            <div className="enrolled-actions">
                              {course.progress > 0 && (
                                <div className="progress-bar">
                                  <div className="progress-fill" style={{width: `${course.progress}%`}}></div>
                                  <span className="progress-text">{course.progress}% Complete</span>
                                </div>
                              )}
                              <button 
                                className="btn continue-btn"
                                onClick={() => handleContinueCourse(course.id)}
                              >
                                Continue Learning
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Courses Section */}
                {availableCourses.filter(course => !course.isEnrolled).length > 0 && (
                  <div className="available-courses-section">
                    <h3 className="section-title">🎯 Available Courses for {studentProfile.gradeLevel}</h3>
                    <div className="courses-grid">
                      {availableCourses.filter(course => !course.isEnrolled).map(course => (
                        <div key={course.id} className="course-card available">
                          <div className="course-content">
                            <div className="course-thumbnail">
                              <img src={course.thumbnail} alt={course.title} />
                              <div className="course-price-overlay">
                                <span>{course.currency} {course.price}</span>
                              </div>
                            </div>
                            <div className="course-info">
                              <h3>{course.title}</h3>
                              <p className="course-description">{course.description}</p>
                              <div className="course-stats">
                                <span className="course-modules">
                                  {course.totalModules} Modules
                                </span>
                                <span className="course-level">
                                  Level: {course.level}
                                </span>
                              </div>
                              <div className="course-meta">
                                <span className="course-subject">{course.subject}</span>
                                <span className="course-duration">{course.duration}</span>
                              </div>
                              {course.enrolledStudents > 0 && (
                                <div className="course-enrollment">
                                  <span className="enrolled-count">{course.enrolledStudents} students enrolled</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="course-actions">
                            <button 
                              className={`btn ${course.isEnrolled ? 'continue-btn' : 'enroll-btn'}`}
                              onClick={() => course.isEnrolled 
                                ? handleContinueCourse(course.id) 
                                : handleEnrollInCourse(course.id, course.title)
                              }
                            >
                              {course.isEnrolled ? 'Continue' : 'Enroll Now'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : studentProfile.gradeLevel ? (
              <div className="no-courses-message">
                <h3>No courses available for {studentProfile.gradeLevel}</h3>
                <p>Please check back later or contact support for more course options.</p>
              </div>
            ) : (
              <div className="no-grade-level-message">
                <h3>Set Your Grade Level</h3>
                <p>Please update your profile with your grade level to see relevant courses.</p>
                <button 
                  className="update-profile-btn"
                  onClick={() => setShowEditProfileModal(true)}
                >
                  Update Profile
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="tasks-section">
            <h2>Upcoming Tasks</h2>
            <UpcomingTasks tasksData={upcomingTasks} />
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="sessions-section">
            <h2>Available Sessions for Your Enrolled Courses</h2>
            {console.log('🔍 DEBUG: upcomingZoomSessions:', upcomingZoomSessions)}
            {console.log('🔍 DEBUG: availableCourses (enrolled):', availableCourses.filter(course => course.isEnrolled))}
            <div className="sessions-grid">
              {upcomingZoomSessions.length > 0 ? (
                upcomingZoomSessions.map(session => (
                    <div key={session.id} className="scd-session-card">
                      <div className="session-datetime">
                        <div className="session-date-block">
                          <span className="date-day">{new Date(session.date).getDate()}</span>
                          <span className="date-month">
                            {new Date(session.date).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                        </div>
                        <div className="session-time-block">
                          <span className="time">{formatTime(session.date)}</span>
                          <span className="duration">{session.duration || '60 min'}</span>
                        </div>
                      </div>
                      <div className="session-content">
                        <h3>{session.topic || 'Session'}</h3>
                        <p className="session-course">{session.course || 'Course'}</p>
                        <p className="session-instructor">Instructor: {session.tutorName || session.instructor || 'TBD'}</p>
                        {session.meetingId && <p className="meeting-id">Meeting ID: {session.meetingId}</p>}
                      </div>
                      <div className="session-actions">
                        <button
                          className="join-zoom-btn"
                          onClick={() => handleJoinZoom(session.zoomLink)}
                        >
                          Join Session
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="no-sessions-message">
                  <h3>No sessions available</h3>
                  <p>No upcoming sessions found for your enrolled courses. Check back later or contact your instructor.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-section">
            <h2>Student Profile</h2>
            <div className="profile-container">
              <div className="profile-header">
                <div className="profile-avatar-large">
                  <img src={studentProfile.avatar} alt="Profile" />
                  <button className="change-avatar-btn">Change Photo</button>
                </div>
                <div className="profile-basic-info">
                  <h2>{studentProfile.name}</h2>
                  <p className="student-id">Student ID: {studentProfile.studentId}</p>
                  <p className="enrollment-date">Enrolled since {studentProfile.enrollmentDate}</p>
                </div>
              </div>
              
              <div className="profile-details">
                <div className="detail-section">
                  <h3>Contact Information</h3>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{studentProfile.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">+1 234 567 8900</span>
                  </div>
                </div>
                
                <div className="detail-section">
                  <h3>Academic Information</h3>
                  <div className="detail-row">
                    <span className="detail-label">Academic Country:</span>
                    <span className="detail-value">{studentProfile.academicCountry || 'Not specified'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Grade Level:</span>
                    <span className="detail-value">{studentProfile.gradeLevel || 'Not specified'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Current Level:</span>
                    <span className="detail-value">{studentProfile.level}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Total Credits:</span>
                    <span className="detail-value">{studentProfile.totalCredits}</span>
                  </div>
                </div>
                
                <div className="profile-actions">
                  <button 
                    className="profile-btn"
                    onClick={() => setShowEditProfileModal(true)}
                  >
                    Edit Profile
                  </button>
                  <button 
                    className="profile-btn"
                    onClick={() => setShowChangePasswordModal(true)}
                  >
                    Change Password
                  </button>
                  <button className="profile-btn">Notification Settings</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tutor Sections */}
        {activeTab === 'timeslots' && activeRole === 'tutor' && (
          <div className="tutor-section">
            <TimeslotManagement />
          </div>
        )}

        {activeTab === 'tutor-sessions' && activeRole === 'tutor' && (
          <div className="tutor-section">
            <SessionOverview />
          </div>
        )}

        {activeTab === 'qualifications' && activeRole === 'tutor' && (
          <div className="tutor-section">
            <TutorQualificationInfo />
          </div>
        )}
      </div>

      <ChangePasswordModal
        key={showChangePasswordModal ? 'change-password-open' : 'change-password-closed'}
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSubmit={handleChangePassword}
        loading={changePasswordLoading}
      />

      <EditProfileModal
        key={showEditProfileModal ? 'edit-profile-open' : 'edit-profile-closed'}
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        onSubmit={handleEditProfile}
        loading={editProfileLoading}
        currentProfile={currentUser}
      />

      <RequestGuardianModal
        isOpen={showRequestGuardianModal}
        onClose={() => setShowRequestGuardianModal(false)}
        onRequestSent={handleGuardianRequestSent}
      />
    </div>
  );
};

export default StudentDashboard;