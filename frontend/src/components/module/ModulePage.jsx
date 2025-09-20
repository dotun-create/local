import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import ModuleCardComponent from './ModuleCardComponent';
import { appConfig } from '../../config';
import { getNextUpcomingSession } from '../../utils/sessionUtils';
import './css/ModulePage.css';

const ModulePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [nextSession, setNextSession] = useState(null);
  const courseId = searchParams.get('courseId');
  
  // Get course data from navigation state or use default
  const courseData = location.state?.courseData;
  const fromDashboard = location.state?.fromDashboard;

  // Fetch upcoming sessions for this course
  useEffect(() => {
    const fetchUpcomingSessions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`/api/sessions?status=scheduled`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const sessions = data.sessions || [];
          
          // Filter by course if courseId is provided
          const courseSessions = courseId 
            ? sessions.filter(session => session.courseId === courseId)
            : sessions;

          // Get the next upcoming session using utility function
          const upcomingSession = getNextUpcomingSession(courseSessions);
          setNextSession(upcomingSession);
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };

    fetchUpcomingSessions();
  }, [courseId]);
  
  // If we have course data from dashboard, use it; otherwise use default config
  const moduleCardData = courseData ? {
    ...appConfig.moduleCard,
    courseTitle: courseData.title,
    headerTitle: courseData.title,
    progressValue: courseData.progress,
    // Use real session data if available, otherwise fall back to default
    sessionDetails: nextSession || appConfig.moduleCard.sessionDetails,
    moduleData: {
      topic: `${courseData.title} - Current Module`,
      lessons: [
        {
          id: 1,
          name: "Getting Started",
          link: "#/lesson/1",
          completed: courseData.progress > 20,
          duration: "45 min"
        },
        {
          id: 2,
          name: "Core Concepts",
          link: "#/lesson/2",
          completed: courseData.progress > 40,
          duration: "60 min"
        },
        {
          id: 3,
          name: "Practical Applications",
          link: "#/lesson/3",
          completed: courseData.progress > 60,
          duration: "50 min"
        },
        {
          id: 4,
          name: "Advanced Topics",
          link: "#/lesson/4",
          completed: courseData.progress > 80,
          duration: "70 min"
        },
        {
          id: 5,
          name: "Final Assessment",
          link: "#/lesson/5",
          completed: courseData.progress >= 100,
          duration: "90 min"
        }
      ]
    },
    tasksData: [
      {
        id: 1,
        name: "Complete Module Quiz",
        taskType: "Quiz",
        dueDate: "Tomorrow",
        link: `/quiz/${courseId || 'sample'}`
      },
      {
        id: 2,
        name: "Submit Assignment",
        taskType: "Assignment",
        dueDate: "In 3 days",
        link: "#/assignment/1"
      }
    ]
  } : {
    ...appConfig.moduleCard,
    // Even for default config, use real session data if available
    sessionDetails: nextSession || appConfig.moduleCard.sessionDetails
  };
  
  const handleBackToDashboard = () => {
    setIsNavigating(true);
    
    // Add small delay for visual feedback
    setTimeout(() => {
      // First try to go back in history if user came from dashboard
      if (fromDashboard) {
        navigate('/dashboard');
      } else {
        // Otherwise, check if user is logged in and go to appropriate dashboard
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        if (currentUser && currentUser.accountType === 'student') {
          navigate('/dashboard');
        } else {
          // Fallback to browser back or home page
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/');
          }
        }
      }
      setIsNavigating(false);
    }, 200);
  };
  
  return (
    <div className="module-page">
      <div className="module-page-navigation">
        <button 
          className={`back-to-dashboard-btn ${isNavigating ? 'navigating' : ''}`} 
          onClick={handleBackToDashboard}
          disabled={isNavigating}
        >
          {isNavigating ? (
            <>
              ↻ Navigating...
            </>
          ) : (
            <>
              ← {fromDashboard ? 'Back to Dashboard' : 'Back'}
            </>
          )}
        </button>
      </div>
      <div className="module-page-header">
        <h1 className="page-title">
          {courseData ? `${courseData.title} - Modules` : "Tise's Learning Modules"}
        </h1>
        <p className="page-subtitle">
          {courseData 
            ? `Continue your progress in ${courseData.title} with ${courseData.instructor}` 
            : "Continue your learning journey"
          }
        </p>
        {courseData && (
          <div className="course-progress-info">
            <div className="progress-stats">
              <span className="progress-text">Course Progress: {courseData.progress}%</span>
              <span className="modules-text">{courseData.completedModules}/{courseData.modules} modules completed</span>
            </div>
            <div className="course-progress-bar">
              <div className="progress-fill" style={{width: `${courseData.progress}%`}}></div>
            </div>
          </div>
        )}
      </div>
      
      <ModuleCardComponent moduleCardData={moduleCardData} />
    </div>
  );
};

export default ModulePage;