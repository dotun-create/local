#!/usr/bin/env python3
"""
Comprehensive Test Suite for Timezone Fix
Tests the new timezone conversion functionality with various scenarios
"""

import pytest
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, Availability, Session
from timezone_utils import (
    convert_availability_display_times_v2,
    convert_availability_display_times_legacy,
    convert_availability_display_times,
    convert_local_to_local,
    detect_storage_format
)
from datetime import datetime
import json


@pytest.fixture(scope='module')
def app():
    """Create application for testing"""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['TIMEZONE_FIX_ENABLED'] = False  # Default to legacy for comparison

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def app_context(app):
    """Create application context"""
    with app.app_context():
        yield app


class TestTimezoneConversionFix:
    """Test the timezone conversion fix"""

    def test_chicago_timezone_issue_fix(self):
        """Test the specific reported bug: 17:00 Chicago → 17:00 display"""
        availability_data = {
            'id': 'test-chicago-1',
            'start_time': '17:00',
            'end_time': '18:00',
            'time_zone': 'America/Chicago',
            'timezone_storage_format': 'local'
        }

        # Test: Same timezone should show same time
        result = convert_availability_display_times_v2(availability_data, 'America/Chicago')

        assert result['display_start_time'] == '17:00'
        assert result['display_end_time'] == '18:00'
        assert result['display_timezone'] == 'America/Chicago'
        assert result['storage_format_detected'] == 'local'

    def test_chicago_timezone_legacy_bug(self):
        """Test that legacy function shows the bug (22:00 display)"""
        availability_data = {
            'id': 'test-chicago-legacy',
            'start_time': '17:00',
            'end_time': '18:00',
            'time_zone': 'America/Chicago'
        }

        # Legacy function should show the bug (incorrect conversion)
        result = convert_availability_display_times_legacy(availability_data, 'America/Chicago')

        # This demonstrates the bug - it incorrectly converts
        # 17:00 Chicago (stored as local) thinking it's UTC
        # So it shows 12:00 (17:00 UTC - 5 hours for Chicago CDT)
        assert result['display_start_time'] != '17:00'  # Bug: shows wrong time
        assert result['display_end_time'] != '18:00'    # Bug: shows wrong time

    def test_cross_timezone_conversion(self):
        """Test conversion between different timezones"""
        availability_data = {
            'id': 'test-cross-tz',
            'start_time': '14:00',
            'end_time': '15:00',
            'time_zone': 'America/New_York',  # EST/EDT
            'timezone_storage_format': 'local'
        }

        # Convert from New York to Chicago (1 hour behind)
        result = convert_availability_display_times_v2(availability_data, 'America/Chicago')

        assert result['display_start_time'] == '13:00'  # 2 PM EST = 1 PM CST
        assert result['display_end_time'] == '14:00'    # 3 PM EST = 2 PM CST
        assert result['display_timezone'] == 'America/Chicago'

    def test_utc_storage_format(self):
        """Test handling of UTC-stored times"""
        availability_data = {
            'id': 'test-utc-storage',
            'start_time': '22:00',  # 10 PM UTC
            'end_time': '23:00',    # 11 PM UTC
            'time_zone': 'UTC',
            'timezone_storage_format': 'utc'
        }

        # Convert UTC to Chicago time
        result = convert_availability_display_times_v2(availability_data, 'America/Chicago')

        # 22:00 UTC should be 17:00 CDT (during daylight time) or 16:00 CST
        # This will depend on the date used in conversion
        assert result['display_start_time'] in ['16:00', '17:00']
        assert result['display_timezone'] == 'America/Chicago'
        assert result['storage_format_detected'] == 'utc'

    def test_storage_format_detection(self):
        """Test automatic detection of storage format"""
        # Test explicit marking
        local_data = {
            'start_time': '17:00',
            'time_zone': 'America/Chicago',
            'timezone_storage_format': 'local'
        }
        assert detect_storage_format(local_data) == 'local'

        utc_data = {
            'start_time': '22:00',
            'time_zone': 'UTC',
            'timezone_storage_format': 'utc'
        }
        assert detect_storage_format(utc_data) == 'utc'

        # Test heuristic detection (working hours suggest local)
        working_hours_data = {
            'start_time': '09:00',  # 9 AM - typical working hour
            'time_zone': 'America/Chicago'
        }
        assert detect_storage_format(working_hours_data) == 'local'

        # Test edge case
        edge_data = {
            'start_time': '03:00',  # 3 AM - unusual hour
            'time_zone': 'America/Chicago'
        }
        assert detect_storage_format(edge_data) == 'unknown'

    def test_local_to_local_conversion(self):
        """Test direct local timezone conversion"""
        # 5 PM Chicago = 6 PM New York (Eastern is 1 hour ahead)
        result = convert_local_to_local('17:00', 'America/Chicago', 'America/New_York', '2025-09-01')
        assert result == '18:00'

        # 2 PM London = 9 AM New York (London is 5 hours ahead during EDT)
        result = convert_local_to_local('14:00', 'Europe/London', 'America/New_York', '2025-09-01')
        assert result == '09:00'

        # Same timezone should return same time
        result = convert_local_to_local('10:00', 'America/Chicago', 'America/Chicago', '2025-09-01')
        assert result == '10:00'

    def test_feature_flag_switching(self, app_context):
        """Test feature flag switching between legacy and fixed versions"""
        availability_data = {
            'id': 'test-feature-flag',
            'start_time': '17:00',
            'end_time': '18:00',
            'time_zone': 'America/Chicago',
            'timezone_storage_format': 'local'
        }

        # Test with feature flag OFF (legacy)
        app_context.config['TIMEZONE_FIX_ENABLED'] = False
        legacy_result = convert_availability_display_times(availability_data, 'America/Chicago')

        # Test with feature flag ON (fixed)
        app_context.config['TIMEZONE_FIX_ENABLED'] = True
        fixed_result = convert_availability_display_times(availability_data, 'America/Chicago')

        # Fixed version should show correct time
        assert fixed_result['display_start_time'] == '17:00'
        assert fixed_result['display_end_time'] == '18:00'

        # Results should be different (demonstrating the fix)
        assert legacy_result['display_start_time'] != fixed_result['display_start_time']

    def test_dst_handling(self):
        """Test Daylight Saving Time transitions"""
        # Test during DST (summer)
        summer_data = {
            'start_time': '17:00',
            'end_time': '18:00',
            'time_zone': 'America/Chicago',
            'timezone_storage_format': 'local'
        }

        summer_result = convert_availability_display_times_v2(summer_data, 'America/New_York')
        # Chicago CDT (UTC-5) to New York EDT (UTC-4) = +1 hour
        assert summer_result['display_start_time'] == '18:00'

        # Test during standard time (winter)
        # Note: This test assumes winter date handling in the conversion
        winter_data = {
            'start_time': '17:00',
            'end_time': '18:00',
            'time_zone': 'America/Chicago',
            'timezone_storage_format': 'local',
            'instance_date': '2025-01-01'  # Winter date
        }

        winter_result = convert_availability_display_times_v2(winter_data, 'America/New_York')
        # Chicago CST (UTC-6) to New York EST (UTC-5) = +1 hour
        assert winter_result['display_start_time'] == '18:00'

    def test_edge_cases(self):
        """Test edge cases and error handling"""
        # Missing time fields
        incomplete_data = {
            'id': 'incomplete',
            'time_zone': 'America/Chicago'
        }
        result = convert_availability_display_times_v2(incomplete_data, 'America/Chicago')
        assert result == incomplete_data  # Should return unchanged

        # Invalid timezone
        invalid_tz_data = {
            'start_time': '17:00',
            'end_time': '18:00',
            'time_zone': 'Invalid/Timezone',
            'timezone_storage_format': 'local'
        }
        # Should handle gracefully without crashing
        result = convert_availability_display_times_v2(invalid_tz_data, 'America/Chicago')
        # Should still have display fields even if conversion fails
        assert 'display_start_time' in result

    def test_multiple_timezones(self):
        """Test conversion across multiple world timezones"""
        base_data = {
            'start_time': '12:00',  # Noon
            'end_time': '13:00',    # 1 PM
            'time_zone': 'UTC',
            'timezone_storage_format': 'local'
        }

        # Test various target timezones
        timezones_and_expected = [
            ('America/New_York', ['07:00', '08:00']),  # EST/EDT
            ('America/Los_Angeles', ['04:00', '05:00']), # PST/PDT
            ('Europe/London', ['12:00', '13:00']),      # GMT/BST (could be same as UTC)
            ('Asia/Tokyo', ['21:00']),                   # JST (9 hours ahead)
            ('Australia/Sydney', ['22:00', '23:00'])     # AEST/AEDT (10-11 hours ahead)
        ]

        for target_tz, expected_hours in timezones_and_expected:
            result = convert_availability_display_times_v2(base_data, target_tz)
            # Check if display time is one of the expected values (accounting for DST variations)
            assert any(result['display_start_time'].startswith(hour) for hour in expected_hours), \
                f"Expected one of {expected_hours} for {target_tz}, got {result['display_start_time']}"


class TestSessionManagementCompatibility:
    """Test that session management functionality remains unchanged"""

    def test_session_model_timezone_unchanged(self, app_context):
        """Test that Session model timezone handling is preserved"""
        # Create a test session
        session = Session(
            id='test-session-1',
            title='Test Session',
            scheduled_date=datetime(2025, 9, 16, 17, 0),  # 5 PM
            timezone='America/Chicago',
            tutor_id='test-tutor-1',
            duration=60
        )

        # Test to_dict method with timezone
        session_dict = session.to_dict(user_timezone='America/New_York')

        # Should have all expected fields
        assert 'scheduledDate' in session_dict
        assert 'timezone' in session_dict
        assert 'displayTimezone' in session_dict

        # Timezone fields should be preserved
        assert session_dict['timezone'] == 'America/Chicago'

    def test_api_response_format_unchanged(self, app_context):
        """Test that API response format remains consistent"""
        # This test verifies that the session API response structure
        # is not affected by the timezone fix

        # Mock availability data as it would come from database
        availability_data = {
            'id': 'test-availability-api',
            'start_time': '17:00',
            'end_time': '18:00',
            'time_zone': 'America/Chicago',
            'timezone_storage_format': 'local'
        }

        # Process with fixed function
        result = convert_availability_display_times_v2(availability_data, 'America/Chicago')

        # Verify expected API response fields are present
        required_fields = [
            'display_start_time',
            'display_end_time',
            'display_timezone',
            'original_timezone',
            'display_time_range'
        ]

        for field in required_fields:
            assert field in result, f"Missing required field: {field}"

        # Verify field types
        assert isinstance(result['display_start_time'], str)
        assert isinstance(result['display_end_time'], str)
        assert isinstance(result['display_timezone'], str)


class TestRegressionPrevention:
    """Test that the fix doesn't break existing functionality"""

    def test_backwards_compatibility(self):
        """Test that the fix works with data in various formats"""
        # Test with old format data (no explicit storage format)
        old_format_data = {
            'start_time': '17:00',
            'end_time': '18:00',
            'time_zone': 'America/Chicago'
            # No timezone_storage_format field
        }

        # Should handle gracefully
        result = convert_availability_display_times_v2(old_format_data, 'America/Chicago')
        assert 'display_start_time' in result
        assert 'storage_format_detected' in result

    def test_data_preservation(self):
        """Test that original data is preserved in results"""
        original_data = {
            'id': 'preserve-test',
            'start_time': '17:00',
            'end_time': '18:00',
            'time_zone': 'America/Chicago',
            'timezone_storage_format': 'local',
            'custom_field': 'custom_value'
        }

        result = convert_availability_display_times_v2(original_data, 'America/Chicago')

        # Original fields should be preserved
        assert result['id'] == 'preserve-test'
        assert result['start_time'] == '17:00'
        assert result['end_time'] == '18:00'
        assert result['time_zone'] == 'America/Chicago'
        assert result['custom_field'] == 'custom_value'

        # New fields should be added
        assert 'display_start_time' in result
        assert 'display_end_time' in result
        assert 'storage_format_detected' in result


def test_comprehensive_scenario():
    """Test a comprehensive real-world scenario"""
    print("\n🧪 Running comprehensive timezone fix scenario test...")

    # Scenario: Tutor in Chicago sets availability 5-6 PM
    # Student in New York should see 6-7 PM
    # Student in Los Angeles should see 3-4 PM

    chicago_availability = {
        'id': 'real-world-test',
        'start_time': '17:00',  # 5 PM Chicago
        'end_time': '18:00',    # 6 PM Chicago
        'time_zone': 'America/Chicago',
        'timezone_storage_format': 'local'
    }

    # Test conversions
    chicago_view = convert_availability_display_times_v2(chicago_availability, 'America/Chicago')
    new_york_view = convert_availability_display_times_v2(chicago_availability, 'America/New_York')
    la_view = convert_availability_display_times_v2(chicago_availability, 'America/Los_Angeles')

    print(f"Chicago tutor sets: {chicago_availability['start_time']}-{chicago_availability['end_time']} {chicago_availability['time_zone']}")
    print(f"Chicago student sees: {chicago_view['display_start_time']}-{chicago_view['display_end_time']}")
    print(f"New York student sees: {new_york_view['display_start_time']}-{new_york_view['display_end_time']}")
    print(f"LA student sees: {la_view['display_start_time']}-{la_view['display_end_time']}")

    # Assertions
    assert chicago_view['display_start_time'] == '17:00'  # Same timezone, same time
    assert new_york_view['display_start_time'] == '18:00'  # Eastern is 1 hour ahead
    assert la_view['display_start_time'] == '15:00'       # Pacific is 2 hours behind

    print("✅ Comprehensive scenario test passed!")


if __name__ == '__main__':
    # Run comprehensive scenario test
    test_comprehensive_scenario()

    # Run pytest
    pytest.main([__file__, '-v'])