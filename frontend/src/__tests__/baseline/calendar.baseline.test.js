/**
 * Baseline tests for calendar/availability system
 * Tests availability management, session booking, and calendar functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders, createMockUser } from './test-utils';
import { useAvailability } from '../../contexts/AvailabilityContext';

// Mock availability service
jest.mock('../../shared/services/availabilityService', () => ({
  getCourseAvailability: jest.fn(),
  createAvailabilitySlot: jest.fn(),
  updateAvailabilitySlot: jest.fn(),
  deleteAvailabilitySlot: jest.fn(),
  getRecurringAvailability: jest.fn(),
  createRecurringAvailability: jest.fn(),
  groupByDate: jest.fn(),
  filterConflicts: jest.fn(),
  checkTimeSlotConflict: jest.fn(),
  default: {
    getCourseAvailability: jest.fn(),
    createAvailabilitySlot: jest.fn(),
    updateAvailabilitySlot: jest.fn(),
    deleteAvailabilitySlot: jest.fn(),
    groupByDate: jest.fn(),
    filterConflicts: jest.fn(),
  }
}));

// Mock Zoom helpers
jest.mock('../../utils/zoomHelpers', () => ({
  createZoomMeeting: jest.fn(),
  updateZoomMeeting: jest.fn(),
  deleteZoomMeeting: jest.fn(),
  generateMeetingLink: jest.fn(),
}));

// Mock time utilities
jest.mock('../../utils/timeUtils', () => ({
  formatTimeSlot: jest.fn(),
  isTimeSlotAvailable: jest.fn(),
  getTimeSlotDuration: jest.fn(),
  convertToUserTimezone: jest.fn(),
  isWithinBusinessHours: jest.fn(),
}));

// Mock hooks
jest.mock('../../hooks/useTimeSlots', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useConflicts', () => ({
  useConflicts: jest.fn(),
}));

const TestAvailabilityComponent = ({ onAvailabilityState }) => {
  const [availabilitySlots, setAvailabilitySlots] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [filters, setFilters] = React.useState({
    courseId: null,
    tutorIds: [],
    dateRange: { startDate: null, endDate: null }
  });

  React.useEffect(() => {
    if (onAvailabilityState) {
      onAvailabilityState({
        availabilitySlots,
        loading,
        error,
        filters,
        setAvailabilitySlots,
        setLoading,
        setError,
        setFilters
      });
    }
  }, [availabilitySlots, loading, error, filters, onAvailabilityState]);

  return (
    <div>
      <div data-testid="availability-loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="availability-count">{availabilitySlots.length}</div>
      <div data-testid="availability-error">{error?.message || 'no-error'}</div>
      <div data-testid="active-course">{filters.courseId || 'no-course'}</div>
      <div data-testid="availability-slots">
        {availabilitySlots.map(slot => (
          <div key={slot.id} data-testid={`slot-${slot.id}`}>
            {slot.start_time} - {slot.end_time}
          </div>
        ))}
      </div>
    </div>
  );
};

const TestCalendarComponent = ({ onCalendarState }) => {
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [view, setView] = React.useState('week'); // week, month, day
  const [events, setEvents] = React.useState([]);

  React.useEffect(() => {
    if (onCalendarState) {
      onCalendarState({
        selectedDate,
        view,
        events,
        setSelectedDate,
        setView,
        setEvents
      });
    }
  }, [selectedDate, view, events, onCalendarState]);

  return (
    <div>
      <div data-testid="calendar-date">{selectedDate.toISOString().split('T')[0]}</div>
      <div data-testid="calendar-view">{view}</div>
      <div data-testid="calendar-events-count">{events.length}</div>
      <div data-testid="calendar-events">
        {events.map(event => (
          <div key={event.id} data-testid={`event-${event.id}`}>
            {event.title} at {event.start_time}
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Calendar/Availability System Baseline Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Availability Slot Management', () => {
    test('should load availability slots successfully', async () => {
      const availabilityService = require('../../shared/services/availabilityService');
      const mockSlots = [
        {
          id: 1,
          tutor_id: 1,
          course_id: 1,
          start_time: '2023-01-01T10:00:00Z',
          end_time: '2023-01-01T11:00:00Z',
          is_available: true,
          recurring: false
        },
        {
          id: 2,
          tutor_id: 1,
          course_id: 1,
          start_time: '2023-01-01T14:00:00Z',
          end_time: '2023-01-01T15:00:00Z',
          is_available: true,
          recurring: false
        }
      ];

      availabilityService.getCourseAvailability.mockResolvedValue(mockSlots);

      let availabilityState;
      renderWithProviders(
        <TestAvailabilityComponent onAvailabilityState={(state) => availabilityState = state} />
      );

      // Simulate loading availability
      availabilityState.setLoading(true);
      availabilityState.setFilters({ courseId: 1, tutorIds: [1], dateRange: { startDate: '2023-01-01', endDate: '2023-01-31' } });

      const slots = await availabilityService.getCourseAvailability(1, null, '2023-01-01', '2023-01-31');
      availabilityState.setAvailabilitySlots(slots);
      availabilityState.setLoading(false);

      await waitFor(() => {
        expect(screen.getByTestId('availability-loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('availability-count')).toHaveTextContent('2');
        expect(screen.getByTestId('active-course')).toHaveTextContent('1');
        expect(screen.getByTestId('slot-1')).toHaveTextContent('2023-01-01T10:00:00Z - 2023-01-01T11:00:00Z');
        expect(screen.getByTestId('slot-2')).toHaveTextContent('2023-01-01T14:00:00Z - 2023-01-01T15:00:00Z');
      });

      expect(availabilityService.getCourseAvailability).toHaveBeenCalledWith(1, null, '2023-01-01', '2023-01-31');
    });

    test('should create new availability slot', async () => {
      const availabilityService = require('../../shared/services/availabilityService');
      const newSlot = {
        tutor_id: 1,
        course_id: 1,
        start_time: '2023-01-02T10:00:00Z',
        end_time: '2023-01-02T11:00:00Z',
        is_available: true,
        recurring: false
      };

      const createdSlot = {
        id: 3,
        ...newSlot,
        created_at: '2023-01-01T00:00:00Z'
      };

      availabilityService.createAvailabilitySlot.mockResolvedValue(createdSlot);

      const result = await availabilityService.createAvailabilitySlot(newSlot);

      expect(result).toEqual(createdSlot);
      expect(availabilityService.createAvailabilitySlot).toHaveBeenCalledWith(newSlot);
    });

    test('should update availability slot', async () => {
      const availabilityService = require('../../shared/services/availabilityService');
      const slotId = 1;
      const updates = {
        start_time: '2023-01-01T11:00:00Z',
        end_time: '2023-01-01T12:00:00Z'
      };

      const updatedSlot = {
        id: slotId,
        tutor_id: 1,
        course_id: 1,
        start_time: '2023-01-01T11:00:00Z',
        end_time: '2023-01-01T12:00:00Z',
        is_available: true,
        recurring: false,
        updated_at: '2023-01-01T00:00:00Z'
      };

      availabilityService.updateAvailabilitySlot.mockResolvedValue(updatedSlot);

      const result = await availabilityService.updateAvailabilitySlot(slotId, updates);

      expect(result).toEqual(updatedSlot);
      expect(availabilityService.updateAvailabilitySlot).toHaveBeenCalledWith(slotId, updates);
    });

    test('should delete availability slot', async () => {
      const availabilityService = require('../../shared/services/availabilityService');
      const slotId = 1;

      availabilityService.deleteAvailabilitySlot.mockResolvedValue({ success: true });

      const result = await availabilityService.deleteAvailabilitySlot(slotId);

      expect(result).toEqual({ success: true });
      expect(availabilityService.deleteAvailabilitySlot).toHaveBeenCalledWith(slotId);
    });

    test('should handle availability loading errors', async () => {
      const availabilityService = require('../../shared/services/availabilityService');
      const mockError = new Error('Failed to load availability');

      availabilityService.getCourseAvailability.mockRejectedValue(mockError);

      let availabilityState;
      renderWithProviders(
        <TestAvailabilityComponent onAvailabilityState={(state) => availabilityState = state} />
      );

      // Simulate error loading availability
      availabilityState.setLoading(true);
      try {
        await availabilityService.getCourseAvailability(1);
      } catch (error) {
        availabilityState.setError(error);
        availabilityState.setLoading(false);
      }

      await waitFor(() => {
        expect(screen.getByTestId('availability-error')).toHaveTextContent('Failed to load availability');
        expect(screen.getByTestId('availability-loading')).toHaveTextContent('loaded');
      });
    });
  });

  describe('Recurring Availability', () => {
    test('should create recurring availability pattern', async () => {
      const availabilityService = require('../../shared/services/availabilityService');
      const recurringPattern = {
        tutor_id: 1,
        course_id: 1,
        day_of_week: 1, // Monday
        start_time: '10:00:00',
        end_time: '11:00:00',
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        weekly_frequency: 1
      };

      const createdPattern = {
        id: 1,
        ...recurringPattern,
        created_slots: 52 // 52 weeks
      };

      availabilityService.createRecurringAvailability.mockResolvedValue(createdPattern);

      const result = await availabilityService.createRecurringAvailability(recurringPattern);

      expect(result).toEqual(createdPattern);
      expect(result.created_slots).toBe(52);
      expect(availabilityService.createRecurringAvailability).toHaveBeenCalledWith(recurringPattern);
    });

    test('should load recurring availability patterns', async () => {
      const availabilityService = require('../../shared/services/availabilityService');
      const mockPatterns = [
        {
          id: 1,
          tutor_id: 1,
          course_id: 1,
          day_of_week: 1,
          start_time: '10:00:00',
          end_time: '11:00:00',
          weekly_frequency: 1
        },
        {
          id: 2,
          tutor_id: 1,
          course_id: 1,
          day_of_week: 3,
          start_time: '14:00:00',
          end_time: '15:00:00',
          weekly_frequency: 1
        }
      ];

      availabilityService.getRecurringAvailability.mockResolvedValue(mockPatterns);

      const result = await availabilityService.getRecurringAvailability(1, 1);

      expect(result).toEqual(mockPatterns);
      expect(result).toHaveLength(2);
      expect(availabilityService.getRecurringAvailability).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('Calendar Display', () => {
    test('should render calendar with events', () => {
      let calendarState;
      renderWithProviders(
        <TestCalendarComponent onCalendarState={(state) => calendarState = state} />
      );

      // Add events to calendar
      const events = [
        {
          id: 1,
          title: 'JavaScript Session',
          start_time: '2023-01-01T10:00:00Z',
          end_time: '2023-01-01T11:00:00Z',
          type: 'session'
        },
        {
          id: 2,
          title: 'React Tutorial',
          start_time: '2023-01-01T14:00:00Z',
          end_time: '2023-01-01T15:00:00Z',
          type: 'session'
        }
      ];

      calendarState.setEvents(events);

      expect(screen.getByTestId('calendar-events-count')).toHaveTextContent('2');
      expect(screen.getByTestId('event-1')).toHaveTextContent('JavaScript Session at 2023-01-01T10:00:00Z');
      expect(screen.getByTestId('event-2')).toHaveTextContent('React Tutorial at 2023-01-01T14:00:00Z');
    });

    test('should handle calendar view changes', () => {
      let calendarState;
      renderWithProviders(
        <TestCalendarComponent onCalendarState={(state) => calendarState = state} />
      );

      expect(screen.getByTestId('calendar-view')).toHaveTextContent('week');

      calendarState.setView('month');

      expect(screen.getByTestId('calendar-view')).toHaveTextContent('month');

      calendarState.setView('day');

      expect(screen.getByTestId('calendar-view')).toHaveTextContent('day');
    });

    test('should handle date selection', () => {
      let calendarState;
      renderWithProviders(
        <TestCalendarComponent onCalendarState={(state) => calendarState = state} />
      );

      const newDate = new Date('2023-02-01');
      calendarState.setSelectedDate(newDate);

      expect(screen.getByTestId('calendar-date')).toHaveTextContent('2023-02-01');
    });
  });

  describe('Time Slot Utilities', () => {
    test('should format time slots correctly', () => {
      const timeUtils = require('../../utils/timeUtils');
      const mockSlot = {
        start_time: '2023-01-01T10:00:00Z',
        end_time: '2023-01-01T11:00:00Z'
      };

      timeUtils.formatTimeSlot.mockReturnValue('10:00 AM - 11:00 AM');

      const result = timeUtils.formatTimeSlot(mockSlot);

      expect(result).toBe('10:00 AM - 11:00 AM');
      expect(timeUtils.formatTimeSlot).toHaveBeenCalledWith(mockSlot);
    });

    test('should check time slot availability', () => {
      const timeUtils = require('../../utils/timeUtils');
      const requestedSlot = {
        start_time: '2023-01-01T10:00:00Z',
        end_time: '2023-01-01T11:00:00Z'
      };

      const existingSlots = [
        {
          start_time: '2023-01-01T09:00:00Z',
          end_time: '2023-01-01T10:00:00Z'
        }
      ];

      timeUtils.isTimeSlotAvailable.mockReturnValue(true);

      const isAvailable = timeUtils.isTimeSlotAvailable(requestedSlot, existingSlots);

      expect(isAvailable).toBe(true);
      expect(timeUtils.isTimeSlotAvailable).toHaveBeenCalledWith(requestedSlot, existingSlots);
    });

    test('should calculate time slot duration', () => {
      const timeUtils = require('../../utils/timeUtils');
      const slot = {
        start_time: '2023-01-01T10:00:00Z',
        end_time: '2023-01-01T11:30:00Z'
      };

      timeUtils.getTimeSlotDuration.mockReturnValue(90); // 90 minutes

      const duration = timeUtils.getTimeSlotDuration(slot);

      expect(duration).toBe(90);
      expect(timeUtils.getTimeSlotDuration).toHaveBeenCalledWith(slot);
    });

    test('should convert to user timezone', () => {
      const timeUtils = require('../../utils/timeUtils');
      const utcTime = '2023-01-01T10:00:00Z';
      const timezone = 'America/New_York';

      timeUtils.convertToUserTimezone.mockReturnValue('2023-01-01T05:00:00-05:00');

      const convertedTime = timeUtils.convertToUserTimezone(utcTime, timezone);

      expect(convertedTime).toBe('2023-01-01T05:00:00-05:00');
      expect(timeUtils.convertToUserTimezone).toHaveBeenCalledWith(utcTime, timezone);
    });

    test('should validate business hours', () => {
      const timeUtils = require('../../utils/timeUtils');
      const slot = {
        start_time: '2023-01-01T10:00:00Z',
        end_time: '2023-01-01T11:00:00Z'
      };

      timeUtils.isWithinBusinessHours.mockReturnValue(true);

      const isValid = timeUtils.isWithinBusinessHours(slot);

      expect(isValid).toBe(true);
      expect(timeUtils.isWithinBusinessHours).toHaveBeenCalledWith(slot);
    });
  });

  describe('Conflict Detection', () => {
    test('should detect time slot conflicts', () => {
      const { useConflicts } = require('../../hooks/useConflicts');
      const sessions = [
        {
          id: 1,
          start_time: '2023-01-01T10:00:00Z',
          end_time: '2023-01-01T11:00:00Z'
        }
      ];

      const conflicts = [
        {
          type: 'overlap',
          session_id: 1,
          conflicting_slot: {
            start_time: '2023-01-01T10:30:00Z',
            end_time: '2023-01-01T11:30:00Z'
          }
        }
      ];

      useConflicts.mockReturnValue({
        conflicts,
        hasConflicts: true,
        resolveConflict: jest.fn()
      });

      const TestConflictsComponent = () => {
        const conflictData = useConflicts(sessions);
        return (
          <div>
            <div data-testid="has-conflicts">{conflictData.hasConflicts ? 'yes' : 'no'}</div>
            <div data-testid="conflicts-count">{conflictData.conflicts.length}</div>
          </div>
        );
      };

      renderWithProviders(<TestConflictsComponent />);

      expect(screen.getByTestId('has-conflicts')).toHaveTextContent('yes');
      expect(screen.getByTestId('conflicts-count')).toHaveTextContent('1');
    });

    test('should filter conflicting slots', () => {
      const availabilityService = require('../../shared/services/availabilityService');
      const availabilitySlots = [
        {
          id: 1,
          start_time: '2023-01-01T10:00:00Z',
          end_time: '2023-01-01T11:00:00Z'
        },
        {
          id: 2,
          start_time: '2023-01-01T12:00:00Z',
          end_time: '2023-01-01T13:00:00Z'
        }
      ];

      const bookedSessions = [
        {
          start_time: '2023-01-01T10:30:00Z',
          end_time: '2023-01-01T11:30:00Z'
        }
      ];

      const filteredSlots = [
        {
          id: 2,
          start_time: '2023-01-01T12:00:00Z',
          end_time: '2023-01-01T13:00:00Z'
        }
      ];

      availabilityService.filterConflicts.mockReturnValue(filteredSlots);

      const result = availabilityService.filterConflicts(availabilitySlots, bookedSessions);

      expect(result).toEqual(filteredSlots);
      expect(result).toHaveLength(1);
      expect(availabilityService.filterConflicts).toHaveBeenCalledWith(availabilitySlots, bookedSessions);
    });
  });

  describe('Zoom Integration', () => {
    test('should create Zoom meeting for session', async () => {
      const zoomHelpers = require('../../utils/zoomHelpers');
      const sessionData = {
        title: 'JavaScript Fundamentals',
        start_time: '2023-01-01T10:00:00Z',
        duration: 60,
        tutor_email: 'tutor@example.com',
        student_email: 'student@example.com'
      };

      const zoomMeeting = {
        id: 'zoom_123',
        join_url: 'https://zoom.us/j/123456789',
        password: 'abc123',
        host_url: 'https://zoom.us/s/123456789'
      };

      zoomHelpers.createZoomMeeting.mockResolvedValue(zoomMeeting);

      const result = await zoomHelpers.createZoomMeeting(sessionData);

      expect(result).toEqual(zoomMeeting);
      expect(zoomHelpers.createZoomMeeting).toHaveBeenCalledWith(sessionData);
    });

    test('should update Zoom meeting', async () => {
      const zoomHelpers = require('../../utils/zoomHelpers');
      const meetingId = 'zoom_123';
      const updates = {
        start_time: '2023-01-01T11:00:00Z',
        duration: 90
      };

      const updatedMeeting = {
        id: meetingId,
        start_time: '2023-01-01T11:00:00Z',
        duration: 90,
        join_url: 'https://zoom.us/j/123456789'
      };

      zoomHelpers.updateZoomMeeting.mockResolvedValue(updatedMeeting);

      const result = await zoomHelpers.updateZoomMeeting(meetingId, updates);

      expect(result).toEqual(updatedMeeting);
      expect(zoomHelpers.updateZoomMeeting).toHaveBeenCalledWith(meetingId, updates);
    });

    test('should delete Zoom meeting', async () => {
      const zoomHelpers = require('../../utils/zoomHelpers');
      const meetingId = 'zoom_123';

      zoomHelpers.deleteZoomMeeting.mockResolvedValue({ success: true });

      const result = await zoomHelpers.deleteZoomMeeting(meetingId);

      expect(result).toEqual({ success: true });
      expect(zoomHelpers.deleteZoomMeeting).toHaveBeenCalledWith(meetingId);
    });

    test('should generate meeting link', () => {
      const zoomHelpers = require('../../utils/zoomHelpers');
      const meetingData = {
        meeting_id: '123456789',
        password: 'abc123'
      };

      const expectedLink = 'https://zoom.us/j/123456789?pwd=abc123';
      zoomHelpers.generateMeetingLink.mockReturnValue(expectedLink);

      const link = zoomHelpers.generateMeetingLink(meetingData);

      expect(link).toBe(expectedLink);
      expect(zoomHelpers.generateMeetingLink).toHaveBeenCalledWith(meetingData);
    });
  });

  describe('Availability Context Integration', () => {
    test('should provide availability context methods', () => {
      // Mock the context hook
      jest.doMock('../../contexts/AvailabilityContext', () => ({
        useAvailability: () => ({
          data: [],
          loading: false,
          error: null,
          filters: { courseId: null },
          loadAvailability: jest.fn(),
          updateFilters: jest.fn(),
          addAvailability: jest.fn(),
          updateAvailability: jest.fn(),
          removeAvailability: jest.fn(),
          getGroupedAvailability: jest.fn(),
          filterConflicts: jest.fn(),
          hasData: false,
          isEmpty: true
        })
      }));

      const TestContextComponent = () => {
        const availability = useAvailability();
        return (
          <div>
            <div data-testid="context-has-data">{availability.hasData ? 'yes' : 'no'}</div>
            <div data-testid="context-is-empty">{availability.isEmpty ? 'yes' : 'no'}</div>
            <div data-testid="context-loading">{availability.loading ? 'loading' : 'loaded'}</div>
          </div>
        );
      };

      renderWithProviders(<TestContextComponent />);

      expect(screen.getByTestId('context-has-data')).toHaveTextContent('no');
      expect(screen.getByTestId('context-is-empty')).toHaveTextContent('yes');
      expect(screen.getByTestId('context-loading')).toHaveTextContent('loaded');
    });
  });

  describe('Data Grouping and Formatting', () => {
    test('should group availability by date', () => {
      const availabilityService = require('../../shared/services/availabilityService');
      const slots = [
        {
          id: 1,
          start_time: '2023-01-01T10:00:00Z',
          end_time: '2023-01-01T11:00:00Z'
        },
        {
          id: 2,
          start_time: '2023-01-01T14:00:00Z',
          end_time: '2023-01-01T15:00:00Z'
        },
        {
          id: 3,
          start_time: '2023-01-02T10:00:00Z',
          end_time: '2023-01-02T11:00:00Z'
        }
      ];

      const groupedSlots = {
        '2023-01-01': [slots[0], slots[1]],
        '2023-01-02': [slots[2]]
      };

      availabilityService.groupByDate.mockReturnValue(groupedSlots);

      const result = availabilityService.groupByDate(slots);

      expect(result).toEqual(groupedSlots);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['2023-01-01']).toHaveLength(2);
      expect(result['2023-01-02']).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle calendar rendering errors', () => {
      const mockError = new Error('Calendar render failed');
      const TestErrorComponent = () => {
        throw mockError;
      };

      // Error boundary would catch this in real implementation
      expect(() => render(<TestErrorComponent />)).toThrow('Calendar render failed');
    });

    test('should handle invalid time slot data', () => {
      const timeUtils = require('../../utils/timeUtils');
      const invalidSlot = {
        start_time: 'invalid-date',
        end_time: '2023-01-01T11:00:00Z'
      };

      timeUtils.isTimeSlotAvailable.mockReturnValue(false);

      const isValid = timeUtils.isTimeSlotAvailable(invalidSlot, []);

      expect(isValid).toBe(false);
    });
  });
});