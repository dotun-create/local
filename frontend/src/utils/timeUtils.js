/**
 * Time formatting utilities for Troupe Academy
 * Handles country-based time formatting and timezone consistency
 */

/**
 * Get time format preference based on country
 * @param {string} country - Country code or name
 * @returns {string} - '24h' for 24-hour format, '12h' for 12-hour format
 */
export const getTimeFormatPreference = (country) => {
  if (!country) return '12h'; // Default to 12-hour
  
  const country24h = [
    'UK', 'United Kingdom', 'England', 'Scotland', 'Wales', 'Northern Ireland',
    'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium',
    'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland',
    'Russia', 'Poland', 'Czech Republic', 'Hungary', 'Romania', 'Bulgaria',
    'Greece', 'Portugal', 'Croatia', 'Slovenia', 'Slovakia', 'Latvia',
    'Lithuania', 'Estonia', 'Ukraine', 'Belarus', 'Moldova', 'Serbia',
    'Bosnia', 'Montenegro', 'Albania', 'Macedonia', 'Kosovo', 'Turkey',
    'Israel', 'Jordan', 'Lebanon', 'Syria', 'Iraq', 'Iran', 'Afghanistan',
    'Pakistan', 'India', 'Bangladesh', 'Sri Lanka', 'Myanmar', 'Thailand',
    'Vietnam', 'Cambodia', 'Laos', 'Malaysia', 'Singapore', 'Indonesia',
    'Philippines', 'Japan', 'South Korea', 'North Korea', 'Mongolia',
    'China', 'Taiwan', 'Hong Kong', 'Macau', 'Tibet', 'Nepal', 'Bhutan',
    'Maldives', 'Brunei', 'East Timor'
  ];
  
  // Countries that explicitly use 12-hour format
  const country12h = [
    'US', 'USA', 'United States', 'United States of America', 'America',
    'Canada', 'Canadian',
    'Nigeria', 'Nigerian',
    'Philippines', 'Australian', 'New Zealand'
  ];
  
  const countryLower = country.toLowerCase();
  
  // Check 12-hour countries first (more specific)
  const uses12h = country12h.some(c12 => {
    const c12Lower = c12.toLowerCase();
    return c12Lower === countryLower || 
           countryLower.includes(c12Lower) || 
           c12Lower.includes(countryLower);
  });
  
  if (uses12h) return '12h';
  
  // Check 24-hour countries
  const uses24h = country24h.some(c24 => {
    const c24Lower = c24.toLowerCase();
    return c24Lower === countryLower || 
           countryLower.includes(c24Lower) || 
           c24Lower.includes(countryLower);
  });
  
  return uses24h ? '24h' : '12h'; // Default to 12h if not found
};

/**
 * Format time based on country preference
 * @param {string} timeString - Time in HH:MM format (24-hour)
 * @param {string} country - Country code or name
 * @returns {string} - Formatted time string
 */
export const formatTimeByCountry = (timeString, country) => {
  if (!timeString || !timeString.includes(':')) return timeString;
  
  const [hours, minutes] = timeString.split(':');
  const hour24 = parseInt(hours);
  const minute = minutes;
  
  const format = getTimeFormatPreference(country);
  
  if (format === '24h') {
    // 24-hour format: 14:00
    return `${hours.padStart(2, '0')}:${minute}`;
  } else {
    // 12-hour format: 2:00 PM
    const hour12 = hour24 === 0 ? 12 : (hour24 > 12 ? hour24 - 12 : hour24);
    const ampm = hour24 < 12 ? 'AM' : 'PM';
    return `${hour12}:${minute} ${ampm}`;
  }
};

/**
 * Format date and time together based on country preference
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timeString - Time in HH:MM format
 * @param {string} country - Country code or name
 * @returns {string} - Formatted date and time string
 */
export const formatDateTimeByCountry = (dateString, timeString, country) => {
  if (!dateString || !timeString) return '';
  
  const date = new Date(dateString);
  const formattedDate = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short', 
    day: 'numeric'
  });
  
  const formattedTime = formatTimeByCountry(timeString, country);
  return `${formattedDate} ${formattedTime}`;
};

/**
 * Convert 24-hour time to 12-hour time
 * @param {string} time24 - Time in HH:MM format (24-hour)
 * @returns {string} - Time in 12-hour format with AM/PM
 */
export const convertTo12Hour = (time24) => {
  if (!time24 || !time24.includes(':')) return time24;
  
  const [hours, minutes] = time24.split(':');
  const hour24 = parseInt(hours);
  const hour12 = hour24 === 0 ? 12 : (hour24 > 12 ? hour24 - 12 : hour24);
  const ampm = hour24 < 12 ? 'AM' : 'PM';
  
  return `${hour12}:${minutes} ${ampm}`;
};

/**
 * Convert 12-hour time to 24-hour time
 * @param {string} time12 - Time in H:MM AM/PM format
 * @returns {string} - Time in HH:MM format (24-hour)
 */
export const convertTo24Hour = (time12) => {
  if (!time12 || !time12.includes(':')) return time12;
  
  const [timePart, ampm] = time12.split(' ');
  const [hours, minutes] = timePart.split(':');
  let hour24 = parseInt(hours);
  
  if (ampm && ampm.toUpperCase() === 'PM' && hour24 !== 12) {
    hour24 += 12;
  } else if (ampm && ampm.toUpperCase() === 'AM' && hour24 === 12) {
    hour24 = 0;
  }
  
  return `${hour24.toString().padStart(2, '0')}:${minutes}`;
};

/**
 * Generate time options for dropdowns based on country
 * @param {string} country - Country code or name
 * @param {number} startHour - Start hour (24-hour format, default 6)
 * @param {number} endHour - End hour (24-hour format, default 21)
 * @returns {Array} - Array of {value, label} time options
 */
export const generateTimeOptions = (country, startHour = 6, endHour = 21) => {
  const options = [];
  const format = getTimeFormatPreference(country);
  
  for (let hour = startHour; hour <= endHour; hour++) {
    const value = `${hour.toString().padStart(2, '0')}:00`;
    const label = formatTimeByCountry(value, country);
    options.push({ value, label });
  }
  
  return options;
};

/**
 * Parse form date and time inputs consistently (timezone-naive approach)
 * @param {string} dateString - Date input value (YYYY-MM-DD)
 * @param {string} timeString - Time input value (HH:MM)
 * @param {string} timezone - Target timezone (default 'UTC')
 * @returns {Date} - JavaScript Date object
 */
export const parseFormDateTime = (dateString, timeString, timezone = 'UTC') => {
  if (!dateString || !timeString) return null;
  
  // Create date object in local timezone first
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Create date in specified timezone (avoid timezone conversion issues)
  const date = new Date();
  date.setFullYear(year);
  date.setMonth(month - 1); // month is 0-indexed
  date.setDate(day);
  date.setHours(hours);
  date.setMinutes(minutes);
  date.setSeconds(0);
  date.setMilliseconds(0);
  
  return date;
};

/**
 * Parse form date/time in user's local timezone (avoiding UTC conversion)
 * @param {string} dateString - YYYY-MM-DD
 * @param {string} timeString - HH:MM  
 * @param {string} userTimezone - User's timezone (optional, uses browser default)
 * @returns {Date} - Date object in local timezone without UTC conversion
 */
export const parseFormDateTimeInTimezone = (dateString, timeString, userTimezone = null) => {
  if (!dateString || !timeString) return null;
  
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Create date object directly in local timezone WITHOUT any conversion
  // This prevents the date from shifting due to timezone boundaries
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  
  return date;
};

/**
 * Format date consistently for both schedule and preview sections
 * @param {Date|string} date - Date object or date string
 * @param {string} userTimezone - Display timezone (optional)
 * @param {boolean} includeYear - Whether to include year
 * @returns {string} - Formatted date string
 */
export const formatDateConsistent = (date, userTimezone = null, includeYear = false) => {
  if (!date) return '';
  
  let dateObj;
  if (typeof date === 'string') {
    // If it's a string, parse it as YYYY-MM-DD without timezone conversion
    const [year, month, day] = date.split('-').map(Number);
    dateObj = new Date(year, month - 1, day);
  } else {
    // If it's a Date object, create a new timezone-safe date to avoid conversion issues
    // Extract components and reconstruct to prevent timezone shifting
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    dateObj = new Date(year, month, day);
  }
  
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  };
  
  if (includeYear) {
    options.year = 'numeric';
  }
  
  return dateObj.toLocaleDateString('en-GB', options);
};

/**
 * Get user's effective timezone
 * @param {Object} user - User object
 * @param {Object} course - Course object (optional)
 * @returns {string} - Timezone identifier
 */
export const getEffectiveTimezone = (user, course = null) => {
  // Priority: 1. User profile timezone
  //          2. Course timezone  
  //          3. Browser timezone
  //          4. Default UTC
  
  if (user?.profile?.timezone) {
    return user.profile.timezone;
  }
  
  if (course?.timezone) {
    return course.timezone;
  }
  
  // Get browser timezone
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    return 'UTC'; // Fallback
  }
};

/**
 * Helper function to calculate day of week from date components
 * Using Zeller's congruence to avoid Date object creation
 * @param {number} year 
 * @param {number} month 
 * @param {number} day 
 * @returns {number} - Day of week (0=Sunday, 1=Monday, etc.)
 */
export const calculateDayOfWeek = (year, month, day) => {
  // Zeller's congruence algorithm for Gregorian calendar
  let m = month;
  let y = year;
  
  if (m < 3) {
    m += 12;
    y -= 1;
  }
  
  const k = y % 100;
  const j = Math.floor(y / 100);
  
  const h = (day + Math.floor((13 * (m + 1)) / 5) + k + 
            Math.floor(k / 4) + Math.floor(j / 4) - 2 * j) % 7;
  
  // Convert to JavaScript format (0=Sunday)
  return ((h + 6) % 7);
};

/**
 * Helper to check if one date is before another using components
 * @param {number} year1 
 * @param {number} month1 
 * @param {number} day1 
 * @param {number} year2 
 * @param {number} month2 
 * @param {number} day2 
 * @returns {boolean}
 */
const isDateBefore = (year1, month1, day1, year2, month2, day2) => {
  if (year1 < year2) return true;
  if (year1 > year2) return false;
  if (month1 < month2) return true;
  if (month1 > month2) return false;
  return day1 <= day2;
};

/**
 * Helper to increment date components
 * @param {number} year 
 * @param {number} month 
 * @param {number} day 
 * @returns {Array} - [year, month, day]
 */
const incrementDateComponents = (year, month, day) => {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Check for leap year
  if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0))) {
    daysInMonth[1] = 29;
  }
  
  day++;
  
  if (day > daysInMonth[month - 1]) {
    day = 1;
    month++;
    
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  
  return [year, month, day];
};

/**
 * Generate date range for recurring preview (string-based, no Date objects)
 * @param {string} startDateString - YYYY-MM-DD
 * @param {string} endDateString - YYYY-MM-DD
 * @param {Array} recurrenceDays - Days of week array (JS format: 0=Sunday)
 * @param {string} userTimezone - Processing timezone (for future use)
 * @returns {Array} - Array of date strings in YYYY-MM-DD format
 */
export const generateRecurringDates = (startDateString, endDateString, recurrenceDays, userTimezone) => {
  if (!startDateString || !endDateString || !recurrenceDays?.length) return [];
  
  const dateStrings = [];
  
  // Parse start and end dates as components
  let [currentYear, currentMonth, currentDay] = startDateString.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDateString.split('-').map(Number);
  
  while (isDateBefore(currentYear, currentMonth, currentDay, endYear, endMonth, endDay)) {
    const dayOfWeek = calculateDayOfWeek(currentYear, currentMonth, currentDay);
    
    if (recurrenceDays.includes(dayOfWeek)) {
      // Create date string without Date object
      const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
      dateStrings.push(dateString);
    }
    
    // Move to next day using component arithmetic
    [currentYear, currentMonth, currentDay] = incrementDateComponents(currentYear, currentMonth, currentDay);
  }
  
  return dateStrings.slice(0, 10); // Limit to first 10 occurrences
};

/**
 * Convert date to YYYY-MM-DD string format without timezone issues
 * @param {Date} date - Date object
 * @returns {string} - Date string in YYYY-MM-DD format
 */
export const formatDateToString = (date) => {
  if (!date) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Validate that dates are consistent between sections
 * @param {string} inputDate - Original input date
 * @param {Date} processedDate - Processed date object
 * @returns {boolean} - Whether dates are consistent
 */
export const validateDateConsistency = (inputDate, processedDate) => {
  if (!inputDate || !processedDate) return false;
  
  const processedDateString = formatDateToString(processedDate);
  return inputDate === processedDateString;
};

/**
 * Convert date to display timezone consistently
 * @param {Date|string} dateInput - Date object or ISO string
 * @param {string} targetTimezone - Target timezone (default 'UTC')
 * @returns {Date} - Date object in target timezone
 */
export const convertToDisplayTimezone = (dateInput, targetTimezone = 'UTC') => {
  if (!dateInput) return null;
  
  let date;
  if (typeof dateInput === 'string') {
    date = new Date(dateInput);
  } else {
    date = new Date(dateInput);
  }
  
  // For now, return the date as-is since we're dealing with timezone-aware storage
  // This can be enhanced with proper timezone conversion libraries like date-fns-tz
  return date;
};

/**
 * Format date for display in modal preview
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {boolean} includeYear - Whether to include year in format
 * @returns {string} - Formatted date string
 */
export const formatPreviewDate = (dateString, includeYear = false) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  };
  
  if (includeYear) {
    options.year = 'numeric';
  }
  
  return date.toLocaleDateString('en-GB', options);
};

/**
 * Get day name from date string (timezone-safe)
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} - Day name in lowercase (monday, tuesday, etc.)
 */
export const getDayNameFromDate = (dateString) => {
  if (!dateString) return '';
  
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // Timezone-safe parsing
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayNames[date.getDay()];
};

/**
 * Get day of week from date string without creating Date object
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {number} - Day of week (0=Sunday, 1=Monday, etc.)
 */
export const getDayOfWeekFromString = (dateString) => {
  if (!dateString) return 0;
  
  const [year, month, day] = dateString.split('-').map(Number);
  return calculateDayOfWeek(year, month, day);
};

/**
 * Format date for preview display without timezone conversion
 * Ensures the same calendar day is shown regardless of timezone
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} - Formatted date string
 */
export const formatDateForPreview = (dateString) => {
  if (!dateString) return '';
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Use string formatting to avoid any Date object timezone issues
  // Calculate day of week directly from date components
  const dayOfWeek = calculateDayOfWeek(year, month, day);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Format directly without Date objects to prevent timezone conversion
  const dayName = dayNames[dayOfWeek];
  const monthName = monthNames[month - 1];
  
  return `${dayName}, ${monthName} ${day}`;
};

/**
 * Format slot display for user's timezone
 * Handles both original timezone times and converted times
 * @param {Object} slot - Availability slot object
 * @param {string} userTimezone - User's current timezone
 * @returns {Object} - Formatted slot display data
 */
export const formatSlotForDisplay = (slot, userTimezone) => {
  if (!slot) return null;
  
  try {
    const slotTimezone = slot.timeZone || slot.time_zone || 'UTC';
    const startTime = slot.startTime || slot.start_time;
    const endTime = slot.endTime || slot.end_time;
    
    if (slotTimezone === userTimezone) {
      // Same timezone - show original times
      return {
        timeRange: `${startTime} - ${endTime}`,
        timezone: slotTimezone,
        isConverted: false
      };
    } else {
      // Different timezone - convert times
      const convertedTimes = convertTimesToTimezone(slot, userTimezone);
      return {
        timeRange: `${convertedTimes.startTime} - ${convertedTimes.endTime}`,
        timezone: userTimezone,
        isConverted: true,
        originalTimezone: slotTimezone,
        originalTimeRange: `${startTime} - ${endTime}`
      };
    }
  } catch (error) {
    console.warn('Error formatting slot for display:', error);
    // Fallback to original times
    return {
      timeRange: `${slot.startTime || slot.start_time} - ${slot.endTime || slot.end_time}`,
      timezone: slot.timeZone || slot.time_zone || 'UTC',
      isConverted: false
    };
  }
};

/**
 * Convert slot times to target timezone
 * @param {Object} slot - Availability slot object
 * @param {string} targetTimezone - Target timezone
 * @returns {Object} - Converted times
 */
export const convertTimesToTimezone = (slot, targetTimezone) => {
  try {
    const sourceTimezone = slot.timeZone || slot.time_zone || 'UTC';
    const startTime = slot.startTime || slot.start_time;
    const endTime = slot.endTime || slot.end_time;
    const slotDate = slot.specificDate || slot.specific_date;
    
    if (!startTime || !endTime) {
      throw new Error('Missing start or end time');
    }
    
    // Create date objects in source timezone
    const baseDate = slotDate ? new Date(slotDate) : new Date();
    const sourceStart = new Date(`${baseDate.toISOString().split('T')[0]}T${startTime}:00`);
    const sourceEnd = new Date(`${baseDate.toISOString().split('T')[0]}T${endTime}:00`);
    
    // Convert using Intl.DateTimeFormat
    const convertedStart = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: targetTimezone
    }).format(sourceStart);
    
    const convertedEnd = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit', 
      hour12: false,
      timeZone: targetTimezone
    }).format(sourceEnd);
    
    return {
      startTime: convertedStart,
      endTime: convertedEnd,
      sourceTimezone,
      targetTimezone
    };
  } catch (error) {
    console.warn('Error converting times to timezone:', error);
    // Fallback to original times
    return {
      startTime: slot.startTime || slot.start_time,
      endTime: slot.endTime || slot.end_time,
      sourceTimezone: slot.timeZone || slot.time_zone || 'UTC',
      targetTimezone: targetTimezone
    };
  }
};

/**
 * Validate if a timezone string is valid
 * @param {string} timezone - Timezone to validate
 * @returns {boolean} - Whether timezone is valid
 */
export const validateTimezone = (timezone) => {
  if (!timezone) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Detect user's local timezone
 * @returns {string} - User's local timezone (IANA format)
 */
export const detectLocalTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Could not detect local timezone:', error);
    return 'UTC'; // Fallback
  }
};

/**
 * Get saved timezone from localStorage or detect local timezone
 * @returns {string} - User's timezone preference or local timezone
 */
export const getUserTimezone = () => {
  try {
    // First check localStorage
    const savedTimezone = localStorage.getItem('userTimezone');
    console.log('🔍 localStorage userTimezone:', savedTimezone);
    
    if (savedTimezone && validateTimezone(savedTimezone)) {
      console.log('🌍 Using saved timezone:', savedTimezone);
      return savedTimezone;
    }
    
    // Fallback to local timezone detection
    const localTimezone = detectLocalTimezone();
    console.log('🌍 Auto-detected local timezone:', localTimezone);
    
    // Save detected timezone for future use
    localStorage.setItem('userTimezone', localTimezone);
    console.log('💾 Saved to localStorage:', localTimezone);
    return localTimezone;
  } catch (error) {
    console.warn('Error getting user timezone:', error);
    return 'UTC';
  }
};

/**
 * Save timezone preference to localStorage
 * @param {string} timezone - Timezone to save
 * @returns {boolean} - Whether save was successful
 */
export const saveUserTimezone = (timezone) => {
  try {
    if (!validateTimezone(timezone)) {
      console.warn('Invalid timezone, not saving:', timezone);
      return false;
    }
    
    localStorage.setItem('userTimezone', timezone);
    console.log('🌍 Saved timezone preference:', timezone);
    return true;
  } catch (error) {
    console.warn('Error saving timezone:', error);
    return false;
  }
};

/**
 * Get timezone display name for UI
 * @param {string} timezone - Timezone identifier
 * @returns {string} - Human-readable timezone name
 */
export const getTimezoneDisplayName = (timezone) => {
  if (!timezone) return 'Unknown';
  
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long'
    });
    
    const parts = formatter.formatToParts(now);
    const timeZoneName = parts.find(part => part.type === 'timeZoneName');
    return timeZoneName ? timeZoneName.value : timezone;
  } catch (error) {
    return timezone;
  }
};

/**
 * Validate time format consistency
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {Object} - {isValid: boolean, error: string}
 */
export const validateTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) {
    return { isValid: false, error: 'Both start and end times are required' };
  }
  
  const start = convertTo24Hour(startTime);
  const end = convertTo24Hour(endTime);
  
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  
  if (startMinutes >= endMinutes) {
    return { isValid: false, error: 'End time must be after start time' };
  }
  
  const durationMinutes = endMinutes - startMinutes;
  if (durationMinutes < 60) {
    return { isValid: false, error: 'Minimum session duration is 1 hour' };
  }
  
  return { isValid: true, error: '' };
};

/**
 * Convert time string to minutes for comparison
 * @param {string} timeString - Time in HH:MM format
 * @returns {number} - Time in minutes from midnight
 */
export const timeToMinutes = (timeString) => {
  if (!timeString || !timeString.includes(':')) return 0;
  
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Get course country from course object
 * @param {Object} course - Course object
 * @returns {string} - Country string or default
 */
export const getCourseCountry = (course) => {
  if (!course) return 'UK'; // Default
  return course.country || course.academicCountry || 'UK';
};

/**
 * Get user country from user object
 * @param {Object} user - User object
 * @returns {string} - Country string or default
 */
export const getUserCountry = (user) => {
  if (!user) return 'UK'; // Default
  return user.country || user.profile?.country || user.academicCountry || 'UK';
};