import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useCoursePageRefresh } from '../../hooks/useAdminRefresh';
import API from '../../services/api';
import { formatSessionDate, formatSessionTime } from '../../utils/sessionUtils';
import { formatCoursePrice, getCurrencyFromCourse, formatCurrencyForDisplay } from '../../utils/currency';
import { getTimezoneDisplayName } from '../../utils/timeUtils';
// import { ZoomIntegrationMethods } from '../../utils/zoomHelpers'; // Disabled until backend integration
import { isChatEnabled } from '../../services/chatAPI';
import CourseChat from '../chat/CourseChat';
import './css/CourseDetailPage.css';
import './css/CourseDetailPage-student.css';

// Session timing and booking validation functions
const getHoursUntilSession = (sessionDateTime) => {
  const now = new Date();
  const sessionTime = new Date(sessionDateTime);
  const diffInMs = sessionTime - now;
  return diffInMs / (1000 * 60 * 60); // Convert to hours
};

const getBookingStatus = (sessionDateTime) => {
  const hoursUntilSession = getHoursUntilSession(sessionDateTime);
  
  if (hoursUntilSession <= 8) {
    return {
      status: 'confirmed',
      canCancel: false,
      message: 'Booking confirmed - too close to cancel'
    };
  } else {
    return {
      status: 'on_hold',
      canCancel: true,
      message: 'Booking on hold - can cancel until 8hrs before'
    };
  }
};

// Day index conversion utilities
// JavaScript uses Sunday=0, Monday=1, ..., Saturday=6
// Python/Backend uses Monday=0, Tuesday=1, ..., Sunday=6
const convertPythonIndexToJS = (pythonIndex) => {
  // Convert Python day index to JavaScript day index
  // Python:     Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
  // JavaScript: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
  return pythonIndex === 6 ? 0 : pythonIndex + 1; // Sunday (6) -> 0, others shift up by 1
};

// Date/time formatting utility
const formatDateTime = (dateString, timezone = null) => {
  if (!dateString) return 'TBD';
  const date = formatSessionDate(dateString, { weekday: 'short', month: 'short', day: 'numeric' }, timezone);
  const time = formatSessionTime(dateString, { hour: '2-digit', minute: '2-digit' }, timezone);
  return `${date} at ${time}`;
};

// Session cancellation utility
const canCancelSession = (session) => {
  if (!session || !session.scheduledDate && !session.scheduled_date) return false;
  
  const sessionDate = new Date(session.scheduledDate || session.scheduled_date);
  const now = new Date();
  const hoursUntilSession = (sessionDate - now) / (1000 * 60 * 60);
  
  // Can cancel if more than 24 hours before session
  return hoursUntilSession >= 24;
};

// Credit validation functions
const checkStudentCredits = (studentProfile) => {
  return studentProfile.credits || studentProfile.availableCredits || 0;
};

// Helper function to check if a timeslot conflicts with existing sessions
const isTimeSlotOccupied = (tutorId, date, timeSlot, existingSessions, sessionDurationMinutes = 60) => {
  if (!existingSessions || !Array.isArray(existingSessions)) return false;
  
  // Parse the available timeslot times
  const slotStartTime = new Date(`${date}T${timeSlot.startTime}`);
  const slotEndTime = new Date(`${date}T${timeSlot.endTime}`);
  
  // Check each existing session for conflicts
  return existingSessions.some(session => {
    // Skip sessions that don't match the tutor
    if (session.tutorId !== tutorId && session.tutor_id !== tutorId) return false;
    
    // Get session date and time
    const sessionDate = session.scheduledDate || session.scheduled_date;
    if (!sessionDate) return false;
    
    // Parse session datetime
    const sessionStart = new Date(sessionDate);
    const sessionEnd = new Date(sessionStart.getTime() + (session.duration || sessionDurationMinutes) * 60000);
    
    // Check if session date matches the timeslot date
    const sessionDateOnly = sessionStart.toISOString().split('T')[0];
    if (sessionDateOnly !== date) return false;
    
    // Check for time overlap
    // Sessions overlap if: sessionStart < slotEnd AND sessionEnd > slotStart
    const hasOverlap = sessionStart < slotEndTime && sessionEnd > slotStartTime;
    
    if (hasOverlap) {
      console.log(`🚫 Timeslot conflict detected:`, {
        tutorId,
        date,
        slotTime: `${timeSlot.startTime}-${timeSlot.endTime}`,
        sessionTime: `${sessionStart.toTimeString().slice(0,5)}-${sessionEnd.toTimeString().slice(0,5)}`,
        sessionTitle: session.title
      });
    }
    
    return hasOverlap;
  });
};

// Test function to verify timeslot filtering functionality
const testTimeslotFiltering = () => {
  console.log('🧪 Testing timeslot filtering functionality...');
  
  // Test data
  const testTutorId = 'tutor_123';
  const testDate = '2025-01-15';
  
  // Test existing sessions
  const testSessions = [
    {
      tutorId: 'tutor_123',
      scheduledDate: '2025-01-15T09:00:00',
      duration: 60,
      title: 'Math Session 1'
    },
    {
      tutorId: 'tutor_123', 
      scheduledDate: '2025-01-15T14:30:00',
      duration: 90,
      title: 'Math Session 2'
    },
    {
      tutorId: 'tutor_456',
      scheduledDate: '2025-01-15T10:00:00',
      duration: 60,
      title: 'English Session'
    }
  ];
  
  // Test timeslots
  const testTimeSlots = [
    { id: 1, startTime: '08:00', endTime: '09:00' }, // Available - before session
    { id: 2, startTime: '09:00', endTime: '10:00' }, // Occupied - exact match
    { id: 3, startTime: '08:30', endTime: '09:30' }, // Occupied - overlap with session 1
    { id: 4, startTime: '10:30', endTime: '11:30' }, // Available - after session
    { id: 5, startTime: '14:00', endTime: '15:00' }, // Occupied - overlap with session 2  
    { id: 6, startTime: '16:00', endTime: '17:00' }, // Available - after all sessions
  ];
  
  console.log('Test results:');
  testTimeSlots.forEach(slot => {
    const isOccupied = isTimeSlotOccupied(testTutorId, testDate, slot, testSessions);
    console.log(`${slot.startTime}-${slot.endTime}: ${isOccupied ? '❌ OCCUPIED' : '✅ AVAILABLE'}`);
  });
  
  // Expected results:
  // 08:00-09:00: ✅ AVAILABLE
  // 09:00-10:00: ❌ OCCUPIED (exact match with session 1) 
  // 08:30-09:30: ❌ OCCUPIED (overlaps with session 1)
  // 10:30-11:30: ✅ AVAILABLE 
  // 14:00-15:00: ❌ OCCUPIED (overlaps with session 2)
  // 16:00-17:00: ✅ AVAILABLE
  
  console.log('🧪 Test completed!');
};

const canAffordSession = (studentCredits, sessionCost) => {
  return studentCredits >= sessionCost;
};

const canAffordRecurring = (studentCredits, sessionCost, sessionCount = 12) => {
  return studentCredits >= (sessionCost * sessionCount);
};

const CourseDetailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  
  // Make test function available globally for development testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.testTimeslotFiltering = testTimeslotFiltering;
      console.log('🧪 Test function available: Run window.testTimeslotFiltering() in console');
    }
  }, []);
  
  // State management
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showQuizEditModal, setShowQuizEditModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [editingItem, setEditingItem] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  
  // Form states
  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
    order: 1,
    content: '',
    lessons: '',
    duration: '',
    startDate: '',
    endDate: ''
  });
  
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    order: 1,
    content: '',
    video_url: '',
    duration: 0
  });
  
  const [sessionForm, setSessionForm] = useState({
    title: '',
    description: '',
    scheduled_date: '',
    duration: 60,
    max_participants: 2,
    is_recurring: false,
    tutor_id: '',
    selected_day: '',
    selected_time_slot: '',
    selected_availability_slot: '',
    selected_time_slots: [], // For multiple selection
    price: 0, // Session price
    sessionType: 'regular' // 'regular' or 'assessment'
  });

  const [quizForm, setQuizForm] = useState({
    topic: '',
    title: '',
    difficulty: 'medium',
    timeLimit: '30',
    numberOfQuestions: '',
    passingScore: ''
  });

  // Assessment session quiz form (for when sessionType is 'assessment')
  const [assessmentQuizForm, setAssessmentQuizForm] = useState({
    topic: '',
    title: '',
    difficulty: 'medium',
    timeLimit: '60', // Default longer time for assessment
    numberOfQuestions: '15', // Default more questions for assessment
    passingScore: '70'
  });

  const [availableTopics, setAvailableTopics] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Enhanced session creation state for admin
  const [tutorAvailability, setTutorAvailability] = useState([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [sessionMappings, setSessionMappings] = useState({});
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [isCreatingBatchSessions, setIsCreatingBatchSessions] = useState(false);
  
  // Date range state for availability filtering
  const [availabilityDateRange, setAvailabilityDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  const [quizEditForm, setQuizEditForm] = useState({
    title: '',
    description: '',
    passingScore: '',
    timeLimit: '',
    validFrom: '',
    validUntil: ''
  });
  const [currentUser, setCurrentUser] = useState(null);
  
  // Recurring session booking states
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [selectedSessionForEnrollment, setSelectedSessionForEnrollment] = useState(null);
  const [studentCredits, setStudentCredits] = useState(0);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [attendedSessions, setAttendedSessions] = useState([]);
  const [enrolledUpcomingSessions, setEnrolledUpcomingSessions] = useState([]);
  
  // Timezone management state
  const [courseTimezone, setCourseTimezone] = useState('UTC');
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [isUpdatingTimezone, setIsUpdatingTimezone] = useState(false);
  
  // Student view specific states
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [studentProgress, setStudentProgress] = useState({});
  const [upcomingSessionsForStudent, setUpcomingSessionsForStudent] = useState([]);

  // Load course data
  useEffect(() => {
    if (!courseId) {
      setError('No course ID provided');
      setLoading(false);
      return;
    }

    const loadCourseData = async () => {
      try {
        setLoading(true);
        
        // Get current user from session storage
        const userStr = sessionStorage.getItem('currentUser');
        const authToken = sessionStorage.getItem('authToken');
        
        // Check if user is authenticated
        if (!userStr || !authToken) {
          setError('Authentication required. Please log in.');
          setLoading(false);
          navigate('/login');
          return;
        }
        
        if (userStr) {
          setCurrentUser(JSON.parse(userStr));
        }
        
        // Load course details
        const response = await API.courses.getCourseById(courseId);
        const courseData = response.course || response;
        setCourse(courseData);
        
        // Set course timezone if available
        if (courseData.timezone) {
          setCourseTimezone(courseData.timezone);
        }
        
        // Extract tutor availability for admin users
        if (courseData.tutors && courseData.tutors.length > 0) {
          console.log('Raw tutors data from API:', courseData.tutors);
          console.log('Tutors with availability check:', courseData.tutors.map(t => ({
            id: t.id,
            name: t.name,
            hasAvailability: !!t.availability,
            availabilityKeys: t.availability ? Object.keys(t.availability) : 'No availability'
          })));
          
          setTutorAvailability(courseData.tutors);
          console.log('Tutor availability loaded:', courseData.tutors);
        } else {
          console.warn('No tutors found in course data');
        }
        
        // Load modules for this course
        const modulesData = await API.courses.getCourseModules(courseId);
        console.log('Loaded modules:', modulesData.modules);
        console.log('Module IDs:', modulesData.modules?.map(m => ({ id: m.id, title: m.title })));
        setModules(modulesData.modules || []);
        
        // Set default date range based on modules
        const loadedModules = modulesData.modules || [];
        if (loadedModules.length > 0) {
          const startDates = loadedModules.filter(m => m.startDate).map(m => new Date(m.startDate));
          const endDates = loadedModules.filter(m => m.endDate).map(m => new Date(m.endDate));
          
          if (startDates.length > 0 && endDates.length > 0) {
            const minStartDate = new Date(Math.min(...startDates));
            const maxEndDate = new Date(Math.max(...endDates));
            
            setAvailabilityDateRange({
              startDate: minStartDate.toISOString().split('T')[0],
              endDate: maxEndDate.toISOString().split('T')[0]
            });
            
            console.log('Set default date range:', {
              startDate: minStartDate.toISOString().split('T')[0],
              endDate: maxEndDate.toISOString().split('T')[0]
            });
          }
        }
        
        // Load sessions for this course
        const sessionsData = await API.courses.getCourseSessions(courseId);
        console.log('Loaded sessions:', sessionsData.sessions);
        console.log('First session object structure:', sessionsData.sessions?.[0]);
        setSessions(sessionsData.sessions || []);
        
      } catch (err) {
        console.error('Failed to load course data:', err);
        setError('Failed to load course data');
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId]);

  // Refresh callback for hybrid refresh strategy
  const handleCourseDataRefresh = useCallback(async (event) => {
    console.log('Course detail page refreshing data due to event:', event);
    
    try {
      // Re-run the main data loading function
      const userStr = sessionStorage.getItem('currentUser');
      const authToken = sessionStorage.getItem('authToken');
      
      // Check if user is authenticated
      if (!userStr || !authToken) {
        setError('Authentication required. Please log in.');
        navigate('/login');
        return;
      }
      
      // Reload course data
      const response = await API.courses.getCourseById(courseId);
      const courseData = response.course || response;
      setCourse(courseData);
      
      // Set course timezone if available
      if (courseData.timezone) {
        setCourseTimezone(courseData.timezone);
      }
      
      // Load sessions for this course
      const sessionsData = await API.courses.getCourseSessions(courseId);
      setSessions(sessionsData.sessions || []);
      
      console.log('Course detail data refresh completed');
    } catch (error) {
      console.error('Error refreshing course detail data:', error);
    }
  }, [courseId, navigate]);

  // Initialize course page refresh hook
  const { triggerRefresh, isRefreshing } = useCoursePageRefresh(courseId, handleCourseDataRefresh);

  // Function to refresh lessons for the selected module
  const refreshLessons = async () => {
    if (!selectedModule) return;
    
    try {
      const lessonsData = await API.modules.getModuleLessons(selectedModule.id);
      console.log('REFRESH: Lessons data received:', lessonsData);
      setLessons(lessonsData.lessons || []);
    } catch (err) {
      console.error('Failed to refresh lessons:', err);
    }
  };

  // Function to fetch quizzes for the selected module
  const fetchQuizzes = async () => {
    if (!selectedModule) {
      setQuizzes([]);
      return;
    }
    
    try {
      const quizzesData = await API.quizzes.getQuizzes(selectedModule.id);
      console.log('Quizzes data received:', quizzesData);
      setQuizzes(quizzesData.quizzes || []);
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
      setQuizzes([]);
    }
  };

  // Function to fetch tutor availability with date range
  const fetchTutorAvailability = async (startDate, endDate) => {
    try {
      console.log('Fetching tutor availability with date range:', { startDate, endDate });
      
      // Build query parameters for date range
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('start_date', startDate);
      if (endDate) queryParams.append('end_date', endDate);
      
      const response = await API.courses.getCourseById(courseId, queryParams.toString());
      const courseData = response.course || response;
      
      if (courseData.tutors && courseData.tutors.length > 0) {
        console.log('Updated tutor availability:', courseData.tutors);
        setTutorAvailability(courseData.tutors);
        return courseData.tutors;
      } else {
        console.warn('No tutors found in updated course data');
        setTutorAvailability([]);
        return [];
      }
    } catch (err) {
      console.error('Failed to fetch tutor availability:', err);
      setTutorAvailability([]);
      return [];
    }
  };

  // Load lessons and quizzes when a module is selected
  useEffect(() => {
    if (selectedModule) {
      const loadLessons = async () => {
        try {
          const lessonsData = await API.modules.getModuleLessons(selectedModule.id);
          setLessons(lessonsData.lessons || []);
        } catch (err) {
          console.error('Failed to load lessons:', err);
          setLessons([]);
        }
      };
      
      loadLessons();
      fetchQuizzes();
    } else {
      setLessons([]);
      setQuizzes([]);
      setSelectedLesson(null);
    }
  }, [selectedModule]);

  // Fetch student credits when user is available
  useEffect(() => {
    if (currentUser && currentUser.account_type === 'student') {
      const fetchInitialCredits = async () => {
        console.log('🔄 Fetching initial credits for student:', currentUser.id);
        await refreshStudentCredits();
      };
      
      fetchInitialCredits();
    }
  }, [currentUser]);

  // Session processing functions
  const processAvailableSessions = (sessions, studentCredits) => {
    return sessions.map(session => {
      const bookingInfo = getBookingStatus(session.scheduled_date);
      return {
        ...session,
        canAfford: studentCredits >= (session.credits_required || session.price || 0),
        canAffordRecurring: studentCredits >= ((session.credits_required || session.price || 0) * 12),
        creditsNeeded: session.credits_required || session.price || 0,
        hoursUntilSession: getHoursUntilSession(session.scheduled_date),
        bookingStatus: bookingInfo.status,
        canCancelBooking: bookingInfo.canCancel,
        bookingMessage: bookingInfo.message
      };
    });
  };

  const categorizeSessionsForStudent = (sessions, currentStudentId, studentCredits) => {
    const availableSessions = sessions
      .filter(session => session.status === 'scheduled' || session.status === 'active')
      .filter(session => !session.studentIds?.includes(currentStudentId)) // Exclude already enrolled sessions
      .map(session => {
        const sessionDate = session.scheduledDate || session.scheduled_date;
        const bookingInfo = getBookingStatus(sessionDate);
        return {
          ...session,
          canAfford: studentCredits >= (session.credits_required || session.price || 0),
          canAffordRecurring: studentCredits >= ((session.credits_required || session.price || 0) * 12),
          creditsNeeded: session.credits_required || session.price || 0,
          hoursUntilSession: getHoursUntilSession(sessionDate),
          bookingStatus: bookingInfo.status,
          canCancelBooking: bookingInfo.canCancel
        };
      });
    
    const attendedSessions = sessions.filter(session => 
      (session.status === 'completed' || session.status === 'concluded') &&
      session.studentIds?.includes(currentStudentId)
    );

    // Add enrolled upcoming sessions (student is enrolled and session is in the future)
    const enrolledUpcomingSessions = sessions.filter(session =>
      (session.status === 'scheduled' || session.status === 'active') &&
      session.studentIds?.includes(currentStudentId) &&
      new Date(session.scheduledDate || session.scheduled_date) > new Date()
    );
    
    return { availableSessions, attendedSessions, enrolledUpcomingSessions };
  };


  // Load and process all sessions when a lesson is selected
  useEffect(() => {
    if (selectedLesson && currentUser) {
      const loadAllSessionsForLesson = async () => {
        try {
          // Get student credit balance
          const credits = await refreshStudentCredits();
          
          // Fetch all sessions for the lesson
          const sessionsData = await API.lessons.getLessonSessions(selectedLesson.id);
          const allSessions = sessionsData.sessions || [];
          
          // Log filtered sessions for selected lesson
          console.log('Sessions for selected lesson:', allSessions);
          
          // Categorize sessions for student view
          const { availableSessions: available, attendedSessions: attended, enrolledUpcomingSessions: enrolled } = categorizeSessionsForStudent(
            allSessions, 
            currentUser.id, 
            credits
          );
          
          // Update state
          setSessions(allSessions); // Keep all sessions for admin view
          setAvailableSessions(available);
          setAttendedSessions(attended);
          setEnrolledUpcomingSessions(enrolled);
          
        } catch (err) {
          console.error('Failed to load sessions:', err);
          setSessions([]);
          setAvailableSessions([]);
          setAttendedSessions([]);
        }
      };
      
      loadAllSessionsForLesson();
    } else {
      setSessions([]);
      setAvailableSessions([]);
      setAttendedSessions([]);
    }
  }, [selectedLesson, currentUser]);

  // Monitor session enrollment and notify when full
  useEffect(() => {
    const checkSessionCapacity = async () => {
      if (!sessions || sessions.length === 0) return;
      
      for (const session of sessions) {
        const enrolledCount = session.studentIds?.length || 0;
        const maxParticipants = session.max_participants || session.maxStudents || 2;
        
        // Check if session is full
        if (enrolledCount >= maxParticipants && enrolledCount > 0) {
          try {
            await checkAndNotifyIfSessionFull(session);
          } catch (error) {
            console.error('Error checking session capacity:', error);
          }
        }
      }
    };
    
    checkSessionCapacity();
  }, [sessions]);

  // Module CRUD operations
  const handleCreateModule = () => {
    setModalMode('create');
    setModuleForm({
      title: '',
      description: '',
      order: modules.length + 1,
      content: '',
      lessons: '',
      duration: '',
      startDate: '',
      endDate: ''
    });
    setShowModuleModal(true);
  };

  const handleEditModule = (module) => {
    console.log('Edit module called with:', module);
    console.log('Module ID:', module?.id);
    
    setModalMode('edit');
    setEditingItem(module);
    
    // Convert ISO dates to YYYY-MM-DD format for date inputs
    const formatDateForInput = (isoDate) => {
      if (!isoDate) return '';
      try {
        return isoDate.split('T')[0];
      } catch {
        return '';
      }
    };
    
    setModuleForm({
      title: module.title || '',
      description: module.description || '',
      order: module.order || 1,
      content: module.content || '',
      lessons: module.lessons || '',
      duration: module.duration || '',
      startDate: formatDateForInput(module.startDate),
      endDate: formatDateForInput(module.endDate)
    });
    setShowModuleModal(true);
  };

  const handleModuleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Module submit - Mode:', modalMode);
    console.log('Module submit - EditingItem:', editingItem);
    console.log('Module submit - EditingItem ID:', editingItem?.id);
    
    try {
      if (modalMode === 'create') {
        const response = await API.modules.createModule({
          ...moduleForm,
          courseId: courseId
        });
        // Extract module from response
        const newModule = response.module || response;
        console.log('New module created:', newModule);
        console.log('New module ID:', newModule?.id);
        setModules(prev => [...prev, newModule]);
      } else {
        // Make sure we have a valid module ID
        if (!editingItem || !editingItem.id) {
          console.error('No module ID found for update');
          alert('Error: Cannot update module - missing module ID');
          return;
        }
        
        console.log('Updating module with ID:', editingItem.id);
        const response = await API.modules.updateModule(editingItem.id, moduleForm);
        console.log('Update response:', response);
        // Extract module from response
        const updatedModule = response.module || response;
        console.log('Updated module:', updatedModule);
        setModules(prev => prev.map(m => m.id === editingItem.id ? updatedModule : m));
      }
      
      setShowModuleModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Failed to save module:', err);
      alert('Failed to save module: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (window.confirm('Are you sure you want to delete this module?')) {
      try {
        await API.modules.deleteModule(moduleId);
        setModules(prev => prev.filter(m => m.id !== moduleId));
        if (selectedModule?.id === moduleId) {
          setSelectedModule(null);
        }
      } catch (err) {
        console.error('Failed to delete module:', err);
        alert('Failed to delete module');
      }
    }
  };

  // Lesson CRUD operations
  const handleCreateLesson = () => {
    if (!selectedModule) {
      alert('Please select a module first');
      return;
    }
    
    setModalMode('create');
    setLessonForm({
      title: '',
      description: '',
      order: lessons.length + 1,
      content: '',
      video_url: '',
      duration: 0
    });
    setShowLessonModal(true);
  };

  const handleEditLesson = (lesson) => {
    console.log('EDIT: handleEditLesson called with lesson:', lesson);
    console.log('EDIT: lesson.id:', lesson.id);
    console.log('EDIT: Full lesson object keys:', Object.keys(lesson));
    
    // Additional debugging to check if the lesson object has id or other identifier fields
    console.log('EDIT: Checking for ID fields:', {
      id: lesson.id,
      lessonId: lesson.lessonId,
      lesson_id: lesson.lesson_id,
      _id: lesson._id
    });
    
    setModalMode('edit');
    // Use the correct ID field - check multiple possible ID fields
    const lessonWithId = {
      ...lesson,
      id: lesson.id || lesson.lessonId || lesson.lesson_id || lesson._id
    };
    setEditingItem(lessonWithId);
    setLessonForm({
      title: lesson.title || '',
      description: lesson.description || '',
      order: lesson.order || 1,
      content: lesson.content || '',
      video_url: (lesson.content && lesson.content.video_url) || '',
      duration: lesson.duration || 0
    });
    setShowLessonModal(true);
  };

  const handleLessonSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (modalMode === 'create') {
        // Structure the payload according to the required format
        const hasVideoUrl = lessonForm.video_url && lessonForm.video_url.trim();
        const lessonPayload = {
          title: lessonForm.title,
          description: lessonForm.description,
          duration: parseInt(lessonForm.duration) || 0,
          type: hasVideoUrl ? "video" : "meetingInstance",
          content: {
            video_url: lessonForm.video_url || ""
          },
          order: parseInt(lessonForm.order) || 1
        };
        
        console.log('CREATE: Calling API.lessons.createLesson with:', {
          moduleId: selectedModule.id,
          payload: lessonPayload
        });
        
        const newLesson = await API.lessons.createLesson(selectedModule.id, lessonPayload);
        console.log('CREATE: Received response:', newLesson);
        // Refresh lessons from server to ensure consistency
        await refreshLessons();
      } else {
        // Structure the update payload the same way as create
        const hasVideoUrl = lessonForm.video_url && lessonForm.video_url.trim();
        const updatePayload = {
          title: lessonForm.title,
          description: lessonForm.description,
          duration: parseInt(lessonForm.duration) || 0,
          type: hasVideoUrl ? "video" : "meetingInstance",
          content: {
            video_url: lessonForm.video_url || ""
          },
          order: parseInt(lessonForm.order) || 1
        };
        
        console.log('UPDATE: Calling API.lessons.updateLesson with:', {
          lessonId: editingItem.id,
          payload: updatePayload
        });
        
        const updatedLesson = await API.lessons.updateLesson(editingItem.id, updatePayload);
        console.log('UPDATE: Received response:', updatedLesson);
        // Refresh lessons from server to ensure consistency
        await refreshLessons();
      }
      
      setShowLessonModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Failed to save lesson - Full error details:', err);
      console.error('Error message:', err.message);
      console.error('Error response:', err.response);
      alert(`Failed to save lesson: ${err.message}`);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      try {
        await API.lessons.deleteLesson(lessonId);
        // Clear selected lesson if it was deleted
        if (selectedLesson?.id === lessonId) {
          setSelectedLesson(null);
        }
        // Refresh lessons from server to ensure consistency
        await refreshLessons();
      } catch (err) {
        console.error('Failed to delete lesson:', err);
        alert('Failed to delete lesson');
      }
    }
  };

  // Session CRUD operations
  const handleCreateSession = () => {
    console.log('=== ADD SESSION CLICKED ===');
    console.log('Selected lesson:', selectedLesson);
    console.log('Current user:', currentUser);
    console.log('Tutor availability data:', tutorAvailability);
    console.log('Tutor availability length:', tutorAvailability.length);
    
    // Log detailed tutor availability structure
    if (tutorAvailability.length > 0) {
      console.log('=== TUTOR AVAILABILITY DETAILS ===');
      tutorAvailability.forEach((tutor, index) => {
        console.log(`Tutor ${index + 1}:`, {
          id: tutor.id,
          name: tutor.name,
          hasAvailability: !!tutor.availability,
          availabilityDates: tutor.availability && Array.isArray(tutor.availability) ? 
            tutor.availability.map(da => da.date) : 'No availability',
          fullAvailabilityData: tutor.availability
        });
        
        // Log availability data structure to debug the issue
        console.log(`🔍 DEBUGGING Tutor ${tutor.name} availability:`, tutor.availability);
        console.log(`🔍 Is array?`, Array.isArray(tutor.availability));
        console.log(`🔍 Type:`, typeof tutor.availability);
        console.log(`🔍 Keys:`, tutor.availability ? Object.keys(tutor.availability) : 'null/undefined');
        
        // Log both old and new format handling
        if (tutor.availability && Array.isArray(tutor.availability)) {
          console.log(`🔍 NEW FORMAT detected for ${tutor.name}`);
          tutor.availability.forEach((dateAvail, index) => {
            console.log(`  Date ${index + 1} (${dateAvail.date}):`, {
              dayOfWeek: dateAvail.dayOfWeek,
              hasTimeSlots: !!dateAvail?.timeSlots,
              timeSlotsCount: dateAvail?.timeSlots?.length || 0,
              timeSlots: dateAvail?.timeSlots
            });
          });
        } else if (tutor.availability && typeof tutor.availability === 'object') {
          console.log(`🔍 OLD FORMAT detected for ${tutor.name}`);
          Object.entries(tutor.availability).forEach(([day, dayData]) => {
            console.log(`  ${day}:`, {
              hasTimeSlots: !!dayData?.timeSlots,
              timeSlotsCount: dayData?.timeSlots?.length || 0,
              timeSlots: dayData?.timeSlots
            });
          });
        }
      });
      console.log('=== END TUTOR AVAILABILITY DETAILS ===');
    } else {
      console.log('No tutor availability data found');
    }
    
    if (!selectedLesson) {
      alert('Please select a lesson first');
      return;
    }
    
    // For admin users, fetch fresh tutor availability with current date range
    if (currentUser?.accountType === 'admin') {
      console.log('Refreshing availability for date range:', availabilityDateRange);
      
      const fetchAndOpenModal = async () => {
        // Fetch fresh tutor availability with current date range
        const freshTutorAvailability = await fetchTutorAvailability(
          availabilityDateRange.startDate, 
          availabilityDateRange.endDate
        );
        
        if (freshTutorAvailability.length > 0) {
          console.log('Opening availability modal with fresh data');
          setModalMode('create');
          setSessionForm({
            title: selectedLesson?.title || '',
            description: `Session for ${selectedLesson?.title || 'lesson'}`,
            scheduled_date: '',
            duration: 60,
            max_participants: 2,
            is_recurring: false,
            tutor_id: '',
            selected_day: '',
            selected_time_slot: '',
            selected_availability_slot: '',
            selected_time_slots: [] // For multiple selection
          });
          setSelectedTimeSlots([]);
          setSessionMappings({});
          setShowAvailabilityModal(true);
        } else {
          alert('No tutor availability found for the selected date range. Please adjust the date range or contact your tutors.');
        }
      };
      
      fetchAndOpenModal();
    } else {
      console.log('Opening basic session modal (not admin or no tutor availability)');
      // Fallback to simple session creation for non-admin users
      setModalMode('create');
      setSessionForm({
        title: selectedLesson?.title || '',
        description: `Session for ${selectedLesson?.title || 'lesson'}`,
        scheduled_date: '',
        duration: 60,
        max_participants: 2,
        is_recurring: false,
        tutor_id: '',
        selected_day: '',
        selected_time_slot: '',
        selected_availability_slot: '',
        selected_time_slots: [], // For multiple selection
        price: course?.price || 0 // Inherit course price
      });
      setShowSessionModal(true);
    }
  };

  const convertTimezone = (dateTime, fromTimezone, toTimezone) => {
    if (!dateTime || fromTimezone === toTimezone) {
      return dateTime;
    }
    
    try {
      // Create a date object with timezone awareness
      const date = new Date(dateTime);
      
      // Use Intl.DateTimeFormat to convert between timezones
      const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: toTimezone,
        hour12: false
      };
      
      const formatter = new Intl.DateTimeFormat('sv-SE', options);
      const parts = formatter.formatToParts(date);
      
      // Reconstruct ISO format: YYYY-MM-DDTHH:mm:ss
      const year = parts.find(part => part.type === 'year').value;
      const month = parts.find(part => part.type === 'month').value;
      const day = parts.find(part => part.type === 'day').value;
      const hour = parts.find(part => part.type === 'hour').value;
      const minute = parts.find(part => part.type === 'minute').value;
      const second = parts.find(part => part.type === 'second').value;
      
      return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    } catch (error) {
      console.warn('Timezone conversion failed, using original date:', error);
      return dateTime;
    }
  };

  const handleEditSession = (session) => {
    setModalMode('edit');
    setEditingItem(session);
    
    // 1. Check if session timezone matches course timezone
    const sessionTimezone = session.timezone || courseTimezone;
    const needsTimezoneConversion = sessionTimezone !== courseTimezone;
    
    console.log('Session timezone conversion check:', {
      sessionTimezone,
      courseTimezone,
      needsTimezoneConversion,
      originalDate: session.scheduled_date
    });
    
    // 2. Convert timezone if needed
    let adjustedScheduledDate = session.scheduled_date;
    if (needsTimezoneConversion && session.scheduled_date) {
      adjustedScheduledDate = convertTimezone(
        session.scheduled_date,
        sessionTimezone, 
        courseTimezone
      );
      
      console.log('Timezone converted:', {
        from: session.scheduled_date,
        to: adjustedScheduledDate,
        fromTimezone: sessionTimezone,
        toTimezone: courseTimezone
      });
    }
    
    // 3. Update session data with timezone-corrected information
    setSessionForm({
      title: session.title || '',
      description: session.description || '',
      scheduled_date: adjustedScheduledDate || '',
      duration: session.duration || 60,
      max_participants: session.max_participants || 30,
      is_recurring: session.is_recurring || false,
      tutor_id: session.tutor_id || '',
      selected_day: '',
      selected_time_slot: '',
      selected_availability_slot: session.tutor_id && adjustedScheduledDate && session.availability_id 
        ? `${session.tutor_id}_${adjustedScheduledDate.split('T')[0]}_${session.availability_id}`
        : '',
      price: session.price || course?.price || 0 // Use existing session price or inherit course price
    });
    setShowSessionModal(true);
  };

  // Single session creation with Zoom integration
  const handleSingleSessionCreationWithZoom = async () => {
    setIsCreatingBatchSessions(true);
    
    try {
      const slotKey = selectedTimeSlots[0];
      console.log(`Processing single slot key: ${slotKey}`);
      
      // Split slot key - NEW format: tutorId_date_timeSlotId (e.g., user_e30c7ffd_2025-09-02_availability_988c369a)
      const parts = slotKey.split('_');
      console.log(`Raw slot key parts:`, parts);
      
      if (parts.length < 4) {
        throw new Error(`Invalid slot key format: ${slotKey}. Expected at least 4 parts separated by underscores.`);
      }
      
      // New format handling for date-specific availability
      // Format: user_e30c7ffd_2025-09-02_availability_988c369a
      const tutorId = `${parts[0]}_${parts[1]}`; // e.g., "user_e30c7ffd"
      const date = parts[2]; // e.g., "2025-09-02"  
      const timeSlotId = parts.slice(3).join('_'); // e.g., "availability_988c369a"
      
      console.log(`Parsed: tutorId=${tutorId}, date=${date}, timeSlotId=${timeSlotId}`);
      
      const tutor = tutorAvailability?.find(t => t.id === tutorId);
      
      if (!tutor) {
        console.error(`Tutor not found. Available tutors:`, tutorAvailability?.map(t => t.id));
        throw new Error(`Tutor not found for ${tutorId}`);
      }
      
      const timeSlot = findTimeSlotByDateAndTime(tutor.availability, date, timeSlotId);
      
      if (!timeSlot) {
        console.error('Time slot not found for:', { tutorId, date, timeSlotId });
        throw new Error(`Time slot not found for ${slotKey}`);
      }
      
      const startTime = timeSlot.startTime;
      const endTime = timeSlot.endTime;
      const slotTimezone = timeSlot.timeZone || timeSlot.timezone || tutor.timeZone || tutor.timezone || courseTimezone;
      
      console.log(`Time slot details: startTime=${startTime}, date=${date}, timezone=${slotTimezone}`);
      
      if (!date || !startTime) {
        throw new Error('Unable to determine session date and time');
      }
      
      // Create session data with tutor availability timezone (takes precedence)
      // Ensure proper timezone handling - always send as local time with timezone info
      let scheduledDateISO;
      if (slotTimezone && slotTimezone !== 'UTC') {
        // Send the local time in the session's timezone for backend to handle properly
        scheduledDateISO = `${date}T${startTime}:00`; // No 'Z' - let backend handle timezone conversion
      } else {
        // UTC handling
        scheduledDateISO = `${date}T${startTime}:00Z`;
      }
      
      const sessionData = {
        title: sessionForm.title,
        description: sessionForm.description || `Session for ${selectedLesson.title}`,
        scheduledDate: scheduledDateISO,
        timezone: slotTimezone, // Use tutor availability timezone
        duration: sessionForm.duration,
        maxStudents: sessionForm.max_participants,
        tutorId: tutorId,
        courseId: selectedModule?.courseId || course?.id,
        moduleId: selectedModule?.id,
        lessonId: selectedLesson.id,
        availability_id: timeSlotId, // Link session to tutor availability slot
        status: 'scheduled',
        price: sessionForm.price || course?.price || 0 // Inherit price from sessionForm or course
      };
      
      console.log('🔍 DEBUGGING: Creating session with tutorId:', {
        tutorId: tutorId,
        sessionData: sessionData,
        expectedUpcomingEndpoint: `/sessions/upcoming?userId=${tutorId}&userType=tutor`
      });
      
      // Create session
      const newSession = await API.sessions.createSession(sessionData);
      
      // Create Zoom meeting
      const zoomMeetingData = {
        topic: sessionForm.title,
        type: 2, // Scheduled meeting
        start_time: `${date}T${startTime}:00Z`,
        duration: sessionForm.duration,
        agenda: sessionData.description,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true
        }
      };
      
      try {
        const zoomResponse = await API.zoom.createSessionMeeting(course, newSession);
        
        // Update session with Zoom details
        if (zoomResponse.meeting_url) {
          await API.sessions.updateSession(newSession.id, {
            meeting_link: zoomResponse.meeting_url,
            meeting_id: zoomResponse.meeting_id,
            meeting_password: zoomResponse.meeting_password,
            meeting_start_url: zoomResponse.start_url,
            meeting_uuid: zoomResponse.meeting_uuid
          });
        }
      } catch (zoomError) {
        console.warn('Failed to create Zoom meeting:', zoomError);
        // Continue without Zoom integration
      }
      
      // Create quiz if this is an assessment session
      if (sessionForm.sessionType === 'assessment') {
        try {
          console.log('Creating assessment quiz for session:', newSession.id);
          
          // Get lesson information for topic name
          const selectedLessonForQuiz = lessons.find(lesson => lesson.id === assessmentQuizForm.topic);
          const lessonName = selectedLessonForQuiz ? selectedLessonForQuiz.title : '';

          // Create quiz data for assessment session
          const assessmentQuizData = {
            title: assessmentQuizForm.title,
            numQuestions: parseInt(assessmentQuizForm.numberOfQuestions),
            difficulty: assessmentQuizForm.difficulty,
            timeLimit: parseInt(assessmentQuizForm.timeLimit),
            passingScore: parseInt(assessmentQuizForm.passingScore),
            topic: lessonName,
            gradeLevel: course?.gradeLevel,
            country: course?.country,
            sessionId: newSession.id, // Link quiz to the session
            isAssessmentQuiz: true // Mark as assessment quiz
          };

          console.log('Assessment quiz creation payload:', assessmentQuizData);

          // Create quiz using AI generation
          const moduleId = selectedModule.id;
          const lessonId = assessmentQuizForm.topic;
          
          const quizResult = await API.quizzes.generateQuizWithAI(moduleId, assessmentQuizData, lessonId);
          
          console.log('Assessment quiz created successfully:', quizResult);
          
          // Update session with quiz ID
          await API.sessions.updateSession(newSession.id, {
            quiz_id: quizResult.quiz_id || quizResult.id,
            session_type: 'assessment'
          });
          
          console.log('Session updated with quiz information');
          
        } catch (quizError) {
          console.error('Failed to create assessment quiz:', quizError);
          // Don't fail the entire session creation, just warn
          alert('Session created successfully, but failed to create assessment quiz. You can create the quiz manually later.');
        }
      }

      // Send notification to tutor and refresh sessions
      await notifyTutorOfNewSession(newSession);
      const sessionsData = await API.lessons.getLessonSessions(selectedLesson.id);
      setSessions(sessionsData.sessions || []);
      
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    } finally {
      setIsCreatingBatchSessions(false);
    }
  };

  // Batch session creation with Zoom integration
  const handleBatchSessionCreationWithZoom = async () => {
    setIsCreatingBatchSessions(true);
    
    try {
      // Prepare sessions data similar to existing handleBatchSessionCreation
      const sessionsToCreate = [];
      
      console.log('Processing selected time slots:', selectedTimeSlots);
      console.log('Available tutor availability:', tutorAvailability);
      console.log('Selected module:', selectedModule);
      
      for (const slotKey of selectedTimeSlots) {
        console.log(`Processing slot key: ${slotKey}`);
        
        // Split slot key - NEW format: tutorId_date_timeSlotId (e.g., user_e30c7ffd_2025-09-02_availability_988c369a)
        const parts = slotKey.split('_');
        if (parts.length < 4) {
          console.warn(`Invalid slot key format: ${slotKey}. Expected at least 4 parts separated by underscores.`);
          continue;
        }
        
        // New format handling for date-specific availability
        // Format: user_e30c7ffd_2025-09-02_availability_988c369a
        const tutorId = `${parts[0]}_${parts[1]}`; // e.g., "user_e30c7ffd"
        const date = parts[2]; // e.g., "2025-09-02"
        const timeSlotId = parts.slice(3).join('_'); // e.g., "availability_988c369a"
        
        console.log(`Parsed: tutorId=${tutorId}, date=${date}, timeSlotId=${timeSlotId}`);
        
        const tutor = tutorAvailability?.find(t => t.id === tutorId);
        
        if (!tutor) {
          console.warn(`Tutor not found for ${tutorId}`);
          console.warn('Available tutors:', tutorAvailability?.map(t => t.id));
          continue;
        }
        
        // Use the properly parsed date from above
        const timeSlot = findTimeSlotByDateAndTime(tutor.availability, date, timeSlotId);
        
        if (!timeSlot) {
          console.warn(`TimeSlot not found for ${slotKey} - tutorId: ${tutorId}, date: ${date}, timeSlotId: ${timeSlotId}`);
          continue;
        }
        
        const startTime = timeSlot.startTime;
        const endTime = timeSlot.endTime;
        const slotTimezone = timeSlot.timeZone || timeSlot.timezone || tutor.timeZone || tutor.timezone || courseTimezone;
        
        console.log(`Time slot details: startTime=${startTime}, date=${date}, timezone=${slotTimezone}`);
        
        if (!date || !startTime) {
          console.warn(`Unable to calculate date for ${slotKey} - date: ${date}, startTime: ${startTime}`);
          if (!selectedModule) console.warn('No selected module for date calculation');
          if (!selectedModule?.startDate) console.warn('Module missing start date');
          if (!selectedModule?.endDate) console.warn('Module missing end date');
          continue;
        }
        
        const sessionToCreate = {
          title: sessionForm.title || selectedLesson.title,
          description: sessionForm.description || `Session for ${selectedLesson.title}`,
          scheduledDate: `${date}T${startTime}:00`,
          timezone: slotTimezone, // Use individual slot timezone
          duration: sessionForm.duration,
          maxStudents: sessionForm.max_participants,
          tutorId: tutorId,
          courseId: selectedModule?.courseId || course?.id,
          moduleId: selectedModule?.id,
          lessonId: selectedLesson.id,
          availability_id: timeSlotId, // Link session to tutor availability slot
          status: 'scheduled',
          price: sessionForm.price || course?.price || 0 // Inherit price from sessionForm or course
        };
        
        console.log('🔍 DEBUGGING: Adding session to batch with tutorId:', {
          tutorId: tutorId,
          sessionToCreate: sessionToCreate,
          expectedUpcomingEndpoint: `/sessions/upcoming?userId=${tutorId}&userType=tutor`
        });
        
        sessionsToCreate.push(sessionToCreate);
      }
      
      console.log('Sessions to create:', sessionsToCreate);
      
      if (sessionsToCreate.length === 0) {
        throw new Error('No valid sessions could be created from selected time slots. Please check that tutors have availability set and modules have valid date ranges.');
      }
      
      // Create batch sessions
      const result = await API.sessions.createBatchSessions(course.id, sessionsToCreate);
      
      if (result.created_count > 0) {
        // Create Zoom meetings and send notifications for each session
        if (result.sessions) {
          for (const session of result.sessions) {
            try {
              const zoomResponse = await API.zoom.createSessionMeeting(course, session);
              
              // Update session with Zoom details
              if (zoomResponse.meeting_url) {
                await API.sessions.updateSession(session.id, {
                  meeting_link: zoomResponse.meeting_url,
                  meeting_id: zoomResponse.meeting_id,
                  meeting_password: zoomResponse.meeting_password,
                  meeting_start_url: zoomResponse.start_url,
                  meeting_uuid: zoomResponse.meeting_uuid
                });
              }
            } catch (zoomError) {
              console.warn(`Failed to create Zoom meeting for session ${session.id}:`, zoomError);
              // Continue with other sessions
            }
            
            // Send notification to tutor for each session
            try {
              await notifyTutorOfNewSession(session);
            } catch (notificationError) {
              console.warn(`Failed to notify tutor for session ${session.id}:`, notificationError);
              // Continue with other sessions
            }
          }
        }
        
        // Refresh sessions
        const sessionsData = await API.lessons.getLessonSessions(selectedLesson.id);
        setSessions(sessionsData.sessions || []);
        
        alert(`Successfully created ${result.created_count} sessions with Zoom meetings!`);
        
        // Reset form
        setSelectedTimeSlots([]);
        setSessionMappings({});
      }
      
    } catch (error) {
      console.error('Failed to create batch sessions:', error);
      throw error;
    } finally {
      setIsCreatingBatchSessions(false);
    }
  };

  // Notification functions
  const notifyTutorOfNewSession = async (session) => {
    try {
      if (!session.tutor_id) return;
      
      const sessionDate = session.scheduled_date ? 
        formatDateTime(session.scheduledDate || session.scheduled_date, session.timezone) : 'TBD';
      
      const notificationData = {
        user_id: session.tutor_id,
        type: 'session_assigned',
        title: 'New Session Assigned',
        message: `You have been assigned to teach "${session.title}" for ${course.title}. Session date: ${sessionDate}`,
        data: {
          session_id: session.id,
          course_id: course.id,
          lesson_id: selectedLesson.id,
          session_title: session.title,
          scheduled_date: session.scheduled_date,
          meeting_link: session.meeting_link
        }
      };
      
      await API.notifications.createNotification(notificationData);
      console.log('Tutor notification sent successfully');
    } catch (error) {
      console.error('Failed to notify tutor:', error);
      // Don't fail session creation if notification fails
    }
  };

  const notifyAdminOfFullSession = async (session) => {
    try {
      // Get admin users
      const adminUsers = await API.users.getAllUsers('admin');
      
      for (const admin of adminUsers) {
        const notificationData = {
          user_id: admin.id,
          type: 'session_full',
          title: 'Session Full',
          message: `Session "${session.title}" for ${course.title} is now full (${session.max_participants}/${session.max_participants} participants)`,
          data: {
            session_id: session.id,
            course_id: course.id,
            lesson_id: selectedLesson.id,
            session_title: session.title,
            enrolled_count: session.studentIds?.length || 0,
            max_participants: session.max_participants
          }
        };
        
        await API.notifications.createNotification(notificationData);
      }
      console.log('Admin notifications sent for full session');
    } catch (error) {
      console.error('Failed to notify admins of full session:', error);
    }
  };

  const checkAndNotifyIfSessionFull = async (session) => {
    const enrolledCount = session.studentIds?.length || 0;
    const maxParticipants = session.max_participants || session.maxStudents || 2;
    
    if (enrolledCount >= maxParticipants) {
      await notifyAdminOfFullSession(session);
    }
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (modalMode === 'create') {
        // Check if we're in availability modal with selected time slots
        if (showAvailabilityModal && selectedTimeSlots.length > 0) {
          // Validate assessment quiz form if it's an assessment session
          if (sessionForm.sessionType === 'assessment') {
            if (!assessmentQuizForm.topic || !assessmentQuizForm.title || 
                !assessmentQuizForm.numberOfQuestions || !assessmentQuizForm.passingScore) {
              alert('Please complete all assessment quiz fields');
              return;
            }
          }
          
          if (selectedTimeSlots.length > 1) {
            await handleBatchSessionCreationWithZoom();
          } else {
            await handleSingleSessionCreationWithZoom();
          }
        } else {
          // Regular session creation from session modal
          const sessionData = {
            ...sessionForm,
            lesson_id: selectedLesson.id
          };
          
          const newSession = await API.sessions.createSession(sessionData);
          
          // Create Zoom meeting if session creation successful
          try {
            const zoomResponse = await API.zoom.createSessionMeeting(course, newSession);
            
            // Update session with Zoom details
            if (zoomResponse.meeting_url) {
              await API.sessions.updateSession(newSession.id, {
                meeting_link: zoomResponse.meeting_url,
                meeting_id: zoomResponse.meeting_id,
                meeting_password: zoomResponse.meeting_password,
                meeting_start_url: zoomResponse.start_url,
                meeting_uuid: zoomResponse.meeting_uuid
              });
            }
          } catch (zoomError) {
            console.warn('Failed to create Zoom meeting:', zoomError);
            // Continue without Zoom integration
          }
          
          // Send notification to tutor
          await notifyTutorOfNewSession(newSession);
          
          setSessions(prev => [...prev, newSession]);
        }
      } else {
        const updatedSession = await API.sessions.updateSession(editingItem.id, sessionForm);
        setSessions(prev => prev.map(s => s.id === editingItem.id ? updatedSession : s));
      }
      
      setShowSessionModal(false);
      setShowAvailabilityModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Failed to save session:', err);
      alert(`Failed to save session: ${err.message}`);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await API.sessions.deleteSession(sessionId);
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } catch (err) {
        console.error('Failed to delete session:', err);
        alert('Failed to delete session');
      }
    }
  };

  // Quiz handlers
  const handleQuizFormChange = (e) => {
    const { name, value } = e.target;
    setQuizForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Assessment quiz form handler
  const handleAssessmentQuizFormChange = (e) => {
    const { name, value } = e.target;
    setAssessmentQuizForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOpenQuizModal = () => {
    if (!selectedModule) {
      alert('Please select a module first');
      return;
    }
    
    // Load lessons for the selected module
    if (lessons.length > 0) {
      setAvailableTopics(lessons);
    }
    
    // Reset form
    setQuizForm({
      topic: '',
      title: '',
      difficulty: 'medium',
      timeLimit: '30',
      numberOfQuestions: '',
      passingScore: ''
    });
    
    setShowQuizModal(true);
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!quizForm.topic || !quizForm.title || !quizForm.numberOfQuestions || !quizForm.passingScore) {
        alert('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      // Get lesson information for topic name
      const selectedLesson = availableTopics.find(lesson => lesson.id === quizForm.topic);
      const lessonName = selectedLesson ? selectedLesson.title : '';

      // Create lessonQuizData object with the specified format
      const lessonQuizData = {
        title: quizForm.title,
        numQuestions: parseInt(quizForm.numberOfQuestions),
        difficulty: quizForm.difficulty,
        timeLimit: parseInt(quizForm.timeLimit),
        passingScore: parseInt(quizForm.passingScore),
        topic: lessonName,
        gradeLevel: course?.gradeLevel,
        country: course?.country
      };
      
      // Debug logging for quiz creation
      console.log('Quiz creation payload with course details:', lessonQuizData);
      console.log('Course gradeLevel:', course?.gradeLevel);
      console.log('Course country:', course?.country);

      // Get moduleId and lessonId
      const moduleId = selectedModule.id;
      const lessonId = quizForm.topic;

      // Generate lesson level quiz with lessonId parameter
      const result = await API.quizzes.generateQuizWithAI(moduleId, lessonQuizData, lessonId);

      alert('Quiz created successfully!');
      
      // Close modal and refresh quizzes
      setShowQuizModal(false);
      
      // Refresh quizzes list
      if (selectedModule) {
        const quizzesData = await API.quizzes.getQuizzes(selectedModule.id);
        setQuizzes(quizzesData.quizzes || []);
      }
      
    } catch (error) {
      console.error('Failed to create quiz:', error);
      alert('Failed to create quiz: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenQuizEditModal = (quiz) => {
    setEditingQuiz(quiz);
    
    // Format dates for input fields
    const formatDateForInput = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toISOString().slice(0, 16); // Format as 'YYYY-MM-DDTHH:mm'
    };
    
    setQuizEditForm({
      title: quiz.title || '',
      description: quiz.description || '',
      passingScore: quiz.passingScore || '70',
      timeLimit: quiz.timeLimit || '',
      validFrom: formatDateForInput(quiz.validFrom),
      validUntil: formatDateForInput(quiz.validUntil)
    });
    
    setShowQuizEditModal(true);
  };

  const handleQuizEditFormChange = (e) => {
    const { name, value } = e.target;
    setQuizEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuizEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate dates
      if (quizEditForm.validFrom && quizEditForm.validUntil) {
        const fromDate = new Date(quizEditForm.validFrom);
        const untilDate = new Date(quizEditForm.validUntil);
        
        if (fromDate >= untilDate) {
          alert('Valid from date must be before valid until date');
          setIsSubmitting(false);
          return;
        }
      }

      // Validate passing score
      const passingScore = parseInt(quizEditForm.passingScore);
      if (isNaN(passingScore) || passingScore < 0 || passingScore > 100) {
        alert('Passing score must be between 0 and 100');
        setIsSubmitting(false);
        return;
      }

      // Prepare data for submission
      const quizData = {
        title: quizEditForm.title,
        description: quizEditForm.description,
        passingScore: passingScore,
        timeLimit: quizEditForm.timeLimit ? parseInt(quizEditForm.timeLimit) : null,
        validFrom: quizEditForm.validFrom ? new Date(quizEditForm.validFrom).toISOString() : null,
        validUntil: quizEditForm.validUntil ? new Date(quizEditForm.validUntil).toISOString() : null
      };

      const response = await API.quizzes.updateQuiz(editingQuiz.id, quizData);
      
      // Update the quiz in local state
      setQuizzes(prev => prev.map(q => 
        q.id === editingQuiz.id ? response.quiz : q
      ));
      
      alert('Quiz updated successfully!');
      setShowQuizEditModal(false);
      
    } catch (error) {
      console.error('Failed to update quiz:', error);
      alert('Failed to update quiz: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      try {
        const response = await API.quizzes.deleteQuiz(quizId);
        
        // Remove the quiz from the local state
        setQuizzes(prev => prev.filter(q => q.id !== quizId));
        
        // Show success message with details if available
        const message = response.message || 'Quiz deleted successfully!';
        alert(message);
      } catch (error) {
        console.error('Failed to delete quiz:', error);
        
        // Handle specific error cases
        let errorMessage = 'Failed to delete quiz';
        
        if (error.message && error.message.includes('403')) {
          errorMessage = 'You do not have permission to delete this quiz. Admin access required.';
        } else if (error.message && error.message.includes('400')) {
          // This likely means quiz has results
          errorMessage = 'Cannot delete this quiz because students have already taken it. Consider archiving it instead.';
        } else if (error.message) {
          errorMessage = `Failed to delete quiz: ${error.message}`;
        }
        
        alert(errorMessage);
      }
    }
  };

  // Credit management functions
  const refreshStudentCredits = async () => {
    try {
      console.log('🔄 Refreshing student credits for user:', currentUser?.id);
      const userProfile = await API.users.getProfile(currentUser.id);
      const newCreditBalance = userProfile.credits || userProfile.availableCredits || 0;
      
      console.log('✅ Credits refreshed:', { 
        old: studentCredits, 
        new: newCreditBalance,
        creditAllocations: userProfile.creditAllocations 
      });
      setStudentCredits(newCreditBalance);
      
      return newCreditBalance;
    } catch (error) {
      console.error('❌ Failed to refresh student credits:', error);
      // Don't update credits on error - keep existing value
      return studentCredits;
    }
  };

  // Session enrollment handlers
  const handleSessionEnroll = async (sessionId) => {
    console.log('🔥 handleSessionEnroll called with sessionId:', sessionId);
    console.log('🔥 availableSessions:', availableSessions);
    console.log('🔥 studentCredits:', studentCredits);
    
    const session = availableSessions.find(s => s.id === sessionId);
    console.log('🔥 Found session:', session);
    
    if (!session) {
      console.error('❌ Session not found for ID:', sessionId);
      alert('Session not found. Please refresh the page.');
      return;
    }
    
    // Check credits
    if (studentCredits < session.creditsNeeded) {
      console.log('❌ Insufficient credits:', { studentCredits, needed: session.creditsNeeded });
      alert('Insufficient credits. Please purchase more credits.');
      handleBuyCredits(session.creditsNeeded - studentCredits);
      return;
    }
    
    console.log('✅ Opening recurring session booking');
    
    // Simplified booking - just do single session for now 
    const result = confirm(`📅 Book "${session.title}"?\n\nThis will book a single session and deduct ${session.creditsNeeded || session.price || 30} credits.`);
    
    if (result) {
      // Call single session booking directly
      await handleRecurringConfirm(false, session);
    } else {
      console.log('❌ Booking cancelled by user');
    }
    
    console.log('✅ Booking process completed');
  };

  const handleRecurringConfirm = async (isRecurring, sessionParam = null) => {
    const session = sessionParam || selectedSessionForEnrollment;
    setShowRecurringModal(false);
    
    console.log('🔥 handleRecurringConfirm called with session:', session?.id, 'isRecurring:', isRecurring);
    
    if (!session) {
      console.error('❌ No session available for booking');
      alert('Booking failed: Session not found');
      return;
    }
    
    try {
      if (isRecurring) {
        // Create recurring session booking
        const recurringData = {
          sessionId: session.id,
          userId: currentUser.id,
          isRecurring: true,
          sessionCount: 12,
          frequency: 'weekly',
          totalCredits: session.creditsNeeded * 12
        };
        
        await API.sessions.createRecurringBooking(recurringData);
        alert('✅ Recurring sessions booked! 12 weekly sessions created.');
      } else {
        // Single session enrollment
        await API.sessions.enrollStudent(session.id, currentUser.id);
        alert('✅ Single session booked!');
      }
      
      // Refresh sessions and credits
      if (selectedLesson && currentUser) {
        const credits = await refreshStudentCredits();
        const sessionsData = await API.lessons.getLessonSessions(selectedLesson.id);
        const allSessions = sessionsData.sessions || [];
        
        const { availableSessions: available, attendedSessions: attended, enrolledUpcomingSessions: enrolled } = categorizeSessionsForStudent(
          allSessions, 
          currentUser.id, 
          credits
        );
        
        setSessions(allSessions);
        setAvailableSessions(available);
        setAttendedSessions(attended);
        setEnrolledUpcomingSessions(enrolled);
      }
      
    } catch (error) {
      console.error('Enrollment failed:', error);
      const errorMessage = error.response?.data?.error || 'Booking failed. Please try again.';
      alert(`❌ ${errorMessage}`);
    } finally {
      setSelectedSessionForEnrollment(null);
    }
  };

  // Session cancellation handler
  const handleCancelSession = async (sessionId) => {
    try {
      const session = enrolledUpcomingSessions.find(s => s.id === sessionId) || 
                     sessions.find(s => s.id === sessionId);
      
      if (!session) {
        alert('Session not found. Please refresh the page.');
        return;
      }

      if (!canCancelSession(session)) {
        alert('Cannot cancel session. Cancellations must be made at least 24 hours before the session starts.');
        return;
      }

      const creditsToRefund = session.creditsNeeded || session.price || 0;
      const confirmMessage = `Cancel "${session.title}"?\n\nYou will receive ${creditsToRefund} credits as a refund.`;
      
      if (!confirm(confirmMessage)) return;

      console.log('🔥 Cancelling session:', sessionId);
      
      // Call cancellation API
      await API.sessions.cancelEnrollment(sessionId, currentUser.id);
      
      alert(`✅ Session cancelled successfully! ${creditsToRefund} credits refunded.`);
      
      // Refresh sessions and credits
      if (selectedLesson && currentUser) {
        const credits = await refreshStudentCredits();
        const sessionsData = await API.lessons.getLessonSessions(selectedLesson.id);
        const allSessions = sessionsData.sessions || [];
        
        const { availableSessions: available, attendedSessions: attended, enrolledUpcomingSessions: enrolled } = categorizeSessionsForStudent(
          allSessions, 
          currentUser.id, 
          credits
        );
        
        setSessions(allSessions);
        setAvailableSessions(available);
        setAttendedSessions(attended);
        setEnrolledUpcomingSessions(enrolled);
      }
      
    } catch (error) {
      console.error('Cancellation failed:', error);
      const errorMessage = error.response?.data?.error || 'Cancellation failed. Please try again.';
      alert(`❌ ${errorMessage}`);
    }
  };

  const handleBuyCredits = (creditsNeeded) => {
    // Navigate to payment page with credit requirement
    navigate('/payment', { 
      state: { 
        creditsNeeded,
        returnUrl: window.location.pathname,
        sessionContext: selectedLesson?.id
      }
    });
  };

  // Recurring Session Modal Component
  const RecurringSessionModal = () => {
    console.log('🔥 RecurringSessionModal render - showRecurringModal:', showRecurringModal, 'selectedSession:', !!selectedSessionForEnrollment);
    if (!showRecurringModal || !selectedSessionForEnrollment) {
      console.log('🔥 Modal returning null');
      return null;
    }
    console.log('🔥 Modal rendering!');
    
    const session = selectedSessionForEnrollment;
    const recurringCost = session.creditsNeeded * 12;
    const canAffordRecurring = studentCredits >= recurringCost;
    
    const formatDate = (dateString, timezone = null) => {
      if (!dateString) return 'TBD';
      const date = formatSessionDate(dateString, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }, timezone);
      const time = formatSessionTime(dateString, { hour: '2-digit', minute: '2-digit' }, timezone);
      return `${date} ${time}`;
    };

    return (
      <div className="modal-overlay" onClick={() => setShowRecurringModal(false)}>
        <div className="modal-content recurring-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>📅 Recurring Session Booking</h3>
            <button className="modal-close" onClick={() => setShowRecurringModal(false)}>×</button>
          </div>
          
          <div className="modal-body">
            <p><strong>Would you like this session to recur weekly?</strong></p>
            
            <div className="recurring-details">
              <div className="detail-row">
                <span className="label">Session:</span>
                <span className="value">{session.title}</span>
              </div>
              <div className="detail-row">
                <span className="label">First Session:</span>
                <span className="value">{formatDate(session.scheduledDate || session.scheduled_date)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Frequency:</span>
                <span className="value">Weekly for 12 sessions</span>
              </div>
              <div className="detail-row">
                <span className="label">Single Session Cost:</span>
                <span className="value">{session.creditsNeeded} credits</span>
              </div>
              <div className="detail-row">
                <span className="label">Total Recurring Cost:</span>
                <span className="value">{recurringCost} credits</span>
              </div>
              <div className="detail-row">
                <span className="label">Your Balance:</span>
                <span className="value">{studentCredits} credits</span>
              </div>
            </div>
            
            <div className="booking-info">
              <h4>📋 Booking Status Information:</h4>
              <ul>
                <li><strong>First Session:</strong> Will be {session.bookingStatus}</li>
                <li><strong>Future Sessions:</strong> On hold until 8hrs before each</li>
                <li><strong>Cancellation:</strong> {session.canCancelBooking ? 'Available until 8hrs before' : 'Not available (too close to start)'}</li>
              </ul>
            </div>
          </div>
          
          <div className="modal-actions">
            {canAffordRecurring ? (
              <>
                <button onClick={() => handleRecurringConfirm(true)} className="btn btn-primary recurring-btn">
                  📅 Book Recurring (12 sessions)
                </button>
                <button onClick={() => handleRecurringConfirm(false)} className="btn btn-secondary single-btn">
                  📄 Book Single Session Only
                </button>
              </>
            ) : canAffordSession(studentCredits, session.creditsNeeded) ? (
              <>
                <button onClick={() => handleRecurringConfirm(false)} className="btn btn-secondary single-btn">
                  📄 Book Single Session Only
                </button>
                <button 
                  onClick={() => {
                    setShowRecurringModal(false);
                    handleBuyCredits(recurringCost - studentCredits);
                  }} 
                  className="btn btn-outline buy-credits-btn"
                >
                  💳 Buy Credits for Recurring ({recurringCost - studentCredits} needed)
                </button>
              </>
            ) : (
              <button 
                onClick={() => {
                  setShowRecurringModal(false);
                  handleBuyCredits(session.creditsNeeded - studentCredits);
                }} 
                className="btn btn-primary buy-credits-btn"
              >
                💳 Buy Credits ({session.creditsNeeded - studentCredits} needed)
              </button>
            )}
            <button onClick={() => setShowRecurringModal(false)} className="btn btn-outline cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Session Card Components
  const AvailableSessionCard = ({ session, onEnroll, onBuyCredits }) => {
    const canAfford = session.canAfford;
    const hoursUntil = session.hoursUntilSession;
    const isSessionSoon = hoursUntil <= 0;
    
    const formatDateTime = (dateString, timezone = null) => {
      if (!dateString) return 'TBD';
      const date = formatSessionDate(dateString, { weekday: 'short', month: 'short', day: 'numeric' }, timezone);
      const time = formatSessionTime(dateString, { hour: '2-digit', minute: '2-digit' }, timezone);
      return `${date} ${time}`;
    };

    return (
      <div className={`session-card available ${session.bookingStatus}`}>
        <div className="session-header">
          <h5>{session.title}</h5>
          <span className={`booking-status-badge ${session.bookingStatus}`}>
            {session.bookingStatus === 'confirmed' ? '✅ Confirmed' : '⏳ Available'}
          </span>
        </div>
        
        <div className="session-details">
          <div className="session-datetime">
            <span className="datetime">📅 {formatDateTime(session.scheduledDate || session.scheduled_date)}</span>
          </div>
          
          <div className="session-info-row">
            <span className="timing-info">
              ⏰ {hoursUntil > 0 ? `${Math.round(hoursUntil)}hrs until session` : 'Session starting soon'}
            </span>
          </div>
          
          {session.description && (
            <div className="session-description">
              <p>{session.description}</p>
            </div>
          )}
          
          <div className="session-capacity">
            <span>👥 {session.enrolled_count || 0}/{session.maxStudents || 'Unlimited'} students</span>
          </div>
        </div>
        
        <div className="session-cost-info">
          <div className="cost-row">
            <span className="label">💳 Session Cost:</span>
            <span className="value">{session.creditsNeeded} credits</span>
          </div>
          <div className="cost-row">
            <span className="label">💰 Your Balance:</span>
            <span className="value">{studentCredits} credits</span>
          </div>
        </div>
        
        <div className="session-actions">
          {canAfford ? (
            <button 
              type="button"
              onClick={() => onEnroll(session.id)} 
              className="btn btn-primary enroll-btn"
              disabled={isSessionSoon}
            >
              {isSessionSoon ? 'Session Started' : '📅 Book Now'}
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => onBuyCredits(session.creditsNeeded - studentCredits)} 
              className="btn btn-outline buy-credits-btn"
            >
              💳 Buy Credits
            </button>
          )}
        </div>
      </div>
    );
  };

  const ConcludedSessionCard = ({ session }) => {
    const formatDateTime = (dateString, timezone = null) => {
      if (!dateString) return 'TBD';
      const date = formatSessionDate(dateString, { weekday: 'short', month: 'short', day: 'numeric' }, timezone);
      const time = formatSessionTime(dateString, { hour: '2-digit', minute: '2-digit' }, timezone);
      return `${date} ${time}`;
    };

    return (
      <div className="session-card concluded">
        <div className="session-header">
          <h5>{session.title}</h5>
          <span className="completion-badge">✅ Completed</span>
        </div>
        
        <div className="session-details">
          <div className="session-datetime">
            <span className="datetime">📅 {formatDateTime(session.scheduledDate || session.scheduled_date)}</span>
          </div>
          
          {session.description && (
            <div className="session-description">
              <p>{session.description}</p>
            </div>
          )}
          
          <div className="session-stats">
            <span className="duration">⏱️ {session.duration || 60} minutes</span>
            <span className="credits-used">💳 {session.creditsNeeded || session.credits_required || session.price || 0} credits used</span>
          </div>
          
          {session.session_rating && (
            <div className="session-rating">
              <span>⭐ Rating: {session.session_rating}/5</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="course-detail-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-detail-page">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/admin')} className="btn btn-primary">
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-detail-page">
        <div className="error-container">
          <h2>Course Not Found</h2>
          <button onClick={() => navigate('/admin')} className="btn btn-primary">
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Availability-based session creation functions

  const handleTimeSlotSelection = (tutorId, date, timeSlot) => {
    const slotKey = `${tutorId}_${date}_${timeSlot.id}`;
    setSelectedTimeSlots(prev => {
      if (prev.includes(slotKey)) {
        // Remove if already selected
        const newSlots = prev.filter(key => key !== slotKey);
        // Also remove the mapping
        setSessionMappings(prevMappings => {
          const newMappings = { ...prevMappings };
          delete newMappings[slotKey];
          return newMappings;
        });
        return newSlots;
      } else {
        // Add if not selected and auto-populate with lesson title
        setSessionMappings(prevMappings => ({
          ...prevMappings,
          [slotKey]: {
            title: `${selectedLesson.title} Session`,
            description: `Live session for ${selectedLesson.title}`,
            duration: 60,
            maxStudents: 30,
            topic: selectedLesson.title
          }
        }));
        return [...prev, slotKey];
      }
    });
  };

  const handleSessionMapping = (slotKey, sessionData) => {
    setSessionMappings(prev => ({
      ...prev,
      [slotKey]: sessionData
    }));
  };

  const handleBatchSessionCreation = async () => {
    console.log('handleBatchSessionCreation called - function start');
    
    if (selectedTimeSlots.length === 0) {
      alert('Please select at least one time slot');
      return;
    }

    // Validation checks
    if (!course || !course.id) {
      alert('Course information is missing. Please refresh the page.');
      return;
    }

    if (!selectedLesson || !selectedLesson.id) {
      alert('Please select a lesson first.');
      return;
    }

    if (!selectedModule || !selectedModule.id) {
      alert('Module information is missing. Please refresh the page.');
      return;
    }

    console.log('Starting batch session creation with:', {
      course_id: course.id,
      lesson_id: selectedLesson.id,
      module_id: selectedModule.id,
      selected_slots: selectedTimeSlots.length,
      tutor_availability: tutorAvailability?.length || 0
    });

    // Validate that all selected slots have session mappings
    const missingMappings = selectedTimeSlots.filter(slotKey => !sessionMappings[slotKey]);
    if (missingMappings.length > 0) {
      alert('Please provide lesson details for all selected time slots');
      return;
    }

    setIsCreatingBatchSessions(true);
    
    // Initialize sessions array outside try block to ensure it's always accessible
    let sessionsToCreate = [];
    
    try {
      // Critical check: Ensure tutorAvailability is valid before proceeding
      if (!tutorAvailability || !Array.isArray(tutorAvailability) || tutorAvailability.length === 0) {
        throw new Error('Tutor availability data is not loaded. Please refresh the page and try again.');
      }
      
      // Check if tutors have availability property
      const tutorsWithoutAvailability = tutorAvailability.filter(tutor => !tutor.availability);
      if (tutorsWithoutAvailability.length > 0) {
        console.error('Tutors without availability:', tutorsWithoutAvailability);
        throw new Error(`Some tutors are missing availability data. Tutors: ${tutorsWithoutAvailability.map(t => t.name || t.id).join(', ')}. Please refresh the page.`);
      }
      
      // Convert selected time slots to session data with Zoom meetings
      console.log('Before Promise.all - tutorAvailability:', tutorAvailability);
      console.log('Selected time slots:', selectedTimeSlots);
      
      sessionsToCreate = await Promise.all(selectedTimeSlots.map(async (slotKey, index) => {
        console.log(`Processing slot ${index}: ${slotKey}`);
        
        // Parse slot key format: user_e30c7ffd_2025-09-02_availability_988c369a
        // Handle cases where timeSlotId might contain underscores
        const parts = slotKey.split('_');
        if (parts.length < 4) {
          throw new Error(`Invalid slot key format: ${slotKey}`);
        }
        
        const tutorId = `${parts[0]}_${parts[1]}`; // "user_e30c7ffd"
        const date = parts[2]; // "2025-09-02"
        const timeSlotId = parts.slice(3).join('_'); // "availability_988c369a"
        
        const mapping = sessionMappings[slotKey];
        
        console.log(`Looking for tutor ID: ${tutorId}`);
        console.log(`Parsed parts:`, { tutorId, date, timeSlotId });
        console.log('Available tutors:', tutorAvailability?.map(t => ({ id: t.id, name: t.name, hasAvailability: !!t.availability })));
        
        // Find tutor with defensive checks
        const tutor = tutorAvailability?.find(t => t.id === tutorId);
        if (!tutor) {
          console.error(`Tutor not found for ID: ${tutorId}`);
          console.error('Available tutor IDs:', tutorAvailability?.map(t => t.id));
          throw new Error(`Tutor not found for ID: ${tutorId}. Please refresh the page and try again.`);
        }
        
        console.log(`Found tutor:`, tutor);
        console.log(`Tutor availability structure:`, tutor.availability);
        
        // Use the properly parsed date from above
        const timeSlot = findTimeSlotByDateAndTime(tutor.availability, date, timeSlotId);
        
        if (!timeSlot) {
          console.error(`Time slot not found for tutor ${tutor.name || tutorId} on ${date}`);
          throw new Error(`Time slot not found for ${date} ${timeSlotId}. Please refresh the page and try again.`);
        }
        
        // Create scheduled date from day and time
        const today = new Date();
        const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);
        const daysUntilSlot = (dayIndex - today.getDay() + 7) % 7 || 7; // Next occurrence of this day
        const scheduledDate = new Date(today);
        scheduledDate.setDate(today.getDate() + daysUntilSlot);
        
        const [hours, minutes] = timeSlot.startTime.split(':');
        scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Zoom integration is now handled by the backend automatically
        // No frontend Zoom API calls needed - backend will create meetings if configured

        return {
          title: mapping.title || `${selectedLesson.title} Session`,
          description: mapping.description || '',
          tutorId: tutorId,
          lessonId: selectedLesson.id,
          moduleId: selectedModule.id,
          courseId: course.id,
          scheduledDate: scheduledDate.toISOString(),
          duration: mapping.duration || 60,
          maxStudents: mapping.maxStudents || 30,
          topic: mapping.topic || selectedLesson.title,
          availability_id: timeSlotId,
          price: sessionForm.price || course?.price || 0 // Inherit price from sessionForm or course
        };
      }));

      const result = await API.sessions.createBatchSessions(course.id, sessionsToCreate);
      
      if (result.created_count > 0) {
        alert(`Successfully created ${result.created_count} sessions!`);
        setShowAvailabilityModal(false);
        setSelectedTimeSlots([]);
        setSessionMappings({});
        
        // Refresh sessions for current lesson
        if (selectedLesson) {
          try {
            const sessionsData = await API.lessons.getLessonSessions(selectedLesson.id);
            setSessions(sessionsData.sessions || []);
          } catch (err) {
            console.error('Failed to refresh sessions:', err);
          }
        }
      }
      
      if (result.conflicts.length > 0 || result.errors.length > 0) {
        let message = `Created ${result.created_count} sessions.`;
        if (result.conflicts.length > 0) {
          message += `\n\nConflicts:\n${result.conflicts.join('\n')}`;
        }
        if (result.errors.length > 0) {
          message += `\n\nErrors:\n${result.errors.join('\n')}`;
        }
        alert(message);
      }
      
    } catch (error) {
      console.error('Failed to create batch sessions:', error);
      
      // Defensive error logging
      try {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          course_id: course?.id || 'Unknown',
          sessions_data: Array.isArray(sessionsToCreate) ? sessionsToCreate : 'sessionsToCreate is not an array or is undefined'
        });
      } catch (logError) {
        console.error('Error while logging error details:', logError);
      }
      
      // Show more detailed error message
      let errorMessage = 'Failed to create sessions. Please try again.';
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please refresh the page and try again.';
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorMessage = 'Access denied. Admin permissions required.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Course not found. Please refresh the page.';
      } else if (error.message.includes('400')) {
        errorMessage = 'Invalid session data. Please check your selections.';
      }
      
      alert(errorMessage);
    } finally {
      setIsCreatingBatchSessions(false);
    }
  };

  // Helper function to find time slot by date and time
  const findTimeSlotByDateAndTime = (tutorAvailability, date, timeSlotId) => {
    if (!tutorAvailability || !Array.isArray(tutorAvailability)) {
      return null;
    }
    
    // Find availability for the specific date
    const dayAvailability = tutorAvailability.find(av => av.date === date);
    if (!dayAvailability) {
      return null;
    }
    
    // Find the specific time slot
    return dayAvailability.timeSlots.find(ts => ts.id === timeSlotId);
  };

  // Debug: Log course data structure when rendering
  console.log('Rendering course with data:', course);
  console.log('Course fields - ID:', course.id, 'Title:', course.title, 'Description:', course.description, 'Subject:', course.subject, 'Level:', course.level, 'Duration:', course.duration);

  // Handler for student module click
  const handleStudentModuleClick = async (moduleId) => {
    setActiveModuleId(moduleId);
    const module = modules.find(m => m.id === moduleId);
    
    if (module) {
      // Clear previous lesson selection
      setSelectedLesson(null);
      
      // Set selected module - this will trigger useEffect to load lessons/quizzes
      setSelectedModule(module);
      
    } else {
      setSelectedModule(null);
    }
  };

  // Handler for student lesson click
  const handleStudentLessonClick = (lessonId) => {
    setActiveLessonId(lessonId);
    const lesson = lessons.find(l => l.id === lessonId);
    if (lesson) {
      setSelectedLesson(lesson);
    }
  };

  // Handler for taking quiz
  const handleTakeQuiz = async (moduleId, lessonId = null) => {
    try {
      // First, get available quizzes for this module
      const response = await API.quizzes.getQuizzes(moduleId);
      const availableQuizzes = response.quizzes || [];
      
      if (availableQuizzes.length === 0) {
        alert('No quizzes are available for this lesson yet.');
        return;
      }
      
      // For now, take the first available quiz
      // TODO: Later we can show a quiz selection modal or filter by lesson
      const quizToTake = availableQuizzes[0];
      
      // Navigate to quiz page
      navigate(`/courses/${courseId}/modules/${moduleId}/quizzes/${quizToTake.id}`);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
      alert('Failed to load quiz. Please try again.');
    }
  };

  // Handler for joining session
  const handleJoinSession = (sessionLink) => {
    if (sessionLink) {
      window.open(sessionLink, '_blank');
    }
  };

  // Check if user is a student (or if we're testing student view)
  const forceStudentView = searchParams.get('studentView') === 'true';
  const isStudent = currentUser?.accountType === 'student' || forceStudentView;
  
  // Debug logging
  console.log('Current User:', currentUser);
  console.log('Account Type:', currentUser?.accountType);
  console.log('Force Student View:', forceStudentView);
  console.log('Is Student?:', isStudent);

  // Student View Component
  if (isStudent) {
    return (
      <div className="course-detail-page student-view">
        {/* Header */}
        <div className="student-course-header">
          <div className="header-nav">
            <button onClick={() => navigate('/dashboard')} className="back-btn">
              ← Back to Student Dashboard
            </button>
          </div>
          <div className="course-title-section">
            <h1>{course.title}</h1>
            <p className="course-description">{course.description}</p>
            <div className="course-meta">
              <span className="meta-item">📚 {course.subject || 'Subject'}</span>
              <span className="meta-item">⏱️ {course.duration || 'Duration'}</span>
              <span className="meta-item">📊 {course.level || 'Level'}</span>
            </div>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="student-course-content">
          {/* Sidebar */}
          <div className="course-sidebar">
            {/* Modules Section */}
            <div className="sidebar-section">
              <h3 className="sidebar-title">📚 Course Modules</h3>
              <div className="modules-list">
                {modules.length > 0 ? (
                  modules.map((module, index) => (
                    <div 
                      key={module.id} 
                      className={`module-item ${activeModuleId === module.id ? 'active' : ''}`}
                      onClick={() => handleStudentModuleClick(module.id)}
                    >
                      <div className="module-header">
                        <span className="module-number">Module {index + 1}</span>
                        <span className="module-status">
                          {studentProgress[module.id]?.completed ? '✅' : '○'}
                        </span>
                      </div>
                      <h4 className="module-title">{module.title}</h4>
                      {module.lessons && (
                        <p className="module-lessons-count">{module.lessons} lessons</p>
                      )}
                      {activeModuleId === module.id && lessons.length > 0 && (
                        <div className="lessons-submenu">
                          {lessons.map((lesson, lessonIndex) => (
                            <div 
                              key={lesson.id}
                              className={`lesson-item ${activeLessonId === lesson.id ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStudentLessonClick(lesson.id);
                              }}
                            >
                              <span className="lesson-number">{lessonIndex + 1}.</span>
                              <span className="lesson-title">{lesson.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="no-modules">No modules available yet</p>
                )}
              </div>
            </div>

            {/* Upcoming Sessions Section */}
            <div className="sidebar-section">
              <h3 className="sidebar-title">🎥 Upcoming Sessions</h3>
              <div className="upcoming-sessions-list">
                {/* Show enrolled sessions first, then other future sessions */}
                {(() => {
                  // Combine enrolled sessions and other future sessions, prioritizing enrolled ones
                  const otherFutureSessions = sessions
                    .filter(s => new Date(s.scheduled_date) > new Date())
                    .filter(s => !s.studentIds?.includes(currentUser?.id)) // Exclude enrolled sessions
                    .slice(0, 3 - enrolledUpcomingSessions.length); // Limit to fit total of 3
                  
                  const allUpcoming = [...enrolledUpcomingSessions, ...otherFutureSessions].slice(0, 3);
                  
                  return allUpcoming.length > 0 ? allUpcoming.map(session => (
                    <div key={session.id} className="upcoming-session-item">
                      <div className="session-date">
                        {formatDateTime(session.scheduledDate || session.scheduled_date, session.timezone)}
                        {session.studentIds?.includes(currentUser?.id) && (
                          <span className="enrolled-badge">✅ Enrolled</span>
                        )}
                      </div>
                      <h5 className="session-title">{session.title}</h5>
                      <div className="session-actions">
                        {session.zoom_link && (
                          <button 
                            className="join-session-btn-small"
                            onClick={() => handleJoinSession(session.zoom_link)}
                          >
                            Join
                          </button>
                        )}
                        {session.studentIds?.includes(currentUser?.id) && canCancelSession(session) && (
                          <button 
                            className="cancel-session-btn-small"
                            onClick={() => handleCancelSession(session.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )) : (
                    <p className="no-sessions">No upcoming sessions</p>
                  );
                })()}
              </div>
            </div>

            {/* Performance Section */}
            <div className="sidebar-section">
              <h3 className="sidebar-title">📈 Your Progress</h3>
              <div className="progress-stats">
                <div className="progress-item">
                  <span className="progress-label">Modules Completed</span>
                  <span className="progress-value">
                    {Object.values(studentProgress).filter(p => p.completed).length}/{modules.length}
                  </span>
                </div>
                <div className="progress-item">
                  <span className="progress-label">Overall Progress</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{
                        width: `${modules.length > 0 ? 
                          (Object.values(studentProgress).filter(p => p.completed).length / modules.length * 100) : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            {/* Course Chat Section */}
            <div className="sidebar-section">
              <h3 className="sidebar-title">💬 Course Discussion</h3>
              <div className="course-chat-container">
                <CourseChat courseId={course.id} user={currentUser} />
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="course-main-content">
            {selectedModule ? (
              <>
                {/* Module Header */}
                <div className="content-header">
                  <h2>{selectedModule.title}</h2>
                  <p className="module-description">{selectedModule.description}</p>
                  {selectedModule.duration && (
                    <span className="module-duration">Duration: {selectedModule.duration}</span>
                  )}
                </div>

                {/* Lesson Content */}
                {selectedLesson ? (
                  <div className="lesson-content-area">
                    <div className="lesson-header">
                      <h3>📖 {selectedLesson.title}</h3>
                      {selectedLesson.duration && (
                        <span className="lesson-duration">⏱️ {selectedLesson.duration} minutes</span>
                      )}
                    </div>
                    
                    {/* Lesson Description */}
                    {selectedLesson.description && (
                      <div className="lesson-description">
                        <p>{selectedLesson.description}</p>
                      </div>
                    )}

                    {/* Video Content */}
                    {selectedLesson.video_url && (
                      <div className="lesson-video">
                        <h4>📹 Video Lesson</h4>
                        <div className="video-container">
                          {selectedLesson.video_url.includes('youtube') || selectedLesson.video_url.includes('youtu.be') ? (
                            <iframe
                              width="100%"
                              height="400"
                              src={selectedLesson.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                              title={selectedLesson.title}
                              style={{ border: 'none' }}
                              allowFullScreen
                            ></iframe>
                          ) : (
                            <video controls width="100%" height="400">
                              <source src={selectedLesson.video_url} />
                              Your browser does not support the video tag.
                            </video>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Lesson Content */}
                    {selectedLesson.content && (
                      <div className="lesson-text-content">
                        <h4>📚 Lesson Content</h4>
                        <div className="content-box">
                          {typeof selectedLesson.content === 'string' 
                            ? selectedLesson.content 
                            : selectedLesson.content.text || JSON.stringify(selectedLesson.content)
                          }
                        </div>
                      </div>
                    )}

                    {/* Available Sessions Section - For Student Enrollment */}
                    {currentUser && (currentUser.accountType === 'student' || forceStudentView) && (
                      <div className="available-sessions-section">
                        <h4>📅 Available Sessions</h4>
                        <p className="section-description">Book sessions for this lesson. Choose single sessions or recurring weekly sessions.</p>
                        
                        {availableSessions.length > 0 ? (
                          <div className="sessions-grid">
                            {availableSessions.map(session => (
                              <AvailableSessionCard
                                key={session.id}
                                session={session}
                                onEnroll={handleSessionEnroll}
                                onBuyCredits={handleBuyCredits}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="no-sessions-message">
                            <p>💡 No available sessions for this lesson yet.</p>
                            <p>Sessions will appear here when tutors create them.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Related Sessions - Different view for Students vs Admins */}
                    <div className="lesson-sessions">
                      {currentUser && (currentUser.accountType === 'student' || forceStudentView) ? (
                        <>
                          <h4>✅ Sessions You Attended</h4>
                          <p className="section-description">Your completed sessions for this lesson.</p>
                          
                          {attendedSessions.length > 0 ? (
                            <div className="sessions-grid">
                              {attendedSessions.map(session => (
                                <ConcludedSessionCard
                                  key={session.id}
                                  session={session}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="no-sessions-message">
                              <p>📚 You haven't attended any sessions for this lesson yet.</p>
                              <p>Book available sessions above to start learning!</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <h4>🎥 All Sessions for this Lesson</h4>
                          <div className="sessions-grid">
                            {sessions.filter(s => s.lesson_id === selectedLesson.id).length > 0 ? (
                              sessions.filter(s => s.lesson_id === selectedLesson.id).map(session => (
                                <div key={session.id} className="session-card-student">
                                  <div className="session-info">
                                    <h5>{session.title}</h5>
                                    <p className="session-date">
                                      📅 {formatDateTime(session.scheduledDate || session.scheduled_date, session.timezone)}
                                    </p>
                                    <p className="session-duration">⏱️ {session.duration} minutes</p>
                                    {session.tutor_name && (
                                      <p className="session-tutor">
                                        👨‍🏫 Tutor: {session.tutor_name}
                                        {session.tutor_verified && <span className="verified-badge"> ✅</span>}
                                        {session.tutor_verified === false && <span className="unverified-badge"> ⚠️</span>}
                                      </p>
                                    )}
                                    <div className="session-capacity">
                                      👥 {session.studentIds?.length || 0}/{session.max_participants || 30} students
                                    </div>
                                  </div>
                                  {session.zoom_link && new Date(session.scheduled_date) > new Date() && (
                                    <button 
                                      className="join-session-btn"
                                      onClick={() => handleJoinSession(session.zoom_link)}
                                    >
                                      Join Session
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="no-sessions-msg">No sessions scheduled for this lesson</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Quizzes Section */}
                    {quizzes.length > 0 && (
                      <div className="lesson-quizzes">
                        <h4>📝 Quizzes & Assessments</h4>
                        <div className="quizzes-grid">
                          {quizzes.map(quiz => {
                            const now = new Date();
                            const validFrom = quiz.validFrom ? new Date(quiz.validFrom) : null;
                            const validUntil = quiz.validUntil ? new Date(quiz.validUntil) : null;
                            const isAvailable = (!validFrom || now >= validFrom) && (!validUntil || now <= validUntil);
                            
                            return (
                              <div key={quiz.id} className={`quiz-card-student ${!isAvailable ? 'unavailable' : ''}`}>
                                <div className="quiz-info">
                                  <h5>{quiz.title}</h5>
                                  {quiz.description && <p>{quiz.description}</p>}
                                  <div className="quiz-meta">
                                    <span>📊 {quiz.totalQuestions || 0} questions</span>
                                    {quiz.timeLimit && <span>⏱️ {quiz.timeLimit} minutes</span>}
                                    {quiz.passingScore && <span>✅ Pass: {quiz.passingScore}%</span>}
                                  </div>
                                  {!isAvailable && (
                                    <div className="quiz-availability">
                                      {validFrom && now < validFrom && (
                                        <p className="availability-msg">Available from: {validFrom.toLocaleDateString()}</p>
                                      )}
                                      {validUntil && now > validUntil && (
                                        <p className="availability-msg">Expired on: {validUntil.toLocaleDateString()}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {isAvailable && (
                                  <button 
                                    className="take-quiz-btn"
                                    onClick={() => handleTakeQuiz(quiz.id)}
                                  >
                                    Take Quiz
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="select-lesson-prompt">
                    <div className="prompt-content">
                      <h3>Select a Lesson</h3>
                      <p>Choose a lesson from the module to view its content, videos, and quizzes.</p>
                      {lessons.length > 0 ? (
                        <div className="lesson-cards-grid">
                          {lessons.map((lesson, index) => (
                            <div 
                              key={lesson.id}
                              className="lesson-card-prompt"
                              onClick={() => handleStudentLessonClick(lesson.id)}
                            >
                              <span className="lesson-number">Lesson {index + 1}</span>
                              <h4>{lesson.title}</h4>
                              {lesson.duration && <span className="duration">⏱️ {lesson.duration} min</span>}
                              <div className="lesson-actions">
                                <button 
                                  className="quiz-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTakeQuiz(selectedModule.id, lesson.id);
                                  }}
                                >
                                  📝 Take Quiz
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No lessons available in this module yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="welcome-content">
                <div className="welcome-box">
                  <h2>Welcome to {course.title}</h2>
                  <p>Select a module from the sidebar to begin learning.</p>
                  <div className="course-overview">
                    <h3>Course Overview</h3>
                    <p>{course.description}</p>
                    <div className="course-stats">
                      <div className="stat-item">
                        <span className="stat-icon">📚</span>
                        <span className="stat-value">{modules.length}</span>
                        <span className="stat-label">Modules</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">🎥</span>
                        <span className="stat-value">{sessions.length}</span>
                        <span className="stat-label">Sessions</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-icon">⏱️</span>
                        <span className="stat-value">{course.duration || 'Flexible'}</span>
                        <span className="stat-label">Duration</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Timezone management functions
  const handleOpenTimezoneModal = () => {
    setShowTimezoneModal(true);
  };

  const handleCloseTimezoneModal = () => {
    setShowTimezoneModal(false);
  };

  const handleTimezoneChange = async (newTimezone) => {
    setIsUpdatingTimezone(true);
    try {
      // Update course timezone via API
      await API.courses.updateCourse(courseId, { timezone: newTimezone });
      
      // Update local state
      setCourseTimezone(newTimezone);
      setShowTimezoneModal(false);
      
      alert(`Course timezone updated to ${newTimezone} successfully!`);
    } catch (error) {
      console.error('Error updating timezone:', error);
      alert('Failed to update timezone. Please try again.');
    } finally {
      setIsUpdatingTimezone(false);
    }
  };

  // List of common timezones
  const timezones = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Kolkata', label: 'Mumbai/Kolkata (IST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  ];

  // Admin/Tutor View (existing code)
  return (
    <div className="course-detail-page">
      {/* Professional Academic Header */}
      <div className="course-detail-header">
        <div className="header-content-wrapper">
          <div className="header-top-row">
            <button onClick={() => navigate('/admin')} className="back-btn">
              Back to Admin
            </button>
            <div className="course-actions-top">
              <span className={`status-badge ${course.status || 'active'}`}>
                {course.status || 'Active'}
              </span>
            </div>
          </div>
          
          <div className="course-title-section">
            <h1>{course.title}</h1>
            <p className="course-subtitle">{course.description || 'Comprehensive academic course'}</p>
          </div>
          
          <div className="course-meta-info">
            <div className="meta-item">
              <span>Subject: {course.subject || 'Not specified'}</span>
            </div>
            <div className="meta-item">
              <span>Duration: {course.duration || 'Self-paced'}</span>
            </div>
            <div className="meta-item">
              <span>Price: {formatCoursePrice(course)}</span>
            </div>
            {course.country && (
              <div className="meta-item">
                <span>Country: {course.country}</span>
              </div>
            )}
            {(course.grade_level || course.gradeLevel) && (
              <div className="meta-item">
                <span>Grade Level: {course.grade_level || course.gradeLevel}</span>
              </div>
            )}
            <div className="meta-item timezone-item">
              <span>🕐 Timezone: {courseTimezone}</span>
              {currentUser?.accountType === 'admin' && (
                <button 
                  className="timezone-settings-btn"
                  onClick={handleOpenTimezoneModal}
                  title="Change course timezone"
                >
                  ⚙️
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Wrapper */}
      <div className="course-content-wrapper">
        {/* Content Grid Layout */}
        <div className="content-grid">
        
        {/* Modules Section */}
        <div className="modules-section">
          <div className="section-header">
            <h2>Modules</h2>
            {currentUser && currentUser.accountType !== 'student' && !forceStudentView && (
              <button 
                onClick={handleCreateModule}
                className="btn btn-primary"
              >
                + Add Module
              </button>
            )}
          </div>
          
          <div className="modules-list">
            {modules.length === 0 ? (
              <div className="empty-state">
                <p>No modules yet. Create your first module to get started.</p>
              </div>
            ) : (
              modules.map(module => (
                <div 
                  key={module.id} 
                  className={`module-card ${selectedModule?.id === module.id ? 'selected' : ''}`}
                  onClick={() => setSelectedModule(module)}
                >
                  <div className="module-header">
                    <h3>{module.title}</h3>
                    {currentUser && currentUser.accountType !== 'student' && !forceStudentView && (
                      <div className="module-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditModule(module);
                          }}
                          className="btn btn-small btn-secondary"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteModule(module.id);
                          }}
                          className="btn btn-small btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="module-description">{module.description}</p>
                  <div className="module-stats">
                    <span>Order: {module.order}</span>
                    {module.lessons && (
                      <span>Lessons: {Array.isArray(module.lessons) ? module.lessons.length : 0}</span>
                    )}
                    {module.duration && (
                      <span>Duration: {module.duration}</span>
                    )}
                    {module.startDate && (
                      <span>Start: {new Date(module.startDate).toLocaleDateString()}</span>
                    )}
                    {module.endDate && (
                      <span>End: {new Date(module.endDate).toLocaleDateString()}</span>
                    )}
                    {module.created_at && (
                      <span>Created: {new Date(module.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lessons Section */}
        <div className="lessons-section">
          <div className="section-header">
            <h2>
              Lessons 
              {selectedModule && ` for "${selectedModule.title}"`}
            </h2>
            {currentUser && currentUser.accountType !== 'student' && !forceStudentView && (
              <button 
                onClick={handleCreateLesson}
                className="btn btn-primary"
                disabled={!selectedModule}
                title={!selectedModule ? "Select a module first to create lessons" : "Create a new lesson"}
              >
                + Add Lesson
              </button>
            )}
          </div>
          
          <div className="lessons-list">
            {!selectedModule ? (
              <div className="empty-state">
                <p>Select a module to view and manage its lessons.</p>
              </div>
            ) : lessons.length === 0 ? (
              <div className="empty-state">
                <p>No lessons yet. Create your first lesson for this module.</p>
              </div>
            ) : (
              lessons.map(lesson => (
                <div 
                  key={lesson.id} 
                  className={`lesson-card ${selectedLesson?.id === lesson.id ? 'selected' : ''}`}
                  onClick={() => setSelectedLesson(lesson)}
                >
                  <div className="lesson-header">
                    <h4>{lesson.title}</h4>
                    {currentUser && currentUser.accountType !== 'student' && !forceStudentView && (
                      <div className="lesson-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditLesson(lesson);
                          }}
                          className="btn btn-small btn-secondary"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLesson(lesson.id);
                          }}
                          className="btn btn-small btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="lesson-description">{lesson.description}</p>
                  <div className="lesson-stats">
                    <span>Order: {lesson.order}</span>
                    {lesson.duration > 0 && <span>Duration: {lesson.duration} min</span>}
                    {lesson.video_url && (
                      <span>📹 Video Available</span>
                    )}
                    {lesson.content && (
                      <span>📝 Content Available</span>
                    )}
                    {lesson.created_at && (
                      <span>Created: {new Date(lesson.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quizzes Section */}
        <div className="quizzes-section">
          <div className="section-header">
            <h2>
              Quizzes 
              {selectedLesson ? ` for "${selectedLesson.title}"` : selectedModule ? ` for "${selectedModule.title}"` : ' (Select a module)'}
            </h2>
            {currentUser && currentUser.accountType !== 'student' && !forceStudentView && (
              <button 
                onClick={handleOpenQuizModal}
                className="btn btn-primary"
                disabled={!selectedModule}
                title={!selectedModule ? "Select a module first to create quizzes" : "Create a new quiz"}
              >
                + Add Quiz
              </button>
            )}
          </div>
          
          <div className="quizzes-list">
            {!selectedModule ? (
              <div className="empty-state">
                <p>Select a module to view and manage its quizzes.</p>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="empty-state">
                <p>No quizzes yet. Create your first quiz for this module.</p>
              </div>
            ) : (
              quizzes.map(quiz => {
                // Determine status indicator
                const getStatusIndicator = () => {
                  if (quiz.validityStatus === 'upcoming') {
                    return <span className="status-badge upcoming">🔵 Upcoming</span>;
                  } else if (quiz.validityStatus === 'expired') {
                    return <span className="status-badge expired">🔴 Expired</span>;
                  } else if (quiz.validityStatus === 'active') {
                    return <span className="status-badge active">🟢 Active</span>;
                  }
                  return null;
                };

                return (
                  <div 
                    key={quiz.id} 
                    className={`quiz-card ${quiz.validityStatus}`}
                  >
                    <div className="quiz-header">
                      <div className="quiz-title-row">
                        <h4>{quiz.title}</h4>
                        {getStatusIndicator()}
                      </div>
                      {currentUser && currentUser.accountType !== 'student' && !forceStudentView && (
                        <div className="quiz-actions-group">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenQuizEditModal(quiz);
                            }}
                            className="btn-icon btn-edit"
                            title="Edit quiz details, passing score, duration, and validity dates"
                          >
                            <span className="btn-icon-symbol">✏️</span>
                            <span className="btn-text">Edit</span>
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuiz(quiz.id);
                            }}
                            className="btn-icon btn-delete"
                            title="Delete quiz"
                          >
                            <span className="btn-icon-symbol">🗑️</span>
                            <span className="btn-text">Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {quiz.description && (
                      <p className="quiz-description">{quiz.description}</p>
                    )}
                    <div className="quiz-stats">
                      <span>Questions: {quiz.totalQuestions || 0}</span>
                      {quiz.timeLimit && <span>Duration: {quiz.timeLimit} min</span>}
                      {quiz.passingScore && <span>Passing Score: {quiz.passingScore}%</span>}
                    </div>
                    <div className="quiz-validity">
                      {quiz.validFrom && (
                        <span className="validity-date">
                          📅 Valid from: {new Date(quiz.validFrom).toLocaleString()}
                        </span>
                      )}
                      {quiz.validUntil && (
                        <span className="validity-date">
                          📅 Valid until: {new Date(quiz.validUntil).toLocaleString()}
                        </span>
                      )}
                      {!quiz.validUntil && quiz.validFrom && (
                        <span className="validity-date">📅 No expiry date</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sessions Section */}
        <div className="sessions-section">
          <div className="section-header">
            <h2>
              Sessions 
              {selectedLesson ? ` for "${selectedLesson.title}"` : ' (Select a lesson)'}
            </h2>
            {currentUser && currentUser.accountType === 'admin' && !forceStudentView && (
              <button 
                onClick={handleCreateSession}
                className="btn btn-primary"
                disabled={!selectedLesson}
              >
                + Add Session
              </button>
            )}
          </div>
          
          <div className="sessions-list">
            {!selectedLesson ? (
              <div className="empty-state">
                <p>Select a lesson to view and manage its sessions.</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="empty-state">
                <p>No sessions yet. Create your first session for this lesson.</p>
              </div>
            ) : (
              sessions.map(session => (
                <div key={session.id} className="session-card">
                  <div className="session-datetime-banner">
                    <div className="datetime-badge">
                      📅 {formatSessionDate(session.scheduled_date || session.scheduledDate, 
                        { weekday: 'long', month: 'short', day: 'numeric' }, 
                        session.timezone)}
                    </div>
                    <div className="datetime-badge">
                      ⏰ {formatSessionTime(session.scheduled_date || session.scheduledDate, 
                        { hour: 'numeric', minute: '2-digit', hour12: true }, 
                        session.timezone)}
                    </div>
                  </div>
                  <div className="session-header">
                    <h4>{session.title}</h4>
                    {currentUser && currentUser.accountType !== 'student' && !forceStudentView && (
                      <div className="session-actions">
                        <button 
                          onClick={() => handleEditSession(session)}
                          className="btn btn-small btn-secondary"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteSession(session.id)}
                          className="btn btn-small btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="session-description">{session.description}</p>
                  
                  {/* Zoom Meeting Details */}
                  {(session.meetingId || session.meeting_id || session.meetingLink || session.meeting_link) && (
                    <div className="zoom-meeting-card">
                      <div className="zoom-header">
                        <h5>🎥 Zoom Meeting</h5>
                        <span className="zoom-status">✅ Active</span>
                      </div>
                      <div className="zoom-meeting-datetime">
                        <div className="meeting-date">
                          📅 {formatSessionDate(session.scheduled_date || session.scheduledDate, 
                            { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }, 
                            session.timezone)}
                        </div>
                        <div className="meeting-time">
                          ⏰ {formatSessionTime(session.scheduled_date || session.scheduledDate, 
                            { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }, 
                            session.timezone)}
                        </div>
                        <div className="meeting-duration">
                          ⏱️ Duration: {session.duration || 60} minutes
                        </div>
                      </div>
                      <div className="zoom-details">
                        {(session.meetingId || session.meeting_id) && (
                          <div className="meeting-info">
                            <span className="meeting-label">🆔 Meeting ID:</span>
                            <code className="meeting-value">{session.meetingId || session.meeting_id}</code>
                          </div>
                        )}
                        {(session.meetingPassword || session.meeting_password) && (
                          <div className="meeting-info">
                            <span className="meeting-label">🔐 Password:</span>
                            <code className="meeting-value">{session.meetingPassword || session.meeting_password}</code>
                          </div>
                        )}
                        {(session.meetingLink || session.meeting_link) && (
                          <div className="meeting-actions">
                            <a 
                              href={session.meetingLink || session.meeting_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-primary btn-small meeting-join-btn"
                            >
                              🚀 Join Meeting
                            </a>
                          </div>
                        )}
                        {(session.meetingStartUrl || session.meeting_start_url) && (
                          <div className="meeting-actions">
                            <a 
                              href={session.meetingStartUrl || session.meeting_start_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-small host-link"
                            >
                              👨‍💼 Start as Host
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="session-stats">
                    <span>📅 {formatSessionDate(session.scheduled_date || session.scheduledDate, 
                      { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }, 
                      session.timezone)}</span>
                    <span>⏰ {formatSessionTime(session.scheduled_date || session.scheduledDate, 
                      { hour: '2-digit', minute: '2-digit' }, 
                      session.timezone)}</span>
                    <span>⏱️ {session.duration} min</span>
                    {(() => {
                      const enrolledCount = session.studentIds?.length || 0;
                      const maxParticipants = session.max_participants || session.maxStudents || 2;
                      const isFull = enrolledCount >= maxParticipants;
                      const availableSpots = maxParticipants - enrolledCount;
                      
                      return (
                        <span className={`capacity-status ${isFull ? 'full' : 'available'}`}>
                          👥 {enrolledCount}/{maxParticipants} {isFull ? '(FULL)' : `(${availableSpots} spots left)`}
                        </span>
                      );
                    })()}
                    {session.is_recurring && (
                      <span>🔄 Recurring</span>
                    )}
                    {session.status && (
                      <span className={`session-status ${session.status.toLowerCase()}`}>
                        Status: {session.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div> {/* End of content-grid */}
      </div> {/* End of course-content-wrapper */}

      {/* Module Modal */}
      {showModuleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Create New Module' : 'Edit Module'}</h2>
              <button 
                onClick={() => setShowModuleModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleModuleSubmit}>
              <div className="form-group">
                <label>Course</label>
                <input
                  type="text"
                  value={course?.title || 'Loading...'}
                  disabled
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Module Title *</label>
                <input
                  type="text"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm(prev => ({...prev, title: e.target.value}))}
                  placeholder="Enter module title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm(prev => ({...prev, description: e.target.value}))}
                  placeholder="Enter module description"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Number of Lessons</label>
                <input
                  type="number"
                  value={moduleForm.lessons || ''}
                  onChange={(e) => setModuleForm(prev => ({...prev, lessons: e.target.value}))}
                  placeholder="Enter number of lessons"
                  min="1"
                />
                <small className="field-hint">Optional - can be updated later</small>
              </div>
              <div className="form-group">
                <label>Duration</label>
                <input
                  type="text"
                  value={moduleForm.duration || ''}
                  onChange={(e) => setModuleForm(prev => ({...prev, duration: e.target.value}))}
                  placeholder="e.g., 2 weeks"
                />
                <small className="field-hint">Optional - defaults to "1 week"</small>
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={moduleForm.startDate || ''}
                  onChange={(e) => setModuleForm(prev => ({...prev, startDate: e.target.value}))}
                />
                <small className="field-hint">Optional - When the module starts</small>
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={moduleForm.endDate || ''}
                  onChange={(e) => setModuleForm(prev => ({...prev, endDate: e.target.value}))}
                />
                <small className="field-hint">Optional - When the module ends</small>
              </div>
              <div className="form-group">
                <label>Order</label>
                <input
                  type="number"
                  value={moduleForm.order}
                  onChange={(e) => setModuleForm(prev => ({...prev, order: parseInt(e.target.value)}))}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea
                  value={moduleForm.content}
                  onChange={(e) => setModuleForm(prev => ({...prev, content: e.target.value}))}
                  placeholder="Enter module content"
                  rows="5"
                />
                <small className="field-hint">Optional - detailed module content</small>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModuleModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create' ? 'Create Module' : 'Update Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Create New Lesson' : 'Edit Lesson'}</h2>
              <button 
                onClick={() => setShowLessonModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleLessonSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm(prev => ({...prev, title: e.target.value}))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm(prev => ({...prev, description: e.target.value}))}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Order</label>
                <input
                  type="number"
                  value={lessonForm.order}
                  onChange={(e) => setLessonForm(prev => ({...prev, order: parseInt(e.target.value)}))}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  value={lessonForm.duration}
                  onChange={(e) => setLessonForm(prev => ({...prev, duration: parseInt(e.target.value)}))}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Video URL</label>
                <input
                  type="url"
                  value={lessonForm.video_url}
                  onChange={(e) => setLessonForm(prev => ({...prev, video_url: e.target.value}))}
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm(prev => ({...prev, content: e.target.value}))}
                  rows="5"
                  disabled
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowLessonModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create' ? 'Create Lesson' : 'Update Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Session Modal */}
      {showSessionModal && (
        <div className="modal-overlay">
          <div className="modal-content session-modal">
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Create New Session' : 'Edit Session'}</h2>
              <button 
                onClick={() => setShowSessionModal(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSessionSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Session Title *</label>
                  <input
                    type="text"
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm(prev => ({...prev, title: e.target.value}))}
                    placeholder="Enter session title"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Duration (minutes) *</label>
                  <select
                    value={sessionForm.duration}
                    onChange={(e) => setSessionForm(prev => ({...prev, duration: parseInt(e.target.value)}))}
                    required
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={sessionForm.description}
                  onChange={(e) => setSessionForm(prev => ({...prev, description: e.target.value}))}
                  placeholder="Brief description of the session content..."
                  rows="3"
                />
              </div>

              {/* Tutor Availability Selection */}
              <div className="form-group">
                <label>Select Assigned Tutor & Available Time Slot *</label>
                {(() => {
                  // Filter to only tutors assigned to this course who have availability
                  const assignedTutorsWithAvailability = tutorAvailability?.filter(tutor => {
                    // Check if tutor has availability data (new array format)
                    const hasAvailability = tutor.availability && 
                      Array.isArray(tutor.availability) && 
                      tutor.availability.some(dateAvail => dateAvail?.timeSlots?.length > 0);
                    return hasAvailability;
                  }) || [];

                  const hasAssignedTutors = tutorAvailability && tutorAvailability.length > 0;
                  const hasAvailableTutors = assignedTutorsWithAvailability.length > 0;

                  // Determine the state and message
                  let dropdownMessage = "";
                  let isDisabled = false;
                  
                  if (!hasAssignedTutors) {
                    dropdownMessage = "No tutors assigned to this course";
                    isDisabled = true;
                  } else if (!hasAvailableTutors) {
                    dropdownMessage = "No assigned tutors have set their availability";
                    isDisabled = true;
                  } else {
                    dropdownMessage = "Choose assigned tutor and time slot...";
                  }

                  return (
                    <>
                      <select
                        value={sessionForm.selected_availability_slot}
                        onChange={(e) => {
                          const slotKey = e.target.value;
                          if (slotKey) {
                            // Parse the slot key to extract tutor, date, and time slot info
                            // Format: user_e30c7ffd_2025-09-02_availability_988c369a
                            const parts = slotKey.split('_');
                            
                            // Handle complex slot key format with multiple underscores
                            if (parts.length < 4) {
                              console.error('Invalid slot key format:', slotKey);
                              return;
                            }
                            
                            const tutorId = `${parts[0]}_${parts[1]}`; // 'user_e30c7ffd'
                            const date = parts[2]; // '2025-09-02'
                            const timeSlotId = parts.slice(3).join('_'); // 'availability_988c369a'
                            
                            const selectedTutor = tutorAvailability?.find(t => t.id === tutorId);
                            const timeSlot = findTimeSlotByDateAndTime(selectedTutor?.availability, date, timeSlotId);
                            
                            if (!timeSlot) {
                              console.error('Time slot not found for:', { tutorId, date, timeSlotId, slotKey });
                              return;
                            }
                            
                            const scheduledDateTime = `${date}T${timeSlot.startTime}`;
                            
                            setSessionForm(prev => ({
                              ...prev,
                              tutor_id: tutorId,
                              selected_date: date,
                              selected_time_slot: timeSlotId,
                              selected_availability_slot: slotKey,
                              scheduled_date: scheduledDateTime
                            }));
                          } else {
                            // Reset form if no selection
                            setSessionForm(prev => ({
                              ...prev,
                              tutor_id: '',
                              selected_day: '',
                              selected_time_slot: '',
                              selected_availability_slot: '',
                              scheduled_date: ''
                            }));
                          }
                        }}
                        required={!isDisabled}
                        disabled={isDisabled}
                        className={`tutor-availability-dropdown ${isDisabled ? 'disabled' : ''}`}
                      >
                        <option value="">{dropdownMessage}</option>
                        {hasAvailableTutors && (() => {
                          // Create a flat list of all available time slots grouped by tutor
                          const availabilityOptions = [];
                          
                          assignedTutorsWithAvailability.forEach(tutor => {
                            // Add tutor header (disabled option)
                            availabilityOptions.push({
                              type: 'header',
                              value: '',
                              label: `━━━ ${tutor.name} ━━━`,
                              disabled: true
                            });
                            
                            // Add all time slots for this tutor (new date-specific format)
                            if (tutor.availability && Array.isArray(tutor.availability)) {
                              tutor.availability.forEach(dateAvailability => {
                                if (dateAvailability?.timeSlots?.length > 0) {
                                  // Parse date without timezone conversion issues
                                  const [year, month, day] = dateAvailability.date.split('-').map(Number);
                                  const dateObj = new Date(year, month - 1, day); // Create in local timezone
                                  const displayDate = dateObj.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric',
                                    weekday: 'short'
                                  });
                                  
                                  dateAvailability.timeSlots.forEach(timeSlot => {
                                    const slotKey = `${tutor.id}_${dateAvailability.date}_${timeSlot.id}`;
                                    const displayLabel = `   ${displayDate}, ${timeSlot.startTime} - ${timeSlot.endTime}`;
                                    
                                    availabilityOptions.push({
                                      type: 'option',
                                      value: slotKey,
                                      label: displayLabel,
                                      disabled: false
                                    });
                                  });
                                }
                              });
                            }
                            
                            // Add spacing between tutors
                            availabilityOptions.push({
                              type: 'spacer',
                              value: '',
                              label: '',
                              disabled: true
                            });
                          });
                          
                          return availabilityOptions.map((option, index) => {
                            if (option.type === 'header') {
                              return (
                                <option 
                                  key={`header-${index}`} 
                                  value="" 
                                  disabled 
                                  className="tutor-header"
                                >
                                  {option.label}
                                </option>
                              );
                            } else if (option.type === 'spacer') {
                              return (
                                <option 
                                  key={`spacer-${index}`} 
                                  value="" 
                                  disabled 
                                  className="tutor-spacer"
                                >
                                  ─────────────────────
                                </option>
                              );
                            } else {
                              return (
                                <option 
                                  key={option.value} 
                                  value={option.value}
                                  className="time-slot-option"
                                >
                                  {option.label}
                                </option>
                              );
                            }
                          });
                        })()}
                      </select>
                      <small className="field-note">
                        {!hasAssignedTutors && (
                          <span className="error-message">
                            ⚠️ No tutors are assigned to this course. Please assign tutors in the course settings first.
                          </span>
                        )}
                        {hasAssignedTutors && !hasAvailableTutors && (
                          <span className="warning-message">
                            ⏰ Assigned tutors need to set their availability in their profiles before sessions can be created.
                          </span>
                        )}
                        {hasAvailableTutors && (
                          <span className="success-message">
                            ✅ Select from available time slots of tutors assigned to this course.
                          </span>
                        )}
                      </small>
                    </>
                  );
                })()}
              </div>

              {/* Show selected date/time */}
              {sessionForm.scheduled_date && (
                <div className="form-group">
                  <label>Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    value={sessionForm.scheduled_date}
                    onChange={(e) => setSessionForm(prev => ({...prev, scheduled_date: e.target.value}))}
                    className="readonly-field"
                  />
                  <small className="field-note">Auto-filled from selected time slot</small>
                </div>
              )}

              <div className="form-group">
                <label>Max Participants</label>
                <input
                  type="number"
                  value={sessionForm.max_participants}
                  onChange={(e) => setSessionForm(prev => ({...prev, max_participants: parseInt(e.target.value)}))}
                  min="1"
                  max="2"
                />
                <small className="field-note">Maximum 2 participants per session</small>
              </div>

              <div className="form-group">
                <label>Session Price (£)</label>
                <input
                  type="number"
                  value={sessionForm.price}
                  onChange={(e) => setSessionForm(prev => ({...prev, price: parseFloat(e.target.value) || 0}))}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
                <small className="field-note">
                  {course?.price ? `Default price from course: ${formatCoursePrice(course)}` : 'Set individual session price'}
                </small>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={sessionForm.is_recurring}
                    onChange={(e) => setSessionForm(prev => ({...prev, is_recurring: e.target.checked}))}
                  />
                  <span className="checkbox-text">Make this a recurring session</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowSessionModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!sessionForm.title || (
                    modalMode === 'create' 
                      ? selectedTimeSlots.length === 0 
                      : !sessionForm.selected_availability_slot
                  )}
                >
                  {modalMode === 'create' ? 'Create Session' : 'Update Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {showQuizModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Quiz</h2>
              <button 
                onClick={() => setShowQuizModal(false)}
                className="modal-close"
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleQuizSubmit}>
              {/* Module Info (Read-only) */}
              <div className="form-group">
                <label>Module</label>
                <input
                  type="text"
                  value={selectedModule?.title || 'No module selected'}
                  disabled
                  className="form-control"
                />
              </div>

              {/* Topic/Lesson Selection */}
              <div className="form-group">
                <label>Select Lesson/Topic *</label>
                <select 
                  name="topic"
                  value={quizForm.topic}
                  onChange={handleQuizFormChange}
                  required
                  disabled={availableTopics.length === 0}
                >
                  <option value="">Select a lesson...</option>
                  {availableTopics.map(lesson => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </select>
                {availableTopics.length === 0 && (
                  <small className="text-muted">No lessons available. Please add lessons to this module first.</small>
                )}
              </div>

              {/* Quiz Title */}
              <div className="form-group">
                <label>Quiz Title *</label>
                <input
                  type="text"
                  name="title"
                  value={quizForm.title}
                  onChange={handleQuizFormChange}
                  placeholder="Enter quiz title"
                  required
                />
              </div>

              {/* Difficulty Level */}
              <div className="form-group">
                <label>Difficulty Level *</label>
                <select 
                  name="difficulty"
                  value={quizForm.difficulty}
                  onChange={handleQuizFormChange}
                  required
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* Time Limit */}
              <div className="form-group">
                <label>Time Limit (minutes) *</label>
                <input
                  type="number"
                  name="timeLimit"
                  value={quizForm.timeLimit}
                  onChange={handleQuizFormChange}
                  min="5"
                  max="180"
                  required
                />
              </div>

              {/* Number of Questions */}
              <div className="form-group">
                <label>Number of Questions *</label>
                <input
                  type="number"
                  name="numberOfQuestions"
                  value={quizForm.numberOfQuestions}
                  onChange={handleQuizFormChange}
                  placeholder="e.g., 10"
                  min="1"
                  max="50"
                  required
                />
              </div>

              {/* Passing Score */}
              <div className="form-group">
                <label>Passing Score (%) *</label>
                <input
                  type="number"
                  name="passingScore"
                  value={quizForm.passingScore}
                  onChange={handleQuizFormChange}
                  placeholder="e.g., 70"
                  min="0"
                  max="100"
                  required
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowQuizModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting || availableTopics.length === 0}
                >
                  {isSubmitting ? 'Creating Quiz...' : 'Create Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiz Edit Modal */}
      {showQuizEditModal && editingQuiz && (
        <div className="modal-overlay">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h2>Edit Quiz Settings</h2>
              <button 
                onClick={() => setShowQuizEditModal(false)}
                className="modal-close"
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleQuizEditSubmit}>
              {/* Basic Information Section */}
              <div className="form-section">
                <h3>Basic Information</h3>
                
                <div className="form-group">
                  <label>Quiz Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={quizEditForm.title}
                    onChange={handleQuizEditFormChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={quizEditForm.description}
                    onChange={handleQuizEditFormChange}
                    className="form-control"
                    rows="3"
                    placeholder="Brief description of the quiz"
                  />
                </div>
              </div>

              {/* Quiz Settings Section */}
              <div className="form-section">
                <h3>Quiz Settings</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Passing Score (%) *</label>
                    <input
                      type="number"
                      name="passingScore"
                      value={quizEditForm.passingScore}
                      onChange={handleQuizEditFormChange}
                      className="form-control"
                      min="0"
                      max="100"
                      required
                    />
                    <small className="text-muted">
                      Minimum score required to pass (0-100)
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Time Limit (minutes)</label>
                    <input
                      type="number"
                      name="timeLimit"
                      value={quizEditForm.timeLimit}
                      onChange={handleQuizEditFormChange}
                      className="form-control"
                      min="1"
                      max="180"
                    />
                    <small className="text-muted">
                      Leave empty for no time limit
                    </small>
                  </div>
                </div>
              </div>

              {/* Validity Dates Section */}
              <div className="form-section">
                <h3>Validity Period</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Valid From</label>
                    <input
                      type="datetime-local"
                      name="validFrom"
                      value={quizEditForm.validFrom}
                      onChange={handleQuizEditFormChange}
                      className="form-control"
                    />
                    <small className="text-muted">
                      When the quiz becomes available to students
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Valid Until</label>
                    <input
                      type="datetime-local"
                      name="validUntil"
                      value={quizEditForm.validUntil}
                      onChange={handleQuizEditFormChange}
                      className="form-control"
                    />
                    <small className="text-muted">
                      When the quiz expires (leave empty for no expiry)
                    </small>
                  </div>
                </div>

                {/* Current Status Display */}
                {editingQuiz.validityStatus && (
                  <div className="status-info">
                    <label>Current Status:</label>
                    {editingQuiz.validityStatus === 'upcoming' && (
                      <span className="status-badge upcoming">🔵 Upcoming - Not yet visible to students</span>
                    )}
                    {editingQuiz.validityStatus === 'active' && (
                      <span className="status-badge active">🟢 Active - Currently visible to students</span>
                    )}
                    {editingQuiz.validityStatus === 'expired' && (
                      <span className="status-badge expired">🔴 Expired - No longer visible to students</span>
                    )}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowQuizEditModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Availability-based Session Creation Modal */}
      {showAvailabilityModal && (
        <div className="modal-overlay">
          <div className="modal-content session-modal">
            <div className="modal-header">
              <h2>Create Session from Tutor Availability</h2>
              <button 
                onClick={() => setShowAvailabilityModal(false)}
                className="modal-close"
                disabled={isCreatingBatchSessions}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSessionSubmit}>
              <div className="availability-info">
                <p><strong>Selected Lesson:</strong> {selectedLesson?.title}</p>
                <p><strong>Course:</strong> {course?.title}</p>
                <p>Select a tutor and available time slot to create a session.</p>
              </div>

              {/* Date Range Selector */}
              <div className="date-range-selector">
                <h4>Availability Date Range</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      value={availabilityDateRange.startDate}
                      onChange={(e) => setAvailabilityDateRange(prev => ({...prev, startDate: e.target.value}))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date *</label>
                    <input
                      type="date"
                      value={availabilityDateRange.endDate}
                      onChange={(e) => setAvailabilityDateRange(prev => ({...prev, endDate: e.target.value}))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <button
                      type="button"
                      onClick={() => fetchTutorAvailability(availabilityDateRange.startDate, availabilityDateRange.endDate)}
                      className="btn btn-secondary"
                    >
                      Refresh Availability
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Session Title *</label>
                  <input
                    type="text"
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm(prev => ({...prev, title: e.target.value}))}
                    placeholder="Enter session title"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Session Type *</label>
                  <select
                    value={sessionForm.sessionType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setSessionForm(prev => ({...prev, sessionType: newType}));
                      
                      // Reset assessment quiz form when switching to regular
                      if (newType === 'regular') {
                        setAssessmentQuizForm({
                          topic: '',
                          title: '',
                          difficulty: 'medium',
                          timeLimit: '60',
                          numberOfQuestions: '15',
                          passingScore: '70'
                        });
                      }
                    }}
                    required
                  >
                    <option value="regular">📚 Regular Session</option>
                    <option value="assessment">📝 Assessment Session</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Duration (minutes) *</label>
                  <select
                    value={sessionForm.duration}
                    onChange={(e) => setSessionForm(prev => ({...prev, duration: parseInt(e.target.value)}))}
                    required
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>

              {/* Assessment Quiz Creation Form (conditional) */}
              {sessionForm.sessionType === 'assessment' && (
                <div className="assessment-quiz-section">
                  <h4>📝 Assessment Quiz Configuration</h4>
                  <div className="quiz-form-info">
                    <p>Configure the quiz that will be created for this assessment session.</p>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Quiz Topic/Lesson *</label>
                      <select 
                        name="topic"
                        value={assessmentQuizForm.topic}
                        onChange={handleAssessmentQuizFormChange}
                        required
                        disabled={!lessons || lessons.length === 0}
                      >
                        <option value="">Select a lesson...</option>
                        {(lessons || []).map(lesson => (
                          <option key={lesson.id} value={lesson.id}>
                            {lesson.title}
                          </option>
                        ))}
                      </select>
                      {(!lessons || lessons.length === 0) && (
                        <small className="text-muted">No lessons available. Please add lessons to this module first.</small>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Quiz Title *</label>
                      <input
                        type="text"
                        name="title"
                        value={assessmentQuizForm.title}
                        onChange={handleAssessmentQuizFormChange}
                        placeholder="Enter quiz title"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Difficulty Level *</label>
                      <select 
                        name="difficulty"
                        value={assessmentQuizForm.difficulty}
                        onChange={handleAssessmentQuizFormChange}
                        required
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Time Limit (minutes) *</label>
                      <input
                        type="number"
                        name="timeLimit"
                        value={assessmentQuizForm.timeLimit}
                        onChange={handleAssessmentQuizFormChange}
                        min="5"
                        max="180"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Number of Questions *</label>
                      <input
                        type="number"
                        name="numberOfQuestions"
                        value={assessmentQuizForm.numberOfQuestions}
                        onChange={handleAssessmentQuizFormChange}
                        placeholder="e.g., 15"
                        min="1"
                        max="50"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Passing Score (%) *</label>
                      <input
                        type="number"
                        name="passingScore"
                        value={assessmentQuizForm.passingScore}
                        onChange={handleAssessmentQuizFormChange}
                        placeholder="e.g., 70"
                        min="0"
                        max="100"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Multiple Tutor Availability Selection */}
              <div className="form-group">
                <label>Select Assigned Tutors & Available Time Slots *</label>
                {(() => {
                  // Filter to only tutors assigned to this course who have availability
                  const assignedTutorsWithAvailability = tutorAvailability?.filter(tutor => {
                    // Check if tutor has availability data (new array format)
                    const hasAvailability = tutor.availability && 
                      Array.isArray(tutor.availability) && 
                      tutor.availability.some(dateAvail => dateAvail?.timeSlots?.length > 0);
                    return hasAvailability;
                  }) || [];

                  const hasAssignedTutors = tutorAvailability && tutorAvailability.length > 0;
                  const hasAvailableTutors = assignedTutorsWithAvailability.length > 0;

                  // Determine the state and message
                  let isDisabled = false;
                  
                  if (!hasAssignedTutors) {
                    isDisabled = true;
                  } else if (!hasAvailableTutors) {
                    isDisabled = true;
                  }

                  return (
                    <>
                      <div className="multiple-time-slots-container">
                        {hasAvailableTutors ? (
                          <select 
                            multiple 
                            className="multiselect-dropdown"
                            value={selectedTimeSlots}
                            onChange={(e) => {
                              const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                              setSelectedTimeSlots(selectedOptions);
                            }}
                            size="8"
                          >
                            {assignedTutorsWithAvailability.map(tutor => (
                              <optgroup key={tutor.id} label={`📚 ${tutor.name}`}>
                                {tutor.availability && Array.isArray(tutor.availability) ? 
                                  tutor.availability.map(dateAvailability => {
                                    if (!dateAvailability?.timeSlots?.length) return null;
                                    
                                    // Filter out occupied timeslots before mapping
                                    return dateAvailability.timeSlots
                                      .filter(timeSlot => {
                                        // Check if this timeslot is occupied by an existing session
                                        const isOccupied = isTimeSlotOccupied(
                                          tutor.id, 
                                          dateAvailability.date, 
                                          timeSlot, 
                                          sessions,
                                          sessionForm.duration
                                        );
                                        
                                        if (isOccupied) {
                                          console.log(`⏰ Filtering out occupied timeslot:`, {
                                            tutor: tutor.name,
                                            date: dateAvailability.date,
                                            slot: `${timeSlot.startTime}-${timeSlot.endTime}`
                                          });
                                        }
                                        
                                        return !isOccupied;
                                      })
                                      .map(timeSlot => {
                                        const slotKey = `${tutor.id}_${dateAvailability.date}_${timeSlot.id}`;
                                        const slotTimezone = timeSlot.timeZone || timeSlot.timezone || tutor.timeZone || tutor.timezone || courseTimezone;
                                        
                                        // Parse date without timezone conversion issues
                                        const [year, month, day] = dateAvailability.date.split('-').map(Number);
                                        const dateObj = new Date(year, month - 1, day); // Create in local timezone
                                        const displayDate = dateObj.toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric',
                                          year: 'numeric',
                                          weekday: 'short'
                                        });
                                        const displayText = `${displayDate} at ${timeSlot.startTime} - ${timeSlot.endTime} (${getTimezoneDisplayName(slotTimezone)})`;
                                        
                                        return (
                                          <option key={slotKey} value={slotKey}>
                                            {displayText}
                                          </option>
                                        );
                                      });
                                  }).flat().filter(Boolean)
                                : null}
                              </optgroup>
                            ))}
                          </select>
                        ) : (
                          <div className="no-availability-message">
                            {!hasAssignedTutors ? (
                              <span className="error-message">
                                ⚠️ No tutors are assigned to this course. Please assign tutors in the course settings first.
                              </span>
                            ) : (
                              <span className="warning-message">
                                ⏰ Assigned tutors need to set their availability in their profiles before sessions can be created.
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {selectedTimeSlots.length > 0 && (
                        <div className="selected-slots-summary">
                          <h5>Selected Time Slots ({selectedTimeSlots.length}):</h5>
                          <div className="selected-slots-list">
                            {selectedTimeSlots.map(slotKey => {
                              const [tutorId, date, timeSlotId] = slotKey.split('_');
                              const tutor = tutorAvailability?.find(t => t.id === tutorId);
                              
                              // Find the time slot using the new helper function
                              const timeSlot = findTimeSlotByDateAndTime(tutor?.availability, date, timeSlotId);
                              
                              // If timeSlot is not found, skip this item
                              if (!timeSlot) {
                                console.warn(`TimeSlot not found for slotKey: ${slotKey}`);
                                return null;
                              }
                              
                              // Parse date without timezone conversion issues
                              const [year, month, day] = date.split('-').map(Number);
                              const dateObj = new Date(year, month - 1, day); // Create in local timezone
                              const formattedDate = dateObj.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric',
                                weekday: 'short'
                              });
                              const displayText = `${formattedDate} at ${timeSlot.startTime} - ${timeSlot.endTime}`;
                              
                              return (
                                <div key={slotKey} className="selected-slot-item">
                                  <span className="tutor-name">
                                    📚 {tutor?.name}
                                    {tutor?.isVerified && <span className="verified-badge"> ✅</span>}
                                    {tutor?.isVerified === false && <span className="unverified-badge"> ⚠️</span>}:
                                  </span>
                                  <span className="slot-datetime">{displayText}</span>
                                  <button 
                                    type="button"
                                    onClick={() => setSelectedTimeSlots(prev => prev.filter(s => s !== slotKey))}
                                    className="remove-slot-btn"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            }).filter(item => item !== null)}
                          </div>
                        </div>
                      )}
                      
                      <small className="field-note">
                        {hasAvailableTutors && (
                          <span className="success-message">
                            ✅ Hold Ctrl/Cmd and click to select multiple time slots from the dropdown above.
                          </span>
                        )}
                      </small>
                    </>
                  );
                })()}
              </div>

              {/* Show selected date/time */}
              {sessionForm.scheduled_date && (
                <div className="form-group">
                  <label>Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    value={sessionForm.scheduled_date}
                    onChange={(e) => setSessionForm(prev => ({...prev, scheduled_date: e.target.value}))}
                    className="readonly-field"
                  />
                  <small className="field-note">Auto-filled from selected time slot</small>
                </div>
              )}

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={sessionForm.description}
                  onChange={(e) => setSessionForm(prev => ({...prev, description: e.target.value}))}
                  placeholder="Brief description of the session content..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Max Participants</label>
                <input
                  type="number"
                  value={sessionForm.max_participants}
                  onChange={(e) => setSessionForm(prev => ({...prev, max_participants: parseInt(e.target.value)}))}
                  min="1"
                  max="2"
                />
                <small className="field-note">Maximum 2 participants per session</small>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowAvailabilityModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={!sessionForm.title || selectedTimeSlots.length === 0 || isCreatingBatchSessions}
                >
                  {isCreatingBatchSessions ? 'Creating Session...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timezone Settings Modal */}
      {showTimezoneModal && (
        <div className="modal-overlay" onClick={handleCloseTimezoneModal}>
          <div className="modal-content timezone-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🕐 Course Timezone Settings</h3>
              <button className="close-modal" onClick={handleCloseTimezoneModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="timezone-info">
                <p>Set the timezone for this course. This affects how session times and deadlines are displayed to students.</p>
                <div className="current-timezone">
                  <strong>Current timezone:</strong> {courseTimezone}
                </div>
              </div>

              <div className="timezone-selection">
                <label htmlFor="timezone-select">Select new timezone:</label>
                <select 
                  id="timezone-select"
                  className="timezone-dropdown"
                  defaultValue={courseTimezone}
                  disabled={isUpdatingTimezone}
                >
                  {timezones.map(tz => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn secondary cancel-btn"
                onClick={handleCloseTimezoneModal}
                disabled={isUpdatingTimezone}
              >
                Cancel
              </button>
              <button 
                className="btn primary save-btn"
                onClick={() => {
                  const selectedTimezone = document.getElementById('timezone-select').value;
                  handleTimezoneChange(selectedTimezone);
                }}
                disabled={isUpdatingTimezone}
              >
                {isUpdatingTimezone ? (
                  <>
                    <div className="spinner small"></div>
                    Updating...
                  </>
                ) : (
                  'Update Timezone'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Session Modal */}
      <RecurringSessionModal />
    </div>
  );
};

export default CourseDetailPage;