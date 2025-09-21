import { apiClient } from '@shared/services/apiClient';

class CalendarService {
  // Availability management
  async getCourseAvailability(courseId, moduleId = null, startDate = null, endDate = null) {
    const params = {
      ...(moduleId && { moduleId }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    };

    const response = await apiClient.get(`/courses/${courseId}/availability`, { params });
    return this.normalizeAvailabilityData(response.data);
  }

  async getTutorAvailability(tutorId, startDate, endDate) {
    const response = await apiClient.get(`/tutors/${tutorId}/availability`, {
      params: { startDate, endDate }
    });
    return this.normalizeAvailabilityData(response.data);
  }

  async createAvailability(availabilityData) {
    const response = await apiClient.post('/availability', availabilityData);
    return response.data;
  }

  async updateAvailability(availabilityId, updates) {
    const response = await apiClient.patch(`/availability/${availabilityId}`, updates);
    return response.data;
  }

  async deleteAvailability(availabilityId) {
    const response = await apiClient.delete(`/availability/${availabilityId}`);
    return response.data;
  }

  // Session scheduling
  async getScheduledSessions(params = {}) {
    const response = await apiClient.get('/sessions', { params });
    return response.data;
  }

  async scheduleSession(sessionData) {
    const response = await apiClient.post('/sessions', sessionData);
    return response.data;
  }

  async updateSession(sessionId, updates) {
    const response = await apiClient.patch(`/sessions/${sessionId}`, updates);
    return response.data;
  }

  async cancelSession(sessionId, reason = null) {
    const response = await apiClient.delete(`/sessions/${sessionId}`, {
      data: { reason }
    });
    return response.data;
  }

  async rescheduleSession(sessionId, newDateTime, tutorId = null) {
    const response = await apiClient.post(`/sessions/${sessionId}/reschedule`, {
      newDateTime,
      tutorId
    });
    return response.data;
  }

  // Calendar events
  async getCalendarEvents(startDate, endDate, filters = {}) {
    const params = {
      startDate,
      endDate,
      ...filters
    };

    const response = await apiClient.get('/calendar/events', { params });
    return response.data;
  }

  async getUserCalendar(userId, startDate, endDate) {
    const response = await apiClient.get(`/users/${userId}/calendar`, {
      params: { startDate, endDate }
    });
    return response.data;
  }

  // Time zone management
  async getTimeZones() {
    const response = await apiClient.get('/timezones');
    return response.data;
  }

  async updateUserTimeZone(timeZone) {
    const response = await apiClient.patch('/users/timezone', { timeZone });
    return response.data;
  }

  // Recurring availability
  async createRecurringAvailability(recurringData) {
    const response = await apiClient.post('/availability/recurring', recurringData);
    return response.data;
  }

  async updateRecurringAvailability(recurringId, updates) {
    const response = await apiClient.patch(`/availability/recurring/${recurringId}`, updates);
    return response.data;
  }

  async deleteRecurringAvailability(recurringId) {
    const response = await apiClient.delete(`/availability/recurring/${recurringId}`);
    return response.data;
  }

  // Availability conflicts
  async checkConflicts(proposedTimes, tutorId = null) {
    const response = await apiClient.post('/availability/check-conflicts', {
      proposedTimes,
      tutorId
    });
    return response.data;
  }

  async findAlternativeTimes(originalTime, tutorId, courseId, duration = 60) {
    const response = await apiClient.post('/availability/find-alternatives', {
      originalTime,
      tutorId,
      courseId,
      duration
    });
    return response.data;
  }

  // Data normalization methods
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
        source: 'virtual_instances',
        instanceDate: instanceDate
      };
    } catch (error) {
      console.error('Error normalizing virtual instance:', error, instance);
      return null;
    }
  }

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

  // Utility methods
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

  groupByTutor(availabilitySlots) {
    const grouped = {};

    availabilitySlots.forEach(slot => {
      const tutorKey = slot.tutorId;

      if (!grouped[tutorKey]) {
        grouped[tutorKey] = {
          tutorId: slot.tutorId,
          tutorName: slot.tutorName,
          slots: []
        };
      }

      grouped[tutorKey].slots.push(slot);
    });

    return grouped;
  }

  formatTimeSlot(slot) {
    const start = new Date(slot.start);
    const end = new Date(slot.end);

    return {
      date: start.toISOString().split('T')[0],
      startTime: start.toTimeString().slice(0, 5),
      endTime: end.toTimeString().slice(0, 5),
      duration: Math.round((end - start) / (1000 * 60)) // minutes
    };
  }

  isTimeSlotAvailable(slot, existingSessions = []) {
    return !existingSessions.some(session => {
      const sessionStart = new Date(session.start);
      const sessionEnd = new Date(session.end);
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slot.end);

      return (
        session.tutorId === slot.tutorId &&
        slotStart < sessionEnd &&
        slotEnd > sessionStart
      );
    });
  }

  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.round((end - start) / (1000 * 60)); // minutes
  }
}

export const calendarService = new CalendarService();
export default calendarService;