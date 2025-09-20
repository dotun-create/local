#!/usr/bin/env python3
"""
Test script to verify the lesson sessions API returns correct enrollment status
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, Session, Course, Lesson

def test_lesson_sessions_api():
    """Test the lesson sessions API endpoint"""

    app = create_app()

    with app.app_context():
        print("🔧 Testing Lesson Sessions API")
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

        print(f"\n🎯 SIMULATING API CALL: /api/lessons/{lesson.id}/sessions")
        print("-" * 60)

        # Get all sessions for this lesson
        lesson_sessions = Session.query.filter_by(lesson_id=lesson.id).all()
        print(f"📊 Found {len(lesson_sessions)} sessions for this lesson")

        for i, session in enumerate(lesson_sessions):
            # Simulate what the API returns (with current_student_id)
            session_data = session.to_dict(current_student_id=student2.id)

            print(f"\n📅 Session {i+1}: {session.title} (ID: {session.id})")
            print(f"   📋 API Response Fields:")
            print(f"      - isCurrentStudentEnrolled: {session_data.get('isCurrentStudentEnrolled')}")
            print(f"      - enrollmentCount: {session_data.get('enrollmentCount')}")
            print(f"      - maxStudents: {session_data.get('maxStudents')}")
            print(f"      - capacityStatus: {session_data.get('capacityStatus')}")
            print(f"      - scheduled_date: {session_data.get('scheduled_date')}")

        print(f"\n🧪 FRONTEND FILTER SIMULATION:")
        print("-" * 40)

        # Simulate the frontend getCategoryChildren logic
        for i, session in enumerate(lesson_sessions):
            session_data = session.to_dict(current_student_id=student2.id)
            is_enrolled = session_data.get('isCurrentStudentEnrolled', False)

            # Check if session would appear in Sessions category (our updated logic)
            # Updated filter: !isSessionInPast(session) && !session.isCurrentStudentEnrolled
            # For now, assuming no sessions are in past
            would_show_in_sessions = not is_enrolled
            would_show_in_booked = is_enrolled

            print(f"📅 Session {i+1}: {session.title}")
            print(f"   ▶️ Would show in 'Sessions' category: {would_show_in_sessions}")
            print(f"   📋 Would show in 'Booked Sessions' category: {would_show_in_booked}")

        print(f"\n✅ EXPECTED BEHAVIOR:")
        print(f"   - Sessions with isCurrentStudentEnrolled=True should ONLY appear in 'Booked Sessions'")
        print(f"   - Sessions with isCurrentStudentEnrolled=False should ONLY appear in 'Sessions'")
        print(f"   - No session should appear in both categories")

if __name__ == "__main__":
    test_lesson_sessions_api()