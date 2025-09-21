import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Store slices
import { createAuthSlice } from './slices/authSlice';
import { createAppSlice } from './slices/appSlice';
import { createCourseSlice } from './slices/courseSlice';
import { createNotificationSlice } from './slices/notificationSlice';
import { createUserSlice } from './slices/userSlice';
import createAvailabilitySlice from './slices/availabilitySlice';

// Main store
export const useStore = create()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get, api) => ({
          // Auth slice
          ...createAuthSlice(set, get, api),

          // App slice
          ...createAppSlice(set, get, api),

          // Course slice
          ...createCourseSlice(set, get, api),

          // Notification slice
          ...createNotificationSlice(set, get, api),

          // User slice
          ...createUserSlice(set, get, api),

          // Availability slice
          ...createAvailabilitySlice(set, get, api),

          // Global actions
          reset: () => {
            set((state) => {
              // Reset all slices to initial state
              const authSlice = createAuthSlice(set, get, api);
              const appSlice = createAppSlice(set, get, api);
              const courseSlice = createCourseSlice(set, get, api);
              const notificationSlice = createNotificationSlice(set, get, api);
              const userSlice = createUserSlice(set, get, api);
              const availabilitySlice = createAvailabilitySlice(set, get, api);

              state.auth = authSlice.auth;
              state.app = appSlice.app;
              state.courses = courseSlice.courses;
              state.notifications = notificationSlice.notifications;
              state.user = userSlice.user;
              state.availability = availabilitySlice.availability;
            });
          },

          // Hydration flag
          _hasHydrated: false,
          setHasHydrated: (hasHydrated) => {
            set((state) => {
              state._hasHydrated = hasHydrated;
            });
          }
        }))
      ),
      {
        name: 'troupe-store', // localStorage key
        partialize: (state) => ({
          // Only persist certain parts of the state
          auth: {
            token: state.auth?.token,
            refreshToken: state.auth?.refreshToken,
            user: state.auth?.user
          },
          app: {
            theme: state.app?.theme,
            language: state.app?.language,
            preferences: state.app?.preferences,
            sidebarCollapsed: state.app?.sidebarCollapsed,
            notifications: state.app?.notifications
          },
          user: {
            preferences: state.user?.preferences,
            verification: state.user?.verification
          },
          notifications: {
            settings: state.notifications?.settings
          }
        }),
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        }
      }
    ),
    {
      name: 'troupe-store',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
);

// Selector hooks for better performance
export const useAuth = () => useStore((state) => state.auth);
export const useApp = () => useStore((state) => state.app);
export const useCourses = () => useStore((state) => state.courses);
export const useNotifications = () => useStore((state) => state.notifications);
export const useUser = () => useStore((state) => state.user);
export const useAvailability = () => useStore((state) => state.availability);

// Individual action selectors
export const useAuthActions = () => useStore((state) => state.auth.actions);
export const useAppActions = () => useStore((state) => state.app.actions);
export const useCourseActions = () => useStore((state) => state.courses.actions);
export const useNotificationActions = () => useStore((state) => state.notifications.actions);
export const useUserActions = () => useStore((state) => state.user.actions);
export const useAvailabilityActions = () => useStore((state) => state.availability.actions);

// Computed selectors
export const useIsAuthenticated = () => useStore((state) => state.auth.isAuthenticated);
export const useCurrentUser = () => useStore((state) => state.auth.user);
export const useTheme = () => useStore((state) => state.app.theme);
export const useUnreadCount = () => useStore((state) => state.notifications.unreadCount);
export const useSidebarCollapsed = () => useStore((state) => state.app.sidebarCollapsed);
export const useUserProfile = () => useStore((state) => state.user.profile);
export const useEnrolledCourses = () => useStore((state) => state.courses.enrolledCourses);

export const useIsLoading = () => useStore((state) =>
  state.auth.loading ||
  state.courses.loading ||
  state.user.loading ||
  state.notifications.loading ||
  state.availability.loading
);

export const useHasErrors = () => useStore((state) =>
  Boolean(state.auth.error || state.courses.error || state.user.error || state.notifications.error || state.availability.error)
);

export const useGlobalError = () => useStore((state) =>
  state.auth.error || state.courses.error || state.user.error || state.notifications.error || state.availability.error || state.app.ui.error
);

// Availability-specific selectors
export const useAvailabilityData = () => useStore((state) => state.availability.data);
export const useAvailabilityFilters = () => useStore((state) => state.availability.filters);
export const useAvailabilityLoading = () => useStore((state) => state.availability.loading);
export const useAvailabilityError = () => useStore((state) => state.availability.error);
export const useAvailabilityHasData = () => useStore((state) => state.availability.hasData);
export const useAvailabilityIsEmpty = () => useStore((state) => state.availability.isEmpty);

// Role management selectors
export const useActiveRole = () => useStore((state) => state.auth.activeRole);
export const usePermissions = () => useStore((state) => state.auth.permissions);
export const useRoleLoading = () => useStore((state) => state.auth.roleLoading);
export const useRoleError = () => useStore((state) => state.auth.roleError);
export const useAvailableRoles = () => useStore((state) => state.auth.availableRoles);
export const useIsMultiRole = () => useStore((state) => state.auth.isMultiRole);
export const useCanAccessAdmin = () => useStore((state) => state.auth.canAccessAdmin);
export const useCanAccessTutorDashboard = () => useStore((state) => state.auth.canAccessTutorDashboard);
export const useCanAccessStudentDashboard = () => useStore((state) => state.auth.canAccessStudentDashboard);
export const useCanAccessGuardianDashboard = () => useStore((state) => state.auth.canAccessGuardianDashboard);
export const useIsAdmin = () => useStore((state) => state.auth.isAdmin);
export const useIsTutor = () => useStore((state) => state.auth.isTutor);
export const useIsStudent = () => useStore((state) => state.auth.isStudent);
export const useIsGuardian = () => useStore((state) => state.auth.isGuardian);

// Store initialization
let hasInitialized = false;

export const initializeStore = async () => {
  if (hasInitialized) return;

  try {
    // Initialize any async data or connections here
    const store = useStore.getState();

    // Initialize app settings from localStorage
    store.app.actions.initializeSettings();

    // Initialize auth if token exists
    if (store.auth?.token) {
      await store.auth.actions.validateToken();
    }

    // Fetch notification settings if authenticated
    if (store.auth?.isAuthenticated) {
      try {
        await store.notifications.actions.fetchSettings();
      } catch (error) {
        console.warn('Failed to fetch notification settings:', error);
      }
    }

    hasInitialized = true;
  } catch (error) {
    console.error('Failed to initialize store:', error);
  }
};

// Store cleanup
export const cleanupStore = () => {
  // Clean up any subscriptions or connections
  hasInitialized = false;
};

export default useStore;