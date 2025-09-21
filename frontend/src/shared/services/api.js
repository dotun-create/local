// API Service Layer for ORMS Application
import { normalizeAvailabilityResponse } from '../utils/availabilityNormalizer';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:80/api';

// Timezone detection utility
const getTimezoneInfo = () => {
  try {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const browserLocale = navigator.language || 'en-US';
    return {
      timezone: userTimezone,
      locale: browserLocale
    };
  } catch (error) {
    console.warn('Failed to detect timezone, using UTC fallback:', error);
    return {
      timezone: 'UTC',
      locale: 'en-US'
    };
  }
};

// Generic API request helper
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = sessionStorage.getItem('authToken');
  const timezoneInfo = getTimezoneInfo();

  // Debug logging for authentication issues
  if (!token) {
    // console.warn('No auth token found in sessionStorage');
  }

  const config = {
    headers: {
      'Content-Type': 'application/json',
      'X-Timezone': timezoneInfo.timezone,
      'X-Browser-Locale': timezoneInfo.locale,
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    // console.log(`API Request: ${options.method || 'GET'} ${url}`);
    if (options.body) {
      // console.log('Request body:', options.body);
    }
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      // console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
      
      if (response.status === 401) {
        // console.error('Authentication failed - token may be expired');
      } else if (response.status === 403) {
        // console.error('Access forbidden - insufficient permissions');
      }
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      // console.log('API Response:', result);
      return result;
    }
    
    return response;
  } catch (error) {
    // console.error('API Request failed:', error);
    throw error;
  }
};

// Authentication APIs
const authAPI = {
  // Login user
  login: async (credentials) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.token) {
      sessionStorage.setItem('authToken', response.token);
      sessionStorage.setItem('currentUser', JSON.stringify(response.user));
    }
    
    return response;
  },

  // Logout user
  logout: async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
  },

  // Register user
  register: async (userData) => {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.token) {
      sessionStorage.setItem('authToken', response.token);
      sessionStorage.setItem('currentUser', JSON.stringify(response.user));
    }
    
    return response;
  },

  // Refresh token
  refreshToken: async () => {
    return await apiRequest('/auth/refresh', { method: 'POST' });
  },

  // Verify token
  verifyToken: async () => {
    return await apiRequest('/auth/verify', { method: 'GET' });
  },

  // Change password
  changePassword: async (passwordData) => {
    return await apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  },

  // Request password reset
  requestPasswordReset: async (email) => {
    return await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Reset password with token
  resetPassword: async (token, newPassword) => {
    return await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password: newPassword }),
    });
  },

  // Verify password reset token
  verifyResetToken: async (token) => {
    return await apiRequest('/auth/verify-reset-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  // Get user permissions and roles
  getPermissions: async () => {
    return await apiRequest('/auth/permissions', {
      method: 'GET',
    });
  },

  // Get current user info from backend
  getCurrentUser: async () => {
    const response = await apiRequest('/auth/me', {
      method: 'GET',
    });

    if (response.user) {
      sessionStorage.setItem('currentUser', JSON.stringify(response.user));
    }

    return response.user;
  },

  // Switch active role for multi-role users
  switchRole: async (role) => {
    const response = await apiRequest('/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });

    // Update stored token if new one is provided
    if (response.access_token) {
      sessionStorage.setItem('authToken', response.access_token);
    }

    // Update current user data if provided
    if (response.user) {
      sessionStorage.setItem('currentUser', JSON.stringify(response.user));
    }

    return response;
  },
};

// Users APIs
const usersAPI = {
  // Get all users
  getAllUsers: async (userType = null) => {
    const endpoint = userType ? `/users?type=${userType}` : '/users';
    return await apiRequest(endpoint);
  },


  // Get user by ID
  getUserById: async (userId) => {
    return await apiRequest(`/users/${userId}`);
  },

  // Get user profile with credit information
  getProfile: async (userId) => {
    // console.log('getProfile called for userId:', userId);
    const response = await apiRequest(`/users/${userId}`);
    // console.log('User data retrieved:', response);
    
    // Extract user from response wrapper
    const user = response.user || response;
    
    // If this is a student, get their credit allocations
    if (user && user.accountType === 'student') {
      // console.log('User is a student, fetching credit allocations...');
      try {
        // Get student credit allocations
        const allocations = await apiRequest(`/credits/student-allocations/${userId}`);
        // console.log('Credit allocations retrieved:', allocations);
        
        if (allocations && allocations.length > 0) {
          // Sum up all remaining credits from different guardians
          const totalCredits = allocations.reduce((sum, allocation) => {
            return sum + (allocation.remainingCredits || 0);
          }, 0);
          
          // console.log('Total credits calculated:', totalCredits);
          
          user.credits = totalCredits;
          user.availableCredits = totalCredits;
          user.creditAllocations = allocations;
        } else {
          // console.log('No credit allocations found');
          user.credits = 0;
          user.availableCredits = 0;
        }
      } catch (error) {
        // console.warn('Failed to fetch credit allocations:', error);
        user.credits = 0;
        user.availableCredits = 0;
      }
    } else {
      // console.log('User is not a student, skipping credit allocation fetch');
    }
    
    // console.log('Final user object with credits:', user);
    return user;
  },

  // Create user
  createUser: async (userData) => {
    return await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Update user
  updateUser: async (userId, userData) => {
    return await apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // Delete user
  deleteUser: async (userId) => {
    return await apiRequest(`/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // Get user profile
  getUserProfile: async (userId) => {
    return await apiRequest(`/users/${userId}/profile`);
  },

  // Update user profile
  updateUserProfile: async (userId, profileData) => {
    return await apiRequest(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Update user profile with form data (including image upload)
  updateUserProfileWithImage: async (userId, formData) => {
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:80/api';
    const token = sessionStorage.getItem('authToken');
    const url = `${API_BASE_URL}/users/${userId}/profile`;
    
    const config = {
      method: 'PUT',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData, // FormData object for file upload
    };

    try {
      // console.log(`API Request: PUT ${url}`);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        // console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        // console.log('API Response:', result);
        return result;
      }
      
      return response;
    } catch (error) {
      // console.error('API Request failed:', error);
      throw error;
    }
  },

  // Admin tutor verification endpoints
  getAllTutorsForAdmin: async (page = 1, perPage = 20) => {
    return await apiRequest(`/admin/tutors?page=${page}&per_page=${perPage}`);
  },

  // Get all tutors without pagination (for filters/dropdowns)
  getAllTutorsForFilter: async () => {
    return await apiRequest(`/admin/tutors/all`);
  },

  verifyTutor: async (tutorId, notes = '') => {
    return await apiRequest(`/admin/tutors/${tutorId}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  },

  unverifyTutor: async (tutorId, notes = '') => {
    return await apiRequest(`/admin/tutors/${tutorId}/unverify`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  },

  getTutorVerificationStatus: async (tutorId) => {
    return await apiRequest(`/tutors/${tutorId}/verification-status`);
  },
};

// Courses APIs
const coursesAPI = {
  // Get all courses
  getAllCourses: async () => {
    return await apiRequest('/courses');
  },

  // Get courses filtered by parameters
  getCourses: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.gradeLevel) queryParams.append('gradeLevel', filters.gradeLevel);
    if (filters.subject) queryParams.append('subject', filters.subject);
    if (filters.level) queryParams.append('level', filters.level);
    if (filters.status) queryParams.append('status', filters.status);
    
    const queryString = queryParams.toString();
    return await apiRequest(`/courses${queryString ? `?${queryString}` : ''}`);
  },

  // Get course by ID
  getCourseById: async (courseId, queryParams = '') => {
    const url = queryParams ? `/courses/${courseId}?${queryParams}` : `/courses/${courseId}`;
    return await apiRequest(url);
  },

  // Create course
  createCourse: async (courseData) => {
    return await apiRequest('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },

  // Update course
  updateCourse: async (courseId, courseData) => {
    return await apiRequest(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  },

  // Delete course
  deleteCourse: async (courseId) => {
    return await apiRequest(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  },

  // Get course modules
  getCourseModules: async (courseId, status = 'active') => {
    return await apiRequest(`/courses/${courseId}/modules?status=${status}`);
  },

  // Get enrolled students
  getEnrolledStudents: async (courseId) => {
    return await apiRequest(`/courses/${courseId}/students`);
  },

  // Enroll student in course
  enrollStudent: async (courseId, studentId) => {
    return await apiRequest(`/courses/${courseId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
  },

  // Assign single tutor to course
  assignTutor: async (courseId, tutorId) => {
    return await apiRequest(`/courses/${courseId}/tutors`, {
      method: 'POST',
      body: JSON.stringify({ tutorId }),
    });
  },

  // Assign multiple tutors to course
  assignTutors: async (courseId, tutorIds) => {
    return await apiRequest(`/courses/${courseId}/tutors`, {
      method: 'POST',
      body: JSON.stringify({ tutorIds }),
    });
  },

  // Bulk manage tutors (assign or remove multiple)
  bulkManageTutors: async (courseId, action, tutorIds) => {
    return await apiRequest(`/courses/${courseId}/tutors/bulk`, {
      method: 'POST',
      body: JSON.stringify({ action, tutorIds }),
    });
  },

  // Get course tutors
  getCourseTutors: async (courseId) => {
    return await apiRequest(`/courses/${courseId}/tutors`);
  },

  // Remove tutor from course
  removeTutor: async (courseId, tutorId) => {
    return await apiRequest(`/courses/${courseId}/tutors/${tutorId}`, {
      method: 'DELETE',
    });
  },

  // Get tutor's assigned courses
  getTutorCourses: async (tutorId) => {
    return await apiRequest(`/tutors/${tutorId}/courses`);
  },

  // Get course sessions
  getCourseSessions: async (courseId) => {
    return await apiRequest(`/courses/${courseId}/sessions`);
  },
};

// Modules APIs
const modulesAPI = {
  // Get module by ID
  getModuleById: async (moduleId) => {
    return await apiRequest(`/modules/${moduleId}`);
  },

  // Create module
  createModule: async (moduleData) => {
    return await apiRequest('/modules', {
      method: 'POST',
      body: JSON.stringify(moduleData),
    });
  },

  // Update module
  updateModule: async (moduleId, moduleData) => {
    return await apiRequest(`/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(moduleData),
    });
  },

  // Delete module
  deleteModule: async (moduleId) => {
    return await apiRequest(`/modules/${moduleId}`, {
      method: 'DELETE',
    });
  },
  // Archive module
  archiveModule: async (moduleId) => {
    return await apiRequest(`/modules/${moduleId}/archive`, {
      method: 'PATCH',
    });
  },
  // Restore module
  restoreModule: async (moduleId) => {
    return await apiRequest(`/modules/${moduleId}/restore`, {
      method: 'PATCH',
    });
  },

  // Get module lessons
  getModuleLessons: async (moduleId) => {
    return await apiRequest(`/modules/${moduleId}/lessons`);
  },

  // Update lesson progress
  updateLessonProgress: async (moduleId, lessonId, progressData) => {
    return await apiRequest(`/modules/${moduleId}/lessons/${lessonId}/progress`, {
      method: 'POST',
      body: JSON.stringify(progressData),
    });
  },
};

// Quizzes APIs
const quizzesAPI = {
  // Get all quizzes
  getAllQuizzes: async (topic = null) => {
    const endpoint = topic ? `/quizzes?topic=${topic}` : '/quizzes';
    return await apiRequest(endpoint);
  },

  // Get quizzes for a module
  getQuizzes: async (moduleId) => {
    return await apiRequest(`/modules/${moduleId}/quizzes`);
  },

  // Get quiz by ID
  getQuizById: async (quizId) => {
    return await apiRequest(`/quizzes/${quizId}`);
  },

  // Create quiz
  createQuiz: async (quizData) => {
    return await apiRequest('/quizzes', {
      method: 'POST',
      body: JSON.stringify(quizData),
    });
  },

  // Create quiz with questions
  createQuizWithQuestions: async (moduleId, quizData) => {
    return await apiRequest(`/modules/${moduleId}/quizzes/with-questions`, {
      method: 'POST',
      body: JSON.stringify(quizData),
    });
  },

  // Generate quiz with AI questions
  generateQuizWithAI: async (moduleId, quizData, lessonId = null) => {
    const endpoint = lessonId 
      ? `/modules/${moduleId}/lessons/${lessonId}/quizzes/generate`
      : `/modules/${moduleId}/quizzes/generate`;
    
    return await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(quizData),
    });
  },

  // Get quizzes for a specific lesson
  getLessonQuizzes: async (lessonId) => {
    return await apiRequest(`/lessons/${lessonId}/quizzes`);
  },

  // Get latest quiz for a lesson
  getLatestLessonQuiz: async (lessonId) => {
    return await apiRequest(`/lessons/${lessonId}/quizzes/latest`);
  },

  // Validate OpenAI configuration
  validateAIConfig: async () => {
    return await apiRequest('/quiz-generator/validate-config');
  },

  // Submit quiz results
  submitQuizResults: async (quizId, results) => {
    return await apiRequest(`/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify(results),
    });
  },

  // Get student quiz results
  getStudentQuizResults: async (studentId, courseId = null) => {
    const endpoint = courseId 
      ? `/students/${studentId}/quiz-results?courseId=${courseId}`
      : `/students/${studentId}/quiz-results`;
    return await apiRequest(endpoint);
  },

  // Get quiz results by course
  getQuizResultsByCourse: async (courseId) => {
    return await apiRequest(`/courses/${courseId}/quiz-results`);
  },

  // Update quiz
  updateQuiz: async (quizId, quizData) => {
    return await apiRequest(`/quizzes/${quizId}`, {
      method: 'PUT',
      body: JSON.stringify(quizData),
    });
  },

  // Delete quiz
  deleteQuiz: async (quizId) => {
    return await apiRequest(`/quizzes/${quizId}`, {
      method: 'DELETE',
    });
  },

  // Archive quiz
  archiveQuiz: async (quizId) => {
    return await apiRequest(`/quizzes/${quizId}/archive`, {
      method: 'PUT',
    });
  },

  // Unarchive quiz
  unarchiveQuiz: async (quizId) => {
    return await apiRequest(`/quizzes/${quizId}/unarchive`, {
      method: 'PUT',
    });
  },

  // Update quiz validity dates (deprecated - use updateQuiz instead)
  updateQuizValidity: async (quizId, validityData) => {
    return await apiRequest(`/quizzes/${quizId}/validity`, {
      method: 'PUT',
      body: JSON.stringify(validityData),
    });
  },
};

// Sessions APIs
const sessionsAPI = {
  // Get upcoming sessions
  getUpcomingSessions: async (userId, userType) => {
    return await apiRequest(`/sessions/upcoming?userId=${userId}&userType=${userType}`);
  },

  // Get session history
  getSessionHistory: async (userId, userType) => {
    // Add cache-busting timestamp to ensure fresh data
    const timestamp = Date.now();
    return await apiRequest(`/sessions/history?userId=${userId}&userType=${userType}&_t=${timestamp}`);
  },

  // Create session
  createSession: async (sessionData) => {
    return await apiRequest('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  // Create multiple sessions for a course (batch creation)
  createBatchSessions: async (courseId, sessionsData) => {
    return await apiRequest(`/courses/${courseId}/sessions/batch`, {
      method: 'POST',
      body: JSON.stringify({ sessions: sessionsData }),
    });
  },

  // Update session
  updateSession: async (sessionId, sessionData) => {
    return await apiRequest(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData),
    });
  },

  // Cancel session (legacy method - redirects to new cancel endpoint)
  cancelSession: async (sessionId, reason = null) => {
    return await apiRequest(`/sessions/${sessionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Delete session
  deleteSession: async (sessionId) => {
    return await apiRequest(`/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  // Submit session feedback
  submitSessionFeedback: async (sessionId, feedback) => {
    return await apiRequest(`/sessions/${sessionId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  },

  // Enroll student in session
  enrollStudent: async (sessionId, studentId) => {
    return await apiRequest(`/sessions/${sessionId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
  },

  // Cancel student enrollment in session
  cancelEnrollment: async (sessionId, studentId) => {
    return await apiRequest(`/sessions/${sessionId}/cancel-enrollment`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    });
  },

  // Create recurring session booking
  createRecurringBooking: async (recurringData) => {
    return await apiRequest('/sessions/recurring/create', {
      method: 'POST',
      body: JSON.stringify(recurringData),
    });
  },

  // Session Status Management Methods
  
  // Start a session (mark as in_progress)
  startSession: async (sessionId) => {
    return await apiRequest(`/sessions/${sessionId}/start`, {
      method: 'POST',
    });
  },

  // Complete a session
  completeSession: async (sessionId, participantsCount = null) => {
    return await apiRequest(`/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ participants_count: participantsCount }),
    });
  },

  // Get session status counts for dashboard
  getSessionStatusCounts: async (tutorId = null) => {
    const params = tutorId ? `?tutor_id=${tutorId}` : '';
    return await apiRequest(`/sessions/status-counts${params}`);
  },

  // Get tutor sessions by status
  getTutorSessions: async (status = 'all') => {
    const params = status !== 'all' ? `?status=${status}` : '';
    return await apiRequest(`/sessions${params}`);
  },
};

// Notifications APIs
const notificationsAPI = {
  // Get user notifications
  getUserNotifications: async (userId) => {
    return await apiRequest(`/users/${userId}/notifications`);
  },

  // Get current user notifications with pagination
  getNotifications: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/notifications?${queryString}` : '/notifications';
    return await apiRequest(url);
  },

  // Mark notification as read
  markNotificationRead: async (notificationId) => {
    return await apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  // Mark all notifications as read
  markAllNotificationsRead: async () => {
    return await apiRequest('/notifications/mark-all-read', {
      method: 'PUT',
    });
  },

  // Create notification
  createNotification: async (notificationData) => {
    return await apiRequest('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    return await apiRequest(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },
};

// Payments & Invoices APIs
const paymentsAPI = {
  // Get all invoices
  getAllInvoices: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return await apiRequest(`/invoices${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get invoice by ID
  getInvoiceById: async (invoiceId) => {
    return await apiRequest(`/invoices/${invoiceId}`);
  },

  // Create invoice
  createInvoice: async (invoiceData) => {
    return await apiRequest('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    });
  },

  // Update invoice status
  updateInvoiceStatus: async (invoiceId, status) => {
    return await apiRequest(`/invoices/${invoiceId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // Process payment
  processPayment: async (paymentData) => {
    return await apiRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  // Get tutor earnings
  getTutorEarnings: async (tutorId) => {
    return await apiRequest(`/tutors/${tutorId}/earnings`);
  },

  // Process tutor payout
  processTutorPayout: async (tutorId, amount) => {
    return await apiRequest(`/tutors/${tutorId}/payout`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },
};

// Zoom API methods
const zoomAPI = {
  // Get Zoom integration status
  getStatus: async () => {
    return await apiRequest('/zoom/status');
  },

  // Create Zoom meeting
  createMeeting: async (meetingData) => {
    return await apiRequest('/zoom/meetings', {
      method: 'POST',
      body: JSON.stringify(meetingData),
    });
  },

  // Get Zoom meeting
  getMeeting: async (meetingId) => {
    return await apiRequest(`/zoom/meetings/${meetingId}`);
  },

  // Update Zoom meeting
  updateMeeting: async (meetingId, updateData) => {
    return await apiRequest(`/zoom/meetings/${meetingId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  },

  // Delete Zoom meeting
  deleteMeeting: async (meetingId) => {
    return await apiRequest(`/zoom/meetings/${meetingId}`, {
      method: 'DELETE',
    });
  },

  // List Zoom meetings
  listMeetings: async (type = 'scheduled') => {
    return await apiRequest(`/zoom/meetings?type=${type}`);
  },

  // Create session meeting
  createSessionMeeting: async (courseData, sessionData) => {
    return await apiRequest('/zoom/sessions/meeting', {
      method: 'POST',
      body: JSON.stringify({
        course_data: courseData,
        session_data: sessionData,
      }),
    });
  },
};

// Analytics & Statistics APIs
const analyticsAPI = {
  // Get dashboard statistics
  getDashboardStats: async (userType, userId = null) => {
    const endpoint = userId 
      ? `/analytics/dashboard/${userType}/${userId}`
      : `/analytics/dashboard/${userType}`;
    return await apiRequest(endpoint);
  },

  // Get admin statistics
  getAdminStats: async () => {
    return await apiRequest('/analytics/admin');
  },

  // Get course analytics
  getCourseAnalytics: async (courseId) => {
    return await apiRequest(`/analytics/courses/${courseId}`);
  },

  // Get tutor performance
  getTutorPerformance: async (tutorId) => {
    return await apiRequest(`/analytics/tutors/${tutorId}`);
  },
};

// Tutor Availability APIs
const availabilityAPI = {
  // Get tutor's availability schedule
  getTutorAvailability: async (tutorId) => {
    return await apiRequest(`/tutors/${tutorId}/availability`);
  },

  // Get course availability for admin/course management
  getCourseAvailability: async (courseId, moduleId = null, startDate = null, endDate = null) => {
    // Validate input parameters
    if (!courseId) {
      throw new Error('courseId is required');
    }

    // Validate date formats if provided
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new Error('startDate must be in YYYY-MM-DD format');
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error('endDate must be in YYYY-MM-DD format');
    }

    // Validate date range logic
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new Error('startDate cannot be after endDate');
    }

    const params = new URLSearchParams();
    if (moduleId) params.append('moduleId', moduleId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = `/courses/${courseId}/availability${queryString ? `?${queryString}` : ''}`;

    console.log(`📅 Fetching course availability: courseId=${courseId}, module=${moduleId}, ${startDate} to ${endDate}`);

    return await apiRequest(url);
  },

  // Get tutor's availability for a specific date range with strict boundary enforcement
  getTutorAvailabilityRange: async (tutorId, startDate, endDate) => {
    // Validate input parameters
    if (!tutorId) {
      throw new Error('tutorId is required');
    }

    // Validate date formats if provided
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new Error('startDate must be in YYYY-MM-DD format');
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error('endDate must be in YYYY-MM-DD format');
    }

    // Validate date range logic
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new Error('startDate cannot be after endDate');
    }

    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    // Only add daysAhead if no endDate is provided
    if (!endDate) {
      params.append('daysAhead', '90');
    }

    const queryString = params.toString();
    const url = `/tutors/${tutorId}/availability/instances${queryString ? `?${queryString}` : ''}`;

    console.log(`📅 Fetching availability with strict boundaries: ${startDate} to ${endDate}`);

    const response = await apiRequest(url);
    // Normalize the availability data for consistent field names
    const normalizedResponse = normalizeAvailabilityResponse(response);

    // Additional client-side boundary enforcement as a safety net
    if (normalizedResponse.availability && Array.isArray(normalizedResponse.availability)) {
      const filteredAvailability = normalizedResponse.availability.filter(item => {
        const instanceDate = item.instance_date || item.instanceDate;
        if (!instanceDate) return false;

        // Check boundaries if both dates are provided
        if (startDate && instanceDate < startDate) {
          console.warn(`⚠️ Filtered out availability before startDate: ${instanceDate}`);
          return false;
        }
        if (endDate && instanceDate > endDate) {
          console.warn(`⚠️ Filtered out availability after endDate: ${instanceDate}`);
          return false;
        }

        return true;
      });

      console.log(`📊 Client-side filtering: ${normalizedResponse.availability.length} -> ${filteredAvailability.length} instances`);
      normalizedResponse.availability = filteredAvailability;
    }

    return normalizedResponse;
  },

  // Save/update tutor's availability schedule
  saveTutorAvailability: async (tutorId, availabilityData) => {
    return await apiRequest(`/tutors/${tutorId}/availability`, {
      method: 'POST',
      body: JSON.stringify({ availability: availabilityData }),
    });
  },

  // Create a single time slot (new endpoint)
  createSingleTimeSlot: async (tutorId, timeSlotData) => {
    return await apiRequest(`/tutors/${tutorId}/availability/timeslot`, {
      method: 'POST',
      body: JSON.stringify(timeSlotData),
    });
  },

  // Update availability for a specific day
  updateDayAvailability: async (tutorId, day, dayData) => {
    return await apiRequest(`/tutors/${tutorId}/availability/day/${day}`, {
      method: 'POST',
      body: JSON.stringify(dayData),
    });
  },

  // Create recurring availability pattern
  createRecurringAvailability: async (data) => {
    return await apiRequest('/availability/recurring', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update a single availability instance
  updateSingleAvailability: async (availabilityId, data) => {
    return await apiRequest(`/availability/${availabilityId}/single`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete a single availability instance
  deleteSingleAvailability: async (availabilityId) => {
    return await apiRequest(`/availability/${availabilityId}/single`, {
      method: 'DELETE',
    });
  },

  // Delete recurring series
  deleteRecurringSeries: async (availabilityId, deleteFutureOnly = true) => {
    return await apiRequest(`/availability/recurring/${availabilityId}?deleteFutureOnly=${deleteFutureOnly}`, {
      method: 'DELETE',
    });
  },
  // Bulk delete multiple availability slots
  bulkDeleteAvailability: async (tutorId, availabilityIds, deleteOption = 'single') => {
    return await apiRequest(`/tutors/${tutorId}/availability/bulk`, {
      method: 'DELETE',
      body: JSON.stringify({
        availability_ids: availabilityIds,
        deleteOption: deleteOption
      }),
    });
  },

  // Check for conflicts
  checkConflicts: async (availabilityId) => {
    return await apiRequest(`/availability/${availabilityId}/conflicts`);
  },

  // Get tutor availability with conflict information and strict boundary enforcement
  getTutorAvailabilityWithConflicts: async (tutorId, startDate = null, endDate = null) => {
    // Validate input parameters
    if (!tutorId) {
      throw new Error('tutorId is required');
    }

    // Validate date formats if provided
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new Error('startDate must be in YYYY-MM-DD format');
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error('endDate must be in YYYY-MM-DD format');
    }

    // Validate date range logic
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new Error('startDate cannot be after endDate');
    }

    let endpoint = `/tutors/${tutorId}/availability/instances`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    // Only add daysAhead if no endDate is provided
    if (!endDate) {
      params.append('daysAhead', '90');
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    console.log(`📅 Fetching availability with conflicts within boundaries: ${startDate} to ${endDate}`);

    const response = await apiRequest(endpoint);
    // Normalize the availability data for consistent field names
    const normalizedResponse = normalizeAvailabilityResponse(response);

    // Additional client-side boundary enforcement as a safety net
    if (normalizedResponse.availability && Array.isArray(normalizedResponse.availability)) {
      const filteredAvailability = normalizedResponse.availability.filter(item => {
        const instanceDate = item.instance_date || item.instanceDate;
        if (!instanceDate) return false;

        // Check boundaries if both dates are provided
        if (startDate && instanceDate < startDate) {
          console.warn(`⚠️ Filtered out availability before startDate: ${instanceDate}`);
          return false;
        }
        if (endDate && instanceDate > endDate) {
          console.warn(`⚠️ Filtered out availability after endDate: ${instanceDate}`);
          return false;
        }

        return true;
      });

      console.log(`📊 Client-side filtering: ${normalizedResponse.availability.length} -> ${filteredAvailability.length} instances`);
      normalizedResponse.availability = filteredAvailability;
    }

    return normalizedResponse;
  },
};

// Student-specific APIs
const studentAPI = {
  // Request guardian
  requestGuardian: async (guardianId, data) => {
    return await apiRequest(`/student/request-guardian/${guardianId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Guardian-specific APIs
const guardianAPI = {
  // Get guardian's students
  getGuardianStudents: async () => {
    return await apiRequest('/guardian/students');
  },

  // Allocate credits to student
  allocateCredits: async (guardianId, studentId, credits) => {
    return await apiRequest(`/guardians/${guardianId}/allocate-credits`, {
      method: 'POST',
      body: JSON.stringify({ studentId, credits }),
    });
  },

  // Get credit transactions
  getCreditTransactions: async (guardianId) => {
    return await apiRequest(`/guardians/${guardianId}/credit-transactions`);
  },

  // Approve course enrollment
  approveCourseEnrollment: async (guardianId, enrollmentId) => {
    return await apiRequest(`/guardians/${guardianId}/approve-enrollment`, {
      method: 'POST',
      body: JSON.stringify({ enrollmentId }),
    });
  },

  // Get student session feedback for guardian
  getStudentFeedback: async (guardianId) => {
    return await apiRequest(`/admin/guardian-feedback/${guardianId}`);
  },

  // Link student to guardian
  linkStudent: async (guardianEmail, studentId) => {
    return await apiRequest('/guardians/link-student', {
      method: 'POST',
      body: JSON.stringify({ 
        guardianEmail: guardianEmail,
        studentId: studentId 
      }),
    });
  },

  // Unlink student from guardian
  unlinkStudent: async (studentId) => {
    return await apiRequest('/guardians/unlink-student', {
      method: 'POST',
      body: JSON.stringify({ studentId: studentId }),
    });
  },

  // Get pending student requests
  getPendingRequests: async () => {
    return await apiRequest('/guardian/pending-requests?status=pending');
  },

  // Approve student request
  approveRequest: async (requestId, data) => {
    return await apiRequest(`/guardian/approve-request/${requestId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Reject student request
  rejectRequest: async (requestId, data) => {
    return await apiRequest(`/guardian/reject-request/${requestId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Search guardians
  searchGuardians: async (query) => {
    return await apiRequest(`/guardian/search?q=${encodeURIComponent(query)}`);
  },
};

// File Upload APIs
const filesAPI = {
  // Upload file
  uploadFile: async (file, metadata = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    return await apiRequest('/files/upload', {
      method: 'POST',
      headers: {}, // Remove Content-Type to let browser set it for FormData
      body: formData,
    });
  },

  // Delete file
  deleteFile: async (fileId) => {
    return await apiRequest(`/files/${fileId}`, {
      method: 'DELETE',
    });
  },

  // Get file metadata
  getFileMetadata: async (fileId) => {
    return await apiRequest(`/files/${fileId}/metadata`);
  },
};

// Enrollments APIs
const enrollmentsAPI = {
  // Get enrollments for current user
  getEnrollments: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return await apiRequest(`/enrollments${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get specific enrollment
  getEnrollmentById: async (enrollmentId) => {
    return await apiRequest(`/enrollments/${enrollmentId}`);
  },

  // Approve enrollment
  approveEnrollment: async (enrollmentId) => {
    return await apiRequest(`/enrollments/${enrollmentId}/approve`, {
      method: 'POST',
    });
  },

  // Reject enrollment
  rejectEnrollment: async (enrollmentId) => {
    return await apiRequest(`/enrollments/${enrollmentId}/reject`, {
      method: 'POST',
    });
  },

  // Update enrollment progress
  updateProgress: async (enrollmentId, progressData) => {
    return await apiRequest(`/enrollments/${enrollmentId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(progressData),
    });
  },

  // Delete enrollment
  deleteEnrollment: async (enrollmentId) => {
    return await apiRequest(`/enrollments/${enrollmentId}`, {
      method: 'DELETE',
    });
  },

  // Get student enrollments
  getStudentEnrollments: async (studentId) => {
    return await apiRequest(`/enrollments/student/${studentId}`);
  },
};

// Lessons APIs
const lessonsAPI = {
  // Get lesson by ID
  getLessonById: async (lessonId) => {
    return await apiRequest(`/lessons/${lessonId}`);
  },

  // Create lesson
  createLesson: async (moduleId, lessonData) => {
    return await apiRequest(`/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(lessonData),
    });
  },

  // Update lesson
  updateLesson: async (lessonId, lessonData) => {
    return await apiRequest(`/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(lessonData),
    });
  },

  // Delete lesson
  deleteLesson: async (lessonId) => {
    return await apiRequest(`/lessons/${lessonId}`, {
      method: 'DELETE',
    });
  },

  // Get lesson sessions
  getLessonSessions: async (lessonId) => {
    return await apiRequest(`/lessons/${lessonId}/sessions`);
  },

  // Book a session
  bookSession: async (sessionId, userId) => {
    return await apiRequest(`/sessions/${sessionId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ studentId: userId }),
    });
  },

  // Cancel session booking
  cancelBooking: async (sessionId, userId) => {
    return await apiRequest(`/sessions/${sessionId}/unenroll`, {
      method: 'POST',
      body: JSON.stringify({ studentId: userId }),
    });
  },

  // Get user's booked sessions
  getUserBookings: async (userId) => {
    return await apiRequest(`/users/${userId}/bookings`);
  },
};

// Admin APIs
const adminAPI = {
  // Get all AI prompts
  getPrompts: async () => {
    return await apiRequest('/admin/prompts');
  },

  // Create new AI prompt
  createPrompt: async (promptData) => {
    return await apiRequest('/admin/prompts', {
      method: 'POST',
      body: JSON.stringify(promptData),
    });
  },

  // Update AI prompt
  updatePrompt: async (promptName, promptData) => {
    return await apiRequest(`/admin/prompts/${promptName}`, {
      method: 'PUT',
      body: JSON.stringify(promptData),
    });
  },

  // Get system configuration
  getSystemConfig: async () => {
    return await apiRequest('/admin/system-config');
  },

  // Update system configuration
  updateSystemConfig: async (configData) => {
    return await apiRequest('/admin/system-config', {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  },

  // Get feedback statistics
  getFeedbackStats: async () => {
    return await apiRequest('/admin/feedback-stats');
  },

  // Get session processor status
  getProcessorStatus: async () => {
    return await apiRequest('/admin/session-processor/status');
  },

  // Restart session processor
  restartProcessor: async () => {
    return await apiRequest('/admin/session-processor/restart', {
      method: 'POST',
    });
  },

  // Validate AI service
  validateAIService: async () => {
    return await apiRequest('/admin/ai-service/validate');
  },

  // Initialize default prompts
  initializeDefaultPrompts: async () => {
    return await apiRequest('/admin/prompts/initialize-defaults', {
      method: 'POST',
    });
  },

  // Email-based password reset
  resetUserPasswordByEmail: async (userId, notifyUser = true) => {
    return await apiRequest(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ 
        method: 'email',
        notify_user: notifyUser 
      }),
    });
  },

  // Generate temporary password
  generateTemporaryPassword: async (userId, passwordLength = 12) => {
    return await apiRequest(`/admin/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ 
        method: 'temp',
        password_length: passwordLength 
      }),
    });
  },

  // Add credits to guardian
  addCreditsToGuardian: async (guardianId, amount, reason = 'Manual credit addition by admin') => {
    return await apiRequest('/credits/add', {
      method: 'POST',
      body: JSON.stringify({
        guardian_id: guardianId,
        amount: parseFloat(amount),
        reason: reason
      }),
    });
  },

  // === MULTI-ROLE TUTOR MANAGEMENT APIs ===

  // Course Settings Management
  getCourseSettings: async (courseId) => {
    return await apiRequest(`/admin/courses/${courseId}/settings`);
  },

  updateCourseSettings: async (courseId, settings) => {
    return await apiRequest(`/admin/courses/${courseId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  getAllCourseSettings: async () => {
    return await apiRequest('/admin/courses/settings');
  },

  // Tutor Qualification Management
  getTutorQualifications: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.courseId) queryParams.append('course_id', filters.courseId);
    if (filters.userId) queryParams.append('user_id', filters.userId);
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const queryString = queryParams.toString();
    return await apiRequest(`/admin/tutors/qualifications${queryString ? `?${queryString}` : ''}`);
  },

  manuallyQualifyTutor: async (userEmail, courseId, qualificationData) => {
    return await apiRequest('/admin/tutors/qualify', {
      method: 'POST',
      body: JSON.stringify({
        user_email: userEmail,
        course_id: courseId,
        qualification_type: 'manual',
        score: qualificationData.score || null,
        reason: qualificationData.reason || 'Manual qualification by admin',
        notes: qualificationData.notes || ''
      }),
    });
  },

  revokeTutorQualification: async (qualificationId, reason) => {
    return await apiRequest(`/admin/tutors/qualifications/${qualificationId}`, {
      method: 'DELETE',
      body: JSON.stringify({
        reason: reason || 'Qualification revoked by admin'
      }),
    });
  },

  restoreTutorQualification: async (qualificationId, reason) => {
    return await apiRequest(`/admin/tutors/qualifications/${qualificationId}/restore`, {
      method: 'POST',
      body: JSON.stringify({
        reason: reason || 'Qualification restored by admin'
      }),
    });
  },

  // Bulk Import Management
  bulkImportTutors: async (csvData, options = {}) => {
    return await apiRequest('/admin/tutors/bulk-import', {
      method: 'POST',
      body: JSON.stringify({
        csv_data: csvData,
        dry_run: options.dryRun || false,
        notification_email: options.notificationEmail || null,
        import_settings: {
          skip_existing: options.skipExisting || false,
          auto_qualify: options.autoQualify !== false,
          default_qualification_type: 'bulk_import'
        }
      }),
    });
  },

  bulkImportTutorsFromFile: async (file, options = {}) => {
    const formData = new FormData();
    formData.append('csv_file', file);
    formData.append('dry_run', options.dryRun || false);
    formData.append('skip_existing', options.skipExisting || false);
    formData.append('auto_qualify', options.autoQualify !== false);
    if (options.notificationEmail) {
      formData.append('notification_email', options.notificationEmail);
    }

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:80/api';
    const token = sessionStorage.getItem('authToken');

    const config = {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/admin/tutors/bulk-import-file`, config);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Bulk import file upload failed:', error);
      throw error;
    }
  },

  // Bulk Import Job Management
  getBulkImportJob: async (jobId) => {
    return await apiRequest(`/admin/bulk-import-jobs/${jobId}`);
  },

  getBulkImportJobs: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.importedBy) queryParams.append('imported_by', filters.importedBy);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const queryString = queryParams.toString();
    return await apiRequest(`/admin/bulk-import-jobs${queryString ? `?${queryString}` : ''}`);
  },

  cancelBulkImportJob: async (jobId) => {
    return await apiRequest(`/admin/bulk-import-jobs/${jobId}/cancel`, {
      method: 'POST',
    });
  },

  retryBulkImportJob: async (jobId) => {
    return await apiRequest(`/admin/bulk-import-jobs/${jobId}/retry`, {
      method: 'POST',
    });
  },

  // Qualification History and Audit
  getQualificationHistory: async (qualificationId) => {
    return await apiRequest(`/admin/tutors/qualifications/${qualificationId}/history`);
  },

  getQualificationAuditLog: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.userId) queryParams.append('user_id', filters.userId);
    if (filters.courseId) queryParams.append('course_id', filters.courseId);
    if (filters.action) queryParams.append('action', filters.action);
    if (filters.startDate) queryParams.append('start_date', filters.startDate);
    if (filters.endDate) queryParams.append('end_date', filters.endDate);
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const queryString = queryParams.toString();
    return await apiRequest(`/admin/qualification-audit${queryString ? `?${queryString}` : ''}`);
  },

  // Validation and Preview
  validateCsvData: async (csvData) => {
    return await apiRequest('/admin/tutors/validate-csv', {
      method: 'POST',
      body: JSON.stringify({
        csv_data: csvData
      }),
    });
  },

  previewBulkImport: async (csvData) => {
    return await apiRequest('/admin/tutors/bulk-import', {
      method: 'POST',
      body: JSON.stringify({
        csv_data: csvData,
        dry_run: true
      }),
    });
  },
};

// Credits Management APIs
// Helper function to normalize credit API responses
const normalizeCreditResponse = (response) => {
  console.log('=== Credit Response Normalization Debug ===');
  console.log('Raw credit response received:', response);
  console.log('response.success:', response.success);
  console.log('response.data:', response.data);
  console.log('response.credit_balance:', response.credit_balance);
  
  // Handle success response with nested data structure
  if (response.success && response.data && response.data.credit_balance) {
    // Backend returns { success: true, data: { credit_balance: {...} } }
    console.log('✅ Using nested credit_balance format normalization');
    const creditBalance = response.data.credit_balance;
    console.log('Processing nested credit_balance format:', creditBalance);
    return {
      success: true,
      data: {
        total_credits: creditBalance.totalCredits || creditBalance.total_credits || 0,
        used_credits: creditBalance.usedCredits || creditBalance.used_credits || 0,
        available_credits: creditBalance.availableCredits || creditBalance.available_credits || 0,
        student_allocations: response.data.student_allocations || [],
        last_updated: creditBalance.lastUpdated || creditBalance.last_updated || null
      }
    };
  }
  
  // Handle direct payments.py response format: { credit_balance: {...} }
  if (response.credit_balance && !response.success) {
    // Backend returns { credit_balance: {...} } directly
    console.log('⚠️ Using direct credit_balance format normalization (legacy)');
    const creditBalance = response.credit_balance;
    console.log('Processing direct credit_balance format:', creditBalance);
    return {
      success: true,
      data: {
        total_credits: creditBalance.totalCredits || creditBalance.total_credits || 0,
        used_credits: creditBalance.usedCredits || creditBalance.used_credits || 0,
        available_credits: creditBalance.availableCredits || creditBalance.available_credits || 0,
        student_allocations: response.student_allocations || [],
        last_updated: creditBalance.lastUpdated || creditBalance.last_updated || null
      }
    };
  }
  
  // Handle direct backend response format
  if (response.creditBalance || response.studentAllocations !== undefined) {
    // Backend returns { creditBalance: {...}, studentAllocations: [...] }
    const creditBalance = response.creditBalance || {};
    // console.log('Processing direct creditBalance format:', creditBalance);
    return {
      success: true,
      data: {
        total_credits: creditBalance.totalCredits || 0,
        used_credits: creditBalance.usedCredits || 0,
        available_credits: creditBalance.availableCredits || 0,
        student_allocations: response.studentAllocations || [],
        last_updated: creditBalance.lastUpdated || null
      }
    };
  }
  
  // Handle error responses
  if (response.error) {
    return {
      success: false,
      message: response.error
    };
  }
  
  // Handle success responses that already have the expected format
  if (response.success !== undefined && response.data) {
    console.log('✅ Response already in expected format');
    console.log('Final normalized response:', response);
    console.log('=== End Credit Response Normalization ===');
    return response;
  }
  
  // Default success response
  console.log('🔄 Using default success response wrapper');
  const defaultResponse = {
    success: true,
    data: response
  };
  console.log('Final normalized response:', defaultResponse);
  console.log('=== End Credit Response Normalization ===');
  return defaultResponse;
};

const creditsAPI = {
  // Get guardian's simple credit balance (for dashboard)
  getGuardianCreditBalance: async (guardianId) => {
    const rawResponse = await apiRequest(`/credits/balance/${guardianId}`);
    // console.log('Raw API response before normalization:', rawResponse);
    const normalizedResponse = normalizeCreditResponse(rawResponse);
    // console.log('Normalized response:', normalizedResponse);
    return normalizedResponse;
  },

  // Get guardian's detailed credit balance with student allocations (for admin)
  getGuardianDetailedCredits: async (guardianId) => {
    const rawResponse = await apiRequest(`/credits/balance/${guardianId}/detailed`);
    // console.log('Raw detailed API response:', rawResponse);
    const normalizedResponse = normalizeCreditResponse(rawResponse);
    // console.log('Normalized detailed response:', normalizedResponse);
    return normalizedResponse;
  },

  // Allocate credits from guardian to student
  allocateCreditsToStudent: async (studentId, credits, reason = 'Manual allocation') => {
    const response = await apiRequest('/credits/allocate', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        credits: parseFloat(credits),
        reason: reason
      }),
    });
    return normalizeCreditResponse(response);
  },


  // Get all student credit allocations for a guardian
  getStudentAllocations: async (guardianId) => {
    return await apiRequest(`/credits/allocations/${guardianId}`);
  },

  // Use credits from student allocation
  useStudentCredits: async (studentId, credits, usageType = 'general', description = 'Credit usage', sessionId = null, enrollmentId = null) => {
    return await apiRequest('/credits/use', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        credits: parseFloat(credits),
        usage_type: usageType,
        description: description,
        session_id: sessionId,
        enrollment_id: enrollmentId
      }),
    });
  },

  // Transfer credits between students
  transferCreditsBetweenStudents: async (fromStudentId, toStudentId, credits, reason = 'Credit transfer') => {
    return await apiRequest('/credits/transfer', {
      method: 'POST',
      body: JSON.stringify({
        from_student_id: fromStudentId,
        to_student_id: toStudentId,
        credits: parseFloat(credits),
        reason: reason
      }),
    });
  },

  // Get credit transaction history for a guardian
  getCreditTransactions: async (guardianId, page = 1, perPage = 20) => {
    return await apiRequest(`/credits/transactions/${guardianId}?page=${page}&per_page=${perPage}`);
  },

  // Get credit history (legacy endpoint for payment history)
  getCreditHistory: async (guardianId, page = 1, perPage = 20) => {
    return await apiRequest(`/credits/history/${guardianId}?page=${page}&per_page=${perPage}`);
  },
};

// Environment API
const environmentAPI = {
  // Get all environment variables (admin only)
  getAllVariables: async (maskSensitive = true) => {
    return await apiRequest(`/environment/variables?mask_sensitive=${maskSensitive}`);
  },

  // Update a single environment variable (admin only)
  updateVariable: async (variableName, value) => {
    return await apiRequest(`/environment/variables/${variableName}`, {
      method: 'PUT',
      body: JSON.stringify({
        value: value
      }),
    });
  },

  // Update multiple environment variables (admin only)
  updateMultipleVariables: async (variables) => {
    return await apiRequest('/environment/variables', {
      method: 'PUT',
      body: JSON.stringify({
        variables: variables
      }),
    });
  },

  // Validate environment setup (admin only)
  validateEnvironment: async () => {
    return await apiRequest('/environment/validation');
  },

  // Unmask a sensitive environment variable (admin only)
  unmaskVariable: async (variableName) => {
    return await apiRequest(`/environment/unmask/${variableName}`, {
      method: 'POST',
    });
  },

  // Get environment categories and sensitive keys (admin only)
  getCategories: async () => {
    return await apiRequest('/environment/categories');
  },
};

// Student Tasks APIs
const studentTasksAPI = {
  // Get upcoming tasks for student
  getUpcomingTasks: async () => {
    return await apiRequest('/students/upcoming-tasks');
  },

  // Get task summary for dashboard
  getTaskSummary: async () => {
    return await apiRequest('/students/task-summary');
  },
};

// System Settings APIs
const systemSettingsAPI = {
  // Get all system settings (admin only)
  getAllSettings: () => apiRequest('/system-settings'),
  
  // Get specific setting
  getSetting: (settingKey) => apiRequest(`/system-settings/${settingKey}`),
  
  // Update setting (admin only)
  updateSetting: (settingKey, data) => apiRequest(`/system-settings/${settingKey}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // Create new setting (admin only)
  createSetting: (data) => apiRequest('/system-settings', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // Delete setting (admin only)
  deleteSetting: (settingKey) => apiRequest(`/system-settings/${settingKey}`, {
    method: 'DELETE'
  }),
  
  // Specific hourly rate endpoints
  getHourlyRate: () => apiRequest('/system-settings/hourly-rate'),
  updateHourlyRate: (data) => apiRequest('/system-settings/hourly-rate', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
};

// Earnings APIs
const earningsAPI = {
  // Get comprehensive earnings data for a tutor
  getTutorEarnings: (tutorId) => apiRequest(`/tutors/${tutorId}/earnings`),
  
  // Get weekly earnings (potential and actual)
  getWeeklyEarnings: (tutorId) => apiRequest(`/tutors/${tutorId}/earnings/weekly`),
  
  // Get monthly earnings
  getMonthlyEarnings: (tutorId) => apiRequest(`/tutors/${tutorId}/earnings/monthly`),
  
  // Get total lifetime earnings
  getTotalEarnings: (tutorId) => apiRequest(`/tutors/${tutorId}/earnings/total`),
  
  // Get upcoming sessions for the week
  getUpcomingSessions: (tutorId) => apiRequest(`/tutors/${tutorId}/sessions/upcoming`),
  
  // Get current tutor's earnings (convenience method)
  getMyEarnings: () => apiRequest('/tutors/my-earnings'),
  
  // Admin - get system-wide earnings overview
  getEarningsOverview: () => apiRequest('/admin/earnings/overview')
};

// Chat APIs
const chatAPI = {
  // Get chat system status
  getStatus: () => apiRequest('/chat/status'),
  
  // Admin - get all chats with filtering
  getAllChatsAdmin: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.courseId) params.append('course_id', filters.courseId);
    if (filters.tutorId) params.append('tutor_id', filters.tutorId);
    if (filters.studentId) params.append('student_id', filters.studentId);
    if (filters.page) params.append('page', filters.page);
    if (filters.perPage) params.append('per_page', filters.perPage);
    
    const queryString = params.toString();
    return apiRequest(`/chat/admin/all${queryString ? '?' + queryString : ''}`);
  },
  
  // Get or create course chat
  getCourseChat: (courseId) => apiRequest(`/chat/courses/${courseId}/chat`),
  
  // Get chat messages for a course
  getChatMessages: (courseId, page = 1, perPage = 50) => {
    const params = new URLSearchParams({ page, per_page: perPage });
    return apiRequest(`/chat/courses/${courseId}/messages?${params}`);
  },
  
  // Send a message to course chat
  sendMessage: (courseId, messageData) => apiRequest(`/chat/courses/${courseId}/messages`, {
    method: 'POST',
    body: JSON.stringify(messageData)
  }),
  
  // Mark message as read
  markMessageRead: (messageId) => apiRequest(`/chat/messages/${messageId}/read`, {
    method: 'POST'
  }),
  
  // Get user conversations
  getUserConversations: () => apiRequest('/chat/user/conversations')
};

// Qualifications APIs
const qualificationsAPI = {
  // Get tutor qualifications for a specific tutor
  getTutorQualifications: async (tutorId) => {
    return await apiRequest(`/tutor-qualifications/user/${tutorId}`);
  },

  // Get all tutor qualifications (admin only)
  getAllTutorQualifications: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return await apiRequest(`/admin/tutors/qualifications${queryParams ? `?${queryParams}` : ''}`);
  },
};

// Export all APIs as default
const API = {
  auth: authAPI,
  users: usersAPI,
  courses: coursesAPI,
  modules: modulesAPI,
  lessons: lessonsAPI,
  quizzes: quizzesAPI,
  sessions: sessionsAPI,
  notifications: notificationsAPI,
  payments: paymentsAPI,
  analytics: analyticsAPI,
  student: studentAPI,
  guardian: guardianAPI,
  files: filesAPI,
  enrollments: enrollmentsAPI,
  availability: availabilityAPI,
  zoom: zoomAPI,
  admin: adminAPI,
  credits: creditsAPI,
  environment: environmentAPI,
  studentTasks: studentTasksAPI,
  systemSettings: systemSettingsAPI,
  earnings: earningsAPI,
  chat: chatAPI,
  qualifications: qualificationsAPI,
};

export default API;
export { apiRequest, API_BASE_URL };