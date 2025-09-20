// React Hooks for Data Management
import { useState, useEffect, useCallback, useRef } from 'react';
import dataService from '../services/dataService';

// Generic data fetching hook
export const useData = (fetchFunction, dependencies = [], options = {}) => {
  const {
    immediate = true,
    onSuccess,
    onError,
    transform,
    defaultValue = null
  } = options;

  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchFunction();
      const finalData = transform ? transform(result) : result;
      
      setData(finalData);
      
      if (onSuccess) {
        onSuccess(finalData);
      }
    } catch (err) {
      setError(err);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [fetchData, immediate]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    setData
  };
};

// Authentication hook
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing user session
    const checkAuth = async () => {
      try {
        // Force refresh to get latest user data from backend on initialization
        const currentUser = await dataService.getCurrentUser(true);
        setUser(currentUser);
      } catch (error) {
        // console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const unsubscribe = dataService.subscribe('authChange', ({ user }) => {
      // console.log('useAuth - authChange event received, user:', user);
      setUser(user);
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    try {
      const response = await dataService.login(credentials);
      return response;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async (showConfirmation = true) => {
    const result = await dataService.logout();
    
    if (showConfirmation && result.success) {
      // Show logout confirmation
      alert(result.message);
    }
    
    // Navigate to homepage
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = '/';
    }
    
    return result;
  }, []);

  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      const response = await dataService.register(userData);
      return response;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    login,
    logout,
    register,
    isAuthenticated: !!user
  };
};

// Users hook
export const useUsers = (userType = null, forceRefresh = false) => {
  return useData(
    () => dataService.getAllUsers(userType, forceRefresh),
    [userType, forceRefresh],
    {
      defaultValue: [], // Default to empty array instead of null
      transform: (response) => {
        // Backend returns { users: [...], totalUsers: number, ... }
        if (response && response.users && Array.isArray(response.users)) {
          return response.users;
        }
        // Fallback for direct array response
        return Array.isArray(response) ? response : [];
      }
    }
  );
};

// Individual user hook
export const useUser = (userId) => {
  const { data, loading, error, refetch } = useData(
    () => dataService.getUserById(userId),
    [userId],
    { immediate: !!userId }
  );

  const updateUser = useCallback(async (userData) => {
    try {
      const updatedUser = await dataService.updateUser(userId, userData);
      refetch();
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }, [userId, refetch]);

  const deleteUser = useCallback(async () => {
    await dataService.deleteUser(userId);
  }, [userId]);

  return {
    user: data,
    loading,
    error,
    refetch,
    updateUser,
    deleteUser
  };
};

// Courses hook
export const useCourses = () => {
  const { data, loading, error, refetch } = useData(
    () => dataService.getAllCourses(),
    [],
    {
      defaultValue: [], // Default to empty array instead of null
      transform: (response) => {
        // Backend returns { courses: [...], totalCourses: number, ... }
        if (response && response.courses && Array.isArray(response.courses)) {
          return response.courses;
        }
        // Fallback for direct array response
        return Array.isArray(response) ? response : [];
      }
    }
  );

  const createCourse = useCallback(async (courseData) => {
    try {
      const newCourse = await dataService.createCourse(courseData);
      refetch();
      return newCourse;
    } catch (error) {
      throw error;
    }
  }, [refetch]);

  const updateCourse = useCallback(async (courseId, courseData) => {
    try {
      const updatedCourse = await dataService.updateCourse(courseId, courseData);
      refetch();
      return updatedCourse;
    } catch (error) {
      throw error;
    }
  }, [refetch]);

  const deleteCourse = useCallback(async (courseId) => {
    await dataService.deleteCourse(courseId);
    refetch();
  }, [refetch]);

  return {
    courses: data,
    loading,
    error,
    refetch,
    createCourse,
    updateCourse,
    deleteCourse
  };
};

// Individual course hook
export const useCourse = (courseId) => {
  return useData(
    () => dataService.getCourseById(courseId),
    [courseId],
    { immediate: !!courseId }
  );
};

// Sessions hook
export const useSessions = (userId, userType) => {
  const upcomingSessions = useData(
    () => dataService.getUpcomingSessions(userId, userType),
    [userId, userType],
    {
      immediate: !!(userId && userType),
      defaultValue: [], // Add defaultValue to prevent null sessions
      transform: (sessions) => sessions || []
    }
  );

  const sessionHistory = useData(
    () => dataService.getSessionHistory(userId, userType),
    [userId, userType],
    { 
      immediate: false,
      transform: (sessions) => sessions || []
    }
  );

  return {
    upcomingSessions: upcomingSessions.data,
    sessionHistory: sessionHistory.data,
    loading: upcomingSessions.loading || sessionHistory.loading,
    error: upcomingSessions.error || sessionHistory.error,
    refetchUpcoming: upcomingSessions.refetch,
    loadHistory: sessionHistory.refetch
  };
};

// Quizzes hook
export const useQuizzes = (topic = null) => {
  return useData(
    () => dataService.getAllQuizzes(topic),
    [topic],
    {
      transform: (quizzes) => quizzes || []
    }
  );
};

// Individual quiz hook
export const useQuiz = (quizId) => {
  const { data, loading, error, refetch } = useData(
    () => dataService.getQuizById(quizId),
    [quizId],
    { immediate: !!quizId }
  );

  const submitResults = useCallback(async (results) => {
    try {
      const response = await dataService.submitQuizResults(quizId, results);
      return response;
    } catch (error) {
      throw error;
    }
  }, [quizId]);

  return {
    quiz: data,
    loading,
    error,
    refetch,
    submitResults
  };
};

// Quiz results hook
export const useQuizResults = (studentId, courseId = null) => {
  return useData(
    () => dataService.getStudentQuizResults(studentId, courseId),
    [studentId, courseId],
    {
      immediate: !!studentId,
      transform: (results) => results || []
    }
  );
};

// Notifications hook
export const useNotifications = (userId) => {
  const { data, loading, error, refetch } = useData(
    () => dataService.getUserNotifications(userId),
    [userId],
    { 
      immediate: !!userId,
      transform: (notifications) => notifications || []
    }
  );

  const markAsRead = useCallback(async (notificationId) => {
    await dataService.markNotificationRead(notificationId);
    refetch();
  }, [refetch]);

  const unreadCount = data ? data.filter(n => !n.read).length : 0;

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = dataService.subscribe('notificationUpdate', () => {
      refetch();
    });

    return unsubscribe;
  }, [userId, refetch]);

  return {
    notifications: data,
    loading,
    error,
    refetch,
    markAsRead,
    unreadCount
  };
};

// Analytics hook
export const useAnalytics = (userType, userId = null) => {
  return useData(
    () => dataService.getDashboardStats(userType, userId),
    [userType, userId],
    {
      immediate: !!userType
    }
  );
};

// Admin statistics hook
export const useAdminStats = () => {
  return useData(
    () => dataService.getAdminStats(),
    [],
    {
      transform: (stats) => stats || {}
    }
  );
};

// Invoices hook
export const useInvoices = (filters = {}) => {
  return useData(
    () => dataService.getAllInvoices(filters),
    [JSON.stringify(filters)],
    {
      defaultValue: [], // Default to empty array instead of null
      transform: (response) => {
        // Backend returns { invoices: [...], totalInvoices: number, ... }
        if (response && response.invoices && Array.isArray(response.invoices)) {
          return response.invoices;
        }
        // Fallback for direct array response
        return Array.isArray(response) ? response : [];
      }
    }
  );
};

// Tutor earnings hook
export const useTutorEarnings = (tutorId) => {
  const { data, loading, error, refetch } = useData(
    () => dataService.getTutorEarnings(tutorId),
    [tutorId],
    { immediate: !!tutorId }
  );

  const processPayout = useCallback(async (amount) => {
    try {
      const response = await dataService.processTutorPayout(tutorId, amount);
      refetch();
      return response;
    } catch (error) {
      throw error;
    }
  }, [tutorId, refetch]);

  return {
    earnings: data,
    loading,
    error,
    refetch,
    processPayout
  };
};

// Guardian students hook
export const useGuardianStudents = () => {
  const { data, loading, error, refetch } = useData(
    () => dataService.getGuardianStudents(),
    [],
    { 
      immediate: true,
      transform: (response) => {
        // Backend returns { students: [...], total: number }
        if (response && response.students && Array.isArray(response.students)) {
          return response.students;
        }
        // Fallback for direct array response
        return Array.isArray(response) ? response : [];
      }
    }
  );

  const approveEnrollment = useCallback(async (enrollmentId) => {
    // Note: This will need to be updated when enrollment approval endpoint is available
    // await dataService.approveCourseEnrollment(enrollmentId);
    refetch();
  }, [refetch]);

  return {
    students: data,
    loading,
    error,
    refetch,
    approveEnrollment
  };
};

// Guardian student feedback hook
export const useGuardianStudentFeedback = () => {
  const { data, loading, error, refetch } = useData(
    () => {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      if (!currentUser.id) {
        throw new Error('Guardian ID not found');
      }
      return dataService.getGuardianStudentFeedback(currentUser.id);
    },
    [],
    { 
      immediate: true,
      transform: (response) => {
        // Transform the response from the backend API format
        // { "Student Name": [{ feedbackData }] }
        return response || {};
      }
    }
  );

  return {
    feedbackData: data,
    loading,
    error,
    refetch
  };
};

// Real-time data hook
export const useRealTimeData = (userId, userType) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId || !userType) return;

    dataService.startRealTimeSync(userId, userType);
    setIsConnected(true);

    return () => {
      dataService.stopRealTimeSync();
      setIsConnected(false);
    };
  }, [userId, userType]);

  return { isConnected };
};

// Loading states hook
export const useLoadingStates = () => {
  const [loadingStates, setLoadingStates] = useState(new Map());

  useEffect(() => {
    const unsubscribe = dataService.subscribe('loading', ({ key, isLoading }) => {
      setLoadingStates(prev => new Map(prev.set(key, isLoading)));
    });

    return unsubscribe;
  }, []);

  return {
    isLoading: (key) => loadingStates.get(key) || false,
    loadingStates: Object.fromEntries(loadingStates)
  };
};

// Error states hook
export const useErrorStates = () => {
  const [errorStates, setErrorStates] = useState(new Map());

  useEffect(() => {
    const unsubscribe = dataService.subscribe('error', ({ key, error }) => {
      setErrorStates(prev => {
        const newMap = new Map(prev);
        if (error) {
          newMap.set(key, error);
        } else {
          newMap.delete(key);
        }
        return newMap;
      });
    });

    return unsubscribe;
  }, []);

  const clearError = useCallback((key) => {
    dataService.clearError(key);
  }, []);

  return {
    getError: (key) => errorStates.get(key) || null,
    errorStates: Object.fromEntries(errorStates),
    clearError
  };
};

// Enrollments hook
export const useEnrollments = (filters = {}) => {
  const { data, loading, error, refetch } = useData(
    () => dataService.getEnrollments(filters),
    [JSON.stringify(filters)],
    {
      transform: (response) => {
        // Backend returns { enrollments: [...], totalEnrollments: number, ... }
        if (response && response.enrollments && Array.isArray(response.enrollments)) {
          return response.enrollments;
        }
        // Fallback for direct array response
        return Array.isArray(response) ? response : [];
      }
    }
  );

  const updateProgress = useCallback(async (enrollmentId, progressData) => {
    try {
      const response = await dataService.updateEnrollmentProgress(enrollmentId, progressData);
      refetch();
      return response;
    } catch (error) {
      throw error;
    }
  }, [refetch]);

  return {
    enrollments: data,
    loading,
    error,
    refetch,
    updateProgress
  };
};

// Individual enrollment hook
export const useEnrollment = (enrollmentId) => {
  return useData(
    () => dataService.getEnrollmentById(enrollmentId),
    [enrollmentId],
    { immediate: !!enrollmentId }
  );
};

// Cache management hook
export const useCacheManager = () => {
  const [cacheStats, setCacheStats] = useState({ size: 0, keys: [], memoryUsage: 0 });

  const updateStats = useCallback(() => {
    setCacheStats(dataService.getCacheStats());
  }, []);

  const clearCache = useCallback(() => {
    dataService.clearAllCache();
    updateStats();
  }, [updateStats]);

  useEffect(() => {
    updateStats();
    
    const unsubscribe = dataService.subscribe('cacheCleared', updateStats);
    return unsubscribe;
  }, [updateStats]);

  return {
    cacheStats,
    clearCache,
    updateStats
  };
};