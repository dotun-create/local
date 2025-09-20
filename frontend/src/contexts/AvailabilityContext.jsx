import React, { createContext, useContext, useReducer, useCallback } from 'react';
import availabilityService from '../services/availabilityService';

// Action types
const AVAILABILITY_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_DATA: 'SET_DATA',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  ADD_AVAILABILITY: 'ADD_AVAILABILITY',
  UPDATE_AVAILABILITY: 'UPDATE_AVAILABILITY',
  REMOVE_AVAILABILITY: 'REMOVE_AVAILABILITY',
  SET_FILTERS: 'SET_FILTERS',
  CLEAR_DATA: 'CLEAR_DATA'
};

// Initial state
const initialState = {
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
  cache: new Map() // Simple in-memory cache
};

// Reducer function
function availabilityReducer(state, action) {
  switch (action.type) {
    case AVAILABILITY_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error
      };

    case AVAILABILITY_ACTIONS.SET_DATA:
      return {
        ...state,
        data: action.payload.data || [],
        loading: false,
        error: null
      };

    case AVAILABILITY_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case AVAILABILITY_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AVAILABILITY_ACTIONS.ADD_AVAILABILITY:
      return {
        ...state,
        data: [...state.data, action.payload]
      };

    case AVAILABILITY_ACTIONS.UPDATE_AVAILABILITY:
      return {
        ...state,
        data: state.data.map(item =>
          item.id === action.payload.id ? { ...item, ...action.payload } : item
        )
      };

    case AVAILABILITY_ACTIONS.REMOVE_AVAILABILITY:
      return {
        ...state,
        data: state.data.filter(item => item.id !== action.payload)
      };

    case AVAILABILITY_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };

    case AVAILABILITY_ACTIONS.CLEAR_DATA:
      return {
        ...state,
        data: [],
        error: null
      };

    default:
      return state;
  }
}

// Create context
const AvailabilityContext = createContext();

// Provider component
export function AvailabilityProvider({ children }) {
  const [state, dispatch] = useReducer(availabilityReducer, initialState);

  // Generate cache key from filters
  const getCacheKey = useCallback((filters) => {
    const { courseId, moduleId, dateRange, tutorIds } = filters;
    return JSON.stringify({
      courseId,
      moduleId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      tutorIds: tutorIds.sort()
    });
  }, []);

  // Load availability data
  const loadAvailability = useCallback(async (filters = null) => {
    const activeFilters = filters || state.filters;
    
    if (!activeFilters.courseId) {
      dispatch({ type: AVAILABILITY_ACTIONS.CLEAR_DATA });
      return;
    }

    const cacheKey = getCacheKey(activeFilters);
    
    // Check cache first
    if (state.cache.has(cacheKey)) {
      const cachedData = state.cache.get(cacheKey);
      dispatch({
        type: AVAILABILITY_ACTIONS.SET_DATA,
        payload: { data: cachedData }
      });
      return;
    }

    dispatch({ type: AVAILABILITY_ACTIONS.SET_LOADING, payload: true });

    try {
      const data = await availabilityService.getCourseAvailability(
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
      state.cache.set(cacheKey, filteredData);

      dispatch({
        type: AVAILABILITY_ACTIONS.SET_DATA,
        payload: { data: filteredData }
      });
    } catch (error) {
      console.error('Failed to load availability:', error);
      dispatch({
        type: AVAILABILITY_ACTIONS.SET_ERROR,
        payload: error.message || 'Failed to load availability data'
      });
    }
  }, [state.filters, state.cache, getCacheKey]);

  // Update filters and reload data
  const updateFilters = useCallback(async (newFilters) => {
    dispatch({
      type: AVAILABILITY_ACTIONS.SET_FILTERS,
      payload: newFilters
    });

    // Auto-reload if we have essential filters
    const updatedFilters = { ...state.filters, ...newFilters };
    if (updatedFilters.courseId && updatedFilters.dateRange.startDate) {
      await loadAvailability(updatedFilters);
    }
  }, [state.filters, loadAvailability]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: AVAILABILITY_ACTIONS.CLEAR_ERROR });
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    state.cache.clear();
  }, [state.cache]);

  // Reload data (bypasses cache)
  const reloadAvailability = useCallback(async () => {
    clearCache();
    await loadAvailability();
  }, [clearCache, loadAvailability]);

  // Add optimistic update for new availability
  const addAvailability = useCallback((availabilitySlot) => {
    dispatch({
      type: AVAILABILITY_ACTIONS.ADD_AVAILABILITY,
      payload: availabilitySlot
    });
    // Clear cache to ensure fresh data on next load
    clearCache();
  }, [clearCache]);

  // Update availability slot
  const updateAvailability = useCallback((availabilitySlot) => {
    dispatch({
      type: AVAILABILITY_ACTIONS.UPDATE_AVAILABILITY,
      payload: availabilitySlot
    });
    // Clear cache to ensure fresh data on next load
    clearCache();
  }, [clearCache]);

  // Remove availability slot
  const removeAvailability = useCallback((availabilityId) => {
    dispatch({
      type: AVAILABILITY_ACTIONS.REMOVE_AVAILABILITY,
      payload: availabilityId
    });
    // Clear cache to ensure fresh data on next load
    clearCache();
  }, [clearCache]);

  // Get availability grouped by date
  const getGroupedAvailability = useCallback(() => {
    return availabilityService.groupByDate(state.data);
  }, [state.data]);

  // Filter conflicts
  const filterConflicts = useCallback((sessions) => {
    return availabilityService.filterConflicts(state.data, sessions);
  }, [state.data]);

  // Context value
  const contextValue = {
    // State
    ...state,
    
    // Actions
    loadAvailability,
    updateFilters,
    clearError,
    clearCache,
    reloadAvailability,
    addAvailability,
    updateAvailability,
    removeAvailability,
    
    // Computed
    getGroupedAvailability,
    filterConflicts,
    
    // Utils
    hasData: state.data.length > 0,
    isEmpty: state.data.length === 0 && !state.loading && !state.error
  };

  return (
    <AvailabilityContext.Provider value={contextValue}>
      {children}
    </AvailabilityContext.Provider>
  );
}

// Custom hook to use availability context
export function useAvailability() {
  const context = useContext(AvailabilityContext);
  
  if (!context) {
    throw new Error('useAvailability must be used within an AvailabilityProvider');
  }
  
  return context;
}

export default AvailabilityContext;
