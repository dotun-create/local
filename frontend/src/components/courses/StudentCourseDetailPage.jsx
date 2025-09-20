import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import CourseChat from '../chat/CourseChat';
import SessionCapacityIndicator from './SessionCapacityIndicator';
import SessionCapacityBadge from './SessionCapacityBadge';
import './css/StudentCourseDetailPage.css';

const StudentCourseDetailPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [course, setCourse] = useState({});
  const [modules, setModules] = useState([]);
  const [allLessons, setAllLessons] = useState({}); // Store lessons by moduleId
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Navigation state
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  
  // UI state
  const [chatEnabled, setChatEnabled] = useState(false);
  const [studentProgress, setStudentProgress] = useState({});
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [expandedLessons, setExpandedLessons] = useState(new Set());
  const [expandedCategories, setExpandedCategories] = useState(new Set()); // Track expanded categories
  const [activeCategory, setActiveCategory] = useState(null); // 'sessions', 'booked-sessions', 'quiz'
  const [activeCategoryData, setActiveCategoryData] = useState({ moduleId: null, lessonId: null, category: null });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState({});
  
  // Current user
  const [currentUser, setCurrentUser] = useState(null);

  // Load current user from session storage
  useEffect(() => {
    try {
      const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  }, []);

  // Load course data
  useEffect(() => {
    const loadCourseData = async () => {
      if (!courseId) return;
      
      try {
        setLoading(true);
        
        // Load course details
        const courseResponse = await API.courses.getCourseById(courseId);
        setCourse(courseResponse);
        
        // Load modules
        const modulesResponse = await API.courses.getCourseModules(courseId);
        // Handle different response formats
        const modulesData = Array.isArray(modulesResponse) ? modulesResponse : (modulesResponse?.modules || modulesResponse?.data || []);
        setModules(modulesData);
        
        // Load lessons for all modules
        const lessonsMap = {};
        if (Array.isArray(modulesData)) {
          for (const module of modulesData) {
            try {
              const lessonsResponse = await API.modules.getModuleLessons(module.id);
              const lessonsData = Array.isArray(lessonsResponse) ? lessonsResponse : (lessonsResponse?.lessons || lessonsResponse?.data || []);
              lessonsMap[module.id] = lessonsData;
            } catch (error) {
              console.error(`Error loading lessons for module ${module.id}:`, error);
              lessonsMap[module.id] = [];
            }
          }
        }
        setAllLessons(lessonsMap);
        
        // Load student progress if available
        if (currentUser?.id) {
          try {
            // Try to get enrollment info which may contain progress
            const enrollmentResponse = await API.enrollments.getEnrollments({ courseId });
            if (enrollmentResponse && enrollmentResponse.length > 0) {
              const enrollment = enrollmentResponse[0];
              if (enrollment.progress) {
                setStudentProgress(enrollment.progress);
              }
            }
          } catch (progressError) {
            console.log('No progress data available yet');
          }
        }
        
        // Auto-select first module if none selected
        if (Array.isArray(modulesData) && modulesData.length > 0 && !activeModuleId) {
          setActiveModuleId(modulesData[0].id);
          // Auto-expand first module
          setExpandedModules(new Set([modulesData[0].id]));
          
          // Auto-select first lesson of first module
          const firstModuleLessons = lessonsMap[modulesData[0].id];
          if (firstModuleLessons && firstModuleLessons.length > 0) {
            setActiveLessonId(firstModuleLessons[0].id);
            setSelectedLesson(firstModuleLessons[0]);
          }
        }
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId, currentUser?.id, activeModuleId]);


  // Load sessions when lesson is selected
  useEffect(() => {
    const loadSessions = async () => {
      if (!activeLessonId) return;

      try {
        const sessionsResponse = await API.lessons.getLessonSessions(activeLessonId);
        // Handle different response formats
        const sessionsData = Array.isArray(sessionsResponse) ? sessionsResponse : (sessionsResponse?.sessions || sessionsResponse?.data || []);
        setSessions(sessionsData);

        // Auto-detect and set the appropriate category if not manually set
        if (sessionsData.length > 0 && (!activeCategory || activeCategory === 'sessions' || activeCategory === 'booked-sessions')) {
          const detectedCategory = autoDetectCategory(sessionsData, activeLessonId);
          setActiveCategory(detectedCategory);
          setActiveCategoryData(prev => ({ ...prev, category: detectedCategory }));
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
        setSessions([]);
      }
    };

    loadSessions();
  }, [activeLessonId, courseId]);


  // Handlers
  const handleModuleToggle = (moduleId) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleModuleClick = (moduleId) => {
    setActiveModuleId(moduleId);
    // Auto-expand module when clicked
    const newExpanded = new Set(expandedModules);
    newExpanded.add(moduleId);
    setExpandedModules(newExpanded);
    
    // Clear lesson selection when switching modules
    setActiveLessonId(null);
    setSelectedLesson(null);
    setSessions([]);
  };

  const handleLessonToggle = (lessonId) => {
    const newExpanded = new Set(expandedLessons);
    if (newExpanded.has(lessonId)) {
      newExpanded.delete(lessonId);
    } else {
      newExpanded.add(lessonId);
    }
    setExpandedLessons(newExpanded);
  };

  const handleLessonClick = (lessonId, moduleId) => {
    setActiveLessonId(lessonId);
    setActiveModuleId(moduleId);
    
    // Auto-expand lesson when clicked
    const newExpanded = new Set(expandedLessons);
    newExpanded.add(lessonId);
    setExpandedLessons(newExpanded);
    
    // Find the lesson from allLessons
    const moduleLessons = allLessons[moduleId] || [];
    const lesson = moduleLessons.find(l => l.id === lessonId);
    setSelectedLesson(lesson);
    
    // Clear category selection
    setActiveCategory(null);
    setActiveCategoryData({ moduleId: null, lessonId: null, category: null });
  };

  const handleCategoryToggle = (categoryKey) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategoryClick = (category, moduleId, lessonId) => {
    setActiveCategory(category);
    setActiveCategoryData({ moduleId, lessonId, category });
    setActiveModuleId(moduleId);
    setActiveLessonId(lessonId);

    // Find the lesson for context
    const moduleLessons = allLessons[moduleId] || [];
    const lesson = moduleLessons.find(l => l.id === lessonId);
    setSelectedLesson(lesson);
  };

  const handleTakeQuiz = async (moduleId, lessonId) => {
    try {
      // Try to get quizzes for this specific lesson
      const response = await API.quizzes.getLessonQuizzes(lessonId);
      
      if (response.quizzes && response.quizzes.length > 0) {
        // Navigate to the first available quiz
        const quiz = response.quizzes[0];
        navigate(`/courses/${courseId}/modules/${moduleId}/quizzes/${quiz.id}`);
      } else {
        // Fallback: Check for module-level quizzes
        const moduleQuizzes = await API.quizzes.getQuizzes(moduleId);
        
        if (moduleQuizzes && moduleQuizzes.length > 0) {
          // Show a selection modal or navigate to first quiz
          const quiz = moduleQuizzes[0];
          navigate(`/courses/${courseId}/modules/${moduleId}/quizzes/${quiz.id}`);
        } else {
          alert('No quiz available for this lesson yet. Please check back later.');
        }
      }
    } catch (error) {
      console.error('Failed to load quiz:', error);
      alert('Failed to load quiz. Please try again.');
    }
  };

  const handleBookSession = async (sessionId, lessonId) => {
    if (!currentUser?.id) {
      alert('Please log in to book sessions.');
      return;
    }

    setBookingLoading(true);

    try {
      // Call API to book the session
      await API.lessons.bookSession(sessionId, currentUser.id);

      // Refresh sessions data to get updated enrollment status
      if (activeLessonId) {
        try {
          const sessionsResponse = await API.lessons.getLessonSessions(activeLessonId);
          const sessionsData = Array.isArray(sessionsResponse) ? sessionsResponse : (sessionsResponse?.sessions || sessionsResponse?.data || []);
          setSessions(sessionsData);

          // Auto-detect if we should switch to booked sessions view
          const hasEnrolledSessions = sessionsData.some(s => s.isCurrentStudentEnrolled);
          if (hasEnrolledSessions && activeCategory === 'sessions') {
            setActiveCategory('booked-sessions');
            setActiveCategoryData(prev => ({ ...prev, category: 'booked-sessions' }));
          }
        } catch (refreshError) {
          console.error('Error refreshing sessions:', refreshError);
        }
      }

      alert('Session booked successfully!');
    } catch (error) {
      console.error('Error booking session:', error);
      alert('Failed to book session. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle session cancellation/unbooking
  const handleCancelSession = async (sessionId, lessonId) => {
    if (!currentUser?.id) {
      alert('Please log in to cancel bookings.');
      return;
    }

    setCancelLoading(prev => ({ ...prev, [sessionId]: true }));

    try {
      // Call API to cancel the session booking
      await API.lessons.cancelBooking(sessionId, currentUser.id);

      // Refresh sessions data to get updated enrollment status
      if (activeLessonId) {
        try {
          const sessionsResponse = await API.lessons.getLessonSessions(activeLessonId);
          const sessionsData = Array.isArray(sessionsResponse) ? sessionsResponse : (sessionsResponse?.sessions || sessionsResponse?.data || []);
          setSessions(sessionsData);

          // Auto-detect if we should switch back to regular sessions view
          const hasEnrolledSessions = sessionsData.some(s => s.isCurrentStudentEnrolled);
          if (!hasEnrolledSessions && activeCategory === 'booked-sessions') {
            setActiveCategory('sessions');
            setActiveCategoryData(prev => ({ ...prev, category: 'sessions' }));
          }
        } catch (refreshError) {
          console.error('Error refreshing sessions:', refreshError);
        }
      }

      alert('Session booking cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling session:', error);
      alert('Failed to cancel session. Please try again.');
    } finally {
      setCancelLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  // Helper function to check if lesson has booked sessions using server data
  const hasBookedSessions = (lessonId) => {
    // Check if any sessions for this lesson show current student as enrolled
    return sessions.some(session =>
      session.lessonId === lessonId && session.isCurrentStudentEnrolled
    );
  };

  // Auto-detect appropriate category based on session enrollment data
  const autoDetectCategory = (sessionsData, currentLessonId) => {
    if (!sessionsData || !currentLessonId) return 'sessions';

    const enrolledSessions = sessionsData.filter(s => s.isCurrentStudentEnrolled);
    const availableSessions = sessionsData.filter(s => !s.isCurrentStudentEnrolled);

    // If student has enrolled sessions, prioritize showing them
    if (enrolledSessions.length > 0) {
      return 'booked-sessions';
    }

    // Otherwise show available sessions
    return 'sessions';
  };

  // Get filtered sessions based on current category
  const getFilteredSessions = () => {
    if (!sessions) return [];

    switch (activeCategory) {
      case 'sessions':
        // Show only available sessions (exclude enrolled sessions)
        return sessions.filter(session => !isSessionInPast(session) && !session.isCurrentStudentEnrolled);
      case 'booked-sessions':
        // Show only enrolled sessions
        return sessions.filter(session => session.isCurrentStudentEnrolled);
      default:
        return sessions;
    }
  };

  // Get children for a specific category in the tree
  const getCategoryChildren = (categoryType, lessonId) => {
    const lessonSessions = sessions.filter(s => s.lessonId === lessonId || activeLessonId === lessonId);

    switch (categoryType) {
      case 'sessions':
        return lessonSessions.filter(session => !isSessionInPast(session) && !session.isCurrentStudentEnrolled);
      case 'booked-sessions':
        return lessonSessions.filter(session => session.isCurrentStudentEnrolled);
      case 'quiz':
        // For now, return a placeholder quiz item
        return [{
          id: `quiz-${lessonId}`,
          title: 'Lesson Quiz',
          type: 'quiz',
          status: studentProgress[lessonId]?.quiz_completed ? 'completed' : 'not-started'
        }];
      default:
        return [];
    }
  };

  // Get count of children for category display
  const getCategoryChildCount = (categoryType, lessonId) => {
    return getCategoryChildren(categoryType, lessonId).length;
  };

  // Render child item component
  const renderChildItem = (child, categoryType) => {
    if (child.type === 'quiz') {
      return (
        <div key={child.id} className="scd-tree-child-item scd-quiz-child">
          <span className="scd-child-icon">📝</span>
          <span className="scd-child-title">{child.title}</span>
          <span className={`scd-child-status scd-${child.status}`}>
            {child.status === 'completed' ? '✅ Completed' : '⏳ Not Started'}
          </span>
        </div>
      );
    } else {
      // Session child item
      return (
        <div key={child.id} className="scd-tree-child-item scd-session-child">
          <span className="scd-child-icon">📄</span>
          <span className="scd-child-title">{child.title || 'Study Session'}</span>
          <span className="scd-child-time">
            {child.scheduled_date ? formatSessionDate(child, 'time') : 'TBD'}
          </span>
          <span className={`scd-child-status scd-${child.isCurrentStudentEnrolled ? 'enrolled' : 'available'}`}>
            {child.isCurrentStudentEnrolled ? '✅' : `${child.enrollmentCount || 0}/${child.maxStudents || 5}`}
          </span>
        </div>
      );
    }
  };

  // Helper function to check if a session is in the past
  const isSessionInPast = (session) => {
    const sessionDate = formatSessionDate(session, 'date');
    if (typeof sessionDate === 'string') return false; // If date parsing failed, don't exclude
    
    const now = new Date();
    return sessionDate < now;
  };

  // Helper function to safely parse and format dates
  const formatSessionDate = (session, fieldType = 'date') => {
    // Use scheduledDate as primary source (this is what the API sends)
    let dateValue = session?.scheduledDate || session?.scheduled_date;
    
    // Fallback to other possible fields if scheduledDate is not available
    if (!dateValue) {
      dateValue = session?.startTime || session?.start_time || session?.date || session?.createdAt;
    }
    
    if (!dateValue) return 'To be scheduled';
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return 'To be scheduled';
      }
      return date;
    } catch (error) {
      return 'To be scheduled';
    }
  };

  // Helper function to format date for display
  const formatDateString = (session) => {
    const date = formatSessionDate(session, 'date');
    if (typeof date === 'string') return date; // Return error message
    return date.toLocaleDateString();
  };

  // Helper function to format time for display
  const formatTimeString = (session) => {
    const date = formatSessionDate(session, 'time');
    if (typeof date === 'string') return date; // Return error message
    return date.toLocaleTimeString();
  };

  // Get current context for display
  const currentModule = Array.isArray(modules) ? modules.find(m => m.id === activeModuleId) : null;
  const currentLesson = selectedLesson;
  
  // Calculate progress
  const moduleProgress = currentModule ? 
    Math.round((studentProgress[currentModule.id]?.completedLessons || 0) / (allLessons[currentModule.id]?.length || 1) * 100) : 0;

  if (loading) {
    return (
      <div className="scd-student-course-page">
        <div className="scd-loading-container">
          <div className="scd-loading-spinner"></div>
          <p>Loading course...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scd-student-course-page">
        <div className="scd-error-container">
          <h2>Error Loading Course</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="scd-btn scd-btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scd-student-course-page">
      {/* Always-Visible Context Bar */}
      <div className="scd-context-bar">
        <div className="scd-context-content">
          <div className="scd-breadcrumb-section">
            <div className="scd-breadcrumb">
              <span className="scd-course-name">{course.title}</span>
              {currentModule && (
                <>
                  <span className="scd-separator">›</span>
                  <span className="scd-module-name">{currentModule.title}</span>
                </>
              )}
              {currentLesson && (
                <>
                  <span className="scd-separator">›</span>
                  <span className="scd-lesson-name">{currentLesson.title}</span>
                </>
              )}
            </div>
            <div className="scd-context-meta">
              {currentModule && currentLesson && (
                <>
                  <span className="scd-position-indicator">
                    📍 Currently in: Module {Array.isArray(modules) ? modules.findIndex(m => m.id === activeModuleId) + 1 : 'N/A'} - Lesson {currentLesson ? (allLessons[activeModuleId]?.findIndex(l => l.id === activeLessonId) + 1) : 'N/A'}
                  </span>
                  <div className="scd-progress-section">
                    <div className="scd-progress-bar">
                      <div className="scd-progress-fill" style={{ width: `${moduleProgress}%` }}></div>
                    </div>
                    <span className="scd-progress-text">{moduleProgress}% Complete</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="scd-context-actions">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="scd-back-btn"
            >
              ← Dashboard
            </button>
            <button 
              onClick={() => setChatEnabled(!chatEnabled)}
              className={`scd-chat-toggle-btn ${chatEnabled ? 'scd-active' : ''}`}
            >
              💬 Tutor Chat
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="scd-two-column-layout">
        {/* Hierarchical Sidebar */}
        <div className="scd-sidebar-column">
          <div className="scd-sidebar-header">
            <h2>📚 Course Navigation</h2>
            <p className="scd-sidebar-subtitle">Modules, lessons, and activities</p>
          </div>
          
          <div className="scd-hierarchical-tree">
            {Array.isArray(modules) ? modules.map((module, moduleIndex) => {
              const isActiveModule = activeModuleId === module.id;
              const isModuleCompleted = studentProgress[module.id]?.completed;
              const isExpanded = expandedModules.has(module.id);
              const moduleLessons = allLessons[module.id] || [];
              
              return (
                <div key={module.id} className="scd-module-tree-item">
                  <div 
                    className={`scd-module-header-tree ${isActiveModule ? 'scd-active' : ''} ${isModuleCompleted ? 'scd-completed' : ''}`}
                  >
                    <div className="scd-module-main" onClick={() => handleModuleClick(module.id)}>
                      <div className="scd-module-info">
                        <span className="scd-module-number">Module {moduleIndex + 1}</span>
                        <span className="scd-module-title">{module.title}</span>
                      </div>
                      <div className="scd-module-status">
                        {isModuleCompleted ? '✅' : isActiveModule ? '👁️' : '⭕'}
                      </div>
                    </div>
                    <button 
                      className="scd-expand-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleModuleToggle(module.id);
                      }}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                  </div>
                  
                  {isExpanded && moduleLessons.length > 0 && (
                    <div className="scd-lessons-tree">
                      {moduleLessons.map((lesson, lessonIndex) => {
                        const isActiveLesson = activeLessonId === lesson.id;
                        const isLessonCompleted = studentProgress[lesson.id]?.completed;
                        
                        const isLessonExpanded = expandedLessons.has(lesson.id);
                        const hasBooked = hasBookedSessions(lesson.id);
                        
                        return (
                          <div key={lesson.id} className="scd-lesson-tree-item">
                            <div 
                              className={`scd-lesson-header-tree ${isActiveLesson ? 'scd-active' : ''} ${isLessonCompleted ? 'scd-completed' : ''}`}
                            >
                              <div className="scd-lesson-main" onClick={() => handleLessonClick(lesson.id, module.id)}>
                                <div className="scd-lesson-info">
                                  <span className="scd-lesson-number">Lesson {lessonIndex + 1}</span>
                                  <span className="scd-lesson-title">{lesson.title}</span>
                                </div>
                                <div className="scd-lesson-status">
                                  {isLessonCompleted ? '✅' : isActiveLesson ? '👁️' : '⭕'}
                                </div>
                              </div>
                              <button 
                                className="scd-expand-btn scd-lesson-expand-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLessonToggle(lesson.id);
                                }}
                              >
                                {isLessonExpanded ? '▼' : '▶'}
                              </button>
                            </div>
                            
                            {isLessonExpanded && (
                              <div className="scd-categories-tree">
                                {/* Sessions Category */}
                                <div className="scd-category-container">
                                  <div
                                    className={`scd-category-item ${activeCategoryData.lessonId === lesson.id && activeCategory === 'sessions' ? 'scd-active' : ''}`}
                                  >
                                    <div className="scd-category-header">
                                      <button
                                        className="scd-category-expand-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCategoryToggle(`sessions-${lesson.id}`);
                                        }}
                                      >
                                        {expandedCategories.has(`sessions-${lesson.id}`) ? '▼' : '▶'}
                                      </button>
                                      <div
                                        className="scd-category-main"
                                        onClick={() => handleCategoryClick('sessions', module.id, lesson.id)}
                                      >
                                        <span className="scd-category-icon">📅</span>
                                        <span className="scd-category-name">
                                          Sessions ({getCategoryChildCount('sessions', lesson.id)})
                                        </span>
                                      </div>
                                    </div>
                                    {expandedCategories.has(`sessions-${lesson.id}`) && (
                                      <div className="scd-category-children">
                                        {getCategoryChildren('sessions', lesson.id).map(child =>
                                          renderChildItem(child, 'sessions')
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Booked Sessions Category */}
                                {hasBooked && (
                                  <div className="scd-category-container">
                                    <div
                                      className={`scd-category-item ${activeCategoryData.lessonId === lesson.id && activeCategory === 'booked-sessions' ? 'scd-active' : ''}`}
                                    >
                                      <div className="scd-category-header">
                                        <button
                                          className="scd-category-expand-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCategoryToggle(`booked-sessions-${lesson.id}`);
                                          }}
                                        >
                                          {expandedCategories.has(`booked-sessions-${lesson.id}`) ? '▼' : '▶'}
                                        </button>
                                        <div
                                          className="scd-category-main"
                                          onClick={() => handleCategoryClick('booked-sessions', module.id, lesson.id)}
                                        >
                                          <span className="scd-category-icon">📋</span>
                                          <span className="scd-category-name">
                                            Booked Sessions ({getCategoryChildCount('booked-sessions', lesson.id)})
                                          </span>
                                        </div>
                                      </div>
                                      {expandedCategories.has(`booked-sessions-${lesson.id}`) && (
                                        <div className="scd-category-children">
                                          {getCategoryChildren('booked-sessions', lesson.id).map(child =>
                                            renderChildItem(child, 'booked-sessions')
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Quiz Category */}
                                <div className="scd-category-container">
                                  <div
                                    className={`scd-category-item ${activeCategoryData.lessonId === lesson.id && activeCategory === 'quiz' ? 'scd-active' : ''}`}
                                  >
                                    <div className="scd-category-header">
                                      <button
                                        className="scd-category-expand-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCategoryToggle(`quiz-${lesson.id}`);
                                        }}
                                      >
                                        {expandedCategories.has(`quiz-${lesson.id}`) ? '▼' : '▶'}
                                      </button>
                                      <div
                                        className="scd-category-main"
                                        onClick={() => handleCategoryClick('quiz', module.id, lesson.id)}
                                      >
                                        <span className="scd-category-icon">📝</span>
                                        <span className="scd-category-name">
                                          Quiz ({getCategoryChildCount('quiz', lesson.id)})
                                        </span>
                                      </div>
                                    </div>
                                    {expandedCategories.has(`quiz-${lesson.id}`) && (
                                      <div className="scd-category-children">
                                        {getCategoryChildren('quiz', lesson.id).map(child =>
                                          renderChildItem(child, 'quiz')
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }) : <div className="scd-no-modules">No modules available</div>}
          </div>
        </div>

        {/* Main Content Column */}
        <div className="scd-content-column">
          <div className="scd-column-header">
            <h2>
              {activeCategory === 'sessions' && '📅 Available Sessions'}
              {activeCategory === 'booked-sessions' && '📋 Booked Sessions'}
              {activeCategory === 'quiz' && '📝 Lesson Quiz'}
              {!activeCategory && '📋 Course Content'}
            </h2>
            {currentLesson && activeCategory ? (
              <p className="scd-column-subtitle">
                {currentModule?.title} › {currentLesson.title}
              </p>
            ) : (
              <p className="scd-column-subtitle">Select a category from the sidebar</p>
            )}
          </div>
          
          <div className="scd-main-content">
            {/* Sessions View */}
            {activeCategory === 'sessions' && (
              <div className="scd-category-content scd-sessions-content">
                <div className="scd-content-header">
                  <h3>📅 Available Sessions for {currentLesson?.title}</h3>
                  <p>Book sessions to get personalized help with this lesson</p>
                </div>
                {getFilteredSessions().length > 0 ? (
                  <div className="scd-sessions-grid">
                    {getFilteredSessions().map((session) => (
                      <div key={session.id} className="scd-session-card">
                        <div className="scd-session-header">
                          <h4>{session.title || 'Study Session'}</h4>
                          <span className="scd-session-status">{session.status || 'Available'}</span>
                        </div>
                        <div className="scd-session-info">
                          <div className="scd-session-time">
                            📅 {formatDateString(session)}
                          </div>
                          <div className="scd-session-time">
                            ⏰ {formatTimeString(session)}
                          </div>
                          <div className="scd-session-duration">
                            ⏱️ {session.duration || 'N/A'} minutes
                          </div>
                          <div className="scd-session-capacity">
                            <SessionCapacityIndicator
                              enrollmentCount={session.enrollmentCount || 0}
                              maxStudents={session.maxStudents || 5}
                              capacityStatus={session.capacityStatus || 'empty'}
                              isFull={session.isFull || false}
                              availableSpots={session.availableSpots || session.maxStudents || 5}
                              size="small"
                            />
                            {session.isCurrentStudentEnrolled && (
                              <div className="scd-personal-enrollment-indicator">
                                <span className="scd-enrollment-badge">✅ You're enrolled</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          className={`scd-book-session-btn ${(session.isFull && !session.isCurrentStudentEnrolled) ? 'disabled' : ''}`}
                          onClick={() => handleBookSession(session.id, activeCategoryData.lessonId)}
                          disabled={bookingLoading || (session.isFull && !session.isCurrentStudentEnrolled)}
                        >
                          {bookingLoading
                            ? 'Booking...'
                            : session.isCurrentStudentEnrolled
                              ? 'Join Session'
                              : session.isFull
                                ? 'Session Full'
                                : 'Book Session'
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="scd-no-sessions">
                    <div className="scd-empty-icon">📅</div>
                    <h3>No Available Sessions</h3>
                    <p>No sessions are currently available for this lesson. Check back later or contact your instructor.</p>
                  </div>
                )}
              </div>
            )}

            {/* Booked Sessions View */}
            {activeCategory === 'booked-sessions' && (
              <div className="scd-category-content scd-booked-sessions-content">
                <div className="scd-content-header">
                  <h3>📋 Your Booked Sessions for {currentLesson?.title}</h3>
                  <p>Sessions you have booked for this lesson</p>
                </div>
                {getFilteredSessions().length > 0 ? (
                  <div className="scd-sessions-grid">
                    {getFilteredSessions().map((session) => (
                        <div key={session.id} className="scd-session-card scd-booked">
                          <div className="scd-session-header">
                            <h4>{session.title || 'Study Session'}</h4>
                            <span className="scd-session-status scd-booked">✅ Booked</span>
                          </div>
                          <div className="scd-session-info">
                            <div className="scd-session-time">
                              📅 {formatDateString(session)}
                            </div>
                            <div className="scd-session-time">
                              ⏰ {formatTimeString(session)}
                            </div>
                            <div className="scd-session-duration">
                              ⏱️ {session.duration || 'N/A'} minutes
                            </div>
                            <div className="scd-session-capacity">
                              <SessionCapacityBadge
                                enrollmentCount={session.enrollmentCount || 0}
                                maxStudents={session.maxStudents || 5}
                                capacityStatus={session.capacityStatus || 'empty'}
                                isFull={session.isFull || false}
                                variant="detailed"
                              />
                            </div>
                          </div>
                          <div className="scd-booked-session-actions">
                            <button className="scd-join-session-btn">
                              Join Session
                            </button>
                            <button 
                              className="scd-cancel-session-btn"
                              onClick={() => handleCancelSession(session.id, activeCategoryData.lessonId)}
                              disabled={cancelLoading[session.id]}
                            >
                              {cancelLoading[session.id] ? 'Cancelling...' : 'Cancel Booking'}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="scd-no-sessions">
                    <div className="scd-empty-icon">📋</div>
                    <h3>No Booked Sessions</h3>
                    <p>You haven't booked any sessions for this lesson yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* Quiz View */}
            {activeCategory === 'quiz' && (
              <div className="scd-category-content scd-quiz-content">
                <div className="scd-content-header">
                  <h3>📝 Quiz for {currentLesson?.title}</h3>
                  <p>Test your understanding of this lesson</p>
                </div>
                <div className="scd-quiz-interface">
                  <div className="scd-quiz-info">
                    <div className="scd-quiz-details">
                      <h4>Lesson Quiz</h4>
                      <p>This quiz covers the key concepts from "{currentLesson?.title}"</p>
                      <div className="scd-quiz-meta">
                        <span className="scd-quiz-duration">⏱️ Estimated time: 10-15 minutes</span>
                        <span className="scd-quiz-questions">❓ Multiple choice questions</span>
                      </div>
                    </div>
                    <button 
                      className="scd-start-quiz-btn"
                      onClick={() => handleTakeQuiz(activeCategoryData.moduleId, activeCategoryData.lessonId)}
                    >
                      Start Quiz
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Default Empty State */}
            {!activeCategory && (
              <div className="scd-empty-state">
                <div className="scd-empty-icon">📚</div>
                <h3>Select a Category</h3>
                <p>Choose Sessions, Booked Sessions, or Quiz from the sidebar to view content</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Chat Widget */}
      {chatEnabled && (
        <div className="scd-floating-chat-widget">
          <div className="scd-chat-header">
            <h3>💬 Tutor Chat</h3>
            <button 
              className="scd-close-chat"
              onClick={() => setChatEnabled(false)}
            >
              ×
            </button>
          </div>
          <div className="scd-chat-content">
            {currentUser && courseId && (
              <CourseChat courseId={courseId} user={currentUser} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCourseDetailPage;