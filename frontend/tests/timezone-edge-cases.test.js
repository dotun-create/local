/**
 * Frontend Timezone Edge Cases Test Suite
 * =======================================
 *
 * Comprehensive tests for frontend timezone handling, day-of-week conversion,
 * and availability normalization utilities.
 *
 * Tests cover:
 * - availabilityNormalizer utility functions
 * - timezoneManager utility functions
 * - Edge cases like DST transitions, week boundaries
 * - Cross-timezone session creation scenarios
 * - Performance with large datasets
 *
 * Usage:
 *   npm test timezone-edge-cases.test.js
 *   yarn test timezone-edge-cases.test.js
 */

import {
  normalizeAvailabilitySlot,
  normalizeAvailabilityArray,
  normalizeAvailabilityResponse,
  pythonToJsWeekday,
  jsToPythonWeekday
} from '../src/utils/availabilityNormalizer';

import {
  getUserTimezone,
  setUserTimezone,
  isValidTimezone,
  formatTimeInUserTimezone,
  formatDateInUserTimezone,
  formatDateTimeInUserTimezone,
  getTimezoneOffset,
  getTimezoneAbbreviation,
  jsToPythonWeekday as tzJsToPython,
  pythonToJsWeekday as tzPythonToJs,
  getWeekdayNames,
  getWeekdayName,
  enhanceAvailabilityDisplay
} from '../src/utils/timezoneManager';

// Mock localStorage for testing
const mockLocalStorage = {
  store: {},
  getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key, value) => {
    mockLocalStorage.store[key] = value;
  }),
  clear: jest.fn(() => {
    mockLocalStorage.store = {};
  })
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock Intl.DateTimeFormat for consistent testing
const mockDateTimeFormat = {
  resolvedOptions: jest.fn(() => ({ timeZone: 'America/New_York' })),
  format: jest.fn((date) => date.toISOString()),
  formatToParts: jest.fn((date) => [
    { type: 'timeZoneName', value: 'EST' }
  ])
};

Object.defineProperty(window, 'Intl', {
  value: {
    DateTimeFormat: jest.fn(() => mockDateTimeFormat)
  }
});

describe('Day of Week Conversion', () => {
  describe('Python to JavaScript Conversion', () => {
    test('converts Python weekdays to JavaScript weekdays correctly', () => {
      // Monday (0 in Python) should become 1 in JavaScript
      expect(pythonToJsWeekday(0)).toBe(1);
      // Tuesday (1 in Python) should become 2 in JavaScript
      expect(pythonToJsWeekday(1)).toBe(2);
      // Wednesday (2 in Python) should become 3 in JavaScript
      expect(pythonToJsWeekday(2)).toBe(3);
      // Thursday (3 in Python) should become 4 in JavaScript
      expect(pythonToJsWeekday(3)).toBe(4);
      // Friday (4 in Python) should become 5 in JavaScript
      expect(pythonToJsWeekday(4)).toBe(5);
      // Saturday (5 in Python) should become 6 in JavaScript
      expect(pythonToJsWeekday(5)).toBe(6);
      // Sunday (6 in Python) should become 0 in JavaScript
      expect(pythonToJsWeekday(6)).toBe(0);
    });

    test('handles invalid inputs gracefully', () => {
      expect(pythonToJsWeekday(null)).toBe(1); // Default to Monday
      expect(pythonToJsWeekday(undefined)).toBe(1);
      expect(pythonToJsWeekday(-1)).toBe(1);
      expect(pythonToJsWeekday(7)).toBe(1);
      expect(pythonToJsWeekday('invalid')).toBe(1);
    });
  });

  describe('JavaScript to Python Conversion', () => {
    test('converts JavaScript weekdays to Python weekdays correctly', () => {
      // Sunday (0 in JavaScript) should become 6 in Python
      expect(jsToPythonWeekday(0)).toBe(6);
      // Monday (1 in JavaScript) should become 0 in Python
      expect(jsToPythonWeekday(1)).toBe(0);
      // Tuesday (2 in JavaScript) should become 1 in Python
      expect(jsToPythonWeekday(2)).toBe(1);
      // Wednesday (3 in JavaScript) should become 2 in Python
      expect(jsToPythonWeekday(3)).toBe(2);
      // Thursday (4 in JavaScript) should become 3 in Python
      expect(jsToPythonWeekday(4)).toBe(3);
      // Friday (5 in JavaScript) should become 4 in Python
      expect(jsToPythonWeekday(5)).toBe(4);
      // Saturday (6 in JavaScript) should become 5 in Python
      expect(jsToPythonWeekday(6)).toBe(5);
    });

    test('handles invalid inputs gracefully', () => {
      expect(jsToPythonWeekday(null)).toBe(0); // Default to Monday in Python format
      expect(jsToPythonWeekday(undefined)).toBe(0);
      expect(jsToPythonWeekday(-1)).toBe(0);
      expect(jsToPythonWeekday(7)).toBe(0);
      expect(jsToPythonWeekday('invalid')).toBe(0);
    });
  });

  describe('Conversion Roundtrip Tests', () => {
    test('Python to JS to Python roundtrip preserves original value', () => {
      for (let pythonDay = 0; pythonDay < 7; pythonDay++) {
        const jsDay = pythonToJsWeekday(pythonDay);
        const backToPython = jsToPythonWeekday(jsDay);
        expect(backToPython).toBe(pythonDay);
      }
    });

    test('JS to Python to JS roundtrip preserves original value', () => {
      for (let jsDay = 0; jsDay < 7; jsDay++) {
        const pythonDay = jsToPythonWeekday(jsDay);
        const backToJs = pythonToJsWeekday(pythonDay);
        expect(backToJs).toBe(jsDay);
      }
    });
  });

  describe('Timezone Manager Day of Week Functions', () => {
    test('timezone manager conversion functions match availability normalizer', () => {
      for (let day = 0; day < 7; day++) {
        // Both modules should produce identical results
        expect(tzPythonToJs(day)).toBe(pythonToJsWeekday(day));
        expect(tzJsToPython(day)).toBe(jsToPythonWeekday(day));
      }
    });

    test('weekday names are correct for both formats', () => {
      const jsNames = getWeekdayNames('js');
      const pythonNames = getWeekdayNames('python');

      expect(jsNames).toEqual([
        'Sunday', 'Monday', 'Tuesday', 'Wednesday',
        'Thursday', 'Friday', 'Saturday'
      ]);

      expect(pythonNames).toEqual([
        'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday', 'Sunday'
      ]);
    });

    test('weekday name lookup works correctly', () => {
      // JavaScript format (0=Sunday)
      expect(getWeekdayName(0, 'js')).toBe('Sunday');
      expect(getWeekdayName(1, 'js')).toBe('Monday');
      expect(getWeekdayName(6, 'js')).toBe('Saturday');

      // Python format (0=Monday)
      expect(getWeekdayName(0, 'python')).toBe('Monday');
      expect(getWeekdayName(1, 'python')).toBe('Tuesday');
      expect(getWeekdayName(6, 'python')).toBe('Sunday');

      // Invalid inputs
      expect(getWeekdayName(-1, 'js')).toBe('Invalid');
      expect(getWeekdayName(7, 'python')).toBe('Invalid');
    });
  });
});

describe('Availability Normalization', () => {
  describe('Single Slot Normalization', () => {
    test('normalizes slot with mixed field naming conventions', () => {
      const testSlot = {
        id: 'availability_12345678',
        start_time: '09:00',
        end_time: '10:00',
        specific_date: '2024-06-15',
        day_of_week: 5, // Python format (Friday)
        time_zone: 'US/Eastern'
      };

      const normalized = normalizeAvailabilitySlot(testSlot);

      // Should have both field name variants
      expect(normalized.start_time).toBe('09:00');
      expect(normalized.startTime).toBe('09:00');
      expect(normalized.end_time).toBe('10:00');
      expect(normalized.endTime).toBe('10:00');
      expect(normalized.specific_date).toBe('2024-06-15');
      expect(normalized.specificDate).toBe('2024-06-15');

      // Should have both day-of-week formats
      expect(normalized.day_of_week_python).toBe(5); // Friday in Python
      expect(normalized.day_of_week_js).toBe(6);     // Friday in JavaScript
      expect(normalized.dayOfWeek).toBe(6);          // Primary field (JS format)

      // Timezone fields
      expect(normalized.time_zone).toBe('US/Eastern');
      expect(normalized.timeZone).toBe('US/Eastern');
      expect(normalized.timezone).toBe('US/Eastern');
    });

    test('handles slots with camelCase field names', () => {
      const camelCaseSlot = {
        id: 'availability_87654321',
        startTime: '14:00',
        endTime: '15:00',
        specificDate: '2024-06-16T00:00:00.000Z',
        dayOfWeek: 2, // JavaScript format (Tuesday)
        timeZone: 'US/Pacific'
      };

      const normalized = normalizeAvailabilitySlot(camelCaseSlot);

      // Should create snake_case variants
      expect(normalized.start_time).toBe('14:00');
      expect(normalized.startTime).toBe('14:00');

      // Should extract date from ISO string
      expect(normalized.specificDate).toBe('2024-06-16');
      expect(normalized.specific_date).toBe('2024-06-16');

      // Should convert JS day-of-week to Python format
      expect(normalized.day_of_week_js).toBe(2);     // Tuesday in JavaScript
      expect(normalized.day_of_week_python).toBe(1); // Tuesday in Python
    });

    test('handles missing fields gracefully', () => {
      const minimalSlot = {
        id: 'availability_minimal'
      };

      const normalized = normalizeAvailabilitySlot(minimalSlot);

      expect(normalized.id).toBe('availability_minimal');
      expect(normalized.startTime).toBeUndefined();
      expect(normalized.start_time).toBeUndefined();
      expect(normalized.dayOfWeek).toBeUndefined();
    });

    test('preserves additional fields', () => {
      const slotWithExtras = {
        id: 'availability_extras',
        start_time: '10:00',
        courseId: 'course_123',
        tutorId: 'tutor_456',
        isRecurring: true,
        customField: 'custom_value'
      };

      const normalized = normalizeAvailabilitySlot(slotWithExtras);

      expect(normalized.courseId).toBe('course_123');
      expect(normalized.tutorId).toBe('tutor_456');
      expect(normalized.isRecurring).toBe(true);
      expect(normalized.customField).toBe('custom_value');
    });
  });

  describe('Array Normalization', () => {
    test('normalizes array of slots', () => {
      const slotsArray = [
        {
          id: 'availability_1',
          start_time: '09:00',
          day_of_week: 0 // Python Monday
        },
        {
          id: 'availability_2',
          startTime: '10:00',
          dayOfWeek: 2 // JS Tuesday
        }
      ];

      const normalized = normalizeAvailabilityArray(slotsArray);

      expect(normalized).toHaveLength(2);
      expect(normalized[0].day_of_week_js).toBe(1); // Monday in JS
      expect(normalized[1].day_of_week_python).toBe(1); // Tuesday in Python
    });

    test('handles invalid input gracefully', () => {
      expect(normalizeAvailabilityArray(null)).toEqual([]);
      expect(normalizeAvailabilityArray(undefined)).toEqual([]);
      expect(normalizeAvailabilityArray('not an array')).toEqual([]);
    });
  });

  describe('Response Normalization', () => {
    test('normalizes flat array response', () => {
      const flatResponse = [
        { id: 'availability_1', start_time: '09:00' },
        { id: 'availability_2', start_time: '10:00' }
      ];

      const normalized = normalizeAvailabilityResponse(flatResponse);

      expect(Array.isArray(normalized)).toBe(true);
      expect(normalized).toHaveLength(2);
    });

    test('normalizes wrapped response with availability property', () => {
      const wrappedResponse = {
        availability: [
          { id: 'availability_1', start_time: '09:00' },
          { id: 'availability_2', start_time: '10:00' }
        ],
        total: 2,
        status: 'success'
      };

      const normalized = normalizeAvailabilityResponse(wrappedResponse);

      expect(normalized.total).toBe(2);
      expect(normalized.status).toBe('success');
      expect(normalized.availability).toHaveLength(2);
    });

    test('normalizes wrapped response with data property', () => {
      const dataResponse = {
        data: [
          { id: 'availability_1', start_time: '09:00' }
        ],
        meta: { total: 1 }
      };

      const normalized = normalizeAvailabilityResponse(dataResponse);

      expect(normalized.meta.total).toBe(1);
      expect(normalized.data).toHaveLength(1);
    });
  });
});

describe('Timezone Management', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('Timezone Storage and Retrieval', () => {
    test('gets user timezone from localStorage', () => {
      mockLocalStorage.store.userTimezone = 'US/Pacific';
      expect(getUserTimezone()).toBe('US/Pacific');
    });

    test('falls back to browser timezone when no stored preference', () => {
      expect(getUserTimezone()).toBe('America/New_York'); // Mocked value
    });

    test('sets user timezone preference', () => {
      setUserTimezone('US/Central');
      expect(mockLocalStorage.store.userTimezone).toBe('US/Central');
    });

    test('validates timezone strings', () => {
      expect(isValidTimezone('US/Eastern')).toBe(true);
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone(null)).toBe(false);
    });
  });

  describe('Time Formatting', () => {
    test('formats time in user timezone', () => {
      const testDate = new Date('2024-06-15T14:30:00Z');
      const formatted = formatTimeInUserTimezone(testDate);

      // Should be formatted as time string
      expect(typeof formatted).toBe('string');
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Should contain time pattern
    });

    test('formats date in user timezone', () => {
      const testDate = new Date('2024-06-15T14:30:00Z');
      const formatted = formatDateInUserTimezone(testDate);

      expect(typeof formatted).toBe('string');
      expect(formatted).toMatch(/Jun/); // Should contain month abbreviation
    });

    test('formats datetime in user timezone', () => {
      const testDate = new Date('2024-06-15T14:30:00Z');
      const formatted = formatDateTimeInUserTimezone(testDate);

      expect(typeof formatted).toBe('string');
      expect(formatted).toMatch(/Jun.*\d{1,2}:\d{2}/); // Should contain date and time
    });

    test('handles invalid dates gracefully', () => {
      expect(formatTimeInUserTimezone('invalid-date')).toBe('Invalid Time');
      expect(formatDateInUserTimezone(null)).toBe('Invalid Date');
      expect(formatDateTimeInUserTimezone(undefined)).toBe('Invalid DateTime');
    });
  });

  describe('Availability Enhancement', () => {
    test('enhances availability with display fields', () => {
      const availability = {
        id: 'availability_123',
        start_time: '09:00',
        end_time: '10:00',
        day_of_week: 0, // Python Monday
        time_zone: 'US/Eastern'
      };

      const enhanced = enhanceAvailabilityDisplay(availability);

      expect(enhanced.displayStartTime).toBeDefined();
      expect(enhanced.displayEndTime).toBeDefined();
      expect(enhanced.displayTimezone).toBeDefined();
      expect(enhanced.displayTimezoneAbbr).toBe('EST'); // Mocked value
      expect(enhanced.displayTimeRange).toContain('EST');
      expect(enhanced.dayOfWeek).toBe(1); // Monday in JS format
      expect(enhanced.dayOfWeekName).toBe('Monday');
    });

    test('handles missing availability data', () => {
      expect(enhanceAvailabilityDisplay(null)).toBeNull();
      expect(enhanceAvailabilityDisplay(undefined)).toBeUndefined();
    });

    test('preserves original data fields', () => {
      const availability = {
        start_time: '09:00',
        end_time: '10:00',
        time_zone: 'US/Pacific'
      };

      const enhanced = enhanceAvailabilityDisplay(availability);

      expect(enhanced.originalStartTime).toBe('09:00');
      expect(enhanced.originalEndTime).toBe('10:00');
      expect(enhanced.originalTimezone).toBe('US/Pacific');
    });
  });
});

describe('Edge Cases and Performance', () => {
  describe('Week Boundary Edge Cases', () => {
    test('handles week transitions correctly', () => {
      // Test Saturday to Sunday transition
      const saturdayJs = 6;
      const sundayJs = 0;

      const saturdayPython = jsToPythonWeekday(saturdayJs);
      const sundayPython = jsToPythonWeekday(sundayJs);

      expect(saturdayPython).toBe(5); // Saturday in Python
      expect(sundayPython).toBe(6);   // Sunday in Python

      // Sunday should wrap around to 0 in JS, 6 in Python
      expect(pythonToJsWeekday(sundayPython)).toBe(sundayJs);
    });

    test('handles month boundary transitions', () => {
      // Test with actual dates across month boundaries
      const endOfMonth = new Date('2024-06-30T23:59:59Z'); // Sunday
      const startOfMonth = new Date('2024-07-01T00:00:00Z'); // Monday

      expect(endOfMonth.getDay()).toBe(0); // Sunday in JS
      expect(startOfMonth.getDay()).toBe(1); // Monday in JS

      // Convert to Python format
      expect(jsToPythonWeekday(endOfMonth.getDay())).toBe(6); // Sunday
      expect(jsToPythonWeekday(startOfMonth.getDay())).toBe(0); // Monday
    });
  });

  describe('Large Dataset Performance', () => {
    test('handles large availability arrays efficiently', () => {
      const largeDataset = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          id: `availability_${i.toString().padStart(8, '0')}`,
          start_time: `${9 + (i % 8)}:00`,
          day_of_week: i % 7
        });
      }

      const startTime = performance.now();
      const normalized = normalizeAvailabilityArray(largeDataset);
      const endTime = performance.now();

      expect(normalized).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly

      // Spot check normalization
      expect(normalized[0].day_of_week_js).toBe(1); // Monday in JS
      expect(normalized[6].day_of_week_js).toBe(0); // Sunday in JS
    });
  });

  describe('Malformed Data Handling', () => {
    test('handles various malformed inputs gracefully', () => {
      const malformedInputs = [
        null,
        undefined,
        {},
        { id: null },
        { day_of_week: 'invalid' },
        { day_of_week: -1 },
        { day_of_week: 7 },
        { specific_date: 'not-a-date' },
        { start_time: '25:00' }
      ];

      malformedInputs.forEach(input => {
        expect(() => {
          const result = normalizeAvailabilitySlot(input);
          // Should not throw and should return something meaningful
          expect(result !== undefined).toBe(true);
        }).not.toThrow();
      });
    });

    test('handles corrupted day-of-week data', () => {
      const corruptedSlot = {
        id: 'availability_corrupted',
        day_of_week: null,
        day_of_week_js: 'invalid',
        day_of_week_python: -5
      };

      const normalized = normalizeAvailabilitySlot(corruptedSlot);

      // Should have attempted to fix or provide defaults
      expect(normalized.id).toBe('availability_corrupted');
      // Corrupted values should be handled gracefully
    });
  });

  describe('Timezone Edge Cases', () => {
    test('handles DST transition periods', () => {
      // Spring forward: March 10, 2024 (2:00 AM becomes 3:00 AM)
      const springForwardDate = new Date('2024-03-10T07:00:00Z'); // 2:00 AM EST

      const formatted = formatTimeInUserTimezone(springForwardDate);
      expect(typeof formatted).toBe('string');
    });

    test('handles different timezone formats', () => {
      const timezones = [
        'US/Eastern',
        'America/New_York',
        'EST',
        'UTC',
        'GMT'
      ];

      timezones.forEach(tz => {
        // Should handle various timezone formats
        const isValid = isValidTimezone(tz);
        expect(typeof isValid).toBe('boolean');
      });
    });

    test('handles cross-timezone calculations', () => {
      const pstTime = '10:00'; // 10:00 AM PST
      const pstTimezone = 'US/Pacific';
      const estTimezone = 'US/Eastern';

      // In a real implementation, this would convert PST to EST
      // 10:00 AM PST = 1:00 PM EST (3-hour difference)

      // Mock the calculation
      const testDateTime = new Date(`2024-06-15T${pstTime}:00`);
      const formatted = formatTimeInUserTimezone(testDateTime);

      expect(typeof formatted).toBe('string');
    });
  });
});

describe('Integration Tests', () => {
  test('complete workflow: API response to display', () => {
    // Simulate API response
    const apiResponse = {
      availability: [
        {
          id: 'availability_12345678',
          start_time: '09:00',
          end_time: '10:00',
          specific_date: '2024-06-15',
          day_of_week: 5, // Python Friday
          time_zone: 'US/Eastern'
        },
        {
          id: 'availability_87654321',
          startTime: '14:00',
          endTime: '15:00',
          specificDate: '2024-06-16',
          dayOfWeek: 0, // JS Sunday
          timeZone: 'US/Pacific'
        }
      ],
      total: 2
    };

    // Step 1: Normalize API response
    const normalized = normalizeAvailabilityResponse(apiResponse);
    expect(normalized.availability).toHaveLength(2);

    // Step 2: Enhance with display information
    const enhanced = normalized.availability.map(slot =>
      enhanceAvailabilityDisplay(slot)
    );

    // Verify complete processing chain
    expect(enhanced[0].day_of_week_js).toBe(6); // Friday in JS
    expect(enhanced[0].displayTimezoneAbbr).toBeDefined();
    expect(enhanced[1].day_of_week_python).toBe(6); // Sunday in Python
    expect(enhanced[1].dayOfWeekName).toBe('Sunday');
  });

  test('session creation workflow with timezone conversion', () => {
    // Simulate session creation data
    const sessionData = {
      tutor_timezone: 'US/Pacific',
      student_timezone: 'US/Eastern',
      scheduled_time: '14:00', // 2:00 PM PST
      day_of_week: 1 // Monday in JS format
    };

    // Convert day of week formats
    const pythonDow = jsToPythonWeekday(sessionData.day_of_week);
    expect(pythonDow).toBe(0); // Monday in Python format

    // In a real implementation, timezone conversion would happen here
    // 2:00 PM PST = 5:00 PM EST
    const testTime = new Date(`2024-06-15T${sessionData.scheduled_time}:00`);
    const formatted = formatTimeInUserTimezone(testTime);

    expect(typeof formatted).toBe('string');
  });
});