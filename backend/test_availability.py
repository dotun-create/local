#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, Course, Availability

app = create_app()

with app.app_context():
    print("=== Testing Tutor Availability Data ===")
    
    # Get the course
    course = Course.query.get('course_b8fab90a')
    if not course:
        print("Course not found!")
        sys.exit(1)
    
    print(f"Course: {course.title}")
    print(f"Number of tutors: {len(course.tutors)}")
    
    # Check each tutor
    for tutor in course.tutors:
        print(f"\n--- Tutor: {tutor.profile.get('name', tutor.email)} (ID: {tutor.id}) ---")
        print(f"Account type: {tutor.account_type}")
        
        # Get availability records
        availability_records = Availability.query.filter_by(tutor_id=tutor.id).all()
        print(f"Availability records: {len(availability_records)}")
        
        for record in availability_records:
            print(f"  Day {record.day_of_week}: {record.start_time}-{record.end_time} (Available: {record.available})")
    
    # Check admin user
    admin = User.query.get('admin_6da09a6a')
    if admin:
        print(f"\n--- Admin User ---")
        print(f"Email: {admin.email}")
        print(f"Account type: {admin.account_type}")
    else:
        print("\nAdmin user not found!")