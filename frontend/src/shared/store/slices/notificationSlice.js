import { notificationService } from '@features/notifications/services/notificationService';

const initialNotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  filters: {
    type: 'all', // all, session, course, payment, system
    status: 'all', // all, read, unread
    priority: 'all' // all, high, medium, low
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  settings: {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    sessionReminders: true,
    courseUpdates: true,
    paymentAlerts: true,
    systemAnnouncements: true,
    reminderTime: 15, // minutes before session
    digestFrequency: 'daily' // daily, weekly, never
  },
  realtime: {
    connected: false,
    retryCount: 0,
    maxRetries: 5
  }
};

export const createNotificationSlice = (set, get) => ({
  notifications: {
    ...initialNotificationState,

    actions: {
      // Fetch notifications
      fetchNotifications: async (params = {}) => {
        set((state) => {
          state.notifications.loading = true;
          state.notifications.error = null;
        });

        try {
          const response = await notificationService.getNotifications(params);

          set((state) => {
            state.notifications.notifications = response.notifications;
            state.notifications.unreadCount = response.unreadCount || 0;
            state.notifications.pagination = {
              page: response.page || 1,
              limit: response.limit || 20,
              total: response.total || 0,
              totalPages: response.totalPages || 0
            };
            state.notifications.loading = false;
          });

          return response;
        } catch (error) {
          set((state) => {
            state.notifications.loading = false;
            state.notifications.error = error.message;
          });
          throw error;
        }
      },

      // Mark notification as read
      markAsRead: async (notificationId) => {
        try {
          await notificationService.markAsRead(notificationId);

          set((state) => {
            const notification = state.notifications.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
              notification.isRead = true;
              notification.readAt = new Date().toISOString();
              state.notifications.unreadCount = Math.max(0, state.notifications.unreadCount - 1);
            }
          });
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
          throw error;
        }
      },

      // Mark all notifications as read
      markAllAsRead: async () => {
        try {
          await notificationService.markAllAsRead();

          set((state) => {
            state.notifications.notifications.forEach(notification => {
              if (!notification.isRead) {
                notification.isRead = true;
                notification.readAt = new Date().toISOString();
              }
            });
            state.notifications.unreadCount = 0;
          });
        } catch (error) {
          console.error('Failed to mark all notifications as read:', error);
          throw error;
        }
      },

      // Delete notification
      deleteNotification: async (notificationId) => {
        try {
          await notificationService.deleteNotification(notificationId);

          set((state) => {
            const notification = state.notifications.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
              state.notifications.unreadCount = Math.max(0, state.notifications.unreadCount - 1);
            }
            state.notifications.notifications = state.notifications.notifications.filter(
              n => n.id !== notificationId
            );
          });
        } catch (error) {
          console.error('Failed to delete notification:', error);
          throw error;
        }
      },

      // Delete all notifications
      deleteAllNotifications: async () => {
        try {
          await notificationService.deleteAllNotifications();

          set((state) => {
            state.notifications.notifications = [];
            state.notifications.unreadCount = 0;
          });
        } catch (error) {
          console.error('Failed to delete all notifications:', error);
          throw error;
        }
      },

      // Create notification (for system use)
      createNotification: async (notificationData) => {
        try {
          const newNotification = await notificationService.createNotification(notificationData);

          set((state) => {
            state.notifications.notifications.unshift(newNotification);
            if (!newNotification.isRead) {
              state.notifications.unreadCount += 1;
            }
          });

          return newNotification;
        } catch (error) {
          console.error('Failed to create notification:', error);
          throw error;
        }
      },

      // Add local notification (real-time)
      addNotification: (notification) => {
        set((state) => {
          const newNotification = {
            id: Date.now().toString(),
            isRead: false,
            createdAt: new Date().toISOString(),
            ...notification
          };

          state.notifications.notifications.unshift(newNotification);
          if (!newNotification.isRead) {
            state.notifications.unreadCount += 1;
          }

          // Keep only latest 100 notifications in memory
          if (state.notifications.notifications.length > 100) {
            state.notifications.notifications = state.notifications.notifications.slice(0, 100);
          }
        });
      },

      // Update notification settings
      updateSettings: async (settings) => {
        try {
          await notificationService.updateSettings(settings);

          set((state) => {
            state.notifications.settings = { ...state.notifications.settings, ...settings };
          });
        } catch (error) {
          console.error('Failed to update notification settings:', error);
          throw error;
        }
      },

      // Fetch notification settings
      fetchSettings: async () => {
        try {
          const settings = await notificationService.getSettings();

          set((state) => {
            state.notifications.settings = { ...state.notifications.settings, ...settings };
          });

          return settings;
        } catch (error) {
          console.error('Failed to fetch notification settings:', error);
          throw error;
        }
      },

      // Set filters
      setFilters: (filters) => {
        set((state) => {
          state.notifications.filters = { ...state.notifications.filters, ...filters };
        });
      },

      // Clear filters
      clearFilters: () => {
        set((state) => {
          state.notifications.filters = {
            type: 'all',
            status: 'all',
            priority: 'all'
          };
        });
      },

      // Set pagination
      setPagination: (pagination) => {
        set((state) => {
          state.notifications.pagination = { ...state.notifications.pagination, ...pagination };
        });
      },

      // Clear error
      clearError: () => {
        set((state) => {
          state.notifications.error = null;
        });
      },

      // Set loading
      setLoading: (loading) => {
        set((state) => {
          state.notifications.loading = loading;
        });
      },

      // Real-time connection management
      setRealtimeConnection: (connected) => {
        set((state) => {
          state.notifications.realtime.connected = connected;
          if (connected) {
            state.notifications.realtime.retryCount = 0;
          }
        });
      },

      incrementRetryCount: () => {
        set((state) => {
          state.notifications.realtime.retryCount += 1;
        });
      },

      resetRetryCount: () => {
        set((state) => {
          state.notifications.realtime.retryCount = 0;
        });
      },

      // Utility actions
      getUnreadNotifications: () => {
        const state = get();
        return state.notifications.notifications.filter(n => !n.isRead);
      },

      getNotificationsByType: (type) => {
        const state = get();
        return state.notifications.notifications.filter(n => n.type === type);
      },

      getRecentNotifications: (hours = 24) => {
        const state = get();
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        return state.notifications.notifications.filter(n =>
          new Date(n.createdAt) > cutoff
        );
      },

      // Session reminder helpers
      scheduleSessionReminder: (session) => {
        const reminderTime = get().notifications.settings.reminderTime;
        const sessionTime = new Date(session.startTime);
        const reminderDelay = sessionTime.getTime() - Date.now() - (reminderTime * 60 * 1000);

        if (reminderDelay > 0) {
          setTimeout(() => {
            get().notifications.actions.addNotification({
              type: 'session',
              priority: 'high',
              title: 'Session Reminder',
              message: `Your session "${session.title}" starts in ${reminderTime} minutes`,
              data: { sessionId: session.id },
              actionUrl: `/sessions/${session.id}`
            });
          }, reminderDelay);
        }
      },

      // Bulk operations
      markSelectedAsRead: async (notificationIds) => {
        try {
          await notificationService.markSelectedAsRead(notificationIds);

          set((state) => {
            notificationIds.forEach(id => {
              const notification = state.notifications.notifications.find(n => n.id === id);
              if (notification && !notification.isRead) {
                notification.isRead = true;
                notification.readAt = new Date().toISOString();
                state.notifications.unreadCount = Math.max(0, state.notifications.unreadCount - 1);
              }
            });
          });
        } catch (error) {
          console.error('Failed to mark selected notifications as read:', error);
          throw error;
        }
      },

      deleteSelected: async (notificationIds) => {
        try {
          await notificationService.deleteSelected(notificationIds);

          set((state) => {
            notificationIds.forEach(id => {
              const notification = state.notifications.notifications.find(n => n.id === id);
              if (notification && !notification.isRead) {
                state.notifications.unreadCount = Math.max(0, state.notifications.unreadCount - 1);
              }
            });
            state.notifications.notifications = state.notifications.notifications.filter(
              n => !notificationIds.includes(n.id)
            );
          });
        } catch (error) {
          console.error('Failed to delete selected notifications:', error);
          throw error;
        }
      }
    }
  }
});