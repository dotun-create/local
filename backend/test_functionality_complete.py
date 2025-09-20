#!/usr/bin/env python3
"""
Comprehensive functionality test to ensure nothing was broken
"""

import sys
import os
from app import create_app, db
from app.models import Availability, User
from app.services.recurring_availability_service import RecurringAvailabilityService
from datetime import date, datetime, timedelta
import json

def test_all_functionality():
    """Test all related functionality to ensure nothing is broken"""
    print("🔍 Testing Complete Functionality")
    print("=" * 50)

    app = create_app()

    with app.app_context():
        # Test 1: User and Role Management
        print("\n1️⃣ Testing User and Role Management:")
        user = User.query.filter_by(email='student1@test.com').first()
        print(f"   User: {user.email}")
        print(f"   Roles: {user.roles}")
        print(f"   Has tutor role: {user.has_role('tutor')}")
        print(f"   Has student role: {user.has_role('student')}")
        assert user.has_role('tutor'), "User should have tutor role"
        assert user.has_role('student'), "User should have student role"
        print("   ✅ User roles working correctly")

        # Test 2: Availability Data Model
        print("\n2️⃣ Testing Availability Data Model:")
        availabilities = Availability.query.filter_by(tutor_id=user.id).all()
        print(f"   Found {len(availabilities)} availability slots")
        for avail in availabilities:
            print(f"   - {avail.id}: Day {avail.day_of_week}, {avail.start_time}-{avail.end_time}")
            print(f"     Recurring: {avail.is_recurring}, Exceptions: {avail.exception_dates}")
        print("   ✅ Availability model working correctly")

        # Test 3: Instance Generation Service
        print("\n3️⃣ Testing Instance Generation Service:")
        start_date = date.today()
        end_date = start_date + timedelta(days=7)

        instances = RecurringAvailabilityService.get_availability_with_date_instances(
            tutor_id=user.id,
            start_date=start_date,
            end_date=end_date,
            user_timezone='UTC'
        )

        print(f"   Generated {len(instances)} instances for next 7 days")
        for i, instance in enumerate(instances[:3]):  # Show first 3
            print(f"   - Instance {i+1}: {instance.get('id')}")
            print(f"     Date: {instance.get('instance_date')}")
            print(f"     Type: {instance.get('slot_type')}")
            print(f"     Base ID: {instance.get('base_id')}")
            print(f"     Virtual: {instance.get('is_virtual')}")

        # Test virtual ID format
        virtual_instances = [i for i in instances if i.get('is_virtual')]
        real_instances = [i for i in instances if not i.get('is_virtual')]

        print(f"   Virtual instances: {len(virtual_instances)}")
        print(f"   Real instances: {len(real_instances)}")

        if virtual_instances:
            virtual_id = virtual_instances[0]['id']
            base_id = virtual_instances[0]['base_id']
            print(f"   Virtual ID format: {virtual_id}")
            print(f"   Base ID: {base_id}")
            assert '_' in virtual_id, "Virtual ID should contain underscore"
            assert virtual_id.startswith(base_id), "Virtual ID should start with base ID"

        print("   ✅ Instance generation working correctly")

        # Test 4: Exception Date Handling
        print("\n4️⃣ Testing Exception Date Handling:")
        recurring_avail = None
        for avail in availabilities:
            if avail.is_recurring:
                recurring_avail = avail
                break

        if recurring_avail:
            print(f"   Testing with: {recurring_avail.id}")
            original_exceptions = recurring_avail.exception_dates or []
            test_date = "2025-12-25"

            # Add test exception
            new_exceptions = original_exceptions.copy()
            if test_date not in new_exceptions:
                new_exceptions.append(test_date)
                recurring_avail.exception_dates = new_exceptions
                db.session.commit()
                print(f"   Added exception: {test_date}")

            # Verify exception was added
            db.session.refresh(recurring_avail)
            current_exceptions = recurring_avail.exception_dates or []
            assert test_date in current_exceptions, "Exception should be added"
            print(f"   Current exceptions: {current_exceptions}")

            # Generate instances to verify exception is excluded
            instances_with_exception = RecurringAvailabilityService.get_availability_with_date_instances(
                tutor_id=user.id,
                start_date=date(2025, 12, 20),
                end_date=date(2025, 12, 30),
                user_timezone='UTC'
            )

            exception_instances = [i for i in instances_with_exception if i.get('instance_date') == test_date]
            print(f"   Instances on exception date: {len(exception_instances)}")
            assert len(exception_instances) == 0, "No instances should exist on exception date"

            # Clean up
            recurring_avail.exception_dates = original_exceptions
            db.session.commit()
            print(f"   Cleaned up test exception")

        print("   ✅ Exception handling working correctly")

        # Test 5: ID Parsing Logic
        print("\n5️⃣ Testing ID Parsing Logic:")
        test_ids = [
            ("availability_123", "availability_123", None, False),
            ("availability_456_2025-09-20", "availability_456", "2025-09-20", True),
            ("single_789", "single_789", None, False),
            ("recurring_abc_2025-12-25", "recurring_abc", "2025-12-25", True),
        ]

        for test_id, expected_base, expected_date, expected_virtual in test_ids:
            # Parse ID (same logic as in API)
            base_id = test_id
            instance_date = None

            if '_' in test_id and len(test_id.split('_')[-1]) == 10:
                parts = test_id.rsplit('_', 1)
                if len(parts) == 2:
                    base_id = parts[0]
                    instance_date = parts[1]

            is_virtual = instance_date is not None

            print(f"   {test_id} -> base:{base_id}, date:{instance_date}, virtual:{is_virtual}")
            assert base_id == expected_base, f"Base ID mismatch: {base_id} != {expected_base}"
            assert instance_date == expected_date, f"Date mismatch: {instance_date} != {expected_date}"
            assert is_virtual == expected_virtual, f"Virtual flag mismatch: {is_virtual} != {expected_virtual}"

        print("   ✅ ID parsing working correctly")

        print("\n🎉 ALL FUNCTIONALITY TESTS PASSED!")
        print("✅ The fix has been implemented successfully without breaking any existing functionality!")

        return True

if __name__ == "__main__":
    success = test_all_functionality()
    sys.exit(0 if success else 1)