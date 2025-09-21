/**
 * Validation Utilities
 * Functions for validating user input and data
 */

import { VALIDATION_RULES } from '../constants';

// Email Validation
export const validateEmail = (email) => {
  if (!email) return false;

  if (email.length > VALIDATION_RULES.EMAIL.MAX_LENGTH) return false;

  return VALIDATION_RULES.EMAIL.PATTERN.test(email);
};

export const getEmailError = (email) => {
  if (!email) return 'Email is required';
  if (!validateEmail(email)) return 'Please enter a valid email address';
  return null;
};

// Password Validation
export const validatePassword = (password) => {
  if (!password) return false;

  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) return false;
  if (password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) return false;

  return VALIDATION_RULES.PASSWORD.PATTERN.test(password);
};

export const getPasswordError = (password) => {
  if (!password) return 'Password is required';
  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    return `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`;
  }
  if (password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
    return `Password must be no more than ${VALIDATION_RULES.PASSWORD.MAX_LENGTH} characters`;
  }
  if (!VALIDATION_RULES.PASSWORD.PATTERN.test(password)) {
    return VALIDATION_RULES.PASSWORD.DESCRIPTION;
  }
  return null;
};

export const validatePasswordMatch = (password, confirmPassword) => {
  return password === confirmPassword;
};

export const getPasswordMatchError = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (!validatePasswordMatch(password, confirmPassword)) return 'Passwords do not match';
  return null;
};

// Phone Validation
export const validatePhone = (phone) => {
  if (!phone) return false;

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < VALIDATION_RULES.PHONE.MIN_LENGTH) return false;
  if (cleaned.length > VALIDATION_RULES.PHONE.MAX_LENGTH) return false;

  return VALIDATION_RULES.PHONE.PATTERN.test(phone);
};

export const getPhoneError = (phone) => {
  if (!phone) return 'Phone number is required';
  if (!validatePhone(phone)) return 'Please enter a valid phone number';
  return null;
};

// Name Validation
export const validateName = (name, minLength = 2, maxLength = 50) => {
  if (!name) return false;

  const trimmed = name.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
};

export const getNameError = (name, fieldName = 'Name', minLength = 2, maxLength = 50) => {
  if (!name) return `${fieldName} is required`;
  if (!validateName(name, minLength, maxLength)) {
    return `${fieldName} must be between ${minLength} and ${maxLength} characters`;
  }
  return null;
};

// Required Field Validation
export const validateRequired = (value) => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !isNaN(value);
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
};

export const getRequiredError = (value, fieldName = 'Field') => {
  if (!validateRequired(value)) return `${fieldName} is required`;
  return null;
};

// URL Validation
export const validateURL = (url) => {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const getURLError = (url) => {
  if (!url) return 'URL is required';
  if (!validateURL(url)) return 'Please enter a valid URL';
  return null;
};

// File Validation
export const validateFile = (file, rules = VALIDATION_RULES.FILE.IMAGE) => {
  if (!file) return { isValid: false, error: 'No file selected' };

  // Check file size
  if (file.size > rules.MAX_SIZE) {
    return {
      isValid: false,
      error: `File size must be less than ${formatFileSize(rules.MAX_SIZE)}`
    };
  }

  // Check file type
  if (!rules.ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${rules.ALLOWED_TYPES.join(', ')}`
    };
  }

  return { isValid: true, error: null };
};

// Helper function for file size formatting
const formatFileSize = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// Date Validation
export const validateDate = (date) => {
  if (!date) return false;

  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
};

export const validateDateRange = (startDate, endDate) => {
  if (!validateDate(startDate) || !validateDate(endDate)) return false;

  return new Date(startDate) <= new Date(endDate);
};

export const getDateError = (date, fieldName = 'Date') => {
  if (!date) return `${fieldName} is required`;
  if (!validateDate(date)) return `Please enter a valid ${fieldName.toLowerCase()}`;
  return null;
};

export const getDateRangeError = (startDate, endDate) => {
  if (!startDate) return 'Start date is required';
  if (!endDate) return 'End date is required';
  if (!validateDate(startDate)) return 'Please enter a valid start date';
  if (!validateDate(endDate)) return 'Please enter a valid end date';
  if (!validateDateRange(startDate, endDate)) return 'End date must be after start date';
  return null;
};

// Number Validation
export const validateNumber = (value, min, max) => {
  const num = Number(value);
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
};

export const getNumberError = (value, fieldName = 'Number', min, max) => {
  if (value === '' || value === null || value === undefined) return `${fieldName} is required`;

  const num = Number(value);
  if (isNaN(num)) return `${fieldName} must be a valid number`;

  if (min !== undefined && num < min) return `${fieldName} must be at least ${min}`;
  if (max !== undefined && num > max) return `${fieldName} must be no more than ${max}`;

  return null;
};

// Text Length Validation
export const validateTextLength = (text, minLength = 0, maxLength = Infinity) => {
  if (!text && minLength > 0) return false;

  const length = text ? text.trim().length : 0;
  return length >= minLength && length <= maxLength;
};

export const getTextLengthError = (text, fieldName = 'Text', minLength = 0, maxLength = Infinity) => {
  const length = text ? text.trim().length : 0;

  if (minLength > 0 && length === 0) return `${fieldName} is required`;
  if (length < minLength) return `${fieldName} must be at least ${minLength} characters`;
  if (length > maxLength) return `${fieldName} must be no more than ${maxLength} characters`;

  return null;
};

// Credit Card Validation (basic Luhn algorithm)
export const validateCreditCard = (cardNumber) => {
  if (!cardNumber) return false;

  const cleaned = cardNumber.replace(/\D/g, '');

  if (cleaned.length < 13 || cleaned.length > 19) return false;

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

export const getCreditCardError = (cardNumber) => {
  if (!cardNumber) return 'Card number is required';
  if (!validateCreditCard(cardNumber)) return 'Please enter a valid card number';
  return null;
};

// CVV Validation
export const validateCVV = (cvv, cardType = 'visa') => {
  if (!cvv) return false;

  const cleaned = cvv.replace(/\D/g, '');
  const expectedLength = cardType === 'amex' ? 4 : 3;

  return cleaned.length === expectedLength;
};

export const getCVVError = (cvv, cardType = 'visa') => {
  if (!cvv) return 'CVV is required';
  if (!validateCVV(cvv, cardType)) {
    const expectedLength = cardType === 'amex' ? 4 : 3;
    return `CVV must be ${expectedLength} digits`;
  }
  return null;
};

// Expiration Date Validation
export const validateExpirationDate = (month, year) => {
  if (!month || !year) return false;

  const now = new Date();
  const expiry = new Date(year, month - 1);

  return expiry > now;
};

export const getExpirationDateError = (month, year) => {
  if (!month) return 'Expiration month is required';
  if (!year) return 'Expiration year is required';
  if (!validateExpirationDate(month, year)) return 'Card has expired';
  return null;
};

// Form Validation Helper
export const validateForm = (values, rules) => {
  const errors = {};

  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = values[field];

    for (const rule of fieldRules) {
      const error = rule(value, values);
      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Common validation rule factories
export const required = (fieldName = 'Field') => (value) => getRequiredError(value, fieldName);

export const email = () => (value) => value ? getEmailError(value) : null;

export const password = () => (value) => value ? getPasswordError(value) : null;

export const minLength = (min, fieldName = 'Field') => (value) =>
  value && value.length < min ? `${fieldName} must be at least ${min} characters` : null;

export const maxLength = (max, fieldName = 'Field') => (value) =>
  value && value.length > max ? `${fieldName} must be no more than ${max} characters` : null;

export const pattern = (regex, message) => (value) =>
  value && !regex.test(value) ? message : null;