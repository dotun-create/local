/**
 * Timezone Manager for Frontend Components
 *
 * Provides centralized timezone management and conversion utilities
 * for consistent timezone handling across all components
 */

/**
 * Get user's selected timezone from storage or browser
 * @returns {string} IANA timezone string (e.g., 'America/Chicago')
 */
export const getUserTimezone = () => {
  // Check for user preference in localStorage first
  const savedTimezone = localStorage.getItem('userTimezone');
  if (savedTimezone) {
    return savedTimezone;
  }

  // Fallback to browser's timezone
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to get browser timezone:', error);
    return 'UTC'; // Ultimate fallback
  }
};

/**
 * Set user's timezone preference
 * @param {string} timezone - IANA timezone string
 */
export const setUserTimezone = (timezone) => {
  if (isValidTimezone(timezone)) {
    localStorage.setItem('userTimezone', timezone);
  } else {
    console.warn('Invalid timezone provided:', timezone);
  }
};

/**
 * Validate if a timezone string is valid
 * @param {string} timezone - Timezone to validate
 * @returns {boolean} True if valid
 */
export const isValidTimezone = (timezone) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get timezone headers for API requests
 * @returns {Object} Headers object with timezone information
 */
export const getTimezoneHeaders = () => {
  const userTimezone = getUserTimezone();
  const browserLocale = navigator.language || 'en-US';

  return {
    'X-Timezone': userTimezone,
    'X-Browser-Locale': browserLocale
  };
};

/**
 * Format time for display in user's timezone
 * @param {string|Date} dateTime - DateTime to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted time string
 */
export const formatTimeInUserTimezone = (dateTime, options = {}) => {
  const userTimezone = getUserTimezone();
  const defaultOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: userTimezone,
    ...options
  };

  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    return date.toLocaleTimeString('en-US', defaultOptions);
  } catch (error) {
    console.warn('Error formatting time:', error);
    return 'Invalid Time';
  }
};

/**
 * Parse date string without timezone conversion to avoid day shifts
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Date object in local timezone without shifting
 */
export const parseDateWithoutTimezoneShift = (dateString) => {
  if (!dateString) {
    console.warn('Empty date string provided to parseDateWithoutTimezoneShift');
    return new Date();
  }

  try {
    // Extract date parts to avoid UTC midnight interpretation
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) {
      throw new Error('Invalid date format');
    }

    // Create local date without timezone conversion
    return new Date(year, month - 1, day); // month is 0-indexed
  } catch (error) {
    console.warn('Error parsing date string:', dateString, error);
    return new Date(); // Fallback to current date
  }
};

/**
 * Convert UTC time to user's timezone for display
 * @param {string} utcTime - Time in HH:MM format (UTC)
 * @param {string} date - Date string in YYYY-MM-DD format
 * @param {string} targetTimezone - Target timezone (defaults to user's timezone)
 * @returns {string} Formatted time in target timezone
 */
export const convertUTCTimeToUserTimezone = (utcTime, date, targetTimezone = null) => {
  if (!utcTime || !date) {
    console.warn('Missing time or date for timezone conversion');
    return 'Invalid Time';
  }

  try {
    const timezone = targetTimezone || getUserTimezone();

    // Create UTC datetime
    const utcDateTime = new Date(`${date}T${utcTime}:00Z`);

    // Convert to target timezone
    return utcDateTime.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: true,
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Error converting UTC time to user timezone:', error);
    return utcTime; // Fallback to original time
  }
};

/**
 * Convert local time to UTC for storage
 * @param {string} localTime - Time in HH:MM format (local)
 * @param {string} fromTimezone - Source timezone
 * @param {string} referenceDate - Reference date in YYYY-MM-DD format
 * @returns {string} UTC time in HH:MM format
 */
export const convertLocalTimeToUTC = (localTime, fromTimezone, referenceDate = null) => {
  if (!localTime || !fromTimezone) {
    console.warn('Missing time or timezone for UTC conversion');
    return localTime || '00:00';
  }

  try {
    // Use today as reference date if none provided
    const refDate = referenceDate || new Date().toISOString().split('T')[0];

    // Create datetime string in source timezone
    const localDateTime = `${refDate}T${localTime}:00`;

    // Parse as local time, then convert to UTC
    const localDate = new Date(localDateTime);

    // Get UTC offset for the source timezone
    const tempDate = new Date(localDate.toLocaleString("en-US", {timeZone: fromTimezone}));
    const tempUTC = new Date(localDate.toLocaleString("en-US", {timeZone: "UTC"}));
    const offset = tempUTC.getTime() - tempDate.getTime();

    // Apply offset to get UTC time
    const utcDate = new Date(localDate.getTime() + offset);

    // Format as HH:MM
    return utcDate.toISOString().substring(11, 16);
  } catch (error) {
    console.warn('Error converting local time to UTC:', error);
    return localTime; // Fallback to original time
  }
};

/**
 * Get timezone abbreviation for display
 * @param {string} timezone - IANA timezone string
 * @returns {string} Timezone abbreviation (e.g., 'CDT', 'PST')
 */
export const getTimezoneAbbreviation = (timezone = null) => {
  try {
    const tz = timezone || getUserTimezone();
    const date = new Date();

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short'
    });

    const parts = formatter.formatToParts(date);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName');
    return timeZoneName ? timeZoneName.value : tz;
  } catch (error) {
    console.warn('Error getting timezone abbreviation:', error);
    return timezone || 'UTC';
  }
};

/**
 * Format date for display in user's timezone
 * @param {string|Date} dateTime - DateTime to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDateInUserTimezone = (dateTime, options = {}) => {
  const userTimezone = getUserTimezone();
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: userTimezone,
    ...options
  };

  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    return date.toLocaleDateString('en-US', defaultOptions);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format full datetime for display in user's timezone
 * @param {string|Date} dateTime - DateTime to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted datetime string
 */
export const formatDateTimeInUserTimezone = (dateTime, options = {}) => {
  const userTimezone = getUserTimezone();
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: userTimezone,
    ...options
  };

  try {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    return date.toLocaleString('en-US', defaultOptions);
  } catch (error) {
    console.warn('Error formatting datetime:', error);
    return 'Invalid DateTime';
  }
};

/**
 * Get timezone offset in minutes from UTC
 * @param {string} timezone - IANA timezone string (optional, defaults to user's timezone)
 * @returns {number} Offset in minutes (negative for behind UTC)
 */
export const getTimezoneOffset = (timezone = null) => {
  const targetTimezone = timezone || getUserTimezone();

  try {
    const now = new Date();
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const local = new Date(now.toLocaleString('en-US', { timeZone: targetTimezone }));
    return Math.round((local.getTime() - utc.getTime()) / 60000);
  } catch (error) {
    console.warn('Error calculating timezone offset:', error);
    return 0;
  }
};


/**
 * Convert JavaScript weekday to Python weekday format
 * @param {number} jsWeekday - JavaScript weekday (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @returns {number} Python weekday (0=Monday, 1=Tuesday, ..., 6=Sunday)
 */
export const jsToPythonWeekday = (jsWeekday) => {
  if (typeof jsWeekday !== 'number' || jsWeekday < 0 || jsWeekday > 6) {
    console.warn('Invalid JavaScript weekday:', jsWeekday);
    return 0; // Default to Monday
  }
  return (jsWeekday - 1 + 7) % 7; // Convert JS (0=Sunday) to Python (0=Monday)
};

/**
 * Convert Python weekday to JavaScript weekday format
 * @param {number} pythonWeekday - Python weekday (0=Monday, 1=Tuesday, ..., 6=Sunday)
 * @returns {number} JavaScript weekday (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export const pythonToJsWeekday = (pythonWeekday) => {
  if (typeof pythonWeekday !== 'number' || pythonWeekday < 0 || pythonWeekday > 6) {
    console.warn('Invalid Python weekday:', pythonWeekday);
    return 1; // Default to Monday in JS format
  }
  return (pythonWeekday + 1) % 7; // Convert Python (0=Monday) to JS (0=Sunday)
};

/**
 * Get weekday names for display
 * @param {string} format - 'js' for JavaScript format (0=Sunday), 'python' for Python format (0=Monday)
 * @returns {Array<string>} Array of weekday names
 */
export const getWeekdayNames = (format = 'js') => {
  if (format === 'python') {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  }
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
};

/**
 * Get weekday name from number
 * @param {number} weekday - Weekday number
 * @param {string} format - 'js' or 'python' format
 * @returns {string} Weekday name
 */
export const getWeekdayName = (weekday, format = 'js') => {
  const names = getWeekdayNames(format);
  if (weekday >= 0 && weekday < names.length) {
    return names[weekday];
  }
  return 'Invalid';
};

/**
 * Standardize availability time display
 * @param {Object} availability - Availability object from API
 * @returns {Object} Enhanced availability with display fields
 */
export const enhanceAvailabilityDisplay = (availability) => {
  if (!availability) return availability;

  const userTimezone = getUserTimezone();
  const timezoneAbbr = getTimezoneAbbreviation(userTimezone);

  // Use display times if provided by backend, otherwise convert UTC times to user timezone
  let displayStartTime, displayEndTime;

  if (availability.display_start_time && availability.display_end_time) {
    // Use backend-provided display times
    displayStartTime = availability.display_start_time;
    displayEndTime = availability.display_end_time;
  } else {
    // Convert UTC times to user timezone for display
    const startTime = availability.startTime || availability.start_time;
    const endTime = availability.endTime || availability.end_time;
    const timeZone = availability.timeZone || availability.time_zone || availability.timezone;
    const dateContext = availability.instance_date || availability.specific_date || availability.specificDate;
    const targetTimezone = availability.userTimezone || availability.displayTimezone || userTimezone;

    if (startTime && endTime && timeZone === 'UTC' && dateContext && targetTimezone) {
      try {
        console.log('🌍 enhanceAvailabilityDisplay: Converting UTC times to user timezone:', {
          utcTimes: { start: startTime, end: endTime },
          dateContext,
          targetTimezone
        });

        displayStartTime = convertUTCTimeToUserTimezone(startTime, dateContext, targetTimezone);
        displayEndTime = convertUTCTimeToUserTimezone(endTime, dateContext, targetTimezone);

        console.log('🌍 enhanceAvailabilityDisplay: Conversion result:', {
          original: { start: startTime, end: endTime },
          converted: { start: displayStartTime, end: displayEndTime }
        });
      } catch (error) {
        console.warn('🌍 enhanceAvailabilityDisplay: Error converting UTC to user timezone:', error);
        // Fallback to original times
        displayStartTime = startTime;
        displayEndTime = endTime;
      }
    } else {
      // For non-UTC times or missing context, use original times
      displayStartTime = startTime;
      displayEndTime = endTime;
    }
  }

  // Get standardized day of week
  let dayOfWeek = availability.day_of_week_js || availability.dayOfWeek;
  if (dayOfWeek === undefined && availability.day_of_week !== undefined) {
    // Convert Python format to JavaScript format if needed
    dayOfWeek = pythonToJsWeekday(availability.day_of_week);
  }

  return {
    ...availability,
    // Enhanced display fields
    displayStartTime,
    displayEndTime,
    displayTimezone: userTimezone,
    displayTimezoneAbbr: timezoneAbbr,
    displayTimeRange: displayStartTime && displayEndTime
      ? `${displayStartTime} - ${displayEndTime} ${timezoneAbbr}`
      : null,

    // Standardized day of week
    dayOfWeek, // JavaScript format for frontend use
    dayOfWeekName: dayOfWeek !== undefined ? getWeekdayName(dayOfWeek, 'js') : null,

    // Keep original data for reference
    originalStartTime: availability.startTime || availability.start_time,
    originalEndTime: availability.endTime || availability.end_time,
    originalTimezone: availability.time_zone || availability.timezone
  };
};

/**
 * Create timezone-aware API request configuration
 * @param {Object} requestConfig - Base request configuration
 * @returns {Object} Enhanced request configuration with timezone headers
 */
export const createTimezoneAwareRequest = (requestConfig = {}) => {
  const timezoneHeaders = getTimezoneHeaders();

  return {
    ...requestConfig,
    headers: {
      ...requestConfig.headers,
      ...timezoneHeaders
    }
  };
};

/**
 * Debug helper to log timezone information
 */
export const debugTimezoneInfo = () => {
  console.group('🌍 Timezone Manager Debug Info');
  console.log('User Timezone:', getUserTimezone());
  console.log('Browser Locale:', navigator.language);
  console.log('Timezone Offset:', getTimezoneOffset(), 'minutes');
  console.log('Timezone Abbreviation:', getTimezoneAbbreviation());
  console.log('Headers:', getTimezoneHeaders());
  console.groupEnd();
};

/**
 * Initialize timezone manager (call this in app initialization)
 */
export const initializeTimezoneManager = () => {
  // Ensure user timezone is set
  const currentTimezone = getUserTimezone();
  console.log(`🌍 Timezone Manager initialized with timezone: ${currentTimezone}`);

  // Optional: Listen for timezone changes (advanced feature)
  // This would require additional browser APIs and user interaction
};

export default {
  getUserTimezone,
  setUserTimezone,
  isValidTimezone,
  getTimezoneHeaders,
  formatTimeInUserTimezone,
  formatDateInUserTimezone,
  formatDateTimeInUserTimezone,
  getTimezoneOffset,
  getTimezoneAbbreviation,
  jsToPythonWeekday,
  pythonToJsWeekday,
  getWeekdayNames,
  getWeekdayName,
  enhanceAvailabilityDisplay,
  createTimezoneAwareRequest,
  debugTimezoneInfo,
  initializeTimezoneManager
};