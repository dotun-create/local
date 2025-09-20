import React, { useState, useEffect } from 'react';
import './CreateAvailabilityModal.css';
import { 
  generateTimeOptions, 
  formatTimeByCountry, 
  formatDateTimeByCountry,
  formatPreviewDate,
  parseFormDateTime,
  parseFormDateTimeInTimezone,
  formatDateConsistent,
  getEffectiveTimezone,
  generateRecurringDates,
  formatDateToString,
  validateDateConsistency,
  validateTimeRange,
  getCourseCountry,
  getUserCountry,
  getDayNameFromDate,
  getDayOfWeekFromString
} from '../../utils/timeUtils';

// Unified DateTimeDisplay component for consistent formatting
const DateTimeDisplay = ({ 
  date, 
  time, 
  timezone, 
  country, 
  format = 'full',
  className = 'datetime-display'
}) => {
  if (!date) return null;
  
  // Normalize date input to ensure consistent processing
  let normalizedDate = date;
  if (typeof date === 'string') {
    // For string inputs, keep as-is (formatDateConsistent handles timezone-safe parsing)
    normalizedDate = date;
  } else if (date instanceof Date) {
    // For Date objects, ensure no timezone conversion by extracting components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    normalizedDate = `${year}-${month}-${day}`;
  }
  
  const displayDate = formatDateConsistent(normalizedDate, timezone);
  const displayTime = time ? formatTimeByCountry(time, country) : '';
  
  // Add debug logging to detect inconsistencies
  if (process.env.NODE_ENV === 'development') {
    console.debug('DateTimeDisplay:', {
      originalDate: date,
      normalizedDate,
      displayDate,
      displayTime,
      timezone,
      country,
      format
    });
  }
  
  if (format === 'date-only') {
    return <span className={className}>{displayDate}</span>;
  }
  
  if (format === 'time-only') {
    return <span className={className}>{displayTime}</span>;
  }
  
  return (
    <span className={className}>
      {format === 'full' ? `${displayDate} ${displayTime}` : displayTime}
    </span>
  );
};

const CreateAvailabilityModal = ({
  isOpen,
  onClose,
  onSuccess,
  selectedDate,
  tutorId,
  assignedCourses = [],
  existingAvailability = [],
  editMode = false,
  editData = null,
  currentUser = null,
  userTimezone = 'UTC'  // New prop for timezone from TutorPage
}) => {
  // Get current date in YYYY-MM-DD format (timezone-safe)
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Parse date string in timezone-safe way
  const parseDate = (dateString) => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
  };

  const [formData, setFormData] = useState({
    date: selectedDate || getCurrentDate(),
    startTime: '',
    endTime: '',
    course: '',
    isRecurring: false,
    recurrenceType: 'weekly',
    recurrenceDays: [],
    recurrenceEndDate: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [conflictWarnings, setConflictWarnings] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [allTutorAvailability, setAllTutorAvailability] = useState([]);
  const [effectiveTimezone, setEffectiveTimezone] = useState(null);
  
  // Determine country for time formatting
  const getCountryContext = () => {
    // Priority: 1. Selected course country, 2. First assigned course country, 3. User country, 4. Default UK
    if (formData.course && assignedCourses.length > 0) {
      const selectedCourse = assignedCourses.find(c => c.id === formData.course);
      if (selectedCourse) return getCourseCountry(selectedCourse);
    }
    
    if (assignedCourses.length > 0) {
      return getCourseCountry(assignedCourses[0]);
    }
    
    if (currentUser) {
      return getUserCountry(currentUser);
    }
    
    return 'UK'; // Default
  };
  
  // Initialize timezone context
  useEffect(() => {
    if (isOpen) {
      const selectedCourse = formData.course && assignedCourses.length > 0 
        ? assignedCourses.find(c => c.id === formData.course)
        : assignedCourses[0];
      
      const timezone = getEffectiveTimezone(currentUser, selectedCourse);
      setEffectiveTimezone(timezone);
      
      // Validate date consistency when timezone changes
      if (formData.date && formData.startTime) {
        const processedDate = parseFormDateTimeInTimezone(formData.date, formData.startTime, timezone);
        const isConsistent = validateDateConsistency(formData.date, processedDate);
        
        if (!isConsistent) {
          console.warn(`Date consistency issue detected: ${formData.date} vs processed date`);
        }
      }
    }
  }, [isOpen, currentUser, assignedCourses, formData.course, formData.date, formData.startTime]);

  // Day options for recurring patterns (matching JavaScript getDay() values)
  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' }, 
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  // Generate time slot options based on country
  const getTimeOptions = () => {
    const country = getCountryContext();
    return generateTimeOptions(country, 6, 21); // 6am to 9pm, hourly
  };

  // Load all tutor availability when modal opens
  useEffect(() => {
    if (isOpen && tutorId) {
      loadTutorAvailability();
    }
  }, [isOpen, tutorId]);

  const loadTutorAvailability = async () => {
    if (!tutorId) return;
    
    try {
      const token = sessionStorage.getItem('authToken') || localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:80/api';
      const response = await fetch(`${API_BASE_URL}/tutors/${tutorId}/availability`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Convert the weekly availability to a flat array of all time slots
        const allSlots = [];
        Object.entries(data.availability || {}).forEach(([dayName, dayData]) => {
          if (dayData.timeSlots && dayData.timeSlots.length > 0) {
            dayData.timeSlots.forEach(slot => {
              allSlots.push({
                ...slot,
                dayName,
                dayOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(dayName)
              });
            });
          }
        });
        setAllTutorAvailability(allSlots);
        
        // Re-check conflicts when availability data is loaded
        setTimeout(() => {
          if (formData.startTime && formData.endTime && formData.date) {
            checkTimeConflicts(formData);
          }
        }, 0);
      }
    } catch (error) {
      console.error('Error loading tutor availability:', error);
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editMode && editData) {
        setFormData({
          date: editData.specific_date || selectedDate || '',
          startTime: editData.start_time || '',
          endTime: editData.end_time || '',
          course: editData.course_id || '',
          isRecurring: editData.is_recurring || false,
          recurrenceType: editData.recurrence_type || 'weekly',
          recurrenceDays: editData.recurrence_days || [],
          recurrenceEndDate: editData.recurrence_end_date ? 
            new Date(editData.recurrence_end_date).toISOString().split('T')[0] : ''
        });
      } else {
        const defaultDate = selectedDate || getCurrentDate();
        const defaultDayOfWeek = parseDate(defaultDate).getDay();
        setFormData({
          date: defaultDate,
          startTime: '',
          endTime: '',
          course: '',
          isRecurring: false,
          recurrenceType: 'weekly',
          recurrenceDays: [defaultDayOfWeek],
          recurrenceEndDate: ''
        });
      }
      setErrors({});
      setConflictWarnings([]);
      setShowPreview(false);

      // Check for conflicts when form is initialized
      setTimeout(() => {
        if ((formData.startTime || editData?.start_time) && (formData.endTime || editData?.end_time)) {
          checkTimeConflicts(formData);
        }
      }, 100);
    }
  }, [isOpen, selectedDate, editMode, editData]);

  // Update date when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => {
        const newData = { ...prev, date: selectedDate };
        const date = parseDate(selectedDate);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Always update recurrenceDays to match the selected date
        newData.recurrenceDays = [dayOfWeek];
        
        return newData;
      });
    }
  }, [selectedDate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // When start time changes, automatically set end time to 1 hour later
      if (field === 'startTime' && value) {
        const startHour = parseInt(value.split(':')[0]);
        if (startHour < 21) { // Ensure end time doesn't go beyond 9pm
          const endHour = startHour + 1;
          newData.endTime = `${endHour.toString().padStart(2, '0')}:00`;
        }
      }
      
      // When date changes, update recurrenceDays to match the new date
      if (field === 'date' && value) {
        const selectedDate = parseDate(value);
        const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Always update recurrenceDays to match the selected date
        newData.recurrenceDays = [dayOfWeek];
      }
      
      return newData;
    });
    
    // Clear related errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Check for conflicts when relevant fields change
    if (field === 'startTime' || field === 'endTime' || field === 'date' || field === 'isRecurring') {
      setTimeout(() => checkTimeConflicts({ ...formData, [field]: value }), 0);
    }
  };

  const handleRecurrenceDaysChange = (dayValue) => {
    const currentDays = formData.recurrenceDays;
    const newDays = currentDays.includes(dayValue)
      ? currentDays.filter(day => day !== dayValue)
      : [...currentDays, dayValue].sort();
    
    setFormData(prev => ({ ...prev, recurrenceDays: newDays }));
    
    // Check for conflicts when recurrence days change
    setTimeout(() => checkTimeConflicts({ ...formData, recurrenceDays: newDays }), 0);
  };

  // Get available end time options based on selected start time
  const getEndTimeOptions = () => {
    const allTimeOptions = getTimeOptions();
    if (!formData.startTime) return allTimeOptions;
    
    const startHour = parseInt(formData.startTime.split(':')[0]);
    return allTimeOptions.filter(option => {
      const optionHour = parseInt(option.value.split(':')[0]);
      return optionHour > startHour;
    });
  };

  const checkTimeConflicts = (data) => {
    if (!data.startTime || !data.endTime || !data.date) {
      setConflictWarnings([]);
      return;
    }

    const selectedDate = parseDate(data.date);
    const selectedDayOfWeek = selectedDate.getDay();
    const conflicts = [];

    // Check for single date conflicts
    if (data.isRecurring) {
      // For recurring slots, check conflicts for each recurrence day
      data.recurrenceDays.forEach(dayOfWeek => {
        const daySlots = allTutorAvailability.filter(slot => slot.dayOfWeek === dayOfWeek);
        
        daySlots.forEach(existingSlot => {
          // Skip if this is the same slot we're editing
          if (editMode && editData && existingSlot.id === editData.id) return;
          
          const newStart = convertTimeToMinutes(data.startTime);
          const newEnd = convertTimeToMinutes(data.endTime);
          const existingStart = convertTimeToMinutes(existingSlot.startTime);
          const existingEnd = convertTimeToMinutes(existingSlot.endTime);

          // Check for time overlap
          if (newStart < existingEnd && newEnd > existingStart) {
            conflicts.push({
              ...existingSlot,
              conflictType: 'recurring',
              conflictDay: dayOptions.find(d => d.value === dayOfWeek)?.label || 'Unknown'
            });
          }
        });
      });
    } else {
      // For single slots, check against slots on the same day of week
      const daySlots = allTutorAvailability.filter(slot => slot.dayOfWeek === selectedDayOfWeek);
      
      daySlots.forEach(existingSlot => {
        // Skip if this is the same slot we're editing
        if (editMode && editData && existingSlot.id === editData.id) return;
        
        const newStart = convertTimeToMinutes(data.startTime);
        const newEnd = convertTimeToMinutes(data.endTime);
        const existingStart = convertTimeToMinutes(existingSlot.startTime);
        const existingEnd = convertTimeToMinutes(existingSlot.endTime);

        // Check for time overlap
        if (newStart < existingEnd && newEnd > existingStart) {
          conflicts.push({
            ...existingSlot,
            conflictType: 'single',
            conflictDay: selectedDate.toLocaleDateString('en-US', { weekday: 'long' })
          });
        }
      });
    }

    setConflictWarnings(conflicts);
  };

  // Helper function to convert time string (HH:MM) to minutes for easier comparison
  const convertTimeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    
    if (formData.startTime && formData.endTime) {
      const startTime = new Date(`2000-01-01T${formData.startTime}`);
      const endTime = new Date(`2000-01-01T${formData.endTime}`);
      
      if (startTime >= endTime) {
        newErrors.endTime = 'End time must be after start time';
      }
      
      const duration = (endTime - startTime) / (1000 * 60);
      if (duration < 60) {
        newErrors.endTime = 'Minimum session duration is 1 hour';
      }
    }

    if (formData.isRecurring) {
      if (formData.recurrenceDays.length === 0) {
        newErrors.recurrenceDays = 'Select at least one day for recurring pattern';
      }
      if (!formData.recurrenceEndDate) {
        newErrors.recurrenceEndDate = 'End date is required for recurring availability';
      }
    }

    // Check for time conflicts
    if (conflictWarnings.length > 0) {
      newErrors.timeConflict = 'Please resolve time conflicts before creating this availability';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getDayOfWeekNumber = (date) => {
    return parseDate(date).getDay();
  };

  // Convert JavaScript day number (0=Sunday) to Python day number (0=Monday)
  const convertJSToPyDay = (jsDay) => {
    return jsDay === 0 ? 6 : jsDay - 1;
  };

  // Convert Python day number (0=Monday) to JavaScript day number (0=Sunday)  
  const convertPyToJSDay = (pyDay) => {
    return pyDay === 6 ? 0 : pyDay + 1;
  };

  const handleDelete = async () => {
    if (!editMode || !editData) return;
    
    const confirmed = window.confirm(
      editData.is_recurring 
        ? 'Are you sure you want to delete this recurring availability series? This will remove all future time slots.'
        : 'Are you sure you want to delete this time slot?'
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);

    try {
      const endpoint = editData.is_recurring 
        ? `/api/availability/recurring/${editData.id}?deleteFutureOnly=true`
        : `/api/availability/${editData.id}/single`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(result);
        onClose();
      } else {
        setErrors({ general: result.error || 'Failed to delete availability' });
      }
    } catch (error) {
      console.error('Error deleting availability:', error);
      setErrors({ general: 'Network error occurred. Please try again.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      let response;
      
      if (editMode && editData) {
        // Update existing availability
        const updatePayload = {
          startTime: formData.startTime,
          endTime: formData.endTime,
          courseId: formData.course || null,
          editScope: editData.is_recurring ? 'series' : 'single'
        };

        const endpoint = editData.is_recurring 
          ? `/api/availability/recurring/${editData.id}`
          : `/api/availability/${editData.id}/single`;

        response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });
      } else if (formData.isRecurring) {
        // Create recurring availability
        const selectedJSDay = getDayOfWeekNumber(formData.date);
        const selectedPyDay = convertJSToPyDay(selectedJSDay);
        
        // Convert all recurrence days from JavaScript to Python format
        const convertedRecurrenceDays = formData.recurrenceDays.map(convertJSToPyDay);
        
        const payload = {
          tutorId: tutorId,
          dayOfWeek: selectedPyDay,
          startDate: formData.date,  // Include the selected start date
          startTime: formData.startTime,
          endTime: formData.endTime,
          courseId: formData.course || null,
          recurrenceType: formData.recurrenceType,
          recurrenceDays: convertedRecurrenceDays,
          recurrenceEndDate: formData.recurrenceEndDate ? `${formData.recurrenceEndDate}T23:59:59` : null,
          timeZone: userTimezone  // ✅ Use dynamic timezone from prop
        };

        console.log('🔧 Recurring Availability Debug:');
        console.log('Selected date:', formData.date);
        console.log('Selected JS day:', selectedJSDay, dayOptions.find(d => d.value === selectedJSDay)?.label);
        console.log('Converted Python day:', selectedPyDay);
        console.log('JS recurrence days:', formData.recurrenceDays.map(d => dayOptions.find(opt => opt.value === d)?.label));
        console.log('Python recurrence days:', convertedRecurrenceDays);
        console.log('Payload:', payload);

        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:80/api';
        response = await fetch(`${API_BASE_URL}/availability/recurring`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create single availability using the new dedicated endpoint
        const token = sessionStorage.getItem('authToken') || localStorage.getItem('token');
        const payload = {
          timeSlot: {
            startTime: formData.startTime,
            endTime: formData.endTime,
            course: formData.course || null,
            courseId: formData.course || null,
            timeZone: userTimezone,  // ✅ Use dynamic timezone from prop
            specificDate: formData.date
          },
          day: getDayNameFromDate(formData.date) // Helper function to get day name
        };

        const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:80/api';
        response = await fetch(`${API_BASE_URL}/tutors/${tutorId}/availability/timeslot`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let result;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // Not JSON response - likely an error page
        const text = await response.text();
        console.error('Non-JSON response:', text);
        console.error('Response status:', response.status);
        console.error('Response headers:', [...response.headers.entries()]);
        throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 200)}`);
      }

      // Check for success based on different response formats
      const isSuccess = result.success || (response.ok && result.message);
      
      if (isSuccess) {
        // Call the onSuccess callback to refresh parent component data
        onSuccess(result);
        onClose();
      } else {
        setErrors({ general: result.error || 'Failed to create availability' });
      }
    } catch (error) {
      console.error('Error creating availability:', error);
      console.error('Request payload was:', formData.isRecurring ? {
        tutorId: tutorId,
        dayOfWeek: convertJSToPyDay(getDayOfWeekNumber(formData.date)),
        startDate: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        courseId: formData.course || null,
        recurrenceType: formData.recurrenceType,
        recurrenceDays: formData.recurrenceDays.map(convertJSToPyDay),
        recurrenceEndDate: formData.recurrenceEndDate ? `${formData.recurrenceEndDate}T23:59:59` : null,
        timeZone: 'UTC'
      } : {
        tutor_id: tutorId,
        date: formData.date,
        start_time: formData.startTime,
        end_time: formData.endTime,
        course_id: formData.course || null,
        available: true
      });
      setErrors({ general: `Network error occurred: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePreview = () => {
    if (!formData.isRecurring || !formData.recurrenceEndDate) return [];

    const country = getCountryContext();
    
    // Use the new string-based date generation (returns array of strings)
    const recurringDateStrings = generateRecurringDates(
      formData.date,
      formData.recurrenceEndDate,
      formData.recurrenceDays,
      userTimezone  // Use prop timezone instead of effectiveTimezone
    );
    
    return recurringDateStrings.map((dateString, index) => {
      // Calculate day of week from string without creating Date object
      const [year, month, day] = dateString.split('-').map(Number);
      const jsDay = getDayOfWeekFromString(dateString);
      const pyDay = convertJSToPyDay(jsDay);
      
      return {
        date: dateString, // Already a YYYY-MM-DD string from string-based generation
        dayName: dayOptions.find(d => d.value === jsDay)?.label,
        startTime: formData.startTime,
        endTime: formData.endTime,
        formattedStartTime: formatTimeByCountry(formData.startTime, country),
        formattedEndTime: formatTimeByCountry(formData.endTime, country),
        jsDay: jsDay,
        pyDay: pyDay  // For debugging
      };
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editMode ? 'Edit Availability' : 'Create Availability'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="availability-form">
          {/* Basic Information */}
          <div className="form-section">
            <h3>Time Slot Details</h3>
            
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={errors.date ? 'error' : ''}
                min={getCurrentDate()}
              />
              {errors.date && <span className="error-text">{errors.date}</span>}
              
              {/* Schedule Section Preview - Shows processed date/time */}
              {formData.date && formData.startTime && (
                <div className="schedule-preview">
                  <span className="preview-label">Schedule: </span>
                  <DateTimeDisplay 
                    date={formData.date}
                    time={formData.startTime}
                    timezone={effectiveTimezone}
                    country={getCountryContext()}
                    format="full"
                    className="schedule-datetime"
                  />
                  {formData.endTime && (
                    <>
                      <span> - </span>
                      <DateTimeDisplay 
                        date={formData.date}
                        time={formData.endTime}
                        timezone={effectiveTimezone}
                        country={getCountryContext()}
                        format="time-only"
                        className="schedule-datetime"
                      />
                    </>
                  )}
                  
                  {/* Debug validation in development mode */}
                  {process.env.NODE_ENV === 'development' && formData.endTime && (
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      Debug: Schedule section using string date "{formData.date}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <select
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className={errors.startTime ? 'error' : ''}
                >
                  <option value="">Select start time</option>
                  {getTimeOptions().slice(0, -1).map(option => ( // Exclude 9pm as start time
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.startTime && <span className="error-text">{errors.startTime}</span>}
              </div>

              <div className="form-group">
                <label>End Time</label>
                <select
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className={errors.endTime ? 'error' : ''}
                  disabled={!formData.startTime}
                >
                  <option value="">Select end time</option>
                  {getEndTimeOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.endTime && <span className="error-text">{errors.endTime}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Course (Optional)</label>
              <select
                value={formData.course}
                onChange={(e) => handleInputChange('course', e.target.value)}
              >
                <option value="">Any course</option>
                {assignedCourses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title} ({course.subject})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurring Options */}
          <div className="form-section">
            <div className="recurring-toggle">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                />
                <span className="checkmark"></span>
                Make this recurring
              </label>
            </div>

            {formData.isRecurring && (
              <>
                <div className="form-group">
                  <label>Will repeat on</label>
                  <div className="selected-day-display">
                    {formData.recurrenceDays.length > 0 && 
                      dayOptions
                        .filter(day => formData.recurrenceDays.includes(day.value))
                        .map(day => day.label)
                        .join(', ')
                    }
                  </div>
                  {errors.recurrenceDays && <span className="error-text">{errors.recurrenceDays}</span>}
                </div>

                <div className="form-group">
                  <label>Repeat until</label>
                  <input
                    type="date"
                    value={formData.recurrenceEndDate}
                    onChange={(e) => handleInputChange('recurrenceEndDate', e.target.value)}
                    className={errors.recurrenceEndDate ? 'error' : ''}
                    min={formData.date}
                  />
                  {errors.recurrenceEndDate && <span className="error-text">{errors.recurrenceEndDate}</span>}
                </div>

                {formData.recurrenceEndDate && (
                  <div className="preview-section">
                    <button
                      type="button"
                      className="preview-toggle"
                      onClick={() => setShowPreview(!showPreview)}
                    >
                      {showPreview ? 'Hide' : 'Show'} Preview ({generatePreview().length} slots)
                    </button>
                    
                    {showPreview && (
                      <div className="preview-list">
                        {generatePreview().map((slot, index) => (
                          <div key={index} className="preview-slot">
                            <span className="preview-date">
                              <DateTimeDisplay 
                                date={slot.date}
                                time={slot.startTime}
                                timezone={effectiveTimezone}
                                country={getCountryContext()}
                                format="full"
                                className="preview-datetime"
                              />
                            </span>
                            <span className="preview-day">({slot.dayName})</span>
                            <span className="preview-time-range"> - </span>
                            <span className="preview-time">
                              <DateTimeDisplay 
                                date={slot.date}
                                time={slot.endTime}
                                timezone={effectiveTimezone}
                                country={getCountryContext()}
                                format="time-only"
                                className="preview-datetime"
                              />
                            </span>
                            {/* Debug info for preview items */}
                            {process.env.NODE_ENV === 'development' && index === 0 && (
                              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                                Debug: Preview using normalized string "{slot.date}"
                              </div>
                            )}
                          </div>
                        ))}
                        {generatePreview().length === 10 && <div className="preview-more">... and more</div>}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Conflict Warnings */}
          {conflictWarnings.length > 0 && (
            <div className="conflict-warnings">
              <h4>⚠️ Time Conflicts Detected</h4>
              <p className="conflict-description">
                The following time slots conflict with your new availability:
              </p>
              {conflictWarnings.map((conflict, index) => {
                const country = getCountryContext();
                return (
                  <div key={index} className="conflict-item">
                    <div className="conflict-info">
                      <span className="conflict-time">
                        {formatTimeByCountry(conflict.startTime, country)} - {formatTimeByCountry(conflict.endTime, country)}
                      </span>
                      <span className="conflict-day">
                        on {conflict.conflictDay}
                      </span>
                      {conflict.course && (
                        <span className="conflict-course">
                          (Course: {assignedCourses.find(c => c.id === conflict.course)?.title || 'Unknown'})
                        </span>
                      )}
                    </div>
                    <div className="conflict-type">
                      {conflict.conflictType === 'recurring' ? 'Recurring slot' : 'Existing slot'}
                    </div>
                  </div>
                );
              })}
              <div className="conflict-help">
                <strong>To resolve conflicts:</strong>
                <ul>
                  <li>Choose a different time slot</li>
                  <li>Select a different day</li>
                  <li>Delete the conflicting availability first</li>
                </ul>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {errors.general && (
            <div className="error-message">
              {errors.general}
            </div>
          )}

          {errors.timeConflict && (
            <div className="error-message">
              {errors.timeConflict}
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            
            {editMode && (
              <button 
                type="button" 
                className="delete-btn"
                onClick={handleDelete}
                disabled={isDeleting || isLoading}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            
            <button 
              type="submit" 
              className="create-btn"
              disabled={isLoading || isDeleting || conflictWarnings.length > 0}
            >
{isLoading 
                ? (editMode ? 'Updating...' : 'Creating...') 
                : editMode 
                  ? (formData.isRecurring ? 'Update Series' : 'Update Slot')
                  : (formData.isRecurring ? 'Create Recurring Slots' : 'Create Slot')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAvailabilityModal;