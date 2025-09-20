#!/usr/bin/env python3
"""
Test script to verify timezone inheritance functionality in module creation
"""

import requests
import json

# Test configuration
BASE_URL = "http://localhost:5000"
ADMIN_EMAIL = "admin@troupe.academy"
ADMIN_PASSWORD = "admin123"  # Default admin password
COURSE_ID = "course_f28f2264"  # Year 9 Maths course

def login_admin():
    """Login as admin and get JWT token"""
    login_url = f"{BASE_URL}/api/auth/login"
    login_data = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }

    response = requests.post(login_url, json=login_data)
    if response.status_code == 200:
        return response.json().get('access_token')
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def get_course_details(token, course_id):
    """Get course details to check timezone"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/courses/{course_id}", headers=headers)

    if response.status_code == 200:
        course_data = response.json()
        print(f"Course: {course_data['course']['title']}")
        print(f"Course Timezone: {course_data['course']['timezone']}")
        return course_data['course']
    else:
        print(f"Failed to get course: {response.status_code} - {response.text}")
        return None

def create_test_module(token, course_id):
    """Create a test module to verify timezone inheritance"""
    headers = {"Authorization": f"Bearer {token}"}
    module_data = {
        "courseId": course_id,
        "title": "Test Timezone Module",
        "description": "Testing timezone inheritance from course",
        "startDate": "2025-09-20",
        "endDate": "2025-09-27"
        # NOTE: Not providing timezone - should inherit from course
    }

    response = requests.post(f"{BASE_URL}/api/modules", headers=headers, json=module_data)

    if response.status_code == 201:
        module_info = response.json()
        print(f"\nModule Created Successfully!")
        print(f"Module ID: {module_info['module']['id']}")
        print(f"Module Title: {module_info['module']['title']}")
        print(f"Module Timezone: {module_info['module']['timezone']}")
        print(f"Start Time: {module_info['module']['startTime']}")
        print(f"End Time: {module_info['module']['endTime']}")
        return module_info['module']
    else:
        print(f"Failed to create module: {response.status_code} - {response.text}")
        return None

def main():
    print("=== Testing Module Timezone Inheritance ===")

    # Step 1: Login as admin
    print("\n1. Logging in as admin...")
    token = login_admin()
    if not token:
        print("Failed to login - cannot continue test")
        return
    print("✓ Admin login successful")

    # Step 2: Get course details
    print(f"\n2. Getting course details for {COURSE_ID}...")
    course = get_course_details(token, COURSE_ID)
    if not course:
        print("Failed to get course - cannot continue test")
        return

    # Step 3: Create module without timezone (should inherit)
    print(f"\n3. Creating module without timezone (should inherit '{course['timezone']}')...")
    module = create_test_module(token, COURSE_ID)
    if not module:
        print("Failed to create module")
        return

    # Step 4: Verify timezone inheritance
    print(f"\n4. Verifying timezone inheritance...")
    expected_timezone = course['timezone']
    actual_timezone = module['timezone']

    if actual_timezone == expected_timezone:
        print(f"✅ SUCCESS: Module inherited timezone '{actual_timezone}' from course")
    else:
        print(f"❌ FAILURE: Expected timezone '{expected_timezone}', got '{actual_timezone}'")

    # Step 5: Verify default times
    expected_start_time = "00:00:00"
    expected_end_time = "23:59:59"
    actual_start_time = module['startTime']
    actual_end_time = module['endTime']

    print(f"\n5. Verifying default time boundaries...")
    if actual_start_time == expected_start_time and actual_end_time == expected_end_time:
        print(f"✅ SUCCESS: Default times set correctly (start: {actual_start_time}, end: {actual_end_time})")
    else:
        print(f"❌ FAILURE: Expected times {expected_start_time}-{expected_end_time}, got {actual_start_time}-{actual_end_time}")

    print(f"\n=== Test Complete ===")

if __name__ == "__main__":
    main()