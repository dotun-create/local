import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL !== 'AUTO_GENERATED')
  ? process.env.REACT_APP_API_URL
  : 'http://localhost:80';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/chat`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // console.error('Chat API error:', error);
    if (error.response?.status === 401) {
      // Handle unauthorized - but don't auto-redirect since main app handles auth
      // console.error('Chat API authentication failed - token may be expired');
      // Only remove token if we're sure it's invalid, let main app handle redirect
    }
    throw error;
  }
);

// Chat status and settings
export const getChatStatus = async () => {
  try {
    const response = await api.get('/status');
    return response;
  } catch (error) {
    // console.error('Failed to get chat status:', error);
    throw error;
  }
};

export const getChatSettings = async () => {
  try {
    const response = await api.get('/admin/settings');
    return response;
  } catch (error) {
    // console.error('Failed to get chat settings:', error);
    throw error;
  }
};

export const updateChatSettings = async (settings) => {
  try {
    const response = await api.post('/admin/settings', settings);
    return response;
  } catch (error) {
    // console.error('Failed to update chat settings:', error);
    throw error;
  }
};

// Course chat operations
export const getCourseChat = async (courseId) => {
  try {
    const response = await api.get(`/courses/${courseId}/chat`);
    return response;
  } catch (error) {
    // console.error('Failed to get course chat:', error);
    throw error;
  }
};

export const getChatMessages = async (courseId, page = 1, perPage = 50) => {
  try {
    const response = await api.get(`/courses/${courseId}/messages`, {
      params: { page, per_page: perPage }
    });
    return response;
  } catch (error) {
    // console.error('Failed to get chat messages:', error);
    throw error;
  }
};

export const sendChatMessage = async (courseId, messageData) => {
  try {
    const response = await api.post(`/courses/${courseId}/messages`, messageData);
    return response;
  } catch (error) {
    // console.error('Failed to send chat message:', error);
    throw error;
  }
};

export const markMessageAsRead = async (messageId) => {
  try {
    const response = await api.post(`/messages/${messageId}/read`);
    return response;
  } catch (error) {
    // console.error('Failed to mark message as read:', error);
    throw error;
  }
};

// User conversations
export const getUserConversations = async () => {
  try {
    const response = await api.get('/user/conversations');
    return response;
  } catch (error) {
    // console.error('Failed to get user conversations:', error);
    throw error;
  }
};

// Admin operations
export const getAllChatsAdmin = async (filters = {}) => {
  try {
    const params = {};
    if (filters.courseId) params.course_id = filters.courseId;
    if (filters.tutorId) params.tutor_id = filters.tutorId;
    if (filters.studentId) params.student_id = filters.studentId;
    if (filters.page) params.page = filters.page;
    if (filters.perPage) params.per_page = filters.perPage;

    const response = await api.get('/admin/all', { params });
    return response;
  } catch (error) {
    // console.error('Failed to get admin chats:', error);
    throw error;
  }
};

// Utility functions
export const isValidChatMessage = (message) => {
  return message && typeof message === 'string' && message.trim().length > 0;
};

export const formatChatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));

  if (diffInMinutes < 1) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export const getChatParticipantName = (participant) => {
  if (!participant) return 'Unknown';
  return participant.userName || participant.userEmail || 'Anonymous';
};

export const isChatEnabled = async () => {
  try {
    const status = await getChatStatus();
    return status.enabled;
  } catch (error) {
    // console.error('Failed to check if chat is enabled:', error);
    return false;
  }
};

// Default export with all functions
export default {
  getChatStatus,
  getChatSettings,
  updateChatSettings,
  getCourseChat,
  getChatMessages,
  sendChatMessage,
  markMessageAsRead,
  getUserConversations,
  getAllChatsAdmin,
  isValidChatMessage,
  formatChatTimestamp,
  getChatParticipantName,
  isChatEnabled,
};