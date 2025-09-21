/**
 * Shared Constants
 * Application-wide constants and configuration values
 */

// API Configuration
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
    SWITCH_ROLE: '/auth/switch-role',
    PROFILE: '/auth/profile',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    GOOGLE_LOGIN: '/auth/google',
    APPLE_LOGIN: '/auth/apple'
  },

  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    UPLOAD_AVATAR: '/users/avatar',
    PREFERENCES: '/users/preferences'
  },

  COURSES: {
    LIST: '/courses',
    DETAIL: '/courses/:id',
    CREATE: '/courses',
    UPDATE: '/courses/:id',
    DELETE: '/courses/:id',
    ENROLL: '/courses/:id/enroll',
    UNENROLL: '/courses/:id/unenroll'
  },

  SESSIONS: {
    LIST: '/sessions',
    DETAIL: '/sessions/:id',
    CREATE: '/sessions',
    UPDATE: '/sessions/:id',
    DELETE: '/sessions/:id',
    JOIN: '/sessions/:id/join'
  },

  PAYMENTS: {
    METHODS: '/payments/methods',
    PROCESS: '/payments/process',
    HISTORY: '/payments/history',
    STRIPE_INTENT: '/payments/stripe/intent',
    PAYPAL_ORDER: '/payments/paypal/order'
  },

  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/read-all',
    PREFERENCES: '/notifications/preferences'
  },

  ADMIN: {
    USERS: '/admin/users',
    COURSES: '/admin/courses',
    SESSIONS: '/admin/sessions',
    ANALYTICS: '/admin/analytics',
    SYSTEM: '/admin/system'
  }
};

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied. You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',

  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password.',
    ACCOUNT_LOCKED: 'Your account has been locked. Please contact support.',
    TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
    PASSWORD_WEAK: 'Password must be at least 8 characters with uppercase, lowercase, and number.',
    EMAIL_EXISTS: 'An account with this email already exists.',
    EMAIL_NOT_VERIFIED: 'Please verify your email address to continue.'
  },

  FORM: {
    REQUIRED_FIELD: 'This field is required.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_PHONE: 'Please enter a valid phone number.',
    PASSWORD_MISMATCH: 'Passwords do not match.',
    FILE_TOO_LARGE: 'File size is too large. Maximum size is {maxSize}.',
    INVALID_FILE_TYPE: 'Invalid file type. Allowed types: {allowedTypes}.'
  },

  COURSE: {
    ENROLLMENT_FULL: 'This course is full. Please try again later.',
    ALREADY_ENROLLED: 'You are already enrolled in this course.',
    NOT_ENROLLED: 'You are not enrolled in this course.',
    PAYMENT_REQUIRED: 'Payment is required to enroll in this course.'
  }
};

// Success Messages
export const SUCCESS_MESSAGES = {
  GENERIC: 'Operation completed successfully.',

  AUTH: {
    LOGIN_SUCCESS: 'Welcome back!',
    LOGOUT_SUCCESS: 'You have been logged out successfully.',
    REGISTRATION_SUCCESS: 'Account created successfully. Please verify your email.',
    PASSWORD_CHANGED: 'Your password has been changed successfully.',
    EMAIL_VERIFIED: 'Your email has been verified successfully.'
  },

  PROFILE: {
    UPDATED: 'Your profile has been updated successfully.',
    AVATAR_UPLOADED: 'Profile picture updated successfully.'
  },

  COURSE: {
    ENROLLED: 'You have been enrolled in the course successfully.',
    UNENROLLED: 'You have been unenrolled from the course.',
    CREATED: 'Course created successfully.',
    UPDATED: 'Course updated successfully.',
    DELETED: 'Course deleted successfully.'
  },

  PAYMENT: {
    SUCCESS: 'Payment processed successfully.',
    METHOD_ADDED: 'Payment method added successfully.',
    METHOD_REMOVED: 'Payment method removed successfully.'
  }
};

// Validation Rules
export const VALIDATION_RULES = {
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MAX_LENGTH: 254
  },

  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    DESCRIPTION: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  },

  PHONE: {
    PATTERN: /^\+?[\d\s\-\(\)]+$/,
    MIN_LENGTH: 10,
    MAX_LENGTH: 20
  },

  FILE: {
    IMAGE: {
      MAX_SIZE: 5 * 1024 * 1024, // 5MB
      ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    },
    DOCUMENT: {
      MAX_SIZE: 10 * 1024 * 1024, // 10MB
      ALLOWED_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    }
  },

  TEXT: {
    SHORT_TEXT: { MAX_LENGTH: 255 },
    MEDIUM_TEXT: { MAX_LENGTH: 1000 },
    LONG_TEXT: { MAX_LENGTH: 5000 }
  }
};

// Application Configuration
export const APP_CONFIG = {
  NAME: 'TroupeDev',
  VERSION: '1.0.0',
  DESCRIPTION: 'Educational platform for tutoring and course management',

  // Feature Flags
  FEATURES: {
    DARK_MODE: true,
    NOTIFICATIONS: true,
    PAYMENTS: true,
    CHAT: true,
    VIDEO_CALLS: true,
    ANALYTICS: true,
    MULTI_LANGUAGE: false
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
  },

  // Time
  TIME: {
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
    DEBOUNCE_DELAY: 300, // 300ms
    TOAST_DURATION: 5000 // 5 seconds
  },

  // File Upload
  UPLOAD: {
    CHUNK_SIZE: 1024 * 1024, // 1MB chunks
    MAX_CONCURRENT_UPLOADS: 3,
    RETRY_ATTEMPTS: 3
  }
};

// User Roles and Permissions
export const ROLES = {
  ADMIN: 'admin',
  TUTOR: 'tutor',
  STUDENT: 'student',
  GUARDIAN: 'guardian'
};

export const PERMISSIONS = {
  // Course Management
  COURSE_CREATE: 'course:create',
  COURSE_READ: 'course:read',
  COURSE_UPDATE: 'course:update',
  COURSE_DELETE: 'course:delete',

  // User Management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // Session Management
  SESSION_CREATE: 'session:create',
  SESSION_READ: 'session:read',
  SESSION_UPDATE: 'session:update',
  SESSION_DELETE: 'session:delete',

  // Admin Functions
  ADMIN_PANEL: 'admin:panel',
  ADMIN_ANALYTICS: 'admin:analytics',
  ADMIN_SYSTEM: 'admin:system'
};

// Role-Permission Mapping
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.COURSE_CREATE,
    PERMISSIONS.COURSE_READ,
    PERMISSIONS.COURSE_UPDATE,
    PERMISSIONS.COURSE_DELETE,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.SESSION_CREATE,
    PERMISSIONS.SESSION_READ,
    PERMISSIONS.SESSION_UPDATE,
    PERMISSIONS.SESSION_DELETE,
    PERMISSIONS.ADMIN_PANEL,
    PERMISSIONS.ADMIN_ANALYTICS,
    PERMISSIONS.ADMIN_SYSTEM
  ],

  [ROLES.TUTOR]: [
    PERMISSIONS.COURSE_CREATE,
    PERMISSIONS.COURSE_READ,
    PERMISSIONS.COURSE_UPDATE,
    PERMISSIONS.SESSION_CREATE,
    PERMISSIONS.SESSION_READ,
    PERMISSIONS.SESSION_UPDATE,
    PERMISSIONS.USER_READ
  ],

  [ROLES.STUDENT]: [
    PERMISSIONS.COURSE_READ,
    PERMISSIONS.SESSION_READ,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE
  ],

  [ROLES.GUARDIAN]: [
    PERMISSIONS.COURSE_READ,
    PERMISSIONS.SESSION_READ,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE
  ]
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_PREFERENCES: 'userPreferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  CART: 'cart',
  LAST_VISITED_COURSE: 'lastVisitedCourse'
};

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  COURSES: '/courses',
  COURSE_DETAIL: '/courses/:id',
  SESSIONS: '/sessions',
  PAYMENTS: '/payments',
  NOTIFICATIONS: '/notifications',
  ADMIN: '/admin',
  HELP: '/help',
  CONTACT: '/contact'
};

export default {
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION_RULES,
  APP_CONFIG,
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  STORAGE_KEYS,
  ROUTES
};