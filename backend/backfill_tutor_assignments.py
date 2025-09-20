#!/usr/bin/env python3
"""
Backfill script to assign existing qualified tutors to their courses.
This script adds all users with active TutorQualification records to the course_tutors table.
"""

import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import TutorQualification, User, Course

def backfill_tutor_assignments():
    """
    Backfill existing qualified tutors to course_tutors table
    """
    app = create_app()

    with app.app_context():
        print("Starting backfill of tutor assignments...")

        # Get all active tutor qualifications
        qualifications = TutorQualification.query.filter_by(is_active=True).all()

        print(f"Found {len(qualifications)} active tutor qualifications")

        assignments_added = 0
        assignments_existing = 0

        for qual in qualifications:
            user = qual.user
            course = qual.course

            # Check if assignment already exists
            if course in user.taught_courses:
                assignments_existing += 1
                print(f"  ✓ {user.email} already assigned to {course.title}")
            else:
                # Add assignment
                user.taught_courses.append(course)
                assignments_added += 1
                print(f"  + Added {user.email} to {course.title}")

        # Commit all changes
        try:
            db.session.commit()
            print(f"\n✅ Backfill completed successfully!")
            print(f"   - Assignments added: {assignments_added}")
            print(f"   - Assignments already existing: {assignments_existing}")
            print(f"   - Total qualifications processed: {len(qualifications)}")
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error during backfill: {str(e)}")
            return False

        return True

def verify_backfill():
    """
    Verify that all active qualifications have corresponding course assignments
    """
    app = create_app()

    with app.app_context():
        print("\nVerifying backfill results...")

        qualifications = TutorQualification.query.filter_by(is_active=True).all()
        mismatches = 0

        for qual in qualifications:
            user = qual.user
            course = qual.course

            if course not in user.taught_courses:
                print(f"  ❌ MISMATCH: {user.email} qualified for {course.title} but not assigned")
                mismatches += 1

        if mismatches == 0:
            print(f"  ✅ All {len(qualifications)} active qualifications have corresponding assignments")
        else:
            print(f"  ❌ Found {mismatches} mismatches out of {len(qualifications)} qualifications")

        return mismatches == 0

if __name__ == "__main__":
    print("=" * 60)
    print("TUTOR ASSIGNMENT BACKFILL SCRIPT")
    print("=" * 60)

    # Run backfill
    success = backfill_tutor_assignments()

    if success:
        # Verify results
        verify_backfill()
    else:
        print("Backfill failed, skipping verification")

    print("\nScript completed.")