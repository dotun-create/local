#!/usr/bin/env python3
"""
Debug script to trace exactly what the frontend sees when calling the lesson sessions API
"""

import sys
import os
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, Session, Course, Lesson

def debug_frontend_flow():
    """Debug what the frontend actually receives"""

    app = create_app()

    with app.app_context():
        print("🐛 DEBUGGING FRONTEND ISSUE")
        print("=" * 60)

        # Find student2 and trigonometry lesson
        student2 = User.query.filter_by(email='student2@test.com').first()
        if not student2:
            print("❌ No student2 found")
            return

        lesson = Lesson.query.filter(Lesson.title.like('%Trigonometry%')).first()
        if not lesson:
            print("❌ No Trigonometry lesson found")
            return

        print(f"👤 Student: {student2.email} (ID: {student2.id})")
        print(f"📚 Lesson: {lesson.title} (ID: {lesson.id})")

        print(f"\n🔧 SIMULATING EXACT API RESPONSE:")
        print("-" * 50)

        # Get sessions exactly like the API does
        sessions = Session.query.filter_by(lesson_id=lesson.id).all()

        # Simulate the exact API response structure
        api_response = {
            'sessions': [session.to_dict(current_student_id=student2.id) for session in sessions],
            'lesson_id': lesson.id,
            'lesson_title': lesson.title
        }

        print(f"📋 API Response Structure:")
        print(json.dumps(api_response, indent=2, default=str))

        print(f"\n🧪 FRONTEND PROCESSING SIMULATION:")
        print("-" * 50)

        # Simulate frontend response handling
        sessions_response = api_response
        sessions_data = sessions_response.get('sessions', [])

        print(f"📊 Frontend extracts {len(sessions_data)} sessions")

        for i, session_data in enumerate(sessions_data):
            print(f"\n📅 Session {i+1}:")
            print(f"   ID: {session_data.get('id')}")
            print(f"   Title: {session_data.get('title')}")
            print(f"   isCurrentStudentEnrolled: {session_data.get('isCurrentStudentEnrolled')}")
            print(f"   lessonId: {session_data.get('lessonId')}")

        print(f"\n🎯 FILTER LOGIC TEST:")
        print("-" * 30)

        # Test our updated filter logic
        for i, session_data in enumerate(sessions_data):
            is_enrolled = session_data.get('isCurrentStudentEnrolled', False)

            # Our filter logic: not in past AND not enrolled
            would_show_in_sessions = not is_enrolled  # Assuming not in past
            would_show_in_booked = is_enrolled

            print(f"📅 Session {i+1}: {session_data.get('title')}")
            print(f"   isCurrentStudentEnrolled: {is_enrolled}")
            print(f"   → Shows in 'Sessions': {would_show_in_sessions}")
            print(f"   → Shows in 'Booked Sessions': {would_show_in_booked}")

        print(f"\n❓ POTENTIAL ISSUES TO CHECK:")
        print("1. Are you viewing the correct lesson/module?")
        print("2. Are you logged in as student2@test.com?")
        print("3. Is the frontend cache clear?")
        print("4. Is the browser dev tools showing the correct API calls?")

if __name__ == "__main__":
    debug_frontend_flow()