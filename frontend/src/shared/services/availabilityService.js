/**
 * Availability Service for handling tutor availability data
 * Replaces mock data generation with real API calls
 */

import API from './api';

// Default error messages for different failure scenarios
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  NOT_FOUND: 'The requested availability data was not found.',
  VALIDATION_ERROR: 'Invalid request parameters.',
  UNKNOWN_ERROR: 'An unexpected error occurred while loading availability data.'
};

class AvailabilityService {
  /**
   * Get course tutor availability for a specific date range
   * @param {string} courseId - Course ID
   * @param {string} moduleId - Optional module ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Availability data
   */
  async getCourseAvailability(courseId, moduleId = null, startDate = null, endDate = null) {
    try {
      // Use the established API pattern - all parameters are handled by the API method
      const response = await API.availability.getCourseAvailability(courseId, moduleId, startDate, endDate);

      // Handle standardized API response format
      if (response.data?.data) {
        return this.normalizeAvailabilityData(response.data.data);
      }

      // Fallback for legacy format
      return this.normalizeAvailabilityData(response.data);
    } catch (error) {
      console.error('Error fetching course availability:', error);
      throw this.handleApiError(error, 'Failed to load course availability');
    }
  }

  /**
   * Get tutor availability for a specific tutor and date range
   * @param {string} tutorId - Tutor ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Tutor availability data
   */
  async getTutorAvailability(tutorId, startDate, endDate) {
    try {
      // Use the established API pattern - parameters are handled by the API method
      const response = await API.availability.getTutorAvailabilityRange(tutorId, startDate, endDate);

      // The instances endpoint returns availability array directly
      if (response.data?.availability) {
        return this.normalizeAvailabilityData(response.data.availability);
      }

      return this.normalizeAvailabilityData(response.data);
    } catch (error) {
      console.error('Error fetching tutor availability:', error);
      throw this.handleApiError(error, 'Failed to load tutor availability');
    }
  }

  /**
   * Normalize availability data to consistent format
   * @param {Object} data - Raw availability data from API
   * @returns {Array} Normalized availability slots
   */
  normalizeAvailabilityData(data) {
    if (!data) return [];

    // Handle array of virtual instances directly (new unified system)
    if (Array.isArray(data)) {
      return data.map(instance => this.normalizeVirtualInstance(instance)).filter(Boolean);
    }

    const availabilitySlots = [];

    // Handle tutors array from course availability API (legacy)
    if (data.tutors && Array.isArray(data.tutors)) {
      data.tutors.forEach(tutor => {
        if (tutor.availability && Array.isArray(tutor.availability)) {
          tutor.availability.forEach(dateAvailability => {
            if (dateAvailability.time_slots && Array.isArray(dateAvailability.time_slots)) {
              dateAvailability.time_slots.forEach(timeSlot => {
                const slot = this.createAvailabilitySlot(
                  tutor,
                  dateAvailability.date,
                  timeSlot
                );
                if (slot) availabilitySlots.push(slot);
              });
            }
          });
        }
      });
    }

    return availabilitySlots;
  }

  /**
   * Normalize a virtual instance from the unified system
   * @param {Object} instance - Virtual availability instance
   * @returns {Object} Normalized availability slot
   */
  normalizeVirtualInstance(instance) {
    try {
      if (!instance || !instance.tutorId) {
        return null;
      }

      // Create Date objects for the instance
      const instanceDate = instance.instance_date || instance.date;
      if (!instanceDate) {
        console.warn('Virtual instance missing date:', instance);
        return null;
      }

      // Parse times and create full datetime objects
      const startTime = instance.startTime || instance.start_time;
      const endTime = instance.endTime || instance.end_time;

      if (!startTime || !endTime) {
        console.warn('Virtual instance missing time:', instance);
        return null;
      }

      const startDateTime = new Date(`${instanceDate}T${startTime}:00`);
      const endDateTime = new Date(`${instanceDate}T${endTime}:00`);

      return {
        id: instance.id,
        tutorId: instance.tutorId,
        tutorName: instance.tutorName || 'Unknown Tutor',
        courseId: instance.courseId,
        start: startDateTime,
        end: endDateTime,
        date: instanceDate,
        startTime,
        endTime,
        timeZone: instance.timeZone || instance.timezone,
        isRecurring: instance.isRecurring || false,
        isVirtual: instance.is_virtual || false,
        parentId: instance.parent_id || instance.parentAvailabilityId,
        slotType: instance.slot_type || 'instance',
        available: instance.available !== false,
        recurrenceDays: instance.recurrenceDays || [],
        dayOfWeek: instance.dayOfWeek,
        // Add metadata for tracking
        source: 'virtual_instances',
        instanceDate: instanceDate
      };
    } catch (error) {
      console.error('Error normalizing virtual instance:', error, instance);
      return null;
    }
  }

  /**
   * Normalize single tutor availability data
   * @param {Array} data - Tutor availability data
   * @returns {Array} Normalized availability slots
   */
  normalizeTutorAvailability(data) {
    if (!Array.isArray(data)) return [];

    const availabilitySlots = [];

    data.forEach(dateAvailability => {
      if (dateAvailability.time_slots && Array.isArray(dateAvailability.time_slots)) {
        dateAvailability.time_slots.forEach(timeSlot => {
          const slot = this.createAvailabilitySlot(
            null, // No tutor info in single tutor call
            dateAvailability.date,
            timeSlot
          );
          if (slot) availabilitySlots.push(slot);
        });
      }
    });

    return availabilitySlots;
  }

  /**
   * Create normalized availability slot object
   * @param {Object} tutor - Tutor information
   * @param {string} date - Date string
   * @param {Object} timeSlot - Time slot information
   * @returns {Object|null} Normalized slot object
   */
  createAvailabilitySlot(tutor, date, timeSlot) {
    if (!date || !timeSlot || !timeSlot.available) {
      return null;
    }

    try {
      // Parse date and time
      const slotDate = new Date(date);
      const startTime = timeSlot.start_time || timeSlot.startTime;
      const endTime = timeSlot.end_time || timeSlot.endTime;

      if (!startTime || !endTime) {
        return null;
      }

      // Create start and end datetime objects
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const start = new Date(slotDate);
      start.setHours(startHour, startMin, 0, 0);

      const end = new Date(slotDate);
      end.setHours(endHour, endMin, 0, 0);

      return {
        id: timeSlot.id || `${tutor?.id || 'tutor'}-${date}-${startTime}`,
        tutorId: tutor?.id || timeSlot.tutorId,
        tutorName: tutor?.name || timeSlot.tutorName || 'Unknown Tutor',
        start,
        end,
        type: 'availability',
        available: timeSlot.available,
        timezone: timeSlot.timezone || 'UTC',
        courseId: timeSlot.course_id || timeSlot.courseId
      };
    } catch (error) {
      console.error('Error creating availability slot:', error);
      return null;
    }
  }

  /**
   * Generate date range for API calls
   * @param {Date} selectedDate - Currently selected date
   * @param {number} weeksBefore - Number of weeks before selected date
   * @param {number} weeksAfter - Number of weeks after selected date
   * @returns {Object} Date range object
   */
  getDateRange(selectedDate, weeksBefore = 1, weeksAfter = 2) {
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - (weeksBefore * 7));

    const endDate = new Date(selectedDate);
    endDate.setDate(endDate.getDate() + (weeksAfter * 7));

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  /**
   * Check for conflicts between availability slots and existing sessions
   * @param {Array} availabilitySlots - Availability slots
   * @param {Array} sessions - Existing sessions
   * @returns {Array} Filtered availability slots without conflicts
   */
  filterConflicts(availabilitySlots, sessions) {
    if (!sessions || sessions.length === 0) {
      return availabilitySlots;
    }

    return availabilitySlots.filter(slot => {
      return !sessions.some(session => {
        // Check if session conflicts with this availability slot
        const sessionStart = new Date(session.start || session.scheduled_date);
        const sessionEnd = new Date(session.end ||
          new Date(sessionStart.getTime() + (session.duration || 60) * 60000));

        return (
          session.tutorId === slot.tutorId &&
          slot.start < sessionEnd &&
          slot.end > sessionStart
        );
      });
    });
  }

  /**
   * Group availability slots by date for calendar display
   * @param {Array} availabilitySlots - Availability slots
   * @returns {Object} Grouped availability by date
   */
  groupByDate(availabilitySlots) {
    const grouped = {};

    availabilitySlots.forEach(slot => {
      const dateKey = slot.start.toISOString().split('T')[0];

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(slot);
    });

    // Sort slots within each date
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => a.start - b.start);
    });

    return grouped;
  }

  /**
   * Handle API errors with appropriate user messages
   * @param {Error} error - The error object
   * @param {string} context - Context message
   * @returns {Error} Enhanced error object
   */
  handleApiError(error, context = 'API operation failed') {
    let userMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
    let errorCode = 'UNKNOWN_ERROR';

    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 400:
          userMessage = ERROR_MESSAGES.VALIDATION_ERROR;
          errorCode = 'BAD_REQUEST';
          break;
        case 401:
          userMessage = 'Please log in to access availability data';
          errorCode = 'UNAUTHORIZED';
          break;
        case 403:
          userMessage = 'You do not have permission to view this availability data';
          errorCode = 'FORBIDDEN';
          break;
        case 404:
          userMessage = ERROR_MESSAGES.NOT_FOUND;
          errorCode = 'NOT_FOUND';
          break;
        case 500:
          userMessage = ERROR_MESSAGES.SERVER_ERROR;
          errorCode = 'SERVER_ERROR';
          break;
        default:
          userMessage = `${context}: Server error (${status})`;
          errorCode = `HTTP_${status}`;
      }

      // Use API-provided message if available
      if (data?.message) {
        userMessage = data.message;
      }
    } else if (error.request) {
      // Network error
      userMessage = ERROR_MESSAGES.NETWORK_ERROR;
      errorCode = 'NETWORK_ERROR';
    } else {
      // Other error
      userMessage = error.message || ERROR_MESSAGES.UNKNOWN_ERROR;
    }

    const enhancedError = new Error(userMessage);
    enhancedError.code = errorCode;
    enhancedError.context = context;
    enhancedError.originalError = error;

    return enhancedError;
  }
}

// Create singleton instance
const availabilityService = new AvailabilityService();

export default availabilityService;