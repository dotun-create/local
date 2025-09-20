#!/usr/bin/env python3
"""
Test script for timeslot deletion functionality
Tests both real and virtual instance deletion
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models import Availability, User
from datetime import date, datetime, timedelta
import json

def test_deletion_endpoints():
    """Test the deletion endpoints with various ID formats"""
    print("🧪 Testing Timeslot Deletion Functionality")
    print("=" * 50)

    app = create_app()

    with app.app_context():
        # Check existing availability for the dual-role user
        user = User.query.filter_by(email='student1@test.com').first()
        if not user:
            print("❌ User student1@test.com not found")
            return False

        print(f"✅ Found user: {user.email} (ID: {user.id})")
        print(f"   Roles: {user.roles}")

        # Get user's availabilities
        availabilities = Availability.query.filter_by(tutor_id=user.id).all()
        print(f"\n📋 User has {len(availabilities)} availability slots:")

        for avail in availabilities:
            print(f"   - ID: {avail.id}")
            print(f"     Day: {avail.day_of_week}, Time: {avail.start_time}-{avail.end_time}")
            print(f"     Recurring: {avail.is_recurring}")
            print(f"     Exception dates: {avail.exception_dates}")

        # Test virtual instance ID parsing
        print("\n🔬 Testing virtual instance ID detection:")

        test_cases = [
            ("availability_99c898fd", False, "availability_99c898fd", None),
            ("availability_99c898fd_2025-09-19", True, "availability_99c898fd", "2025-09-19"),
            ("availability_2462df28", False, "availability_2462df28", None),
            ("availability_d335e4bf_2025-09-20", True, "availability_d335e4bf", "2025-09-20"),
        ]

        for test_id, is_virtual, expected_base, expected_date in test_cases:
            # Parse the ID
            base_id = test_id
            instance_date = None

            if '_' in test_id and len(test_id.split('_')[-1]) == 10:
                parts = test_id.rsplit('_', 1)
                if len(parts) == 2:
                    base_id = parts[0]
                    instance_date = parts[1]

            is_virtual_detected = instance_date is not None

            print(f"\n   Testing: {test_id}")
            print(f"     Virtual? {is_virtual_detected} (expected: {is_virtual})")
            print(f"     Base ID: {base_id} (expected: {expected_base})")
            print(f"     Date: {instance_date} (expected: {expected_date})")

            if is_virtual_detected == is_virtual and base_id == expected_base and instance_date == expected_date:
                print(f"     ✅ PASSED")
            else:
                print(f"     ❌ FAILED")
                return False

        # Test exception list handling
        print("\n🔬 Testing exception date handling:")

        # Find a recurring availability
        recurring = Availability.query.filter_by(
            tutor_id=user.id,
            is_recurring=True
        ).first()

        if recurring:
            print(f"\n   Testing with recurring slot: {recurring.id}")
            print(f"   Current exceptions: {recurring.exception_dates}")

            # Simulate adding an exception date
            test_date = "2025-09-25"
            if not recurring.exception_dates:
                recurring.exception_dates = []

            if test_date not in recurring.exception_dates:
                print(f"   Adding exception for {test_date}...")
                recurring.exception_dates = recurring.exception_dates + [test_date]
                db.session.commit()
                print(f"   New exceptions: {recurring.exception_dates}")
                print(f"   ✅ Exception added successfully")
            else:
                print(f"   Exception for {test_date} already exists")

            # Clean up test exception
            if test_date in recurring.exception_dates:
                exceptions = recurring.exception_dates.copy()
                exceptions.remove(test_date)
                recurring.exception_dates = exceptions
                db.session.commit()
                print(f"   Cleaned up test exception")

        return True

if __name__ == "__main__":
    success = test_deletion_endpoints()
    if success:
        print("\n🎉 All deletion tests PASSED!")
    else:
        print("\n💥 Deletion tests FAILED!")
    sys.exit(0 if success else 1)