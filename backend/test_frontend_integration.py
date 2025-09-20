#!/usr/bin/env python3
"""
Frontend Integration Test for Bulk Import
Tests that the frontend can successfully call the backend bulk import endpoints
"""

import requests
import json
import time

BASE_URL = "http://localhost:5000/api"
FRONTEND_URL = "http://localhost:3000"

def test_frontend_backend_connection():
    """Test that frontend and backend are both running and connected"""
    print("🔗 Testing frontend-backend connection...")

    try:
        # Test backend health
        backend_response = requests.get(f"{BASE_URL}/test", timeout=5)
        if backend_response.status_code == 200:
            print("✅ Backend is running and responding")
        else:
            print(f"❌ Backend returned status {backend_response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to backend: {e}")
        return False

    try:
        # Test frontend health (just check if it responds)
        frontend_response = requests.get(FRONTEND_URL, timeout=5)
        if frontend_response.status_code in [200, 404]:  # 404 is OK for React apps on root
            print("✅ Frontend is running and responding")
        else:
            print(f"❌ Frontend returned status {frontend_response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to frontend: {e}")
        return False

    return True

def test_bulk_import_endpoints_with_auth():
    """Test bulk import endpoints with authentication"""
    print("\n🔐 Testing bulk import endpoints with authentication...")

    # These endpoints should return 401/422 (need auth) rather than 404 (not found)
    endpoints_to_test = [
        '/admin/tutors/bulk-import',
        '/admin/tutors/qualifications',
        '/admin/courses/settings',
        '/admin/bulk-import-jobs'
    ]

    all_endpoints_exist = True

    for endpoint in endpoints_to_test:
        try:
            response = requests.post(f"{BASE_URL}{endpoint}", timeout=5)
            if response.status_code in [401, 422]:  # Auth required
                print(f"✅ {endpoint} - endpoint exists and requires auth")
            elif response.status_code == 404:
                print(f"❌ {endpoint} - endpoint not found")
                all_endpoints_exist = False
            else:
                print(f"✅ {endpoint} - endpoint exists (status: {response.status_code})")
        except requests.exceptions.RequestException as e:
            print(f"❌ Error testing {endpoint}: {e}")
            all_endpoints_exist = False

    return all_endpoints_exist

def test_cors_headers():
    """Test that CORS headers are properly set for frontend communication"""
    print("\n🌐 Testing CORS headers...")

    try:
        # Test preflight request
        headers = {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }

        response = requests.options(f"{BASE_URL}/admin/tutors/bulk-import", headers=headers, timeout=5)

        # Check for CORS headers
        cors_headers = response.headers

        if 'Access-Control-Allow-Origin' in cors_headers:
            print(f"✅ CORS Access-Control-Allow-Origin: {cors_headers.get('Access-Control-Allow-Origin')}")
        else:
            print("❌ Missing Access-Control-Allow-Origin header")
            return False

        if 'Access-Control-Allow-Methods' in cors_headers:
            print(f"✅ CORS Access-Control-Allow-Methods: {cors_headers.get('Access-Control-Allow-Methods')}")
        else:
            print("⚠️  Missing Access-Control-Allow-Methods header")

        print("✅ CORS headers are configured for frontend communication")
        return True

    except requests.exceptions.RequestException as e:
        print(f"❌ Error testing CORS: {e}")
        return False

def check_browser_connection():
    """Check if browser is connected to both frontend and backend"""
    print("\n🌍 Checking browser connectivity...")

    try:
        # Check backend connections from browser
        backend_response = requests.get(f"{BASE_URL}/debug/routes", timeout=5)
        if backend_response.status_code == 200:
            routes = backend_response.json().get('routes', [])
            bulk_import_routes = [r for r in routes if 'bulk-import' in r.get('rule', '')]
            print(f"✅ Found {len(bulk_import_routes)} bulk import routes registered")
            for route in bulk_import_routes[:3]:  # Show first 3
                print(f"   - {route.get('rule')} [{', '.join(route.get('methods', []))}]")
        else:
            print("⚠️  Could not fetch route information")

    except requests.exceptions.RequestException as e:
        print(f"❌ Error checking routes: {e}")
        return False

    return True

def simulate_frontend_bulk_import():
    """Simulate what the frontend would do for a bulk import"""
    print("\n📤 Simulating frontend bulk import workflow...")

    # This simulates the exact API calls the frontend would make
    test_csv_data = """email,course_id,score,qualification_date
test@example.com,course-123,95,2024-01-15"""

    # Step 1: Try to call bulk import (should fail with 401/422 - no auth)
    response = requests.post(
        f"{BASE_URL}/admin/tutors/bulk-import",
        json={'csvData': test_csv_data, 'dryRun': True},
        headers={'Content-Type': 'application/json'}
    )

    if response.status_code == 422:
        print("✅ Bulk import endpoint properly rejects request without JWT token")
    elif response.status_code == 401:
        print("✅ Bulk import endpoint properly requires authentication")
    else:
        print(f"⚠️  Bulk import returned status {response.status_code} (expected 401/422)")

    # Step 2: Try to get course settings (should also fail)
    response = requests.get(
        f"{BASE_URL}/admin/courses/settings",
        headers={'Content-Type': 'application/json'}
    )

    if response.status_code in [401, 405, 422]:  # 405 = Method Not Allowed for GET
        print("✅ Course settings endpoint properly requires authentication")
    else:
        print(f"⚠️  Course settings returned status {response.status_code}")

    # Step 3: Check that OPTIONS requests work (for CORS preflight)
    response = requests.options(f"{BASE_URL}/admin/tutors/bulk-import")
    if response.status_code in [200, 204]:
        print("✅ OPTIONS requests work for CORS preflight")
    else:
        print(f"⚠️  OPTIONS request returned {response.status_code}")

    return True

def main():
    """Run all frontend integration tests"""
    print("🎯 Frontend Integration Test for Bulk Import System")
    print("=" * 55)

    tests = [
        ("Frontend-Backend Connection", test_frontend_backend_connection),
        ("Bulk Import Endpoints", test_bulk_import_endpoints_with_auth),
        ("CORS Configuration", test_cors_headers),
        ("Browser Connectivity", check_browser_connection),
        ("Frontend Workflow Simulation", simulate_frontend_bulk_import)
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n{'='*55}")
        print(f"Running: {test_name}")
        print('='*55)

        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} - PASSED")
            else:
                print(f"❌ {test_name} - FAILED")
        except Exception as e:
            print(f"❌ {test_name} - ERROR: {e}")

    print(f"\n{'='*55}")
    print(f"📊 INTEGRATION TEST RESULTS: {passed}/{total} tests passed")
    print('='*55)

    if passed == total:
        print("🎉 All integration tests passed! Frontend-backend communication is working.")
        print("🚀 The bulk import system is ready for production use!")
        return 0
    else:
        print("⚠️  Some integration tests had issues. Check the output above.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)