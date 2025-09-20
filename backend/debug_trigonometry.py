#!/usr/bin/env python3
"""
Debug script to check the Trigonometry session enrollment status
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, Session, Course, Lesson

def debug_trigonometry():
    """Debug the specific Trigonometry session"""

    app = create_app()

    with app.app_context():
        print("🔍 Debugging Trigonometry Session")
        print("=" * 50)

        # Find student2 and trigonometry session
        student2 = User.query.filter_by(email='student2@test.com').first()
        if not student2:
            student2 = User.query.filter_by(account_type='student').offset(1).first()

        if not student2:
            print("❌ No student2 found")
            return

        trig_session = Session.query.filter(Session.title.like('%Trigonometry%')).first()
        if not trig_session:
            print("❌ No Trigonometry session found")
            return

        print(f"👤 Student2: {student2.email} (ID: {student2.id})")
        print(f"📅 Trigonometry Session: {trig_session.title} (ID: {trig_session.id})")

        print(f"\n🔍 RAW ENROLLMENT CHECK:")
        print(f"   Direct model check - student in session.students: {student2 in trig_session.students}")
        print(f"   Session method - is_student_enrolled(): {trig_session.is_student_enrolled(student2.id)}")
        print(f"   Session enrollment count: {trig_session.get_enrollment_count()}")

        print(f"\n📋 API RESPONSE SIMULATION:")
        api_response = trig_session.to_dict(current_student_id=student2.id)
        print(f"   API isCurrentStudentEnrolled: {api_response.get('isCurrentStudentEnrolled', 'MISSING')}")
        print(f"   API enrollmentCount: {api_response.get('enrollmentCount', 'MISSING')}")
        print(f"   API capacityStatus: {api_response.get('capacityStatus', 'MISSING')}")

        print(f"\n🎯 LESSON SESSIONS API SIMULATION:")
        if trig_session.lesson_id:
            lesson = Lesson.query.get(trig_session.lesson_id)
            if lesson:
                print(f"   Lesson: {lesson.title} (ID: {lesson.id})")

                # Simulate lesson sessions API call
                lesson_sessions = Session.query.filter_by(lesson_id=lesson.id).all()
                print(f"   Sessions in lesson: {len(lesson_sessions)}")

                for i, sess in enumerate(lesson_sessions):
                    sess_data = sess.to_dict(current_student_id=student2.id)
                    is_enrolled = sess_data.get('isCurrentStudentEnrolled', False)
                    print(f"   Session {i+1}: {sess.title}")
                    print(f"      isCurrentStudentEnrolled: {is_enrolled}")
                    if sess.id == trig_session.id:
                        print(f"      🎯 THIS IS THE TRIGONOMETRY SESSION")

        print(f"\n🔧 FRONTEND EXPECTATIONS:")
        expected_enrolled = api_response.get('isCurrentStudentEnrolled', False)
        if expected_enrolled:
            print(f"   ✅ Should show: 'Join Session' button")
            print(f"   ✅ Should show: '✅ You're enrolled' badge")
            print(f"   ✅ Should auto-detect: 'booked-sessions' category")
        else:
            print(f"   ❌ Will show: 'Book Session' button")
            print(f"   ❌ Problem: Student appears enrolled but API says not enrolled")

        print(f"\n🐛 DEBUGGING ACTIONS:")
        print(f"   1. Check if student2 is actually in session.students")
        print(f"   2. Verify lesson sessions API passes correct student ID")
        print(f"   3. Check frontend button rendering logic")

if __name__ == "__main__":
    debug_trigonometry()