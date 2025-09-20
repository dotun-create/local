/**
 * Currency utility functions for Troupe Academy frontend
 * Handles currency formatting and mapping based on country/currency codes
 */

/**
 * Get currency symbol from currency code
 */
export const getCurrencySymbol = (currencyCode) => {
  const currencySymbols = {
    'GBP': '£',
    'USD': '$',
    'NGN': '₦',
    'CAD': 'C$',
    'EUR': '€',
    'JPY': '¥',
    'AUD': 'A$'
  };
  return currencySymbols[currencyCode] || currencyCode;
};

/**
 * Map country names to currency codes
 */
export const getCurrencyFromCountry = (country) => {
  if (!country) {
    return 'GBP'; // Default currency
  }

  const countryCurrencyMap = {
    // UK variants
    'UK': 'GBP',
    'United Kingdom': 'GBP',
    'England': 'GBP',
    'Scotland': 'GBP',
    'Wales': 'GBP',
    'Northern Ireland': 'GBP',
    'Britain': 'GBP',
    'Great Britain': 'GBP',

    // US variants
    'US': 'USD',
    'USA': 'USD',
    'United States': 'USD',
    'United States of America': 'USD',
    'America': 'USD',

    // Nigeria
    'Nigeria': 'NGN',
    'Nigerian': 'NGN',

    // Canada
    'Canada': 'CAD',
    'Canadian': 'CAD',

    // Other common countries
    'Germany': 'EUR',
    'France': 'EUR',
    'Italy': 'EUR',
    'Spain': 'EUR',
    'Netherlands': 'EUR',
    'Japan': 'JPY',
    'Australia': 'AUD'
  };

  // Try exact match first
  if (countryCurrencyMap[country]) {
    return countryCurrencyMap[country];
  }

  // Try case-insensitive match
  const countryLower = country.toLowerCase();
  for (const [key, value] of Object.entries(countryCurrencyMap)) {
    if (key.toLowerCase() === countryLower) {
      return value;
    }
  }

  // Try partial match
  for (const [key, value] of Object.entries(countryCurrencyMap)) {
    if (key.toLowerCase().includes(countryLower) || countryLower.includes(key.toLowerCase())) {
      return value;
    }
  }

  return 'GBP'; // Default currency
};

/**
 * Format currency amount with proper symbol and formatting
 */
export const formatCurrency = (amount, currencyCode = 'GBP', showSymbol = true, decimalPlaces = 2) => {
  if (amount === null || amount === undefined) {
    amount = 0.0;
  }

  try {
    amount = parseFloat(amount);
    if (isNaN(amount)) {
      amount = 0.0;
    }
  } catch (error) {
    amount = 0.0;
  }

  // Format the number
  const formattedAmount = amount.toFixed(decimalPlaces);

  if (showSymbol) {
    const symbol = getCurrencySymbol(currencyCode);

    // Different formatting for different currencies
    switch (currencyCode) {
      case 'USD':
      case 'CAD':
      case 'AUD':
        return `${symbol}${formattedAmount}`;
      case 'EUR':
        return `${formattedAmount}€`;
      case 'JPY':
        // Japanese yen typically doesn't use decimal places
        return `¥${Math.round(amount)}`;
      case 'NGN':
        return `₦${formattedAmount}`;
      default: // GBP and others
        return `${symbol}${formattedAmount}`;
    }
  } else {
    return formattedAmount;
  }
};

/**
 * Format currency for display in UI components
 */
export const formatCurrencyForDisplay = (amount, currencyCode = 'GBP') => {
  return formatCurrency(amount, currencyCode, true, 2);
};

/**
 * Format currency for input fields (usually without symbol)
 */
export const formatCurrencyInput = (amount, currencyCode = 'GBP') => {
  return formatCurrency(amount, currencyCode, false, 2);
};

/**
 * Get detailed currency information
 */
export const getCurrencyInfo = (currencyCode = 'GBP') => {
  const currencyInfo = {
    'GBP': {
      name: 'British Pound',
      symbol: '£',
      decimalPlaces: 2,
      symbolPosition: 'before'
    },
    'USD': {
      name: 'US Dollar',
      symbol: '$',
      decimalPlaces: 2,
      symbolPosition: 'before'
    },
    'NGN': {
      name: 'Nigerian Naira',
      symbol: '₦',
      decimalPlaces: 2,
      symbolPosition: 'before'
    },
    'CAD': {
      name: 'Canadian Dollar',
      symbol: 'C$',
      decimalPlaces: 2,
      symbolPosition: 'before'
    },
    'EUR': {
      name: 'Euro',
      symbol: '€',
      decimalPlaces: 2,
      symbolPosition: 'after'
    },
    'JPY': {
      name: 'Japanese Yen',
      symbol: '¥',
      decimalPlaces: 0,
      symbolPosition: 'before'
    },
    'AUD': {
      name: 'Australian Dollar',
      symbol: 'A$',
      decimalPlaces: 2,
      symbolPosition: 'before'
    }
  };

  return currencyInfo[currencyCode] || currencyInfo['GBP'];
};

/**
 * Get list of all supported currencies
 */
export const getSupportedCurrencies = () => {
  const currencies = ['GBP', 'USD', 'NGN', 'CAD', 'EUR', 'JPY', 'AUD'];
  return currencies.map(code => ({
    code,
    ...getCurrencyInfo(code)
  }));
};

/**
 * Validate if a currency code is supported
 */
export const validateCurrencyCode = (currencyCode) => {
  const supportedCodes = ['GBP', 'USD', 'NGN', 'CAD', 'EUR', 'JPY', 'AUD'];
  return supportedCodes.includes(currencyCode);
};

/**
 * Convert price for display, automatically determining currency from country if needed
 */
export const convertPriceDisplay = (price, currencyCode, country = null) => {
  if (!currencyCode && country) {
    currencyCode = getCurrencyFromCountry(country);
  } else if (!currencyCode) {
    currencyCode = 'GBP';
  }

  return formatCurrencyForDisplay(price, currencyCode);
};

/**
 * Get currency code from course data
 */
export const getCurrencyFromCourse = (course) => {
  // Use course currency if available, otherwise determine from country
  if (course.currency) {
    return course.currency;
  }
  if (course.country) {
    return getCurrencyFromCountry(course.country);
  }
  return 'GBP'; // Default
};

/**
 * Format price with currency based on course data
 */
export const formatCoursePrice = (course) => {
  const currency = getCurrencyFromCourse(course);
  return formatCurrencyForDisplay(course.price, currency);
};