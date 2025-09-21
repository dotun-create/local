import { courseService } from '@features/courses/services/courseService';

const initialCourseState = {
  courses: [],
  enrolledCourses: [],
  teachingCourses: [],
  featuredCourses: [],
  categories: [],
  currentCourse: null,
  searchResults: [],
  loading: false,
  error: null,
  filters: {
    category: '',
    level: '',
    priceRange: { min: 0, max: 1000 },
    duration: '',
    rating: 0,
    searchQuery: ''
  },
  pagination: {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  },
  enrollmentStatus: null,
  progress: {}
};

export const createCourseSlice = (set, get) => ({
  courses: {
    ...initialCourseState,

    actions: {
      // Fetch all courses
      fetchCourses: async (params = {}) => {
        set((state) => {
          state.courses.loading = true;
          state.courses.error = null;
        });

        try {
          const response = await courseService.getCourses(params);

          set((state) => {
            state.courses.courses = response.courses;
            state.courses.pagination = {
              page: response.page || 1,
              limit: response.limit || 12,
              total: response.total || 0,
              totalPages: response.totalPages || 0
            };
            state.courses.loading = false;
          });

          return response;
        } catch (error) {
          set((state) => {
            state.courses.loading = false;
            state.courses.error = error.message;
          });
          throw error;
        }
      },

      // Fetch course by ID
      fetchCourse: async (courseId) => {
        set((state) => {
          state.courses.loading = true;
          state.courses.error = null;
        });

        try {
          const course = await courseService.getCourse(courseId);

          set((state) => {
            state.courses.currentCourse = course;
            state.courses.loading = false;
          });

          return course;
        } catch (error) {
          set((state) => {
            state.courses.loading = false;
            state.courses.error = error.message;
          });
          throw error;
        }
      },

      // Fetch enrolled courses
      fetchEnrolledCourses: async () => {
        set((state) => {
          state.courses.loading = true;
          state.courses.error = null;
        });

        try {
          const enrolledCourses = await courseService.getEnrolledCourses();

          set((state) => {
            state.courses.enrolledCourses = enrolledCourses;
            state.courses.loading = false;
          });

          return enrolledCourses;
        } catch (error) {
          set((state) => {
            state.courses.loading = false;
            state.courses.error = error.message;
          });
          throw error;
        }
      },

      // Fetch teaching courses (for tutors)
      fetchTeachingCourses: async () => {
        set((state) => {
          state.courses.loading = true;
          state.courses.error = null;
        });

        try {
          const teachingCourses = await courseService.getTeachingCourses();

          set((state) => {
            state.courses.teachingCourses = teachingCourses;
            state.courses.loading = false;
          });

          return teachingCourses;
        } catch (error) {
          set((state) => {
            state.courses.loading = false;
            state.courses.error = error.message;
          });
          throw error;
        }
      },

      // Fetch featured courses
      fetchFeaturedCourses: async () => {
        try {
          const featuredCourses = await courseService.getFeaturedCourses();

          set((state) => {
            state.courses.featuredCourses = featuredCourses;
          });

          return featuredCourses;
        } catch (error) {
          console.error('Failed to fetch featured courses:', error);
          throw error;
        }
      },

      // Fetch course categories
      fetchCategories: async () => {
        try {
          const categories = await courseService.getCategories();

          set((state) => {
            state.courses.categories = categories;
          });

          return categories;
        } catch (error) {
          console.error('Failed to fetch categories:', error);
          throw error;
        }
      },

      // Search courses
      searchCourses: async (query, filters = {}) => {
        set((state) => {
          state.courses.loading = true;
          state.courses.error = null;
          state.courses.filters.searchQuery = query;
        });

        try {
          const response = await courseService.searchCourses(query, filters);

          set((state) => {
            state.courses.searchResults = response.courses;
            state.courses.pagination = {
              page: response.page || 1,
              limit: response.limit || 12,
              total: response.total || 0,
              totalPages: response.totalPages || 0
            };
            state.courses.loading = false;
          });

          return response;
        } catch (error) {
          set((state) => {
            state.courses.loading = false;
            state.courses.error = error.message;
          });
          throw error;
        }
      },

      // Enroll in course
      enrollInCourse: async (courseId, paymentInfo = null) => {
        set((state) => {
          state.courses.loading = true;
          state.courses.error = null;
        });

        try {
          const result = await courseService.enrollInCourse(courseId, paymentInfo);

          set((state) => {
            state.courses.enrollmentStatus = 'enrolled';
            state.courses.loading = false;

            // Add to enrolled courses if not already there
            const exists = state.courses.enrolledCourses.find(course => course.id === courseId);
            if (!exists && state.courses.currentCourse?.id === courseId) {
              state.courses.enrolledCourses.push({
                ...state.courses.currentCourse,
                enrollmentDate: new Date().toISOString(),
                progress: 0
              });
            }
          });

          return result;
        } catch (error) {
          set((state) => {
            state.courses.loading = false;
            state.courses.error = error.message;
            state.courses.enrollmentStatus = 'failed';
          });
          throw error;
        }
      },

      // Create course (for tutors)
      createCourse: async (courseData) => {
        set((state) => {
          state.courses.loading = true;
          state.courses.error = null;
        });

        try {
          const newCourse = await courseService.createCourse(courseData);

          set((state) => {
            state.courses.teachingCourses.push(newCourse);
            state.courses.loading = false;
          });

          return newCourse;
        } catch (error) {
          set((state) => {
            state.courses.loading = false;
            state.courses.error = error.message;
          });
          throw error;
        }
      },

      // Update course
      updateCourse: async (courseId, updates) => {
        set((state) => {
          state.courses.loading = true;
          state.courses.error = null;
        });

        try {
          const updatedCourse = await courseService.updateCourse(courseId, updates);

          set((state) => {
            // Update in all relevant arrays
            const updateCourseInArray = (array) => {
              const index = array.findIndex(course => course.id === courseId);
              if (index !== -1) {
                array[index] = updatedCourse;
              }
            };

            updateCourseInArray(state.courses.courses);
            updateCourseInArray(state.courses.teachingCourses);
            updateCourseInArray(state.courses.enrolledCourses);

            if (state.courses.currentCourse?.id === courseId) {
              state.courses.currentCourse = updatedCourse;
            }

            state.courses.loading = false;
          });

          return updatedCourse;
        } catch (error) {
          set((state) => {
            state.courses.loading = false;
            state.courses.error = error.message;
          });
          throw error;
        }
      },

      // Delete course
      deleteCourse: async (courseId) => {
        set((state) => {
          state.courses.loading = true;
          state.courses.error = null;
        });

        try {
          await courseService.deleteCourse(courseId);

          set((state) => {
            state.courses.courses = state.courses.courses.filter(course => course.id !== courseId);
            state.courses.teachingCourses = state.courses.teachingCourses.filter(course => course.id !== courseId);

            if (state.courses.currentCourse?.id === courseId) {
              state.courses.currentCourse = null;
            }

            state.courses.loading = false;
          });
        } catch (error) {
          set((state) => {
            state.courses.loading = false;
            state.courses.error = error.message;
          });
          throw error;
        }
      },

      // Update course progress
      updateProgress: async (courseId, progress) => {
        try {
          await courseService.updateProgress(courseId, progress);

          set((state) => {
            state.courses.progress[courseId] = progress;

            // Update progress in enrolled courses
            const enrolledCourse = state.courses.enrolledCourses.find(course => course.id === courseId);
            if (enrolledCourse) {
              enrolledCourse.progress = progress;
            }
          });
        } catch (error) {
          console.error('Failed to update progress:', error);
          throw error;
        }
      },

      // Set filters
      setFilters: (filters) => {
        set((state) => {
          state.courses.filters = { ...state.courses.filters, ...filters };
        });
      },

      // Clear filters
      clearFilters: () => {
        set((state) => {
          state.courses.filters = {
            category: '',
            level: '',
            priceRange: { min: 0, max: 1000 },
            duration: '',
            rating: 0,
            searchQuery: ''
          };
        });
      },

      // Set pagination
      setPagination: (pagination) => {
        set((state) => {
          state.courses.pagination = { ...state.courses.pagination, ...pagination };
        });
      },

      // Clear current course
      clearCurrentCourse: () => {
        set((state) => {
          state.courses.currentCourse = null;
        });
      },

      // Clear search results
      clearSearchResults: () => {
        set((state) => {
          state.courses.searchResults = [];
          state.courses.filters.searchQuery = '';
        });
      },

      // Clear error
      clearError: () => {
        set((state) => {
          state.courses.error = null;
        });
      },

      // Set loading
      setLoading: (loading) => {
        set((state) => {
          state.courses.loading = loading;
        });
      },

      // Clear enrollment status
      clearEnrollmentStatus: () => {
        set((state) => {
          state.courses.enrollmentStatus = null;
        });
      }
    }
  }
});