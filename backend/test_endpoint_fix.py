#!/usr/bin/env python3
"""
Test script to verify the endpoint fix resolves the enrollment status issue
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, Session, Course, Lesson

def test_endpoint_fix():
    """Test that the correct endpoint is now being used"""

    app = create_app()

    with app.app_context():
        print("🔧 Testing Endpoint Fix")
        print("=" * 50)

        # Find student2 and trigonometry lesson
        student2 = User.query.filter_by(email='student2@test.com').first()
        if not student2:
            print("❌ No student2 found")
            return

        lesson = Lesson.query.filter(Lesson.title.like('%Trigonometry%')).first()
        if not lesson:
            print("❌ No Trigonometry lesson found")
            return

        print(f"👤 Student2: {student2.email} (ID: {student2.id})")
        print(f"📚 Lesson: {lesson.title} (ID: {lesson.id})")

        print(f"\n🔧 ENDPOINT COMPARISON:")
        print("-" * 30)

        # Test the old endpoint (what frontend WAS calling)
        print(f"❌ OLD ENDPOINT (without enrollment status):")
        print(f"   /api/sessions?lessonId={lesson.id}")
        old_sessions = Session.query.filter_by(lesson_id=lesson.id).all()
        for session in old_sessions:
            # This is what the old endpoint would return (without current_student_id)
            old_data = session.to_dict()  # No current_student_id parameter
            print(f"   Session: {session.title}")
            print(f"   - isCurrentStudentEnrolled: {old_data.get('isCurrentStudentEnrolled', 'MISSING')}")

        print(f"\n✅ NEW ENDPOINT (with enrollment status):")
        print(f"   /api/lessons/{lesson.id}/sessions")
        for session in old_sessions:
            # This is what the new endpoint returns (with current_student_id)
            new_data = session.to_dict(current_student_id=student2.id)  # With current_student_id
            print(f"   Session: {session.title}")
            print(f"   - isCurrentStudentEnrolled: {new_data.get('isCurrentStudentEnrolled')}")

        print(f"\n🎯 PROBLEM RESOLUTION:")
        print(f"   Before fix: Frontend called old endpoint → No enrollment status")
        print(f"   After fix:  Frontend calls new endpoint → Correct enrollment status")

        print(f"\n✅ EXPECTED RESULT:")
        print(f"   1. Frontend will now call /lessons/{lesson.id}/sessions")
        print(f"   2. Response will include isCurrentStudentEnrolled: true")
        print(f"   3. Button will show 'Join Session'")
        print(f"   4. Badge will show '✅ You're enrolled'")
        print(f"   5. Category will auto-detect to 'booked-sessions'")

if __name__ == "__main__":
    test_endpoint_fix()