import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../hooks/useData';
import websocketService from '../../services/websocketService';
import { useTutorPageRefresh } from '../../hooks/useAdminRefresh';
import TutorCalendar from '../calendar/TutorCalendar';
import EditAvailabilityModal from '../modals/EditAvailabilityModal';
import TutorChatSection from '../chat/TutorChatSection';
import ChangePasswordModal from '../common/ChangePasswordModal';
import { 
  generateTimeOptions, 
  getCourseCountry, 
  getUserCountry,
  formatDateConsistent,
  getDayOfWeekFromString,
  generateRecurringDates,
  formatTimeByCountry,
  formatDateForPreview,
  getUserTimezone,
  saveUserTimezone,
  getTimezoneDisplayName,
  detectLocalTimezone
} from '../../utils/timeUtils';
import './css/TutorPage.css';

// Day index conversion utilities
// JavaScript uses Sunday=0, Monday=1, ..., Saturday=6
// Python/Backend uses Monday=0, Tuesday=1, ..., Sunday=6
const convertJSIndexToPython = (jsIndex) => {
  // Convert JavaScript day index to Python day index
  // JavaScript: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
  // Python:     Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
  return jsIndex === 0 ? 6 : jsIndex - 1; // Sunday (0) -> 6, others shift down by 1
};

const convertPythonIndexToJS = (pythonIndex) => {
  // Convert Python day index to JavaScript day index
  return pythonIndex === 6 ? 0 : pythonIndex + 1; // Sunday (6) -> 0, others shift up by 1
};

const convertDayArrayToPython = (jsDayArray) => {
  return jsDayArray.map(convertJSIndexToPython).sort();
};

const convertDayArrayToJS = (pythonDayArray) => {
  return pythonDayArray.map(convertPythonIndexToJS).sort();
};

// Multi-select dropdown component with checkboxes
const MultiSelectDropdown = ({ 
  label, 
  options, 
  selectedValues, 
  onChange, 
  placeholder = "Select options...", 
  error = "",
  disabled = false,
  disabledOptions = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionToggle = (optionValue) => {
    const isSelected = selectedValues.includes(optionValue);
    const newSelectedValues = isSelected
      ? selectedValues.filter(val => val !== optionValue)
      : [...selectedValues, optionValue];
    
    onChange(newSelectedValues);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) return selectedValues[0];
    return `${selectedValues.length} selected`;
  };

  return (
    <div className="multi-select-dropdown" ref={dropdownRef}>
      <div 
        className={`dropdown-header ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="selected-text">{getDisplayText()}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      
      {isOpen && (
        <div className="dropdown-options">
          {options.map((option) => {
            const isDisabled = disabledOptions.includes(option);
            const isSelected = selectedValues.includes(option);
            
            return (
              <div 
                key={option} 
                className={`dropdown-option ${isDisabled ? 'auto-selected' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => !isDisabled && handleOptionToggle(option)}
              >
                <span className="option-text">
                  {option} {isDisabled && '(Auto-selected)'}
                </span>
                {isSelected && <span className="selection-indicator">✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TutorPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    thisMonth: 0,
    pendingPayments: 0,
    sessionsCompleted: 0,
    potentialWeekly: {},
    actualWeekly: {},
    monthly: {},
    total: {},
    upcoming: {},
    hourlyRate: 21,
    currency: 'GBP'
  });
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [sessionStatusCounts, setSessionStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [assignedCourses, setAssignedCourses] = useState([]);
  
  // Availability management state
  const [availability, setAvailability] = useState({});
  const [availabilityStats, setAvailabilityStats] = useState({
    totalSlots: 0,
    bookedSlots: 0,
    availableHours: 0,
    weeklyHours: 0,
    conflicts: 0,
    upcomingSlots: 0,
    completedSessions: 0,
    recurringSlots: 0,
    utilizationRate: 0,
    completionRate: 0,
    estimatedWeeklyEarnings: 0,
    courseTypes: 0,
    peakPeriod: 'N/A',
    mostActiveHour: 'N/A',
    mostActiveDay: 'N/A'
  });
  const [availabilityView, setAvailabilityView] = useState('calendar'); // 'calendar' or 'list'
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  
  // TimeSlot creation state
  const [showCreateTimeslotModal, setShowCreateTimeslotModal] = useState(false);
  const [timeslotForm, setTimeslotForm] = useState({
    type: 'single', // 'single' or 'recurring'
    date: '',
    startTime: '',
    endTime: '',
    courseId: '',
    isRecurring: false,
    recurrenceDays: [], // [0-6] for Sun-Sat
    recurrenceEndDate: '',
    notes: '',
    timeZone: 'UTC'  // Will be updated when timezoneSettings changes
  });
  const [timeslotErrors, setTimeslotErrors] = useState({});
  const [timeslotSaving, setTimeslotSaving] = useState(false);
  
  // TimeSlot editing state
  const [showEditTimeslotModal, setShowEditTimeslotModal] = useState(false);
  const [editingTimeslot, setEditingTimeslot] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editUpdateOption, setEditUpdateOption] = useState('single'); // 'single', 'future', 'all'
  
  // TimeSlot deletion state
  const [showDeleteTimeslotModal, setShowDeleteTimeslotModal] = useState(false);
  const [deletingTimeslot, setDeletingTimeslot] = useState(null);
  const [deleteOption, setDeleteOption] = useState('single');
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Timezone management state
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(() => {
    const timezone = getUserTimezone();
    console.log('🔧 Initial selectedTimezone state:', timezone);
    return timezone;
  });
  const [isUpdatingTimezone, setIsUpdatingTimezone] = useState(false);
  const [timezoneSettings, setTimezoneSettings] = useState(() => {
    const timezone = getUserTimezone();
    console.log('🔧 Initial timezoneSettings state:', timezone);
    return {
      timezone: timezone,
      autoAdjustDST: true,
      showTimezoneInSlots: true,
      convertBookingTimes: false
    };
  });
  
  // Conflict detection state
  const [conflictCheck, setConflictCheck] = useState({
    checking: false,
    conflicts: [],
    hasConflicts: false
  });
  
  // Selected date for calendar operations
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Selection mode state for list view
  const [listSelectionMode, setListSelectionMode] = useState(false);
  const [selectedListSlots, setSelectedListSlots] = useState(new Set());
  const [selectedListSlotsMap, setSelectedListSlotsMap] = useState(new Map());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  // Modal state
  const [subjectsNotificationDismissed, setSubjectsNotificationDismissed] = useState(
    localStorage.getItem('subjectsNotificationDismissed') === 'true'
  );
  
  // Professional info edit state
  const [showProfessionalEditModal, setShowProfessionalEditModal] = useState(false);
  const [professionalForm, setProfessionalForm] = useState({
    academicCountry: '',
    subjects: [],
    tutorGradeLevel: '',
    gradeLevelsTaught: []
  });
  const [professionalErrors, setProfessionalErrors] = useState({});
  const [professionalSaving, setProfessionalSaving] = useState(false);
  
  // Pagination state for upcoming sessions
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionsPerPage] = useState(8); // Show 8 compact sessions per page
  const [sessionView, setSessionView] = useState('upcoming'); // 'upcoming' or 'history'

  // Delete session state
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [selectedSessionForDeletion, setSelectedSessionForDeletion] = useState(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  const [paymentDetails, setPaymentDetails] = useState({
    bankAccount: {
      accountHolder: '',
      accountNumber: '',
      bankName: '',
      routingNumber: '',
      accountType: ''
    },
    paypalAccount: {
      email: '',
      status: ''
    },
    taxInformation: {
      taxId: '',
      taxStatus: '',
      w9Status: ''
    },
    paymentPreferences: {
      preferredMethod: '',
      paymentSchedule: '',
      minimumPayout: 0,
      currency: ''
    }
  });

  // Change password state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);


  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
    if (!user || user.accountType !== 'tutor') {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    
    // Set assigned courses immediately from user data
    if (user.assignedCourses) {
      setAssignedCourses(user.assignedCourses);
    }
    
    // Always use local timezone as default
    const localTimezone = getUserTimezone();
    console.log('🔧 User profile loading - using localTimezone:', localTimezone);
    
    // Update profile in backend with local timezone
    updateUserProfileTimezone(user.id, localTimezone);
    
    // Update local state with local timezone
    console.log('🔧 Setting selectedTimezone to:', localTimezone);
    setSelectedTimezone(localTimezone);
    console.log('🔧 Setting timezoneSettings to:', localTimezone);
    setTimezoneSettings(prev => ({
      ...prev,
      timezone: localTimezone
    }));
    
    
    loadTutorData(user.id, user);
    loadAvailabilityData(user.id);
    
    // Initialize WebSocket connection for real-time updates
    setupWebSocketConnection(user.id);
  }, [navigate]);

  // Reset pagination when upcoming sessions change or when switching views
  useEffect(() => {
    setCurrentPage(1);
  }, [upcomingSessions.length, sessionHistory.length, sessionView]);

  // Update timeslot form timezone when timezone settings change
  useEffect(() => {
    setTimeslotForm(prev => ({
      ...prev,
      timeZone: timezoneSettings.timezone
    }));
  }, [timezoneSettings.timezone]);

  // Sync selectedTimezone with timezoneSettings.timezone
  useEffect(() => {
    console.log('🔄 Sync useEffect triggered - timezoneSettings.timezone:', timezoneSettings.timezone, 'selectedTimezone:', selectedTimezone);
    if (timezoneSettings.timezone && timezoneSettings.timezone !== selectedTimezone) {
      console.log('🔄 Syncing selectedTimezone from', selectedTimezone, 'to', timezoneSettings.timezone);
      setSelectedTimezone(timezoneSettings.timezone);
    }
  }, [timezoneSettings.timezone, selectedTimezone]);

  // Generate recurring session preview instances
  const generateRecurringPreview = () => {
    // Check both isRecurring and type for compatibility
    const isRecurringSlot = timeslotForm.isRecurring || timeslotForm.type === 'recurring';
    if (!isRecurringSlot || !timeslotForm.startTime || !timeslotForm.endTime || 
        !timeslotForm.recurrenceDays.length || !timeslotForm.date) {
      return [];
    }

    // Use default end date if not specified (3 months from start date)
    let endDate = timeslotForm.recurrenceEndDate;
    if (!endDate) {
      const startDate = new Date(timeslotForm.date);
      const defaultEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + 3, startDate.getDate());
      endDate = defaultEndDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    // The preview should show what will actually be created in the backend
    // Backend expects Python day indices, so we need to show the "correct" days
    // But generateRecurringDates expects JavaScript indices, so we need to think about this differently
    
    // Test conversion functions
    console.log('🔍 Testing conversion functions:', {
      'Monday JS(1) -> Python': convertJSIndexToPython(1), // Should be 0
      'Wednesday JS(3) -> Python': convertJSIndexToPython(3), // Should be 2  
      'Friday JS(5) -> Python': convertJSIndexToPython(5), // Should be 4
      'Python 0 -> JS': convertPythonIndexToJS(0), // Should be 1 (Monday)
      'Python 2 -> JS': convertPythonIndexToJS(2), // Should be 3 (Wednesday)
      'Python 4 -> JS': convertPythonIndexToJS(4)  // Should be 5 (Friday)
    });

    console.log('🔍 EXPLICIT Preview debug - form selection:');
    console.log('formRecurrenceDays:', timeslotForm.recurrenceDays);
    console.log('jsLabels:', timeslotForm.recurrenceDays.map(i => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]));
    console.log('whatBackendWillGet:', convertDayArrayToPython(timeslotForm.recurrenceDays));
    console.log('pythonLabels:', convertDayArrayToPython(timeslotForm.recurrenceDays).map(i => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]));
    
    // Also check what dates are actually generated
    const sampleDate = timeslotForm.date || '2025-01-06'; // Monday
    console.log('Sample date for testing:', sampleDate);
    // Make sure end date is after start date for testing
    const testEndDate = sampleDate > '2025-01-20' ? '2025-12-31' : '2025-01-20';
    const testDates = generateRecurringDates(sampleDate, testEndDate, timeslotForm.recurrenceDays, 'UTC');
    console.log('Generated test dates:', testDates);
    testDates.forEach(dateStr => {
      const dayOfWeek = new Date(dateStr).getDay();
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
      console.log(`Date ${dateStr} is a ${dayName} (JS day index: ${dayOfWeek})`);
    });

    // Generate recurring dates using the ORIGINAL user selection
    // The preview should show what the user selected, not what will be sent to backend
    // The backend conversion happens transparently
    const recurringDateStrings = generateRecurringDates(
      timeslotForm.date,
      endDate,
      timeslotForm.recurrenceDays, // Use original JS indices - this should work correctly
      timezoneSettings.timezone
    );
    
    console.log('🔍 Preview using original selection:');
    console.log('recurrenceDays:', timeslotForm.recurrenceDays);
    console.log('labels:', timeslotForm.recurrenceDays.map(i => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]));
    console.log('startDate:', timeslotForm.date);
    console.log('endDate:', endDate);
    console.log('generatedDates count:', recurringDateStrings.length);
    console.log('first 5 generated dates:', recurringDateStrings.slice(0, 5));
    
    // Check what day each generated date actually is
    recurringDateStrings.slice(0, 3).forEach(dateStr => {
      const dayOfWeek = new Date(dateStr).getDay();
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
      console.log(`PREVIEW: Date ${dateStr} is a ${dayName} (JS day index: ${dayOfWeek})`);
    });

    // Get user's country for time formatting
    const country = getUserCountry(currentUser) || 
                   (assignedCourses.length > 0 ? getCourseCountry(assignedCourses[0]) : null) || 
                   'US';

    // Format each date instance using timezone-neutral formatting
    const instances = recurringDateStrings.slice(0, 5).map((dateString, index) => {
      // Use timezone-neutral formatting to prevent day shifts
      const formattedDate = formatDateForPreview(dateString);
      const formattedStartTime = formatTimeByCountry(timeslotForm.startTime, country);
      const formattedEndTime = formatTimeByCountry(timeslotForm.endTime, country);
      
      
      return {
        date: dateString,
        formattedDate,
        timeRange: `${formattedStartTime} - ${formattedEndTime}`,
        dayOfWeek: getDayOfWeekFromString(dateString),
        timezone: timezoneSettings.timezone
      };
    });

    return {
      instances,
      hasMore: recurringDateStrings.length > 5,
      totalCount: recurringDateStrings.length
    };
  };

  const loadTutorData = async (tutorId, user = null) => {
    setLoading(true);
    console.log('🔄 Loading tutor data for:', tutorId);
    try {
      // Load all tutor data in parallel - handle missing endpoints gracefully
      console.log('📡 Making API calls...');
      const [sessionsData, notificationsData, earningsData, statsData, quizData, historyData, statusCounts] = await Promise.all([
        API.sessions.getUpcomingSessions(tutorId, 'tutor').catch(err => {
          console.warn('Sessions endpoint not available:', err.message);
          console.log('🔍 DEBUGGING: Tutor sessions query failed for:', {
            tutorId: tutorId,
            userType: 'tutor',
            endpoint: `/sessions/upcoming?userId=${tutorId}&userType=tutor`,
            error: err.message
          });
          return [];
        }),
        API.notifications.getUserNotifications(tutorId).catch(err => {
          console.warn('Notifications endpoint not available:', err.message);
          return [];
        }),
        API.earnings.getMyEarnings().catch(err => {
          console.warn('Earnings endpoint not available:', err.message);
          return { 
            totalEarnings: 0, 
            thisMonth: 0, 
            pendingPayments: 0, 
            sessionsCompleted: 0,
            potentialWeekly: {},
            actualWeekly: {},
            monthly: {},
            total: {},
            upcoming: {},
            hourlyRate: 21,
            currency: 'GBP'
          };
        }),
        API.analytics.getDashboardStats('tutor', tutorId).catch(err => {
          console.warn('Analytics endpoint not available:', err.message);
          return {};
        }),
        API.quizzes.getStudentQuizResults(tutorId).catch(err => {
          console.warn('Quiz results endpoint not available:', err.message);
          return [];
        }),
        API.sessions.getSessionHistory(tutorId, 'tutor').catch(err => {
          console.warn('Session history endpoint not available:', err.message);
          return [];
        }),
        API.sessions.getSessionStatusCounts(tutorId).catch(err => {
          console.warn('Session status counts endpoint not available:', err.message);
          return {};
        }),
      ]);

      console.log('🔍 DEBUGGING: Sessions data received:', {
        sessionsDataRaw: sessionsData,
        sessionsArray: sessionsData || [],
        sessionsCount: (sessionsData || []).length,
        firstSession: (sessionsData || [])[0],
        tutorId: tutorId
      });
      setUpcomingSessions(sessionsData || []);
      setNotifications(notificationsData || []);
      
      // Process comprehensive earnings data
      const processedEarnings = earningsData.data || earningsData || {};
      console.log('📊 Earnings data received:', processedEarnings);
      
      setEarnings({
        // Legacy format for existing code
        totalEarnings: processedEarnings.total?.totalEarnings || 0,
        thisMonth: processedEarnings.monthly?.monthlyEarnings || 0,
        pendingPayments: 0, // This would come from a separate payments system
        sessionsCompleted: processedEarnings.total?.totalSessions || 0,
        
        // New comprehensive format
        potentialWeekly: processedEarnings.potentialWeekly || {},
        actualWeekly: processedEarnings.actualWeekly || {},
        monthly: processedEarnings.monthly || {},
        total: processedEarnings.total || {},
        upcoming: processedEarnings.upcoming || {},
        hourlyRate: processedEarnings.hourlyRate || 21,
        currency: processedEarnings.currency || 'GBP',
        efficiency: processedEarnings.efficiency || {}
      });
      
      setDashboardStats(statsData || {});
      setQuizResults(quizData || []);
      
      // Debug session history data
      console.log('🔍 Setting session history data:', historyData);
      if (historyData && historyData.length > 0) {
        const debugSessions = historyData.filter(s => 
          ['session_a7440c36', 'session_17e204e0', 'session_10c3b9dd'].includes(s.id)
        ).map(s => ({ id: s.id, status: s.status, title: s.title }));
        console.log('🔍 Debug specific sessions status:', debugSessions);
      }
      
      setSessionHistory(historyData || []);
      setSessionStatusCounts(statusCounts || {});
      
      // Use assigned courses from user payload (from login)
      const userForCourses = user || currentUser;
      if (userForCourses && userForCourses.assignedCourses) {
        setAssignedCourses(userForCourses.assignedCourses);
      } else {
        setAssignedCourses([]);
      }

      // Session history is now loaded in parallel above

    } catch (error) {
      console.error('Error loading tutor data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load availability data from API
  const loadAvailabilityData = async (tutorId) => {
    try {
      setAvailabilityLoading(true);
      console.log('🔄 Loading availability data for tutor:', tutorId);
      
      // Use date range to ensure we get all slots including newly created ones
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      
      const response = await API.availability.getTutorAvailabilityRange(
        tutorId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      console.log('✅ Availability data loaded:', response);
      
      // Process availability data for list view - handle both old and new formats
      let processedAvailability = {};
      
      if (response?.availability) {
        // Handle NEW format: Flat array from recurring availability API
        if (Array.isArray(response.availability)) {
          console.log('📊 Processing NEW API format (flat array) for list view:', response.availability.length, 'records');
          
          // Convert flat array to weekly grouped format for list view
          const weeklyData = {
            monday: { available: true, timeSlots: [] },
            tuesday: { available: true, timeSlots: [] },
            wednesday: { available: true, timeSlots: [] },
            thursday: { available: true, timeSlots: [] },
            friday: { available: true, timeSlots: [] },
            saturday: { available: true, timeSlots: [] },
            sunday: { available: true, timeSlots: [] }
          };
          
          const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          
          response.availability.forEach(slot => {
            // Get the day of week (0=Monday in database, 6=Sunday)
            const dayOfWeek = slot.day_of_week || slot.dayOfWeek || 0;
            const dayName = dayNames[dayOfWeek];
            
            if (dayName && weeklyData[dayName]) {
              weeklyData[dayName].timeSlots.push({
                id: slot.id,
                startTime: slot.start_time || slot.startTime,
                endTime: slot.end_time || slot.endTime,
                courseId: slot.course_id || slot.courseId,
                course: slot.course,
                available: slot.available,
                timeZone: slot.time_zone || slot.timeZone,
                specificDate: slot.specific_date || slot.specificDate,
                isRecurring: slot.is_recurring || slot.isRecurring,
                parentAvailabilityId: slot.parent_availability_id || slot.parentAvailabilityId
              });
            }
          });
          
          processedAvailability = weeklyData;
          console.log('📊 Converted to weekly format for list view:', processedAvailability);
        }
        // Handle OLD format: Weekly grouped structure
        else if (typeof response.availability === 'object') {
          processedAvailability = response.availability;
          console.log('📊 Using legacy weekly grouped format for list view:', processedAvailability);
        }
      } else {
        processedAvailability = response || {};
      }
      
      setAvailability(processedAvailability);
      
      // Calculate and update stats
      const stats = calculateAvailabilityStats(response || {});
      setAvailabilityStats(stats);
      
    } catch (error) {
      console.warn('⚠️ Could not load availability data:', error.message);
      setAvailability({});
      setAvailabilityStats({
        totalSlots: 0,
        bookedSlots: 0,
        availableHours: 0,
        weeklyHours: 0,
        conflicts: 0,
        upcomingSlots: 0,
        completedSessions: 0,
        recurringSlots: 0,
        utilizationRate: 0,
        completionRate: 0,
        estimatedWeeklyEarnings: 0,
        courseTypes: 0,
        peakPeriod: 'N/A',
        mostActiveHour: 'N/A',
        mostActiveDay: 'N/A'
      });
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Setup WebSocket connection for real-time updates
  const setupWebSocketConnection = (tutorId) => {
    try {
      console.log('🔌 Setting up WebSocket connection for tutor:', tutorId);
      
      // Initialize WebSocket connection
      websocketService.connect();
      console.log('🔌 WebSocket connection initiated');
      
      // Subscribe to tutor-specific updates
      websocketService.subscribeToEntity('user', tutorId);
      console.log('🔌 Subscribed to tutor-specific updates');
      
      // Setup event listener for course assignments
      const handleCourseAssignment = (event) => {
        console.log('🔔 Received course assignment event:', event);
        
        // Check if this event is for the current tutor
        if (event.data && event.data.tutor_id === tutorId) {
          const assignedCourse = event.data.course;
          
          // Show notification
          if (window.Notification && Notification.permission === 'granted') {
            new Notification('New Course Assignment', {
              body: `You have been assigned to "${assignedCourse.title}"`,
              icon: '/favicon.ico'
            });
          }
          
          // Refresh course data to include new assignment
          refreshTutorCourses(assignedCourse);
        }
      };
      
      // Listen to WebSocket events through the existing refresh manager
      const eventListener = (event) => {
        console.log('📨 Received admin data refresh event:', event);
        if (event.detail && 
            event.detail.category === 'COURSE_UPDATE' && 
            event.detail.data && 
            event.detail.data.action === 'course_assigned') {
          console.log('🎯 Course assignment event detected!');
          handleCourseAssignment(event.detail);
        } else {
          console.log('📨 Event does not match course assignment criteria:', event.detail);
        }
      };
      
      // Listen for general admin data refresh events
      const tutorRefreshListener = () => {
        console.log('🔄 Tutor page refresh triggered by admin event');
        if (currentUser && currentUser.id) {
          loadTutorData(currentUser.id, currentUser);
        }
      };
      
      // Add custom event listeners for different event types
      window.addEventListener('adminDataRefresh', eventListener);
      window.addEventListener('refreshTutorData', tutorRefreshListener);
      
      // Cleanup function
      return () => {
        window.removeEventListener('adminDataRefresh', eventListener);
        window.removeEventListener('refreshTutorData', tutorRefreshListener);
        websocketService.disconnect();
      };
      
    } catch (error) {
      console.error('Failed to setup WebSocket connection:', error);
    }
  };

  // Refresh tutor courses when new assignment is received
  const refreshTutorCourses = async (newCourse) => {
    try {
      // Update assigned courses state with new course
      setAssignedCourses(prevCourses => {
        // Check if course already exists to avoid duplicates
        const courseExists = prevCourses.some(course => course.id === newCourse.id);
        if (!courseExists) {
          console.log('📚 Adding new course to tutor dashboard:', newCourse.title);
          return [...prevCourses, newCourse];
        }
        return prevCourses;
      });
      
      // Refresh other related data
      if (currentUser && currentUser.id) {
        // Reload full tutor data to get updated assigned courses
        loadTutorData(currentUser.id, currentUser);
      }
      
    } catch (error) {
      console.error('Error refreshing tutor courses:', error);
    }
  };

  // Comprehensive refresh handler for hybrid refresh system
  const handleTutorDataRefresh = useCallback(async (event) => {
    console.log('🔄 Tutor page refresh triggered by event:', event);
    
    if (!currentUser?.id) {
      console.warn('Cannot refresh - no current user');
      return;
    }

    try {
      const refreshPromises = [];
      
      // Core tutor data refresh
      refreshPromises.push(
        loadTutorData(currentUser.id, currentUser)
      );
      
      // Availability data refresh
      refreshPromises.push(
        loadAvailabilityData(currentUser.id)
      );
      
      // Execute all refreshes concurrently
      await Promise.all(refreshPromises);
      
      console.log('✅ Tutor data refresh completed successfully');
      
    } catch (error) {
      console.error('❌ Error during tutor data refresh:', error);
    }
  }, [currentUser]);

  // Initialize hybrid refresh system
  const { triggerRefresh, isRefreshing } = useTutorPageRefresh(
    currentUser?.id, 
    handleTutorDataRefresh
  );

  // Request notification permission on component mount
  useEffect(() => {
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Cleanup WebSocket connection on component unmount
  useEffect(() => {
    return () => {
      websocketService.disconnect();
    };
  }, []);

  // Calculate enhanced availability statistics from real database data
  const calculateAvailabilityStats = (availabilityData) => {
    let totalSlots = 0;
    let bookedSlots = 0;
    let availableHours = 0;
    let conflicts = 0;
    let upcomingSlots = 0;
    let completedSessions = 0;
    let recurringSlots = 0;
    let weeklyHours = 0;
    
    // Peak hours tracking (6am-12pm: morning, 12pm-6pm: afternoon, 6pm-9pm: evening)
    const peakHours = { morning: 0, afternoon: 0, evening: 0 };
    const hourlyDistribution = Array(24).fill(0);
    const dailyHours = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0 };
    
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const courseTypes = new Set();
    
    console.log('📊 Calculating enhanced stats from availability data:', availabilityData);
    console.log('📊 Available data keys:', Object.keys(availabilityData));
    console.log('📊 Sample data structure:', JSON.stringify(availabilityData, null, 2));

    // Handle both legacy format and new API format
    let slotsToProcess = [];
    
    if (availabilityData?.availability) {
      // Handle NEW format: Flat array from recurring availability API
      if (Array.isArray(availabilityData.availability)) {
        console.log('📊 Processing NEW API format (flat array) for stats:', availabilityData.availability.length, 'records');
        slotsToProcess = availabilityData.availability;
      }
      // Handle OLD format: Weekly grouped structure
      else if (typeof availabilityData.availability === 'object') {
        console.log('📊 Processing legacy weekly grouped format for stats');
        Object.keys(availabilityData.availability).forEach(dayKey => {
          const dayData = availabilityData.availability[dayKey];
          if (dayData?.available && dayData?.timeSlots && Array.isArray(dayData.timeSlots)) {
            slotsToProcess.push(...dayData.timeSlots);
          }
        });
      }
    }

    console.log('📊 Total slots to process for stats:', slotsToProcess.length);
    totalSlots = slotsToProcess.length;

    slotsToProcess.forEach(slot => {
      try {
        // Handle both startTime/endTime and time formats
        let startHour, startMin, endHour, endMin;
        
        if (slot.startTime && slot.endTime) {
          [startHour, startMin] = slot.startTime.split(':').map(Number);
          [endHour, endMin] = slot.endTime.split(':').map(Number);
        } else if (slot.start_time && slot.end_time) {
          [startHour, startMin] = slot.start_time.split(':').map(Number);
          [endHour, endMin] = slot.end_time.split(':').map(Number);
        } else if (slot.time) {
          const [startTime, endTime] = slot.time.split('-');
          [startHour, startMin] = startTime.split(':').map(Number);
          [endHour, endMin] = endTime.split(':').map(Number);
        } else {
          console.warn('⚠️ Slot missing time information:', slot);
          return;
        }
        
        const duration = (endHour + endMin/60) - (startHour + startMin/60);
        availableHours += duration;
        
        // Track hourly distribution
        for (let h = startHour; h < endHour; h++) {
          hourlyDistribution[h] += 1;
        }
        
        // Track peak hours
        if (startHour >= 6 && startHour < 12) {
          peakHours.morning += duration;
        } else if (startHour >= 12 && startHour < 18) {
          peakHours.afternoon += duration;
        } else if (startHour >= 18 && startHour <= 21) {
          peakHours.evening += duration;
        }
        
        // Track daily distribution - get day from slot data
        const dayOfWeek = slot.day_of_week || slot.dayOfWeek || 0;
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayName = dayNames[dayOfWeek];
        if (dayName && dailyHours[dayName] !== undefined) {
          dailyHours[dayName] += duration;
        }
        
        // Check if slot is in the upcoming week
        const slotDate = slot.specificDate || slot.specific_date ? (() => {
          // Parse date safely without timezone conversion
          const dateStr = slot.specificDate || slot.specific_date;
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day);
        })() : new Date();
        if (slotDate >= now && slotDate <= oneWeekFromNow) {
          weeklyHours += duration;
          upcomingSlots++;
        }
        
        // Check booking and completion status
        // Handle both legacy and new format for booked slots
        if (slot.isBooked || slot.status === 'booked' || slot.status === 'scheduled') {
          bookedSlots++;
        }
        
        // Count completed sessions (sessions that actually happened)
        if (slot.status === 'completed') {
          completedSessions++;
        }
        
        // Track recurring slots
        if (slot.isRecurring || slot.is_recurring) {
          recurringSlots++;
        }
        
        // Track course types
        if (slot.courseId || slot.course_id) {
          courseTypes.add(slot.courseId || slot.course_id);
        }
        
        if (slot.hasConflict || slot.status === 'conflict') {
          conflicts++;
        }
      } catch (error) {
        console.warn('⚠️ Error processing slot:', slot, error);
      }
    });

    // Calculate derived metrics
    const utilizationRate = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;
    const completionRate = bookedSlots > 0 ? Math.round((completedSessions / bookedSlots) * 100) : 0;
    const hourlyRate = earnings?.hourlyRate || 21; // Use dynamic hourly rate from settings
    const estimatedWeeklyEarnings = weeklyHours * hourlyRate;
    
    // Find most active time period
    const mostActiveHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
    const mostActiveDay = Object.keys(dailyHours).reduce((a, b) => 
      dailyHours[a] > dailyHours[b] ? a : b
    );
    
    const peakPeriod = peakHours.afternoon > peakHours.morning && peakHours.afternoon > peakHours.evening 
      ? 'afternoon' 
      : peakHours.morning > peakHours.evening ? 'morning' : 'evening';

    const stats = { 
      totalSlots, 
      bookedSlots, 
      availableHours: Math.round(availableHours * 10) / 10,
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      conflicts,
      upcomingSlots,
      completedSessions,
      recurringSlots,
      utilizationRate,
      completionRate,
      estimatedWeeklyEarnings,
      courseTypes: courseTypes.size,
      peakPeriod,
      mostActiveHour: mostActiveHour === -1 ? 'N/A' : `${mostActiveHour.toString().padStart(2, '0')}:00`,
      mostActiveDay: mostActiveDay.charAt(0).toUpperCase() + mostActiveDay.slice(1),
      peakHours,
      dailyHours
    };
    
    console.log('📊 Calculated enhanced stats:', stats);
    return stats;
  };

  // Handle availability refresh after operations
  const handleAvailabilityRefresh = async () => {
    if (currentUser?.id) {
      await loadAvailabilityData(currentUser.id);
    }
  };

  // Get time slot options based on user/course country
  const getTimeOptionsForTutor = () => {
    // Get country from user profile or assigned courses
    let country = getUserCountry(currentUser);
    if (assignedCourses.length > 0) {
      country = getCourseCountry(assignedCourses[0]) || country;
    }
    return generateTimeOptions(country, 6, 21); // 6 AM to 9 PM
  };

  const timeOptions = getTimeOptionsForTutor();

  // TimeSlot Editing Functions
  const handleEditTimeslot = (slot) => {
    setEditingTimeslot(slot);
    setEditForm({
      startTime: slot.startTime || slot.time?.split('-')[0] || '',
      endTime: slot.endTime || slot.time?.split('-')[1] || '',
      courseId: slot.courseId || slot.course || '',
      available: slot.available !== false,
      timeZone: slot.timeZone || timezoneSettings.timezone,
      notes: slot.notes || ''
    });
    setEditErrors({});
    setEditUpdateOption('single');
    setShowEditTimeslotModal(true);
  };

  const validateEditForm = () => {
    const errors = {};
    
    if (!editForm.startTime) errors.startTime = 'Start time is required';
    if (!editForm.endTime) errors.endTime = 'End time is required';
    if (!editForm.courseId) errors.courseId = 'Please select a course';
    
    // Time validation
    if (editForm.startTime && editForm.endTime) {
      // Ensure proper time format
      const normalizedStart = editForm.startTime.includes(':') ? editForm.startTime : `${editForm.startTime}:00`;
      const normalizedEnd = editForm.endTime.includes(':') ? editForm.endTime : `${editForm.endTime}:00`;
      
      const start = new Date(`1970-01-01T${normalizedStart}:00`);
      const end = new Date(`1970-01-01T${normalizedEnd}:00`);
      const diffHours = (end - start) / (1000 * 60 * 60);
      
      if (start >= end) errors.endTime = 'End time must be after start time';
      // Allow up to 1 hour with small tolerance for floating point precision
      if (diffHours > 1.01) errors.endTime = 'Time slots cannot exceed 1 hour';
      
      const startHour = start.getHours();
      const endHour = end.getHours();
      
      if (startHour < 6 || startHour >= 21) {
        errors.startTime = 'Start time must be between 6:00 AM and 9:00 PM';
      }
      if (endHour < 6 || endHour > 21) {
        errors.endTime = 'End time must be between 6:00 AM and 10:00 PM';
      }
    }
    
    return errors;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateEditForm();
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }
    
    try {
      setEditSaving(true);
      
      const updateData = {
        start_time: editForm.startTime,
        end_time: editForm.endTime,
        course_id: editForm.courseId,
        available: editForm.available,
        time_zone: editForm.timeZone,
        notes: editForm.notes,
        updateOption: editUpdateOption
      };
      
      const result = await API.availability.updateAvailability(editingTimeslot.id, updateData);
      
      if (result) {
        await handleAvailabilityRefresh();
        setShowEditTimeslotModal(false);
        setEditingTimeslot(null);
        alert('Time slot updated successfully!');
      } else {
        throw new Error('Failed to update timeslot');
      }
      
    } catch (error) {
      console.error('Error updating timeslot:', error);
      setEditErrors({ general: error.message || 'Failed to update time slot.' });
    } finally {
      setEditSaving(false);
    }
  };

  // TimeSlot Deletion Functions
  const handleDeleteTimeslot = (slot) => {
    setDeletingTimeslot(slot);
    setDeleteOption('single');
    setShowDeleteTimeslotModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTimeslot) return;
    
    try {
      setDeleteLoading(true);
      
      const result = await API.availability.deleteAvailability(deletingTimeslot.id, {
        deleteOption: deleteOption
      });
      
      if (result) {
        await handleAvailabilityRefresh();
        setShowDeleteTimeslotModal(false);
        setDeletingTimeslot(null);
        alert('Time slot deleted successfully!');
      } else {
        throw new Error('Failed to delete timeslot');
      }
      
    } catch (error) {
      console.error('Error deleting timeslot:', error);
      alert(error.message || 'Failed to delete time slot.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Update user profile timezone (silent update)
  const updateUserProfileTimezone = async (userId, timezone) => {
    try {
      await API.users.updateUserProfile(userId, { 
        profile: { 
          timezone: timezone
        } 
      });
      
      // Update current user object
      const updatedUser = {
        ...currentUser,
        profile: {
          ...currentUser.profile,
          timezone: timezone
        }
      };
      
      setCurrentUser(updatedUser);
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
    } catch (error) {
      console.warn('Failed to update user profile timezone:', error);
      // Don't show error to user for this silent update
    }
  };

  // Timezone Management Functions  
  const handleTimezoneUpdate = async () => {
    if (!selectedTimezone || selectedTimezone === timezoneSettings.timezone) return;
    
    try {
      setIsUpdatingTimezone(true);
      
      const newSettings = {
        ...timezoneSettings,
        timezone: selectedTimezone
      };
      
      await API.users.updateUserProfile(currentUser.id, { 
        profile: { 
          timezone: selectedTimezone,
          timezone_settings: newSettings
        } 
      });
      
      const updatedUser = {
        ...currentUser,
        profile: {
          ...currentUser.profile,
          timezone: selectedTimezone
        }
      };
      
      setCurrentUser(updatedUser);
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setTimezoneSettings(newSettings);
      
      // Persist to localStorage
      saveUserTimezone(selectedTimezone);
      
      await handleAvailabilityRefresh();
      setShowTimezoneModal(false);
      alert('Timezone settings updated successfully!');
      
    } catch (error) {
      console.error('Error updating timezone:', error);
      alert('Failed to update timezone settings.');
    } finally {
      setIsUpdatingTimezone(false);
    }
  };

  // Real-time Validation and Conflict Detection Functions
  const validateTimeField = (value, fieldName) => {
    if (!value) return `${fieldName} is required`;
    
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(value)) return 'Please use HH:MM format';
    
    const [hours, minutes] = value.split(':').map(Number);
    const totalHours = hours + minutes / 60;
    
    if (totalHours < 6 || totalHours >= 21) {
      return 'Time must be between 6:00 AM and 9:00 PM';
    }
    
    return '';
  };
  
  const validateTimeRange = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    
    // Ensure proper time format
    const normalizedStart = startTime.includes(':') ? startTime : `${startTime}:00`;
    const normalizedEnd = endTime.includes(':') ? endTime : `${endTime}:00`;
    
    const start = new Date(`1970-01-01T${normalizedStart}:00`);
    const end = new Date(`1970-01-01T${normalizedEnd}:00`);
    
    if (start >= end) return 'End time must be after start time';
    
    const diffHours = (end - start) / (1000 * 60 * 60);
    // Allow up to 1 hour (use >= instead of > to allow exactly 1 hour)
    if (diffHours > 1.01) return 'Time slots cannot exceed 1 hour'; // Small tolerance for floating point
    
    return '';
  };
  
  const checkTimeConflicts = async (date, startTime, endTime, excludeSlotId = null) => {
    if (!date || !startTime || !endTime) return { hasConflicts: false, conflicts: [] };
    
    try {
      // Check against existing time slots
      const existingSlots = await API.availability.checkTimeConflicts({
        tutorId: currentUser.id,
        date: date,
        startTime: startTime,
        endTime: endTime,
        excludeSlotId: excludeSlotId
      });
      
      const conflicts = existingSlots.filter(slot => 
        timesOverlap(startTime, endTime, slot.start_time || slot.startTime, slot.end_time || slot.endTime)
      );
      
      return {
        hasConflicts: conflicts.length > 0,
        conflicts: conflicts,
        message: conflicts.length > 0 ? 
          `${conflicts.length} existing time slot(s) conflict with this time` : ''
      };
    } catch (error) {
      console.warn('⚠️ Could not check time conflicts:', error);
      return { hasConflicts: false, conflicts: [], message: 'Could not verify conflicts' };
    }
  };
  
  const validateFieldRealTime = async (fieldName, value, formData = {}) => {
    let error = '';
    let warning = '';
    
    switch (fieldName) {
      case 'startTime':
      case 'endTime':
        error = validateTimeField(value, fieldName === 'startTime' ? 'Start time' : 'End time');
        if (!error && formData.startTime && formData.endTime) {
          const rangeError = validateTimeRange(
            fieldName === 'startTime' ? value : formData.startTime,
            fieldName === 'endTime' ? value : formData.endTime
          );
          if (rangeError) error = rangeError;
        }
        break;
        
      case 'date':
        if (value) {
          // Parse date string without timezone conversion
          const [year, month, day] = value.split('-').map(Number);
          const selectedDate = new Date(year, month - 1, day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (selectedDate < today) {
            error = 'Cannot create slots for past dates';
          } else if (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) {
            warning = 'Weekend slots may have lower booking rates';
          }
        }
        break;
        
      case 'courseId':
        if (!value) error = 'Please select a course';
        break;
        
      case 'recurrenceDays':
        if (formData.isRecurring && (!value || value.length === 0)) {
          error = 'Please select at least one day for recurring slots';
        }
        break;
        
      case 'recurrenceEndDate':
        if (value) {
          const endDate = new Date(value);
          const today = new Date();
          
          if (endDate <= today) {
            error = 'End date must be in the future';
          }
        }
        break;
    }
    
    // Check for time conflicts if we have all necessary data
    if (!error && (fieldName === 'startTime' || fieldName === 'endTime' || fieldName === 'date')) {
      const checkDate = fieldName === 'date' ? value : formData.date;
      const checkStartTime = fieldName === 'startTime' ? value : formData.startTime;
      const checkEndTime = fieldName === 'endTime' ? value : formData.endTime;
      
      if (checkDate && checkStartTime && checkEndTime && !error) {
        const conflictCheck = await checkTimeConflicts(checkDate, checkStartTime, checkEndTime);
        if (conflictCheck.hasConflicts) {
          warning = conflictCheck.message;
        }
      }
    }
    
    return { error, warning };
  };
  
  const handleFieldChange = async (fieldName, value) => {
    // Update form data immediately for responsive UI
    setTimeslotForm(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear existing errors for this field
    setTimeslotErrors(prev => ({ ...prev, [fieldName]: '' }));
    
    // Perform real-time validation with debouncing
    setTimeout(async () => {
      const currentFormData = { ...timeslotForm, [fieldName]: value };
      const validation = await validateFieldRealTime(fieldName, value, currentFormData);
      
      if (validation.error || validation.warning) {
        setTimeslotErrors(prev => ({
          ...prev,
          [fieldName]: validation.error,
          [`${fieldName}Warning`]: validation.warning
        }));
      }
    }, 300); // 300ms debounce
  };

  // TimeSlot Creation Functions
  const validateTimeslotForm = () => {
    const errors = {};
    
    if (!timeslotForm.startTime) errors.startTime = 'Start time is required';
    if (!timeslotForm.endTime) errors.endTime = 'End time is required';
    if (!timeslotForm.courseId) errors.courseId = 'Please select a course';
    
    // Time validation
    if (timeslotForm.startTime && timeslotForm.endTime) {
      // Ensure proper time format
      const normalizedStart = timeslotForm.startTime.includes(':') ? timeslotForm.startTime : `${timeslotForm.startTime}:00`;
      const normalizedEnd = timeslotForm.endTime.includes(':') ? timeslotForm.endTime : `${timeslotForm.endTime}:00`;
      
      const start = new Date(`1970-01-01T${normalizedStart}:00`);
      const end = new Date(`1970-01-01T${normalizedEnd}:00`);
      const diffHours = (end - start) / (1000 * 60 * 60);
      
      console.log('Time validation debug:', {
        startTime: timeslotForm.startTime,
        endTime: timeslotForm.endTime,
        normalizedStart,
        normalizedEnd,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        diffHours,
        startGreaterOrEqual: start >= end,
        diffGreaterThan1: diffHours > 1.01
      });
      
      if (start >= end) errors.endTime = 'End time must be after start time';
      // Allow up to 1 hour with small tolerance for floating point precision
      if (diffHours > 1.01) errors.endTime = 'Time slots cannot exceed 1 hour';
      
      const startHour = start.getHours();
      const endHour = end.getHours();
      
      if (startHour < 6 || startHour >= 21) {
        errors.startTime = 'Start time must be between 6:00 AM and 9:00 PM';
      }
      if (endHour < 6 || endHour > 21) {
        errors.endTime = 'End time must be between 6:00 AM and 10:00 PM';
      }
    }
    
    // Date validation for single slots
    if (timeslotForm.type === 'single' && timeslotForm.date) {
      // Check if date-time combination is in the future
      if (timeslotForm.date && timeslotForm.startTime) {
        const selectedDateTime = new Date(`${timeslotForm.date}T${timeslotForm.startTime}`);
        const now = new Date();
        if (selectedDateTime <= now) {
          errors.date = 'Selected date and time must be in the future';
        }
      } else {
        // If no start time selected yet, only check if date is not in the past
        const [year, month, day] = timeslotForm.date.split('-').map(Number);
        const selectedDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          errors.date = 'Date cannot be in the past';
        }
      }
    }
    
    // Recurring validation
    if (timeslotForm.isRecurring) {
      if (timeslotForm.recurrenceDays.length === 0) {
        errors.recurrenceDays = 'Please select at least one day';
      }
      
      if (timeslotForm.recurrenceEndDate) {
        const endDate = new Date(timeslotForm.recurrenceEndDate);
        const today = new Date();
        
        if (endDate <= today) {
          errors.recurrenceEndDate = 'End date must be in the future';
        }
      }
    }
    
    return errors;
  };

  const timesOverlap = (start1, end1, start2, end2) => {
    const s1 = new Date(`1970-01-01T${start1}:00`);
    const e1 = new Date(`1970-01-01T${end1}:00`);
    const s2 = new Date(`1970-01-01T${start2}:00`);
    const e2 = new Date(`1970-01-01T${end2}:00`);
    
    return s1 < e2 && e1 > s2;
  };

  // Helper function to create properly formatted recurring data
  // Timezone validation helper
  const validateTimezone = (timezone) => {
    if (!timezone) return false;
    try {
      // Test if timezone is valid by trying to create a date with it
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  };

  const createRecurringData = (formData) => {
    // Validate required fields
    if (!formData.recurrenceDays || formData.recurrenceDays.length === 0) {
      throw new Error('At least one recurrence day must be selected');
    }
    
    if (!formData.date) {
      throw new Error('Start date is required for recurring slots');
    }
    
    if (!formData.startTime || !formData.endTime) {
      throw new Error('Start time and end time are required');
    }
    
    // Enhanced timezone validation
    const timezone = formData.timeZone || timezoneSettings.timezone || 'UTC';
    
    if (!validateTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}. Please check your timezone settings.`);
    }
    
    console.log('🌍 Creating recurring slots in timezone:', timezone);
    console.log('🌍 Timezone settings state:', timezoneSettings);
    
    // Convert JavaScript day indices to Python day indices for backend
    const convertedRecurrenceDays = convertDayArrayToPython(formData.recurrenceDays);
    
    console.log('🔄 Day index conversion:', {
      originalJSDays: formData.recurrenceDays,
      convertedPythonDays: convertedRecurrenceDays,
      jsMapping: 'Sunday=0, Monday=1, ..., Saturday=6',
      pythonMapping: 'Monday=0, Tuesday=1, ..., Sunday=6'
    });
    
    // Create the data structure expected by backend
    const recurringData = {
      tutorId: currentUser.id,
      startDate: formData.date, // ✅ Added missing startDate field
      startTime: formData.startTime,
      endTime: formData.endTime,
      recurrenceType: 'weekly',
      recurrenceDays: convertedRecurrenceDays, // ✅ Now using converted Python indices
      recurrenceEndDate: formData.recurrenceEndDate ? 
        formData.recurrenceEndDate + 'T23:59:59' : null,
      courseId: formData.courseId || null,
      timeZone: timezone, // ✅ Fixed timezone handling with fallback
      notes: formData.notes || ''
    };
    
    console.log('📋 Created recurring data with converted days:', recurringData);
    return recurringData;
  };

  const handleTimeslotSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateTimeslotForm();
    if (Object.keys(errors).length > 0) {
      setTimeslotErrors(errors);
      return;
    }
    
    try {
      setTimeslotSaving(true);
      
      console.log('🚀 Creating timeslot:', timeslotForm);
      
      if (timeslotForm.isRecurring) {
        const recurringData = createRecurringData(timeslotForm);
        
        const result = await API.availability.createRecurringAvailability(recurringData);
        
        if (result.success) {
          await handleAvailabilityRefresh();
          setShowCreateTimeslotModal(false);
          alert('Recurring time slots created successfully!');
        } else {
          // Enhanced error handling with specific field information
          let errorMessage = result.error || 'Failed to create recurring timeslot';
          
          if (result.missingFields) {
            errorMessage = `Missing required fields: ${result.missingFields.join(', ')}`;
          } else if (result.field) {
            errorMessage = `Error with ${result.field}: ${result.error}`;
          }
          
          console.error('❌ Backend validation error:', result);
          throw new Error(errorMessage);
        }
      } else {
        // Create single time slot using the new API endpoint
        const dayOfWeek = getDayOfWeekFromString(timeslotForm.date);
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
        
        const timeSlotData = {
          timeSlot: {
            startTime: timeslotForm.startTime,
            endTime: timeslotForm.endTime,
            course: timeslotForm.courseId,
            courseId: timeslotForm.courseId,
            timeZone: timeslotForm.timeZone,
            specificDate: timeslotForm.date,
            notes: timeslotForm.notes
          },
          day: dayName
        };
        
        const result = await API.availability.createSingleTimeSlot(currentUser.id, timeSlotData);
        
        if (result && (result.message || result.success)) {
          await handleAvailabilityRefresh();
          setShowCreateTimeslotModal(false);
          alert('Time slot created successfully!');
        } else {
          throw new Error('Failed to create timeslot');
        }
      }
      
    } catch (error) {
      console.error('❌ Error creating timeslot:', error);
      
      // Enhanced error message based on error type
      let userMessage = error.message || 'Failed to create time slot. Please try again.';
      
      if (error.message && error.message.includes('timezone')) {
        userMessage = 'Timezone error: Please check your timezone settings and try again.';
      } else if (error.message && error.message.includes('Missing required fields')) {
        userMessage = error.message + '. Please fill out all required information.';
      } else if (error.message && error.message.includes('Invalid')) {
        userMessage = error.message + '. Please check your input values.';
      }
      
      setTimeslotErrors({ 
        general: userMessage
      });
    } finally {
      setTimeslotSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };


  const markNotificationRead = async (notificationId) => {
    try {
      await API.notifications.markNotificationRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Delete session functions
  const handleDeleteSession = (session) => {
    setSelectedSessionForDeletion(session);
    setShowDeleteSessionModal(true);
  };

  const handleDeleteSessionConfirm = async () => {
    if (!selectedSessionForDeletion) return;

    try {
      setIsDeletingSession(true);
      await API.sessions.deleteSession(selectedSessionForDeletion.id);
      
      // Remove session from upcoming sessions list
      setUpcomingSessions(prev => 
        prev.filter(session => session.id !== selectedSessionForDeletion.id)
      );
      
      // Close modal and reset state
      setShowDeleteSessionModal(false);
      setSelectedSessionForDeletion(null);
      
      // Show success message (you could implement a toast notification here)
      alert(`Session "${selectedSessionForDeletion.title || selectedSessionForDeletion.topic || 'Session'}" has been deleted successfully.`);
      
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    } finally {
      setIsDeletingSession(false);
    }
  };

  const handleDeleteSessionCancel = () => {
    setShowDeleteSessionModal(false);
    setSelectedSessionForDeletion(null);
  };


  // Grade level utility functions
  const getGradeLevelOptions = (country) => {
    const isUS = country?.toLowerCase() === 'united states' || country?.toLowerCase() === 'us' || country?.toLowerCase() === 'usa';

    if (isUS) {
      return Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);
    } else {
      return Array.from({ length: 13 }, (_, i) => `Year ${i + 1}`);
    }
  };

  const getGradeLevelIndex = (gradeLevel, country) => {
    const options = getGradeLevelOptions(country);
    return options.indexOf(gradeLevel);
  };

  const getAutoSelectedGradeLevels = (tutorGradeLevel, country) => {
    const options = getGradeLevelOptions(country);
    const tutorIndex = getGradeLevelIndex(tutorGradeLevel, country);
    
    if (tutorIndex === -1) return [];
    
    // Return all grade levels up to (but not including) the tutor's grade level
    return options.slice(0, tutorIndex);
  };

  // Professional info editing functions
  const openProfessionalEditModal = () => {
    setProfessionalForm({
      academicCountry: currentUser?.academicCountry || currentUser?.profile?.academic_country || '',
      subjects: currentUser?.subjects || [],
      tutorGradeLevel: currentUser?.tutorGradeLevel || currentUser?.profile?.tutor_grade_level || '',
      gradeLevelsTaught: currentUser?.gradeLevelsTaught || currentUser?.profile?.grade_levels_taught || []
    });
    setProfessionalErrors({});
    setShowProfessionalEditModal(true);
  };

  const handleProfessionalFormChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...professionalForm, [name]: value };
    setProfessionalForm(updatedForm);

    // Clear errors
    setProfessionalErrors(prev => ({ ...prev, [name]: '' }));

    // Auto-select grade levels taught when tutor grade level changes
    if (name === 'tutorGradeLevel') {
      const country = currentUser?.academicCountry || currentUser?.profile?.academic_country || '';
      const autoSelected = getAutoSelectedGradeLevels(value, country);
      setProfessionalForm(prev => ({
        ...prev,
        gradeLevelsTaught: autoSelected
      }));
    }
  };


  const validateProfessionalForm = () => {
    const errors = {};

    if (!professionalForm.academicCountry) {
      errors.academicCountry = 'Please select your academic country';
    }

    if (!professionalForm.subjects || professionalForm.subjects.length === 0) {
      errors.subjects = 'Please select at least one subject';
    }

    if (!professionalForm.tutorGradeLevel) {
      errors.tutorGradeLevel = 'Please select your grade level';
    }

    if (!professionalForm.gradeLevelsTaught || professionalForm.gradeLevelsTaught.length === 0) {
      errors.gradeLevelsTaught = 'Please select grade levels you can teach';
    }

    return errors;
  };

  const handleProfessionalSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateProfessionalForm();
    setProfessionalErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setProfessionalSaving(true);
      
      // Update profile via API
      const profileUpdate = {
        academic_country: professionalForm.academicCountry,
        subjects: professionalForm.subjects,
        tutor_grade_level: professionalForm.tutorGradeLevel,
        grade_levels_taught: professionalForm.gradeLevelsTaught
      };

      await API.users.updateUserProfile(currentUser.id, { profile: profileUpdate });

      // Update local state
      const updatedUser = {
        ...currentUser,
        academicCountry: professionalForm.academicCountry,
        subjects: professionalForm.subjects,
        tutorGradeLevel: professionalForm.tutorGradeLevel,
        gradeLevelsTaught: professionalForm.gradeLevelsTaught,
        profile: {
          ...currentUser.profile,
          ...profileUpdate
        }
      };
      
      setCurrentUser(updatedUser);
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      setShowProfessionalEditModal(false);
      alert('Professional information updated successfully! Your subjects will now be visible to admins and in course matching.');
      
    } catch (error) {
      console.error('Error updating professional information:', error);
      let errorMessage = 'Failed to update professional information. ';
      
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      
      alert(errorMessage);
    } finally {
      setProfessionalSaving(false);
    }
  };

  // Change password handler
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
















  // Toggle selection mode for list view
  const toggleListSelectionMode = () => {
    setListSelectionMode(!listSelectionMode);
    if (listSelectionMode) {
      setSelectedListSlots(new Set());
      setSelectedListSlotsMap(new Map());
    }
  };

  // Handle slot selection in list view
  const toggleListSlotSelection = (slotId, slotData = null) => {
    const newSelectionSet = new Set(selectedListSlots);
    const newSelectionMap = new Map(selectedListSlotsMap);
    
    if (newSelectionSet.has(slotId)) {
      newSelectionSet.delete(slotId);
      newSelectionMap.delete(slotId);
    } else {
      newSelectionSet.add(slotId);
      if (slotData) {
        newSelectionMap.set(slotId, slotData);
      }
    }
    
    setSelectedListSlots(newSelectionSet);
    setSelectedListSlotsMap(newSelectionMap);
  };

  // Select all slots in list view
  const selectAllListSlots = () => {
    const allSlotIds = new Set();
    const allSlotsMap = new Map();
    
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    daysOfWeek.forEach(dayKey => {
      const dayData = availability[dayKey];
      const timeSlots = dayData?.timeSlots || [];
      
      timeSlots.forEach(slot => {
        const slotId = slot.id || `${dayKey}_${slot.startTime}_${slot.endTime}`;
        allSlotIds.add(slotId);
        allSlotsMap.set(slotId, slot);
      });
    });
    
    setSelectedListSlots(allSlotIds);
    setSelectedListSlotsMap(allSlotsMap);
  };

  // Clear selection in list view
  const clearListSelection = () => {
    setSelectedListSlots(new Set());
    setSelectedListSlotsMap(new Map());
  };

  // Delete selected slots in list view
  const deleteSelectedListSlots = async () => {
    console.log('Delete button clicked, selected slots:', selectedListSlots);
    console.log('Selected slots map:', selectedListSlotsMap);
    
    if (selectedListSlots.size === 0) {
      alert('No slots selected for deletion');
      return;
    }

    // Show custom confirmation modal instead of browser confirm
    setShowBulkDeleteConfirm(true);
  };

  // Confirm bulk deletion
  const confirmBulkDeletion = () => {
    setShowBulkDeleteConfirm(false);
    console.log('User confirmed deletion, proceeding...');
    proceedWithDeletion();
  };

  // Cancel bulk deletion
  const cancelBulkDeletion = () => {
    setShowBulkDeleteConfirm(false);
    console.log('User cancelled deletion');
  };

  const proceedWithDeletion = async () => {

    setDeleteLoading(true);
    console.log('Setting delete loading to true');
    
    try {
      // Use bulk delete API with all selected slot IDs
      const validSlotIds = Array.from(selectedListSlots).filter(slotId => 
        slotId && slotId.startsWith('availability_')
      );
      
      console.log('Valid slot IDs to delete:', validSlotIds);
      
      if (validSlotIds.length > 0) {
        console.log('Making bulk delete API call...');
        await API.availability.bulkDeleteAvailability(currentUser.id, validSlotIds, 'single');
        console.log('Bulk deletion completed');
      } else {
        console.log('No valid slots to delete');
      }
      
      // Clear selection and reload data
      clearListSelection();
      setListSelectionMode(false);
      console.log('Reloading availability data...');
      await loadAvailabilityData();
      
      console.log('Showing success alert');
      alert(`Successfully deleted ${selectedListSlots.size} slot${selectedListSlots.size > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error deleting selected slots:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert('Failed to delete some slots. Please try again.');
    } finally {
      console.log('Setting delete loading to false');
      setDeleteLoading(false);
    }
  };

  // Render Enhanced List View
  const renderListView = () => {
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    return (
      <div className="availability-list-view">
        {/* Selection mode controls */}
        {listSelectionMode && (
          <div className="selection-mode-bar">
            <div className="selection-info">
              <span className="selection-count">{selectedListSlots.size} selected</span>
            </div>
            <div className="selection-actions">
              <button 
                className="btn small secondary"
                onClick={selectAllListSlots}
              >
                Select All
              </button>
              <button 
                className="btn small secondary"
                onClick={clearListSelection}
              >
                Clear Selection
              </button>
              <button 
                className="btn small danger"
                onClick={deleteSelectedListSlots}
                disabled={selectedListSlots.size === 0 || deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : `Delete (${selectedListSlots.size})`}
              </button>
              <button 
                className="btn small secondary"
                onClick={toggleListSelectionMode}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {dayNames.map((dayName, index) => {
          const dayKey = daysOfWeek[index];
          const dayData = availability[dayKey];
          const timeSlots = dayData?.timeSlots || [];
          
          return (
            <div key={dayName} className="day-section enhanced">
              <div className="day-header enhanced">
                <div className="day-title-group">
                  <h3 className="day-name">{dayName}</h3>
                  <span className="slot-count">
                    {timeSlots.length} {timeSlots.length === 1 ? 'slot' : 'slots'}
                  </span>
                </div>
                <div className="day-actions">
                  <button 
                    className="btn small primary add-slot-btn"
                    onClick={() => {
                      setTimeslotForm({
                        type: 'single',
                        date: new Date().toISOString().split('T')[0],
                        startTime: '',
                        endTime: '',
                        courseId: '',
                        isRecurring: false,
                        recurrenceDays: [index],
                        recurrenceEndDate: '',
                        notes: '',
                        timeZone: timezoneSettings.timezone
                      });
                      setTimeslotErrors({});
                      setShowCreateTimeslotModal(true);
                    }}
                  >
                    <span className="btn-icon">➕</span>
                    Add Slot
                  </button>
                </div>
              </div>
              
              <div className="day-slots-list enhanced">
                {timeSlots.length === 0 ? (
                  <div className="empty-day-state">
                    <div className="empty-icon">🕰</div>
                    <p>No time slots available for {dayName}</p>
                    <button 
                      className="btn small secondary create-first-slot"
                      onClick={() => {
                        setTimeslotForm({
                          type: 'single',
                          date: new Date().toISOString().split('T')[0],
                          startTime: '',
                          endTime: '',
                          courseId: '',
                          isRecurring: false,
                          recurrenceDays: [index],
                          recurrenceEndDate: '',
                          notes: '',
                          timeZone: timezoneSettings.timezone
                        });
                        setTimeslotErrors({});
                        setShowCreateTimeslotModal(true);
                      }}
                    >
                      Create your first slot
                    </button>
                  </div>
                ) : (
                  timeSlots.map((slot, slotIndex) => {
                    const course = assignedCourses.find(c => c.id === slot.courseId || c.id === slot.course);
                    const courseTitle = course ? course.title : (slot.course || 'No course assigned');
                    const startTime = slot.startTime || (slot.time?.split('-')[0]);
                    const endTime = slot.endTime || (slot.time?.split('-')[1]);
                    const slotId = slot.id || `${dayKey}_${startTime}_${endTime}`;
                    const isSelected = selectedListSlots.has(slotId);
                    
                    return (
                      <div key={slotIndex} className={`slot-item enhanced ${isSelected ? 'selected' : ''}`}>
                        {/* Selection checkbox */}
                        {listSelectionMode && (
                          <div className="slot-selection">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleListSlotSelection(slotId, slot)}
                              className="slot-checkbox"
                            />
                          </div>
                        )}
                        <div className="slot-main-info">
                          <div className="slot-time-info">
                            <div className="time-range">
                              <span className="start-time">{startTime}</span>
                              <span className="time-separator">-</span>
                              <span className="end-time">{endTime}</span>
                            </div>
                            <div className="duration-badge">
                              {(() => {
                                if (startTime && endTime) {
                                  const [startHour, startMin] = startTime.split(':').map(Number);
                                  const [endHour, endMin] = endTime.split(':').map(Number);
                                  const duration = (endHour + endMin/60) - (startHour + startMin/60);
                                  return `${duration}h`;
                                }
                                return '1h';
                              })()}
                            </div>
                          </div>
                          
                          {/* Show specific date if available */}
                          {slot.specificDate && (
                            <div className="slot-date-info">
                              <span className="date-icon">📅</span>
                              <span className="specific-date">
                                {(() => {
                                  try {
                                    // Handle timezone-aware date strings properly
                                    const date = new Date(slot.specificDate);
                                    if (isNaN(date.getTime())) return 'Invalid Date';
                                    return date.toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    });
                                  } catch (error) {
                                    console.warn('Availability date formatting error:', error);
                                    return 'Date Error';
                                  }
                                })()}
                              </span>
                            </div>
                          )}
                          
                          <div className="slot-course-info">
                            <div className="course-name">
                              <span className="course-icon">📚</span>
                              {courseTitle}
                            </div>
                            {course && (
                              <div className="course-subject">{course.subject}</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="slot-status-actions">
                          <div className="slot-status">
                            <span className={`status-badge ${
                              slot.isBooked ? 'booked' : 
                              slot.hasConflict ? 'conflict' : 
                              'available'
                            }`}>
                              {slot.isBooked ? '📅 Booked' : 
                               slot.hasConflict ? '⚠️ Conflict' : 
                               '✅ Available'}
                            </span>
                          </div>
                          
                          <div className="slot-actions">
                            {!listSelectionMode && (
                              <>
                            <button 
                              className="action-btn edit"
                              onClick={() => {
                                setEditingTimeslot(slot);
                                setEditForm({
                                  startTime: startTime,
                                  endTime: endTime,
                                  courseId: slot.courseId || slot.course,
                                  available: slot.available !== false,
                                  timeZone: slot.timeZone || timezoneSettings.timezone
                                });
                                setEditErrors({});
                                setShowEditTimeslotModal(true);
                              }}
                              title="Edit time slot"
                            >
                              <span className="action-icon">✏️</span>
                            </button>
                            <button 
                              className="action-btn duplicate"
                              onClick={() => {
                                setTimeslotForm({
                                  type: 'single',
                                  date: new Date().toISOString().split('T')[0],
                                  startTime: startTime,
                                  endTime: endTime,
                                  courseId: slot.courseId || slot.course,
                                  isRecurring: false,
                                  recurrenceDays: [index],
                                  recurrenceEndDate: '',
                                  notes: '',
                                  timeZone: timezoneSettings.timezone
                                });
                                setTimeslotErrors({});
                                setShowCreateTimeslotModal(true);
                              }}
                              title="Duplicate time slot"
                            >
                              <span className="action-icon">📋</span>
                            </button>
                            <button 
                              className="action-btn delete"
                              onClick={() => {
                                setDeletingTimeslot(slot);
                                setDeleteOption('single');
                                setShowDeleteTimeslotModal(true);
                              }}
                              title="Delete time slot"
                            >
                              <span className="action-icon">🗑️</span>
                            </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Availability Section with Professional UI
  const renderAvailability = () => (
    <div className="availability-section">
      {/* Enhanced Header with Actions */}
      <div className="section-header availability-header">
        <div className="header-content">
          <div className="title-group">
            <h2>
              <span className="section-icon">📅</span>
              Availability Management
            </h2>
            <p className="section-description">
              Create and manage your teaching schedule. Set up time slots for students to book sessions.
            </p>
          </div>
          <div className="timezone-display">
            <span className="timezone-label">Timezone:</span>
            <span className="timezone-value">{timezoneSettings.timezone}</span>
            <button 
              className="timezone-edit-btn"
              onClick={() => setShowTimezoneModal(true)}
              title="Change timezone settings"
            >
              ⚙️
            </button>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className={`btn refresh-btn ${isRefreshing ? 'loading' : ''}`}
            onClick={triggerRefresh}
            disabled={isRefreshing}
            title="Refresh availability data"
          >
            {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
          </button>
          <button 
            className="btn primary create-slot-btn"
            onClick={() => {
              setTimeslotForm({
                type: 'single',
                date: selectedDate instanceof Date ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                startTime: '',
                endTime: '',
                courseId: '',
                isRecurring: false,
                recurrenceDays: [],
                recurrenceEndDate: '',
                notes: '',
                timeZone: timezoneSettings.timezone
              });
              setTimeslotErrors({});
              setShowCreateTimeslotModal(true);
            }}
            disabled={availabilityLoading}
          >
            <span className="btn-icon">➕</span>
            Create Time Slot
          </button>
          <button 
            className="btn secondary settings-btn"
            onClick={() => setShowTimezoneModal(true)}
          >
            <span className="btn-icon">⚙️</span>
            Settings
          </button>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="availability-stats">
        <div className="stat-card total-slots">
          <div className="stat-header">
            <div className="stat-icon">📊</div>
            <h3>Total Slots</h3>
          </div>
          <div className="stat-value">{availabilityStats.totalSlots || 0}</div>
          <div className="stat-trend">
            {availabilityStats.recurringSlots > 0 && `${availabilityStats.recurringSlots} recurring`}
            {availabilityStats.recurringSlots === 0 && 'Active time slots'}
          </div>
        </div>
        
        <div className="stat-card utilization">
          <div className="stat-header">
            <div className="stat-icon">📈</div>
            <h3>Utilization</h3>
          </div>
          <div className="stat-value">
            {availabilityStats.utilizationRate || 0}%
          </div>
          <div className="stat-trend">
            {availabilityStats.bookedSlots || 0}/{availabilityStats.totalSlots || 0} booked
          </div>
        </div>
        
        <div className="stat-card weekly-hours">
          <div className="stat-header">
            <div className="stat-icon">⏰</div>
            <h3>This Week</h3>
          </div>
          <div className="stat-value">{availabilityStats.weeklyHours || 0}h</div>
          <div className="stat-trend">Available hours</div>
        </div>
        
        <div className="stat-card earnings">
          <div className="stat-header">
            <div className="stat-icon">💰</div>
            <h3>Potential</h3>
          </div>
          <div className="stat-value">£{(availabilityStats.estimatedWeeklyEarnings || 0).toFixed(2)}</div>
          <div className="stat-trend">Weekly estimate</div>
        </div>
        
        <div className="stat-card completion-rate">
          <div className="stat-header">
            <div className="stat-icon">✅</div>
            <h3>Completion</h3>
          </div>
          <div className="stat-value">{availabilityStats.completionRate || 0}%</div>
          <div className="stat-trend">Session success</div>
        </div>
        
        <div className="stat-card peak-time">
          <div className="stat-header">
            <div className="stat-icon">🌟</div>
            <h3>Peak Time</h3>
          </div>
          <div className="stat-value">
            {availabilityStats.peakPeriod === 'morning' && '🌅'}
            {availabilityStats.peakPeriod === 'afternoon' && '☀️'}
            {availabilityStats.peakPeriod === 'evening' && '🌙'}
            {availabilityStats.peakPeriod || 'N/A'}
          </div>
          <div className="stat-trend">Most active</div>
        </div>
        
        {availabilityStats.conflicts > 0 && (
          <div className="stat-card conflicts-card">
            <div className="stat-header">
              <div className="stat-icon warning">⚠️</div>
              <h3>Conflicts</h3>
            </div>
            <div className="stat-value conflict">{availabilityStats.conflicts}</div>
            <div className="stat-trend">Need attention</div>
          </div>
        )}
      </div>

      {/* Enhanced Insights Panel */}
      {(availabilityStats.totalSlots > 0) && (
        <div className="availability-insights">
          <h3 className="insights-title">📈 Availability Insights</h3>
          <div className="insights-grid">
            <div className="insight-item">
              <div className="insight-icon">📚</div>
              <div className="insight-content">
                <h4>Course Variety</h4>
                <p>{availabilityStats.courseTypes} different course{availabilityStats.courseTypes !== 1 ? 's' : ''}</p>
              </div>
            </div>
            
            <div className="insight-item">
              <div className="insight-icon">📅</div>
              <div className="insight-content">
                <h4>Most Active Day</h4>
                <p>{availabilityStats.mostActiveDay || 'N/A'}</p>
              </div>
            </div>
            
            <div className="insight-item">
              <div className="insight-icon">🕐</div>
              <div className="insight-content">
                <h4>Popular Hour</h4>
                <p>{availabilityStats.mostActiveHour || 'N/A'}</p>
              </div>
            </div>
            
            <div className="insight-item">
              <div className="insight-icon">🔄</div>
              <div className="insight-content">
                <h4>Recurring Slots</h4>
                <p>{availabilityStats.recurringSlots || 0} setup</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced View Toggle */}
      <div className="availability-controls">
        <div className="view-toggle">
          <button 
            className={`toggle-btn ${availabilityView === 'calendar' ? 'active' : ''}`}
            onClick={() => setAvailabilityView('calendar')}
          >
            <span className="toggle-icon">📅</span>
            Calendar View
          </button>
          <button 
            className={`toggle-btn ${availabilityView === 'list' ? 'active' : ''}`}
            onClick={() => setAvailabilityView('list')}
          >
            <span className="toggle-icon">📋</span>
            List View
          </button>
          {availabilityView === 'list' && (
            <button 
              className={`toggle-btn ${listSelectionMode ? 'active' : ''}`}
              onClick={toggleListSelectionMode}
            >
              <span className="toggle-icon">✔️</span>
              {listSelectionMode ? 'Exit Selection' : 'Selection Mode'}
            </button>
          )}
        </div>
        
        <div className="view-options">
          <button className="filter-btn" title="Filter by course">
            <span className="filter-icon">🔍</span>
            Filter
          </button>
          <button 
            className="refresh-btn"
            onClick={handleAvailabilityRefresh}
            disabled={availabilityLoading}
            title="Refresh availability data"
          >
            <span className={`refresh-icon ${availabilityLoading ? 'spinning' : ''}`}>🔄</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {availabilityLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading availability...</p>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="availability-content">
        {availabilityView === 'calendar' ? (
          <div className="calendar-container">
            {!currentUser?.id ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Loading calendar...</p>
              </div>
            ) : (
              <TutorCalendar
                availability={availability}
                onDateClick={(date) => {
                  // Ensure we always set a proper Date object
                  const dateObj = date instanceof Date ? date : new Date(date);
                  setSelectedDate(dateObj);
                  // You can add logic here to open create modal for the selected date
                }}
                upcomingSessions={upcomingSessions}
                assignedCourses={assignedCourses}
                tutorId={currentUser.id}
                onAvailabilityDeleted={handleAvailabilityRefresh}
              />
            )}
          </div>
        ) : (
          <div className="list-container">
            {renderListView()}
          </div>
        )}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="dashboard-section">
      <div className="welcome-header">
        <div className={`header-content ${activeSection === 'dashboard' ? 'vertical-flow' : ''}`}>
          <div className="welcome-text">
            <h2>Welcome back, {currentUser?.name || currentUser?.email}{currentUser?.isVerified ? ' (Verified Tutor)' : ''}!</h2>
            <p>Here's your teaching overview for this month</p>
          </div>
          <button 
            className={`btn refresh-btn ${isRefreshing ? 'loading' : ''}`}
            onClick={triggerRefresh}
            disabled={isRefreshing}
            title="Refresh dashboard data"
          >
            {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      <div className="earnings-overview">
        <div className="earnings-card">
          <div className="earnings-icon">💰</div>
          <div className="earnings-info">
            <h3>Total Earnings</h3>
            <p className="amount">£{(earnings.totalEarnings || 0).toFixed(2)}</p>
            <p className="earnings-detail">{earnings.total?.totalHours || 0} hours taught</p>
          </div>
        </div>
        
        <div className="earnings-card">
          <div className="earnings-icon">📈</div>
          <div className="earnings-info">
            <h3>This Month</h3>
            <p className="amount">£{(earnings.thisMonth || 0).toFixed(2)}</p>
            <p className="earnings-detail">{earnings.monthly?.monthName || 'Current month'}</p>
          </div>
        </div>
        
        <div className="earnings-card">
          <div className="earnings-icon">⚡</div>
          <div className="earnings-info">
            <h3>This Week (Actual)</h3>
            <p className="amount">£{(earnings.actualWeekly?.actualEarnings || 0).toFixed(2)}</p>
            <p className="earnings-detail">{earnings.actualWeekly?.totalSessions || 0} sessions completed</p>
          </div>
        </div>
        
        <div className="earnings-card">
          <div className="earnings-icon">🎯</div>
          <div className="earnings-info">
            <h3>This Week (Potential)</h3>
            <p className="amount">£{(earnings.potentialWeekly?.potentialEarnings || 0).toFixed(2)}</p>
            <p className="earnings-detail">{(earnings.potentialWeekly?.totalHours || 0).toFixed(1)} hours available</p>
          </div>
        </div>
        
        {earnings.efficiency?.rate && (
          <div className="earnings-card efficiency">
            <div className="earnings-icon">📊</div>
            <div className="earnings-info">
              <h3>Efficiency</h3>
              <p className="amount">{earnings.efficiency.rate}%</p>
              <p className="earnings-detail">Potential to actual ratio</p>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Sessions Cards */}
      {earnings.upcoming?.upcomingSessions?.length > 0 && (
        <div className="upcoming-sessions-section">
          <h3>Upcoming Sessions This Week ({earnings.upcoming.totalSessions})</h3>
          <div className="upcoming-sessions-grid">
            {earnings.upcoming.upcomingSessions.map((session, index) => (
              <div key={session.id || index} className="upcoming-session-card">
                <div className="session-header">
                  <div className="session-icon">📅</div>
                  <div className="session-title">{session.title || session.courseTitle}</div>
                </div>
                <div className="session-details">
                  <p className="session-date">
                    {new Date(session.date).toLocaleDateString('en-GB', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </p>
                  <p className="session-time">
                    {session.startTime} - {session.endTime}
                  </p>
                  <p className="session-students">
                    👥 {session.enrolledStudents}/{session.maxStudents} students
                  </p>
                  <p className="session-status">
                    <span className={`status-badge ${session.status}`}>
                      {session.status === 'scheduled' ? '⏱️ Scheduled' : '✅ Confirmed'}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-stats">
        <div className="stat-item">
          <h4>Rating</h4>
          <p className="stat-value">⭐ {currentUser?.rating || 0}/5.0</p>
        </div>
        <div className="stat-item">
          <h4>Total Sessions</h4>
          <p className="stat-value">{currentUser?.totalSessions || 0}</p>
        </div>
        <div className="stat-item">
          <h4>Subjects</h4>
          <p className="stat-value">{(currentUser?.subjects || []).join(', ')}</p>
        </div>
      </div>

      <div className="earnings-actions">
        <button className="cash-earnings-btn" onClick={() => alert('Cash out request initiated!')}>
          💳 Cash Out Earnings
        </button>
        <div className="earnings-note">
          <p>💡 Check your profile for minimum cash out requirements and processing times</p>
        </div>
      </div>
    </div>
  );


  const renderUpcomingSessions = () => {
    // Helper function to check if session is current
    const isSessionCurrent = (sessionDate, session) => {
      if (!sessionDate) return false;
      
      const now = new Date();
      const sessionDateTime = new Date(sessionDate);
      
      // Check if it's the same day
      const isSameDay = 
        now.getFullYear() === sessionDateTime.getFullYear() &&
        now.getMonth() === sessionDateTime.getMonth() &&
        now.getDate() === sessionDateTime.getDate();
      
      if (!isSameDay) return false;
      
      // Get session duration (default to 60 minutes if not specified)
      const sessionDurationMinutes = session?.duration || 60;
      
      // Calculate session end time
      const sessionEndTime = new Date(sessionDateTime.getTime() + (sessionDurationMinutes * 60 * 1000));
      
      // Session is active from 10 minutes before start until the session ends
      const timeDiffFromStart = sessionDateTime.getTime() - now.getTime();
      const minutesUntilStart = timeDiffFromStart / (1000 * 60);
      
      // Check if current time is within the active session period
      // Active from 10 minutes before start until session ends
      return minutesUntilStart <= 10 && now <= sessionEndTime;
    };

    // Pagination logic - use appropriate data based on selected view
    const displaySessions = sessionView === 'upcoming' ? upcomingSessions : sessionHistory;
    const totalSessions = displaySessions.length;
    const totalPages = Math.ceil(totalSessions / sessionsPerPage);
    const startIndex = (currentPage - 1) * sessionsPerPage;
    const endIndex = startIndex + sessionsPerPage;
    const currentSessions = displaySessions.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
      setCurrentPage(page);
    };

    const renderPagination = () => {
      if (totalPages <= 1) return null;

      const pages = [];
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`pagination-btn ${i === currentPage ? 'active' : ''}`}
          >
            {i}
          </button>
        );
      }

      return (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn pagination-nav"
          >
            ← Previous
          </button>
          {pages}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn pagination-nav"
          >
            Next →
          </button>
        </div>
      );
    };
    
    return (
      <div className="sessions-section">
        <div className="sessions-header">
          <div>
            <h3>Sessions</h3>
            <div className="session-tabs">
              <button 
                className={`session-tab ${sessionView === 'upcoming' ? 'active' : ''}`}
                onClick={() => setSessionView('upcoming')}
              >
                Upcoming ({upcomingSessions.length})
              </button>
              <button 
                className={`session-tab ${sessionView === 'history' ? 'active' : ''}`}
                onClick={() => setSessionView('history')}
              >
                History ({sessionHistory.length})
              </button>
            </div>
          </div>
          {totalSessions > 0 && (
            <div className="sessions-info">
              <span className="sessions-count">
                Showing {startIndex + 1}-{Math.min(endIndex, totalSessions)} of {totalSessions} sessions
              </span>
            </div>
          )}
        </div>
        
        <div className="sessions-list">
          {totalSessions === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{sessionView === 'upcoming' ? '📅' : '📚'}</div>
              <h4>{sessionView === 'upcoming' ? 'No Upcoming Sessions' : 'No Session History'}</h4>
              <p>{sessionView === 'upcoming' 
                ? 'You don\'t have any sessions scheduled yet. Sessions will appear here once they\'re booked.'
                : 'Your completed sessions will appear here. Once you complete sessions, they will be moved to history.'
              }</p>
            </div>
          ) : (
            currentSessions.map(session => {
              const sessionDate = session.scheduled_date || session.scheduledDate;
              const isCurrent = isSessionCurrent(sessionDate, session);
              
              return (
                <div key={session.id} className={`session-card zoom-meeting-card ${isCurrent ? 'session-current' : ''}`}>
                  {/* Session Status Indicator */}
                  {isCurrent && (
                    <div className="session-status-banner">
                      <span className="pulse-indicator"></span>
                      <span className="status-text">🔴 Session Ready - Join Now!</span>
                    </div>
                  )}
                  
                  {/* Session Header with Title and Status */}
                  <div className="zoom-header">
                    <div className="session-title-info">
                      <h4>{session.title || session.topic || 'Session'}</h4>
                      <div className="session-datetime-compact">
                        <span className="datetime-badge date-badge">
                          📅 {(session.scheduled_date || session.scheduledDate) ? 
                            (() => {
                              try {
                                // Handle timezone-aware date strings properly
                                const date = new Date(session.scheduled_date || session.scheduledDate);
                                if (isNaN(date.getTime())) return 'Invalid Date';
                                return date.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric'
                                });
                              } catch (error) {
                                console.warn('Date formatting error:', error);
                                return 'Date TBD';
                              }
                            })() : 'Date TBD'}
                        </span>
                        <span className="datetime-badge time-badge">
                          ⏰ {(session.scheduled_date || session.scheduledDate) ? 
                            new Date(session.scheduled_date || session.scheduledDate).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true
                            }) : 'Time TBD'}
                        </span>
                      </div>
                    </div>
                    <span className={`status-badge ${session.status || 'scheduled'}`}>
                      {sessionView === 'history' && session.status ? (
                        <>
                          {session.status === 'completed' && '✅ Completed'}
                          {session.status === 'cancelled' && '❌ Cancelled'}  
                          {session.status === 'no_show' && '👻 No Show'}
                          {!['completed', 'cancelled', 'no_show'].includes(session.status) && (session.status || 'scheduled')}
                        </>
                      ) : (
                        session.status || 'scheduled'
                      )}
                    </span>
                  </div>
                  
                  {/* Meeting Details */}
                  <div className="zoom-details">
                    <div className="meeting-info">
                      <span className="meeting-label">🆔 ID:</span>
                      <code className="meeting-value">{session.meetingId || 'Not Available'}</code>
                    </div>
                    <div className="meeting-info">
                      <span className="meeting-label">🔐 Pass:</span>
                      <code className="meeting-value">{session.meetingPassword || 'Not Set'}</code>
                    </div>
                  </div>
                  
                  {/* Session Stats */}
                  <div className="session-stats">
                    <span>👥 {session.enrolledCount || 0}/{session.maxStudents || 5}</span>
                    <span>⏱️ {session.duration || 60}min</span>
                    {session.module && <span>📚 {session.module}</span>}
                  </div>
                  
                  {/* Enrolled Students */}
                  <div className="enrolled-students">
                    <h5>Students ({(session.enrolledStudents || session.studentIds || []).length})</h5>
                    <div className="students-list">
                      {(session.enrolledStudents || session.studentIds || []).slice(0, 3).map((student, index) => (
                        <div key={index} className="student-item">
                          <div className="student-avatar">
                            <img src={student.avatar || ''} alt={student.name || 'Student'} onError={(e) => e.target.style.display = 'none'} />
                          </div>
                          <div className="student-info">
                            <div className="student-name">{student.name}</div>
                          </div>
                        </div>
                      ))}
                      {(session.enrolledStudents || []).length > 3 && (
                        <div className="student-item">
                          <div className="student-more">+{(session.enrolledStudents || []).length - 3} more</div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Meeting Actions */}
                  <div className="meeting-actions">
                    {sessionView === 'history' ? (
                      // History session actions
                      <>
                        <div className="session-summary">
                          <span className="summary-label">Duration:</span>
                          <span className="summary-value">{session.duration || 60} min</span>
                        </div>
                        {session.zoom_participants_count && (
                          <div className="session-summary">
                            <span className="summary-label">Participants:</span>
                            <span className="summary-value">{session.zoom_participants_count}</span>
                          </div>
                        )}
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            // Could add functionality to view session details/feedback
                            alert('Session completed on ' + new Date(sessionDate).toLocaleDateString());
                          }}
                          title="View session details"
                        >
                          📄 Details
                        </button>
                      </>
                    ) : (
                      // Upcoming session actions
                      <>
                        <a 
                          href={isCurrent ? (session.meetingStartUrl || session.meetingLink || '#') : '#'} 
                          target={isCurrent ? "_blank" : "_self"}
                          rel="noopener noreferrer"
                          className={`btn btn-primary host-link ${!isCurrent ? 'disabled' : ''}`}
                          onClick={(e) => {
                            if (!isCurrent) {
                              e.preventDefault();
                              alert('You can only join the meeting from 10 minutes before start until the session ends.');
                            }
                          }}
                          title={isCurrent ? 
                            'Click to start the Zoom meeting as host' : 
                            'Meeting will be available from 10 minutes before start until session ends'
                          }
                        >
                          {isCurrent ? '🎥 Start Meeting' : '🔒 Not Available'}
                        </a>
                        
                        <button
                          className="btn btn-danger delete-session-btn"
                          onClick={() => handleDeleteSession(session)}
                          title="Delete this session"
                          disabled={isCurrent}
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}
                    
                    {!isCurrent && sessionDate && sessionView === 'upcoming' && (
                      <div className="time-until-session">
                        <span className="time-indicator">
                          🔴 Starts: {new Date(sessionDate).toLocaleTimeString('en-US', { 
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
        })
        )}
      </div>
      
      {/* Pagination Controls */}
      {renderPagination()}
    </div>
    );
  };

  const renderQuizResults = () => (
    <div className="quiz-results-section">
      <h3>Student Quiz Results</h3>
      <p>View quiz performance of students in your courses</p>
      
      <div className="results-list">
        {quizResults.map((result, index) => (
          <div key={index} className="result-card">
            <div className="result-header">
              <h4>{result.studentName}</h4>
              <div className="score-badge">
                <span className="score">{result.score}%</span>
              </div>
            </div>
            <div className="result-details">
              <p><strong>Course:</strong> {result.course}</p>
              <p><strong>Module:</strong> {result.module}</p>
              <p><strong>Date:</strong> {result.date}</p>
              <p><strong>Performance:</strong> {result.correctAnswers}/{result.totalQuestions} correct</p>
            </div>
            <div className="result-actions">
              <button className="action-btn primary">View Details</button>
              <button className="action-btn secondary">Send Feedback</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="notifications-section">
      <h3>Notifications</h3>
      <p>Stay updated with session feedback and important updates</p>
      
      <div className="notifications-list">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`notification-item ${notification.read ? 'read' : 'unread'}`}
            onClick={() => markNotificationRead(notification.id)}
          >
            <div className="notification-icon">
              {notification.type === 'feedback' && '💬'}
              {notification.type === 'booking' && '📅'}
              {notification.type === 'payment' && '💰'}
            </div>
            <div className="notification-content">
              <p>{notification.message}</p>
              <span className="notification-date">{notification.date}</span>
            </div>
            {!notification.read && <div className="unread-dot"></div>}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSessionHistory = () => (
    <div className="history-section">
      <h3>Session History</h3>
      <p>Review your completed tutoring sessions</p>
      
      <div className="history-list">
        {sessionHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h4>No Session History</h4>
            <p>You haven't completed any sessions yet. Once you conduct your first session, it will appear here.</p>
          </div>
        ) : (
          sessionHistory.map(session => (
            <div key={session.id} className="history-item">
              <div className="history-main">
                <h4 className="session-title">{session.title || session.topic || 'Session'}</h4>
                <div className="session-datetime">
                  <span className="session-date">
                    📅 {(session.scheduled_date || session.date) ? 
                      (() => {
                        try {
                          // Handle timezone-aware date strings properly
                          const date = new Date(session.scheduled_date || session.date);
                          if (isNaN(date.getTime())) return 'Invalid Date';
                          return date.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          });
                        } catch (error) {
                          console.warn('Session history date formatting error:', error);
                          return 'Date N/A';
                        }
                      })() : 'Date N/A'}
                  </span>
                  <span className="session-time">
                    ⏰ {(session.scheduled_date) ? 
                      new Date(session.scheduled_date).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true
                      }) : session.time || 'Time N/A'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="profile-section">
      <h3>Tutor Profile</h3>
      <p>Manage your profile, account and payment information</p>
      
      <div className="profile-tabs">
        <div className="profile-content">
          
          {/* Personal Information */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h4>👤 Personal Information</h4>
              <button className="edit-btn">Edit</button>
            </div>
            <div className="profile-grid">
              <div className="profile-item">
                <span className="label">Full Name:</span>
                <span className="value">{currentUser?.name || 'N/A'}</span>
              </div>
              <div className="profile-item">
                <span className="label">Email:</span>
                <span className="value">{currentUser?.email || 'N/A'}</span>
              </div>
              <div className="profile-item">
                <span className="label">Phone:</span>
                <span className="value">{currentUser?.phone || 'N/A'}</span>
              </div>
              <div className="profile-item">
                <span className="label">Address:</span>
                <span className="value">
                  {currentUser?.profile?.address 
                    ? `${currentUser.profile.address.street || ''}, ${currentUser.profile.address.city || ''}, ${currentUser.profile.address.state || ''} ${currentUser.profile.address.zipCode || ''}, ${currentUser.profile.address.country || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '') || 'N/A'
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="profile-item">
                <span className="label">Time Zone:</span>
                <span className="value">{currentUser?.profile?.timezone || 'Not Set'}</span>
              </div>
              <div className="profile-item">
                <span className="label">Languages:</span>
                <span className="value">{(currentUser?.profile?.languages || []).join(', ') || 'Not Specified'}</span>
              </div>
            </div>
            <div className="profile-bio">
              <span className="label">Bio:</span>
              <p className="bio-text">{currentUser?.profile?.bio || 'No bio available'}</p>
            </div>
          </div>

          {/* Professional Information */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h4>🎓 Professional Information</h4>
              <button className="edit-btn" onClick={openProfessionalEditModal}>Edit</button>
            </div>
            <div className="profile-grid">
              <div className="profile-item">
                <span className="label">Subjects:</span>
                <span className="value">{(currentUser?.subjects || []).join(', ') || 'N/A'}</span>
              </div>
              <div className="profile-item">
                <span className="label">Tutor Grade Level:</span>
                <span className="value">{currentUser?.tutorGradeLevel || currentUser?.profile?.tutor_grade_level || 'N/A'}</span>
              </div>
              <div className="profile-item">
                <span className="label">Grade Levels Taught:</span>
                <span className="value">{(currentUser?.gradeLevelsTaught || currentUser?.profile?.grade_levels_taught || []).join(', ') || 'N/A'}</span>
              </div>
              <div className="profile-item">
                <span className="label">Rating:</span>
                <span className="value">⭐ {currentUser?.rating || 0}/5.0</span>
              </div>
              <div className="profile-item">
                <span className="label">Total Sessions:</span>
                <span className="value">{currentUser?.totalSessions || 0}</span>
              </div>
              <div className="profile-item">
                <span className="label">Verification Status:</span>
                <span className={`value ${currentUser?.isVerified ? 'verified' : 'unverified'}`}>
                  {currentUser?.isVerified ? '✅ Verified' : '❌ Unverified'}
                </span>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h4>🔐 Account Details</h4>
              <button 
                className="edit-btn"
                onClick={() => setShowChangePasswordModal(true)}
              >
                Change Password
              </button>
            </div>
            <div className="profile-grid">
              <div className="profile-item">
                <span className="label">Tutor ID:</span>
                <span className="value">{currentUser?.id}</span>
              </div>
              <div className="profile-item">
                <span className="label">Account Status:</span>
                <span className="value status-active">{currentUser?.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="profile-item">
                <span className="label">Account Type:</span>
                <span className="value">{currentUser?.accountType}</span>
              </div>
              <div className="profile-item">
                <span className="label">Commission Rate:</span>
                <span className="value">{currentUser?.profile?.commissionRate || 'Not Set'}</span>
              </div>
              <div className="profile-item">
                <span className="label">Joined Date:</span>
                <span className="value">{currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="profile-item">
                <span className="label">Last Login:</span>
                <span className="value">{currentUser?.profile?.lastLogin || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h4>💳 Payment Information</h4>
              <button className="edit-btn">Manage</button>
            </div>
            
            {/* Bank Account */}
            <div className="payment-section">
              <h5>🏦 Bank Account</h5>
              <div className="profile-grid">
                <div className="profile-item">
                  <span className="label">Account Holder:</span>
                  <span className="value">{paymentDetails.bankAccount.accountHolder || 'Not Set'}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Bank Name:</span>
                  <span className="value">{paymentDetails.bankAccount.bankName || 'Not Set'}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Account Number:</span>
                  <span className="value">{paymentDetails.bankAccount.accountNumber || 'Not Set'}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Account Type:</span>
                  <span className="value">{paymentDetails.bankAccount.accountType || 'Not Set'}</span>
                </div>
              </div>
            </div>

            {/* PayPal Account */}
            <div className="payment-section">
              <h5>🅿️ PayPal Account</h5>
              <div className="profile-grid">
                <div className="profile-item">
                  <span className="label">PayPal Email:</span>
                  <span className="value">{paymentDetails.paypalAccount.email || 'Not Connected'}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Status:</span>
                  <span className="value">{paymentDetails.paypalAccount.status || 'Not Connected'}</span>
                </div>
              </div>
            </div>

            {/* Tax Information */}
            <div className="payment-section">
              <h5>📄 Tax Information</h5>
              <div className="profile-grid">
                <div className="profile-item">
                  <span className="label">Tax ID:</span>
                  <span className="value">{paymentDetails.taxInformation.taxId || 'Not Set'}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Tax Status:</span>
                  <span className="value">{paymentDetails.taxInformation.taxStatus || 'Not Set'}</span>
                </div>
                <div className="profile-item">
                  <span className="label">W-9 Status:</span>
                  <span className="value">{paymentDetails.taxInformation.w9Status || 'Not Submitted'}</span>
                </div>
              </div>
            </div>

            {/* Payment Preferences */}
            <div className="payment-section">
              <h5>⚙️ Payment Preferences</h5>
              <div className="profile-grid">
                <div className="profile-item">
                  <span className="label">Preferred Method:</span>
                  <span className="value">{paymentDetails.paymentPreferences.preferredMethod || 'Not Set'}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Payment Schedule:</span>
                  <span className="value">{paymentDetails.paymentPreferences.paymentSchedule || 'Not Set'}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Minimum Payout:</span>
                  <span className="value">{paymentDetails.paymentPreferences.minimumPayout > 0 ? `£${paymentDetails.paymentPreferences.minimumPayout.toFixed(2)}` : 'Not Set'}</span>
                </div>
                <div className="profile-item">
                  <span className="label">Currency:</span>
                  <span className="value">{paymentDetails.paymentPreferences.currency || 'Not Set'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!currentUser || loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="tutor-page">
      <div className="tutor-header">
        <div className="header-content">
          <div className="header-info">
            <h1>{currentUser?.name || currentUser?.email}'s Dashboard</h1>
            <div className="header-details">
              <span className="tutor-id">ID: {currentUser?.id}</span>
              <span className="account-type">{currentUser?.accountType}</span>
              <span className="verification-badge">
                {currentUser?.isVerified ? '✅ Verified' : '⚠️ Unverified'}
              </span>
            </div>
          </div>
          <div className="header-actions">
            <div className="header-stats">
              <div className="header-stat">
                <span className="stat-label">Rating</span>
                <span className="stat-value">⭐ {currentUser?.rating || 0}</span>
              </div>
              <div className="header-stat">
                <span className="stat-label">Sessions</span>
                <span className="stat-value">{currentUser?.totalSessions || 0}</span>
              </div>
            </div>
            <div className="notification-badge">
              <span className="badge-count">{notifications.filter(n => !n.read).length}</span>
              🔔
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Profile Subjects Notification Banner */}
      {(!currentUser?.subjects || currentUser.subjects.length === 0) && !subjectsNotificationDismissed && (
        <div className="profile-notification-banner">
          <div className="notification-content">
            <span className="notification-icon">⚠️</span>
            <span className="notification-message">
              Please update your profile with your teaching subjects so that you can be matched to the right course
            </span>
            <button 
              className="notification-dismiss" 
              onClick={() => {
                setSubjectsNotificationDismissed(true);
                localStorage.setItem('subjectsNotificationDismissed', 'true');
              }}
              title="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="tutor-content">
        <nav className="tutor-sidebar">
          <ul className="nav-menu">
            <li>
              <button 
                className={activeSection === 'dashboard' ? 'active' : ''}
                onClick={() => setActiveSection('dashboard')}
              >
                📊 Overview
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'sessions' ? 'active' : ''}
                onClick={() => setActiveSection('sessions')}
              >
                🎓 Upcoming Sessions
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'availability' ? 'active' : ''}
                onClick={() => setActiveSection('availability')}
              >
                📅 Availability
                {availabilityStats.conflicts > 0 && (
                  <span className="nav-badge conflict">{availabilityStats.conflicts}</span>
                )}
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'results' ? 'active' : ''}
                onClick={() => setActiveSection('results')}
              >
                📋 Quiz Results
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'notifications' ? 'active' : ''}
                onClick={() => setActiveSection('notifications')}
              >
                🔔 Notifications
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="nav-badge">{notifications.filter(n => !n.read).length}</span>
                )}
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'history' ? 'active' : ''}
                onClick={() => setActiveSection('history')}
              >
                📚 Session History
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'chats' ? 'active' : ''}
                onClick={() => setActiveSection('chats')}
              >
                💬 Chats
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'profile' ? 'active' : ''}
                onClick={() => setActiveSection('profile')}
              >
                👤 Profile
              </button>
            </li>
          </ul>
        </nav>

        <main className="tutor-main">
          {activeSection === 'dashboard' && renderDashboard()}
          {activeSection === 'sessions' && renderUpcomingSessions()}
          {activeSection === 'availability' && renderAvailability()}
          {activeSection === 'results' && renderQuizResults()}
          {activeSection === 'notifications' && renderNotifications()}
          {activeSection === 'history' && renderSessionHistory()}
          {activeSection === 'chats' && <TutorChatSection user={currentUser} />}
          {activeSection === 'profile' && renderProfile()}
        </main>
      </div>

      {/* Professional Information Edit Modal */}
      {showProfessionalEditModal && (
        <div className="modal-overlay" onClick={() => setShowProfessionalEditModal(false)}>
          <div className="modal-content professional-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Professional Information</h3>
              <button className="close-modal" onClick={() => setShowProfessionalEditModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleProfessionalSubmit}>
                {/* Subjects */}
                <div className="form-group">
                  <label>Teaching Subjects <span className="required">*</span></label>
                  <MultiSelectDropdown
                    options={['Mathematics', 'English', 'Science', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Art', 'Music', 'Economics', 'Computer Science']}
                    selectedValues={professionalForm.subjects}
                    onChange={(newSubjects) => setProfessionalForm(prev => ({ ...prev, subjects: newSubjects }))}
                    placeholder="Select teaching subjects..."
                    error={professionalErrors.subjects}
                  />
                  {professionalErrors.subjects && (
                    <div className="error-message">{professionalErrors.subjects}</div>
                  )}
                </div>

                {/* Academic Country */}
                <div className="form-group">
                  <label>Academic Country <span className="required">*</span></label>
                  <select
                    name="academicCountry"
                    value={professionalForm.academicCountry}
                    onChange={handleProfessionalFormChange}
                    className={professionalErrors.academicCountry ? 'error' : ''}
                    required
                  >
                    <option value="">Select academic country...</option>
                    <option value="United States">United States</option>
                    <option value="England">England</option>
                    <option value="Wales">Wales</option>
                    <option value="Scotland">Scotland</option>
                    <option value="Ireland">Ireland</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="Canada">Canada</option>
                  </select>
                  {professionalErrors.academicCountry && (
                    <div className="error-message">{professionalErrors.academicCountry}</div>
                  )}
                </div>

                {/* Tutor Grade Level */}
                <div className="form-group">
                  <label>Your Grade Level <span className="required">*</span></label>
                  <select
                    name="tutorGradeLevel"
                    value={professionalForm.tutorGradeLevel}
                    onChange={handleProfessionalFormChange}
                    className={professionalErrors.tutorGradeLevel ? 'error' : ''}
                    required
                  >
                    <option value="">Select your grade level...</option>
                    {getGradeLevelOptions(professionalForm.academicCountry).map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                  {professionalErrors.tutorGradeLevel && (
                    <div className="error-message">{professionalErrors.tutorGradeLevel}</div>
                  )}
                  <div className="info-message">
                    Select the highest grade level you have completed
                  </div>
                </div>

                {/* Grade Levels Taught */}
                <div className="form-group">
                  <label>Grade Levels You Can Teach <span className="required">*</span></label>
                  <MultiSelectDropdown
                    options={getGradeLevelOptions(professionalForm.academicCountry)}
                    selectedValues={professionalForm.gradeLevelsTaught}
                    onChange={(newGradeLevels) => setProfessionalForm(prev => ({ ...prev, gradeLevelsTaught: newGradeLevels }))}
                    placeholder="Select grade levels you can teach..."
                    error={professionalErrors.gradeLevelsTaught}
                    disabledOptions={professionalForm.tutorGradeLevel ?
                      getAutoSelectedGradeLevels(professionalForm.tutorGradeLevel, professionalForm.academicCountry) :
                      []
                    }
                  />
                  {professionalErrors.gradeLevelsTaught && (
                    <div className="error-message">{professionalErrors.gradeLevelsTaught}</div>
                  )}
                  <div className="info-message">
                    Grade levels below your level are automatically selected. You can select additional levels you're qualified to teach.
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn secondary" 
                    onClick={() => setShowProfessionalEditModal(false)}
                    disabled={professionalSaving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn primary"
                    disabled={professionalSaving}
                  >
                    {professionalSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced TimeSlot Creation Modal */}
      {showCreateTimeslotModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTimeslotModal(false)}>
          <div className="modal-content timeslot-creation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-title-group">
                <h3>
                  <span className="modal-icon">✨</span>
                  Create Time Slot
                </h3>
                <p className="modal-subtitle">
                  Set up availability for students to book sessions
                </p>
              </div>
              <button 
                className="close-modal" 
                onClick={() => setShowCreateTimeslotModal(false)}
                disabled={timeslotSaving}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {timeslotErrors.general && (
                <div className="error-message general-error">
                  <div className="error-icon">⚠️</div>
                  <div className="error-content">
                    <strong>Error:</strong> {timeslotErrors.general}
                  </div>
                </div>
              )}

              <form onSubmit={handleTimeslotSubmit} className="timeslot-form">
                {/* Slot Type Selection */}
                <div className="form-section">
                  <h4 className="section-title">
                    <span className="section-icon">📅</span>
                    Slot Type
                  </h4>
                  <div className="slot-type-toggle">
                    <label className={`type-option ${timeslotForm.type === 'single' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        value="single"
                        checked={timeslotForm.type === 'single'}
                        onChange={(e) => setTimeslotForm(prev => ({
                          ...prev,
                          type: e.target.value,
                          isRecurring: e.target.value === 'recurring'
                        }))}
                        disabled={timeslotSaving}
                      />
                      <div className="option-content">
                        <div className="option-icon">📅</div>
                        <div className="option-text">
                          <strong>Single Slot</strong>
                          <span>One-time availability</span>
                        </div>
                      </div>
                    </label>
                    <label className={`type-option ${timeslotForm.type === 'recurring' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        value="recurring"
                        checked={timeslotForm.type === 'recurring'}
                        onChange={(e) => setTimeslotForm(prev => ({
                          ...prev,
                          type: e.target.value,
                          isRecurring: e.target.value === 'recurring'
                        }))}
                        disabled={timeslotSaving}
                      />
                      <div className="option-content">
                        <div className="option-icon">🔄</div>
                        <div className="option-text">
                          <strong>Recurring Slot</strong>
                          <span>Repeating availability</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Date/Time Section */}
                <div className="form-section">
                  <h4 className="section-title">
                    <span className="section-icon">⏰</span>
                    Schedule
                  </h4>
                  
                  {timeslotForm.type === 'single' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="date">Date <span className="required">*</span></label>
                        <input
                          id="date"
                          type="date"
                          value={timeslotForm.date}
                          onChange={(e) => handleFieldChange('date', e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className={timeslotErrors.date ? 'error' : timeslotErrors.dateWarning ? 'warning' : ''}
                          disabled={timeslotSaving}
                          required
                        />
                        {timeslotErrors.date && (
                          <div className="field-error">{timeslotErrors.date}</div>
                        )}
                        {timeslotErrors.dateWarning && !timeslotErrors.date && (
                          <div className="field-warning">{timeslotErrors.dateWarning}</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="startTime">Start Time <span className="required">*</span></label>
                      <select
                        id="startTime"
                        value={timeslotForm.startTime}
                        onChange={(e) => {
                          handleFieldChange('startTime', e.target.value);
                          // Auto-set end time to 1 hour later
                          if (e.target.value) {
                            const startHour = parseInt(e.target.value.split(':')[0]);
                            if (startHour < 21) {
                              const endHour = (startHour + 1).toString().padStart(2, '0');
                              const newEndTime = endHour + ':00';
                              setTimeout(() => handleFieldChange('endTime', newEndTime), 100);
                            }
                          }
                        }}
                        className={timeslotErrors.startTime ? 'error' : timeslotErrors.startTimeWarning ? 'warning' : ''}
                        disabled={timeslotSaving}
                        required
                      >
                        <option value="">Select start time</option>
                        {timeOptions.slice(0, -1).map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {timeslotErrors.startTime && (
                        <div className="field-error">{timeslotErrors.startTime}</div>
                      )}
                      {timeslotErrors.startTimeWarning && !timeslotErrors.startTime && (
                        <div className="field-warning">⚠️ {timeslotErrors.startTimeWarning}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="endTime">End Time <span className="required">*</span></label>
                      <select
                        id="endTime"
                        value={timeslotForm.endTime}
                        onChange={(e) => handleFieldChange('endTime', e.target.value)}
                        className={timeslotErrors.endTime ? 'error' : timeslotErrors.endTimeWarning ? 'warning' : ''}
                        disabled={timeslotSaving || !timeslotForm.startTime}
                        required
                      >
                        <option value="">Select end time</option>
                        {timeslotForm.startTime && timeOptions
                          .filter(option => {
                            const startIndex = timeOptions.findIndex(t => t.value === timeslotForm.startTime);
                            const optionIndex = timeOptions.findIndex(t => t.value === option.value);
                            return optionIndex === startIndex + 1; // Only 1 hour later
                          })
                          .map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))
                        }
                      </select>
                      {timeslotErrors.endTime && (
                        <div className="field-error">{timeslotErrors.endTime}</div>
                      )}
                      {timeslotErrors.endTimeWarning && !timeslotErrors.endTime && (
                        <div className="field-warning">⚠️ {timeslotErrors.endTimeWarning}</div>
                      )}
                      <div className="info-message">
                        ℹ️ Time slots are limited to 1 hour maximum
                      </div>
                    </div>
                  </div>
                </div>

                {/* Course Selection */}
                <div className="form-section">
                  <h4 className="section-title">
                    <span className="section-icon">📚</span>
                    Course Assignment
                  </h4>
                  <div className="form-group">
                    <label htmlFor="courseId">Course <span className="required">*</span></label>
                    <select
                      id="courseId"
                      value={timeslotForm.courseId}
                      onChange={(e) => setTimeslotForm(prev => ({ ...prev, courseId: e.target.value }))}
                      className={`course-select ${timeslotErrors.courseId ? 'error' : ''}`}
                      disabled={timeslotSaving}
                      required
                    >
                      <option value="">Select a course</option>
                      {assignedCourses.map(course => (
                        <option key={course.id} value={course.id}>
                          📚 {course.title} ({course.subject})
                        </option>
                      ))}
                    </select>
                    {timeslotErrors.courseId && (
                      <div className="field-error">{timeslotErrors.courseId}</div>
                    )}
                  </div>
                </div>

                {/* Recurring Options */}
                {timeslotForm.type === 'recurring' && (
                  <div className="form-section recurring-section">
                    <h4 className="section-title">
                      <span className="section-icon">🔄</span>
                      Recurring Settings
                    </h4>
                    
                    <div className="form-group">
                      <label>Repeat on these days <span className="required">*</span></label>
                      <div className="days-grid">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                          <label key={day} className={`day-option ${
                            timeslotForm.recurrenceDays.includes(index) ? 'selected' : ''
                          }`}>
                            <input
                              type="checkbox"
                              checked={timeslotForm.recurrenceDays.includes(index)}
                              onChange={(e) => {
                                const days = [...timeslotForm.recurrenceDays];
                                if (e.target.checked) {
                                  days.push(index);
                                } else {
                                  const idx = days.indexOf(index);
                                  if (idx > -1) days.splice(idx, 1);
                                }
                                setTimeslotForm(prev => ({ ...prev, recurrenceDays: days.sort() }));
                              }}
                              disabled={timeslotSaving}
                            />
                            <div className="day-content">
                              <div className="day-name">{day}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                      {timeslotErrors.recurrenceDays && (
                        <div className="field-error">{timeslotErrors.recurrenceDays}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="recurrenceEndDate">End Date (Optional)</label>
                      <input
                        id="recurrenceEndDate"
                        type="date"
                        value={timeslotForm.recurrenceEndDate}
                        onChange={(e) => setTimeslotForm(prev => ({ ...prev, recurrenceEndDate: e.target.value }))}
                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                        className={timeslotErrors.recurrenceEndDate ? 'error' : ''}
                        disabled={timeslotSaving}
                      />
                      {timeslotErrors.recurrenceEndDate && (
                        <div className="field-error">{timeslotErrors.recurrenceEndDate}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Preview Section */}
                {timeslotForm.startTime && timeslotForm.endTime && timeslotForm.courseId && (
                  <div className="form-section preview-section">
                    <h4 className="section-title">
                      <span className="section-icon">🔍</span>
                      Preview
                    </h4>
                    <div className="preview-card">
                      <div className="preview-header">
                        <div className="preview-icon">
                          {timeslotForm.type === 'recurring' ? '🔄' : '📅'}
                        </div>
                        <div className="preview-title">
                          {timeslotForm.type === 'recurring' ? 'Recurring Time Slot' : 'Single Time Slot'}
                        </div>
                      </div>
                      <div className="preview-details">
                        <div className="preview-item">
                          <strong>Time:</strong> {timeslotForm.startTime} - {timeslotForm.endTime}
                        </div>
                        <div className="preview-item">
                          <strong>Course:</strong> 
                          {assignedCourses.find(c => c.id === timeslotForm.courseId)?.title || 'Course'}
                        </div>
                        {timeslotForm.type === 'single' && (
                          <div className="preview-item">
                            <strong>Date:</strong> {formatDateConsistent(timeslotForm.date, timezoneSettings.timezone)}
                          </div>
                        )}
                        {timeslotForm.type === 'recurring' && timeslotForm.recurrenceDays.length > 0 && (
                          <>
                            <div className="preview-item">
                              <strong>Days:</strong> 
                              {timeslotForm.recurrenceDays.map(dayIndex => 
                                ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex]
                              ).join(', ')}
                            </div>
                            
                            {/* Upcoming Sessions Preview */}
                            {(() => {
                              const previewData = generateRecurringPreview();
                              if (previewData.instances && previewData.instances.length > 0) {
                                return (
                                  <div className="preview-item recurring-sessions-preview">
                                    <strong>Upcoming Sessions:</strong>
                                    <div className="recurring-sessions-list">
                                      {previewData.instances.map((instance, index) => (
                                        <div key={index} className="recurring-session-item">
                                          • {instance.formattedDate} - {instance.timeRange}
                                        </div>
                                      ))}
                                      {previewData.hasMore && (
                                        <div className="recurring-sessions-more">
                                          ...and {previewData.totalCount - 5} more sessions
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn secondary cancel-btn"
                    onClick={() => setShowCreateTimeslotModal(false)}
                    disabled={timeslotSaving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn primary submit-btn"
                    disabled={timeslotSaving}
                  >
                    {timeslotSaving ? (
                      <>
                        <div className="spinner small"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        {timeslotForm.type === 'recurring' ? 'Create Recurring Slots' : 'Create Time Slot'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Session Confirmation Modal */}
      {showDeleteSessionModal && selectedSessionForDeletion && (
        <div className="modal-overlay" onClick={handleDeleteSessionCancel}>
          <div className="modal-content delete-session-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Delete Session</h3>
              <button className="close-modal" onClick={handleDeleteSessionCancel}>×</button>
            </div>

            <div className="modal-body">
              <div className="warning-message">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h4>Are you sure you want to delete this session?</h4>
                  <p>This action cannot be undone. The session will be permanently removed.</p>
                </div>
              </div>

              <div className="session-details">
                <h5>Session Details:</h5>
                <div className="detail-item">
                  <strong>Title:</strong> {selectedSessionForDeletion.title || selectedSessionForDeletion.topic || 'Untitled Session'}
                </div>
                <div className="detail-item">
                  <strong>Date:</strong> {(selectedSessionForDeletion.scheduled_date || selectedSessionForDeletion.scheduledDate) ? 
                    new Date(selectedSessionForDeletion.scheduled_date || selectedSessionForDeletion.scheduledDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric'
                    }) : 'Date TBD'}
                </div>
                <div className="detail-item">
                  <strong>Time:</strong> {(selectedSessionForDeletion.scheduled_date || selectedSessionForDeletion.scheduledDate) ? 
                    new Date(selectedSessionForDeletion.scheduled_date || selectedSessionForDeletion.scheduledDate).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true
                    }) : 'Time TBD'}
                </div>
                <div className="detail-item">
                  <strong>Students:</strong> {(selectedSessionForDeletion.enrolledStudents || selectedSessionForDeletion.studentIds || []).length} enrolled
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn secondary" 
                  onClick={handleDeleteSessionCancel}
                  disabled={isDeletingSession}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn danger"
                  onClick={handleDeleteSessionConfirm}
                  disabled={isDeletingSession}
                >
                  {isDeletingSession ? 'Deleting...' : '🗑️ Delete Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Timeslot Modal */}
      {showEditTimeslotModal && selectedTimeslotForEdit && (
        <EditAvailabilityModal
          isOpen={showEditTimeslotModal}
          onClose={() => {
            setShowEditTimeslotModal(false);
            setSelectedTimeslotForEdit(null);
          }}
          selectedSlot={selectedTimeslotForEdit}
          onConfirmEdit={handleEditSubmit}
          isEditing={isEditingTimeslot}
          courses={courses}
        />
      )}

      {/* Delete Timeslot Confirmation Modal */}
      {showDeleteTimeslotModal && selectedTimeslotForDeletion && (
        <div className="modal-overlay" onClick={() => setShowDeleteTimeslotModal(false)}>
          <div className="modal-content delete-timeslot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Delete Time Slot</h3>
              <button 
                className="close-modal" 
                onClick={() => setShowDeleteTimeslotModal(false)}
                disabled={isDeletingTimeslot}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="warning-message">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h4>Are you sure you want to delete this time slot?</h4>
                  <div className="timeslot-details">
                    <p><strong>Date:</strong> {selectedTimeslotForDeletion.specific_date ? 
                      (() => {
                        try {
                          const date = new Date(selectedTimeslotForDeletion.specific_date);
                          if (isNaN(date.getTime())) return 'Invalid Date';
                          return date.toLocaleDateString();
                        } catch (error) {
                          console.warn('Timeslot date formatting error:', error);
                          return 'Date Error';
                        }
                      })() : 
                      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][selectedTimeslotForDeletion.day_of_week]
                    }</p>
                    <p><strong>Time:</strong> {formatTime12Hour(selectedTimeslotForDeletion.start_time)} - {formatTime12Hour(selectedTimeslotForDeletion.end_time)}</p>
                    {selectedTimeslotForDeletion.course_title && (
                      <p><strong>Course:</strong> {selectedTimeslotForDeletion.course_title}</p>
                    )}
                    {selectedTimeslotForDeletion.is_recurring && (
                      <p><strong>Type:</strong> Recurring time slot</p>
                    )}
                  </div>
                  
                  {selectedTimeslotForDeletion.has_bookings && (
                    <div className="conflict-warning">
                      <span className="warning-icon">⚠️</span>
                      <div>
                        <p><strong>Warning:</strong> This time slot has {selectedTimeslotForDeletion.booking_count || 0} booked session(s).</p>
                        <p>Deleting this slot may affect existing bookings.</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedTimeslotForDeletion.is_recurring && (
                    <div className="recurring-options">
                      <h4>Delete Options:</h4>
                      <div className="radio-group">
                        <label className="radio-option">
                          <input
                            type="radio"
                            value="single"
                            checked={deleteOption === 'single'}
                            onChange={(e) => setDeleteOption(e.target.value)}
                            disabled={isDeletingTimeslot}
                          />
                          <span>Delete only this instance</span>
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            value="future"
                            checked={deleteOption === 'future'}
                            onChange={(e) => setDeleteOption(e.target.value)}
                            disabled={isDeletingTimeslot}
                          />
                          <span>Delete this and future instances</span>
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            value="all"
                            checked={deleteOption === 'all'}
                            onChange={(e) => setDeleteOption(e.target.value)}
                            disabled={isDeletingTimeslot}
                          />
                          <span>Delete entire recurring series</span>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  <p className="warning-note">This action cannot be undone.</p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn secondary cancel-btn"
                onClick={() => setShowDeleteTimeslotModal(false)}
                disabled={isDeletingTimeslot}
              >
                Cancel
              </button>
              <button 
                className="btn danger delete-btn"
                onClick={handleDeleteConfirm}
                disabled={isDeletingTimeslot}
              >
                {isDeletingTimeslot ? (
                  <>
                    <div className="spinner small"></div>
                    Deleting...
                  </>
                ) : (
                  <>🗑️ Delete Time Slot</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timezone Settings Modal */}
      {showTimezoneModal && (
        <div className="modal-overlay" onClick={() => setShowTimezoneModal(false)}>
          <div className="modal-content timezone-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🌍 Timezone Settings</h3>
              <button 
                className="close-modal" 
                onClick={() => setShowTimezoneModal(false)}
                disabled={isUpdatingTimezone}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="current-timezone">
                <h4>Current Timezone</h4>
                <div className="timezone-info">
                  <span className="timezone-label">{timezoneSettings.timezone}</span>
                  <div style={{fontSize: '10px', color: '#666', marginTop: '4px', background: '#f0f0f0', padding: '2px'}}>
                    DEBUG: selectedTimezone={selectedTimezone} | timezoneSettings={timezoneSettings.timezone} | localStorage={localStorage.getItem('userTimezone')}
                  </div>
                  <span className="timezone-offset">
                    (UTC{new Date().getTimezoneOffset() > 0 ? '-' : '+'}
                    {Math.abs(new Date().getTimezoneOffset() / 60).toString().padStart(2, '0')}:00)
                  </span>
                </div>
              </div>

              <div className="timezone-selector">
                <h4>Select New Timezone</h4>
                <select
                  value={selectedTimezone}
                  onChange={(e) => {
                    const newTimezone = e.target.value;
                    setSelectedTimezone(newTimezone);
                    saveUserTimezone(newTimezone); // Persist to localStorage
                  }}
                  disabled={isUpdatingTimezone}
                  className="timezone-select"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">Eastern Time (New York)</option>
                  <option value="America/Chicago">Central Time (Chicago)</option>
                  <option value="America/Denver">Mountain Time (Denver)</option>
                  <option value="America/Los_Angeles">Pacific Time (Los Angeles)</option>
                  <option value="America/Phoenix">Arizona Time (Phoenix)</option>
                  <option value="America/Toronto">Eastern Time (Toronto)</option>
                  <option value="America/Vancouver">Pacific Time (Vancouver)</option>
                  <option value="Europe/London">British Time (London)</option>
                  <option value="Europe/Paris">Central European Time (Paris)</option>
                  <option value="Europe/Berlin">Central European Time (Berlin)</option>
                  <option value="Europe/Rome">Central European Time (Rome)</option>
                  <option value="Europe/Madrid">Central European Time (Madrid)</option>
                  <option value="Europe/Amsterdam">Central European Time (Amsterdam)</option>
                  <option value="Asia/Tokyo">Japan Time (Tokyo)</option>
                  <option value="Asia/Shanghai">China Time (Shanghai)</option>
                  <option value="Asia/Dubai">Gulf Time (Dubai)</option>
                  <option value="Asia/Kolkata">India Time (Mumbai)</option>
                  <option value="Australia/Sydney">Australian Eastern Time (Sydney)</option>
                  <option value="Australia/Melbourne">Australian Eastern Time (Melbourne)</option>
                  <option value="Pacific/Auckland">New Zealand Time (Auckland)</option>
                </select>
              </div>

              <div className="timezone-preview">
                <h4>Time Preview</h4>
                <div className="time-comparison">
                  <div className="time-item">
                    <span className="time-label">Current:</span>
                    <span className="time-value">
                      {new Date().toLocaleTimeString([], {
                        timeZone: timezoneSettings.timezone,
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                  {selectedTimezone !== timezoneSettings.timezone && (
                    <div className="time-item">
                      <span className="time-label">New:</span>
                      <span className="time-value">
                        {new Date().toLocaleTimeString([], {
                          timeZone: selectedTimezone,
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="timezone-note">
                <p><strong>Note:</strong> Changing your timezone will affect how your availability is displayed to students and in your calendar. Existing time slots will be converted to the new timezone.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn secondary cancel-btn"
                onClick={() => setShowTimezoneModal(false)}
                disabled={isUpdatingTimezone}
              >
                Cancel
              </button>
              <button 
                className="btn primary save-btn"
                onClick={handleTimezoneUpdate}
                disabled={isUpdatingTimezone || selectedTimezone === timezoneSettings.timezone}
              >
                {isUpdatingTimezone ? (
                  <>
                    <div className="spinner small"></div>
                    Updating...
                  </>
                ) : (
                  <>🌍 Update Timezone</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="modal-overlay" onClick={cancelBulkDeletion}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Delete Selected Slots</h3>
              <button className="close-modal" onClick={cancelBulkDeletion}>×</button>
            </div>

            <div className="modal-body">
              <div className="warning-message">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h4>Are you sure you want to delete {selectedListSlots.size} selected slot{selectedListSlots.size > 1 ? 's' : ''}?</h4>
                  <p>This action cannot be undone. The selected time slots will be permanently removed.</p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn secondary cancel-btn"
                onClick={cancelBulkDeletion}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button 
                className="btn danger delete-btn"
                onClick={confirmBulkDeletion}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <div className="spinner small"></div>
                    Deleting...
                  </>
                ) : (
                  `Delete ${selectedListSlots.size} Slot${selectedListSlots.size > 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        key={showChangePasswordModal ? 'change-password-open' : 'change-password-closed'}
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSubmit={handleChangePassword}
        loading={changePasswordLoading}
      />

    </div>
  );
};

export default TutorPage;