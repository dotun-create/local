/**
 * Formatting Utilities
 * Functions for formatting dates, numbers, currency, etc.
 */

// Date Formatters
export const formatDate = (date, options = {}) => {
  if (!date) return '';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };

  try {
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(new Date(date));
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(date);
  }
};

export const formatTime = (date, options = {}) => {
  if (!date) return '';

  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  try {
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(new Date(date));
  } catch (error) {
    console.error('Error formatting time:', error);
    return String(date);
  }
};

export const formatDateTime = (date, options = {}) => {
  if (!date) return '';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  try {
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(new Date(date));
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return String(date);
  }
};

export const formatRelativeTime = (date) => {
  if (!date) return '';

  try {
    const now = new Date();
    const target = new Date(date);
    const diffInSeconds = Math.floor((now - target) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return formatDate(date);
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return String(date);
  }
};

// Number Formatters
export const formatNumber = (number, options = {}) => {
  if (number === null || number === undefined || isNaN(number)) return '';

  const defaultOptions = {
    maximumFractionDigits: 2,
    ...options
  };

  try {
    return new Intl.NumberFormat('en-US', defaultOptions).format(number);
  } catch (error) {
    console.error('Error formatting number:', error);
    return String(number);
  }
};

export const formatPercentage = (number, options = {}) => {
  if (number === null || number === undefined || isNaN(number)) return '';

  const defaultOptions = {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options
  };

  try {
    return new Intl.NumberFormat('en-US', defaultOptions).format(number / 100);
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return String(number);
  }
};

// Currency Formatters
export const formatCurrency = (amount, currency = 'USD', options = {}) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '';

  const defaultOptions = {
    style: 'currency',
    currency,
    ...options
  };

  try {
    return new Intl.NumberFormat('en-US', defaultOptions).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return String(amount);
  }
};

export const formatPrice = (amount, currency = 'USD') => {
  return formatCurrency(amount, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// File Size Formatter
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  if (!bytes || bytes < 0) return '';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Duration Formatter
export const formatDuration = (milliseconds) => {
  if (!milliseconds || milliseconds < 0) return '';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

// Phone Number Formatter
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Format US phone numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return original if not a standard format
  return phoneNumber;
};

// Text Formatters
export const formatInitials = (name) => {
  if (!name) return '';

  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

export const formatName = (firstName, lastName) => {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.join(' ');
};

export const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + suffix;
};

// Address Formatter
export const formatAddress = (address) => {
  if (!address) return '';

  const { street, city, state, zipCode, country } = address;
  const parts = [street, city, state, zipCode, country].filter(Boolean);
  return parts.join(', ');
};

// Credit Card Formatter
export const formatCreditCard = (cardNumber) => {
  if (!cardNumber) return '';

  const cleaned = cardNumber.replace(/\D/g, '');
  const groups = cleaned.match(/.{1,4}/g) || [];
  return groups.join(' ').slice(0, 19); // Limit to 16 digits + 3 spaces
};

export const maskCreditCard = (cardNumber) => {
  if (!cardNumber) return '';

  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 4) return cardNumber;

  const lastFour = cleaned.slice(-4);
  const masked = '*'.repeat(cleaned.length - 4);
  return (masked + lastFour).replace(/.{4}/g, '$& ').trim();
};

// Social Security Number Formatter
export const formatSSN = (ssn) => {
  if (!ssn) return '';

  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  }
  return ssn;
};

export const maskSSN = (ssn) => {
  if (!ssn) return '';

  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `***-**-${cleaned.slice(5)}`;
  }
  return ssn;
};