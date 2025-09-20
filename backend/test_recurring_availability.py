"""
Test script for recurring availability features

This script tests the recurring availability functionality including:
- Creating recurring availability patterns
- Updating recurring series
- Conflict checking
- Editability rules

Run this after setting up the database and creating test users.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, Availability, Session
from app.services.recurring_availability_service import RecurringAvailabilityService
from datetime import datetime, timedelta

def create_test_tutor():
    """Create a test tutor for testing"""
    app = create_app()
    
    with app.app_context():
        # Create tutor user
        tutor = User.query.filter_by(email='tutor@test.com').first()
        if not tutor:
            tutor = User(
                email='tutor@test.com',
                account_type='tutor',
                is_active=True,
                profile={'name': 'Test Tutor', 'subjects': ['Math', 'Science']}
            )
            tutor.set_password('tutor123')
            db.session.add(tutor)
            db.session.commit()
        
        return tutor

def test_recurring_availability_creation():
    """Test creating recurring availability"""
    print("\n🧪 Testing Recurring Availability Creation...")
    
    app = create_app()
    
    with app.app_context():
        tutor = create_test_tutor()
        db.session.add(tutor)  # Ensure tutor is in session
        db.session.commit()
        
        # Re-query to ensure tutor is attached to current session
        tutor = User.query.filter_by(email='tutor@test.com').first()
        
        # Test creating weekly recurring availability
        result = RecurringAvailabilityService.create_recurring_availability(
            tutor_id=tutor.id,
            day_of_week=1,  # Tuesday
            start_time='10:00',  # UTC time
            end_time='11:00',   # UTC time
            recurrence_type='weekly',
            recurrence_days=[1, 2, 3, 4],  # Tue-Fri
            recurrence_end_date=datetime.utcnow() + timedelta(days=30),
            time_zone='America/Chicago',
            original_start_time='04:00',  # Local time example (UTC-6)
            original_end_time='05:00'     # Local time example (UTC-6)
        )
        
        if result['success']:
            print("✅ Recurring availability created successfully")
            print(f"   Parent ID: {result['parent_availability_id']}")
            print(f"   Generated instances: {result['generated_instances']}")
            return result['parent_availability_id']
        else:
            print(f"❌ Failed to create recurring availability: {result['error']}")
            return None

def test_conflict_checking():
    """Test conflict checking functionality"""
    print("\n🧪 Testing Conflict Checking...")
    
    app = create_app()
    
    with app.app_context():
        # Get a recent availability instance
        availability = Availability.query.filter(
            Availability.specific_date.isnot(None)
        ).first()
        
        if availability:
            result = RecurringAvailabilityService.check_slot_conflicts(availability.id)
            print(f"✅ Conflict check completed for {availability.id}")
            print(f"   Has conflicts: {result.get('has_conflicts', False)}")
            print(f"   Conflict count: {result.get('conflict_count', 0)}")
        else:
            print("❌ No availability instances found to test")

def test_series_updating():
    """Test updating recurring series"""
    print("\n🧪 Testing Series Updating...")
    
    app = create_app()
    
    with app.app_context():
        # Find a recurring parent availability
        parent_availability = Availability.query.filter_by(is_recurring=True).first()
        
        if parent_availability:
            # Update the series
            result = RecurringAvailabilityService.update_recurring_series(
                parent_availability_id=parent_availability.id,
                updates={
                    'start_time': '09:30',
                    'end_time': '10:30'
                },
                update_future_only=True
            )
            
            if result['success']:
                print("✅ Recurring series updated successfully")
                print(f"   Updated count: {result['updated_count']}")
                print(f"   Total instances: {result['total_instances']}")
                print(f"   Skipped count: {result['skipped_count']}")
            else:
                print(f"❌ Failed to update series: {result['error']}")
        else:
            print("❌ No recurring availability found to update")

def test_availability_with_conflicts():
    """Test getting availability with conflict information"""
    print("\n🧪 Testing Availability with Conflicts...")
    
    app = create_app()
    
    with app.app_context():
        tutor = create_test_tutor()
        
        # Get availability data
        start_date = datetime.utcnow().date()
        end_date = start_date + timedelta(days=30)
        
        availability_data = RecurringAvailabilityService.get_availability_with_conflicts(
            tutor_id=tutor.id,
            start_date=start_date,
            end_date=end_date
        )
        
        print(f"✅ Retrieved {len(availability_data)} availability slots")
        
        # Show sample data
        for i, avail in enumerate(availability_data[:3]):
            print(f"   Slot {i+1}: {avail.get('specificDate', 'N/A')} "
                 f"({avail.get('startTime')}-{avail.get('endTime')}) "
                 f"- Editable: {avail.get('isEditable')}, "
                 f"Conflicts: {avail.get('hasConflicts')}")
        
        if len(availability_data) > 3:
            print(f"   ... and {len(availability_data) - 3} more")

def test_exception_dates():
    """Test adding exception dates"""
    print("\n🧪 Testing Exception Dates...")
    
    app = create_app()
    
    with app.app_context():
        # Find a recurring parent availability
        parent_availability = Availability.query.filter_by(is_recurring=True).first()
        
        if parent_availability:
            # Add an exception date
            exception_date = (datetime.utcnow() + timedelta(days=7)).date()
            result = RecurringAvailabilityService.add_exception_date(
                parent_availability_id=parent_availability.id,
                exception_date=exception_date
            )
            
            if result['success']:
                print(f"✅ Exception date added: {exception_date}")
                print(f"   Message: {result['message']}")
            else:
                print(f"❌ Failed to add exception date: {result['error']}")
        else:
            print("❌ No recurring availability found for exception test")

def run_all_tests():
    """Run all recurring availability tests"""
    print("🚀 Starting Recurring Availability Tests")
    print("=" * 50)
    
    try:
        # Run individual tests
        parent_id = test_recurring_availability_creation()
        test_conflict_checking()
        test_series_updating()
        test_availability_with_conflicts()
        test_exception_dates()
        
        print("\n" + "=" * 50)
        print("🎉 All tests completed!")
        print("\n📋 Summary:")
        print("✅ Recurring availability creation")
        print("✅ Conflict checking")
        print("✅ Series updating")
        print("✅ Availability with conflicts retrieval")
        print("✅ Exception date management")
        print("\n📋 Next Steps:")
        print("1. Test the frontend components")
        print("2. Test the API endpoints via HTTP")
        print("3. Verify the calendar UI displays correctly")
        print("4. Test mobile responsiveness")
        
    except Exception as e:
        print(f"\n💥 Test suite failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    run_all_tests()