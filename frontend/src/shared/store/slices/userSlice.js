import { userService } from '@features/users/services/userService';

const initialUserState = {
  profile: null,
  students: [], // For guardians
  guardians: [], // For students
  tutors: [], // For students
  sessions: [],
  availability: [],
  earnings: null, // For tutors
  stats: null,
  loading: false,
  error: null,
  preferences: {
    emailNotifications: true,
    smsNotifications: false,
    sessionReminders: true,
    marketingEmails: false,
    timezone: 'UTC',
    language: 'en'
  },
  verification: {
    email: false,
    phone: false,
    identity: false,
    background: false
  },
  subscription: {
    plan: 'free',
    status: 'active',
    expiresAt: null,
    features: []
  }
};

export const createUserSlice = (set, get) => ({
  user: {
    ...initialUserState,

    actions: {
      // Fetch user profile
      fetchProfile: async () => {
        set((state) => {
          state.user.loading = true;
          state.user.error = null;
        });

        try {
          const profile = await userService.getProfile();

          set((state) => {
            state.user.profile = profile;
            state.user.verification = profile.verification || state.user.verification;
            state.user.preferences = { ...state.user.preferences, ...profile.preferences };
            state.user.subscription = { ...state.user.subscription, ...profile.subscription };
            state.user.loading = false;
          });

          return profile;
        } catch (error) {
          set((state) => {
            state.user.loading = false;
            state.user.error = error.message;
          });
          throw error;
        }
      },

      // Update user profile
      updateProfile: async (updates) => {
        set((state) => {
          state.user.loading = true;
          state.user.error = null;
        });

        try {
          const updatedProfile = await userService.updateProfile(updates);

          set((state) => {
            state.user.profile = { ...state.user.profile, ...updatedProfile };
            state.user.loading = false;
          });

          return updatedProfile;
        } catch (error) {
          set((state) => {
            state.user.loading = false;
            state.user.error = error.message;
          });
          throw error;
        }
      },

      // Upload profile picture
      uploadProfilePicture: async (file) => {
        set((state) => {
          state.user.loading = true;
          state.user.error = null;
        });

        try {
          const result = await userService.uploadProfilePicture(file);

          set((state) => {
            if (state.user.profile) {
              state.user.profile.profilePicture = result.url;
            }
            state.user.loading = false;
          });

          return result;
        } catch (error) {
          set((state) => {
            state.user.loading = false;
            state.user.error = error.message;
          });
          throw error;
        }
      },

      // Update preferences
      updatePreferences: async (preferences) => {
        try {
          await userService.updatePreferences(preferences);

          set((state) => {
            state.user.preferences = { ...state.user.preferences, ...preferences };
          });
        } catch (error) {
          console.error('Failed to update preferences:', error);
          throw error;
        }
      },

      // Fetch user sessions
      fetchSessions: async (params = {}) => {
        set((state) => {
          state.user.loading = true;
          state.user.error = null;
        });

        try {
          const sessions = await userService.getSessions(params);

          set((state) => {
            state.user.sessions = sessions;
            state.user.loading = false;
          });

          return sessions;
        } catch (error) {
          set((state) => {
            state.user.loading = false;
            state.user.error = error.message;
          });
          throw error;
        }
      },

      // Fetch user availability (for tutors)
      fetchAvailability: async () => {
        try {
          const availability = await userService.getAvailability();

          set((state) => {
            state.user.availability = availability;
          });

          return availability;
        } catch (error) {
          console.error('Failed to fetch availability:', error);
          throw error;
        }
      },

      // Update availability
      updateAvailability: async (availability) => {
        try {
          const updatedAvailability = await userService.updateAvailability(availability);

          set((state) => {
            state.user.availability = updatedAvailability;
          });

          return updatedAvailability;
        } catch (error) {
          console.error('Failed to update availability:', error);
          throw error;
        }
      },

      // Fetch earnings (for tutors)
      fetchEarnings: async (period = 'month') => {
        set((state) => {
          state.user.loading = true;
          state.user.error = null;
        });

        try {
          const earnings = await userService.getEarnings(period);

          set((state) => {
            state.user.earnings = earnings;
            state.user.loading = false;
          });

          return earnings;
        } catch (error) {
          set((state) => {
            state.user.loading = false;
            state.user.error = error.message;
          });
          throw error;
        }
      },

      // Fetch user stats
      fetchStats: async () => {
        try {
          const stats = await userService.getStats();

          set((state) => {
            state.user.stats = stats;
          });

          return stats;
        } catch (error) {
          console.error('Failed to fetch user stats:', error);
          throw error;
        }
      },

      // For guardians - fetch managed students
      fetchStudents: async () => {
        set((state) => {
          state.user.loading = true;
          state.user.error = null;
        });

        try {
          const students = await userService.getStudents();

          set((state) => {
            state.user.students = students;
            state.user.loading = false;
          });

          return students;
        } catch (error) {
          set((state) => {
            state.user.loading = false;
            state.user.error = error.message;
          });
          throw error;
        }
      },

      // For students - fetch guardians
      fetchGuardians: async () => {
        try {
          const guardians = await userService.getGuardians();

          set((state) => {
            state.user.guardians = guardians;
          });

          return guardians;
        } catch (error) {
          console.error('Failed to fetch guardians:', error);
          throw error;
        }
      },

      // For students - fetch tutors
      fetchTutors: async () => {
        try {
          const tutors = await userService.getTutors();

          set((state) => {
            state.user.tutors = tutors;
          });

          return tutors;
        } catch (error) {
          console.error('Failed to fetch tutors:', error);
          throw error;
        }
      },

      // Add student (for guardians)
      addStudent: async (studentData) => {
        set((state) => {
          state.user.loading = true;
          state.user.error = null;
        });

        try {
          const newStudent = await userService.addStudent(studentData);

          set((state) => {
            state.user.students.push(newStudent);
            state.user.loading = false;
          });

          return newStudent;
        } catch (error) {
          set((state) => {
            state.user.loading = false;
            state.user.error = error.message;
          });
          throw error;
        }
      },

      // Remove student (for guardians)
      removeStudent: async (studentId) => {
        try {
          await userService.removeStudent(studentId);

          set((state) => {
            state.user.students = state.user.students.filter(student => student.id !== studentId);
          });
        } catch (error) {
          console.error('Failed to remove student:', error);
          throw error;
        }
      },

      // Request guardian access (for students)
      requestGuardian: async (guardianEmail) => {
        try {
          const request = await userService.requestGuardian(guardianEmail);
          return request;
        } catch (error) {
          console.error('Failed to request guardian:', error);
          throw error;
        }
      },

      // Accept guardian request
      acceptGuardianRequest: async (requestId) => {
        try {
          await userService.acceptGuardianRequest(requestId);

          // Refresh guardians list
          await get().user.actions.fetchGuardians();
        } catch (error) {
          console.error('Failed to accept guardian request:', error);
          throw error;
        }
      },

      // Verification actions
      requestEmailVerification: async () => {
        try {
          await userService.requestEmailVerification();
        } catch (error) {
          console.error('Failed to request email verification:', error);
          throw error;
        }
      },

      verifyEmail: async (token) => {
        try {
          await userService.verifyEmail(token);

          set((state) => {
            state.user.verification.email = true;
          });
        } catch (error) {
          console.error('Failed to verify email:', error);
          throw error;
        }
      },

      requestPhoneVerification: async (phoneNumber) => {
        try {
          await userService.requestPhoneVerification(phoneNumber);
        } catch (error) {
          console.error('Failed to request phone verification:', error);
          throw error;
        }
      },

      verifyPhone: async (code) => {
        try {
          await userService.verifyPhone(code);

          set((state) => {
            state.user.verification.phone = true;
          });
        } catch (error) {
          console.error('Failed to verify phone:', error);
          throw error;
        }
      },

      // Subscription management
      upgradeSubscription: async (planId, paymentMethod) => {
        set((state) => {
          state.user.loading = true;
          state.user.error = null;
        });

        try {
          const subscription = await userService.upgradeSubscription(planId, paymentMethod);

          set((state) => {
            state.user.subscription = { ...state.user.subscription, ...subscription };
            state.user.loading = false;
          });

          return subscription;
        } catch (error) {
          set((state) => {
            state.user.loading = false;
            state.user.error = error.message;
          });
          throw error;
        }
      },

      cancelSubscription: async () => {
        try {
          await userService.cancelSubscription();

          set((state) => {
            state.user.subscription.status = 'cancelled';
          });
        } catch (error) {
          console.error('Failed to cancel subscription:', error);
          throw error;
        }
      },

      // Account management
      changePassword: async (currentPassword, newPassword) => {
        set((state) => {
          state.user.loading = true;
          state.user.error = null;
        });

        try {
          await userService.changePassword(currentPassword, newPassword);

          set((state) => {
            state.user.loading = false;
          });
        } catch (error) {
          set((state) => {
            state.user.loading = false;
            state.user.error = error.message;
          });
          throw error;
        }
      },

      deleteAccount: async (password) => {
        set((state) => {
          state.user.loading = true;
          state.user.error = null;
        });

        try {
          await userService.deleteAccount(password);

          // Reset user state
          set((state) => {
            Object.assign(state.user, initialUserState);
          });
        } catch (error) {
          set((state) => {
            state.user.loading = false;
            state.user.error = error.message;
          });
          throw error;
        }
      },

      // Utility actions
      clearError: () => {
        set((state) => {
          state.user.error = null;
        });
      },

      setLoading: (loading) => {
        set((state) => {
          state.user.loading = loading;
        });
      },

      // Local profile updates (for optimistic updates)
      updateLocalProfile: (updates) => {
        set((state) => {
          if (state.user.profile) {
            state.user.profile = { ...state.user.profile, ...updates };
          }
        });
      },

      // Reset user state
      reset: () => {
        set((state) => {
          Object.assign(state.user, initialUserState);
        });
      }
    }
  }
});