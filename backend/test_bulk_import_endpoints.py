#!/usr/bin/env python3
"""
Simple test script to verify bulk import endpoints work
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5000/api"

def test_endpoint_existence():
    """Test that the bulk import endpoints are available"""
    print("🔍 Testing endpoint existence...")

    # Test endpoints that should return 401 (auth required) rather than 404 (not found)
    endpoints = [
        '/admin/tutors/bulk-import',
        '/admin/courses/settings',
        '/admin/tutors/qualifications',
        '/admin/bulk-import-jobs'
    ]

    for endpoint in endpoints:
        try:
            response = requests.post(f"{BASE_URL}{endpoint}")
            if response.status_code == 422:  # Unprocessable Entity (no JWT)
                print(f"✅ {endpoint} - endpoint exists (needs auth)")
            elif response.status_code == 401:  # Unauthorized
                print(f"✅ {endpoint} - endpoint exists (needs auth)")
            elif response.status_code == 404:  # Not found
                print(f"❌ {endpoint} - endpoint not found")
                return False
            else:
                print(f"✅ {endpoint} - endpoint exists (status: {response.status_code})")
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to backend at {BASE_URL}")
            return False
        except Exception as e:
            print(f"❌ Error testing {endpoint}: {e}")
            return False

    return True

def test_csv_parser():
    """Test the CSV parser utility"""
    print("\n📄 Testing CSV parser...")

    try:
        from app.utils.csv_parser import CSVParser

        parser = CSVParser()

        # Test valid CSV
        valid_csv = """email,course_id,score,qualification_date
student1@example.com,course-1,92,2024-01-15
student2@example.com,course-2,88,2024-01-10"""

        valid_records, errors = parser.parse_csv_text(valid_csv)

        if len(valid_records) == 2 and len(errors) == 0:
            print("✅ CSV parser handles valid data correctly")
        else:
            print(f"❌ CSV parser failed: {len(valid_records)} records, {len(errors)} errors")
            return False

        # Test invalid CSV
        invalid_csv = """email,course_id,score,qualification_date
invalid-email,course-1,92,2024-01-15
student2@example.com,course-2,150,2024-01-10"""

        invalid_records, invalid_errors = parser.parse_csv_text(invalid_csv)

        if len(invalid_errors) > 0:
            print("✅ CSV parser correctly identifies errors")
        else:
            print("❌ CSV parser should have found errors")
            return False

        return True

    except ImportError as e:
        print(f"❌ Cannot import CSV parser: {e}")
        return False
    except Exception as e:
        print(f"❌ CSV parser test failed: {e}")
        return False

def test_models():
    """Test that models can be imported and created"""
    print("\n📊 Testing database models...")

    try:
        from app.models import BulkImportJob, TutorQualification, CourseSettings
        print("✅ All models imported successfully")

        # Test BulkImportJob model
        job = BulkImportJob()
        job_dict = job.to_dict()
        if 'id' in job_dict and 'jobStatus' in job_dict:
            print("✅ BulkImportJob model works correctly")
        else:
            print("❌ BulkImportJob model to_dict() failed")
            return False

        return True

    except ImportError as e:
        print(f"❌ Cannot import models: {e}")
        return False
    except Exception as e:
        print(f"❌ Model test failed: {e}")
        return False

def test_service():
    """Test the tutor qualification service"""
    print("\n🔧 Testing tutor qualification service...")

    try:
        from app.services.tutor_qualification_service import TutorQualificationService

        service = TutorQualificationService()
        print("✅ TutorQualificationService created successfully")

        # Test CSV parser integration
        if hasattr(service, 'csv_parser'):
            print("✅ Service has CSV parser integration")
        else:
            print("❌ Service missing CSV parser")
            return False

        return True

    except ImportError as e:
        print(f"❌ Cannot import service: {e}")
        return False
    except Exception as e:
        print(f"❌ Service test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing Bulk Import Implementation\n")

    tests = [
        ("Endpoint Existence", test_endpoint_existence),
        ("CSV Parser", test_csv_parser),
        ("Database Models", test_models),
        ("Service Layer", test_service)
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Running: {test_name}")
        print('='*50)

        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} - PASSED")
            else:
                print(f"❌ {test_name} - FAILED")
        except Exception as e:
            print(f"❌ {test_name} - ERROR: {e}")

    print(f"\n{'='*50}")
    print(f"📊 TEST RESULTS: {passed}/{total} tests passed")
    print('='*50)

    if passed == total:
        print("🎉 All tests passed! Bulk import implementation is ready.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above.")
        return 1

if __name__ == "__main__":
    # Add the backend directory to Python path
    import sys
    import os
    backend_path = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, backend_path)

    exit_code = main()
    sys.exit(exit_code)