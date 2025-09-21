import { calendarService } from '@features/calendar';

const createAvailabilitySlice = (set, get) => ({
  availability: {
    // State
    data: [],
    loading: false,
    error: null,
    filters: {
      courseId: null,
      moduleId: null,
      tutorIds: [],
      dateRange: {
        startDate: null,
        endDate: null
      },
      showConflicts: true
    },
    cache: new Map(),

    // Actions
    actions: {
      setLoading: (loading) =>
        set((state) => ({
          availability: {
            ...state.availability,
            loading,
            error: loading ? null : state.availability.error
          }
        })),

      setData: (data) =>
        set((state) => ({
          availability: {
            ...state.availability,
            data: data || [],
            loading: false,
            error: null
          }
        })),

      setError: (error) =>
        set((state) => ({
          availability: {
            ...state.availability,
            error,
            loading: false
          }
        })),

      clearError: () =>
        set((state) => ({
          availability: {
            ...state.availability,
            error: null
          }
        })),

      addAvailability: (availabilitySlot) => {
        set((state) => ({
          availability: {
            ...state.availability,
            data: [...state.availability.data, availabilitySlot]
          }
        }));
        get().availability.actions.clearCache();
      },

      updateAvailability: (availabilitySlot) => {
        set((state) => ({
          availability: {
            ...state.availability,
            data: state.availability.data.map(item =>
              item.id === availabilitySlot.id ? { ...item, ...availabilitySlot } : item
            )
          }
        }));
        get().availability.actions.clearCache();
      },

      removeAvailability: (availabilityId) => {
        set((state) => ({
          availability: {
            ...state.availability,
            data: state.availability.data.filter(item => item.id !== availabilityId)
          }
        }));
        get().availability.actions.clearCache();
      },

      setFilters: (newFilters) =>
        set((state) => ({
          availability: {
            ...state.availability,
            filters: { ...state.availability.filters, ...newFilters }
          }
        })),

      clearData: () =>
        set((state) => ({
          availability: {
            ...state.availability,
            data: [],
            error: null
          }
        })),

      clearCache: () => {
        const state = get().availability;
        state.cache.clear();
      },

      // Generate cache key from filters
      getCacheKey: (filters) => {
        const { courseId, moduleId, dateRange, tutorIds } = filters;
        return JSON.stringify({
          courseId,
          moduleId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          tutorIds: tutorIds.sort()
        });
      },

      // Load availability data
      loadAvailability: async (filters = null) => {
        const state = get().availability;
        const activeFilters = filters || state.filters;

        if (!activeFilters.courseId) {
          state.actions.clearData();
          return;
        }

        const cacheKey = state.actions.getCacheKey(activeFilters);

        // Check cache first
        if (state.cache.has(cacheKey)) {
          const cachedData = state.cache.get(cacheKey);
          state.actions.setData(cachedData);
          return;
        }

        state.actions.setLoading(true);

        try {
          const data = await calendarService.getCourseAvailability(
            activeFilters.courseId,
            activeFilters.moduleId,
            activeFilters.dateRange.startDate,
            activeFilters.dateRange.endDate
          );

          // Filter by tutors if specified
          let filteredData = data;
          if (activeFilters.tutorIds && activeFilters.tutorIds.length > 0) {
            filteredData = data.filter(slot =>
              activeFilters.tutorIds.includes(slot.tutorId)
            );
          }

          // Cache the result
          const currentState = get().availability;
          currentState.cache.set(cacheKey, filteredData);

          state.actions.setData(filteredData);
        } catch (error) {
          console.error('Failed to load availability:', error);
          state.actions.setError(error.message || 'Failed to load availability data');
        }
      },

      // Update filters and reload data
      updateFilters: async (newFilters) => {
        const state = get().availability;
        state.actions.setFilters(newFilters);

        // Auto-reload if we have essential filters
        const updatedFilters = { ...state.filters, ...newFilters };
        if (updatedFilters.courseId && updatedFilters.dateRange.startDate) {
          await state.actions.loadAvailability(updatedFilters);
        }
      },

      // Reload data (bypasses cache)
      reloadAvailability: async () => {
        const state = get().availability;
        state.actions.clearCache();
        await state.actions.loadAvailability();
      },

      // Get availability grouped by date
      getGroupedAvailability: () => {
        const state = get().availability;
        return calendarService.groupByDate(state.data);
      },

      // Filter conflicts
      filterConflicts: (sessions) => {
        const state = get().availability;
        return calendarService.filterConflicts(state.data, sessions);
      }
    },

    // Computed values
    get hasData() {
      return get().availability.data.length > 0;
    },

    get isEmpty() {
      const state = get().availability;
      return state.data.length === 0 && !state.loading && !state.error;
    }
  }
});

export default createAvailabilitySlice;