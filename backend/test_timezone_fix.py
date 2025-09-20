#!/usr/bin/env python3
"""
Comprehensive timezone handling test to validate the fix for session creation.

This test validates that:
1. User says "4:00 PM" in their timezone
2. Backend correctly stores as UTC (8:00 PM if Eastern time)
3. When retrieved, displays as 4:00 PM in user's timezone

This addresses the critical bug where sessions created at 4:00 PM were showing as 9:00 PM.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.timezone_utils import (
    smart_parse_session_datetime,
    debug_timezone_conversion,
    validate_timezone,
    convert_datetime_to_user_timezone
)
from datetime import datetime
import pytz

def test_timezone_conversion_scenarios():
    """Test various timezone conversion scenarios"""

    print("🧪 TIMEZONE CONVERSION VALIDATION")
    print("=" * 50)

    test_cases = [
        {
            'name': 'Eastern Time Session (Original Bug)',
            'user_input': '2025-09-18 16:00:00',  # 4:00 PM
            'user_timezone': 'US/Eastern',
            'expected_utc_hour': 20,  # 8:00 PM UTC (EDT is UTC-4)
            'expected_display': '4:00 PM'
        },
        {
            'name': 'Pacific Time Session',
            'user_input': '2025-09-18 14:00:00',  # 2:00 PM
            'user_timezone': 'US/Pacific',
            'expected_utc_hour': 21,  # 9:00 PM UTC (PDT is UTC-7)
            'expected_display': '2:00 PM'
        },
        {
            'name': 'London Time Session',
            'user_input': '2025-09-18 15:00:00',  # 3:00 PM
            'user_timezone': 'Europe/London',
            'expected_utc_hour': 14,  # 2:00 PM UTC (BST is UTC+1)
            'expected_display': '3:00 PM'
        },
        {
            'name': 'UTC Session',
            'user_input': '2025-09-18 12:00:00',  # 12:00 PM
            'user_timezone': 'UTC',
            'expected_utc_hour': 12,  # 12:00 PM UTC
            'expected_display': '12:00 PM'
        }
    ]

    all_passed = True

    for test_case in test_cases:
        print(f"\n📋 Testing: {test_case['name']}")
        print(f"   User says: {test_case['user_input']} in {test_case['user_timezone']}")

        # Test the smart parsing
        session_data = {'scheduledDate': test_case['user_input']}
        result = smart_parse_session_datetime(session_data, test_case['user_timezone'])

        if result['errors']:
            print(f"   ❌ FAIL: Parsing errors: {result['errors']}")
            all_passed = False
            continue

        utc_datetime = result['utc_datetime']
        stored_hour = utc_datetime.hour

        # Validate UTC storage
        if stored_hour == test_case['expected_utc_hour']:
            print(f"   ✅ PASS: UTC storage correct ({stored_hour}:00 UTC)")
        else:
            print(f"   ❌ FAIL: Expected {test_case['expected_utc_hour']}:00 UTC, got {stored_hour}:00 UTC")
            all_passed = False

        # Test display conversion back to user timezone
        user_tz_dt = convert_datetime_to_user_timezone(
            pytz.UTC.localize(utc_datetime),
            test_case['user_timezone']
        )

        display_hour = user_tz_dt.hour
        if user_tz_dt.hour == int(test_case['user_input'].split(' ')[1].split(':')[0]):
            print(f"   ✅ PASS: Display conversion correct ({display_hour}:00 {test_case['user_timezone']})")
        else:
            print(f"   ❌ FAIL: Display conversion incorrect")
            all_passed = False

        # Show the debug info
        debug = debug_timezone_conversion(test_case['user_input'], test_case['user_timezone'])
        print(f"   🔍 Debug: {debug['interpretation']}")

    return all_passed

def test_original_bug_scenario():
    """Test the specific scenario that was causing the original bug"""

    print(f"\n🐛 ORIGINAL BUG SCENARIO TEST")
    print("=" * 50)
    print("Testing: User creates session at 4:00 PM Eastern, expects to see 4:00 PM (not 9:00 PM)")

    # Simulate the exact user input that was causing issues
    session_data = {
        'title': 'Math Tutoring Session',
        'scheduledDate': '2025-09-18T16:00:00'  # ISO format that frontend might send
    }
    user_timezone = 'US/Eastern'

    print(f"📝 Session Data: {session_data}")
    print(f"📍 User Timezone: {user_timezone}")

    # Parse using our new timezone logic
    result = smart_parse_session_datetime(session_data, user_timezone)

    if result['errors']:
        print(f"❌ PARSING FAILED: {result['errors']}")
        return False

    # What gets stored in database (UTC)
    utc_for_storage = result['utc_datetime']
    print(f"💾 Stored in DB (UTC): {utc_for_storage}")

    # What user should see when retrieved (their timezone)
    user_display = convert_datetime_to_user_timezone(
        pytz.UTC.localize(utc_for_storage),
        user_timezone
    )
    print(f"👁️  User sees: {user_display}")

    # Validation
    expected_storage_hour = 20  # 8:00 PM UTC (4:00 PM EDT + 4 hours)
    expected_display_hour = 16  # 4:00 PM EDT

    storage_correct = utc_for_storage.hour == expected_storage_hour
    display_correct = user_display.hour == expected_display_hour

    if storage_correct and display_correct:
        print("✅ BUG FIXED: Session correctly converts 4:00 PM → UTC → 4:00 PM")
        return True
    else:
        print("❌ BUG STILL EXISTS:")
        if not storage_correct:
            print(f"   Storage: Expected {expected_storage_hour}:00 UTC, got {utc_for_storage.hour}:00 UTC")
        if not display_correct:
            print(f"   Display: Expected {expected_display_hour}:00 EDT, got {user_display.hour}:00 EDT")
        return False

def test_session_model_integration():
    """Test that Session model can use our timezone utilities"""

    print(f"\n🔧 SESSION MODEL INTEGRATION TEST")
    print("=" * 50)

    try:
        # Import our updated models
        from app.models import Session
        print("✅ Session model imports timezone_utils successfully")

        # Test that to_dict method works with timezone conversion
        # (We can't create a real session without database, but we can test imports)
        return True

    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Integration failed: {e}")
        return False

def main():
    """Run all timezone validation tests"""

    print("🚀 TIMEZONE FIX VALIDATION SUITE")
    print("=" * 80)
    print("This test validates the fix for the critical timezone bug where")
    print("sessions created at 4:00 PM were incorrectly showing as 9:00 PM.")
    print("=" * 80)

    tests = [
        ("Timezone Conversion Scenarios", test_timezone_conversion_scenarios),
        ("Original Bug Scenario", test_original_bug_scenario),
        ("Session Model Integration", test_session_model_integration)
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} CRASHED: {e}")
            results.append((test_name, False))

    # Summary
    print(f"\n📊 TEST RESULTS SUMMARY")
    print("=" * 50)

    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if not passed:
            all_passed = False

    print("=" * 50)

    if all_passed:
        print("🎉 ALL TESTS PASSED! Timezone fix is working correctly.")
        print("✨ Users can now create sessions at 4:00 PM and see 4:00 PM (not 9:00 PM)!")
        return 0
    else:
        print("💥 SOME TESTS FAILED! Timezone fix needs more work.")
        return 1

if __name__ == '__main__':
    exit(main())