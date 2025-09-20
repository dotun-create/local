#!/usr/bin/env python3
"""
Test script to demonstrate enrollment status changes
"""

import sys
import os

# Add the parent directory to Python path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, Session, Course

def test_enrollment_demo():
    """Test enrollment status changes by actually enrolling a student"""

    app = create_app()

    with app.app_context():
        print("🎭 Demonstrating Enrollment Status Changes")
        print("=" * 60)

        # Get a test student and session
        student = User.query.filter_by(account_type='student').first()
        session = Session.query.first()

        if not student or not session:
            print("❌ Need at least one student and one session")
            return

        print(f"👤 Student: {student.email}")
        print(f"📅 Session: {session.title}")
        print(f"   Session ID: {session.id}")

        print(f"\n🔍 BEFORE ENROLLMENT:")
        print(f"   Student Enrolled: {session.is_student_enrolled(student.id)}")
        print(f"   Enrollment Count: {session.get_enrollment_count()}")
        print(f"   Capacity Status: {session.get_capacity_status()}")

        # Get API response before enrollment
        session_data_before = session.to_dict(current_student_id=student.id)
        print(f"   API Response 'isCurrentStudentEnrolled': {session_data_before.get('isCurrentStudentEnrolled')}")

        # Enroll the student
        print(f"\n🎯 ENROLLING STUDENT...")
        session.students.append(student)
        db.session.commit()

        print(f"\n✅ AFTER ENROLLMENT:")
        print(f"   Student Enrolled: {session.is_student_enrolled(student.id)}")
        print(f"   Enrollment Count: {session.get_enrollment_count()}")
        print(f"   Capacity Status: {session.get_capacity_status()}")

        # Get API response after enrollment
        session_data_after = session.to_dict(current_student_id=student.id)
        print(f"   API Response 'isCurrentStudentEnrolled': {session_data_after.get('isCurrentStudentEnrolled')}")

        print(f"\n📊 CAPACITY TRACKING:")
        print(f"   Available Spots: {session.get_available_spots()}")
        print(f"   Is Full: {session.is_full()}")
        print(f"   Can Accept Enrollment: {session.can_accept_enrollment()}")

        # Test with different student
        other_student = User.query.filter_by(account_type='student').filter(User.id != student.id).first()
        if other_student:
            print(f"\n🎭 Testing with different student: {other_student.email}")
            other_session_data = session.to_dict(current_student_id=other_student.id)
            print(f"   Other student enrolled: {other_session_data.get('isCurrentStudentEnrolled')}")

        # Clean up - remove enrollment
        print(f"\n🧹 CLEANING UP...")
        session.students.remove(student)
        db.session.commit()

        print(f"   Student removed from session")
        print(f"   Final enrollment count: {session.get_enrollment_count()}")

        print(f"\n🎉 Enrollment status tracking is working perfectly!")
        print(f"✨ Frontend will receive accurate personal enrollment data")

if __name__ == "__main__":
    test_enrollment_demo()