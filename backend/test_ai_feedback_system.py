#!/usr/bin/env python3
"""
Test script for AI Feedback System
This script validates key components of the AI feedback workflow
"""

import os
import sys
import requests
import json
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Base URL for the API (adjust port if needed)
BASE_URL = "http://127.0.0.1:5001/api"

def test_health_check():
    """Test basic API health"""
    try:
        response = requests.get("http://127.0.0.1:5001/health", timeout=5)
        if response.status_code == 200:
            print("✅ API Health Check: PASSED")
            return True
        else:
            print(f"❌ API Health Check: FAILED (Status: {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ API Health Check: FAILED ({e})")
        return False

def test_admin_endpoints():
    """Test admin endpoints for AI prompt management"""
    try:
        # Note: This would need actual authentication in production
        headers = {'Content-Type': 'application/json'}
        
        # Test getting AI prompts
        response = requests.get(f"{BASE_URL}/admin/prompts", headers=headers, timeout=5)
        
        if response.status_code in [200, 401, 403]:  # 401/403 expected without auth
            print("✅ Admin Prompts Endpoint: ACCESSIBLE")
            return True
        else:
            print(f"❌ Admin Prompts Endpoint: UNEXPECTED STATUS ({response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Admin Prompts Endpoint: FAILED ({e})")
        return False

def test_notification_endpoints():
    """Test notification endpoints"""
    try:
        headers = {'Content-Type': 'application/json'}
        
        # Test getting notification preferences
        response = requests.get(f"{BASE_URL}/notifications/preferences", headers=headers, timeout=5)
        
        if response.status_code in [200, 401, 403]:  # 401/403 expected without auth
            print("✅ Notification Preferences Endpoint: ACCESSIBLE")
            return True
        else:
            print(f"❌ Notification Preferences Endpoint: UNEXPECTED STATUS ({response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Notification Preferences Endpoint: FAILED ({e})")
        return False

def test_guardian_feedback_endpoint():
    """Test guardian feedback endpoint"""
    try:
        headers = {'Content-Type': 'application/json'}
        
        # Test getting guardian feedback (will fail without auth, but endpoint should exist)
        response = requests.get(f"{BASE_URL}/admin/guardian-feedback/test-guardian-id", headers=headers, timeout=5)
        
        if response.status_code in [200, 401, 403, 404]:  # All expected without proper auth
            print("✅ Guardian Feedback Endpoint: ACCESSIBLE")
            return True
        else:
            print(f"❌ Guardian Feedback Endpoint: UNEXPECTED STATUS ({response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Guardian Feedback Endpoint: FAILED ({e})")
        return False

def test_system_configuration():
    """Test system configuration endpoint"""
    try:
        headers = {'Content-Type': 'application/json'}
        
        # Test getting system configuration
        response = requests.get(f"{BASE_URL}/admin/system-config", headers=headers, timeout=5)
        
        if response.status_code in [200, 401, 403]:  # 401/403 expected without auth
            print("✅ System Configuration Endpoint: ACCESSIBLE")
            return True
        else:
            print(f"❌ System Configuration Endpoint: UNEXPECTED STATUS ({response.status_code})")
            return False
    except Exception as e:
        print(f"❌ System Configuration Endpoint: FAILED ({e})")
        return False

def test_session_processor_status():
    """Test session processor status endpoint"""
    try:
        headers = {'Content-Type': 'application/json'}
        
        # Test getting session processor status
        response = requests.get(f"{BASE_URL}/admin/session-processor/status", headers=headers, timeout=5)
        
        if response.status_code in [200, 401, 403]:  # 401/403 expected without auth
            print("✅ Session Processor Status Endpoint: ACCESSIBLE")
            return True
        else:
            print(f"❌ Session Processor Status Endpoint: UNEXPECTED STATUS ({response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Session Processor Status Endpoint: FAILED ({e})")
        return False

def test_ai_service_validation():
    """Test AI service validation endpoint"""
    try:
        headers = {'Content-Type': 'application/json'}
        
        # Test AI service validation
        response = requests.get(f"{BASE_URL}/admin/ai-service/validate", headers=headers, timeout=5)
        
        if response.status_code in [200, 401, 403]:  # 401/403 expected without auth
            print("✅ AI Service Validation Endpoint: ACCESSIBLE")
            return True
        else:
            print(f"❌ AI Service Validation Endpoint: UNEXPECTED STATUS ({response.status_code})")
            return False
    except Exception as e:
        print(f"❌ AI Service Validation Endpoint: FAILED ({e})")
        return False

def test_database_models():
    """Test if the database models can be imported"""
    try:
        from app.models import Session, User, StudentSessionFeedback, AIPrompt, SystemConfig, Notification
        print("✅ Database Models: IMPORTABLE")
        return True
    except Exception as e:
        print(f"❌ Database Models: IMPORT FAILED ({e})")
        return False

def test_services():
    """Test if the services can be imported"""
    try:
        from app.services.ai_service import ai_service
        from app.services.zoom_service import zoom_service
        from app.services.session_processor import session_processor
        from app.services.notification_service import notification_service
        print("✅ AI Feedback Services: IMPORTABLE")
        return True
    except Exception as e:
        print(f"❌ AI Feedback Services: IMPORT FAILED ({e})")
        return False

def test_email_helper():
    """Test if email helper can be imported"""
    try:
        from app.utils.email_helper import send_email, send_simple_email
        print("✅ Email Helper: IMPORTABLE")
        return True
    except Exception as e:
        print(f"❌ Email Helper: IMPORT FAILED ({e})")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting AI Feedback System Tests")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health_check),
        ("Database Models", test_database_models),
        ("AI Services", test_services),
        ("Email Helper", test_email_helper),
        ("Admin Endpoints", test_admin_endpoints),
        ("Notification Endpoints", test_notification_endpoints),
        ("Guardian Feedback Endpoint", test_guardian_feedback_endpoint),
        ("System Configuration", test_system_configuration),
        ("Session Processor Status", test_session_processor_status),
        ("AI Service Validation", test_ai_service_validation),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n🔍 Testing: {test_name}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name}: EXCEPTION ({e})")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:<35} {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    if passed == total:
        print("🎉 All tests passed! The AI feedback system appears to be working correctly.")
        return True
    else:
        print(f"⚠️  {total - passed} test(s) failed. Please check the failed components.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)