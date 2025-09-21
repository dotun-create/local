const initialAppState = {
  theme: 'light',
  language: 'en',
  sidebarCollapsed: false,
  notifications: {
    enabled: true,
    sound: true,
    email: true,
    push: true
  },
  preferences: {
    timezone: 'UTC',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    emailDigest: 'daily',
    autoSaveInterval: 30000
  },
  ui: {
    loading: false,
    error: null,
    toast: null
  },
  feature: {
    enableBetaFeatures: false,
    enableTutorialMode: true,
    enableKeyboardShortcuts: true
  }
};

export const createAppSlice = (set, get) => ({
  app: {
    ...initialAppState,

    actions: {
      // Theme actions
      setTheme: (theme) => {
        set((state) => {
          state.app.theme = theme;
        });

        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
      },

      toggleTheme: () => {
        const currentTheme = get().app.theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        get().app.actions.setTheme(newTheme);
      },

      // Language actions
      setLanguage: (language) => {
        set((state) => {
          state.app.language = language;
        });
        localStorage.setItem('language', language);
      },

      // Sidebar actions
      toggleSidebar: () => {
        set((state) => {
          state.app.sidebarCollapsed = !state.app.sidebarCollapsed;
        });
      },

      setSidebarCollapsed: (collapsed) => {
        set((state) => {
          state.app.sidebarCollapsed = collapsed;
        });
      },

      // Notification settings
      updateNotificationSettings: (settings) => {
        set((state) => {
          state.app.notifications = { ...state.app.notifications, ...settings };
        });
      },

      toggleNotifications: () => {
        set((state) => {
          state.app.notifications.enabled = !state.app.notifications.enabled;
        });
      },

      // Preferences
      updatePreferences: (preferences) => {
        set((state) => {
          state.app.preferences = { ...state.app.preferences, ...preferences };
        });
      },

      setTimezone: (timezone) => {
        set((state) => {
          state.app.preferences.timezone = timezone;
        });
      },

      setDateFormat: (format) => {
        set((state) => {
          state.app.preferences.dateFormat = format;
        });
      },

      setTimeFormat: (format) => {
        set((state) => {
          state.app.preferences.timeFormat = format;
        });
      },

      // UI state management
      setLoading: (loading) => {
        set((state) => {
          state.app.ui.loading = loading;
        });
      },

      setError: (error) => {
        set((state) => {
          state.app.ui.error = error;
        });
      },

      clearError: () => {
        set((state) => {
          state.app.ui.error = null;
        });
      },

      // Toast notifications
      showToast: (toast) => {
        set((state) => {
          state.app.ui.toast = {
            id: Date.now(),
            type: 'info',
            duration: 4000,
            ...toast
          };
        });

        // Auto-dismiss toast
        if (toast.duration !== 0) {
          setTimeout(() => {
            get().app.actions.hideToast();
          }, toast.duration || 4000);
        }
      },

      hideToast: () => {
        set((state) => {
          state.app.ui.toast = null;
        });
      },

      showSuccessToast: (message, options = {}) => {
        get().app.actions.showToast({
          type: 'success',
          message,
          ...options
        });
      },

      showErrorToast: (message, options = {}) => {
        get().app.actions.showToast({
          type: 'error',
          message,
          duration: 6000,
          ...options
        });
      },

      showWarningToast: (message, options = {}) => {
        get().app.actions.showToast({
          type: 'warning',
          message,
          duration: 5000,
          ...options
        });
      },

      showInfoToast: (message, options = {}) => {
        get().app.actions.showToast({
          type: 'info',
          message,
          ...options
        });
      },

      // Feature flags
      updateFeatureSettings: (features) => {
        set((state) => {
          state.app.feature = { ...state.app.feature, ...features };
        });
      },

      toggleBetaFeatures: () => {
        set((state) => {
          state.app.feature.enableBetaFeatures = !state.app.feature.enableBetaFeatures;
        });
      },

      toggleTutorialMode: () => {
        set((state) => {
          state.app.feature.enableTutorialMode = !state.app.feature.enableTutorialMode;
        });
      },

      toggleKeyboardShortcuts: () => {
        set((state) => {
          state.app.feature.enableKeyboardShortcuts = !state.app.feature.enableKeyboardShortcuts;
        });
      },

      // Bulk settings update
      updateSettings: (settings) => {
        set((state) => {
          if (settings.theme) state.app.theme = settings.theme;
          if (settings.language) state.app.language = settings.language;
          if (settings.notifications) {
            state.app.notifications = { ...state.app.notifications, ...settings.notifications };
          }
          if (settings.preferences) {
            state.app.preferences = { ...state.app.preferences, ...settings.preferences };
          }
          if (settings.features) {
            state.app.feature = { ...state.app.feature, ...settings.features };
          }
        });
      },

      // Reset app state
      reset: () => {
        set((state) => {
          state.app = { ...initialAppState };
        });
      },

      // Initialize app settings from localStorage
      initializeSettings: () => {
        try {
          const savedTheme = localStorage.getItem('theme');
          const savedLanguage = localStorage.getItem('language');
          const savedPreferences = localStorage.getItem('app-preferences');

          set((state) => {
            if (savedTheme) {
              state.app.theme = savedTheme;
              document.documentElement.setAttribute('data-theme', savedTheme);
            }
            if (savedLanguage) {
              state.app.language = savedLanguage;
            }
            if (savedPreferences) {
              try {
                const preferences = JSON.parse(savedPreferences);
                state.app.preferences = { ...state.app.preferences, ...preferences };
              } catch (error) {
                console.warn('Failed to parse saved preferences:', error);
              }
            }
          });
        } catch (error) {
          console.error('Failed to initialize app settings:', error);
        }
      },

      // Save preferences to localStorage
      savePreferences: () => {
        try {
          const { preferences } = get().app;
          localStorage.setItem('app-preferences', JSON.stringify(preferences));
        } catch (error) {
          console.error('Failed to save preferences:', error);
        }
      }
    }
  }
});