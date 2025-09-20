#!/usr/bin/env python3
"""
Test script for new academic country and grade level fields in student signup
"""

import requests
import json
import sys

# Test configuration
BASE_URL = "http://localhost:5000"  # Adjust if your app runs on different port
REGISTER_URL = f"{BASE_URL}/api/auth/register"

def test_student_registration_with_new_fields():
    """Test student registration with academic country and grade level fields"""
    
    # Test data for different countries
    test_cases = [
        {
            "name": "USA Student",
            "data": {
                "email": "test_usa_student@example.com",
                "password": "testpassword123",
                "accountType": "student",
                "academicCountry": "USA",
                "gradeLevel": "Grade 5",
                "profile": {
                    "name": "John Doe"
                }
            },
            "expected_grade": "Grade 5",
            "expected_country": "USA"
        },
        {
            "name": "UK Student", 
            "data": {
                "email": "test_uk_student@example.com",
                "password": "testpassword123",
                "accountType": "student", 
                "academicCountry": "United Kingdom",
                "gradeLevel": "Year 7",
                "profile": {
                    "name": "Jane Smith"
                }
            },
            "expected_grade": "Year 7",
            "expected_country": "United Kingdom"
        },
        {
            "name": "Canada Student",
            "data": {
                "email": "test_canada_student@example.com", 
                "password": "testpassword123",
                "accountType": "student",
                "academicCountry": "Canada",
                "gradeLevel": "Year 10",
                "profile": {
                    "name": "Alex Johnson"
                }
            },
            "expected_grade": "Year 10",
            "expected_country": "Canada"
        }
    ]
    
    print("Testing student registration with new academic country and grade level fields...\n")
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"Test {i}: {test_case['name']}")
        print(f"Testing registration for: {test_case['data']['email']}")
        
        try:
            # Make registration request
            response = requests.post(
                REGISTER_URL,
                json=test_case['data'],
                headers={'Content-Type': 'application/json'}
            )
            
            print(f"Response Status: {response.status_code}")
            
            if response.status_code == 201:
                # Registration successful
                response_data = response.json()
                user = response_data.get('user', {})
                
                print(f"✅ Registration successful!")
                print(f"User ID: {user.get('id')}")
                print(f"Academic Country: {user.get('academicCountry', 'NOT FOUND')}")
                print(f"Grade Level: {user.get('grade', 'NOT FOUND')}")
                
                # Verify the fields are correct
                if user.get('academicCountry') == test_case['expected_country']:
                    print(f"✅ Academic Country matches expected: {test_case['expected_country']}")
                else:
                    print(f"❌ Academic Country mismatch. Expected: {test_case['expected_country']}, Got: {user.get('academicCountry')}")
                
                if user.get('grade') == test_case['expected_grade']:
                    print(f"✅ Grade Level matches expected: {test_case['expected_grade']}")
                else:
                    print(f"❌ Grade Level mismatch. Expected: {test_case['expected_grade']}, Got: {user.get('grade')}")
                    
            else:
                # Registration failed
                print(f"❌ Registration failed")
                print(f"Response: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Could not connect to server at {BASE_URL}")
            print("Make sure the Flask app is running!")
            return False
        except Exception as e:
            print(f"❌ Error during test: {str(e)}")
            
        print("-" * 50)
    
    return True

def test_backward_compatibility():
    """Test that registration still works without the new fields"""
    print("\nTesting backward compatibility (registration without new fields)...")
    
    test_data = {
        "email": "test_legacy_student@example.com",
        "password": "testpassword123", 
        "accountType": "student",
        "profile": {
            "name": "Legacy Student",
            "grade": "Year 8"  # Old format
        }
    }
    
    try:
        response = requests.post(
            REGISTER_URL,
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 201:
            response_data = response.json()
            user = response_data.get('user', {})
            
            print(f"✅ Legacy registration successful!")
            print(f"Academic Country: {user.get('academicCountry', 'EMPTY (Expected)')}")
            print(f"Grade Level: {user.get('grade', 'NOT FOUND')}")
            
            # Should fall back to old grade field
            if user.get('grade') == "Year 8":
                print(f"✅ Backward compatibility working - old grade field used")
            else:
                print(f"❌ Backward compatibility issue - expected 'Year 8', got: {user.get('grade')}")
                
        else:
            print(f"❌ Legacy registration failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error during backward compatibility test: {str(e)}")

if __name__ == "__main__":
    print("=" * 60)
    print("TESTING ACADEMIC COUNTRY AND GRADE LEVEL SIGNUP FIELDS")
    print("=" * 60)
    
    # Run tests
    success = test_student_registration_with_new_fields()
    if success:
        test_backward_compatibility()
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("Make sure to clean up test users from the database if needed.")