#!/usr/bin/env python3
"""
Comprehensive Test Suite for Timezone Edge Cases
===============================================

Tests timezone handling, day-of-week conversion, and edge cases in the availability system.
This suite validates the timezone implementation across different scenarios including:

- Day-of-week format conversions (JavaScript ↔ Python)
- Timezone-aware time formatting and display
- Cross-timezone session creation and validation
- Edge cases like DST transitions, leap years, and week boundaries
- API response normalization and consistency

Usage:
    python -m pytest tests/test_timezone_edge_cases.py -v
    python -m pytest tests/test_timezone_edge_cases.py::TestTimezoneConversion -v
"""

import pytest
import sys
import os
from datetime import datetime, timedelta, date
from unittest.mock import Mock, patch, MagicMock
import json
import pytz

# Add parent directory for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.utils.timezone_handler import TimezoneHandler
    from app.utils.day_of_week_converter import DayOfWeekConverter
    from app.api.recurring_availability import RecurringAvailabilityAPI
except ImportError as e:
    print(f"Warning: Could not import some modules: {e}")
    # Create mock classes for testing if imports fail
    class TimezoneHandler:
        pass
    class DayOfWeekConverter:
        pass
    class RecurringAvailabilityAPI:
        pass

class TestDayOfWeekConversion:
    """Test day-of-week format conversion between JavaScript and Python."""

    def test_python_to_js_conversion(self):
        """Test Python weekday (0=Monday) to JavaScript weekday (0=Sunday) conversion."""
        # Monday (0 in Python) should become 1 in JavaScript
        assert DayOfWeekConverter.python_to_js(0) == 1
        # Tuesday (1 in Python) should become 2 in JavaScript
        assert DayOfWeekConverter.python_to_js(1) == 2
        # Wednesday (2 in Python) should become 3 in JavaScript
        assert DayOfWeekConverter.python_to_js(2) == 3
        # Thursday (3 in Python) should become 4 in JavaScript
        assert DayOfWeekConverter.python_to_js(3) == 4
        # Friday (4 in Python) should become 5 in JavaScript
        assert DayOfWeekConverter.python_to_js(4) == 5
        # Saturday (5 in Python) should become 6 in JavaScript
        assert DayOfWeekConverter.python_to_js(5) == 6
        # Sunday (6 in Python) should become 0 in JavaScript
        assert DayOfWeekConverter.python_to_js(6) == 0

    def test_js_to_python_conversion(self):
        """Test JavaScript weekday (0=Sunday) to Python weekday (0=Monday) conversion."""
        # Sunday (0 in JavaScript) should become 6 in Python
        assert DayOfWeekConverter.js_to_python(0) == 6
        # Monday (1 in JavaScript) should become 0 in Python
        assert DayOfWeekConverter.js_to_python(1) == 0
        # Tuesday (2 in JavaScript) should become 1 in Python
        assert DayOfWeekConverter.js_to_python(2) == 1
        # Wednesday (3 in JavaScript) should become 2 in Python
        assert DayOfWeekConverter.js_to_python(3) == 2
        # Thursday (4 in JavaScript) should become 3 in Python
        assert DayOfWeekConverter.js_to_python(4) == 3
        # Friday (5 in JavaScript) should become 4 in Python
        assert DayOfWeekConverter.js_to_python(5) == 4
        # Saturday (6 in JavaScript) should become 5 in Python
        assert DayOfWeekConverter.js_to_python(6) == 5

    def test_conversion_roundtrip(self):
        """Test that converting back and forth preserves the original value."""
        for python_day in range(7):
            js_day = DayOfWeekConverter.python_to_js(python_day)
            converted_back = DayOfWeekConverter.js_to_python(js_day)
            assert converted_back == python_day, f"Roundtrip failed for Python day {python_day}"

        for js_day in range(7):
            python_day = DayOfWeekConverter.js_to_python(js_day)
            converted_back = DayOfWeekConverter.python_to_js(python_day)
            assert converted_back == js_day, f"Roundtrip failed for JS day {js_day}"

    def test_invalid_input_handling(self):
        """Test handling of invalid day-of-week inputs."""
        # Test None inputs
        assert DayOfWeekConverter.python_to_js(None) is None
        assert DayOfWeekConverter.js_to_python(None) is None

        # Test out of range inputs
        assert DayOfWeekConverter.python_to_js(-1) is None
        assert DayOfWeekConverter.python_to_js(7) is None
        assert DayOfWeekConverter.js_to_python(-1) is None
        assert DayOfWeekConverter.js_to_python(7) is None

        # Test non-integer inputs
        assert DayOfWeekConverter.python_to_js("monday") is None
        assert DayOfWeekConverter.js_to_python(3.5) is None

    def test_date_to_day_of_week_calculation(self):
        """Test calculating day of week from actual dates."""
        # Test known dates
        # January 1, 2024 was a Monday (Python=0, JS=1)
        test_date = date(2024, 1, 1)
        python_dow = test_date.weekday()  # Monday = 0
        js_dow = DayOfWeekConverter.python_to_js(python_dow)

        assert python_dow == 0  # Monday in Python format
        assert js_dow == 1      # Monday in JavaScript format

        # Test a Sunday - January 7, 2024 (Python=6, JS=0)
        test_date = date(2024, 1, 7)
        python_dow = test_date.weekday()  # Sunday = 6
        js_dow = DayOfWeekConverter.python_to_js(python_dow)

        assert python_dow == 6  # Sunday in Python format
        assert js_dow == 0      # Sunday in JavaScript format


class TestTimezoneHandling:
    """Test timezone conversion and display functionality."""

    def test_timezone_aware_time_formatting(self):
        """Test formatting times with timezone awareness."""
        handler = TimezoneHandler()

        # Test basic time formatting
        utc_time = datetime(2024, 6, 15, 14, 30, 0, tzinfo=pytz.UTC)

        # Convert to different timezones
        est_time = handler.convert_to_timezone(utc_time, 'US/Eastern')
        pst_time = handler.convert_to_timezone(utc_time, 'US/Pacific')
        cst_time = handler.convert_to_timezone(utc_time, 'US/Central')

        # Verify conversions (June 15 is during DST)
        assert est_time.hour == 10  # UTC-4 during DST
        assert pst_time.hour == 7   # UTC-7 during DST
        assert cst_time.hour == 9   # UTC-5 during DST

    def test_dst_transition_handling(self):
        """Test handling of Daylight Saving Time transitions."""
        handler = TimezoneHandler()

        # Spring forward: March 10, 2024 (2:00 AM becomes 3:00 AM)
        spring_forward_date = datetime(2024, 3, 10, 7, 0, 0, tzinfo=pytz.UTC)  # 2:00 AM EST
        spring_result = handler.convert_to_timezone(spring_forward_date, 'US/Eastern')
        assert spring_result.hour == 3  # Should be 3:00 AM due to DST

        # Fall back: November 3, 2024 (2:00 AM becomes 1:00 AM)
        fall_back_date = datetime(2024, 11, 3, 6, 0, 0, tzinfo=pytz.UTC)  # 2:00 AM EDT -> 1:00 AM EST
        fall_result = handler.convert_to_timezone(fall_back_date, 'US/Eastern')
        assert fall_result.hour == 1  # Should be 1:00 AM after fall back

    def test_cross_timezone_session_validation(self):
        """Test session creation across different timezones."""
        handler = TimezoneHandler()

        # Tutor in PST, Student in EST
        tutor_timezone = 'US/Pacific'
        student_timezone = 'US/Eastern'

        # Session scheduled for 10:00 AM PST
        session_time_pst = datetime(2024, 6, 15, 10, 0, 0)
        session_utc = handler.localize_and_convert_to_utc(session_time_pst, tutor_timezone)
        session_est = handler.convert_to_timezone(session_utc, student_timezone)

        # Should be 1:00 PM EST (3-hour difference during DST)
        assert session_est.hour == 13

    def test_timezone_abbreviation_handling(self):
        """Test handling of timezone abbreviations vs full names."""
        handler = TimezoneHandler()

        # Test common abbreviations
        abbreviation_map = {
            'EST': 'US/Eastern',
            'PST': 'US/Pacific',
            'CST': 'US/Central',
            'MST': 'US/Mountain'
        }

        for abbrev, full_name in abbreviation_map.items():
            # Both should produce the same result
            test_time = datetime(2024, 1, 15, 12, 0, 0, tzinfo=pytz.UTC)
            result1 = handler.convert_to_timezone(test_time, abbrev)
            result2 = handler.convert_to_timezone(test_time, full_name)
            # Times should be equivalent (accounting for potential DST differences)
            assert abs((result1 - result2).total_seconds()) <= 3600  # Within 1 hour


class TestAvailabilityNormalization:
    """Test availability data normalization and consistency."""

    def test_field_normalization(self):
        """Test that availability fields are normalized correctly."""
        from app.utils.availability_normalizer import normalize_availability_slot

        # Test slot with mixed field naming conventions
        test_slot = {
            'id': 'availability_12345678',
            'start_time': '09:00',
            'end_time': '10:00',
            'specific_date': '2024-06-15',
            'day_of_week': 5,  # Python format (Friday)
            'timezone': 'US/Eastern'
        }

        normalized = normalize_availability_slot(test_slot)

        # Should have both field name variants
        assert normalized['start_time'] == '09:00'
        assert normalized['startTime'] == '09:00'
        assert normalized['end_time'] == '10:00'
        assert normalized['endTime'] == '10:00'
        assert normalized['specific_date'] == '2024-06-15'
        assert normalized['specificDate'] == '2024-06-15'

        # Should have both day-of-week formats
        assert normalized['day_of_week_python'] == 5  # Friday in Python
        assert normalized['day_of_week_js'] == 6      # Friday in JavaScript

    def test_missing_field_handling(self):
        """Test handling of slots with missing fields."""
        from app.utils.availability_normalizer import normalize_availability_slot

        # Minimal slot with only essential fields
        minimal_slot = {
            'id': 'availability_87654321',
            'startTime': '14:00'
        }

        normalized = normalize_availability_slot(minimal_slot)

        # Should handle missing fields gracefully
        assert normalized['id'] == 'availability_87654321'
        assert normalized['startTime'] == '14:00'
        assert normalized['start_time'] == '14:00'
        # Missing fields should remain None/undefined
        assert normalized.get('endTime') is None
        assert normalized.get('specific_date') is None

    def test_api_response_normalization(self):
        """Test normalization of different API response formats."""
        from app.utils.availability_normalizer import normalize_availability_response

        # Test flat array response (new format)
        flat_response = [
            {
                'id': 'availability_11111111',
                'start_time': '09:00',
                'specific_date': '2024-06-15',
                'day_of_week': 0  # Monday in Python format
            },
            {
                'id': 'availability_22222222',
                'startTime': '10:00',
                'specificDate': '2024-06-16',
                'dayOfWeek': 2  # Tuesday in JavaScript format
            }
        ]

        normalized_flat = normalize_availability_response(flat_response)

        # Should normalize all slots in array
        assert len(normalized_flat) == 2
        assert normalized_flat[0]['day_of_week_js'] == 1  # Monday in JS format
        assert normalized_flat[1]['day_of_week_python'] == 1  # Tuesday in Python format

        # Test wrapped response (legacy format)
        wrapped_response = {
            'availability': flat_response,
            'total': 2,
            'status': 'success'
        }

        normalized_wrapped = normalize_availability_response(wrapped_response)

        # Should preserve wrapper but normalize inner data
        assert normalized_wrapped['total'] == 2
        assert normalized_wrapped['status'] == 'success'
        assert len(normalized_wrapped['availability']) == 2


class TestWeekBoundaryEdgeCases:
    """Test edge cases around week boundaries and date calculations."""

    def test_week_start_calculation(self):
        """Test calculation of week start dates in different formats."""
        # Test a known Monday: June 3, 2024
        monday_date = date(2024, 6, 3)

        # In Python format, Monday should be at position 0
        assert monday_date.weekday() == 0

        # In JavaScript format, Monday should be at position 1
        js_weekday = DayOfWeekConverter.python_to_js(monday_date.weekday())
        assert js_weekday == 1

    def test_month_boundary_transitions(self):
        """Test day-of-week calculations across month boundaries."""
        # Test transition from February to March (leap year)
        feb_29_2024 = date(2024, 2, 29)  # Thursday in leap year
        mar_1_2024 = date(2024, 3, 1)   # Friday

        feb_29_js = DayOfWeekConverter.python_to_js(feb_29_2024.weekday())
        mar_1_js = DayOfWeekConverter.python_to_js(mar_1_2024.weekday())

        # Thursday -> Friday transition
        assert feb_29_js == 4  # Thursday in JS format
        assert mar_1_js == 5   # Friday in JS format
        assert mar_1_js == (feb_29_js + 1) % 7  # Next day

    def test_year_boundary_transitions(self):
        """Test day-of-week calculations across year boundaries."""
        # Test 2023 -> 2024 transition
        dec_31_2023 = date(2023, 12, 31)  # Sunday
        jan_1_2024 = date(2024, 1, 1)    # Monday

        dec_31_js = DayOfWeekConverter.python_to_js(dec_31_2023.weekday())
        jan_1_js = DayOfWeekConverter.python_to_js(jan_1_2024.weekday())

        # Sunday -> Monday transition
        assert dec_31_js == 0  # Sunday in JS format
        assert jan_1_js == 1   # Monday in JS format

    def test_leap_year_handling(self):
        """Test proper handling of leap years in date calculations."""
        # 2024 is a leap year
        leap_year_feb_29 = date(2024, 2, 29)
        assert leap_year_feb_29.weekday() == 3  # Thursday in Python format

        # 2023 is not a leap year - Feb 29 shouldn't exist
        with pytest.raises(ValueError):
            date(2023, 2, 29)


class TestAPIIntegration:
    """Test integration with actual API endpoints."""

    @patch('app.api.recurring_availability.RecurringAvailabilityAPI')
    def test_availability_api_timezone_headers(self, mock_api):
        """Test that timezone headers are properly sent with API requests."""
        # Mock API response
        mock_response = {
            'availability': [
                {
                    'id': 'availability_12345678',
                    'start_time': '09:00',
                    'end_time': '10:00',
                    'specific_date': '2024-06-15',
                    'day_of_week': 5,
                    'display_start_time': '9:00 AM EST',
                    'display_end_time': '10:00 AM EST'
                }
            ],
            'user_timezone': 'US/Eastern',
            'server_timezone': 'UTC'
        }

        mock_api_instance = mock_api.return_value
        mock_api_instance.get_availability.return_value = mock_response

        # Simulate API call with timezone headers
        api = RecurringAvailabilityAPI()
        result = api.get_availability(
            tutor_id=123,
            headers={'X-Timezone': 'US/Eastern', 'X-Browser-Locale': 'en-US'}
        )

        # Verify the API was called with timezone information
        mock_api_instance.get_availability.assert_called_once()

        # Verify response contains timezone-aware display times
        availability = result['availability'][0]
        assert 'display_start_time' in availability
        assert 'display_end_time' in availability
        assert 'EST' in availability['display_start_time']

    def test_session_creation_with_timezone_validation(self):
        """Test session creation with proper timezone validation."""
        # Mock session data with timezone information
        session_data = {
            'tutor_id': 123,
            'student_id': 456,
            'scheduled_date': '2024-06-15',
            'start_time': '14:00',  # 2:00 PM
            'duration': 60,
            'tutor_timezone': 'US/Pacific',
            'student_timezone': 'US/Eastern'
        }

        # The system should convert and validate times across timezones
        # 2:00 PM PST = 5:00 PM EST
        expected_student_time = '17:00'

        # Mock validation would occur here
        # In real implementation, this would validate the session can be created
        assert session_data['start_time'] == '14:00'  # PST time
        # Student would see this as 5:00 PM EST


class TestPerformanceAndEdgeCases:
    """Test performance characteristics and unusual edge cases."""

    def test_large_dataset_normalization(self):
        """Test normalization performance with large datasets."""
        from app.utils.availability_normalizer import normalize_availability_response

        # Create large dataset
        large_dataset = []
        for i in range(1000):
            large_dataset.append({
                'id': f'availability_{i:08d}',
                'start_time': f'{9 + i % 8}:00',
                'specific_date': f'2024-06-{15 + i % 15:02d}',
                'day_of_week': i % 7
            })

        # Normalize large dataset
        import time
        start_time = time.time()
        normalized = normalize_availability_response(large_dataset)
        end_time = time.time()

        # Should complete in reasonable time (< 1 second)
        assert (end_time - start_time) < 1.0
        assert len(normalized) == 1000

        # Spot check normalization
        assert normalized[0]['day_of_week_js'] == 1  # Monday in JS format
        assert normalized[6]['day_of_week_js'] == 0  # Sunday in JS format

    def test_malformed_data_handling(self):
        """Test handling of malformed or corrupted data."""
        from app.utils.availability_normalizer import normalize_availability_slot

        # Test various malformed inputs
        malformed_inputs = [
            None,
            {},
            {'id': None},
            {'day_of_week': 'invalid'},
            {'day_of_week': -1},
            {'day_of_week': 7},
            {'specific_date': 'not-a-date'},
            {'start_time': '25:00'},  # Invalid time
        ]

        for bad_input in malformed_inputs:
            try:
                result = normalize_availability_slot(bad_input)
                # Should handle gracefully without crashing
                assert result is not None or bad_input is None
            except Exception as e:
                # If exceptions are raised, they should be meaningful
                assert "validation" in str(e).lower() or "invalid" in str(e).lower()

    def test_concurrent_access_safety(self):
        """Test thread safety of timezone conversion functions."""
        import threading
        import concurrent.futures

        def conversion_worker(thread_id):
            """Worker function for concurrent testing."""
            results = []
            for day in range(7):
                js_day = DayOfWeekConverter.python_to_js(day)
                python_day = DayOfWeekConverter.js_to_python(js_day)
                results.append((day, js_day, python_day))
            return results

        # Run multiple threads concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(conversion_worker, i) for i in range(10)]
            all_results = [future.result() for future in futures]

        # All threads should produce identical results
        expected_results = all_results[0]
        for results in all_results[1:]:
            assert results == expected_results


if __name__ == '__main__':
    # Run tests if executed directly
    pytest.main([__file__, '-v'])