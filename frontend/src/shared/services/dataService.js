// Data Service Layer - Handles data synchronization, caching, and state management
import API from './api';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

// Cache key generators
const getCacheKey = (endpoint, params = {}) => {
  const paramString = Object.keys(params).length 
    ? `?${new URLSearchParams(params).toString()}` 
    : '';
  return `${endpoint}${paramString}`;
};

// Cache utilities
const setCache = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

const getCache = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
  if (isExpired) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

const clearCache = (pattern = null) => {
  if (!pattern) {
    cache.clear();
    return;
  }
  
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

// Data Service Class
class DataService {
  constructor() {
    this.listeners = new Map();
    this.loadingStates = new Map();
    this.errorStates = new Map();
  }

  // Event subscription system
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  // Emit events to subscribers
  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  // Loading state management
  setLoading(key, isLoading) {
    this.loadingStates.set(key, isLoading);
    this.emit('loading', { key, isLoading });
  }

  getLoading(key) {
    return this.loadingStates.get(key) || false;
  }

  // Error state management
  setError(key, error) {
    this.errorStates.set(key, error);
    this.emit('error', { key, error });
  }

  getError(key) {
    return this.errorStates.get(key) || null;
  }

  clearError(key) {
    this.errorStates.delete(key);
    this.emit('error', { key, error: null });
  }

  // Generic data fetching with caching
  async fetchData(cacheKey, fetchFunction, options = {}) {
    const { useCache = true, forceRefresh = false } = options;

    // Check cache first
    if (useCache && !forceRefresh) {
      const cachedData = getCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Set loading state
    this.setLoading(cacheKey, true);
    this.clearError(cacheKey);

    try {
      const data = await fetchFunction();
      
      // Cache the data
      if (useCache) {
        setCache(cacheKey, data);
      }
      
      this.setLoading(cacheKey, false);
      this.emit('dataUpdate', { key: cacheKey, data });
      
      return data;
    } catch (error) {
      this.setLoading(cacheKey, false);
      this.setError(cacheKey, error);
      throw error;
    }
  }

  // Authentication methods
  async login(credentials) {
    try {
      const response = await API.auth.login(credentials);
      this.emit('authChange', { user: response.user, token: response.token });
      clearCache(); // Clear all cached data on login
      return response;
    } catch (error) {
      this.emit('authError', error);
      throw error;
    }
  }

  async logout() {
    try {
      // Call logout API endpoint
      await API.auth.logout();
      
      // Clear all session and local storage data
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('currentUser');
      localStorage.removeItem('user');
      
      // Clear all cached data
      clearCache();
      
      // Emit auth change event
      this.emit('authChange', { user: null, token: null });
      
      // Show logout confirmation
      // Note: This will be handled by the useAuth hook to show UI confirmation
      
      return { success: true, message: 'Successfully logged out' };
      
    } catch (error) {
      // console.error('Logout error:', error);
      
      // Even if API call fails, still clear local data
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('currentUser');
      localStorage.removeItem('user');
      clearCache();
      this.emit('authChange', { user: null, token: null });
      
      return { success: true, message: 'Logged out (with errors)' };
    }
  }

  async register(userData) {
    try {
      const response = await API.auth.register(userData);
      this.emit('authChange', { user: response.user, token: response.token });
      clearCache(); // Clear all cached data on successful registration
      return response;
    } catch (error) {
      this.emit('authError', error);
      throw error;
    }
  }

  async switchRole(role) {
    try {
      const response = await API.auth.switchRole(role);
      // Update current user with new role information
      if (response.user) {
        this.emit('authChange', { user: response.user, token: response.access_token });
      }
      clearCache(); // Clear cached data to ensure fresh data for new role
      return response;
    } catch (error) {
      this.emit('authError', error);
      throw error;
    }
  }

  // User data methods
  async getCurrentUser(forceRefresh = false) {
    const cacheKey = 'currentUser';
    return this.fetchData(cacheKey, async () => {
      // If force refresh, get fresh data from backend
      if (forceRefresh) {
        try {
          return await API.auth.getCurrentUser();
        } catch (error) {
          // Fallback to sessionStorage if API call fails
          const userData = sessionStorage.getItem('currentUser');
          return userData ? JSON.parse(userData) : null;
        }
      }

      // Try sessionStorage first
      const userData = sessionStorage.getItem('currentUser');
      if (userData) {
        return JSON.parse(userData);
      }

      // If no sessionStorage data, fetch from backend
      try {
        return await API.auth.getCurrentUser();
      } catch (error) {
        // Return null if both sessionStorage and API fail
        return null;
      }
    }, { forceRefresh });
  }

  async getAllUsers(userType = null, forceRefresh = false) {
    const cacheKey = getCacheKey('users', { type: userType });
    return this.fetchData(cacheKey, () => API.users.getAllUsers(userType), { forceRefresh });
  }

  async getUserById(userId) {
    const cacheKey = `user_${userId}`;
    return this.fetchData(cacheKey, () => API.users.getUserById(userId));
  }

  async updateUser(userId, userData) {
    try {
      const updatedUser = await API.users.updateUser(userId, userData);
      clearCache('user'); // Clear individual user cache
      clearCache('users'); // Clear users list cache
      this.emit('userUpdate', { userId, data: updatedUser });
      return updatedUser;
    } catch (error) {
      this.setError(`updateUser_${userId}`, error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      await API.users.deleteUser(userId);
      clearCache('user'); // Clear user-related cache
      this.emit('userDelete', { userId });
    } catch (error) {
      this.setError(`deleteUser_${userId}`, error);
      throw error;
    }
  }

  // Course data methods
  async getAllCourses() {
    const cacheKey = 'courses';
    return this.fetchData(cacheKey, () => API.courses.getAllCourses());
  }

  async getCourseById(courseId) {
    const cacheKey = `course_${courseId}`;
    return this.fetchData(cacheKey, () => API.courses.getCourseById(courseId));
  }

  async createCourse(courseData) {
    try {
      const newCourse = await API.courses.createCourse(courseData);
      clearCache('course'); // Clear course-related cache
      this.emit('courseCreate', { data: newCourse });
      return newCourse;
    } catch (error) {
      this.setError('createCourse', error);
      throw error;
    }
  }

  async updateCourse(courseId, courseData) {
    try {
      const updatedCourse = await API.courses.updateCourse(courseId, courseData);
      clearCache('course'); // Clear course-related cache
      this.emit('courseUpdate', { courseId, data: updatedCourse });
      return updatedCourse;
    } catch (error) {
      this.setError(`updateCourse_${courseId}`, error);
      throw error;
    }
  }

  async deleteCourse(courseId) {
    try {
      await API.courses.deleteCourse(courseId);
      clearCache('course'); // Clear course-related cache
      this.emit('courseDelete', { courseId });
    } catch (error) {
      this.setError(`deleteCourse_${courseId}`, error);
      throw error;
    }
  }

  // Session data methods
  async getUpcomingSessions(userId, userType) {
    const cacheKey = getCacheKey('sessions_upcoming', { userId, userType });
    return this.fetchData(cacheKey, () => API.sessions.getUpcomingSessions(userId, userType));
  }

  async getSessionHistory(userId, userType) {
    const cacheKey = getCacheKey('sessions_history', { userId, userType });
    return this.fetchData(cacheKey, () => API.sessions.getSessionHistory(userId, userType));
  }

  // Quiz data methods
  async getAllQuizzes(topic = null) {
    const cacheKey = getCacheKey('quizzes', { topic });
    return this.fetchData(cacheKey, () => API.quizzes.getAllQuizzes(topic));
  }

  async getQuizById(quizId) {
    const cacheKey = `quiz_${quizId}`;
    return this.fetchData(cacheKey, () => API.quizzes.getQuizById(quizId));
  }

  async submitQuizResults(quizId, results) {
    try {
      const response = await API.quizzes.submitQuizResults(quizId, results);
      clearCache('quiz'); // Clear quiz-related cache
      this.emit('quizSubmit', { quizId, results: response });
      return response;
    } catch (error) {
      this.setError(`submitQuiz_${quizId}`, error);
      throw error;
    }
  }

  async getStudentQuizResults(studentId, courseId = null) {
    const cacheKey = getCacheKey('quiz_results', { studentId, courseId });
    return this.fetchData(cacheKey, () => API.quizzes.getStudentQuizResults(studentId, courseId));
  }

  // Enrollment methods
  async getEnrollments(filters = {}) {
    const cacheKey = getCacheKey('enrollments', filters);
    return this.fetchData(cacheKey, () => API.enrollments.getEnrollments(filters));
  }

  async getEnrollmentById(enrollmentId) {
    const cacheKey = `enrollment_${enrollmentId}`;
    return this.fetchData(cacheKey, () => API.enrollments.getEnrollmentById(enrollmentId));
  }

  async updateEnrollmentProgress(enrollmentId, progressData) {
    try {
      const response = await API.enrollments.updateProgress(enrollmentId, progressData);
      clearCache('enrollment'); // Clear enrollment cache
      this.emit('enrollmentProgressUpdated', { enrollmentId, progressData });
      return response;
    } catch (error) {
      this.setError(`updateProgress_${enrollmentId}`, error);
      throw error;
    }
  }

  // Notification methods
  async getUserNotifications(userId) {
    const cacheKey = `notifications_${userId}`;
    return this.fetchData(cacheKey, () => API.notifications.getUserNotifications(userId));
  }

  async markNotificationRead(notificationId) {
    try {
      await API.notifications.markNotificationRead(notificationId);
      clearCache('notification'); // Clear notification cache
      this.emit('notificationUpdate', { notificationId, read: true });
    } catch (error) {
      this.setError(`markNotificationRead_${notificationId}`, error);
      throw error;
    }
  }

  // Analytics methods
  async getDashboardStats(userType, userId = null) {
    const cacheKey = getCacheKey('dashboard_stats', { userType, userId });
    return this.fetchData(cacheKey, () => API.analytics.getDashboardStats(userType, userId));
  }

  async getAdminStats() {
    const cacheKey = 'admin_stats';
    return this.fetchData(cacheKey, () => API.analytics.getAdminStats());
  }

  // Payment methods
  async getAllInvoices(filters = {}) {
    const cacheKey = getCacheKey('invoices', filters);
    return this.fetchData(cacheKey, () => API.payments.getAllInvoices(filters));
  }

  async getTutorEarnings(tutorId) {
    const cacheKey = `tutor_earnings_${tutorId}`;
    return this.fetchData(cacheKey, () => API.payments.getTutorEarnings(tutorId));
  }

  async processTutorPayout(tutorId, amount) {
    try {
      const response = await API.payments.processTutorPayout(tutorId, amount);
      clearCache(`tutor_earnings_${tutorId}`); // Clear earnings cache
      this.emit('payoutProcessed', { tutorId, amount });
      return response;
    } catch (error) {
      this.setError(`payout_${tutorId}`, error);
      throw error;
    }
  }

  // Guardian-specific methods
  async getGuardianStudents() {
    const cacheKey = 'guardian_students';
    return this.fetchData(cacheKey, () => API.guardian.getGuardianStudents());
  }

  async approveCourseEnrollment(guardianId, enrollmentId) {
    try {
      await API.guardian.approveCourseEnrollment(guardianId, enrollmentId);
      clearCache(`guardian_students_${guardianId}`); // Clear guardian data cache
      this.emit('enrollmentApproved', { guardianId, enrollmentId });
    } catch (error) {
      this.setError(`approveEnrollment_${enrollmentId}`, error);
      throw error;
    }
  }

  async getGuardianStudentFeedback(guardianId) {
    const cacheKey = `guardian_feedback_${guardianId}`;
    return this.fetchData(cacheKey, () => API.guardian.getStudentFeedback(guardianId));
  }

  // Real-time data sync methods
  startRealTimeSync(userId, userType) {
    // In a real application, this would establish WebSocket connection
    // console.log(`Starting real-time sync for ${userType} ${userId}`);
    
    // Simulate periodic data refresh
    this.syncInterval = setInterval(() => {
      this.refreshUserData(userId, userType);
    }, 30000); // Refresh every 30 seconds
  }

  stopRealTimeSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async refreshUserData(userId, userType) {
    try {
      // Refresh user-specific data based on user type
      if (userType === 'student') {
        await this.getAllCourses();
        await this.getUserNotifications(userId);
      } else if (userType === 'tutor') {
        await this.getUpcomingSessions(userId, userType);
        await this.getTutorEarnings(userId);
        await this.getUserNotifications(userId);
      } else if (userType === 'guardian') {
        await this.getGuardianStudents(userId);
        await this.getUserNotifications(userId);
      } else if (userType === 'admin') {
        await this.getAdminStats();
        await this.getAllUsers();
      }
    } catch (error) {
      // console.error('Error refreshing user data:', error);
    }
  }

  // Lesson methods
  async getLessonById(lessonId) {
    const cacheKey = `lesson_${lessonId}`;
    return this.fetchData(cacheKey, () => API.lessons.getLessonById(lessonId));
  }

  async createLesson(lessonData) {
    try {
      const response = await API.lessons.createLesson(lessonData);
      clearCache('lesson'); // Clear lesson cache
      this.emit('lessonCreated', { lessonData, response });
      return response;
    } catch (error) {
      this.setError('createLesson', error);
      throw error;
    }
  }

  async updateLesson(lessonId, lessonData) {
    try {
      const response = await API.lessons.updateLesson(lessonId, lessonData);
      clearCache('lesson'); // Clear lesson cache
      this.emit('lessonUpdated', { lessonId, lessonData });
      return response;
    } catch (error) {
      this.setError(`updateLesson_${lessonId}`, error);
      throw error;
    }
  }

  async deleteLesson(lessonId) {
    try {
      await API.lessons.deleteLesson(lessonId);
      clearCache('lesson'); // Clear lesson cache
      this.emit('lessonDeleted', { lessonId });
    } catch (error) {
      this.setError(`deleteLesson_${lessonId}`, error);
      throw error;
    }
  }

  async getLessonSessions(lessonId) {
    const cacheKey = `lesson_sessions_${lessonId}`;
    return this.fetchData(cacheKey, () => API.lessons.getLessonSessions(lessonId));
  }

  // Bulk operations
  async bulkUpdateUsers(userUpdates) {
    const promises = userUpdates.map(({ userId, data }) => 
      this.updateUser(userId, data)
    );
    
    try {
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.emit('bulkUpdate', { successful, failed, total: userUpdates.length });
      return { successful, failed };
    } catch (error) {
      this.setError('bulkUpdate', error);
      throw error;
    }
  }

  // Tutor availability and session methods
  async getTutorAvailability(tutorId, forceRefresh = false) {
    const cacheKey = `tutor_availability_${tutorId}`;
    return this.fetchData(cacheKey, () => API.availability.getTutorAvailabilityWithConflicts(tutorId), {
      forceRefresh
    });
  }

  async createTimeslot(tutorId, timeslotData) {
    try {
      this.setLoading(`createTimeslot_${tutorId}`, true);
      const response = await API.availability.createSingleTimeSlot(tutorId, timeslotData);
      clearCache(`tutor_availability_${tutorId}`);
      this.emit('timeslotCreated', { tutorId, timeslot: response });
      return response;
    } catch (error) {
      this.setError(`createTimeslot_${tutorId}`, error);
      throw error;
    } finally {
      this.setLoading(`createTimeslot_${tutorId}`, false);
    }
  }

  async deleteTimeslot(tutorId, timeslotId) {
    try {
      const response = await API.availability.deleteSingleAvailability(timeslotId);
      clearCache(`tutor_availability_${tutorId}`);
      this.emit('timeslotDeleted', { tutorId, timeslotId });
      return response;
    } catch (error) {
      this.setError(`deleteTimeslot_${timeslotId}`, error);
      throw error;
    }
  }

  async getTutorSessions(status = 'all', forceRefresh = false) {
    const cacheKey = `tutor_sessions_${status}`;
    return this.fetchData(cacheKey, () => API.sessions.getTutorSessions(status), {
      forceRefresh
    });
  }

  async startSession(sessionId) {
    try {
      const response = await API.sessions.startSession(sessionId);
      clearCache('tutor_sessions');
      this.emit('sessionStarted', { sessionId });
      return response;
    } catch (error) {
      this.setError(`startSession_${sessionId}`, error);
      throw error;
    }
  }

  async completeSession(sessionId) {
    try {
      const response = await API.sessions.completeSession(sessionId);
      clearCache('tutor_sessions');
      this.emit('sessionCompleted', { sessionId });
      return response;
    } catch (error) {
      this.setError(`completeSession_${sessionId}`, error);
      throw error;
    }
  }

  async getTutorQualifications(tutorId, forceRefresh = false) {
    const cacheKey = `tutor_qualifications_${tutorId}`;
    return this.fetchData(cacheKey, () => API.qualifications.getTutorQualifications(tutorId), {
      forceRefresh
    });
  }

  async getTutorCourses(tutorId, forceRefresh = false) {
    const cacheKey = `tutor_courses_${tutorId}`;
    return this.fetchData(cacheKey, () => API.courses.getTutorCourses(tutorId), {
      forceRefresh
    });
  }

  // Cache management methods
  clearAllCache() {
    clearCache();
    this.emit('cacheCleared');
  }

  getCacheStats() {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
      memoryUsage: JSON.stringify([...cache.entries()]).length
    };
  }
}

// Create singleton instance
const dataService = new DataService();

export default dataService;