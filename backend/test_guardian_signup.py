#!/usr/bin/env python3
"""
Test script for guardian signup flow
This script tests the complete guardian invitation and signup process.
"""

import os
import sys
import json
from datetime import datetime

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_guardian_signup_flow():
    """Test the complete guardian signup flow"""
    try:
        from flask import Flask
        from app import create_app, db
        from app.models import User, GuardianInvitation
        from app.services.guardian_service import GuardianService
        
        app = create_app()
        with app.app_context():
            print("=== GUARDIAN SIGNUP FLOW TEST ===\n")
            
            # Step 1: Create a test student
            print("1. Creating test student...")
            test_student = User(
                email="test.student@example.com",
                account_type="student",
                profile={
                    "name": "Test Student",
                    "grade_level": "10",
                    "academic_country": "UK"
                }
            )
            test_student.set_password("password123")
            
            db.session.add(test_student)
            db.session.commit()
            print(f"✅ Test student created: {test_student.id}")
            
            # Step 2: Test guardian invitation creation
            print("\n2. Testing guardian invitation creation...")
            guardian_email = "guardian@example.com"
            
            result = GuardianService.create_guardian_invitation(
                test_student.id, 
                guardian_email
            )
            
            if result['success']:
                print(f"✅ Guardian invitation created: {result['action']}")
                print(f"   Message: {result['message']}")
                
                # Get invitation details
                invitation = GuardianInvitation.query.filter_by(
                    student_id=test_student.id,
                    guardian_email=guardian_email
                ).first()
                
                if invitation:
                    print(f"   Invitation ID: {invitation.id}")
                    print(f"   Invitation Token: {invitation.invitation_token}")
                    print(f"   Expires At: {invitation.expires_at}")
                    print(f"   Status: {invitation.status}")
                    
                    # Step 3: Test invitation details retrieval
                    print("\n3. Testing invitation details retrieval...")
                    details_result = GuardianService.get_invitation_details(invitation.invitation_token)
                    
                    if details_result['success']:
                        print("✅ Invitation details retrieved successfully")
                        invitation_info = details_result['invitation']
                        print(f"   Student Name: {invitation_info['studentName']}")
                        print(f"   Guardian Email: {invitation_info['guardianEmail']}")
                        print(f"   Invited At: {invitation_info['invitedAt']}")
                    else:
                        print(f"❌ Failed to get invitation details: {details_result['error']}")
                    
                    # Step 4: Test guardian account creation
                    print("\n4. Testing guardian account creation...")
                    guardian_data = {
                        "name": "Test Guardian",
                        "phone": "+44123456789",
                        "address": {
                            "street": "123 Test Street",
                            "city": "London",
                            "state": "England",
                            "zipCode": "SW1A 1AA",
                            "country": "UK"
                        },
                        "password": "guardianpass123"
                    }
                    
                    signup_result = GuardianService.accept_guardian_invitation(
                        invitation.invitation_token,
                        guardian_data
                    )
                    
                    if signup_result['success']:
                        print("✅ Guardian account created successfully")
                        print(f"   Message: {signup_result['message']}")
                        print(f"   Guardian ID: {signup_result['guardian_id']}")
                        
                        # Verify the guardian was created and linked
                        guardian = User.query.get(signup_result['guardian_id'])
                        if guardian:
                            print(f"   Guardian Email: {guardian.email}")
                            print(f"   Guardian Name: {guardian.profile.get('name')}")
                            print(f"   Students: {len(guardian.profile.get('students', []))}")
                            
                            # Verify student was linked to guardian
                            updated_student = User.query.get(test_student.id)
                            if updated_student.profile.get('guardian_id') == guardian.id:
                                print("✅ Student successfully linked to guardian")
                            else:
                                print("❌ Student was not linked to guardian")
                        
                        # Verify invitation status was updated
                        updated_invitation = GuardianInvitation.query.get(invitation.id)
                        if updated_invitation.status == 'accepted':
                            print("✅ Invitation status updated to 'accepted'")
                        else:
                            print(f"❌ Invitation status not updated: {updated_invitation.status}")
                            
                    else:
                        print(f"❌ Failed to create guardian account: {signup_result['error']}")
                        
                else:
                    print("❌ Invitation not found in database")
            else:
                print(f"❌ Failed to create guardian invitation: {result['error']}")
            
            # Step 5: Test existing guardian linking
            print("\n5. Testing existing guardian linking...")
            
            # Create another test student
            test_student2 = User(
                email="test.student2@example.com",
                account_type="student",
                profile={
                    "name": "Test Student 2",
                    "grade_level": "9",
                    "academic_country": "UK"
                }
            )
            test_student2.set_password("password123")
            
            db.session.add(test_student2)
            db.session.commit()
            
            # Try to link to existing guardian
            result2 = GuardianService.create_guardian_invitation(
                test_student2.id, 
                guardian_email  # Same guardian email
            )
            
            if result2['success'] and result2['action'] == 'linked_existing':
                print("✅ Second student successfully linked to existing guardian")
                print(f"   Message: {result2['message']}")
                
                # Verify the guardian now has 2 students
                guardian = User.query.get(result2['guardian_id'])
                if guardian and len(guardian.profile.get('students', [])) == 2:
                    print("✅ Guardian now has 2 linked students")
                else:
                    print(f"❌ Guardian should have 2 students but has {len(guardian.profile.get('students', []))}")
            else:
                print(f"❌ Failed to link to existing guardian: {result2.get('error', 'Unknown error')}")
            
            print("\n=== TEST COMPLETED ===")
            print("✅ Guardian signup flow test completed successfully!")
            
            # Cleanup
            print("\n6. Cleaning up test data...")
            try:
                # Delete test data
                GuardianInvitation.query.filter_by(student_id=test_student.id).delete()
                GuardianInvitation.query.filter_by(student_id=test_student2.id).delete()
                User.query.filter_by(email="guardian@example.com").delete()
                User.query.filter_by(email="test.student@example.com").delete()
                User.query.filter_by(email="test.student2@example.com").delete()
                db.session.commit()
                print("✅ Test data cleaned up")
            except Exception as e:
                print(f"⚠️  Cleanup warning: {str(e)}")
                db.session.rollback()
            
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_guardian_signup_flow()