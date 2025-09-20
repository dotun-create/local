import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useAuth, 
  useAdminStats, 
  useCourses, 
  useUsers, 
  useInvoices 
} from '../../hooks/useData';
import { useAdminPageRefresh } from '../../hooks/useAdminRefresh';
import API, { API_BASE_URL } from '../../services/api';
import dataService from '../../services/dataService';
import AdminInvoiceList from '../invoices/AdminInvoiceList';
import EnvironmentManager from '../admin/EnvironmentManager';
import ServiceStatusPanel from '../admin/ServiceStatusPanel';
import AdminChatMonitor from '../chat/AdminChatMonitor';
import MultiRoleManagement from '../admin/MultiRoleManagement';
import { formatCurrencyForDisplay, getCurrencySymbol, getSupportedCurrencies } from '../../utils/currency';

const { createCourse, updateCourse } = API;
import './css/AdminPage.css';

// NotificationToast Component
const NotificationToast = ({ notification }) => {
  if (!notification.show) return null;
  
  return (
    <div className={`adm-notification-toast ${notification.type}`}>
      <span className="adm-notification-icon">
        {notification.type === 'success' ? '✅' : '❌'}
      </span>
      <span className="adm-notification-message">{notification.message}</span>
    </div>
  );
};

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: adminStats, loading: statsLoading, refetch: refetchAdminStats } = useAdminStats();
  
  const { courses, loading: coursesLoading, createCourse, updateCourse, deleteCourse } = useCourses();
  const { data: users, loading: usersLoading, refetch: refetchUsers } = useUsers();
  const { data: invoices, loading: invoicesLoading } = useInvoices();
  
  
  const [activeSection, setActiveSection] = useState('dashboard');
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // AI Prompts state
  const [aiPrompts, setAiPrompts] = useState([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptsError, setPromptsError] = useState(null);
  const [editingPrompt, setEditingPrompt] = useState(null);
  
  // System Settings state
  const [systemSettings, setSystemSettings] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState(null);
  const [hourlyRate, setHourlyRate] = useState(21);
  const [editingSettings, setEditingSettings] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [chatSettingLoading, setChatSettingLoading] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    pricePerSession: '',
    currency: 'GBP',
    period: 'monthly',
    creditRate: 1.0,
    features: [''],
    isPopular: false,
    isActive: true,
    displayOrder: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Notification state
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  
  // Tutor management state
  const [tutors, setTutors] = useState([]);
  const [tutorsLoading, setTutorsLoading] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [showTutorModal, setShowTutorModal] = useState(false);
  const [tutorModalType, setTutorModalType] = useState(''); // 'verify' or 'unverify'
  
  // All tutors for filter dropdown (without pagination)
  const [allTutorsForFilter, setAllTutorsForFilter] = useState([]);
  const [filterTutorsLoading, setFilterTutorsLoading] = useState(false);
  
  // Tutor stats state
  const [tutorAvailabilityData, setTutorAvailabilityData] = useState({});
  const [aggregatedTutorStats, setAggregatedTutorStats] = useState({
    totalSlots: 0,
    bookedSlots: 0,
    availableHours: 0,
    weeklyHours: 0,
    conflicts: 0,
    utilizationRate: 0,
    completionRate: 0,
    estimatedWeeklyEarnings: 0,
    courseTypes: 0,
    peakPeriod: 'N/A',
    mostActiveHour: 'N/A',
    mostActiveDay: 'N/A'
  });
  const [selectedTutorFilter, setSelectedTutorFilter] = useState('all'); // 'all' or specific tutor ID
  
  // Password reset state
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [passwordResetData, setPasswordResetData] = useState({
    method: 'email', // 'email' or 'temp'
    passwordLength: 12,
    notifyUser: true
  });
  const [passwordResetError, setPasswordResetError] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Temporary password dialog state
  const [showTempPasswordDialog, setShowTempPasswordDialog] = useState(false);
  const [tempPasswordData, setTempPasswordData] = useState({
    password: '',
    userName: '',
    userEmail: ''
  });

  // Credit allocation state
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedGuardianForCredits, setSelectedGuardianForCredits] = useState(null);
  const [creditForm, setCreditForm] = useState({
    amount: '',
    reason: ''
  });
  const [creditError, setCreditError] = useState('');
  const [isAddingCredits, setIsAddingCredits] = useState(false);
  
  // Form state for course creation
  const [courseFormData, setCourseFormData] = useState({
    title: '',
    description: '',
    price: '',
    duration: '',
    subject: '',
    country: 'UK',
    currency: 'GBP',
    gradeLevel: '',
    status: 'active',
    learningOutcomes: ''
  });

  // Form state for plan creation
  const [planFormData, setPlanFormData] = useState({
    name: '',
    description: '',
    pricePerSession: '',
    currency: 'GBP',
    period: 'monthly',
    features: [''],
    isPopular: false,
    isActive: true,
    displayOrder: 0
  });

  // Form state for AI prompt creation/editing
  const [promptFormData, setPromptFormData] = useState({
    promptName: '',
    promptContent: ''
  });

  // Form state for quiz creation
  const [quizFormData, setQuizFormData] = useState({
    courseId: '',
    moduleId: '',
    topic: '',
    title: '',
    difficulty: 'medium',
    timeLimit: '30',
    numberOfQuestions: '',
    passingScore: ''
  });

  // State for modules and topics dropdowns
  const [availableModules, setAvailableModules] = useState([]);
  const [availableTopics, setAvailableTopics] = useState([]);
  
  // Form state for module creation
  const [moduleFormData, setModuleFormData] = useState({
    courseId: '',
    title: '',
    lessons: '',
    duration: '',
    startDate: '',
    endDate: ''
  });
  
  // Form state for tutor assignment
  const [tutorAssignmentData, setTutorAssignmentData] = useState({
    tutorIds: [],
    notes: ''
  });
  
  // Feedback state
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  
  // Form state for user editing
  const [editUserFormData, setEditUserFormData] = useState({
    name: '',
    email: '',
    phone: '',
    accountType: '',
    status: '',
    grade: '',
    subjects: '',
    guardian: '',
    students: '',
    roles: [],  // Added roles field as array
    profile: {}
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Student table enhancement states
  const [studentEnrollments, setStudentEnrollments] = useState({});
  const [expandedStudents, setExpandedStudents] = useState(new Set());

  // Course tutors expansion state
  const [expandedCourseTutors, setExpandedCourseTutors] = useState(new Set());
  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [selectedGuardian, setSelectedGuardian] = useState(null);
  const [studentFilters, setStudentFilters] = useState({
    search: '',
    grade: '',
    status: ''
  });
  const [currentStudentPage, setCurrentStudentPage] = useState(1);
  const [studentsPerPage] = useState(10);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  
  // Multi-select state for bulk actions
  const [selectedTutors, setSelectedTutors] = useState(new Set());
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [selectedGuardians, setSelectedGuardians] = useState(new Set());
  
  // Course filtering state
  const [courseFilters, setCourseFilters] = useState({
    subject: '',
    gradeLevel: '',
    priceRange: '',
    status: '',
    search: ''
  });

  // Organize user data by type - handle both old accountType and new account_type
  const organizedUsers = {
    tutors: Array.isArray(users) ? users.filter(user => 
      user.accountType === 'tutor'
    ) : [],
    students: Array.isArray(users) ? users.filter(user => 
      user.accountType === 'student'
    ) : [],
    guardians: Array.isArray(users) ? users.filter(user => 
      user.accountType === 'guardian'
    ) : []
  };

  // Loading state
  const isLoading = statsLoading || coursesLoading || usersLoading || invoicesLoading;

  // Use real backend data from analytics API and courses data
  const adminData = {
    stats: adminStats ? {
      // Use analytics data if available, otherwise calculate from fetched data
      totalCourses: adminStats.totalCourses || (Array.isArray(courses) ? courses.length : 0),
      totalModules: adminStats.totalModules || 0,
      totalStudents: adminStats.totalStudents || organizedUsers.students.length,
      totalTutors: adminStats.totalTutors || organizedUsers.tutors.length,
      totalGuardians: adminStats.totalGuardians || organizedUsers.guardians.length,
      totalRevenue: adminStats.totalRevenue || 0,
      activeEnrollments: adminStats.activeEnrollments || 0,
      pendingPayments: adminStats.pendingPayments || 0,
      // Add additional stats from analytics
      ...adminStats
    } : {
      // Fallback to calculated values if analytics not available
      totalCourses: Array.isArray(courses) ? courses.length : 0,
      totalModules: 0,
      totalStudents: organizedUsers.students.length,
      totalTutors: organizedUsers.tutors.length,
      totalGuardians: organizedUsers.guardians.length,
      totalRevenue: 0,
      activeEnrollments: 0,
      pendingPayments: 0
    },
    courses: Array.isArray(courses) ? courses : [],
    modules: [],
    tutors: organizedUsers.tutors,
    students: organizedUsers.students,
    guardians: organizedUsers.guardians,
    invoices: Array.isArray(invoices) ? invoices : []
  };

  // Load all enrollment data for students
  const loadAllEnrollmentData = async () => {
    try {
      setEnrollmentLoading(true);
      
      // Fetch all active enrollments
      const enrollmentsResponse = await API.enrollments.getEnrollments({ 
        status: 'active',
        includeDetails: true 
      });
      
      const enrollments = enrollmentsResponse.enrollments || [];
      
      // Group enrollments by student ID
      const studentEnrollmentMap = {};
      
      for (const enrollment of enrollments) {
        const studentId = enrollment.studentId || enrollment.student_id;
        if (!studentId) continue;
        
        if (!studentEnrollmentMap[studentId]) {
          studentEnrollmentMap[studentId] = [];
        }
        
        // Get course details if not already included
        let courseDetails = enrollment.course;
        if (!courseDetails && enrollment.courseId) {
          try {
            const courseResponse = await API.courses.getCourse(enrollment.courseId);
            courseDetails = courseResponse.course;
          } catch (error) {
            // console.error('Failed to fetch course details:', error);
            courseDetails = {
              id: enrollment.courseId,
              title: 'Unknown Course',
              subject: 'N/A'
            };
          }
        }
        
        studentEnrollmentMap[studentId].push({
          id: enrollment.id,
          courseId: enrollment.courseId,
          course: courseDetails || {
            id: enrollment.courseId,
            title: 'Unknown Course',
            subject: 'N/A'
          },
          progress: enrollment.progress || 0,
          status: enrollment.status,
          enrolledAt: enrollment.created_at || enrollment.enrolledAt
        });
      }
      
      setStudentEnrollments(studentEnrollmentMap);
      
    } catch (error) {
      // console.error('Failed to load enrollment data:', error);
      setStudentEnrollments({});
    } finally {
      setEnrollmentLoading(false);
    }
  };

  // System Settings functions
  const loadSystemSettings = async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      // console.log('Loading system settings...');
      const response = await API.systemSettings.getAllSettings();
      // console.log('System settings response:', response);
      
      const settingsData = response.data || response || [];
      setSystemSettings(settingsData);
      
      // Load current hourly rate
      const hourlyRateResponse = await API.systemSettings.getHourlyRate();
      // console.log('Hourly rate response:', hourlyRateResponse);
      
      if (hourlyRateResponse.data?.hourlyRate) {
        setHourlyRate(hourlyRateResponse.data.hourlyRate);
      }
      
      // Load chat system setting
      const chatSetting = settingsData.find(s => s.settingKey === 'chat_system_enabled');
      if (chatSetting) {
        setChatEnabled(chatSetting.settingValue === 'true');
      }
    } catch (error) {
      // console.error('Error loading system settings:', error);
      setSettingsError(error.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  // AI Prompts management functions
  const loadPrompts = async () => {
    try {
      setPromptsLoading(true);
      setPromptsError(null);
      const response = await API.admin.getPrompts();
      // Ensure response is always an array, handle empty dictionary case
      const prompts = Array.isArray(response) ? response : [];
      setAiPrompts(prompts);
    } catch (error) {
      // console.error('Error loading prompts:', error);
      setPromptsError(error.message);
    } finally {
      setPromptsLoading(false);
    }
  };

  // Refresh callback for hybrid refresh strategy
  const handleAdminDataRefresh = useCallback(async (event) => {
    console.log('Admin page refreshing data due to event:', event);
    
    try {
      // Refresh all data sources
      const refreshPromises = [];
      
      // Refresh admin stats
      if (typeof refetchAdminStats === 'function') {
        refreshPromises.push(refetchAdminStats());
      }
      
      // Refresh users
      if (typeof refetchUsers === 'function') {
        refreshPromises.push(refetchUsers());
      }
      
      // Refresh enrollment data
      if (user && user.accountType === 'admin') {
        refreshPromises.push(loadAllEnrollmentData());
      }
      
      // Refresh system settings if in settings view
      if (activeSection === 'settings' && typeof loadSystemSettings === 'function') {
        refreshPromises.push(loadSystemSettings());
      }
      
      // Refresh AI prompts if in prompts view
      if (activeSection === 'aiPrompts' && typeof loadPrompts === 'function') {
        refreshPromises.push(loadPrompts());
      }
      
      // Wait for all refreshes to complete
      await Promise.all(refreshPromises);
      
      console.log('Admin data refresh completed');
    } catch (error) {
      console.error('Error refreshing admin data:', error);
    }
  }, [refetchAdminStats, refetchUsers, user, activeSection, loadAllEnrollmentData, loadSystemSettings, loadPrompts]);

  // Initialize admin page refresh hook
  const { triggerRefresh, isRefreshing } = useAdminPageRefresh(handleAdminDataRefresh);

  useEffect(() => {
    // Add a small delay to prevent race conditions
    const timeoutId = setTimeout(() => {
      if (!user) {
        navigate('/login');
        return;
      }
      
      if (user.accountType !== 'admin') {
        navigate('/');
        return;
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [user, navigate]);

  // Clear student selections when page changes (optional UX improvement)
  useEffect(() => {
    setSelectedStudents(new Set());
  }, [currentStudentPage]);

  // Load enrollment data when admin page loads
  useEffect(() => {
    if (user && user.accountType === 'admin') {
      loadAllEnrollmentData();
    }
  }, [user]);

  // Plan management functions - Centralized fetchPlans with comprehensive error handling
  const fetchPlans = useCallback(async () => {
    if (!user || user.accountType !== 'admin') return;
    
    setPlansLoading(true);
    setPlansError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/plans`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setPlans(data.plans);
        setPlansError(null);
      } else {
        // Handle API errors (like invalid token)
        setPlansError(data.error || 'Failed to load plans');
        
        // If token is invalid, redirect to login
        if (response.status === 401) {
          navigate('/login');
          return;
        }
      }
    } catch (error) {
      setPlansError('Network error occurred');
      console.error('Error fetching plans:', error);
    } finally {
      setPlansLoading(false);
    }
  }, [user, navigate]);

  // Load plans when plans section becomes active - REFACTORED to use centralized fetchPlans
  useEffect(() => {
    // COMMENTED OUT - Duplicate fetchPlans function replaced by centralized version above
    // const fetchPlans_DUPLICATE = async () => {
    //   if (!user || user.accountType !== 'admin') return;
    //   setPlansLoading(true);
    //   setPlansError(null);
    //   try {
    //     const response = await fetch('http://localhost:5000/api/admin/plans', {
    //       headers: {
    //         'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
    //       }
    //     });
    //     const data = await response.json();
    //     if (response.ok) {
    //       setPlans(data.plans);
    //       setPlansError(null);
    //     } else {
    //       setPlansError(data.error || 'Failed to load plans');
    //       if (response.status === 401) {
    //         navigate('/login');
    //         return;
    //       }
    //     }
    //   } catch (error) {
    //     setPlansError('Network error occurred');
    //   } finally {
    //     setPlansLoading(false);
    //   }
    // };

    // Only fetch if we're on plans section and haven't loaded plans yet
    // Removed plans.length from dependencies to avoid refetching when deleting all plans
    if (activeSection === 'plans' && plans.length === 0 && !plansLoading && !plansError) {
      fetchPlans();
    }
  }, [activeSection, user, fetchPlans]); // Fixed dependencies - removed plansLoading and plans.length

  // Clear plans error when leaving the plans section
  useEffect(() => {
    if (activeSection !== 'plans' && plansError) {
      setPlansError(null);
    }
  }, [activeSection, plansError]);

  // Fetch tutors when tutors section is active
  useEffect(() => {
    const fetchTutors = async () => {
      if (activeSection === 'tutors' && tutors.length === 0 && !tutorsLoading) {
        try {
          setTutorsLoading(true);
          const response = await API.users.getAllTutorsForAdmin();
          setTutors(response.tutors || []);
        } catch (error) {
          // console.error('Error fetching tutors:', error);
        } finally {
          setTutorsLoading(false);
        }
      }
    };

    fetchTutors();
  }, [activeSection, tutors.length, tutorsLoading]);

  // Load tutor availability data when tutors are loaded
  useEffect(() => {
    if (tutors.length > 0 && activeSection === 'tutors') {
      loadTutorAvailabilityData();
    }
  }, [tutors]);

  // Fetch all tutors for filter dropdown when tutors section is active
  useEffect(() => {
    const fetchAllTutorsForFilter = async () => {
      // console.log('Filter useEffect triggered:', { 
      //   activeSection, 
      //   allTutorsLength: allTutorsForFilter.length, 
      //   filterTutorsLoading,
      //   tutorsLength: tutors.length 
      // });
      
      if (activeSection === 'tutors' && allTutorsForFilter.length === 0 && !filterTutorsLoading) {
        try {
          // console.log('Attempting to fetch all tutors for filter...');
          setFilterTutorsLoading(true);
          const response = await API.users.getAllTutorsForFilter();
          // console.log('Filter API response:', response);
          setAllTutorsForFilter(response.tutors || response || []);
        } catch (error) {
          // console.error('Error fetching all tutors for filter:', error);
          // Only use tutors as fallback if they have actually loaded
          if (tutors.length > 0) {
            // console.log('Using tutors as fallback:', tutors.length, 'tutors');
            setAllTutorsForFilter(tutors);
          } else {
            // console.log('Tutors not loaded yet, skipping fallback');
          }
        } finally {
          setFilterTutorsLoading(false);
        }
      }
    };

    fetchAllTutorsForFilter();
  }, [activeSection, allTutorsForFilter.length, filterTutorsLoading]);


  // Fetch AI prompts when ai-prompts section is active
  useEffect(() => {
    if (activeSection === 'ai-prompts' && aiPrompts.length === 0 && !promptsLoading) {
      loadPrompts();
    }
  }, [activeSection]);

  // AI Prompt CRUD functions
  const handleCreatePrompt = async (e) => {
    e.preventDefault();
    try {
      if (!promptFormData.promptName.trim() || !promptFormData.promptContent.trim()) {
        setFormErrors({ 
          promptName: !promptFormData.promptName.trim() ? 'Prompt name is required' : '',
          promptContent: !promptFormData.promptContent.trim() ? 'Prompt content is required' : ''
        });
        return;
      }

      setIsSubmitting(true);
      await API.admin.createPrompt(promptFormData);
      
      // Reload prompts and reset form
      await loadPrompts();
      setPromptFormData({ promptName: '', promptContent: '' });
      closeModal();
      setFeedback({ type: 'success', message: 'Prompt created successfully!' });
    } catch (error) {
      // console.error('Error creating prompt:', error);
      setFormErrors({ submit: error.message || 'Failed to create prompt' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePrompt = async (e) => {
    e.preventDefault();
    try {
      if (!promptFormData.promptContent.trim()) {
        setFormErrors({ promptContent: 'Prompt content is required' });
        return;
      }

      setIsSubmitting(true);
      await API.admin.updatePrompt(editingPrompt.promptName, {
        promptContent: promptFormData.promptContent
      });
      
      // Reload prompts and reset form
      await loadPrompts();
      setEditingPrompt(null);
      setPromptFormData({ promptName: '', promptContent: '' });
      closeModal();
      setFeedback({ type: 'success', message: 'Prompt updated successfully!' });
    } catch (error) {
      // console.error('Error updating prompt:', error);
      setFormErrors({ submit: error.message || 'Failed to update prompt' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      setIsSubmitting(true);
      const response = await API.admin.initializeDefaultPrompts();
      setFeedback({ type: 'success', message: response.message });
      await loadPrompts();
    } catch (error) {
      // console.error('Error initializing defaults:', error);
      setFeedback({ type: 'error', message: error.message || 'Failed to initialize defaults' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-refresh users data periodically (every 30 seconds when users section is active)
  useEffect(() => {
    if (activeSection !== 'users') return;

    const interval = setInterval(() => {
      // console.log('Auto-refreshing users data...');
      refetchUsers();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [activeSection, refetchUsers]);

  // Tutor management functions
  const handleTutorVerification = (tutor, action) => {
    setSelectedTutor(tutor);
    setTutorModalType(action);
    setVerificationNotes('');
    setShowTutorModal(true);
  };

  const confirmTutorVerification = async () => {
    if (!selectedTutor) return;

    try {
      if (tutorModalType === 'verify') {
        await API.users.verifyTutor(selectedTutor.id, verificationNotes);
      } else {
        await API.users.unverifyTutor(selectedTutor.id, verificationNotes);
      }

      // Update the tutor in the local state
      setTutors(prev => prev.map(tutor => 
        tutor.id === selectedTutor.id 
          ? { ...tutor, isVerified: tutorModalType === 'verify' }
          : tutor
      ));

      setShowTutorModal(false);
      setSelectedTutor(null);
      setVerificationNotes('');
    } catch (error) {
      // console.error('Error updating tutor verification:', error);
      alert('Failed to update tutor verification status');
    }
  };

  // Calculate enhanced availability statistics from real database data (from TutorPage)
  const calculateAvailabilityStats = (availabilityData, earnings = {}) => {
    // console.log(`🔍 STATS: Starting calculation with data:`, availabilityData);
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

    // Handle both legacy format and new API format
    let dataToProcess = availabilityData;
    if (availabilityData.availability && typeof availabilityData.availability === 'object') {
      dataToProcess = availabilityData.availability;
    }

    // console.log(`🔍 STATS: dataToProcess structure:`, dataToProcess);
    // console.log(`🔍 STATS: dataToProcess keys:`, Object.keys(dataToProcess));
    // console.log(`🔍 STATS: Is array?`, Array.isArray(dataToProcess));

    // Handle array format (new API response)
    if (Array.isArray(dataToProcess)) {
      // console.log(`🔍 STATS: Processing ${dataToProcess.length} availability records`);
      totalSlots = dataToProcess.length;
      
      dataToProcess.forEach(slot => {
        // console.log(`🔍 STATS: Processing slot:`, slot);
        try {
          // Handle both startTime/endTime and start_time/end_time formats
          let startHour, startMin, endHour, endMin;
          
          if (slot.start_time && slot.end_time) {
            [startHour, startMin] = slot.start_time.split(':').map(Number);
            [endHour, endMin] = slot.end_time.split(':').map(Number);
          } else if (slot.startTime && slot.endTime) {
            [startHour, startMin] = slot.startTime.split(':').map(Number);
            [endHour, endMin] = slot.endTime.split(':').map(Number);
          } else {
            // console.log(`🔍 STATS: No valid time format found for slot`);
            return; // Skip this slot
          }
          
          // Calculate duration in hours
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          const duration = (endMinutes - startMinutes) / 60;
          
          if (duration > 0) {
            availableHours += duration;
            
            // Map day_of_week to day names for tracking
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = dayNames[slot.day_of_week] || 'Unknown';
            
            if (!dailyHours[dayName]) {
              dailyHours[dayName] = 0;
            }
            dailyHours[dayName] += duration;
            
            // Check if slot is in the upcoming week
            const slotDate = slot.specific_date ? new Date(slot.specific_date) : new Date();
            if (slotDate >= now && slotDate <= oneWeekFromNow) {
              weeklyHours += duration;
              upcomingSlots++;
            }
            
            // Track course types if available
            if (slot.course_id) {
              courseTypes.add(slot.course_id);
            }
          }
          
          // console.log(`🔍 STATS: Processed slot - Duration: ${duration}h, Total hours: ${availableHours}`);
          
        } catch (error) {
          // console.warn(`🔍 STATS: Error processing availability slot:`, error, slot);
        }
      });
      
    } else {
      // Handle legacy object format (grouped by days)
      Object.keys(dataToProcess).forEach(dayKey => {
        const dayData = dataToProcess[dayKey];
        if (dayData?.available && dayData?.timeSlots && Array.isArray(dayData.timeSlots)) {
          totalSlots += dayData.timeSlots.length;
        
        dayData.timeSlots.forEach(slot => {
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
              // console.warn('⚠️ Slot missing time information:', slot);
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
            
            // Track daily distribution
            const dayName = dayKey.toLowerCase();
            if (dailyHours[dayName] !== undefined) {
              dailyHours[dayName] += duration;
            }
            
            // Check if slot is in the upcoming week
            const slotDate = slot.specificDate ? new Date(slot.specificDate) : new Date();
            if (slotDate >= now && slotDate <= oneWeekFromNow) {
              weeklyHours += duration;
              upcomingSlots++;
            }
            
            // Check booking and completion status
            if (slot.isBooked || slot.status === 'booked' || slot.status === 'scheduled') {
              bookedSlots++;
            }
            
            if (slot.status === 'completed') {
              completedSessions++;
            }
            
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
            // console.warn('⚠️ Error processing slot:', slot, error);
          }
        });
        }
      });
    }

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

    return { 
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
  };

  // Load tutor availability data and calculate aggregate stats
  const loadTutorAvailabilityData = async () => {
    if (!tutors.length) return;

    try {
      const availabilityPromises = tutors.map(async (tutor) => {
        try {
          // console.log(`🔍 STEP 1: Fetching availability for tutor ${tutor.id} (${tutor.email})`);
          // console.log('🔍 STEP 2: API.availability object:', API.availability);
          // console.log('🔍 STEP 3: getTutorAvailability function:', API.availability?.getTutorAvailability);
          
          const availabilityData = await API.availability.getTutorAvailability(tutor.id);
          // console.log(`🔍 STEP 4: Raw availability data for ${tutor.id}:`, availabilityData);
          
          const stats = calculateAvailabilityStats(availabilityData || {});
          // console.log(`🔍 STEP 5: Calculated stats for ${tutor.id}:`, stats);
          
          return {
            tutorId: tutor.id,
            stats: stats
          };
        } catch (error) {
          // console.error(`🔍 ERROR: Could not load availability for tutor ${tutor.id}:`, error);
          return {
            tutorId: tutor.id,
            stats: {
              totalSlots: 0, bookedSlots: 0, availableHours: 0, weeklyHours: 0,
              conflicts: 0, utilizationRate: 0, completionRate: 0, estimatedWeeklyEarnings: 0,
              courseTypes: 0, peakPeriod: 'N/A', mostActiveHour: 'N/A', mostActiveDay: 'N/A'
            }
          };
        }
      });

      const tutorStatsArray = await Promise.all(availabilityPromises);
      const availabilityMap = {};
      
      // Calculate aggregated stats
      const aggregated = tutorStatsArray.reduce((acc, { tutorId, stats }) => {
        availabilityMap[tutorId] = stats;
        
        acc.totalSlots += stats.totalSlots;
        acc.bookedSlots += stats.bookedSlots;
        acc.availableHours += stats.availableHours;
        acc.weeklyHours += stats.weeklyHours;
        acc.conflicts += stats.conflicts;
        acc.courseTypes += stats.courseTypes;
        acc.estimatedWeeklyEarnings += stats.estimatedWeeklyEarnings;
        
        return acc;
      }, {
        totalSlots: 0, bookedSlots: 0, availableHours: 0, weeklyHours: 0,
        conflicts: 0, courseTypes: 0, estimatedWeeklyEarnings: 0
      });

      // Calculate aggregate percentages
      aggregated.utilizationRate = aggregated.totalSlots > 0 
        ? Math.round((aggregated.bookedSlots / aggregated.totalSlots) * 100) : 0;
      
      const completedSessions = tutorStatsArray.reduce((sum, { stats }) => sum + stats.completedSessions, 0);
      aggregated.completionRate = aggregated.bookedSlots > 0 
        ? Math.round((completedSessions / aggregated.bookedSlots) * 100) : 0;

      // Find most common peak period and active day
      const peakPeriods = tutorStatsArray.map(({ stats }) => stats.peakPeriod);
      const activeDays = tutorStatsArray.map(({ stats }) => stats.mostActiveDay);
      
      aggregated.peakPeriod = peakPeriods.reduce((a, b, i, arr) =>
        arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
      ) || 'N/A';
      
      aggregated.mostActiveDay = activeDays.reduce((a, b, i, arr) =>
        arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
      ) || 'N/A';

      setTutorAvailabilityData(availabilityMap);
      setAggregatedTutorStats(aggregated);
      
    } catch (error) {
      // console.error('Error loading tutor availability data:', error);
    }
  };

  // Get filtered stats based on selected tutor
  const getFilteredTutorStats = () => {
    if (selectedTutorFilter === 'all') {
      return aggregatedTutorStats;
    }

    // Return stats for specific tutor
    const tutorStats = tutorAvailabilityData[selectedTutorFilter];
    if (tutorStats) {
      return tutorStats;
    }

    // Return empty stats if tutor not found
    return {
      totalSlots: 0,
      bookedSlots: 0,
      availableHours: 0,
      weeklyHours: 0,
      conflicts: 0,
      utilizationRate: 0,
      completionRate: 0,
      estimatedWeeklyEarnings: 0,
      courseTypes: 0,
      peakPeriod: 'N/A',
      mostActiveHour: 'N/A',
      mostActiveDay: 'N/A'
    };
  };

  // Get filtered insights data
  const getFilteredInsightsData = () => {
    if (selectedTutorFilter === 'all') {
      return {
        activeTutors: tutors.filter(t => tutorAvailabilityData[t.id]?.totalSlots > 0).length,
        courseTypes: aggregatedTutorStats.courseTypes,
        mostActiveDay: aggregatedTutorStats.mostActiveDay,
        verifiedTutors: tutors.filter(t => t.isVerified).length,
        totalTutors: tutors.length
      };
    }

    // Return insights for specific tutor
    const tutorStats = tutorAvailabilityData[selectedTutorFilter];
    const selectedTutor = allTutorsForFilter.find(t => t.id === selectedTutorFilter);
    
    return {
      activeTutors: tutorStats?.totalSlots > 0 ? 1 : 0,
      courseTypes: tutorStats?.courseTypes || 0,
      mostActiveDay: tutorStats?.mostActiveDay || 'N/A',
      verifiedTutors: selectedTutor?.isVerified ? 1 : 0,
      totalTutors: 1,
      tutorName: selectedTutor?.name || selectedTutor?.email || 'Unknown'
    };
  };

  // Get filtered tutors for display
  const getFilteredTutors = () => {
    if (selectedTutorFilter === 'all') {
      return tutors; // Show all tutors
    }
    
    // Show only the selected tutor
    return tutors.filter(tutor => tutor.id === selectedTutorFilter);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Password reset functions
  const handlePasswordReset = (user) => {
    setSelectedUserForReset(user);
    setPasswordResetData({
      method: 'email',
      passwordLength: 12,
      notifyUser: true
    });
    setPasswordResetError('');
    setShowPasswordResetModal(true);
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsResettingPassword(true);
      setPasswordResetError('');

      let result;
      if (passwordResetData.method === 'email') {
        result = await API.admin.resetUserPasswordByEmail(
          selectedUserForReset.id, 
          passwordResetData.notifyUser
        );
      } else if (passwordResetData.method === 'temp') {
        result = await API.admin.generateTemporaryPassword(
          selectedUserForReset.id, 
          passwordResetData.passwordLength
        );
      }

      // Close modal and reset form
      setShowPasswordResetModal(false);
      setPasswordResetData({
        method: 'email',
        passwordLength: 12,
        notifyUser: true
      });
      setSelectedUserForReset(null);

      // Show success feedback with appropriate message
      if (passwordResetData.method === 'email') {
        setFeedback({ 
          type: 'success', 
          message: `Password reset email sent to ${selectedUserForReset.email}`
        });
      } else {
        // For temporary password, show in dialog instead of feedback message
        if (result?.temporary_password) {
          setTempPasswordData({
            password: result.temporary_password,
            userName: selectedUserForReset.name || selectedUserForReset.email,
            userEmail: selectedUserForReset.email
          });
          setShowTempPasswordDialog(true);
        } else {
          setFeedback({ 
            type: 'success', 
            message: `Temporary password generated for ${selectedUserForReset.name || selectedUserForReset.email}`
          });
        }
      }

    } catch (error) {
      // console.error('Password reset error:', error);
      setPasswordResetError(error.response?.data?.error || error.message || 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const closePasswordResetModal = () => {
    setShowPasswordResetModal(false);
    setPasswordResetData({
      method: 'email',
      passwordLength: 12,
      notifyUser: true
    });
    setPasswordResetError('');
    setSelectedUserForReset(null);
  };

  // Temporary password dialog functions
  const closeTempPasswordDialog = () => {
    setShowTempPasswordDialog(false);
    setTempPasswordData({
      password: '',
      userName: '',
      userEmail: ''
    });
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback({ 
        type: 'success', 
        message: 'Password copied to clipboard!'
      });
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setFeedback({ 
        type: 'success', 
        message: 'Password copied to clipboard!'
      });
    }
  };

  // Credit allocation functions
  const openCreditModal = (guardian) => {
    setSelectedGuardianForCredits(guardian);
    setCreditForm({
      amount: '',
      reason: 'Manual credit addition by admin'
    });
    setCreditError('');
    setShowCreditModal(true);
  };

  const closeCreditModal = () => {
    setShowCreditModal(false);
    setSelectedGuardianForCredits(null);
    setCreditForm({ amount: '', reason: '' });
    setCreditError('');
  };

  const handleCreditFormSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsAddingCredits(true);
      setCreditError('');

      // Validate form
      if (!creditForm.amount || parseFloat(creditForm.amount) <= 0) {
        setCreditError('Please enter a valid amount greater than 0');
        return;
      }

      if (!creditForm.reason.trim()) {
        setCreditError('Please provide a reason for this credit addition');
        return;
      }

      // Add credits via API
      const result = await API.admin.addCreditsToGuardian(
        selectedGuardianForCredits.id,
        parseFloat(creditForm.amount),
        creditForm.reason.trim()
      );

      // Check for success using message or credit_balance presence
      if (result && (result.credit_balance || (result.message && result.message.includes('successfully')))) {
        // Show success message using backend message or fallback
        const successMessage = result.message || `Successfully added ${creditForm.amount} credits to ${selectedGuardianForCredits.name || selectedGuardianForCredits.email}`;
        alert(successMessage);

        // Close modal
        closeCreditModal();

        // Refresh users data to reflect updated credits
        await refetchUsers();
      } else {
        // If we reach here, something went wrong with the response format
        setCreditError(result?.error || 'Unexpected response format from server');
      }
    } catch (error) {
      // console.error('Error adding credits:', error);
      setCreditError(error.response?.data?.error || error.message || 'Failed to add credits. Please try again.');
    } finally {
      setIsAddingCredits(false);
    }
  };

  // MOVED - fetchPlans function moved above useEffect to fix hoisting issue

  // COMMENTED OUT - Duplicate fetchPlans function that was causing race conditions
  // const fetchPlans_OLD = async () => {
  //   setPlansLoading(true);
  //   try {
  //     const response = await fetch('http://localhost:5000/api/admin/plans', {
  //       headers: {
  //         'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
  //       }
  //     });
  //     const data = await response.json();
  //     if (response.ok) {
  //       setPlans(data.plans);
  //     }
  //   } catch (error) {
  //     // console.error('Error fetching plans:', error);
  //   } finally {
  //     setPlansLoading(false);
  //   }
  // };

  // COMMENTED OUT - Unused function replaced by handleSavePlan
  // const handleCreatePlan = async (formData) => {
  //   try {
  //     const response = await fetch('http://localhost:5000/api/admin/plans', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
  //       },
  //       body: JSON.stringify(formData)
  //     });
  //     
  //     if (response.ok) {
  //       setShowModal(false);
  //       fetchPlans(); // This would have caused loading issues
  //       setPlanFormData({
  //         name: '',
  //         description: '',
  //         pricePerSession: '',
  //         currency: 'GBP',
  //         period: 'monthly',
  //         features: [''],
  //         isPopular: false,
  //         isActive: true,
  //         displayOrder: 0
  //       });
  //     }
  //   } catch (error) {
  //     // console.error('Error creating plan:', error);
  //   }
  // };

  // COMMENTED OUT - Unused function replaced by handleSavePlan
  // const handleUpdatePlan = async (planId, formData) => {
  //   try {
  //     const response = await fetch(`http://localhost:5000/api/admin/plans/${planId}`, {
  //       method: 'PUT',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
  //       },
  //       body: JSON.stringify(formData)
  //     });
  //     
  //     if (response.ok) {
  //       setShowModal(false);
  //       fetchPlans(); // This would have caused loading issues
  //     }
  //   } catch (error) {
  //     // console.error('Error updating plan:', error);
  //   }
  // };

  // COMMENTED OUT - Another duplicate handleDeletePlan function
  // const handleDeletePlan_DUPLICATE = async (planId) => {
  //   if (window.confirm('Are you sure you want to delete this plan?')) {
  //     try {
  //       const response = await fetch(`http://localhost:5000/api/admin/plans/${planId}`, {
  //         method: 'DELETE',
  //         headers: {
  //           'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
  //         }
  //       });
  //       
  //       if (response.ok) {
  //         fetchPlans(); // This would have caused loading issues
  //       }
  //     } catch (error) {
  //       // console.error('Error deleting plan:', error);
  //     }
  //   }
  // };

  const handleTogglePlan = async (planId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/plans/${planId}/toggle-active`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        fetchPlans();
      }
    } catch (error) {
      // console.error('Error toggling plan:', error);
    }
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    
    // Reset forms when opening modals
    if (type === 'assignTutor') {
      setTutorAssignmentData({ tutorIds: [], notes: '' });
    }
    if (type === 'createModule' && item) {
      setModuleFormData(prev => ({ ...prev, courseId: item.id }));
    }
    if (type === 'createQuiz') {
      // Reset quiz form and modules when opening create quiz modal
      setQuizFormData({
        courseId: '',
        moduleId: '',
        topic: '',
        title: '',
        difficulty: 'medium',
        timeLimit: '30',
        numberOfQuestions: '',
        passingScore: ''
      });
      setAvailableModules([]);
      setAvailableTopics([]);
    }
    
    // Auto-populate module form when opened from course card
    if (type === 'createModule' && item && item.id) {
      setModuleFormData(prev => ({
        ...prev,
        courseId: item.id
      }));
    }
    
    // Auto-populate edit course form when opened
    if (type === 'editCourse' && item) {
      setCourseFormData({
        title: item.title || '',
        description: item.description || '',
        price: item.price || '',
        duration: item.duration || '',
        subject: item.subject || '',
        country: item.country || 'UK',
        gradeLevel: item.gradeLevel || '',
        status: item.status || 'active',
        learningOutcomes: Array.isArray(item.learning_outcomes) 
          ? item.learning_outcomes.join('\n') 
          : Array.isArray(item.learningOutcomes)
            ? item.learningOutcomes.join('\n')
            : (item.learningOutcomes || '')
      });
    }

    // Auto-populate edit user form when opened
    if (type === 'editUser' && item) {
      setEditUserFormData({
        name: item.name || '',
        email: item.email || '',
        phone: item.phone || '',
        accountType: item.accountType || item.account_type || '',
        status: item.status || 'active',
        grade: item.grade || '',
        subjects: Array.isArray(item.subjects) ? item.subjects.join(', ') : (item.subjects || ''),
        guardian: item.guardian || '',
        students: Array.isArray(item.students) ? item.students.join(', ') : (item.students || ''),
        roles: Array.isArray(item.roles) ? [...item.roles] : [],  // Added roles initialization
        profile: item.profile || {}
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedItem(null);
    // Reset form data when closing
    setCourseFormData({
      title: '',
      description: '',
      price: '',
      duration: '',
      subject: '',
      country: 'UK',
      gradeLevel: '',
      status: 'active',
      learningOutcomes: ''
    });
    setModuleFormData({
      courseId: '',
      title: '',
      lessons: '',
      duration: '',
      startDate: '',
      endDate: ''
    });
    setEditUserFormData({
      name: '',
      email: '',
      phone: '',
      accountType: '',
      status: '',
      grade: '',
      subjects: '',
      guardian: '',
      students: '',
      profile: {}
    });
    setTutorAssignmentData({
      tutorId: '',
      notes: ''
    });
    setFeedback({ type: '', message: '' });
    setFormErrors({});
    setIsSubmitting(false);
  };

  // Handle form input changes
  const handleCourseFormChange = (e) => {
    const { name, value } = e.target;
    setCourseFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle module form input changes
  const handleModuleFormChange = (e) => {
    const { name, value } = e.target;
    setModuleFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle quiz form input changes
  const handleQuizFormChange = (e) => {
    const { name, value } = e.target;
    setQuizFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Reset dependent fields when course changes
      if (name === 'courseId') {
        updated.moduleId = '';
        updated.topic = '';
        // Fetch modules for the selected course
        fetchModulesForCourse(value);
      }
      
      // Reset topic when module changes and fetch lessons/topics
      if (name === 'moduleId') {
        updated.topic = '';
        // Fetch topics/lessons for the selected module
        fetchTopicsForModule(value);
      }
      
      return updated;
    });
  };

  // Function to fetch modules for selected course
  const fetchModulesForCourse = async (courseId) => {
    if (!courseId) {
      setAvailableModules([]);
      return;
    }

    try {
      const modulesData = await API.courses.getCourseModules(courseId);
      setAvailableModules(modulesData.modules || []);
    } catch (error) {
      // console.error('Failed to fetch modules for course:', error);
      setAvailableModules([]);
      setFeedback({
        type: 'error',
        message: 'Failed to load modules for selected course'
      });
    }
  };

  // Function to fetch topics/lessons for selected module
  const fetchTopicsForModule = async (moduleId) => {
    if (!moduleId) {
      setAvailableTopics([]);
      return;
    }

    try {
      const lessonsData = await API.modules.getModuleLessons(moduleId);
      setAvailableTopics(lessonsData.lessons || []);
    } catch (error) {
      // console.error('Failed to fetch lessons for module:', error);
      setAvailableTopics([]);
      setFeedback({
        type: 'error',
        message: 'Failed to load lessons for selected module'
      });
    }
  };

  // Helper functions for quiz form filtering
  const getFilteredModules = () => {
    return availableModules;
  };

  const getFilteredTopics = () => {
    return availableTopics;
  };

  // Handle quiz form submission
  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!quizFormData.courseId || !quizFormData.moduleId || !quizFormData.title || !quizFormData.topic) {
        setFeedback({
          type: 'error',
          message: 'Please fill in all required fields'
        });
        return;
      }

      // Get lesson information for topic name
      const selectedLesson = availableTopics.find(lesson => lesson.id === quizFormData.topic);
      const lessonName = selectedLesson ? selectedLesson.title : '';

      // Get selected course for grade level and country
      const selectedCourse = courses.find(course => course.id === quizFormData.courseId);
      
      // Debug logging
      // console.log('Quiz creation debug:');
      // console.log('quizFormData.courseId:', quizFormData.courseId);
      // console.log('selectedCourse:', selectedCourse);
      // console.log('selectedCourse?.gradeLevel:', selectedCourse?.gradeLevel);
      // console.log('selectedCourse?.country:', selectedCourse?.country);

      // Create lessonQuizData object with the specified format
      const lessonQuizData = {
        title: quizFormData.title,
        numQuestions: parseInt(quizFormData.numberOfQuestions),
        difficulty: quizFormData.difficulty,
        timeLimit: parseInt(quizFormData.timeLimit),
        passingScore: parseInt(quizFormData.passingScore),
        topic: lessonName,
        gradeLevel: selectedCourse?.gradeLevel,
        country: selectedCourse?.country
      };
      
      // console.log('lessonQuizData payload:', lessonQuizData);

      // Get moduleId and lessonId
      const moduleId = quizFormData.moduleId;
      const lessonId = quizFormData.topic;

      // Generate lesson level quiz with lessonId parameter
      const result = await API.quizzes.generateQuizWithAI(moduleId, lessonQuizData, lessonId);

      setFeedback({
        type: 'success',
        message: `Quiz "${quizFormData.title}" created successfully with ${result.quiz?.questions?.length || 0} questions!`
      });

      // Close modal and reset form
      closeModal();
      
      // Optionally refresh data if needed
      // refetchAdminStats();

    } catch (error) {
      // console.error('Failed to create quiz:', error);
      setFeedback({
        type: 'error',
        message: error.message || 'Failed to create quiz. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle tutor assignment form input changes
  const handleTutorAssignmentChange = (e) => {
    const { name, value, type } = e.target;
    
    if (name === 'tutorIds' && type === 'select-multiple') {
      // Handle multi-select dropdown
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      setTutorAssignmentData(prev => ({
        ...prev,
        tutorIds: selectedOptions
      }));
    } else {
      // Handle other form fields
      setTutorAssignmentData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle removing a tutor from selection
  const handleRemoveTutor = (tutorIdToRemove) => {
    setTutorAssignmentData(prev => ({
      ...prev,
      tutorIds: prev.tutorIds.filter(id => id !== tutorIdToRemove)
    }));
  };

  // Handle edit user form input changes
  const handleEditUserFormChange = (e) => {
    const { name, value } = e.target;
    setEditUserFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate course form
  const validateCourseForm = () => {
    const errors = {};
    
    if (!courseFormData.title.trim()) {
      errors.title = 'Course title is required';
    }
    
    if (!courseFormData.description.trim()) {
      errors.description = 'Course description is required';
    }
    
    if (courseFormData.price && isNaN(parseFloat(courseFormData.price))) {
      errors.price = 'Price must be a valid number';
    }
    
    if (courseFormData.price && parseFloat(courseFormData.price) < 0) {
      errors.price = 'Price cannot be negative';
    }
    
    if (!courseFormData.gradeLevel) {
      errors.gradeLevel = 'Grade level is required';
    }

    return errors;
  };

  /**
   * Finds and returns tutors who teach the specified subject
   * @param {string} subject - The subject to match
   * @param {Array} tutorsList - List of all tutors from API
   * @returns {Array} Array of tutor IDs that teach the subject
   */
  const findTutorsBySubject = (subject, tutorsList = organizedUsers.tutors) => {
    // console.log('=== FIND TUTORS BY SUBJECT DEBUG ===');
    // console.log('Input subject:', subject);
    // console.log('Input tutorsList:', tutorsList);
    // console.log('Tutors list length:', tutorsList ? tutorsList.length : 0);
    
    if (!subject || !subject.trim()) {
      // console.log('No subject provided, returning empty array');
      return [];
    }
    
    const normalizedSubject = subject.trim().toLowerCase();
    // console.log('Normalized subject:', normalizedSubject);
    
    // Filter tutors who have the subject in their subjects array
    const matchingTutors = tutorsList.filter(tutor => {
      // console.log('Checking tutor:', tutor);
      // console.log('Tutor ID:', tutor.id);
      // console.log('Tutor email:', tutor.email);
      
      // Check if tutor has subjects in profile or directly as property
      const tutorSubjects = tutor.subjects || (tutor.profile && tutor.profile.subjects) || [];
      // console.log('Tutor subjects found:', tutorSubjects);
      
      if (!Array.isArray(tutorSubjects)) {
        // console.log('Tutor subjects is not an array, skipping');
        return false;
      }
      
      // Check if any of the tutor's subjects match (case-insensitive)
      const hasMatch = tutorSubjects.some(tutorSubject => {
        const normalizedTutorSubject = tutorSubject.toLowerCase();
        const match = normalizedTutorSubject.includes(normalizedSubject) ||
                     normalizedSubject.includes(normalizedTutorSubject);
        // console.log(`Comparing "${normalizedTutorSubject}" with "${normalizedSubject}": ${match}`);
        return match;
      });
      
      // console.log('Tutor has matching subject:', hasMatch);
      return hasMatch;
    });
    
    // console.log('Matching tutors found:', matchingTutors);
    
    // Return array of tutor IDs
    const tutorIds = matchingTutors.map(tutor => tutor.id);
    // console.log('Returning tutor IDs:', tutorIds);
    // console.log('=== END FIND TUTORS DEBUG ===');
    
    return tutorIds;
  };

  // Handle course form submission
  const handleCourseFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateCourseForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare data for API
      const courseData = {
        title: courseFormData.title.trim(),
        description: courseFormData.description.trim(),
        price: courseFormData.price ? parseFloat(courseFormData.price) : 0,
        duration: courseFormData.duration.trim(),
        subject: courseFormData.subject.trim(),
        country: courseFormData.country,
        gradeLevel: courseFormData.gradeLevel,
        status: courseFormData.status,
        learningOutcomes: courseFormData.learningOutcomes 
          ? (typeof courseFormData.learningOutcomes === 'string' 
              ? courseFormData.learningOutcomes.split('\n').map(item => item.trim()).filter(item => item)
              : Array.isArray(courseFormData.learningOutcomes)
                ? courseFormData.learningOutcomes
                : []
            )
          : []
      };

      // Check if we're editing or creating
      if (modalType === 'editCourse' && selectedItem) {
        // Update existing course
        await updateCourse(selectedItem.id, courseData);
        alert('Course updated successfully!');
      } else {

        
        // courseData.assignedTutors = matchingTutorIds;
        
        // Create new course
        const newCourse = await createCourse(courseData);
        // Auto-assign tutors based on subject BEFORE creating the course
        let matchingTutorIds = [];
        if (courseData.subject) {
          matchingTutorIds = findTutorsBySubject(courseData.subject);
        }

        if (matchingTutorIds.length > 0 && newCourse && newCourse.course.id) {
          try {
            await API.courses.assignTutors(newCourse.course.id, matchingTutorIds);
            // console.log(`Auto-assigned ${matchingTutorIds.length} tutor(s) to course ${newCourse.course.title}`);
            alert(`Course created successfully! ${matchingTutorIds.length} tutor(s) with matching subject were automatically assigned.`);
          } catch (assignError) {
            // console.error('Failed to auto-assign tutors:', assignError);
            alert('Course created successfully, but automatic tutor assignment failed. Please assign tutors manually.');
          }
        } else if (courseData.subject && matchingTutorIds.length === 0) {
          // console.log('No tutors found with matching subject:', courseData.subject);
          alert('Course created successfully! No tutors found with matching subject.');
        } else {
          alert('Course created successfully!');
        }
      }
      
      // Refresh admin dashboard statistics after course creation/update
      if (typeof refetchAdminStats === 'function') {
        await refetchAdminStats();
      }
      
      // Success - close modal
      closeModal();
      
    } catch (error) {
      // console.error('Failed to save course:', error);
      setFormErrors({
        submit: error.message || 'Failed to save course. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle module form submission
  const handleModuleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!moduleFormData.courseId) {
      setFormErrors({ courseId: 'Please select a course' });
      return;
    }
    if (!moduleFormData.title.trim()) {
      setFormErrors({ title: 'Module title is required' });
      return;
    }
    if (!moduleFormData.lessons || parseInt(moduleFormData.lessons) < 1) {
      setFormErrors({ lessons: 'Number of lessons must be at least 1' });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare data for API
      const moduleData = {
        courseId: moduleFormData.courseId,
        title: moduleFormData.title.trim(),
        lessons: parseInt(moduleFormData.lessons),
        duration: moduleFormData.duration.trim() || '1 week',
        startDate: moduleFormData.startDate || null,
        endDate: moduleFormData.endDate || null
      };

      // Create module using the API
      await API.modules.createModule(moduleData);
      
      // Success - refresh admin stats and close modal
      await refetchAdminStats();
      closeModal();
      alert('Module created successfully!');
      
    } catch (error) {
      // console.error('Failed to create module:', error);
      setFormErrors({
        submit: error.message || 'Failed to create module. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit user form submission
  const handleEditUserFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!editUserFormData.name.trim()) {
      setFormErrors({ name: 'Name is required' });
      return;
    }
    if (!editUserFormData.email.trim()) {
      setFormErrors({ email: 'Email is required' });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare data for API
      const userData = {
        name: editUserFormData.name.trim(),
        email: editUserFormData.email.trim(),
        phone: editUserFormData.phone.trim(),
        accountType: editUserFormData.accountType,
        status: editUserFormData.status,
        roles: editUserFormData.roles,  // Added roles to userData
        profile: {
          ...editUserFormData.profile,
          grade: editUserFormData.grade,
          subjects: editUserFormData.subjects ? editUserFormData.subjects.split(',').map(s => s.trim()) : [],
          guardian: editUserFormData.guardian,
          students: editUserFormData.students ? editUserFormData.students.split(',').map(s => s.trim()) : []
        }
      };


      // Update user using the API
      const response = await API.users.updateUser(selectedItem.id, userData);
      console.log('User update response:', response);
      
      // Success - refresh users data and close modal
      closeModal(); // Close modal first to reset state
      
      // Add a small delay before refetching to ensure backend has committed changes
      setTimeout(async () => {
        // Force refresh users data by clearing cache first
        dataService.clearAllCache();
        await refetchUsers();
        await refetchAdminStats();
      }, 500);
      
      alert('User updated successfully!');
      
    } catch (error) {
      // console.error('Failed to update user - Full error:', error);
      // console.error('Error response:', error.response);
      setFormErrors({
        submit: error.message || 'Failed to update user. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle tutor assignment form submission
  const handleTutorAssignmentSubmit = async (e) => {
    e.preventDefault();
    
    // console.log('=== ASSIGN TUTOR FORM SUBMISSION ===');
    // console.log('Selected course:', selectedItem);
    // console.log('Tutor assignment data:', tutorAssignmentData);
    // console.log('Course ID being sent:', selectedItem?.id);
    // console.log('Tutor IDs being sent:', tutorAssignmentData.tutorIds);
    
    if (!tutorAssignmentData.tutorIds || tutorAssignmentData.tutorIds.length === 0 || !selectedItem) {
      // console.log('ERROR: Missing required data for assignment');
      setFeedback({ type: 'error', message: 'Please select at least one tutor to assign' });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: '', message: '' });
    
    try {
      // console.log('Sending assignment request to backend...');
      // console.log('API endpoint: /courses/' + selectedItem.id + '/tutors');
      // console.log('Request payload:', { tutorIds: tutorAssignmentData.tutorIds });
      
      // Call API to assign multiple tutors to course
      const response = await API.courses.assignTutors(selectedItem.id, tutorAssignmentData.tutorIds);
      
      // console.log('Backend response:', response);
      
      // Use the response message which includes detailed feedback
      setFeedback({ 
        type: 'success', 
        message: response.message || `Successfully assigned tutors to ${selectedItem.title}` 
      });
      
      // Refresh courses and admin stats
      await Promise.all([
        refetchAdminStats()
      ]);
      
      // If courses hook has a refetch method, use it
      if (typeof createCourse === 'function') {
        // Force refresh courses list by reloading the component state
        window.location.reload();
      }
      
      // Close modal after brief delay to show success message
      setTimeout(() => {
        closeModal();
      }, 1500);
      
    } catch (error) {
      // console.error('Failed to assign tutor:', error);
      setFeedback({ 
        type: 'error', 
        message: error.response?.data?.message || 'Failed to assign tutor. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter courses function
  const filterCourses = (courses) => {
    if (!Array.isArray(courses)) return [];
    
    return courses.filter(course => {
      // Search filter (title or description)
      if (courseFilters.search) {
        const searchTerm = courseFilters.search.toLowerCase();
        const matchesSearch = 
          course.title?.toLowerCase().includes(searchTerm) ||
          course.description?.toLowerCase().includes(searchTerm) ||
          course.subject?.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;
      }
      
      // Subject filter
      if (courseFilters.subject && course.subject?.toLowerCase() !== courseFilters.subject.toLowerCase()) {
        return false;
      }
      
      // Grade Level filter
      if (courseFilters.gradeLevel && course.gradeLevel !== courseFilters.gradeLevel) {
        return false;
      }
      
      // Status filter
      if (courseFilters.status) {
        const courseStatus = course.status?.toLowerCase() || 'active';
        if (courseStatus !== courseFilters.status.toLowerCase()) {
          return false;
        }
      }
      
      // Price range filter
      if (courseFilters.priceRange) {
        const price = parseFloat(course.price) || 0;
        switch (courseFilters.priceRange) {
          case 'free':
            if (price > 0) return false;
            break;
          case 'under50':
            if (price >= 50) return false;
            break;
          case '50to200':
            if (price < 50 || price > 200) return false;
            break;
          case 'over200':
            if (price <= 200) return false;
            break;
          default:
            break;
        }
      }
      
      return true;
    });
  };

  // Handle filter change
  const handleFilterChange = (filterKey, value) => {
    setCourseFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setCourseFilters({
      subject: '',
      level: '',
      priceRange: '',
      status: '',
      search: ''
    });
  };


  // Toggle expanded state for student courses
  const toggleStudentExpanded = (studentId) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedStudents(newExpanded);
  };

  // Toggle expanded state for course tutors
  const toggleCourseTutorsExpanded = (courseId) => {
    const newExpanded = new Set(expandedCourseTutors);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
    }
    setExpandedCourseTutors(newExpanded);
  };

  // Handle guardian click
  const handleGuardianClick = async (guardianId) => {
    try {
      // Find guardian details
      const guardian = organizedUsers.guardians.find(g => g.id === guardianId) ||
                     organizedUsers.guardians.find(g => g.name === guardianId) ||
                     organizedUsers.guardians.find(g => g.email === guardianId);
      
      if (!guardian) {
        // Try to fetch guardian details from API
        try {
          const guardianResponse = await API.users.getUser(guardianId);
          setSelectedGuardian(guardianResponse.user);
        } catch (error) {
          // console.error('Guardian not found:', error);
          alert('Guardian details not found');
          return;
        }
      } else {
        setSelectedGuardian(guardian);
      }
      
      setShowGuardianModal(true);
    } catch (error) {
      // console.error('Failed to load guardian details:', error);
      alert('Failed to load guardian details');
    }
  };

  // Filter students based on search and filters
  const getFilteredStudents = () => {
    let filtered = [...organizedUsers.students];
    
    // Apply search filter
    if (studentFilters.search) {
      const searchTerm = studentFilters.search.toLowerCase();
      filtered = filtered.filter(student => 
        student.name?.toLowerCase().includes(searchTerm) ||
        student.email?.toLowerCase().includes(searchTerm) ||
        student.id?.toString().includes(searchTerm)
      );
    }
    
    // Apply grade filter
    if (studentFilters.grade) {
      filtered = filtered.filter(student => 
        student.grade === studentFilters.grade
      );
    }
    
    // Apply status filter
    if (studentFilters.status) {
      filtered = filtered.filter(student => 
        (student.status || 'active').toLowerCase() === studentFilters.status.toLowerCase()
      );
    }
    
    return filtered;
  };

  // Get paginated students
  const getPaginatedStudents = () => {
    const filtered = getFilteredStudents();
    const startIndex = (currentStudentPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    return {
      students: filtered.slice(startIndex, endIndex),
      totalStudents: filtered.length,
      totalPages: Math.ceil(filtered.length / studentsPerPage)
    };
  };

  // Handle student filter changes
  const handleStudentFilterChange = (filterKey, value) => {
    setStudentFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
    setCurrentStudentPage(1); // Reset to first page when filtering
  };

  // Clear student filters
  const clearStudentFilters = () => {
    setStudentFilters({
      search: '',
      grade: '',
      status: ''
    });
    setCurrentStudentPage(1);
  };

  // Get unique values for filter options
  const getUniqueFilterOptions = (courses) => {
    if (!Array.isArray(courses)) return { subjects: [], levels: [] };
    
    const subjects = [...new Set(courses.map(c => c.subject).filter(Boolean))];
    const levels = [...new Set(courses.map(c => c.level).filter(Boolean))];
    
    return { subjects, levels };
  };

  const handleRemoveUser = async (userId, userType) => {
    if (!window.confirm(`Are you sure you want to remove this ${userType}?`)) {
      return;
    }

    try {
      if (userType === 'course') {
        // Delete course using hook method
        await deleteCourse(userId);
        alert('Course deleted successfully!');
        
        // Refresh the courses list by refetching data
        if (typeof refetchAdminStats === 'function') {
          await refetchAdminStats();
        }
        
        // Force page refresh to ensure data is updated
        window.location.reload();
      } else {
        // Delete user using API service
        await API.users.deleteUser(userId);
        
        // Refresh both users data and admin stats
        await Promise.all([
          refetchUsers(),
          refetchAdminStats()
        ]);
        
        alert(`${userType.charAt(0).toUpperCase() + userType.slice(1)} deleted successfully!`);
        
        // Clear any selections that included this user
        if (userType === 'tutor') {
          setSelectedTutors(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        } else if (userType === 'student') {
          setSelectedStudents(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        } else if (userType === 'guardian') {
          setSelectedGuardians(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        }
      }
    } catch (error) {
      // console.error(`Error deleting ${userType}:`, error);
      alert(`Failed to delete ${userType}. Please try again.`);
    }
  };

  // Multi-select helper functions
  const handleSelectUser = (userId, userType, isSelected) => {
    const setterMap = {
      'tutor': setSelectedTutors,
      'student': setSelectedStudents,
      'guardian': setSelectedGuardians
    };
    
    const setter = setterMap[userType];
    if (setter) {
      setter(prev => {
        const newSet = new Set(prev);
        if (isSelected) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    }
  };

  const handleSelectAllUsers = (userType, users) => {
    const setterMap = {
      'tutor': setSelectedTutors,
      'student': setSelectedStudents,
      'guardian': setSelectedGuardians
    };
    
    const selectedMap = {
      'tutor': selectedTutors,
      'student': selectedStudents,
      'guardian': selectedGuardians
    };
    
    const setter = setterMap[userType];
    const selected = selectedMap[userType];
    
    if (setter && users) {
      const userIds = users.map(user => user.id);
      const allSelected = userIds.every(id => selected.has(id));
      
      if (allSelected) {
        // Deselect all
        setter(prev => {
          const newSet = new Set(prev);
          userIds.forEach(id => newSet.delete(id));
          return newSet;
        });
      } else {
        // Select all
        setter(prev => {
          const newSet = new Set(prev);
          userIds.forEach(id => newSet.add(id));
          return newSet;
        });
      }
    }
  };

  const clearUserSelection = (userType) => {
    const setterMap = {
      'tutor': setSelectedTutors,
      'student': setSelectedStudents,
      'guardian': setSelectedGuardians
    };
    
    const setter = setterMap[userType];
    if (setter) {
      setter(new Set());
    }
  };

  const handleBulkDelete = async (userType) => {
    const selectedMap = {
      'tutor': selectedTutors,
      'student': selectedStudents,
      'guardian': selectedGuardians
    };
    
    const selected = selectedMap[userType];
    if (selected.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selected.size} ${userType}${selected.size > 1 ? 's' : ''}?`)) {
      return;
    }
    
    try {
      // Delete all selected users in parallel
      const deletePromises = Array.from(selected).map(async (userId) => {
        if (userType === 'course') {
          await deleteCourse(userId);
        } else {
          await API.users.deleteUser(userId);
        }
      });
      
      await Promise.all(deletePromises);
      
      // Refresh data once after all deletions
      await Promise.all([
        refetchUsers(),
        refetchAdminStats()
      ]);
      
      // Clear selections
      clearUserSelection(userType);
      
      // Show single success message
      alert(`Successfully deleted ${selected.size} ${userType}${selected.size > 1 ? 's' : ''}`);
    } catch (error) {
      // console.error(`Error bulk deleting ${userType}s:`, error);
      alert(`Failed to delete some ${userType}s. Please try again.`);
      
      // Still refresh data in case some deletions succeeded
      try {
        await Promise.all([
          refetchUsers(),
          refetchAdminStats()
        ]);
      } catch (refreshError) {
        // console.error('Error refreshing data after failed bulk delete:', refreshError);
      }
    }
  };

  const handleBulkStatusChange = async (userType, newStatus) => {
    const selectedMap = {
      'tutor': selectedTutors,
      'student': selectedStudents,
      'guardian': selectedGuardians
    };
    
    const selected = selectedMap[userType];
    if (selected.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to change status to "${newStatus}" for ${selected.size} ${userType}${selected.size > 1 ? 's' : ''}?`)) {
      return;
    }
    
    try {
      // This would need to be implemented based on your API structure
      // console.log(`Bulk status change for ${userType}s:`, Array.from(selected), 'to status:', newStatus);
      alert(`Status changed to "${newStatus}" for ${selected.size} ${userType}${selected.size > 1 ? 's' : ''}`);
      clearUserSelection(userType);
    } catch (error) {
      // console.error(`Error bulk status change for ${userType}s:`, error);
      alert(`Failed to change status for some ${userType}s. Please try again.`);
    }
  };

  const exportSelectedUsers = (userType) => {
    const selectedMap = {
      'tutor': selectedTutors,
      'student': selectedStudents,
      'guardian': selectedGuardians
    };
    
    const usersMap = {
      'tutor': organizedUsers.tutors,
      'student': organizedUsers.students,
      'guardian': organizedUsers.guardians
    };
    
    const selected = selectedMap[userType];
    const users = usersMap[userType];
    
    if (selected.size === 0) return;
    
    const selectedUsers = users.filter(user => selected.has(user.id));
    const csvContent = convertToCSV(selectedUsers, userType);
    downloadCSV(csvContent, `${userType}s_export.csv`);
    
    alert(`Exported ${selected.size} ${userType}${selected.size > 1 ? 's' : ''} to CSV`);
  };

  const convertToCSV = (users, userType) => {
    if (users.length === 0) return '';
    
    const headers = userType === 'tutor' 
      ? ['ID', 'Name', 'Email', 'Subjects', 'Rating', 'Sessions', 'Earnings', 'Status']
      : userType === 'student'
      ? ['ID', 'Name', 'Email', 'Grade', 'Guardian', 'Status']
      : ['ID', 'Name', 'Email', 'Phone', 'Students', 'Credits', 'Status'];
    
    const rows = users.map(user => {
      if (userType === 'tutor') {
        return [
          user.id,
          user.name,
          user.email,
          (user.subjects || []).join(';'),
          user.rating || 'N/A',
          user.totalSessions || 0,
          user.earnings || 0,
          user.status || 'Active'
        ];
      } else if (userType === 'student') {
        return [
          user.id,
          user.name,
          user.email,
          user.grade,
          user.guardian || '',
          user.status || 'Active'
        ];
      } else {
        return [
          user.id,
          user.name,
          user.email,
          user.phone,
          (user.students || []).join(';'),
          `${user.usedCredits}/${user.totalCredits}`,
          user.status || 'Active'
        ];
      }
    });
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  const handleToggleChatSystem = async () => {
    setChatSettingLoading(true);
    setSettingsError(null);
    
    try {
      const newValue = !chatEnabled;
      // console.log('Toggling chat system to:', newValue);
      
      const response = await API.systemSettings.updateSetting('chat_system_enabled', {
        settingValue: newValue.toString(),
        settingType: 'boolean',
        description: 'Enable/disable the course chat system'
      });
      
      // console.log('Chat toggle response:', response);
      
      if (response.success) {
        setChatEnabled(newValue);
        // Refresh settings to update the display
        await loadSystemSettings();
        
        // Dispatch custom event to notify other components
        // console.log('🚀 AdminPage: Dispatching chat toggle event, enabled:', newValue);
        window.dispatchEvent(new CustomEvent('chatSystemToggled', {
          detail: { enabled: newValue }
        }));
        
        alert(`Chat system ${newValue ? 'enabled' : 'disabled'} successfully!`);
      }
    } catch (error) {
      // console.error('Error toggling chat system:', error);
      setSettingsError(error.message || 'Failed to update chat system setting');
    } finally {
      setChatSettingLoading(false);
    }
  };

  // Fetch system settings when settings section is active
  useEffect(() => {
    if (activeSection === 'system-settings' && systemSettings.length === 0 && !settingsLoading) {
      loadSystemSettings();
    }
  }, [activeSection]);

  const handleUpdateHourlyRate = async (e) => {
    e.preventDefault();
    
    if (!hourlyRate || hourlyRate <= 0) {
      setSettingsError('Hourly rate must be greater than 0');
      return;
    }

    setSettingsLoading(true);
    setSettingsError(null);
    
    try {
      // console.log('Updating hourly rate to:', hourlyRate);
      const response = await API.systemSettings.updateHourlyRate({
        hourlyRate: parseFloat(hourlyRate)
      });
      
      // console.log('Update response:', response);
      
      if (response.success) {
        setEditingSettings(false);
        // Refresh settings
        await loadSystemSettings();
        alert(`Hourly rate updated to £${hourlyRate}/hour successfully!`);
      }
    } catch (error) {
      // console.error('Error updating hourly rate:', error);
      setSettingsError(error.message || 'Failed to update hourly rate');
    } finally {
      setSettingsLoading(false);
    }
  };

  const renderSystemSettings = () => (
    <div className="settings-section">
      <div className="settings-header">
        <h2>System Settings</h2>
        <p>Configure platform-wide settings and parameters</p>
      </div>

      <div className="settings-content">
        <div className="settings-card">
          <div className="setting-header">
            <div className="setting-icon">💰</div>
            <div className="setting-info">
              <h3>Hourly Rate Configuration</h3>
              <p>Set the platform hourly rate for tutor earnings calculations</p>
            </div>
            <button
              className="edit-setting-btn"
              onClick={() => setEditingSettings(!editingSettings)}
              disabled={settingsLoading}
            >
              {editingSettings ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="setting-content">
            {editingSettings ? (
              <form onSubmit={handleUpdateHourlyRate} className="hourly-rate-form">
                <div className="form-group">
                  <label htmlFor="hourlyRate">Hourly Rate (£)</label>
                  <div className="currency-input">
                    <span className="currency-symbol">£</span>
                    <input
                      type="number"
                      id="hourlyRate"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="21.00"
                      required
                    />
                  </div>
                  <small className="form-help">
                    This rate will be used for all tutor earnings calculations across the platform.
                  </small>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="save-btn"
                    disabled={settingsLoading}
                  >
                    {settingsLoading ? '⏳ Saving...' : '💾 Save Changes'}
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setEditingSettings(false)}
                    disabled={settingsLoading}
                  >
                    Cancel
                  </button>
                </div>

                {settingsError && (
                  <div className="error-message">
                    ❌ {settingsError}
                  </div>
                )}
              </form>
            ) : (
              <div className="setting-display">
                <div className="current-rate">
                  <span className="rate-label">Current Rate:</span>
                  <span className="rate-value">£{(hourlyRate || 21).toFixed(2)}/hour</span>
                </div>
                <div className="setting-description">
                  <p>This rate is currently being used for all tutor earnings calculations.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {settingsLoading && (
          <div className="loading-message">
            <span className="loading-spinner">⏳</span>
            Loading system settings...
          </div>
        )}

        {/* Chat System Setting */}
        <div className="settings-card">
          <div className="setting-header">
            <div className="setting-icon">💬</div>
            <div className="setting-info">
              <h3>Course Chat System</h3>
              <p>Enable or disable real-time chat between students and tutors in courses</p>
            </div>
            <div className="toggle-container">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={chatEnabled}
                  onChange={handleToggleChatSystem}
                  disabled={chatSettingLoading}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">
                {chatEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
          <div className="setting-content">
            <div className="setting-description">
              {chatEnabled 
                ? '✅ Students can chat with tutors in course pages, tutors can access chats in their dashboard, and you can monitor all conversations.'
                : '❌ Chat functionality is disabled system-wide. Users will not see chat options.'
              }
            </div>
            {chatSettingLoading && (
              <div className="loading-indicator">
                <span className="loading-spinner">⏳</span>
                Updating chat system...
              </div>
            )}
          </div>
        </div>

        {systemSettings && systemSettings.length > 0 && (
          <div className="all-settings-card">
            <h3>All System Settings</h3>
            <div className="settings-list">
              {systemSettings.map((setting, index) => (
                <div key={setting.id || index} className="setting-item">
                  <div className="setting-key">{setting.settingKey}</div>
                  <div className="setting-value">
                    {setting.settingType === 'float' || setting.settingType === 'int'
                      ? `${setting.settingValue}${setting.settingKey.includes('rate') ? '/hour' : ''}`
                      : setting.settingValue
                    }
                  </div>
                  <div className="setting-description">{setting.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="dashboard-section">
      <h2>Admin Dashboard Overview</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <h3>{adminData.stats.totalCourses}</h3>
            <p>Total Courses</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📖</div>
          <div className="stat-info">
            <h3>{adminData.stats.totalModules}</h3>
            <p>Total Modules</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👨‍🎓</div>
          <div className="stat-info">
            <h3>{adminData.stats.totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-info">
            <h3>{adminData.stats.totalTutors}</h3>
            <p>Total Tutors</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👨‍👩‍👧‍👦</div>
          <div className="stat-info">
            <h3>{adminData.stats.totalGuardians}</h3>
            <p>Total Guardians</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>£{(adminData.stats?.totalRevenue || 0).toFixed(2)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-info">
            <h3>{adminData.stats.activeEnrollments}</h3>
            <p>Active Enrollments</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>{adminData.stats.pendingPayments}</h3>
            <p>Pending Payments</p>
          </div>
        </div>
      </div>

      <div className="quick-actions-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions-grid">
          <div className="action-card" onClick={() => openModal('createCourse')}>
            <div className="action-icon">➕</div>
            <div className="action-info">
              <h4>Create Course</h4>
              <p>Add new course</p>
            </div>
          </div>
          <div className="action-card" onClick={() => openModal('createModule')}>
            <div className="action-icon">📚</div>
            <div className="action-info">
              <h4>Create Module</h4>
              <p>Add course module</p>
            </div>
          </div>
          <div className="action-card" onClick={() => openModal('createQuiz')}>
            <div className="action-icon">📝</div>
            <div className="action-info">
              <h4>Create Quiz</h4>
              <p>Add new assessment</p>
            </div>
          </div>
          <div className="action-card" onClick={() => setActiveSection('courses')}>
            <div className="action-icon">🎓</div>
            <div className="action-info">
              <h4>Manage Courses</h4>
              <p>View & edit courses</p>
            </div>
          </div>
          <div className="action-card" onClick={() => setActiveSection('users')}>
            <div className="action-icon">👥</div>
            <div className="action-info">
              <h4>Manage Users</h4>
              <p>View & edit users</p>
            </div>
          </div>
          <div className="action-card" onClick={() => setActiveSection('ai-prompts')}>
            <div className="action-icon">🤖</div>
            <div className="action-info">
              <h4>AI Prompts</h4>
              <p>Manage AI templates</p>
            </div>
          </div>
          <div className="action-card" onClick={() => setActiveSection('environment')}>
            <div className="action-icon">🔧</div>
            <div className="action-info">
              <h4>Environment</h4>
              <p>Manage environment variables</p>
            </div>
          </div>
          <div className="action-card" onClick={() => setActiveSection('system-settings')}>
            <div className="action-icon">⚙️</div>
            <div className="action-info">
              <h4>System Settings</h4>
              <p>Configure hourly rates & platform settings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCourses = () => {
    const filteredCourses = filterCourses(courses);
    const filterOptions = getUniqueFilterOptions(courses);
    
    return (
      <div className="courses-section">
        <div className="section-header">
          <h3>Course Management ({filteredCourses.length} of {courses?.length || 0} courses)</h3>
          <button className="create-btn" onClick={() => openModal('createCourse')}>
            ➕ Create New Course
          </button>
        </div>

        {/* Filter Controls */}
        <div className="filter-controls">
          <div className="filter-header">
            <h4>🔍 Filter Courses</h4>
            <span className="filter-count">
              {filteredCourses.length !== courses?.length && 
                `${filteredCourses.length} of ${courses?.length || 0} courses`
              }
            </span>
          </div>
          <div className="filter-row">
            {/* Search Filter */}
            <div className="filter-group">
              <label>Search:</label>
              <input
                type="text"
                placeholder="Search courses..."
                value={courseFilters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="filter-input"
              />
            </div>

            {/* Subject Filter */}
            <div className="filter-group">
              <label>Subject:</label>
              <select
                value={courseFilters.subject}
                onChange={(e) => handleFilterChange('subject', e.target.value)}
                className="filter-select"
              >
                <option value="">All Subjects</option>
                {filterOptions.subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            {/* Grade Level Filter */}
            <div className="filter-group">
              <label>Grade Level:</label>
              <select
                value={courseFilters.gradeLevel}
                onChange={(e) => handleFilterChange('gradeLevel', e.target.value)}
                className="filter-select"
              >
                <option value="">All Grade Levels</option>
                <option value="Year 1">Year 1</option>
                <option value="Year 2">Year 2</option>
                <option value="Year 3">Year 3</option>
                <option value="Year 4">Year 4</option>
                <option value="Year 5">Year 5</option>
                <option value="Year 6">Year 6</option>
                <option value="Year 7">Year 7</option>
                <option value="Year 8">Year 8</option>
                <option value="Year 9">Year 9</option>
                <option value="Year 10">Year 10</option>
                <option value="Year 11">Year 11</option>
                <option value="Year 12">Year 12</option>
                <option value="Year 13">Year 13</option>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>

            {/* Price Range Filter */}
            <div className="filter-group">
              <label>Price:</label>
              <select
                value={courseFilters.priceRange}
                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                className="filter-select"
              >
                <option value="">All Prices</option>
                <option value="free">Free</option>
                <option value="under50">Under £50</option>
                <option value="50to200">£50 - £200</option>
                <option value="over200">Over £200</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="filter-group">
              <label>Status:</label>
              <select
                value={courseFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="filter-group">
              <button 
                className="btn secondary clear-filters-btn"
                onClick={clearFilters}
                disabled={!Object.values(courseFilters).some(filter => filter !== '')}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Courses List */}
        <div className="courses-list">
          {coursesLoading ? (
            <div className="loading-message">Loading courses...</div>
          ) : filteredCourses.length === 0 ? (
            <div className="empty-message">
              {courses && courses.length > 0 ? (
                <>
                  <p>No courses match your current filters.</p>
                  <button className="btn secondary" onClick={clearFilters}>
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <p>No courses found.</p>
                  <button className="btn primary" onClick={() => openModal('createCourse')}>
                    Create Your First Course
                  </button>
                </>
              )}
            </div>
          ) : (
            filteredCourses.map(course => (
          <div 
            key={course.id} 
            className="course-card clickable-card"
            onClick={() => navigate(`/course-detail?courseId=${course.id}`)}
          >
            <div className="course-header">
              <h4>{course.title}</h4>
              <span className={`status-badge ${(course.status || 'active').toLowerCase()}`}>
                {course.status || 'Active'}
              </span>
            </div>
            <p className="course-description">
              {course.description || 'No description available'}
            </p>
            
            <div className="course-details">
              <div className="detail-item">
                <span className="label">Course ID:</span>
                <span className="value">{course.id}</span>
              </div>
              
              {course.subject && (
                <div className="detail-item">
                  <span className="label">Subject:</span>
                  <span className="value">{course.subject}</span>
                </div>
              )}
              
              {course.gradeLevel && (
                <div className="detail-item">
                  <span className="label">Grade Level:</span>
                  <span className="value">{course.gradeLevel}</span>
                </div>
              )}
              
              <div className="detail-item">
                <span className="label">Price:</span>
                <span className="value">{formatCurrencyForDisplay(course.price || 0, course.currency || 'GBP')}</span>
              </div>
              
              {course.duration && (
                <div className="detail-item">
                  <span className="label">Duration:</span>
                  <span className="value">{course.duration}</span>
                </div>
              )}

              <div className="detail-item">
                <span className="label">Assigned Tutors:</span>
                <div className="value">
                  {course.assignedTutors && course.assignedTutors.length > 0 ? (
                    <div className="tutors-display">
                      {course.assignedTutors.length <= 3 ? (
                        // Show all tutors if 3 or fewer
                        <span>{course.assignedTutors.join(', ')}</span>
                      ) : (
                        // Show collapsible display for more than 3 tutors
                        <div>
                          {expandedCourseTutors.has(course.id) ? (
                            // Expanded state - show all tutors in a list
                            <div className="expanded-tutors">
                              <ul className="tutors-list">
                                {course.assignedTutors.map((tutor, index) => (
                                  <li key={index}>{tutor}</li>
                                ))}
                              </ul>
                              <button
                                className="expand-toggle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCourseTutorsExpanded(course.id);
                                }}
                              >
                                Show less
                              </button>
                            </div>
                          ) : (
                            // Collapsed state - show first 3 + more link
                            <div className="collapsed-tutors">
                              <span>{course.assignedTutors.slice(0, 3).join(', ')}</span>
                              <button
                                className="expand-toggle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCourseTutorsExpanded(course.id);
                                }}
                              >
                                ... +{course.assignedTutors.length - 3} more
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>No tutors assigned</span>
                  )}
                </div>
              </div>

              {(course.created_at || course.createdAt) && (
                <div className="detail-item">
                  <span className="label">Created:</span>
                  <span className="value">
                    {new Date(course.created_at || course.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            
            {course.learning_outcomes && course.learning_outcomes.length > 0 && (
              <div className="learning-outcomes">
                <span className="label">Learning Outcomes:</span>
                <ul className="outcomes-list">
                  {course.learning_outcomes.slice(0, 3).map((outcome, index) => (
                    <li key={index}>{outcome}</li>
                  ))}
                  {course.learning_outcomes.length > 3 && (
                    <li>... and {course.learning_outcomes.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
            <div className="course-actions">
              <button 
                className="btn-sm primary" 
                onClick={(e) => {
                  e.stopPropagation();
                  openModal('editCourse', course);
                }}
              >
                Edit
              </button>
              <button 
                className="btn-sm secondary" 
                onClick={(e) => {
                  e.stopPropagation();
                  openModal('assignTutor', course);
                }}
              >
                Assign Tutor
              </button>
              <button 
                className="btn-sm secondary" 
                onClick={(e) => {
                  e.stopPropagation();
                  openModal('createModule', course);
                }}
              >
                Add Module
              </button>
              <button 
                className="btn-sm danger" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveUser(course.id, 'course');
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))
          )}
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div className="users-section">
      <h3>User Management</h3>
      
      <div className="user-tabs">
        <button className="tab-btn active" onClick={() => {}}>
          Tutors ({adminData.tutors.length})
        </button>
        <button className="tab-btn" onClick={() => {}}>
          Students ({adminData.students.length})
        </button>
        <button className="tab-btn" onClick={() => {}}>
          Guardians ({adminData.guardians.length})
        </button>
      </div>

      {/* Tutors Table */}
      <div className="users-table">
        <div className="table-header">
          <h4>Tutors ({adminData.tutors.length})</h4>
          <div className="header-actions">
            <button 
              className="btn-sm refresh"
              onClick={() => refetchUsers()}
              title="Refresh tutors data"
              disabled={usersLoading}
            >
              {usersLoading ? '⏳' : '🔄'} Refresh
            </button>
          </div>
          {selectedTutors.size > 0 && (
            <div className="bulk-actions">
              <span className="selection-count">{selectedTutors.size} selected</span>
              <button 
                className="btn-sm danger"
                onClick={() => handleBulkDelete('tutor')}
              >
                Delete Selected
              </button>
              <button 
                className="btn-sm secondary"
                onClick={() => handleBulkStatusChange('tutor', 'inactive')}
              >
                Set Inactive
              </button>
              <button 
                className="btn-sm secondary"
                onClick={() => handleBulkStatusChange('tutor', 'active')}
              >
                Set Active
              </button>
              <button 
                className="btn-sm primary"
                onClick={() => exportSelectedUsers('tutor')}
              >
                Export CSV
              </button>
              <button 
                className="btn-sm secondary"
                onClick={() => clearUserSelection('tutor')}
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={adminData.tutors.length > 0 && adminData.tutors.every(tutor => selectedTutors.has(tutor.id))}
                  onChange={() => handleSelectAllUsers('tutor', adminData.tutors)}
                  title="Select all tutors"
                />
              </th>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Subjects</th>
              <th>Rating</th>
              <th>Sessions</th>
              <th>Earnings</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {adminData.tutors.map(tutor => (
              <tr key={tutor.id} className={selectedTutors.has(tutor.id) ? 'selected-row' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedTutors.has(tutor.id)}
                    onChange={(e) => handleSelectUser(tutor.id, 'tutor', e.target.checked)}
                  />
                </td>
                <td>{tutor.id}</td>
                <td>{tutor.name}</td>
                <td>{tutor.email}</td>
                <td>{(tutor.subjects || []).join(', ')}</td>
                <td>⭐ {tutor.rating || 'N/A'}</td>
                <td>{tutor.totalSessions || 0}</td>
                <td>{formatCurrencyForDisplay(tutor.earnings || 0, tutor.currency || 'GBP')}</td>
                <td>
                  <span className={`status-badge ${(tutor.status || 'active').toLowerCase()}`}>
                    {tutor.status || 'Active'}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button 
                      className="btn-icon view" 
                      onClick={() => openModal('viewProfile', tutor)}
                      title="View Profile"
                    >
                      👁️
                    </button>
                    <button 
                      className="btn-icon edit" 
                      onClick={() => openModal('editUser', tutor)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-icon password-reset" 
                      onClick={() => handlePasswordReset(tutor)}
                      title="Reset Password"
                    >
                      🔑
                    </button>
                    <button 
                      className="btn-icon delete" 
                      onClick={() => handleRemoveUser(tutor.id, 'tutor')}
                      title="Remove"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Students Table with Enhanced Features */}
      <div className="users-table enhanced-student-table">
        <div className="table-header">
          <h4>Students ({getPaginatedStudents().totalStudents})</h4>
          <div className="header-actions">
            {selectedStudents.size > 0 && (
              <div className="bulk-actions">
                <span className="selection-count">{selectedStudents.size} selected</span>
                <button 
                  className="btn-sm danger"
                  onClick={() => handleBulkDelete('student')}
                >
                  Delete Selected
                </button>
                <button 
                  className="btn-sm secondary"
                  onClick={() => handleBulkStatusChange('student', 'inactive')}
                >
                  Set Inactive
                </button>
                <button 
                  className="btn-sm secondary"
                  onClick={() => handleBulkStatusChange('student', 'active')}
                >
                  Set Active
                </button>
                <button 
                  className="btn-sm primary"
                  onClick={() => exportSelectedUsers('student')}
                >
                  Export CSV
                </button>
                <button 
                  className="btn-sm secondary"
                  onClick={() => clearUserSelection('student')}
                >
                  Clear Selection
                </button>
              </div>
            )}
            <button 
              className="refresh-btn" 
              onClick={loadAllEnrollmentData}
              disabled={enrollmentLoading}
              title="Refresh enrollment data"
            >
              {enrollmentLoading ? '⟳' : '🔄'} Refresh
            </button>
          </div>
        </div>
        
        {/* Student Filters */}
        <div className="student-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>Search:</label>
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={studentFilters.search}
                onChange={(e) => handleStudentFilterChange('search', e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label>Grade:</label>
              <select
                value={studentFilters.grade}
                onChange={(e) => handleStudentFilterChange('grade', e.target.value)}
                className="filter-select"
              >
                <option value="">All Grades</option>
                {[...new Set(organizedUsers.students.map(s => s.grade).filter(Boolean))].map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Status:</label>
              <select
                value={studentFilters.status}
                onChange={(e) => handleStudentFilterChange('status', e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <button 
              className="btn secondary clear-filters-btn"
              onClick={clearStudentFilters}
              disabled={!Object.values(studentFilters).some(filter => filter !== '')}
            >
              Clear Filters
            </button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={getPaginatedStudents().students.length > 0 && getPaginatedStudents().students.every(student => selectedStudents.has(student.id))}
                  onChange={() => handleSelectAllUsers('student', getPaginatedStudents().students)}
                  title="Select all students on current page"
                />
              </th>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Grade</th>
              <th>Enrolled Courses</th>
              <th>Guardian</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getPaginatedStudents().students.map(student => {
              const studentEnrollmentList = studentEnrollments[student.id] || [];
              const isExpanded = expandedStudents.has(student.id);
              
              return (
                <tr key={student.id} className={selectedStudents.has(student.id) ? 'selected-row' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.id)}
                      onChange={(e) => handleSelectUser(student.id, 'student', e.target.checked)}
                    />
                  </td>
                  <td>{student.id}</td>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>{student.grade}</td>
                  <td>
                    <div className="enrolled-courses-cell">
                      {studentEnrollmentList.length > 0 ? (
                        <>
                          <div className="courses-summary">
                            <span className="course-count">{studentEnrollmentList.length} course{studentEnrollmentList.length !== 1 ? 's' : ''}</span>
                            <button 
                              className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
                              onClick={() => toggleStudentExpanded(student.id)}
                              title={isExpanded ? 'Collapse courses' : 'Expand courses'}
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          </div>
                          {isExpanded && (
                            <div className="expanded-courses">
                              {studentEnrollmentList.map((enrollment, index) => (
                                <div key={enrollment.id || index} className="course-item">
                                  <div className="course-info">
                                    <span className="course-title">{enrollment.course.title}</span>
                                    <span className="course-subject">({enrollment.course.subject})</span>
                                  </div>
                                  <div className="course-meta">
                                    <span className="progress">{enrollment.progress || 0}% complete</span>
                                    <span className={`course-status ${enrollment.status}`}>{enrollment.status}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="no-courses">No enrollments</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {student.guardian ? (
                      <button 
                        className="guardian-link"
                        onClick={() => handleGuardianClick(student.guardian)}
                        title="View guardian details"
                      >
                        {student.guardian}
                      </button>
                    ) : (
                      <span className="no-guardian">No guardian</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${(student.status || 'active').toLowerCase()}`}>
                      {student.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button 
                        className="btn-icon view" 
                        onClick={() => openModal('viewProfile', student)}
                        title="View Profile"
                      >
                        👁️
                      </button>
                      <button 
                        className="btn-icon edit" 
                        onClick={() => openModal('editUser', student)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon password-reset" 
                        onClick={() => handlePasswordReset(student)}
                        title="Reset Password"
                      >
                        🔑
                      </button>
                      <button 
                        className="btn-icon delete" 
                        onClick={() => handleRemoveUser(student.id, 'student')}
                        title="Remove"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {getPaginatedStudents().totalPages > 1 && (
          <div className="pagination-controls">
            <div className="pagination-info">
              Showing {((currentStudentPage - 1) * studentsPerPage) + 1} to {Math.min(currentStudentPage * studentsPerPage, getPaginatedStudents().totalStudents)} of {getPaginatedStudents().totalStudents} students
            </div>
            <div className="pagination-buttons">
              <button 
                className="pagination-btn"
                onClick={() => setCurrentStudentPage(1)}
                disabled={currentStudentPage === 1}
              >
                First
              </button>
              <button 
                className="pagination-btn"
                onClick={() => setCurrentStudentPage(prev => Math.max(1, prev - 1))}
                disabled={currentStudentPage === 1}
              >
                Previous
              </button>
              <span className="page-info">
                Page {currentStudentPage} of {getPaginatedStudents().totalPages}
              </span>
              <button 
                className="pagination-btn"
                onClick={() => setCurrentStudentPage(prev => Math.min(getPaginatedStudents().totalPages, prev + 1))}
                disabled={currentStudentPage === getPaginatedStudents().totalPages}
              >
                Next
              </button>
              <button 
                className="pagination-btn"
                onClick={() => setCurrentStudentPage(getPaginatedStudents().totalPages)}
                disabled={currentStudentPage === getPaginatedStudents().totalPages}
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guardians Table */}
      <div className="users-table">
        <div className="table-header">
          <h4>Guardians ({adminData.guardians.length})</h4>
          {selectedGuardians.size > 0 && (
            <div className="bulk-actions">
              <span className="selection-count">{selectedGuardians.size} selected</span>
              <button 
                className="btn-sm danger"
                onClick={() => handleBulkDelete('guardian')}
              >
                Delete Selected
              </button>
              <button 
                className="btn-sm secondary"
                onClick={() => handleBulkStatusChange('guardian', 'inactive')}
              >
                Set Inactive
              </button>
              <button 
                className="btn-sm secondary"
                onClick={() => handleBulkStatusChange('guardian', 'active')}
              >
                Set Active
              </button>
              <button 
                className="btn-sm primary"
                onClick={() => exportSelectedUsers('guardian')}
              >
                Export CSV
              </button>
              <button 
                className="btn-sm secondary"
                onClick={() => clearUserSelection('guardian')}
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={adminData.guardians.length > 0 && adminData.guardians.every(guardian => selectedGuardians.has(guardian.id))}
                  onChange={() => handleSelectAllUsers('guardian', adminData.guardians)}
                  title="Select all guardians"
                />
              </th>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Students</th>
              <th>Credits</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {adminData.guardians.map(guardian => (
              <tr key={guardian.id} className={selectedGuardians.has(guardian.id) ? 'selected-row' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedGuardians.has(guardian.id)}
                    onChange={(e) => handleSelectUser(guardian.id, 'guardian', e.target.checked)}
                  />
                </td>
                <td>{guardian.id}</td>
                <td>{guardian.name}</td>
                <td>{guardian.email}</td>
                <td>{guardian.phone}</td>
                <td>{(guardian.students || []).join(', ')}</td>
                <td>{guardian.usedCredits}/{guardian.totalCredits}</td>
                <td>
                  <span className={`status-badge ${(guardian.status || 'active').toLowerCase()}`}>
                    {guardian.status || 'Active'}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button 
                      className="btn-icon view" 
                      onClick={() => openModal('viewProfile', guardian)}
                      title="View Profile"
                    >
                      👁️
                    </button>
                    <button 
                      className="btn-icon edit" 
                      onClick={() => openModal('editUser', guardian)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-icon add-credits" 
                      onClick={() => openCreditModal(guardian)}
                      title="Add Credits"
                    >
                      💰
                    </button>
                    <button 
                      className="btn-icon password-reset" 
                      onClick={() => handlePasswordReset(guardian)}
                      title="Reset Password"
                    >
                      🔑
                    </button>
                    <button 
                      className="btn-icon delete" 
                      onClick={() => handleRemoveUser(guardian.id, 'guardian')}
                      title="Remove"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderInvoices = () => (
    <div className="invoices-section">
      <div className="section-header">
        <h3>Payment Invoices</h3>
        <div className="invoice-filters">
          <select className="filter-select">
            <option>All Status</option>
            <option>Paid</option>
            <option>Pending</option>
            <option>Overdue</option>
          </select>
          <input type="date" className="filter-date" placeholder="From Date" />
          <input type="date" className="filter-date" placeholder="To Date" />
        </div>
      </div>

      <div className="invoices-table">
        <table>
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Guardian</th>
              <th>Student</th>
              <th>Course</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Payment Method</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {adminData.invoices.map(invoice => (
              <tr key={invoice.id}>
                <td>{invoice.id}</td>
                <td>{invoice.guardianName}</td>
                <td>{invoice.studentName}</td>
                <td>{invoice.course}</td>
                <td>{formatCurrencyForDisplay(invoice.amount || 0, invoice.currency || 'GBP')}</td>
                <td>{invoice.date}</td>
                <td>{invoice.paymentMethod}</td>
                <td>
                  <span className={`status-badge ${(invoice.status || 'pending').toLowerCase()}`}>
                    {invoice.status || 'Pending'}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button 
                      className="btn-icon view" 
                      onClick={() => openModal('viewInvoice', invoice)}
                      title="View Invoice"
                    >
                      📄
                    </button>
                    <button 
                      className="btn-icon download" 
                      title="Download PDF"
                    >
                      ⬇️
                    </button>
                    {invoice.status === 'Pending' && (
                      <button 
                        className="btn-icon remind" 
                        title="Send Reminder"
                      >
                        📧
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="invoice-summary">
        <div className="summary-card">
          <h4>Total Revenue</h4>
          <p className="amount">£{(adminData.stats?.totalRevenue || 0).toFixed(2)}</p>
        </div>
        <div className="summary-card">
          <h4>Pending Payments</h4>
          <p className="amount pending">£{((adminData.stats?.pendingPayments || 0) * 299.99).toFixed(2)}</p>
        </div>
        <div className="summary-card">
          <h4>This Month</h4>
          <p className="amount">£{((adminData.stats?.totalRevenue || 0) * 0.15).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );

  const renderTutors = () => (
    <div className="tutors-section">
      <div className="section-header">
        <h2>Tutor Management</h2>
        <div className="section-stats">
          <span className="stat">
            Verified: {tutors.filter(t => t.isVerified).length}
          </span>
          <span className="stat">
            Unverified: {tutors.filter(t => !t.isVerified).length}
          </span>
          <span className="stat">
            Total: {tutors.length}
          </span>
        </div>
      </div>

      {/* Tutor Filter Dropdown */}
      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="tutor-filter" className="filter-label">Filter by Tutor:</label>
          <select 
            id="tutor-filter"
            className="filter-dropdown"
            value={selectedTutorFilter} 
            onChange={(e) => setSelectedTutorFilter(e.target.value)}
          >
            <option value="all">All Tutors (Aggregated)</option>
            <optgroup label="─────────────────────">
              {allTutorsForFilter
                .sort((a, b) => {
                  // Sort verified tutors first, then by name
                  if (a.isVerified !== b.isVerified) {
                    return b.isVerified - a.isVerified;
                  }
                  return (a.name || a.email).localeCompare(b.name || b.email);
                })
                .map(tutor => (
                  <option key={tutor.id} value={tutor.id}>
                    {tutor.name || tutor.email}
                    {tutor.isVerified ? ' ✅' : ' ⚠️'}
                    {tutorAvailabilityData[tutor.id]?.totalSlots > 0 ? ` (${tutorAvailabilityData[tutor.id].totalSlots} slots)` : ' (No availability)'}
                  </option>
                ))
              }
            </optgroup>
          </select>
          <div className="filter-info">
            Showing {getFilteredTutors().length} of {allTutorsForFilter.length} tutor{getFilteredTutors().length !== 1 ? 's' : ''}
            {selectedTutorFilter !== 'all' && (
              <button 
                className="clear-filter-btn"
                onClick={() => setSelectedTutorFilter('all')}
                title="Clear filter"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="availability-stats">
        <div className="stat-card total-slots">
          <div className="stat-header">
            <div className="stat-icon">📊</div>
            <h3>Total Slots</h3>
          </div>
          <div className="stat-value">{getFilteredTutorStats().totalSlots || 0}</div>
          <div className="stat-trend">
            Active time slots
          </div>
        </div>
        
        <div className="stat-card utilization">
          <div className="stat-header">
            <div className="stat-icon">📈</div>
            <h3>Utilization</h3>
          </div>
          <div className="stat-value">
            {getFilteredTutorStats().utilizationRate || 0}%
          </div>
          <div className="stat-trend">
            {getFilteredTutorStats().bookedSlots || 0}/{getFilteredTutorStats().totalSlots || 0} booked
          </div>
        </div>
        
        <div className="stat-card weekly-hours">
          <div className="stat-header">
            <div className="stat-icon">⏰</div>
            <h3>This Week</h3>
          </div>
          <div className="stat-value">{getFilteredTutorStats().weeklyHours || 0}h</div>
          <div className="stat-trend">Available hours</div>
        </div>
        
        <div className="stat-card earnings">
          <div className="stat-header">
            <div className="stat-icon">💰</div>
            <h3>Potential</h3>
          </div>
          <div className="stat-value">£{(getFilteredTutorStats().estimatedWeeklyEarnings || 0).toFixed(2)}</div>
          <div className="stat-trend">Weekly estimate</div>
        </div>
        
        <div className="stat-card completion-rate">
          <div className="stat-header">
            <div className="stat-icon">✅</div>
            <h3>Completion</h3>
          </div>
          <div className="stat-value">{getFilteredTutorStats().completionRate || 0}%</div>
          <div className="stat-trend">Session success</div>
        </div>
        
        <div className="stat-card peak-time">
          <div className="stat-header">
            <div className="stat-icon">🕐</div>
            <h3>Peak Time</h3>
          </div>
          <div className="stat-value">
            {getFilteredTutorStats().peakPeriod === 'morning' && '🌅'}
            {getFilteredTutorStats().peakPeriod === 'afternoon' && '☀️'}
            {getFilteredTutorStats().peakPeriod === 'evening' && '🌙'}
            {getFilteredTutorStats().peakPeriod || 'N/A'}
          </div>
          <div className="stat-trend">Most active</div>
        </div>
        
        {getFilteredTutorStats().conflicts > 0 && (
          <div className="stat-card conflicts-card">
            <div className="stat-header">
              <div className="stat-icon warning">⚠️</div>
              <h3>Conflicts</h3>
            </div>
            <div className="stat-value conflict">{getFilteredTutorStats().conflicts}</div>
            <div className="stat-trend">Need attention</div>
          </div>
        )}
      </div>

      {/* Enhanced Insights Panel */}
      {(getFilteredTutorStats().totalSlots > 0) && (
        <div className="availability-insights">
          <h3 className="insights-title">
            📈 {selectedTutorFilter === 'all' ? 'Tutor Availability Insights' : `Insights for ${getFilteredInsightsData().tutorName}`}
          </h3>
          <div className="insights-grid">
            <div className="insight-item">
              <div className="insight-icon">👥</div>
              <div className="insight-content">
                <h4>{selectedTutorFilter === 'all' ? 'Active Tutors' : 'Tutor Status'}</h4>
                <p>
                  {selectedTutorFilter === 'all' 
                    ? `${getFilteredInsightsData().activeTutors} with availability`
                    : `${getFilteredInsightsData().activeTutors > 0 ? 'Active' : 'Inactive'} tutor`
                  }
                </p>
              </div>
            </div>
            
            <div className="insight-item">
              <div className="insight-icon">📚</div>
              <div className="insight-content">
                <h4>Course Variety</h4>
                <p>{getFilteredInsightsData().courseTypes} different course{getFilteredInsightsData().courseTypes !== 1 ? 's' : ''}</p>
              </div>
            </div>
            
            <div className="insight-item">
              <div className="insight-icon">📅</div>
              <div className="insight-content">
                <h4>Most Active Day</h4>
                <p>{getFilteredInsightsData().mostActiveDay || 'N/A'}</p>
              </div>
            </div>
            
            <div className="insight-item">
              <div className="insight-icon">✅</div>
              <div className="insight-content">
                <h4>{selectedTutorFilter === 'all' ? 'Verified Tutors' : 'Verification Status'}</h4>
                <p>
                  {selectedTutorFilter === 'all'
                    ? `${getFilteredInsightsData().verifiedTutors}/${getFilteredInsightsData().totalTutors} verified`
                    : `${getFilteredInsightsData().verifiedTutors > 0 ? 'Verified ✅' : 'Not Verified ⚠️'}`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tutorsLoading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading tutors...</p>
        </div>
      ) : (
        <div className="tutors-grid">
          {getFilteredTutors().map(tutor => (
            <div key={tutor.id} className={`tutor-card ${selectedTutorFilter === tutor.id ? 'highlighted' : ''}`}>
              <div className="tutor-header">
                <div className="tutor-info">
                  <h3>{tutor.name || tutor.email}</h3>
                  <p className="tutor-email">{tutor.email}</p>
                  <div className="tutor-details">
                    <span className="detail">
                      <strong>Subjects:</strong> {(tutor.subjects || []).join(', ') || 'None'}
                    </span>
                    <span className="detail">
                      <strong>Grade Level:</strong> {tutor.tutorGradeLevel || 'Not specified'}
                    </span>
                    <span className="detail">
                      <strong>Registered:</strong> {new Date(tutor.createdAt).toLocaleDateString()}
                    </span>
                    <span className="detail">
                      <strong>Last Login:</strong> {tutor.lastLogin ? new Date(tutor.lastLogin).toLocaleDateString() : 'Never'}
                    </span>
                    {tutorAvailabilityData[tutor.id] && (
                      <>
                        <span className="detail">
                          <strong>Total Slots:</strong> {tutorAvailabilityData[tutor.id].totalSlots || 0}
                        </span>
                        <span className="detail">
                          <strong>Utilization:</strong> {tutorAvailabilityData[tutor.id].utilizationRate || 0}%
                        </span>
                        <span className="detail">
                          <strong>Weekly Hours:</strong> {tutorAvailabilityData[tutor.id].weeklyHours || 0}h
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="verification-status">
                  {tutor.isVerified ? (
                    <span className="status verified">✅ Verified</span>
                  ) : (
                    <span className="status unverified">⚠️ Unverified</span>
                  )}
                </div>
              </div>
              
              <div className="tutor-actions">
                {tutor.isVerified ? (
                  <button 
                    className="action-btn danger"
                    onClick={() => handleTutorVerification(tutor, 'unverify')}
                  >
                    Unverify Tutor
                  </button>
                ) : (
                  <button 
                    className="action-btn primary"
                    onClick={() => handleTutorVerification(tutor, 'verify')}
                  >
                    Verify Tutor
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {getFilteredTutors().length === 0 && !tutorsLoading && tutors.length > 0 && (
        <div className="empty-state">
          <p>No tutors match the current filter.</p>
        </div>
      )}
      
      {tutors.length === 0 && !tutorsLoading && (
        <div className="empty-state">
          <p>No tutors found in the system.</p>
        </div>
      )}
    </div>
  );

  const renderModal = () => {
    if (!showModal) return null;

    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>
              {modalType === 'createCourse' && 'Create New Course'}
              {modalType === 'editCourse' && 'Edit Course'}
              {modalType === 'createModule' && 'Create New Module'}
              {modalType === 'createQuiz' && 'Create New Quiz'}
              {modalType === 'assignTutor' && 'Assign Tutor to Course'}
              {modalType === 'viewProfile' && 'View Profile'}
              {modalType === 'editUser' && 'Edit User'}
              {modalType === 'viewInvoice' && 'Invoice Details'}
              {modalType === 'createPlan' && 'Create New Pricing Plan'}
              {modalType === 'editPlan' && 'Edit Pricing Plan'}
              {modalType === 'createPrompt' && 'Create New AI Prompt'}
              {modalType === 'editPrompt' && 'Edit AI Prompt'}
              {modalType === 'viewPrompt' && 'View AI Prompt'}
            </h3>
            <button className="close-modal" onClick={closeModal}>×</button>
          </div>

          <div className="modal-body">
            {modalType === 'createCourse' && (
              <form className="modal-form" onSubmit={handleCourseFormSubmit}>
                {/* Title Field */}
                <div className="form-group">
                  <label>Course Title *</label>
                  <input 
                    type="text" 
                    name="title"
                    value={courseFormData.title}
                    onChange={handleCourseFormChange}
                    placeholder="Enter course title"
                    className={formErrors.title ? 'error' : ''}
                    disabled={isSubmitting}
                  />
                  {formErrors.title && (
                    <span className="error-message">{formErrors.title}</span>
                  )}
                </div>

                {/* Country Field */}
                <div className="form-group">
                  <label>Country *</label>
                  <select 
                    name="country"
                    value={courseFormData.country}
                    onChange={handleCourseFormChange}
                    disabled={isSubmitting}
                  >
                    <option value="UK">UK</option>
                    <option value="US">US</option>
                    <option value="CANADA">Canada</option>
                    <option value="NIGERIA">Nigeria</option>
                  </select>
                </div>

                {/* Grade Level Field */}
                <div className="form-group">
                  <label>Grade Level *</label>
                  <select 
                    name="gradeLevel"
                    value={courseFormData.gradeLevel}
                    onChange={handleCourseFormChange}
                    className={formErrors.gradeLevel ? 'error' : ''}
                    disabled={isSubmitting}
                  >
                    <option value="">Select grade level</option>
                    {courseFormData.country === 'US' ? (
                      <>
                        <option value="Grade 1">Grade 1</option>
                        <option value="Grade 2">Grade 2</option>
                        <option value="Grade 3">Grade 3</option>
                        <option value="Grade 4">Grade 4</option>
                        <option value="Grade 5">Grade 5</option>
                        <option value="Grade 6">Grade 6</option>
                        <option value="Grade 7">Grade 7</option>
                        <option value="Grade 8">Grade 8</option>
                        <option value="Grade 9">Grade 9</option>
                        <option value="Grade 10">Grade 10</option>
                        <option value="Grade 11">Grade 11</option>
                        <option value="Grade 12">Grade 12</option>
                      </>
                    ) : (
                      <>
                        <option value="Year 1">Year 1</option>
                        <option value="Year 2">Year 2</option>
                        <option value="Year 3">Year 3</option>
                        <option value="Year 4">Year 4</option>
                        <option value="Year 5">Year 5</option>
                        <option value="Year 6">Year 6</option>
                        <option value="Year 7">Year 7</option>
                        <option value="Year 8">Year 8</option>
                        <option value="Year 9">Year 9</option>
                        <option value="Year 10">Year 10</option>
                        <option value="Year 11">Year 11</option>
                        <option value="Year 12">Year 12</option>
                        <option value="Year 13">Year 13</option>
                      </>
                    )}
                  </select>
                  {formErrors.gradeLevel && (
                    <span className="error-message">{formErrors.gradeLevel}</span>
                  )}
                </div>

                {/* Description Field */}
                <div className="form-group">
                  <label>Description *</label>
                  <textarea 
                    name="description"
                    value={courseFormData.description}
                    onChange={handleCourseFormChange}
                    placeholder="Enter course description"
                    rows="4"
                    className={formErrors.description ? 'error' : ''}
                    disabled={isSubmitting}
                  />
                  {formErrors.description && (
                    <span className="error-message">{formErrors.description}</span>
                  )}
                </div>

                {/* Price Field */}
                <div className="form-group">
                  <label>Price (£)</label>
                  <input 
                    type="number" 
                    name="price"
                    value={courseFormData.price}
                    onChange={handleCourseFormChange}
                    placeholder="Enter price (optional)"
                    step="0.01"
                    min="0"
                    className={formErrors.price ? 'error' : ''}
                    disabled={isSubmitting}
                  />
                  {formErrors.price && (
                    <span className="error-message">{formErrors.price}</span>
                  )}
                </div>

                {/* Duration Field */}
                <div className="form-group">
                  <label>Duration</label>
                  <input 
                    type="text" 
                    name="duration"
                    value={courseFormData.duration}
                    onChange={handleCourseFormChange}
                    placeholder="e.g., 12 weeks"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Subject Field */}
                <div className="form-group">
                  <label>Subject</label>
                  <input 
                    type="text" 
                    name="subject"
                    value={courseFormData.subject}
                    onChange={handleCourseFormChange}
                    placeholder="e.g., Mathematics, Science, English"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Learning Outcomes Field */}
                <div className="form-group">
                  <label>Learning Outcomes</label>
                  <textarea 
                    name="learningOutcomes"
                    value={courseFormData.learningOutcomes}
                    onChange={handleCourseFormChange}
                    placeholder="Enter learning outcomes (one per line)"
                    rows="3"
                    disabled={isSubmitting}
                  />
                  <small className="field-hint">Enter each learning outcome on a new line</small>
                </div>

                {/* Submit Error */}
                {formErrors.submit && (
                  <div className="error-message submit-error">
                    {formErrors.submit}
                  </div>
                )}

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn secondary" 
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Course'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'editCourse' && selectedItem && (
              <form className="modal-form" onSubmit={handleCourseFormSubmit}>
                {/* Title Field */}
                <div className="form-group">
                  <label>Course Title *</label>
                  <input 
                    type="text" 
                    name="title"
                    value={courseFormData.title}
                    onChange={handleCourseFormChange}
                    placeholder="Enter course title"
                    className={formErrors.title ? 'error' : ''}
                    disabled={isSubmitting}
                  />
                  {formErrors.title && (
                    <span className="error-message">{formErrors.title}</span>
                  )}
                </div>

                {/* Country Field */}
                <div className="form-group">
                  <label>Country *</label>
                  <select 
                    name="country"
                    value={courseFormData.country}
                    onChange={handleCourseFormChange}
                    disabled={isSubmitting}
                  >
                    <option value="UK">UK</option>
                    <option value="US">US</option>
                    <option value="CANADA">Canada</option>
                    <option value="NIGERIA">Nigeria</option>
                  </select>
                </div>

                {/* Grade Level Field */}
                <div className="form-group">
                  <label>Grade Level *</label>
                  <select 
                    name="gradeLevel"
                    value={courseFormData.gradeLevel}
                    onChange={handleCourseFormChange}
                    className={formErrors.gradeLevel ? 'error' : ''}
                    disabled={isSubmitting}
                  >
                    <option value="">Select grade level</option>
                    {courseFormData.country === 'US' ? (
                      <>
                        <option value="Grade 1">Grade 1</option>
                        <option value="Grade 2">Grade 2</option>
                        <option value="Grade 3">Grade 3</option>
                        <option value="Grade 4">Grade 4</option>
                        <option value="Grade 5">Grade 5</option>
                        <option value="Grade 6">Grade 6</option>
                        <option value="Grade 7">Grade 7</option>
                        <option value="Grade 8">Grade 8</option>
                        <option value="Grade 9">Grade 9</option>
                        <option value="Grade 10">Grade 10</option>
                        <option value="Grade 11">Grade 11</option>
                        <option value="Grade 12">Grade 12</option>
                      </>
                    ) : (
                      <>
                        <option value="Year 1">Year 1</option>
                        <option value="Year 2">Year 2</option>
                        <option value="Year 3">Year 3</option>
                        <option value="Year 4">Year 4</option>
                        <option value="Year 5">Year 5</option>
                        <option value="Year 6">Year 6</option>
                        <option value="Year 7">Year 7</option>
                        <option value="Year 8">Year 8</option>
                        <option value="Year 9">Year 9</option>
                        <option value="Year 10">Year 10</option>
                        <option value="Year 11">Year 11</option>
                        <option value="Year 12">Year 12</option>
                        <option value="Year 13">Year 13</option>
                      </>
                    )}
                  </select>
                  {formErrors.gradeLevel && (
                    <span className="error-message">{formErrors.gradeLevel}</span>
                  )}
                </div>

                {/* Description Field */}
                <div className="form-group">
                  <label>Description *</label>
                  <textarea 
                    name="description"
                    value={courseFormData.description}
                    onChange={handleCourseFormChange}
                    placeholder="Enter course description"
                    rows="4"
                    className={formErrors.description ? 'error' : ''}
                    disabled={isSubmitting}
                  />
                  {formErrors.description && (
                    <span className="error-message">{formErrors.description}</span>
                  )}
                </div>

                {/* Price Field */}
                <div className="form-group">
                  <label>Price (£)</label>
                  <input 
                    type="number" 
                    name="price"
                    value={courseFormData.price}
                    onChange={handleCourseFormChange}
                    placeholder="Enter price (optional)"
                    step="0.01"
                    min="0"
                    className={formErrors.price ? 'error' : ''}
                    disabled={isSubmitting}
                  />
                  {formErrors.price && (
                    <span className="error-message">{formErrors.price}</span>
                  )}
                </div>

                {/* Duration Field */}
                <div className="form-group">
                  <label>Duration</label>
                  <input 
                    type="text" 
                    name="duration"
                    value={courseFormData.duration}
                    onChange={handleCourseFormChange}
                    placeholder="e.g., 12 weeks"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Subject Field */}
                <div className="form-group">
                  <label>Subject</label>
                  <input 
                    type="text" 
                    name="subject"
                    value={courseFormData.subject}
                    onChange={handleCourseFormChange}
                    placeholder="e.g., Mathematics, Science, English"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Status Field - Only for editing */}
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    name="status"
                    value={courseFormData.status}
                    onChange={handleCourseFormChange}
                    disabled={isSubmitting}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                {/* Learning Outcomes Field */}
                <div className="form-group">
                  <label>Learning Outcomes</label>
                  <textarea 
                    name="learningOutcomes"
                    value={courseFormData.learningOutcomes}
                    onChange={handleCourseFormChange}
                    placeholder="Enter learning outcomes (one per line)"
                    rows="3"
                    disabled={isSubmitting}
                  />
                  <small className="field-hint">Enter each learning outcome on a new line</small>
                </div>

                {/* Submit Error */}
                {formErrors.submit && (
                  <div className="error-message submit-error">
                    {formErrors.submit}
                  </div>
                )}

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn secondary" 
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Course'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'createModule' && (
              <form className="modal-form" onSubmit={handleModuleFormSubmit}>
                <div className="form-group">
                  <label>Select Course</label>
                  <select 
                    name="courseId"
                    value={moduleFormData.courseId}
                    onChange={handleModuleFormChange}
                    disabled={isSubmitting || (selectedItem && selectedItem.id)}
                    className={formErrors.courseId ? 'error' : ''}
                  >
                    {selectedItem && selectedItem.id ? (
                      // When opened from course card, show only that course
                      <option value={selectedItem.id}>
                        {selectedItem.title}
                      </option>
                    ) : (
                      // When opened from main button, show all courses
                      <>
                        <option value="">Select a course...</option>
                        {adminData.courses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {formErrors.courseId && <span className="error-text">{formErrors.courseId}</span>}
                </div>
                <div className="form-group">
                  <label>Module Title</label>
                  <input 
                    type="text" 
                    name="title"
                    value={moduleFormData.title}
                    onChange={handleModuleFormChange}
                    placeholder="Enter module title"
                    disabled={isSubmitting}
                    className={formErrors.title ? 'error' : ''}
                  />
                  {formErrors.title && <span className="error-text">{formErrors.title}</span>}
                </div>
                <div className="form-group">
                  <label>Number of Lessons</label>
                  <input 
                    type="number" 
                    name="lessons"
                    value={moduleFormData.lessons}
                    onChange={handleModuleFormChange}
                    placeholder="Enter number of lessons"
                    min="1"
                    disabled={isSubmitting}
                    className={formErrors.lessons ? 'error' : ''}
                  />
                  {formErrors.lessons && <span className="error-text">{formErrors.lessons}</span>}
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <input 
                    type="text" 
                    name="duration"
                    value={moduleFormData.duration}
                    onChange={handleModuleFormChange}
                    placeholder="e.g., 2 weeks"
                    disabled={isSubmitting}
                  />
                  <small className="field-hint">Optional - defaults to "1 week"</small>
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    name="startDate"
                    value={moduleFormData.startDate}
                    onChange={handleModuleFormChange}
                    disabled={isSubmitting}
                  />
                  <small className="field-hint">Optional - When the module starts</small>
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input 
                    type="date" 
                    name="endDate"
                    value={moduleFormData.endDate}
                    onChange={handleModuleFormChange}
                    disabled={isSubmitting}
                  />
                  <small className="field-hint">Optional - When the module ends</small>
                </div>

                {/* Submit Error */}
                {formErrors.submit && (
                  <div className="error-message submit-error">
                    {formErrors.submit}
                  </div>
                )}

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn secondary" 
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Module'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'createQuiz' && (
              <form className="modal-form" onSubmit={handleQuizSubmit}>
                {/* Course Selection */}
                <div className="form-group">
                  <label>Select Course *</label>
                  <select 
                    name="courseId"
                    value={quizFormData.courseId}
                    onChange={handleQuizFormChange}
                    required
                  >
                    <option value="">Select a course...</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Module Selection - filtered by course */}
                <div className="form-group">
                  <label>Select Module *</label>
                  <select 
                    name="moduleId"
                    value={quizFormData.moduleId}
                    onChange={handleQuizFormChange}
                    disabled={!quizFormData.courseId}
                    required
                  >
                    <option value="">Select a module...</option>
                    {getFilteredModules().map(module => (
                      <option key={module.id} value={module.id}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                  {!quizFormData.courseId && (
                    <small className="field-hint">Please select a course first</small>
                  )}
                </div>

                {/* Topic Selection - filtered by module */}
                <div className="form-group">
                  <label>Select Topic/Lesson *</label>
                  <select 
                    name="topic"
                    value={quizFormData.topic}
                    onChange={handleQuizFormChange}
                    disabled={!quizFormData.moduleId}
                    required
                  >
                    <option value="">Select a topic...</option>
                    {getFilteredTopics().map(topic => (
                      <option key={topic.id} value={topic.id}>
                        {topic.title}
                      </option>
                    ))}
                  </select>
                  {!quizFormData.moduleId && (
                    <small className="field-hint">Please select a module first</small>
                  )}
                </div>

                {/* Quiz Details */}
                <div className="form-group">
                  <label>Quiz Title *</label>
                  <input 
                    type="text" 
                    name="title"
                    value={quizFormData.title}
                    onChange={handleQuizFormChange}
                    placeholder="Enter quiz title"
                    required
                  />
                </div>

                {/* Quiz Difficulty */}
                <div className="form-group">
                  <label>Difficulty *</label>
                  <select 
                    name="difficulty"
                    value={quizFormData.difficulty}
                    onChange={handleQuizFormChange}
                    required
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="veryHard">Very Hard</option>
                  </select>
                </div>

                {/* Time Limit */}
                <div className="form-group">
                  <label>Time Limit (minutes) *</label>
                  <input 
                    type="number" 
                    name="timeLimit"
                    value={quizFormData.timeLimit}
                    onChange={handleQuizFormChange}
                    placeholder="Enter time limit in minutes"
                    min="5"
                    max="180"
                    required
                  />
                  <small className="field-hint">Recommended: 15-60 minutes</small>
                </div>

                <div className="form-group">
                  <label>Number of Questions *</label>
                  <input 
                    type="number" 
                    name="numberOfQuestions"
                    value={quizFormData.numberOfQuestions}
                    onChange={handleQuizFormChange}
                    placeholder="Enter number of questions" 
                    min="1"
                    max="50"
                    required
                  />
                  <small className="field-hint">Maximum 50 questions per quiz</small>
                </div>

                <div className="form-group">
                  <label>Passing Score (%) *</label>
                  <input 
                    type="number" 
                    name="passingScore"
                    value={quizFormData.passingScore}
                    onChange={handleQuizFormChange}
                    placeholder="Enter passing score" 
                    min="0" 
                    max="100"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn secondary" 
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating Quiz...' : 'Create Quiz'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'assignTutor' && selectedItem && (
              <form className="modal-form" onSubmit={handleTutorAssignmentSubmit}>
                {feedback.message && (
                  <div className={`feedback-message ${feedback.type}`}>
                    {feedback.message}
                  </div>
                )}
                
                <div className="form-group">
                  <label>Course</label>
                  <input type="text" value={selectedItem.title} disabled />
                </div>
                
                <div className="form-group">
                  <label>Select Tutors *</label>
                  
                  {/* Show currently assigned tutors */}
                  {selectedItem.assignedTutors && selectedItem.assignedTutors.length > 0 && (
                    <div className="current-tutors">
                      <p><strong>Currently Assigned:</strong></p>
                      <ul className="tutor-list">
                        {selectedItem.assignedTutors.map((tutor, index) => (
                          <li key={index} className="current-tutor">
                            {tutor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="tutor-selection">
                    <p>Select tutors to assign (hold Ctrl/Cmd to select multiple):</p>
                    <select 
                      name="tutorIds"
                      multiple
                      value={tutorAssignmentData.tutorIds}
                      onChange={handleTutorAssignmentChange}
                      disabled={isSubmitting}
                      className="multi-select-dropdown"
                      size="6"
                    >
                      {organizedUsers.tutors.map(tutor => (
                        <option key={tutor.id} value={tutor.id}>
                          {tutor.name}{(tutor.subjects || []).length > 0 ? 
                            ` - ${(tutor.subjects || []).join(', ')}` : 
                            ' - No subjects specified'
                          }
                        </option>
                      ))}
                    </select>
                    
                    {/* Show selected tutors */}
                    {tutorAssignmentData.tutorIds && tutorAssignmentData.tutorIds.length > 0 && (
                      <div className="selected-tutors">
                        <p><strong>Selected for assignment ({tutorAssignmentData.tutorIds.length}):</strong></p>
                        <div className="selected-tutor-list">
                          {tutorAssignmentData.tutorIds.map(tutorId => {
                            const tutor = organizedUsers.tutors.find(t => t.id === tutorId);
                            return tutor ? (
                              <span key={tutorId} className="selected-tutor-tag">
                                {tutor.name}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTutor(tutorId)}
                                  className="remove-tutor-btn"
                                  disabled={isSubmitting}
                                >
                                  ×
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Assignment Notes</label>
                  <textarea 
                    name="notes"
                    value={tutorAssignmentData.notes}
                    onChange={handleTutorAssignmentChange}
                    placeholder="Optional notes about this assignment"
                    rows="3"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn secondary" 
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn primary"
                    disabled={isSubmitting || !tutorAssignmentData.tutorIds || tutorAssignmentData.tutorIds.length === 0}
                  >
                    {isSubmitting ? 'Assigning...' : 
                     tutorAssignmentData.tutorIds && tutorAssignmentData.tutorIds.length > 1 ? 
                     'Assign Tutors' : 'Assign Tutor'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'editUser' && selectedItem && (
              <form className="modal-form" onSubmit={handleEditUserFormSubmit}>
                <div className="form-group">
                  <label>Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={editUserFormData.name}
                    onChange={handleEditUserFormChange}
                    placeholder="Enter full name"
                    disabled={isSubmitting}
                    className={formErrors.name ? 'error' : ''}
                  />
                  {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    name="email"
                    value={editUserFormData.email}
                    onChange={handleEditUserFormChange}
                    placeholder="Enter email address"
                    disabled={isSubmitting}
                    className={formErrors.email ? 'error' : ''}
                  />
                  {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                </div>
                
                <div className="form-group">
                  <label>Phone</label>
                  <input 
                    type="tel" 
                    name="phone"
                    value={editUserFormData.phone}
                    onChange={handleEditUserFormChange}
                    placeholder="Enter phone number"
                    disabled={isSubmitting}
                  />
                </div>
                
                <div className="form-group">
                  <label>Account Type</label>
                  <select 
                    name="accountType"
                    value={editUserFormData.accountType}
                    onChange={handleEditUserFormChange}
                    disabled={isSubmitting}
                  >
                    <option value="student">Student</option>
                    <option value="guardian">Guardian</option>
                    <option value="tutor">Tutor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={editUserFormData.status}
                    onChange={handleEditUserFormChange}
                    disabled={isSubmitting}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>User Roles (Multi-role Support)</label>
                  <div className="roles-checkboxes" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {['student', 'tutor', 'guardian', 'admin'].map(role => (
                      <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editUserFormData.roles.includes(role)}
                          onChange={(e) => {
                            const newRoles = e.target.checked
                              ? [...editUserFormData.roles, role]
                              : editUserFormData.roles.filter(r => r !== role);
                            setEditUserFormData(prev => ({ ...prev, roles: newRoles }));
                          }}
                          disabled={isSubmitting}
                        />
                        <span style={{ textTransform: 'capitalize' }}>{role}</span>
                      </label>
                    ))}
                  </div>
                  <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                    Select all applicable roles for this user. Users can have multiple roles.
                  </small>
                </div>
                
                {/* Conditional fields based on account type */}
                {editUserFormData.accountType === 'student' && (
                  <>
                    <div className="form-group">
                      <label>Grade</label>
                      <input 
                        type="text" 
                        name="grade"
                        value={editUserFormData.grade}
                        onChange={handleEditUserFormChange}
                        placeholder="Enter grade level"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="form-group">
                      <label>Guardian</label>
                      <input 
                        type="text" 
                        name="guardian"
                        value={editUserFormData.guardian}
                        onChange={handleEditUserFormChange}
                        placeholder="Enter guardian ID"
                        disabled={isSubmitting}
                      />
                    </div>
                  </>
                )}
                
                {editUserFormData.accountType === 'tutor' && (
                  <div className="form-group">
                    <label>Subjects (comma-separated)</label>
                    <input 
                      type="text" 
                      name="subjects"
                      value={editUserFormData.subjects}
                      onChange={handleEditUserFormChange}
                      placeholder="e.g., Math, Science, English"
                      disabled={isSubmitting}
                    />
                  </div>
                )}
                
                {editUserFormData.accountType === 'guardian' && (
                  <div className="form-group">
                    <label>Students (comma-separated)</label>
                    <input 
                      type="text" 
                      name="students"
                      value={editUserFormData.students}
                      onChange={handleEditUserFormChange}
                      placeholder="e.g., John Doe, Jane Doe"
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {/* Submit Error */}
                {formErrors.submit && (
                  <div className="error-message submit-error">
                    {formErrors.submit}
                  </div>
                )}

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn secondary" 
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Updating...' : 'Update User'}
                  </button>
                </div>
              </form>
            )}

            {modalType === 'viewProfile' && selectedItem && (
              <div className="profile-view">
                <div className="profile-header">
                  <h4>{selectedItem.name}</h4>
                  <span className={`status-badge ${(selectedItem.status || 'active').toLowerCase()}`}>
                    {selectedItem.status || 'Active'}
                  </span>
                </div>
                <div className="profile-details">
                  <div className="detail-row">
                    <span className="label">ID:</span>
                    <span className="value">{selectedItem.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Email:</span>
                    <span className="value">{selectedItem.email}</span>
                  </div>
                  {selectedItem.phone && (
                    <div className="detail-row">
                      <span className="label">Phone:</span>
                      <span className="value">{selectedItem.phone}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Joined Date:</span>
                    <span className="value">{selectedItem.joinedDate}</span>
                  </div>
                  {selectedItem.subjects && (
                    <div className="detail-row">
                      <span className="label">Subjects:</span>
                      <span className="value">{(selectedItem.subjects || []).join(', ')}</span>
                    </div>
                  )}
                  {selectedItem.grade && (
                    <div className="detail-row">
                      <span className="label">Grade:</span>
                      <span className="value">{selectedItem.grade}</span>
                    </div>
                  )}
                  {selectedItem.students && (
                    <div className="detail-row">
                      <span className="label">Students:</span>
                      <span className="value">{(selectedItem.students || []).join(', ')}</span>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn primary" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Create/Edit Plan Form */}
            {(modalType === 'createPlan' || modalType === 'editPlan') && (
              <form className="modal-form" onSubmit={async (e) => {
                e.preventDefault();
                
                const formData = {
                  name: planFormData.name,
                  price: parseFloat(planFormData.price),
                  currency: planFormData.currency,
                  period: planFormData.period,
                  creditRate: parseFloat(planFormData.creditRate),
                  features: planFormData.features.filter(f => f.trim() !== ''),
                  isPopular: planFormData.isPopular,
                  isActive: planFormData.isActive,
                  displayOrder: parseInt(planFormData.displayOrder)
                };

                try {
                  const url = modalType === 'createPlan' 
                    ? `${API_BASE_URL}/admin/plans`
                    : `${API_BASE_URL}/admin/plans/${selectedItem.id}`;
                  
                  const method = modalType === 'createPlan' ? 'POST' : 'PUT';

                  const response = await fetch(url, {
                    method,
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(formData)
                  });

                  if (response.ok) {
                    setShowModal(false);
                    // Refresh plans list
                    const plansResponse = await fetch(`${API_BASE_URL}/admin/plans`, {
                      headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                      }
                    });
                    const plansData = await plansResponse.json();
                    if (plansResponse.ok) {
                      setPlans(plansData.plans);
                    }
                  }
                } catch (error) {
                  // console.error('Error saving plan:', error);
                }
              }}>
                <div className="form-group">
                  <label>Plan Name *</label>
                  <input 
                    type="text" 
                    value={planFormData.name}
                    onChange={(e) => setPlanFormData({...planFormData, name: e.target.value})}
                    placeholder="e.g., Premium Plan"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Price *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={planFormData.price}
                    onChange={(e) => setPlanFormData({...planFormData, price: e.target.value})}
                    placeholder="e.g., 29.99"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Currency</label>
                  <select 
                    value={planFormData.currency}
                    onChange={(e) => setPlanFormData({...planFormData, currency: e.target.value})}
                  >
                    {getSupportedCurrencies().map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} ({currency.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Period *</label>
                  <select 
                    value={planFormData.period}
                    onChange={(e) => setPlanFormData({...planFormData, period: e.target.value})}
                    required
                  >
                    <option value="">Select period</option>
                    <option value="lesson">Per Lesson</option>
                    <option value="week">Per Week</option>
                    <option value="month">Per Month</option>
                    <option value="session package">Session Package</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Credit Rate (pence per credit) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={planFormData.creditRate}
                    onChange={(e) => setPlanFormData({...planFormData, creditRate: e.target.value})}
                    placeholder="e.g., 1.0 (1 pound per credit)"
                    required
                  />
                  <small>Lower values give more credits per pound (e.g., 0.85 = better value)</small>
                </div>

                <div className="form-group">
                  <label>Features</label>
                  {planFormData.features.map((feature, index) => (
                    <div key={index} className="feature-input">
                      <input 
                        type="text" 
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...planFormData.features];
                          newFeatures[index] = e.target.value;
                          setPlanFormData({...planFormData, features: newFeatures});
                        }}
                        placeholder="Enter feature"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const newFeatures = planFormData.features.filter((_, i) => i !== index);
                          setPlanFormData({...planFormData, features: newFeatures});
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => setPlanFormData({...planFormData, features: [...planFormData.features, '']})}
                  >
                    Add Feature
                  </button>
                </div>

                <div className="form-group">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={planFormData.isPopular}
                      onChange={(e) => setPlanFormData({...planFormData, isPopular: e.target.checked})}
                    />
                    Mark as Popular
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={planFormData.isActive}
                      onChange={(e) => setPlanFormData({...planFormData, isActive: e.target.checked})}
                    />
                    Active
                  </label>
                </div>

                <div className="form-group">
                  <label>Display Order</label>
                  <input 
                    type="number" 
                    value={planFormData.displayOrder}
                    onChange={(e) => setPlanFormData({...planFormData, displayOrder: e.target.value})}
                    placeholder="0"
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn primary">
                    {modalType === 'createPlan' ? 'Create Plan' : 'Update Plan'}
                  </button>
                </div>
              </form>
            )}

            {/* Create/Edit AI Prompt Form */}
            {(modalType === 'createPrompt' || modalType === 'editPrompt') && (
              <form className="modal-form" onSubmit={modalType === 'createPrompt' ? handleCreatePrompt : handleUpdatePrompt}>
                <div className="form-group">
                  <label>Prompt Name *</label>
                  <input 
                    type="text" 
                    value={promptFormData.promptName}
                    onChange={(e) => setPromptFormData({...promptFormData, promptName: e.target.value})}
                    placeholder="e.g., tutor_feedback_prompt"
                    required
                    disabled={modalType === 'editPrompt'}
                    className={modalType === 'editPrompt' ? 'disabled' : ''}
                  />
                  {formErrors.promptName && (
                    <span className="error-text">{formErrors.promptName}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Prompt Content *</label>
                  <textarea 
                    rows="10"
                    value={promptFormData.promptContent}
                    onChange={(e) => setPromptFormData({...promptFormData, promptContent: e.target.value})}
                    placeholder="Enter the AI prompt template here..."
                    required
                    className="prompt-textarea"
                  />
                  {formErrors.promptContent && (
                    <span className="error-text">{formErrors.promptContent}</span>
                  )}
                </div>

                {formErrors.submit && (
                  <div className="error-message">{formErrors.submit}</div>
                )}

                <div className="form-actions">
                  <button type="button" onClick={closeModal} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (modalType === 'createPrompt' ? 'Create Prompt' : 'Update Prompt')}
                  </button>
                </div>
              </form>
            )}

            {/* View AI Prompt */}
            {modalType === 'viewPrompt' && selectedItem && (
              <div className="prompt-view">
                <div className="prompt-meta">
                  <div className="meta-item">
                    <strong>Prompt Name:</strong> {selectedItem.prompt_name}
                  </div>
                  <div className="meta-item">
                    <strong>Created:</strong> {new Date(selectedItem.created_at).toLocaleDateString()}
                  </div>
                  <div className="meta-item">
                    <strong>Last Updated:</strong> {new Date(selectedItem.updated_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="prompt-content-full">
                  <h4>Prompt Content:</h4>
                  <div className="prompt-display">
                    <pre>{selectedItem.prompt_content || 'No content available'}</pre>
                  </div>
                </div>

                <div className="modal-actions">
                  <button onClick={closeModal} className="btn btn-secondary">
                    Close
                  </button>
                  <button 
                    onClick={() => {
                      setEditingPrompt(selectedItem);
                      setPromptFormData({
                        promptName: selectedItem.prompt_name,
                        promptContent: selectedItem.prompt_content || ''
                      });
                      setModalType('editPrompt');
                    }}
                    className="btn btn-primary"
                  >
                    Edit Prompt
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!user || isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading Admin Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <NotificationToast notification={notification} />
      <div className="admin-header">
        <div className="header-content">
          <div className="header-info">
            <h1>Admin Dashboard</h1>
            <span className="admin-badge">System Administrator</span>
          </div>
          <div className="header-actions">
            <div className="admin-info">
              <span className="admin-name">
                {user?.profile?.name || user?.email?.split('@')[0] || 'Admin User'}
              </span>
              <span className="admin-role">
                {user?.profile?.role || 'System Administrator'}
              </span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="admin-content">
        <nav className="admin-sidebar">
          <ul className="nav-menu">
            <li>
              <button 
                className={activeSection === 'dashboard' ? 'active' : ''}
                onClick={() => setActiveSection('dashboard')}
              >
                📊 Dashboard
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'courses' ? 'active' : ''}
                onClick={() => setActiveSection('courses')}
              >
                📚 Courses
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'plans' ? 'active' : ''}
                onClick={() => setActiveSection('plans')}
              >
                💰 Pricing Plans
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'users' ? 'active' : ''}
                onClick={() => setActiveSection('users')}
              >
                👥 Users
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'tutors' ? 'active' : ''}
                onClick={() => setActiveSection('tutors')}
              >
                🎓 Tutor Management
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'ai-prompts' ? 'active' : ''}
                onClick={() => setActiveSection('ai-prompts')}
              >
                🤖 AI Prompts
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'environment' ? 'active' : ''}
                onClick={() => setActiveSection('environment')}
              >
                🔧 Environment
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'system-settings' ? 'active' : ''}
                onClick={() => setActiveSection('system-settings')}
              >
                ⚙️ System Settings
              </button>
            </li>
            <li>
              <button 
                className={activeSection === 'chats' ? 'active' : ''}
                onClick={() => setActiveSection('chats')}
              >
                💬 Chat Monitor
              </button>
            </li>
            <li>
              <button
                className={activeSection === 'invoices' ? 'active' : ''}
                onClick={() => setActiveSection('invoices')}
              >
                💳 Invoices
              </button>
            </li>
            <li>
              <button
                className={activeSection === 'multi-role' ? 'active' : ''}
                onClick={() => setActiveSection('multi-role')}
              >
                🔄 Multi-Role Management
              </button>
            </li>
          </ul>
        </nav>

        <main className="admin-main">
          {activeSection === 'dashboard' && renderDashboard()}
          {activeSection === 'courses' && renderCourses()}
          {activeSection === 'plans' && renderPlans()}
          {activeSection === 'users' && renderUsers()}
          {activeSection === 'tutors' && renderTutors()}
          {activeSection === 'ai-prompts' && renderAIPrompts()}
          {activeSection === 'invoices' && <AdminInvoiceList />}
          {activeSection === 'environment' && (
            <div className="environment-section">
              <ServiceStatusPanel />
              <EnvironmentManager />
            </div>
          )}
          {activeSection === 'system-settings' && renderSystemSettings()}
          {activeSection === 'chats' && <AdminChatMonitor user={user} />}
          {activeSection === 'multi-role' && <MultiRoleManagement />}
        </main>
      </div>

      {renderModal()}
      
      {/* Guardian Detail Modal */}
      {showGuardianModal && selectedGuardian && (
        <div className="modal-overlay" onClick={() => setShowGuardianModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Guardian Details</h3>
              <button className="close-modal" onClick={() => setShowGuardianModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="guardian-profile-view">
                <div className="profile-header">
                  <h4>{selectedGuardian.name}</h4>
                  <span className={`status-badge ${(selectedGuardian.status || 'active').toLowerCase()}`}>
                    {selectedGuardian.status || 'Active'}
                  </span>
                </div>
                <div className="profile-details">
                  <div className="detail-row">
                    <span className="label">Guardian ID:</span>
                    <span className="value">{selectedGuardian.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Name:</span>
                    <span className="value">{selectedGuardian.name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Email:</span>
                    <span className="value">{selectedGuardian.email}</span>
                  </div>
                  {selectedGuardian.phone && (
                    <div className="detail-row">
                      <span className="label">Phone:</span>
                      <span className="value">{selectedGuardian.phone}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Account Type:</span>
                    <span className="value">{selectedGuardian.accountType || selectedGuardian.account_type || 'Guardian'}</span>
                  </div>
                  {selectedGuardian.students && selectedGuardian.students.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Students:</span>
                      <span className="value">
                        {Array.isArray(selectedGuardian.students) 
                          ? selectedGuardian.students.join(', ')
                          : selectedGuardian.students
                        }
                      </span>
                    </div>
                  )}
                  {selectedGuardian.totalCredits && (
                    <div className="detail-row">
                      <span className="label">Credits:</span>
                      <span className="value">
                        {selectedGuardian.usedCredits || 0} / {selectedGuardian.totalCredits} used
                      </span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Joined Date:</span>
                    <span className="value">
                      {selectedGuardian.created_at 
                        ? new Date(selectedGuardian.created_at).toLocaleDateString()
                        : selectedGuardian.joinedDate || 'Unknown'
                      }
                    </span>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    className="btn secondary" 
                    onClick={() => {
                      setShowGuardianModal(false);
                      openModal('editUser', selectedGuardian);
                    }}
                  >
                    Edit Guardian
                  </button>
                  <button 
                    className="btn success" 
                    onClick={() => {
                      setShowGuardianModal(false);
                      openCreditModal(selectedGuardian);
                    }}
                  >
                    💰 Add Credits
                  </button>
                  <button className="btn primary" onClick={() => setShowGuardianModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutor Verification Modal */}
      {showTutorModal && selectedTutor && (
        <div className="modal-overlay" onClick={() => setShowTutorModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{tutorModalType === 'verify' ? 'Verify Tutor' : 'Unverify Tutor'}</h3>
              <button className="close-modal" onClick={() => setShowTutorModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="tutor-verification-form">
                <div className="tutor-summary">
                  <h4>{selectedTutor.name || selectedTutor.email}</h4>
                  <p><strong>Email:</strong> {selectedTutor.email}</p>
                  <p><strong>Subjects:</strong> {(selectedTutor.subjects || []).join(', ') || 'None'}</p>
                  <p><strong>Grade Level:</strong> {selectedTutor.tutorGradeLevel || 'Not specified'}</p>
                  <p><strong>Current Status:</strong> 
                    <span className={`status ${selectedTutor.isVerified ? 'verified' : 'unverified'}`}>
                      {selectedTutor.isVerified ? ' ✅ Verified' : ' ⚠️ Unverified'}
                    </span>
                  </p>
                </div>
                
                <div className="verification-action">
                  <p>
                    {tutorModalType === 'verify' 
                      ? 'Are you sure you want to verify this tutor? This will mark them as a trusted educator.'
                      : 'Are you sure you want to unverify this tutor? This will remove their verified status.'
                    }
                  </p>
                  
                  <div className="form-group">
                    <label htmlFor="verificationNotes">Notes (optional):</label>
                    <textarea
                      id="verificationNotes"
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      placeholder="Add any notes about this verification action..."
                      rows="3"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn secondary" 
                onClick={() => setShowTutorModal(false)}
              >
                Cancel
              </button>
              <button 
                className={`btn ${tutorModalType === 'verify' ? 'primary' : 'danger'}`}
                onClick={confirmTutorVerification}
              >
                {tutorModalType === 'verify' ? 'Verify Tutor' : 'Unverify Tutor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && selectedUserForReset && (
        <div className="modal-overlay" onClick={closePasswordResetModal}>
          <div className="modal-content password-reset-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Reset Password</h3>
              <button className="close-modal" onClick={closePasswordResetModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="user-summary">
                <h4>{selectedUserForReset.name || selectedUserForReset.email}</h4>
                <p><strong>Email:</strong> {selectedUserForReset.email}</p>
                <p><strong>Account Type:</strong> {selectedUserForReset.accountType || selectedUserForReset.account_type || 'User'}</p>
                <p><strong>User ID:</strong> {selectedUserForReset.id}</p>
              </div>
              
              <form onSubmit={handlePasswordResetSubmit} className="password-reset-form">
                <div className="form-group">
                  <label>Password Reset Method</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="resetMethod"
                        value="email"
                        checked={passwordResetData.method === 'email'}
                        onChange={(e) => setPasswordResetData({...passwordResetData, method: e.target.value})}
                      />
                      <span className="radio-custom"></span>
                      <div className="radio-content">
                        <strong>Email Reset Link</strong>
                        <p>Send a password reset email to the user. They can set their own new password.</p>
                      </div>
                    </label>
                    
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="resetMethod"
                        value="temp"
                        checked={passwordResetData.method === 'temp'}
                        onChange={(e) => setPasswordResetData({...passwordResetData, method: e.target.value})}
                      />
                      <span className="radio-custom"></span>
                      <div className="radio-content">
                        <strong>Generate Temporary Password</strong>
                        <p>Generate a random temporary password that expires and forces user to change it on next login.</p>
                      </div>
                    </label>
                  </div>
                </div>

                {passwordResetData.method === 'temp' && (
                  <div className="form-group">
                    <label htmlFor="passwordLength">Temporary Password Length</label>
                    <select
                      id="passwordLength"
                      value={passwordResetData.passwordLength}
                      onChange={(e) => setPasswordResetData({...passwordResetData, passwordLength: parseInt(e.target.value)})}
                    >
                      <option value={8}>8 characters</option>
                      <option value={10}>10 characters</option>
                      <option value={12}>12 characters (recommended)</option>
                      <option value={16}>16 characters</option>
                      <option value={20}>20 characters</option>
                    </select>
                  </div>
                )}

                {passwordResetData.method === 'email' && (
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={passwordResetData.notifyUser}
                        onChange={(e) => setPasswordResetData({...passwordResetData, notifyUser: e.target.checked})}
                      />
                      <span className="checkmark"></span>
                      Send email notification to user
                    </label>
                  </div>
                )}
                
                {passwordResetError && (
                  <div className="error-message">
                    {passwordResetError}
                  </div>
                )}
                
                <div className="modal-footer">
                  <button 
                    type="button"
                    className="btn secondary" 
                    onClick={closePasswordResetModal}
                    disabled={isResettingPassword}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn danger"
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? 'Processing...' : passwordResetData.method === 'email' ? 'Send Reset Email' : 'Generate Temporary Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Password Dialog */}
      {showTempPasswordDialog && (
        <div className="modal-overlay" onClick={closeTempPasswordDialog}>
          <div className="modal-content temp-password-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Temporary Password Generated</h3>
              <button className="close-modal" onClick={closeTempPasswordDialog}>×</button>
            </div>
            <div className="modal-body">
              <div className="temp-password-content">
                <div className="user-info">
                  <h4>Password for: {tempPasswordData.userName}</h4>
                  <p className="user-email">{tempPasswordData.userEmail}</p>
                </div>
                
                <div className="password-display">
                  <label>Temporary Password:</label>
                  <div className="password-field">
                    <input 
                      type="text" 
                      value={tempPasswordData.password} 
                      readOnly 
                      className="password-input"
                    />
                    <button 
                      type="button"
                      onClick={() => copyToClipboard(tempPasswordData.password)}
                      className="copy-btn"
                      title="Copy to clipboard"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>

                <div className="password-instructions">
                  <h5>⚠️ Important Instructions:</h5>
                  <ul>
                    <li>This is a <strong>temporary password</strong> that expires after first use</li>
                    <li>The user <strong>must change it</strong> upon first login</li>
                    <li>Share this password securely with the user</li>
                    <li>For security, this dialog will close when you click "Done"</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => copyToClipboard(tempPasswordData.password)}
                className="btn btn-secondary"
              >
                📋 Copy Password
              </button>
              <button 
                onClick={closeTempPasswordDialog}
                className="btn btn-primary"
              >
                ✅ Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Allocation Modal */}
      {showCreditModal && selectedGuardianForCredits && (
        <div className="modal-overlay" onClick={closeCreditModal}>
          <div className="modal-content credit-allocation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💰 Add Credits</h3>
              <button className="close-modal" onClick={closeCreditModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="guardian-summary">
                <h4>{selectedGuardianForCredits.name || selectedGuardianForCredits.email}</h4>
                <p><strong>Email:</strong> {selectedGuardianForCredits.email}</p>
                <p><strong>Guardian ID:</strong> {selectedGuardianForCredits.id}</p>
              </div>
              
              <form onSubmit={handleCreditFormSubmit} className="credit-allocation-form">
                <div className="form-group">
                  <label htmlFor="creditAmount">Amount to Add *</label>
                  <input
                    id="creditAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={creditForm.amount}
                    onChange={(e) => setCreditForm({...creditForm, amount: e.target.value})}
                    placeholder="Enter amount (e.g., 50.00)"
                    required
                    disabled={isAddingCredits}
                  />
                  <small className="help-text">Enter the number of credits to add to this guardian's account</small>
                </div>

                <div className="form-group">
                  <label htmlFor="creditReason">Reason *</label>
                  <textarea
                    id="creditReason"
                    value={creditForm.reason}
                    onChange={(e) => setCreditForm({...creditForm, reason: e.target.value})}
                    placeholder="Explain why credits are being added..."
                    rows="3"
                    required
                    disabled={isAddingCredits}
                  />
                  <small className="help-text">This reason will be recorded for audit purposes</small>
                </div>

                {creditError && (
                  <div className="error-message">
                    {creditError}
                  </div>
                )}

                <div className="modal-actions">
                  <button 
                    type="button"
                    className="btn secondary"
                    onClick={closeCreditModal}
                    disabled={isAddingCredits}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="btn primary"
                    disabled={isAddingCredits}
                  >
                    {isAddingCredits ? 'Adding Credits...' : 'Add Credits'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  // Plan rendering function
  function renderPlans() {

    const addFeature = (planData, setPlan) => {
      setPlan(prev => ({
        ...prev,
        features: [...prev.features, '']
      }));
    };

    const removeFeature = (planData, setPlan, index) => {
      setPlan(prev => ({
        ...prev,
        features: prev.features.filter((_, i) => i !== index)
      }));
    };

    const updateFeature = (planData, setPlan, index, value) => {
      setPlan(prev => ({
        ...prev,
        features: prev.features.map((feature, i) => i === index ? value : feature)
      }));
    };

    // Notification helper function
    const showNotification = (message, type = 'success') => {
      setNotification({ show: true, message, type });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    // Plan validation function
    const validatePlan = (plan) => {
      const errors = [];
      
      if (!plan.name?.trim()) errors.push('Plan name is required');
      if (!plan.pricePerSession || plan.pricePerSession <= 0) errors.push('Valid price is required');
      if (!plan.creditRate || plan.creditRate <= 0) errors.push('Valid credit rate is required');
      if (!plan.features?.some(f => f.trim())) errors.push('At least one feature is required');
      
      return errors;
    };

    const handleSavePlan = async (planData, isEditing = false) => {
      // Validate plan data first
      const errors = validatePlan(planData);
      if (errors.length > 0) {
        showNotification(errors.join(', '), 'error');
        return;
      }

      // Set loading state
      setIsSavingPlan(true);

      try {
        const url = isEditing 
          ? `${API_BASE_URL}/admin/plans/${editingPlan.id}`
          : `${API_BASE_URL}/admin/plans`;
        
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            ...planData,
            price: planData.pricePerSession || planData.price,
            creditRate: planData.creditRate || 1.0,
            features: planData.features.filter(f => f.trim() !== '')
          })
        });
        
        if (response.ok) {
          const updatedPlanData = await response.json();
          
          if (isEditing) {
            // Update the specific plan in the local state immediately
            setPlans(prevPlans => 
              prevPlans.map(plan => 
                plan.id === editingPlan.id 
                  ? { ...updatedPlanData.plan } 
                  : plan
              )
            );
          } else {
            // For new plans, add to the list
            setPlans(prevPlans => [...prevPlans, updatedPlanData.plan]);
          }
          
          setEditingPlan(null);
          setNewPlan({
            name: '',
            description: '',
            pricePerSession: '',
            currency: 'GBP',
            period: 'monthly',
            creditRate: 1.0,
            features: [''],
            isPopular: false,
            isActive: true,
            displayOrder: 0
          });

          // Show success notification
          showNotification(
            isEditing ? 'Plan updated successfully!' : 'Plan created successfully!',
            'success'
          );
        } else {
          // Handle specific error cases
          const errorData = await response.json();
          const errorMessage = errorData.message || 'Failed to save plan';
          
          showNotification(errorMessage, 'error');
          
          // Log for debugging
          console.error('Save plan failed:', errorData);
        }
      } catch (error) {
        // Handle network or unexpected errors
        showNotification(
          'Network error. Please check your connection and try again.',
          'error'
        );
        console.error('Error saving plan:', error);
      } finally {
        setIsSavingPlan(false);
      }
    };

    const handleDeletePlan = async (planId) => {
      if (window.confirm('Are you sure you want to delete this plan?')) {
        // OPTIMISTIC UPDATE - Remove from local state immediately for better UX
        const originalPlans = [...plans];
        const planToDelete = plans.find(plan => plan.id === planId);
        
        // Immediately update UI
        setPlans(prevPlans => prevPlans.filter(plan => plan.id !== planId));
        
        try {
          const response = await fetch(`${API_BASE_URL}/admin/plans/${planId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
            }
          });
          
          if (response.ok) {
            showNotification('Plan deleted successfully!', 'success');
            // No need to refetch - optimistic update already handled it
          } else {
            // Rollback on error
            setPlans(originalPlans);
            const errorData = await response.json();
            showNotification(errorData.message || 'Failed to delete plan', 'error');
          }
        } catch (error) {
          // Rollback on error
          setPlans(originalPlans);
          showNotification('Network error occurred', 'error');
          console.error('Error deleting plan:', error);
        }
      }
    };
    
    // COMMENTED OUT - Old handleDeletePlan that caused loading issues
    // const handleDeletePlan_OLD = async (planId) => {
    //   if (window.confirm('Are you sure you want to delete this plan?')) {
    //     try {
    //       const response = await fetch(`http://localhost:5000/api/admin/plans/${planId}`, {
    //         method: 'DELETE',
    //         headers: {
    //           'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
    //         }
    //       });
    //       
    //       if (response.ok) {
    //         fetchPlans(); // This was causing the loading issue
    //       }
    //     } catch (error) {
    //       // console.error('Error deleting plan:', error);
    //     }
    //   }
    // };

    return (
      <div className="plans-section">
        <div className="section-header">
          <h3>Pricing Plans Management</h3>
          <p className="section-description">
            Create and manage pricing plans for your platform
          </p>
        </div>

        {/* Create New Plan Form */}
        <div className="plan-form-card">
          <h4>Create New Pricing Plan</h4>
          <div className="plan-form">
            <div className="form-row">
              <div className="form-group">
                <label>Plan Name *</label>
                <input
                  type="text"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Basic Plan, Premium Plan"
                />
              </div>
              <div className="form-group">
                <label>Price per Session per Child *</label>
                <div className="adm-price-input-group">
                  <select
                    value={newPlan.currency}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, currency: e.target.value }))}
                    className="adm-currency-select"
                  >
                    {getSupportedCurrencies().map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPlan.pricePerSession}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewPlan(prev => ({ ...prev, pricePerSession: value }));
                    }}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setNewPlan(prev => ({ ...prev, pricePerSession: value.toFixed(2) }));
                    }}
                    placeholder="0.00"
                    className="adm-price-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Credit Rate</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newPlan.creditRate}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, creditRate: parseFloat(e.target.value) || 0 }))}
                  placeholder="1.0"
                />
                <small className="help-text">Credits earned per £1 spent</small>
              </div>
              <div className="form-group">
                <label>Billing Period</label>
                <select
                  value={newPlan.period}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, period: e.target.value }))}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newPlan.description}
                onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the plan..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Features</label>
              <div className="features-list">
                {newPlan.features.map((feature, index) => (
                  <div key={index} className="feature-input-group">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateFeature(newPlan, setNewPlan, index, e.target.value)}
                      placeholder="Enter feature description"
                    />
                    <button
                      type="button"
                      onClick={() => removeFeature(newPlan, setNewPlan, index)}
                      className="btn-remove-feature"
                      disabled={newPlan.features.length === 1}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addFeature(newPlan, setNewPlan)}
                  className="btn-add-feature"
                >
                  + Add Feature
                </button>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newPlan.isPopular}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, isPopular: e.target.checked }))}
                  />
                  Mark as Popular
                </label>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newPlan.isActive}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Active
                </label>
              </div>
              <div className="form-group">
                <label>Display Order</label>
                <input
                  type="number"
                  value={newPlan.displayOrder}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => handleSavePlan(newPlan)}
                className="btn-save"
                disabled={!newPlan.name || !newPlan.pricePerSession || !newPlan.creditRate || isSavingPlan}
              >
                {isSavingPlan ? (
                  <>⏳ Saving...</>
                ) : (
                  <>💾 Save Plan</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Existing Plans */}
        <div className="existing-plans">
          <h4>Existing Plans ({plans.length})</h4>
          {plansLoading ? (
            <div className="loading-state">
              <div className="loading-spinner">⏳</div>
              <p>Loading plans...</p>
            </div>
          ) : plansError ? (
            <div className="error-state">
              <div className="error-icon">❌</div>
              <h5>Error Loading Plans</h5>
              <p>{plansError}</p>
              <button onClick={() => setPlansError(null)} className="retry-btn">Retry</button>
            </div>
          ) : plans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h5>No Plans Created</h5>
              <p>Create your first pricing plan above to get started.</p>
            </div>
          ) : (
            <div className="plans-grid">
              {plans.map(plan => (
                <div key={plan.id} className="plan-card">
                  {editingPlan?.id === plan.id ? (
                    // Edit Mode
                    <div className="plan-edit-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Plan Name</label>
                          <input
                            type="text"
                            value={editingPlan.name}
                            onChange={(e) => setEditingPlan(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label>Price per Session</label>
                          <div className="adm-price-input-group">
                            <select
                              value={editingPlan.currency}
                              onChange={(e) => setEditingPlan(prev => ({ ...prev, currency: e.target.value }))}
                              className="adm-currency-select"
                            >
                              {getSupportedCurrencies().map(currency => (
                                <option key={currency.code} value={currency.code}>
                                  {currency.symbol} {currency.code}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editingPlan.pricePerSession || editingPlan.price || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setEditingPlan(prev => ({ ...prev, pricePerSession: value }));
                              }}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setEditingPlan(prev => ({ ...prev, pricePerSession: value.toFixed(2) }));
                              }}
                              placeholder="0.00"
                              className="adm-price-input"
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Credit Rate</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editingPlan.creditRate || 1.0}
                            onChange={(e) => setEditingPlan(prev => ({ ...prev, creditRate: parseFloat(e.target.value) || 0 }))}
                            placeholder="1.0"
                          />
                          <small className="help-text">Credits earned per £1 spent</small>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          value={editingPlan.description || ''}
                          onChange={(e) => setEditingPlan(prev => ({ ...prev, description: e.target.value }))}
                          rows="2"
                        />
                      </div>

                      <div className="form-group">
                        <label>Features</label>
                        <div className="features-list">
                          {(editingPlan.features || ['']).map((feature, index) => (
                            <div key={index} className="feature-input-group">
                              <input
                                type="text"
                                value={feature}
                                onChange={(e) => updateFeature(editingPlan, setEditingPlan, index, e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => removeFeature(editingPlan, setEditingPlan, index)}
                                className="btn-remove-feature"
                                disabled={(editingPlan.features || []).length === 1}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addFeature(editingPlan, setEditingPlan)}
                            className="btn-add-feature"
                          >
                            + Add Feature
                          </button>
                        </div>
                      </div>

                      <div className="form-actions">
                        <button
                          onClick={() => handleSavePlan(editingPlan, true)}
                          className="btn-save"
                          disabled={isSavingPlan}
                        >
                          {isSavingPlan ? (
                            <>⏳ Saving...</>
                          ) : (
                            <>💾 Save Changes</>
                          )}
                        </button>
                        <button
                          onClick={() => setEditingPlan(null)}
                          className="btn-cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="plan-content">
                      <div className="plan-header">
                        <h5>{plan.name}</h5>
                        <div className="plan-badges">
                          <span className={`status-badge ${plan.isActive ? 'active' : 'inactive'}`}>
                            {plan.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {plan.isPopular && <span className="popular-badge">Popular</span>}
                        </div>
                      </div>

                      <div className="plan-price">
                        <span className="currency">{getCurrencySymbol(plan.currency || 'GBP')}</span>
                        <span className="amount">{plan.pricePerSession || plan.price}</span>
                        <span className="period">per lesson/student</span>
                      </div>

                      {plan.description && (
                        <div className="plan-description">
                          <p>{plan.description}</p>
                        </div>
                      )}

                      <div className="plan-features">
                        <strong>Features:</strong>
                        <ul>
                          {(plan.features || []).map((feature, index) => (
                            <li key={index}>{feature}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="plan-meta">
                        <small>Period: {plan.period} | Order: {plan.displayOrder}</small>
                      </div>

                      <div className="plan-actions">
                        <button
                          onClick={() => setEditingPlan({ ...plan })}
                          className="btn-edit"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleTogglePlan(plan.id)}
                          className={`btn-toggle ${plan.isActive ? 'deactivate' : 'activate'}`}
                        >
                          {plan.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="btn-delete"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    );
  }

  // AI Prompts rendering function
  function renderAIPrompts() {

    if (promptsLoading) {
      return (
        <div className="section">
          <div className="section-header">
            <h2>🤖 AI Prompt Management</h2>
          </div>
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading AI prompts...</p>
          </div>
        </div>
      );
    }

    if (promptsError) {
      return (
        <div className="section">
          <div className="section-header">
            <h2>🤖 AI Prompt Management</h2>
          </div>
          <div className="error-state">
            <p>Error loading prompts: {promptsError}</p>
            <button onClick={loadPrompts} className="btn btn-primary">Retry</button>
          </div>
        </div>
      );
    }

    return (
      <div className="section">
        <div className="section-header">
          <h2>🤖 AI Prompt Management</h2>
          <div className="header-actions">
            <button 
              onClick={() => openModal('createPrompt')} 
              className="btn btn-primary"
            >
              ➕ Create New Prompt
            </button>
            <button 
              onClick={handleInitializeDefaults} 
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              🔄 Initialize Defaults
            </button>
          </div>
        </div>

        {feedback.message && (
          <div className={`feedback ${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        <div className="prompts-grid">
          {aiPrompts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <h3>No AI Prompts Found</h3>
              <p>Create your first AI prompt or initialize default prompts to get started.</p>
              <div className="empty-actions">
                <button onClick={() => openModal('createPrompt')} className="btn btn-primary">
                  Create First Prompt
                </button>
                <button onClick={handleInitializeDefaults} className="btn btn-secondary">
                  Initialize Defaults
                </button>
              </div>
            </div>
          ) : (
            aiPrompts.map((prompt) => (
              <div key={prompt.promptName} className="prompt-card">
                <div className="prompt-header">
                  <h3>{prompt.promptName}</h3>
                  <div className="prompt-meta">
                    <span className="prompt-date">
                      Updated: {new Date(prompt.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="prompt-content">
                  <div className="prompt-preview">
                    {prompt.promptContent ? prompt.promptContent.substring(0, 200) : 'No content available'}
                    {prompt.promptContent && prompt.promptContent.length > 200 && '...'}
                  </div>
                </div>
                <div className="prompt-actions">
                  <button 
                    onClick={() => {
                      setEditingPrompt(prompt);
                      setPromptFormData({
                        promptName: prompt.promptName,
                        promptContent: prompt.promptContent || ''
                      });
                      openModal('editPrompt');
                    }}
                    className="btn btn-outline"
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedItem(prompt);
                      openModal('viewPrompt');
                    }}
                    className="btn btn-outline"
                  >
                    👁️ View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }
};

export default AdminPage;