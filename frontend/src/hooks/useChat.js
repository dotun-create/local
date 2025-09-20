import { useState, useEffect, useCallback } from 'react';
import { getChatStatus, getChatSettings } from '../services/chatAPI';
import { io } from 'socket.io-client';
import API from '../services/api';

// Global chat state
let globalChatState = {
  isEnabled: false,
  isLoading: true,
  error: null,
  lastChecked: null,
};

const CACHE_DURATION = 30 * 1000; // 30 seconds cache

// Event listeners for state changes
const listeners = new Set();

// Global socket connection for chat status updates
let globalSocket = null;

// Notify all listeners of state change
const notifyListeners = (newState) => {
  globalChatState = { ...globalChatState, ...newState };
  listeners.forEach(listener => listener(globalChatState));
};

// Check if cache is valid
const isCacheValid = () => {
  return globalChatState.lastChecked && 
         (Date.now() - globalChatState.lastChecked) < CACHE_DURATION;
};

// Fetch chat status from API
const fetchChatStatus = async () => {
  try {
    notifyListeners({ isLoading: true, error: null });
    
    const statusResponse = await getChatStatus();
    const isEnabled = statusResponse.enabled || false;
    
    notifyListeners({
      isEnabled,
      isLoading: false,
      error: null,
      lastChecked: Date.now()
    });
    
    return isEnabled;
  } catch (error) {
    console.error('Failed to fetch chat status:', error);
    notifyListeners({
      isEnabled: false,
      isLoading: false,
      error: error.message || 'Failed to check chat status',
      lastChecked: Date.now()
    });
    throw error;
  }
};

// Initialize socket connection for real-time updates
const initializeSocket = () => {
  if (globalSocket?.connected) {
    return globalSocket;
  }

  const token = sessionStorage.getItem('authToken');
  if (!token) {
    console.warn('No auth token found for socket connection');
    return null;
  }

  try {
    globalSocket = io((process.env.REACT_APP_API_URL || 'http://localhost:80'), {
      auth: {
        token: `Bearer ${token}`
      },
      transports: ['websocket', 'polling']
    });

    globalSocket.on('connect', () => {
      console.log('🔌 Global chat socket connected');
    });

    globalSocket.on('disconnect', () => {
      console.log('🔌 Global chat socket disconnected');
    });

    globalSocket.on('chat_system_toggled', (data) => {
      console.log('🔥 Socket: Chat system toggled:', data);
      notifyListeners({
        isEnabled: data.enabled,
        isLoading: false,
        error: null,
        lastChecked: Date.now()
      });

      // Also dispatch window event for backward compatibility
      window.dispatchEvent(new CustomEvent('chatSystemToggled', {
        detail: { enabled: data.enabled, message: data.message }
      }));
    });

    globalSocket.on('connect_error', (error) => {
      console.error('Global chat socket connection error:', error);
    });

    return globalSocket;
  } catch (error) {
    console.error('Failed to initialize global chat socket:', error);
    return null;
  }
};

// Force refresh chat status
export const refreshChatStatus = async () => {
  return fetchChatStatus();
};

// Hook for using chat state
export const useChat = () => {
  const [chatState, setChatState] = useState(globalChatState);

  const updateState = useCallback((newState) => {
    setChatState(newState);
  }, []);

  useEffect(() => {
    // Add this component as a listener
    listeners.add(updateState);
    
    // Initialize socket connection for real-time updates
    initializeSocket();

    // Initial load if cache is invalid or this is first load
    if (!isCacheValid() || globalChatState.lastChecked === null) {
      fetchChatStatus().catch(() => {
        // Error already handled in fetchChatStatus
      });
    } else {
      // Use cached state
      setChatState(globalChatState);
    }

    // Listen for admin chat toggle events
    const handleChatToggle = (event) => {
      console.log('🔥 useChat: Chat status changed to:', event.detail.enabled);
      notifyListeners({
        isEnabled: event.detail.enabled,
        isLoading: false,
        error: null,
        lastChecked: Date.now()
      });
    };

    // Listen for focus events to refresh status
    const handleFocus = () => {
      if (!isCacheValid()) {
        fetchChatStatus().catch(() => {
          // Error already handled in fetchChatStatus
        });
      }
    };

    // Listen for visibility change to refresh status
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isCacheValid()) {
        fetchChatStatus().catch(() => {
          // Error already handled in fetchChatStatus
        });
      }
    };

    window.addEventListener('chatSystemToggled', handleChatToggle);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      listeners.delete(updateState);
      window.removeEventListener('chatSystemToggled', handleChatToggle);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateState]);

  // Provide manual refresh function
  const refreshStatus = useCallback(async () => {
    return fetchChatStatus();
  }, []);

  return {
    isEnabled: chatState.isEnabled,
    isLoading: chatState.isLoading,
    error: chatState.error,
    refreshStatus
  };
};

// Hook for admin chat management
export const useChatAdmin = () => {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadChatSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get settings from system settings API (consistent with AdminPage)
      const response = await API.systemSettings.getAllSettings();
      
      if (response.success) {
        const chatSetting = response.data.find(s => s.settingKey === 'chat_system_enabled');
        const isEnabled = chatSetting?.settingValue === 'true';
        setSettings({ enabled: isEnabled });
        
        // Update global state
        notifyListeners({
          isEnabled,
          isLoading: false,
          error: null,
          lastChecked: Date.now()
        });
      } else {
        throw new Error('Failed to load chat settings');
      }
    } catch (err) {
      console.error('Failed to load chat settings:', err);
      setError(err.message || 'Failed to load chat settings');
      notifyListeners({
        isEnabled: false,
        isLoading: false,
        error: err.message || 'Failed to load chat settings',
        lastChecked: Date.now()
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateChatSettings = useCallback(async (enabled) => {
    try {
      setIsLoading(true);
      setError(null);

      // Use system settings API to update (consistent with AdminPage)
      const response = await API.systemSettings.updateSetting('chat_system_enabled', {
        settingValue: enabled.toString(),
        settingType: 'boolean',
        description: 'Enable/disable the course chat system'
      });

      if (response.success) {
        setSettings({ enabled });
        
        // Update global state
        notifyListeners({
          isEnabled: enabled,
          isLoading: false,
          error: null,
          lastChecked: Date.now()
        });

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('chatSystemToggled', {
          detail: { enabled }
        }));

        return { success: true };
      } else {
        throw new Error('Failed to update chat settings');
      }
    } catch (err) {
      console.error('Failed to update chat settings:', err);
      setError(err.message || 'Failed to update chat settings');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    settings,
    isLoading,
    error,
    loadChatSettings,
    updateChatSettings
  };
};

// Utility functions
export const isChatAvailable = () => globalChatState.isEnabled && !globalChatState.isLoading && !globalChatState.error;

export const getChatState = () => globalChatState;

// Cleanup global socket connection
export const cleanup = () => {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
  listeners.clear();
};

// Initialize global state on import
if (typeof window !== 'undefined') {
  // Only initialize in browser environment
  fetchChatStatus().catch(() => {
    // Error already handled in fetchChatStatus
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
}