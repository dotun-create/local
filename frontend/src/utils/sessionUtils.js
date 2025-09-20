/**
 * Utility functions for handling session data transformations
 */

/**
 * Transform session data from API format to component format
 * @param {Object} session - Session data from API
 * @returns {Object|null} - Transformed session data or null if invalid
 */
export const transformSessionData = (session) => {
  if (!session || !session.scheduledDate) {
    return null;
  }

  try {
    let sessionDate;
    
    // Handle timezone-aware date parsing
    // The backend now sends proper ISO strings with timezone info
    if (session.scheduledDate.includes('T')) {
      // Proper ISO format - let Date constructor handle timezone parsing
      sessionDate = new Date(session.scheduledDate);
    } else {
      // Fallback for malformed dates
      sessionDate = new Date(session.scheduledDate);
    }
    
    // Additional validation for timezone-aware handling
    if (isNaN(sessionDate.getTime()) && session.timezone) {
      // Last resort: try manual timezone handling
      const dateStr = session.scheduledDate.includes('T') 
        ? session.scheduledDate 
        : session.scheduledDate + 'T00:00:00';
      sessionDate = new Date(dateStr);
    }
    
    // Check if date is valid
    if (isNaN(sessionDate.getTime())) {
      // console.warn('Invalid session date:', session.scheduledDate);
      return null;
    }

    // Format date as "Jan 20, 2024" - use session timezone if available
    const dateOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };
    if (session.timezone) {
      dateOptions.timeZone = session.timezone;
    }
    const formattedDate = sessionDate.toLocaleDateString('en-US', dateOptions);

    // Format time as "10:00 AM" - use session timezone if available
    const timeOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    if (session.timezone) {
      timeOptions.timeZone = session.timezone;
    }
    const formattedTime = sessionDate.toLocaleTimeString('en-US', timeOptions);

    return {
      id: session.id,
      title: session.title || 'Upcoming Session',
      date: formattedDate,
      time: formattedTime,
      duration: session.duration ? `${session.duration} minutes` : '60 minutes',
      instructor: session.tutor?.name || session.tutorName || 'Instructor',
      sessionLink: session.meetingLink || '#/session/join',
      paymentStatus: session.paymentStatus || 'paid', // Assume paid for existing sessions
      paymentLink: '#/payment/session/' + session.id,
      instructorVerified: session.tutor?.isVerified,
      // Keep original data for reference
      originalScheduledDate: session.scheduledDate,
      timezone: session.timezone
    };
  } catch (error) {
    // console.error('Error transforming session data:', error);
    return null;
  }
};

/**
 * Transform multiple sessions and sort by date
 * @param {Array} sessions - Array of session data from API
 * @returns {Array} - Array of transformed session data
 */
export const transformAndSortSessions = (sessions) => {
  if (!Array.isArray(sessions)) {
    return [];
  }

  return sessions
    .filter(session => session && session.scheduledDate) // Filter out sessions without dates
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)) // Sort by original scheduledDate
    .map(transformSessionData)
    .filter(session => session !== null); // Remove any failed transformations
};

/**
 * Get the next upcoming session from a list of sessions
 * @param {Array} sessions - Array of session data from API
 * @returns {Object|null} - Next upcoming session or null
 */
export const getNextUpcomingSession = (sessions) => {
  const transformedSessions = transformAndSortSessions(sessions);
  
  // Filter to only future sessions
  const now = new Date();
  const futureSessions = transformedSessions.filter(session => {
    return new Date(session.originalScheduledDate) > now;
  });

  return futureSessions.length > 0 ? futureSessions[0] : null;
};

/**
 * Format a date string for display
 * @param {string} dateString - ISO date string
 * @param {Object} options - Intl.DateTimeFormat options
 * @param {string} timezone - Optional timezone for formatting
 * @returns {string} - Formatted date string
 */
export const formatSessionDate = (dateString, options = {}, timezone = null) => {
  if (!dateString) return 'Date TBD';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    const defaultOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...options
    };

    if (timezone) {
      defaultOptions.timeZone = timezone;
    }

    return date.toLocaleDateString('en-US', defaultOptions);
  } catch (error) {
    // console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format a time string for display
 * @param {string} dateString - ISO date string
 * @param {Object} options - Intl.DateTimeFormat options
 * @param {string} timezone - Optional timezone for formatting
 * @returns {string} - Formatted time string
 */
export const formatSessionTime = (dateString, options = {}, timezone = null) => {
  if (!dateString) return 'Time TBD';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Time';
    }

    const defaultOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...options
    };

    if (timezone) {
      defaultOptions.timeZone = timezone;
    }

    return date.toLocaleTimeString('en-US', defaultOptions);
  } catch (error) {
    // console.error('Error formatting time:', error);
    return 'Invalid Time';
  }
};