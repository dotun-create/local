// Availability Data Normalizer
// Ensures consistent field naming across all components that use availability data
// Includes day-of-week standardization for JavaScript/Python format compatibility

/**
 * Convert Python weekday format to JavaScript weekday format
 * Python: 0=Monday, 1=Tuesday, ..., 6=Sunday
 * JavaScript: 0=Sunday, 1=Monday, ..., 6=Saturday
 * @param {number} pythonWeekday - Python weekday number
 * @returns {number} - JavaScript weekday number
 */
const pythonToJsWeekday = (pythonWeekday) => {
  if (typeof pythonWeekday !== 'number' || pythonWeekday < 0 || pythonWeekday > 6) {
    return 1; // Default to Monday in JS format
  }
  return (pythonWeekday + 1) % 7;
};

/**
 * Convert JavaScript weekday format to Python weekday format
 * JavaScript: 0=Sunday, 1=Monday, ..., 6=Saturday
 * Python: 0=Monday, 1=Tuesday, ..., 6=Sunday
 * @param {number} jsWeekday - JavaScript weekday number
 * @returns {number} - Python weekday number
 */
const jsToPythonWeekday = (jsWeekday) => {
  if (typeof jsWeekday !== 'number' || jsWeekday < 0 || jsWeekday > 6) {
    return 0; // Default to Monday in Python format
  }
  return (jsWeekday - 1 + 7) % 7;
};

/**
 * Normalizes a single availability slot to ensure all field variants exist
 * This allows different components to use their preferred field names
 * @param {Object} slot - The availability slot to normalize
 * @returns {Object} - Normalized slot with all field variants
 */
export const normalizeAvailabilitySlot = (slot) => {
  if (!slot) return slot;

  // Extract the base date value from any available field
  // For calendar filtering, we need date-only format (YYYY-MM-DD)
  const dateValue = slot.instance_date ||
                    (slot.specificDate ? slot.specificDate.split('T')[0] : null) ||
                    (slot.specific_date ? slot.specific_date.split('T')[0] : null) ||
                    slot.date;

  // Extract time values
  const startTimeValue = slot.startTime || slot.start_time;
  const endTimeValue = slot.endTime || slot.end_time;

  // Extract timezone values
  const timezoneValue = slot.timeZone || slot.time_zone || slot.timezone;

  // Extract and standardize day of week - handle both formats
  let dayOfWeekValue = slot.dayOfWeek !== undefined ? slot.dayOfWeek : slot.day_of_week;
  let dayOfWeekJs = slot.day_of_week_js;
  let dayOfWeekPython = slot.day_of_week_python || slot.day_of_week;

  // If we have a Python format day but no JS format, convert it
  if (dayOfWeekPython !== undefined && dayOfWeekJs === undefined) {
    dayOfWeekJs = pythonToJsWeekday(dayOfWeekPython);
  }

  // If we have a JS format day but no Python format, convert it
  if (dayOfWeekJs !== undefined && dayOfWeekPython === undefined) {
    dayOfWeekPython = jsToPythonWeekday(dayOfWeekJs);
  }

  // Use JS format as primary for frontend compatibility
  if (dayOfWeekJs !== undefined) {
    dayOfWeekValue = dayOfWeekJs;
  }

  return {
    ...slot,

    // Date fields - ensure all variants exist
    specificDate: dateValue,  // Used by TutorCalendar for filtering
    specific_date: dateValue,  // Alternate format used by TutorCalendar
    instance_date: dateValue,  // Used by TimeslotManagement for display
    date: dateValue,           // Generic date field used by some components

    // Time fields - normalize naming
    startTime: startTimeValue,
    start_time: startTimeValue,
    endTime: endTimeValue,
    end_time: endTimeValue,

    // Day of week fields - provide both formats for compatibility
    dayOfWeek: dayOfWeekValue,        // Primary field (JavaScript format)
    day_of_week: dayOfWeekPython,     // Python format for backend compatibility
    day_of_week_js: dayOfWeekJs,      // Explicit JavaScript format
    day_of_week_python: dayOfWeekPython, // Explicit Python format

    // Timezone fields
    timeZone: timezoneValue,
    time_zone: timezoneValue,
    timezone: timezoneValue,

    // Preserve original fields that might be used elsewhere
    ...(slot.isRecurring !== undefined && { isRecurring: slot.isRecurring }),
    ...(slot.is_recurring !== undefined && { is_recurring: slot.is_recurring }),
    ...(slot.courseId && { courseId: slot.courseId }),
    ...(slot.course_id && { course_id: slot.course_id }),
    ...(slot.tutorId && { tutorId: slot.tutorId }),
    ...(slot.tutor_id && { tutor_id: slot.tutor_id })
  };
};

/**
 * Normalizes an array of availability slots
 * @param {Array} slots - Array of availability slots to normalize
 * @returns {Array} - Array of normalized slots
 */
export const normalizeAvailabilityArray = (slots) => {
  if (!Array.isArray(slots)) {
    console.warn('normalizeAvailabilityArray: Expected array, received:', typeof slots);
    return [];
  }

  return slots.map(slot => normalizeAvailabilitySlot(slot));
};

/**
 * Normalizes availability response from API
 * Handles both direct arrays and wrapped responses
 * @param {Object|Array} response - API response
 * @returns {Object|Array} - Normalized response
 */
export const normalizeAvailabilityResponse = (response) => {
  // Handle direct array response
  if (Array.isArray(response)) {
    return normalizeAvailabilityArray(response);
  }

  // Handle wrapped response with availability property
  if (response && response.availability) {
    return {
      ...response,
      availability: normalizeAvailabilityArray(response.availability)
    };
  }

  // Handle wrapped response with data property
  if (response && response.data) {
    return {
      ...response,
      data: normalizeAvailabilityArray(response.data)
    };
  }

  // Return as-is if structure is unknown
  console.warn('normalizeAvailabilityResponse: Unknown response structure:', response);
  return response;
};

// Debug helper to log normalized data
export const debugNormalization = (original, normalized) => {
  console.group('🔄 Availability Normalization');
  console.log('Original:', original);
  console.log('Normalized:', normalized);
  console.log('Key mappings:');
  console.log('  - instance_date →', normalized.instance_date);
  console.log('  - specificDate →', normalized.specificDate);
  console.log('  - specific_date →', normalized.specific_date);
  console.groupEnd();
};