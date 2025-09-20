import React, { useState, useEffect } from 'react';
import { useMultiRoleAuth } from '../../hooks/useMultiRoleAuth';
import dataService from '../../services/dataService';
import API from '../../services/api';
import TutorCalendar from '../calendar/TutorCalendar';
import { normalizeAvailabilityResponse } from '../../utils/availabilityNormalizer';
import {
  getTimezoneHeaders,
  enhanceAvailabilityDisplay,
  getUserTimezone,
  formatTimeInUserTimezone,
  formatDateInUserTimezone,
  convertLocalTimeToUTC,
  convertUTCTimeToUserTimezone,
  getTimezoneAbbreviation
} from '../../utils/timezoneManager';
import './TimeslotManagement.css';

const TimeslotManagement = () => {
  const { user } = useMultiRoleAuth();
  const [timeslots, setTimeslots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeslotSaving, setTimeslotSaving] = useState(false);
  const [timeslotErrors, setTimeslotErrors] = useState({});
  const [timeslotForm, setTimeslotForm] = useState({
    type: 'single', // 'single' or 'recurring'
    date: '',
    startTime: '',
    endTime: '',
    courseId: '',
    isRecurring: false,
    recurrenceDays: [], // [0-6] for Sun-Sat
    recurrenceEndDate: '',
    notes: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  });
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Legacy error state for compatibility
  const [error, setError] = useState(null);

  // View management state
  const [availabilityView, setAvailabilityView] = useState('calendar'); // 'calendar' or 'list'
  const [listSelectionMode, setListSelectionMode] = useState(false);
  const [selectedListSlots, setSelectedListSlots] = useState(new Set());

  // Statistics state
  const [availabilityStats, setAvailabilityStats] = useState({
    totalSlots: 0,
    bookedSlots: 0,
    weeklyHours: 0,
    utilizationRate: 0,
    courseTypes: 0,
    recurringSlots: 0,
    conflicts: 0,
    mostActiveDay: 'N/A',
    peakPeriod: 'N/A'
  });

  const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  // Common timezones for dropdown
  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Beijing/Shanghai (CST)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' }
  ];

  // Generate all time options in 30-minute intervals (24-hour format for internal use)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = formatTimeToAMPM(timeValue);
        options.push({ value: timeValue, label: displayTime });
      }
    }
    return options;
  };

  // Convert 24-hour time to 12-hour AM/PM format
  const formatTimeToAMPM = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Check if start time allows for minimum 1-hour session within same day
  const isValidStartTime = (startTime) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endOfDay = 23 * 60 + 59; // 11:59 PM
    const minimumDuration = 60; // 1 hour
    return (startMinutes + minimumDuration) <= endOfDay;
  };

  // Validation function matching regular dashboard
  const validateTimeslotForm = () => {
    const errors = {};

    // Required field validation
    if (!timeslotForm.courseId) {
      errors.courseId = 'Course is required';
    }
    if (!timeslotForm.startTime) {
      errors.startTime = 'Start time is required';
    }
    if (!timeslotForm.endTime) {
      errors.endTime = 'End time is required';
    }

    // Type-specific validation
    if (timeslotForm.type === 'single') {
      if (!timeslotForm.date) {
        errors.date = 'Date is required for single slots';
      } else {
        // Check if date-time combination is in the future
        if (timeslotForm.date && timeslotForm.startTime) {
          const selectedDateTime = new Date(`${timeslotForm.date}T${timeslotForm.startTime}`);
          const now = new Date();
          if (selectedDateTime <= now) {
            errors.date = 'Selected date and time must be in the future';
          }
        } else {
          // If no start time selected yet, only check if date is not in the past
          const selectedDate = new Date(timeslotForm.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate < today) {
            errors.date = 'Date cannot be in the past';
          }
        }
      }
    } else if (timeslotForm.type === 'recurring') {
      if (timeslotForm.recurrenceDays.length === 0) {
        errors.recurrenceDays = 'Day of week is required for recurring slots';
      }
      if (!timeslotForm.date) {
        errors.date = 'Start date is required for recurring slots';
      }
      if (!timeslotForm.recurrenceEndDate) {
        errors.recurrenceEndDate = 'End date is required for recurring slots';
      }
      if (timeslotForm.date && timeslotForm.recurrenceEndDate) {
        const startDate = new Date(timeslotForm.date);
        const endDate = new Date(timeslotForm.recurrenceEndDate);
        if (endDate <= startDate) {
          errors.recurrenceEndDate = 'End date must be after start date';
        }
      }
    }

    // Time validation
    if (timeslotForm.startTime && timeslotForm.endTime) {
      const start = new Date(`2000-01-01T${timeslotForm.startTime}`);
      const end = new Date(`2000-01-01T${timeslotForm.endTime}`);
      if (end <= start) {
        errors.endTime = 'End time must be after start time';
      }
      // Check minimum duration (1 hour)
      const durationHours = (end - start) / (1000 * 60 * 60);
      if (durationHours < 1) {
        errors.endTime = 'Session must be at least 1 hour long';
      }
    }

    return errors;
  };

  // Utility function to get day of week from date string
  const getDayOfWeekFromDate = (dateString) => {
    const date = new Date(dateString);
    return date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  };

  // Create recurring data structure
  const createRecurringData = (form) => {
    const userTimezone = getUserTimezone();
    const referenceDate = form.date || new Date().toISOString().split('T')[0];

    // Convert local times to UTC for consistent storage
    const utcStartTime = convertLocalTimeToUTC(form.startTime, userTimezone, referenceDate);
    const utcEndTime = convertLocalTimeToUTC(form.endTime, userTimezone, referenceDate);

    console.log('🌍 TimeslotManagement: Converting recurring availability times:', {
      userInput: { start: form.startTime, end: form.endTime },
      userTimezone,
      utcConverted: { start: utcStartTime, end: utcEndTime }
    });

    return {
      tutorId: user.id,
      startTime: utcStartTime,        // Store as UTC
      endTime: utcEndTime,            // Store as UTC
      courseId: form.courseId,
      timeZone: 'UTC',                // Always store as UTC
      originalTimezone: userTimezone, // Track user's original timezone
      startDate: form.date,
      recurrenceEndDate: form.recurrenceEndDate + 'T23:59:59',
      recurrenceDays: form.recurrenceDays,
      recurrenceType: 'weekly',
      notes: form.notes || ''
    };
  };

  // Generate valid end time options based on selected start time
  const generateEndTimeOptions = (startTime) => {
    if (!startTime) return [];

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const startTotalMinutes = startHours * 60 + startMinutes;
    const minimumEndMinutes = startTotalMinutes + 60; // At least 1 hour later
    const endOfDay = 23 * 60 + 59; // 11:59 PM

    const options = [];

    // Generate options in 30-minute intervals starting from minimum end time
    for (let totalMinutes = minimumEndMinutes; totalMinutes <= endOfDay; totalMinutes += 30) {
      // Skip if this would go past end of day
      if (totalMinutes > endOfDay) break;

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const timeValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      const displayTime = formatTimeToAMPM(timeValue);

      options.push({ value: timeValue, label: displayTime });
    }

    return options;
  };

  // Get all start time options (excluding those that don't allow 1+ hour sessions)
  const getStartTimeOptions = () => {
    return generateTimeOptions().filter(option => isValidStartTime(option.value));
  };

  // Handle start time change and clear end time
  const handleStartTimeChange = (startTime) => {
    setTimeslotForm({
      ...timeslotForm,
      startTime,
      endTime: '' // Clear end time when start time changes
    });
  };

  // Handle slot type change
  const handleSlotTypeChange = (type) => {
    setTimeslotForm({
      ...timeslotForm,
      type,
      isRecurring: type === 'recurring',
      // Clear type-specific fields when switching
      date: '',
      recurrenceDays: [],
      recurrenceEndDate: ''
    });
  };

  // Handle recurring days change
  const handleRecurringDayChange = (dayValue) => {
    const dayIndex = daysOfWeek.findIndex(d => d.value === dayValue);
    setTimeslotForm({
      ...timeslotForm,
      recurrenceDays: [dayIndex], // Single day selection for now
      date: '' // Clear specific date
    });
  };

  useEffect(() => {
    loadTimeslots();
    loadAssignedCourses();
  }, []);

  // Calculate statistics when timeslots change
  useEffect(() => {
    calculateStats();
  }, [timeslots]);

  const loadAssignedCourses = async () => {
    try {
      setCoursesLoading(true);
      // Use assignedCourses from user auth data instead of API call
      if (user?.assignedCourses) {
        setAssignedCourses(user.assignedCourses);
      } else {
        setAssignedCourses([]);
      }
    } catch (err) {
      console.error('Error loading assigned courses:', err);
      setAssignedCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  const loadTimeslots = async () => {
    try {
      setLoading(true);
      if (user?.id) {
        const token = sessionStorage.getItem('authToken');
        const timezoneHeaders = getTimezoneHeaders();

        console.log('🌍 DEBUG: Loading timeslots with timezone:', timezoneHeaders['X-Timezone']);
        console.log('🔍 DEBUG: Making request to:', `/api/tutors/${user.id}/availability/instances?daysAhead=90`);

        // Use the new API endpoint with timezone headers for proper display conversion
        const response = await fetch(`/api/tutors/${user.id}/availability/instances?daysAhead=90`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...timezoneHeaders, // Include timezone headers for backend conversion
          },
        });

        console.log('🔍 DEBUG: Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.log('🔍 DEBUG: Error response text:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Normalize the response for consistent field names
        const normalizedData = normalizeAvailabilityResponse(data);

        // Enhance each slot with timezone display formatting
        const availability = normalizedData.availability || normalizedData || [];
        const enhancedAvailability = availability.map(slot => {
          const enhancedSlot = enhanceAvailabilityDisplay(slot);

          // Debug log for timezone conversion validation
          if (enhancedSlot.originalStartTime !== enhancedSlot.displayStartTime) {
            console.log(`🌍 Timezone conversion: ${enhancedSlot.originalStartTime} → ${enhancedSlot.displayStartTime} (${enhancedSlot.displayTimezoneAbbr})`);
          }

          return enhancedSlot;
        });

        // Debug logging for validation
        console.log('🔍 DEBUG: Raw API response:', data);
        console.log('🔍 DEBUG: Enhanced availability count:', enhancedAvailability.length);
        console.log('🌍 DEBUG: User timezone:', getUserTimezone());

        if (enhancedAvailability.length > 0) {
          console.log('🌍 DEBUG: Sample enhanced slot:', enhancedAvailability[0]);
        }

        setTimeslots(enhancedAvailability);
      }
    } catch (err) {
      setError('Failed to load timeslots');
      console.error('❌ Error loading timeslots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTimeslot = async (e) => {
    e.preventDefault();

    // Validation using the comprehensive validation function
    const errors = validateTimeslotForm();
    if (Object.keys(errors).length > 0) {
      setTimeslotErrors(errors);
      return;
    }

    // Additional validation for dual-role students without tutor permissions
    if (user?.account_type === 'student' && !user?.can_access_tutor_dashboard) {
      setTimeslotErrors({
        general: 'You need tutor permissions to create time slots. Please contact an administrator to enable tutor mode for your account.'
      });
      return;
    }

    setTimeslotSaving(true);
    setTimeslotErrors({});
    setError(null);

    try {
      let result;

      if (timeslotForm.isRecurring) {
        // Recurring slots logic
        const recurringData = createRecurringData(timeslotForm);
        console.log('🔍 Creating recurring availability:', recurringData);
        result = await API.availability.createRecurringAvailability(recurringData);
      } else {
        // Single slot logic - Apply timezone conversion
        const userTimezone = getUserTimezone();
        const referenceDate = timeslotForm.date;

        // Convert local times to UTC for consistent storage
        const utcStartTime = convertLocalTimeToUTC(timeslotForm.startTime, userTimezone, referenceDate);
        const utcEndTime = convertLocalTimeToUTC(timeslotForm.endTime, userTimezone, referenceDate);

        console.log('🌍 TimeslotManagement: Converting single slot times:', {
          userInput: { start: timeslotForm.startTime, end: timeslotForm.endTime },
          userTimezone,
          utcConverted: { start: utcStartTime, end: utcEndTime }
        });

        const dayOfWeek = getDayOfWeekFromDate(timeslotForm.date);
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];

        const timeSlotData = {
          timeSlot: {
            startTime: utcStartTime,        // Store as UTC
            endTime: utcEndTime,            // Store as UTC
            course: timeslotForm.courseId,
            courseId: timeslotForm.courseId,
            timeZone: 'UTC',                // Always store as UTC
            originalTimezone: userTimezone, // Track user's original timezone
            specificDate: timeslotForm.date,
            notes: timeslotForm.notes || ''
          },
          day: dayName
        };

        console.log('🔍 Creating single timeslot:', timeSlotData);
        result = await API.availability.createSingleTimeSlot(user.id, timeSlotData);
      }

      // Handle success
      if (result && (result.message || result.success)) {
        await loadTimeslots(); // Refresh data

        // Reset form
        setTimeslotForm({
          type: 'single',
          date: '',
          startTime: '',
          endTime: '',
          courseId: '',
          isRecurring: false,
          recurrenceDays: [],
          recurrenceEndDate: '',
          notes: '',
          timeZone: timeslotForm.timeZone // Keep timezone
        });

        alert('Time slot created successfully!');
      }
    } catch (error) {
      console.error('❌ Error creating timeslot:', error);

      let userMessage = error.message || 'Failed to create time slot. Please try again.';

      // Enhanced error categorization
      if (error.message && error.message.includes('timezone')) {
        userMessage = 'Timezone error: Please check your timezone settings and try again.';
      } else if (error.message && error.message.includes('Missing required fields')) {
        userMessage = error.message + '. Please fill out all required information.';
      }

      setTimeslotErrors({ general: userMessage });
      setError(userMessage); // For legacy compatibility
    } finally {
      setTimeslotSaving(false);
    }
  };

  const handleDeleteTimeslot = async (timeslotId, slotData = null) => {
    // Determine the appropriate confirmation message
    let confirmMessage = 'Are you sure you want to delete this timeslot?';
    if (slotData?.is_virtual || slotData?.isVirtual) {
      confirmMessage = 'This will remove this specific instance from the recurring pattern. Continue?';
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Use the slot ID as-is (backend will handle virtual vs real IDs)
      console.log('🔍 DEBUG: Deleting timeslot:', timeslotId);
      console.log('🔍 DEBUG: Slot data:', slotData);

      await dataService.deleteTimeslot(user.id, timeslotId);
      console.log('🔍 DEBUG: Timeslot deleted successfully, reloading data...');
      await loadTimeslots();
    } catch (err) {
      console.error('🔍 DEBUG: Error deleting timeslot:', err);
      setError(err.message || 'Failed to delete timeslot');
    }
  };

  const formatTime = (time, slot = null) => {
    // Use enhanced display time if available from backend conversion
    if (slot?.displayStartTime && time === slot.startTime) {
      return slot.displayStartTime;
    }
    if (slot?.displayEndTime && time === slot.endTime) {
      return slot.displayEndTime;
    }

    if (!time) return '';

    // For UTC times stored in database, convert back to user timezone
    if (slot && time.match(/^\d{2}:\d{2}$/)) {
      try {
        // Get the date context for proper DST handling
        const dateContext = slot.instance_date || slot.specificDate || new Date().toISOString().split('T')[0];

        // Get target timezone from payload (fallback to browser timezone)
        const targetTimezone = slot.userTimezone || slot.displayTimezone || getUserTimezone();

        console.log('🌍 formatTime: Converting UTC time to user timezone:', {
          utcTime: time,
          dateContext,
          targetTimezone,
          slotData: slot
        });

        // Convert UTC time to user's timezone using date context and target timezone
        const userTime = convertUTCTimeToUserTimezone(time, dateContext, targetTimezone);

        console.log('🌍 formatTime: Conversion result:', {
          input: time,
          output: userTime,
          timezone: targetTimezone
        });

        return userTime;
      } catch (error) {
        console.warn('🌍 formatTime: Error converting UTC time to user timezone:', error);
        // Fall through to fallback formatting
      }
    }

    // Fallback to timezone-aware formatting for time-only values
    try {
      // For HH:MM format times, format them assuming they're in user timezone
      if (time.match(/^\d{2}:\d{2}$/)) {
        const today = new Date();
        const [hours, minutes] = time.split(':').map(Number);
        today.setHours(hours, minutes, 0, 0);
        return formatTimeInUserTimezone(today, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }

      // Handle Date objects or other formats
      return formatTimeInUserTimezone(time, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.warn('🌍 formatTime: Error in fallback formatting:', error);
      // Ultimate fallback to original logic
      return time ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }) : '';
    }
  };

  const groupTimeslotsByDay = () => {
    console.log('🔍 DEBUG: groupTimeslotsByDay called with timeslots:', timeslots);
    console.log('🔍 DEBUG: timeslots type:', typeof timeslots);
    console.log('🔍 DEBUG: timeslots keys:', Object.keys(timeslots || {}));

    const grouped = {};
    daysOfWeek.forEach(day => {
      grouped[day.value] = { timeSlots: [] };
    });

    // Handle both array format (new API) and object format (old API)
    if (Array.isArray(timeslots)) {
      console.log('🔍 DEBUG: Processing ARRAY format (new API)');
      timeslots.forEach(slot => {
        const jsWeekday = slot.day_of_week || slot.dayOfWeek || 0;
        // Convert JavaScript weekday (0=Sunday, 5=Friday) to Monday-first array index
        const dayIndex = jsWeekday === 0 ? 6 : jsWeekday - 1; // Sunday(0)→6, Mon(1)→0, Fri(5)→4
        const dayName = daysOfWeek[dayIndex]?.value;
        if (dayName && grouped[dayName]) {
          grouped[dayName].timeSlots.push({
            id: slot.id,
            startTime: slot.start_time || slot.startTime,
            endTime: slot.end_time || slot.endTime,
            course: slot.course_id || slot.courseId || slot.course,
            timeZone: slot.time_zone || slot.timeZone
          });
        }
      });
    } else {
      console.log('🔍 DEBUG: Processing OBJECT format (legacy API)');
      Object.keys(timeslots).forEach(dayKey => {
        const dayData = timeslots[dayKey];
        console.log(`🔍 DEBUG: Processing day ${dayKey}:`, dayData);
        if (dayData && dayData.timeSlots) {
          grouped[dayKey] = { timeSlots: dayData.timeSlots };
        }
      });
    }

    console.log('🔍 DEBUG: Final grouped result:', grouped);
    return grouped;
  };

  // Calculate statistics from timeslots data
  const calculateStats = () => {
    console.log('🔍 DEBUG: calculateStats called with timeslots:', timeslots);

    let totalSlots = 0;
    let weeklyHours = 0;
    const courseSet = new Set();
    const dayActivity = {};

    // Handle both array format (new API) and object format (old API)
    if (Array.isArray(timeslots)) {
      console.log('🔍 DEBUG: calculateStats processing ARRAY format');
      totalSlots = timeslots.length;

      timeslots.forEach(slot => {
        const jsWeekday = slot.day_of_week || slot.dayOfWeek || 0;
        // Convert JavaScript weekday (0=Sunday, 5=Friday) to Monday-first array index
        const dayIndex = jsWeekday === 0 ? 6 : jsWeekday - 1; // Sunday(0)→6, Mon(1)→0, Fri(5)→4
        const dayName = daysOfWeek[dayIndex]?.value || `day_${dayIndex}`;

        // Track day activity
        dayActivity[dayName] = (dayActivity[dayName] || 0) + 1;

        // Track courses
        const course = slot.course_id || slot.courseId || slot.course;
        if (course) courseSet.add(course);

        // Calculate hours
        const startTime = slot.start_time || slot.startTime;
        const endTime = slot.end_time || slot.endTime;
        if (startTime && endTime) {
          const start = new Date(`2000-01-01T${startTime}`);
          const end = new Date(`2000-01-01T${endTime}`);
          weeklyHours += (end - start) / (1000 * 60 * 60);
        }
      });
    } else {
      console.log('🔍 DEBUG: calculateStats processing OBJECT format');
      Object.keys(timeslots || {}).forEach(dayKey => {
        const dayData = timeslots[dayKey];
        if (dayData && dayData.timeSlots) {
          const slots = dayData.timeSlots;
          totalSlots += slots.length;
          dayActivity[dayKey] = slots.length;

          slots.forEach(slot => {
            if (slot.course) courseSet.add(slot.course);
            if (slot.startTime && slot.endTime) {
              const start = new Date(`2000-01-01T${slot.startTime}`);
              const end = new Date(`2000-01-01T${slot.endTime}`);
              weeklyHours += (end - start) / (1000 * 60 * 60);
            }
          });
        }
      });
    }

    const mostActiveDay = Object.keys(dayActivity).reduce((a, b) =>
      dayActivity[a] > dayActivity[b] ? a : b, 'N/A'
    );

    const stats = {
      totalSlots,
      bookedSlots: 0, // TODO: Get from backend if needed
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      utilizationRate: 0, // TODO: Calculate if booking data available
      courseTypes: courseSet.size,
      recurringSlots: 0, // TODO: Get from backend if needed
      conflicts: 0, // TODO: Get from backend if needed
      mostActiveDay: mostActiveDay !== 'N/A' ? daysOfWeek.find(d => d.value === mostActiveDay)?.label || 'N/A' : 'N/A',
      peakPeriod: 'N/A' // TODO: Calculate peak time
    };

    console.log('🔍 DEBUG: calculateStats result:', stats);
    setAvailabilityStats(stats);
  };

  // List view selection handlers
  const handleListSlotSelection = (slotId, checked) => {
    const newSelection = new Set(selectedListSlots);
    if (checked) {
      newSelection.add(slotId);
    } else {
      newSelection.delete(slotId);
    }
    setSelectedListSlots(newSelection);
  };

  const clearListSelection = () => {
    setSelectedListSlots(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedListSlots.size === 0) return;

    // For now, use a generic confirmation message
    // (We could enhance this later by tracking slot metadata globally)
    const confirmMessage = `Are you sure you want to delete ${selectedListSlots.size} selected timeslots?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Delete each selected slot
      for (const slotId of selectedListSlots) {
        await dataService.deleteTimeslot(user.id, slotId);
      }

      clearListSelection();
      setListSelectionMode(false);
      await loadTimeslots();
    } catch (err) {
      setError(err.message || 'Failed to delete selected timeslots');
    }
  };

  const groupedTimeslots = groupTimeslotsByDay();

  if (loading) {
    return <div className="timeslot-mgmt-loading">Loading timeslots...</div>;
  }

  // Enhanced list view component with date instances
  const renderListView = () => {
    const allSlots = [];

    // Handle new array format with date instances
    if (Array.isArray(timeslots)) {
      timeslots.forEach(slot => {
        const jsWeekday = slot.day_of_week || slot.dayOfWeek || 0;
        // Convert JavaScript weekday (0=Sunday, 5=Friday) to Monday-first array index
        const dayIndex = jsWeekday === 0 ? 6 : jsWeekday - 1; // Sunday(0)→6, Mon(1)→0, Fri(5)→4
        const dayInfo = daysOfWeek[dayIndex];

        // Format the date if available
        let formattedDate = 'Recurring';
        if (slot.instance_date) {
          // FIXED: Treat instance_date as local date to avoid timezone conversion issues
          // Parse YYYY-MM-DD as local date components instead of UTC
          const [year, month, day] = slot.instance_date.split('-').map(Number);
          const date = new Date(year, month - 1, day); // month is 0-indexed
          formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        }

        allSlots.push({
          ...slot,
          dayName: dayInfo?.label || `Day ${dayIndex}`,
          dayValue: dayInfo?.value || `day_${dayIndex}`,
          id: slot.id,
          startTime: slot.start_time || slot.startTime,
          endTime: slot.end_time || slot.endTime,
          course: slot.course_id || slot.courseId || slot.course,
          timeZone: slot.time_zone || slot.timeZone,
          instanceDate: slot.instance_date,
          formattedDate: formattedDate,
          slotType: slot.slot_type || 'single'
        });
      });
    } else {
      // Fallback for old format (should not happen with new API)
      Object.keys(timeslots || {}).forEach(dayKey => {
        const dayData = timeslots[dayKey];
        const dayInfo = daysOfWeek.find(d => d.value === dayKey);
        if (dayData && dayData.timeSlots) {
          dayData.timeSlots.forEach(slot => {
            allSlots.push({
              ...slot,
              dayName: dayInfo?.label || dayKey,
              dayValue: dayKey,
              formattedDate: 'Recurring',
              slotType: 'recurring'
            });
          });
        }
      });
    }

    // Sort slots by date first (for date instances), then by day and time
    allSlots.sort((a, b) => {
      // If both have specific dates, sort by date
      if (a.instanceDate && b.instanceDate) {
        return new Date(a.instanceDate) - new Date(b.instanceDate);
      }

      // If only one has a date, put dated instances first
      if (a.instanceDate && !b.instanceDate) return -1;
      if (!a.instanceDate && b.instanceDate) return 1;

      // If neither has dates, sort by day of week
      const dayA = daysOfWeek.findIndex(d => d.value === a.dayValue);
      const dayB = daysOfWeek.findIndex(d => d.value === b.dayValue);
      if (dayA !== dayB) return dayA - dayB;

      // Sort by time within the same day
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      return timeA.localeCompare(timeB);
    });

    const selectAllSlots = () => {
      const allSlotIds = new Set(allSlots.map(slot => slot.id));
      setSelectedListSlots(allSlotIds);
    };

    const hasSlots = allSlots.length > 0;

    return (
      <div className="timeslot-mgmt-list-view">
        {/* Enhanced list header */}
        <div className="timeslot-mgmt-list-header">
          <div className="timeslot-mgmt-list-title">
            <h4>Availability Slots ({allSlots.length})</h4>
            <p>Manage your weekly time slots for tutoring sessions</p>
          </div>
          <div className="timeslot-mgmt-list-actions">
            {!listSelectionMode && hasSlots && (
              <button
                className="timeslot-mgmt-btn-select"
                onClick={() => setListSelectionMode(true)}
              >
                <span>☑️</span> Select Multiple
              </button>
            )}
          </div>
        </div>

        {/* Selection mode controls */}
        {listSelectionMode && (
          <div className="timeslot-mgmt-selection-controls">
            <div className="timeslot-mgmt-selection-info">
              <span className="timeslot-mgmt-selection-count">
                {selectedListSlots.size} of {allSlots.length} selected
              </span>
            </div>
            <div className="timeslot-mgmt-selection-actions">
              <button
                className="timeslot-mgmt-btn-select-all"
                onClick={selectAllSlots}
                disabled={selectedListSlots.size === allSlots.length}
              >
                Select All
              </button>
              <button
                className="timeslot-mgmt-btn-clear"
                onClick={clearListSelection}
                disabled={selectedListSlots.size === 0}
              >
                Clear
              </button>
              <button
                className="timeslot-mgmt-btn-delete"
                onClick={handleBulkDelete}
                disabled={selectedListSlots.size === 0}
              >
                <span>🗑️</span> Delete Selected ({selectedListSlots.size})
              </button>
              <button
                className="timeslot-mgmt-btn-cancel"
                onClick={() => {
                  setListSelectionMode(false);
                  clearListSelection();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* List content */}
        <div className="timeslot-mgmt-list-container">
          {!hasSlots ? (
            <div className="timeslot-mgmt-empty-state">
              <div className="timeslot-mgmt-empty-icon">📅</div>
              <h3>No Time Slots Available</h3>
              <p>You haven't created any time slots yet. Create your first slot using the form above.</p>
            </div>
          ) : (
            <div className="timeslot-mgmt-list-wrapper">
              <table className="timeslot-mgmt-list-table">
                <thead>
                  <tr className="timeslot-mgmt-list-header-row">
                    {listSelectionMode && (
                      <th className="timeslot-mgmt-checkbox-col">
                        <input
                          type="checkbox"
                          checked={selectedListSlots.size === allSlots.length && allSlots.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              selectAllSlots();
                            } else {
                              clearListSelection();
                            }
                          }}
                          className="timeslot-mgmt-checkbox"
                        />
                      </th>
                    )}
                    <th className="timeslot-mgmt-date-header">Date</th>
                    <th className="timeslot-mgmt-day-header">Day</th>
                    <th className="timeslot-mgmt-time-header">Time Slot</th>
                    <th className="timeslot-mgmt-duration-header">Duration</th>
                    <th className="timeslot-mgmt-course-header">Course</th>
                    <th className="timeslot-mgmt-timezone-header">Timezone</th>
                    <th className="timeslot-mgmt-status-header">Status</th>
                    {!listSelectionMode && <th className="timeslot-mgmt-actions-header">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {allSlots.map((slot, index) => {
                    const isSelected = selectedListSlots.has(slot.id);
                    const courseInfo = assignedCourses.find(c => c.id === slot.course);

                    // Calculate duration
                    let duration = 'N/A';
                    if (slot.startTime && slot.endTime) {
                      const start = new Date(`2000-01-01T${slot.startTime}`);
                      const end = new Date(`2000-01-01T${slot.endTime}`);
                      const durationHours = (end - start) / (1000 * 60 * 60);
                      duration = durationHours === 1 ? '1 hour' : `${durationHours} hours`;
                    }

                    return (
                      <tr
                        key={`${slot.id}_${slot.instance_date || slot.specificDate || index}`}
                        className={`timeslot-mgmt-list-row ${
                          isSelected ? 'timeslot-mgmt-row-selected' : ''
                        } ${
                          listSelectionMode ? 'timeslot-mgmt-row-selectable' : ''
                        }`}
                        onClick={() => {
                          if (listSelectionMode) {
                            handleListSlotSelection(slot.id, !isSelected);
                          }
                        }}
                      >
                        {listSelectionMode && (
                          <td className="timeslot-mgmt-checkbox-col">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleListSlotSelection(slot.id, e.target.checked);
                              }}
                              className="timeslot-mgmt-checkbox"
                            />
                          </td>
                        )}
                        <td className="timeslot-mgmt-date-cell">
                          <div className="timeslot-mgmt-date-content">
                            <span className="timeslot-mgmt-date-display">{slot.formattedDate}</span>
                          </div>
                        </td>
                        <td className="timeslot-mgmt-day-cell">
                          <div className="timeslot-mgmt-day-content">
                            <span className="timeslot-mgmt-day-name">{slot.dayName}</span>
                          </div>
                        </td>
                        <td className="timeslot-mgmt-time-cell">
                          <div className="timeslot-mgmt-time-content">
                            <div className="timeslot-mgmt-time-range">
                              <span className="timeslot-mgmt-start-time">{formatTime(slot.startTime, slot)}</span>
                              <span className="timeslot-mgmt-time-separator">-</span>
                              <span className="timeslot-mgmt-end-time">{formatTime(slot.endTime, slot)}</span>
                            </div>
                            <div className="timeslot-mgmt-timezone">
                              <span className="timeslot-mgmt-timezone-abbr">
                                ({slot.displayTimezoneAbbr || getTimezoneAbbreviation()})
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="timeslot-mgmt-duration-cell">
                          <span className="timeslot-mgmt-duration">{duration}</span>
                        </td>
                        <td className="timeslot-mgmt-course-cell">
                          <div className="timeslot-mgmt-course-content">
                            <span className="timeslot-mgmt-course-name">
                              {courseInfo ? courseInfo.title || courseInfo.name : (slot.course || 'Any Course')}
                            </span>
                            {courseInfo && courseInfo.code && (
                              <span className="timeslot-mgmt-course-code">({courseInfo.code})</span>
                            )}
                          </div>
                        </td>
                        <td className="timeslot-mgmt-timezone-cell">
                          <span className="timeslot-mgmt-timezone">
                            {slot.timeZone || 'UTC'}
                          </span>
                        </td>
                        <td className="timeslot-mgmt-status-cell">
                          <span className="timeslot-mgmt-status-badge timeslot-mgmt-status-available">
                            Available
                          </span>
                        </td>
                        {!listSelectionMode && (
                          <td className="timeslot-mgmt-actions-cell">
                            <div className="timeslot-mgmt-action-buttons">
                              <button
                                className="timeslot-mgmt-btn-edit"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Implement edit functionality
                                  console.log('Edit slot:', slot.id);
                                }}
                                title="Edit timeslot"
                              >
                                ✏️
                              </button>
                              <button
                                className="timeslot-mgmt-btn-delete-single"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTimeslot(slot.id, slot);
                                }}
                                title="Delete timeslot"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* List footer with summary */}
        {hasSlots && (
          <div className="timeslot-mgmt-list-footer">
            <div className="timeslot-mgmt-list-summary">
              <span className="timeslot-mgmt-summary-item">
                <strong>{allSlots.length}</strong> total slots
              </span>
              <span className="timeslot-mgmt-summary-separator">•</span>
              <span className="timeslot-mgmt-summary-item">
                <strong>{availabilityStats.weeklyHours}h</strong> weekly availability
              </span>
              <span className="timeslot-mgmt-summary-separator">•</span>
              <span className="timeslot-mgmt-summary-item">
                <strong>{availabilityStats.courseTypes}</strong> course{availabilityStats.courseTypes !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Calendar view component (real TutorCalendar)
  const renderCalendarView = () => {
    console.log('🔍 DEBUG: renderCalendarView called with timeslots:', timeslots);
    console.log('🔍 DEBUG: assignedCourses for calendar:', assignedCourses);

    // Handle date click from calendar
    const handleDateClick = (date) => {
      console.log('🔍 DEBUG: Calendar date clicked:', date);
      // You can implement date-specific actions here if needed
    };

    // Handle availability deletion from calendar
    const handleAvailabilityDeleted = async () => {
      console.log('🔍 DEBUG: Availability deleted from calendar, reloading...');
      await loadTimeslots();
    };

    return (
      <div className="timeslot-mgmt-calendar-view">
        {!user?.id ? (
          <div className="timeslot-mgmt-loading">
            <p>Loading calendar...</p>
          </div>
        ) : (
          <TutorCalendar
            availability={timeslots}
            onDateClick={handleDateClick}
            assignedCourses={assignedCourses}
            tutorId={user.id}
            onAvailabilityDeleted={handleAvailabilityDeleted}
            upcomingSessions={[]} // TODO: Add upcoming sessions if needed
          />
        )}
      </div>
    );
  };

  return (
    <div className="timeslot-mgmt-container">
      {/* Header Section */}
      <div className="timeslot-mgmt-header">
        <div className="timeslot-mgmt-title-group">
          <h3>
            <span className="timeslot-mgmt-icon">📅</span>
            Manage Your Availability
          </h3>
          <p>Create timeslots when you're available for tutoring sessions</p>
        </div>
        <div className="timeslot-mgmt-header-actions">
          <button
            className="timeslot-mgmt-refresh-btn"
            onClick={() => loadTimeslots()}
            disabled={loading}
            title="Refresh timeslots"
          >
            {loading ? '⏳ Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="timeslot-mgmt-error-message">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="timeslot-mgmt-stats">
        <div className="timeslot-mgmt-stat-card total-slots">
          <div className="timeslot-mgmt-stat-header">
            <span className="timeslot-mgmt-stat-icon">📊</span>
            <h3>Total Slots</h3>
          </div>
          <div className="timeslot-mgmt-stat-value">{availabilityStats.totalSlots || 0}</div>
          <div className="timeslot-mgmt-stat-trend">Active time slots</div>
        </div>

        <div className="timeslot-mgmt-stat-card weekly-hours">
          <div className="timeslot-mgmt-stat-header">
            <span className="timeslot-mgmt-stat-icon">⏰</span>
            <h3>Weekly Hours</h3>
          </div>
          <div className="timeslot-mgmt-stat-value">{availabilityStats.weeklyHours || 0}h</div>
          <div className="timeslot-mgmt-stat-trend">Available hours</div>
        </div>

        <div className="timeslot-mgmt-stat-card course-types">
          <div className="timeslot-mgmt-stat-header">
            <span className="timeslot-mgmt-stat-icon">📚</span>
            <h3>Courses</h3>
          </div>
          <div className="timeslot-mgmt-stat-value">{availabilityStats.courseTypes}</div>
          <div className="timeslot-mgmt-stat-trend">Different courses</div>
        </div>

        <div className="timeslot-mgmt-stat-card most-active">
          <div className="timeslot-mgmt-stat-header">
            <span className="timeslot-mgmt-stat-icon">📈</span>
            <h3>Most Active</h3>
          </div>
          <div className="timeslot-mgmt-stat-value">{availabilityStats.mostActiveDay}</div>
          <div className="timeslot-mgmt-stat-trend">Busiest day</div>
        </div>
      </div>

      <div className="dual-role-tutor-timeslot-creation-section">
        <h4>Create New Timeslot</h4>

        {/* Error Display Components */}
        {timeslotErrors.general && (
          <div className="timeslot-error-message general-error">
            <span className="error-icon">⚠️</span>
            <span>{timeslotErrors.general}</span>
          </div>
        )}

        {Object.keys(timeslotErrors).some(key => key !== 'general') && (
          <div className="timeslot-validation-errors">
            <div className="validation-error-header">
              <span className="error-icon">❌</span>
              <span>Please fix the following errors:</span>
            </div>
            <ul className="validation-error-list">
              {Object.entries(timeslotErrors)
                .filter(([key]) => key !== 'general')
                .map(([field, message]) => (
                  <li key={field} className="validation-error-item">
                    <strong>{field.charAt(0).toUpperCase() + field.slice(1)}:</strong> {message}
                  </li>
                ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleCreateTimeslot} className="dual-role-tutor-timeslot-creation-form">
          {/* Slot Type Selection */}
          <div className="dual-role-tutor-timeslot-type-selector">
            <label className="dual-role-tutor-timeslot-type-label">Slot Type *</label>
            <div className="dual-role-tutor-timeslot-type-options">
              <label className="dual-role-tutor-timeslot-type-radio">
                <input
                  type="radio"
                  name="slotType"
                  value="single"
                  checked={timeslotForm.type === 'single'}
                  onChange={(e) => handleSlotTypeChange(e.target.value)}
                />
                <span className="dual-role-tutor-timeslot-radio-label">Single Slot</span>
                <span className="dual-role-tutor-timeslot-radio-desc">One-time availability</span>
              </label>
              <label className="dual-role-tutor-timeslot-type-radio">
                <input
                  type="radio"
                  name="slotType"
                  value="recurring"
                  checked={timeslotForm.type === 'recurring'}
                  onChange={(e) => handleSlotTypeChange(e.target.value)}
                />
                <span className="dual-role-tutor-timeslot-radio-label">Recurring Slot</span>
                <span className="dual-role-tutor-timeslot-radio-desc">Weekly repeating availability</span>
              </label>
            </div>
          </div>

          <div className="dual-role-tutor-timeslot-form-row">
            {/* Conditional Date/Day Selection */}
            {timeslotForm.type === 'single' ? (
              <div className="dual-role-tutor-timeslot-single-mode">
                <div className="dual-role-tutor-timeslot-form-group">
                  <label className="dual-role-tutor-timeslot-label">Specific Date *</label>
                  <input
                    type="date"
                    className="dual-role-tutor-timeslot-date-picker"
                    value={timeslotForm.date}
                    onChange={(e) => setTimeslotForm({ ...timeslotForm, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="dual-role-tutor-timeslot-recurring-mode">
                <div className="dual-role-tutor-timeslot-form-group">
                  <label className="dual-role-tutor-timeslot-label">Day of Week *</label>
                  <select
                    className="dual-role-tutor-timeslot-day-selector"
                    value={timeslotForm.recurrenceDays.length > 0 ? daysOfWeek[timeslotForm.recurrenceDays[0]]?.value || '' : ''}
                    onChange={(e) => handleRecurringDayChange(e.target.value)}
                    required
                  >
                    <option value="">Select day</option>
                    {daysOfWeek.map(day => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dual-role-tutor-timeslot-form-group">
                  <label className="dual-role-tutor-timeslot-label">Start Date *</label>
                  <input
                    type="date"
                    className="dual-role-tutor-timeslot-start-date"
                    value={timeslotForm.date}
                    onChange={(e) => setTimeslotForm({ ...timeslotForm, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="dual-role-tutor-timeslot-form-group">
                  <label className="dual-role-tutor-timeslot-label">End Date *</label>
                  <input
                    type="date"
                    className="dual-role-tutor-timeslot-end-date"
                    value={timeslotForm.recurrenceEndDate}
                    onChange={(e) => setTimeslotForm({ ...timeslotForm, recurrenceEndDate: e.target.value })}
                    min={timeslotForm.date || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="dual-role-tutor-timeslot-form-group">
                  <label className="dual-role-tutor-timeslot-label">Recurrence Type *</label>
                  <select
                    className="dual-role-tutor-timeslot-recurrence-type"
                    value="weekly"
                    disabled
                  >
                    <option value="weekly">Weekly</option>
                  </select>
                  <small className="dual-role-tutor-timeslot-help-text">Slots will repeat weekly on the selected day</small>
                </div>
              </div>
            )}

            <div className="dual-role-tutor-timeslot-form-group">
              <label className="dual-role-tutor-timeslot-label">Start Time *</label>
              <select
                className="dual-role-tutor-timeslot-time-picker"
                value={timeslotForm.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                required
              >
                <option value="">Select start time</option>
                {getStartTimeOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="dual-role-tutor-timeslot-form-group">
              <label className="dual-role-tutor-timeslot-label">End Time *</label>
              <select
                className="dual-role-tutor-timeslot-time-picker"
                value={timeslotForm.endTime}
                onChange={(e) => setTimeslotForm({ ...timeslotForm, endTime: e.target.value })}
                required
                disabled={!timeslotForm.startTime}
              >
                <option value="">
                  {timeslotForm.startTime ? 'Select end time' : 'Select start time first'}
                </option>
                {generateEndTimeOptions(timeslotForm.startTime).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="dual-role-tutor-timeslot-form-group">
              <label className="dual-role-tutor-timeslot-label">Course *</label>
              {coursesLoading ? (
                <select className="dual-role-tutor-timeslot-course-selector" disabled>
                  <option>Loading courses...</option>
                </select>
              ) : assignedCourses.length === 0 ? (
                <>
                  <select className="dual-role-tutor-timeslot-course-selector" disabled>
                    <option>No courses assigned</option>
                  </select>
                  <p className="dual-role-tutor-timeslot-no-courses-message">
                    Contact admin to be assigned to teach a course
                  </p>
                </>
              ) : (
                <select
                  className="dual-role-tutor-timeslot-course-selector"
                  value={timeslotForm.courseId}
                  onChange={(e) => setTimeslotForm({ ...timeslotForm, courseId: e.target.value })}
                  required
                >
                  <option value="">Select course</option>
                  {assignedCourses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title || course.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="dual-role-tutor-timeslot-form-group">
              <label className="dual-role-tutor-timeslot-label">Timezone *</label>
              <select
                className="dual-role-tutor-timeslot-timezone-selector"
                value={timeslotForm.timeZone}
                onChange={(e) => setTimeslotForm({ ...timeslotForm, timeZone: e.target.value })}
                required
              >
                {timezones.map(tz => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="dual-role-tutor-timeslot-form-group">
              <label className="dual-role-tutor-timeslot-label">Notes (Optional)</label>
              <textarea
                className="dual-role-tutor-timeslot-notes"
                value={timeslotForm.notes}
                onChange={(e) => setTimeslotForm({ ...timeslotForm, notes: e.target.value })}
                placeholder="Add any additional notes or instructions..."
                rows="3"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={timeslotSaving || assignedCourses.length === 0}
            className="dual-role-tutor-timeslot-submit-btn"
          >
            {timeslotSaving ? (
              <>
                <div className="spinner small"></div>
                Creating...
              </>
            ) : (
              <>
                {assignedCourses.length === 0 ? 'No Courses Assigned' :
                 timeslotForm.type === 'recurring' ? 'Create Recurring Slots' : 'Create Time Slot'}
              </>
            )}
          </button>
        </form>
      </div>

      {/* View Controls */}
      <div className="timeslot-mgmt-controls">
        <div className="timeslot-mgmt-view-toggle">
          <button
            className={`timeslot-mgmt-toggle-btn ${availabilityView === 'calendar' ? 'active' : ''}`}
            onClick={() => setAvailabilityView('calendar')}
          >
            <span className="timeslot-mgmt-toggle-icon">📅</span>
            Calendar View
          </button>
          <button
            className={`timeslot-mgmt-toggle-btn ${availabilityView === 'list' ? 'active' : ''}`}
            onClick={() => setAvailabilityView('list')}
          >
            <span className="timeslot-mgmt-toggle-icon">📋</span>
            List View
          </button>
          {availabilityView === 'list' && (
            <button
              className={`timeslot-mgmt-toggle-btn ${listSelectionMode ? 'active' : ''}`}
              onClick={() => setListSelectionMode(!listSelectionMode)}
            >
              <span className="timeslot-mgmt-toggle-icon">☑️</span>
              Select Mode
            </button>
          )}
        </div>
        <div className="timeslot-mgmt-view-actions">
          <button
            className="timeslot-mgmt-refresh-btn"
            onClick={() => loadTimeslots()}
            disabled={loading}
            title="Refresh availability data"
          >
            <span className={`timeslot-mgmt-refresh-icon ${loading ? 'spinning' : ''}`}>🔄</span>
          </button>
        </div>
      </div>

      {/* Current Availability Section */}
      <div className="timeslot-mgmt-existing">
        <h4>Your Current Availability</h4>

        {/* Loading State */}
        {loading && (
          <div className="timeslot-mgmt-loading-overlay">
            <div className="timeslot-mgmt-loading-spinner">
              <div className="timeslot-mgmt-spinner"></div>
              <p>Loading availability...</p>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="timeslot-mgmt-content">
          {availabilityView === 'calendar' ? renderCalendarView() : renderListView()}
        </div>
      </div>
    </div>
  );
};

export default TimeslotManagement;