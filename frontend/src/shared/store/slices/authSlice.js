import { authService } from '@features/auth/services/authService';

const initialAuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  // Role management state
  activeRole: null,
  permissions: {},
  roleLoading: false,
  roleError: null
};

export const createAuthSlice = (set, get) => ({
  auth: {
    ...initialAuthState,

    actions: {
      // Login action
      login: async (credentials) => {
        set((state) => {
          state.auth.loading = true;
          state.auth.error = null;
        });

        try {
          const response = await authService.login(credentials);

          set((state) => {
            state.auth.user = response.user;
            state.auth.token = response.token;
            state.auth.refreshToken = response.refreshToken;
            state.auth.isAuthenticated = true;
            state.auth.loading = false;
            state.auth.error = null;
          });

          // Initialize roles after successful login
          await get().auth.actions.initializeRoles();

          return response;
        } catch (error) {
          set((state) => {
            state.auth.loading = false;
            state.auth.error = error.message;
            state.auth.isAuthenticated = false;
          });
          throw error;
        }
      },

      // Register action
      register: async (userData) => {
        set((state) => {
          state.auth.loading = true;
          state.auth.error = null;
        });

        try {
          const response = await authService.register(userData);

          // Only set auth state if auto-login is enabled
          if (response.autoLogin && response.user) {
            set((state) => {
              state.auth.user = response.user;
              state.auth.token = response.token;
              state.auth.refreshToken = response.refreshToken;
              state.auth.isAuthenticated = true;
            });
          }

          set((state) => {
            state.auth.loading = false;
            state.auth.error = null;
          });

          return response;
        } catch (error) {
          set((state) => {
            state.auth.loading = false;
            state.auth.error = error.message;
          });
          throw error;
        }
      },

      // Logout action
      logout: async () => {
        try {
          await authService.logout();
        } catch (error) {
          console.error('Logout API call failed:', error);
        } finally {
          set((state) => {
            state.auth.user = null;
            state.auth.token = null;
            state.auth.refreshToken = null;
            state.auth.isAuthenticated = false;
            state.auth.loading = false;
            state.auth.error = null;
            state.auth.activeRole = null;
            state.auth.permissions = {};
            state.auth.roleLoading = false;
            state.auth.roleError = null;
          });
        }
      },

      // Validate token
      validateToken: async () => {
        const { token } = get().auth;
        if (!token) return false;

        try {
          set((state) => {
            state.auth.loading = true;
          });

          const user = await authService.getCurrentUser();

          set((state) => {
            state.auth.user = user;
            state.auth.isAuthenticated = true;
            state.auth.loading = false;
            state.auth.error = null;
          });

          // Initialize roles after token validation
          await get().auth.actions.initializeRoles();

          return true;
        } catch (error) {
          console.error('Token validation failed:', error);

          // Try to refresh token
          const { refreshToken } = get().auth;
          if (refreshToken) {
            try {
              const response = await authService.refreshToken(refreshToken);
              const user = await authService.getCurrentUser();

              set((state) => {
                state.auth.token = response.token;
                state.auth.refreshToken = response.refreshToken;
                state.auth.user = user;
                state.auth.isAuthenticated = true;
                state.auth.loading = false;
                state.auth.error = null;
              });

              // Initialize roles after token refresh
              await get().auth.actions.initializeRoles();

              return true;
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
            }
          }

          // Clear auth state if validation and refresh both fail
          set((state) => {
            state.auth.user = null;
            state.auth.token = null;
            state.auth.refreshToken = null;
            state.auth.isAuthenticated = false;
            state.auth.loading = false;
            state.auth.error = 'Session expired';
            state.auth.activeRole = null;
            state.auth.permissions = {};
            state.auth.roleLoading = false;
            state.auth.roleError = null;
          });

          return false;
        }
      },

      // Update user profile
      updateUser: async (updates) => {
        set((state) => {
          state.auth.loading = true;
          state.auth.error = null;
        });

        try {
          const updatedUser = await authService.updateProfile(updates);

          set((state) => {
            state.auth.user = updatedUser;
            state.auth.loading = false;
            state.auth.error = null;
          });

          return updatedUser;
        } catch (error) {
          set((state) => {
            state.auth.loading = false;
            state.auth.error = error.message;
          });
          throw error;
        }
      },

      // Change password
      changePassword: async (passwordData) => {
        set((state) => {
          state.auth.loading = true;
          state.auth.error = null;
        });

        try {
          await authService.changePassword(passwordData);

          set((state) => {
            state.auth.loading = false;
            state.auth.error = null;
          });

          return true;
        } catch (error) {
          set((state) => {
            state.auth.loading = false;
            state.auth.error = error.message;
          });
          throw error;
        }
      },

      // Request password reset
      requestPasswordReset: async (email) => {
        set((state) => {
          state.auth.loading = true;
          state.auth.error = null;
        });

        try {
          await authService.requestPasswordReset(email);

          set((state) => {
            state.auth.loading = false;
            state.auth.error = null;
          });

          return true;
        } catch (error) {
          set((state) => {
            state.auth.loading = false;
            state.auth.error = error.message;
          });
          throw error;
        }
      },

      // Reset password
      resetPassword: async (token, newPassword) => {
        set((state) => {
          state.auth.loading = true;
          state.auth.error = null;
        });

        try {
          await authService.resetPassword(token, newPassword);

          set((state) => {
            state.auth.loading = false;
            state.auth.error = null;
          });

          return true;
        } catch (error) {
          set((state) => {
            state.auth.loading = false;
            state.auth.error = error.message;
          });
          throw error;
        }
      },

      // Verify email
      verifyEmail: async (token) => {
        set((state) => {
          state.auth.loading = true;
          state.auth.error = null;
        });

        try {
          const response = await authService.verifyEmail(token);

          // Update user if verification was successful
          if (response.user) {
            set((state) => {
              state.auth.user = response.user;
            });
          }

          set((state) => {
            state.auth.loading = false;
            state.auth.error = null;
          });

          return response;
        } catch (error) {
          set((state) => {
            state.auth.loading = false;
            state.auth.error = error.message;
          });
          throw error;
        }
      },

      // Clear error
      clearError: () => {
        set((state) => {
          state.auth.error = null;
        });
      },

      // Set loading state
      setLoading: (loading) => {
        set((state) => {
          state.auth.loading = loading;
        });
      },

      // Role Management Actions

      // Initialize user roles when user is set/updated
      initializeRoles: async () => {
        const { user } = get().auth;
        if (!user) return;

        const userRoles = user.roles || [];

        // Only auto-set role if no activeRole is currently set or current activeRole is invalid
        const currentActiveRole = get().auth.activeRole;
        if ((!currentActiveRole || !userRoles.includes(currentActiveRole)) && userRoles.length > 0) {
          // Prioritize role selection: student > admin > tutor > guardian
          const rolePriority = ['student', 'admin', 'tutor', 'guardian'];
          const defaultRole = rolePriority.find(role => userRoles.includes(role)) || userRoles[0];

          set((state) => {
            state.auth.activeRole = defaultRole;
          });
        } else if (!userRoles.length && user.accountType) {
          // Fallback to accountType for backward compatibility
          set((state) => {
            state.auth.activeRole = user.accountType;
          });
        }

        // Load permissions
        await get().auth.actions.loadPermissions();
      },

      // Load user permissions
      loadPermissions: async () => {
        const { user } = get().auth;
        if (!user) return;

        try {
          set((state) => {
            state.auth.roleLoading = true;
            state.auth.roleError = null;
          });

          // In test environment, use synchronous permissions
          if (process.env.NODE_ENV === 'test') {
            const userPermissions = user.permissions || {};
            const testPermissions = {
              can_access_admin: user.roles?.includes('admin') || userPermissions.can_access_admin || false,
              can_access_tutor_dashboard: user.roles?.includes('tutor') || userPermissions.can_access_tutor_dashboard || false,
              can_access_student_dashboard: user.roles?.includes('student') || userPermissions.can_access_student_dashboard || false,
              can_access_guardian_dashboard: user.roles?.includes('guardian') || userPermissions.can_access_guardian_dashboard || false,
              qualified_courses: userPermissions.qualified_courses || []
            };

            set((state) => {
              state.auth.permissions = testPermissions;
              state.auth.roleLoading = false;
            });
            return;
          }

          // Get fresh user data for permissions
          const freshUser = await authService.getCurrentUser();
          const userPermissions = freshUser?.permissions || {};

          const permissions = {
            can_access_admin: freshUser?.roles?.includes('admin') || userPermissions.can_access_admin || false,
            can_access_tutor_dashboard: freshUser?.roles?.includes('tutor') || userPermissions.can_access_tutor_dashboard || false,
            can_access_student_dashboard: freshUser?.roles?.includes('student') || userPermissions.can_access_student_dashboard || false,
            can_access_guardian_dashboard: freshUser?.roles?.includes('guardian') || userPermissions.can_access_guardian_dashboard || false,
            qualified_courses: userPermissions.qualified_courses || []
          };

          set((state) => {
            state.auth.permissions = permissions;
            state.auth.roleLoading = false;
            state.auth.user = freshUser; // Update user with fresh data
          });
        } catch (error) {
          console.error('Failed to load permissions:', error);
          set((state) => {
            state.auth.permissions = {};
            state.auth.roleLoading = false;
            state.auth.roleError = error.message;
          });
        }
      },

      // Switch user role
      switchRole: async (newRole) => {
        const { user } = get().auth;
        if (!user || !get().auth.actions.hasRole(newRole)) {
          throw new Error(`User does not have role: ${newRole}`);
        }

        try {
          set((state) => {
            state.auth.roleLoading = true;
            state.auth.roleError = null;
          });

          // Call backend API for role switching
          const response = await authService.switchRole(newRole);

          set((state) => {
            state.auth.activeRole = newRole;
          });

          // Reload permissions after role switch
          await get().auth.actions.loadPermissions();

          return response;
        } catch (error) {
          console.error('Failed to switch role:', error);
          set((state) => {
            state.auth.roleError = error.message;
            state.auth.roleLoading = false;
          });
          throw error;
        }
      },

      // Check if user has a specific role
      hasRole: (role) => {
        const { user } = get().auth;
        if (!user) return false;
        const userRoles = user.roles || [];
        return userRoles.includes(role);
      },

      // Check if user has a specific permission
      hasPermission: (permission) => {
        const { permissions } = get().auth;
        return permissions[permission] === true;
      },

      // Check if user can access a specific dashboard
      canAccessDashboard: (dashboardType) => {
        return get().auth.actions.hasPermission(`can_access_${dashboardType}_dashboard`);
      },

      // Get all available roles for the user
      getAvailableRoles: () => {
        const { user } = get().auth;
        return user?.roles || [];
      },

      // Check if user has multiple roles
      isMultiRole: () => {
        const roles = get().auth.actions.getAvailableRoles();
        return roles.length > 1;
      },

      // Check if user can tutor a specific course
      canTutorCourse: (courseId) => {
        const { actions } = get().auth;
        if (!actions.hasRole('tutor')) return false;
        const { permissions } = get().auth;
        const qualifiedCourses = permissions.qualified_courses || [];
        return qualifiedCourses.includes(courseId);
      },

      // Clear role error
      clearRoleError: () => {
        set((state) => {
          state.auth.roleError = null;
        });
      }
    },

    // Computed getters
    get availableRoles() {
      const state = get().auth;
      return state.user?.roles || [];
    },

    get isMultiRole() {
      const state = get().auth;
      const roles = state.user?.roles || [];
      return roles.length > 1;
    },

    get canAccessAdmin() {
      return get().auth.actions.hasPermission('can_access_admin');
    },

    get canAccessTutorDashboard() {
      return get().auth.actions.hasPermission('can_access_tutor_dashboard');
    },

    get canAccessStudentDashboard() {
      return get().auth.actions.hasPermission('can_access_student_dashboard');
    },

    get canAccessGuardianDashboard() {
      return get().auth.actions.hasPermission('can_access_guardian_dashboard');
    },

    get isAdmin() {
      return get().auth.actions.hasRole('admin');
    },

    get isTutor() {
      return get().auth.actions.hasRole('tutor');
    },

    get isStudent() {
      return get().auth.actions.hasRole('student');
    },

    get isGuardian() {
      return get().auth.actions.hasRole('guardian');
    }
  }
});