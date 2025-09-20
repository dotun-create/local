#!/usr/bin/env python3
"""
Direct test of the TutorQualificationService requalification fix
"""
import sys
import os
from app import create_app, db
from app.services.tutor_qualification_service import TutorQualificationService
from app.models import User, TutorQualification
import json

def test_requalification():
    """Test the requalification logic directly"""
    print("🧪 Testing Tutor Requalification Fix")
    print("=" * 50)

    # Create app context
    app = create_app()

    with app.app_context():
        # Check initial state
        print("Step 1: Check initial user state...")
        user = User.query.filter_by(email='student1@test.com').first()
        if not user:
            print("❌ User student1@test.com not found")
            return False

        print(f"✅ Found user: {user.email}")
        print(f"   Account Type: {user.account_type}")
        print(f"   Roles: {user.roles}")
        print(f"   Status: {user.status}")

        # Check qualification state
        qual = TutorQualification.query.filter_by(
            user_id=user.id,
            course_id='course_f28f2264'
        ).first()

        if qual:
            print(f"   Qualification exists: {qual.id}")
            print(f"   Is Active: {qual.is_active}")
            print(f"   Revoked At: {qual.revoked_at}")
            print(f"   Revoke Reason: {qual.revoke_reason}")
        else:
            print("   No qualification found")

        # Test the service
        print("\nStep 2: Testing TutorQualificationService...")
        service = TutorQualificationService()

        result = service.manually_qualify_tutor(
            email='student1@test.com',
            course_id='course_f28f2264',
            admin_user_id='admin_55f93738',
            reason='Direct service test - requalification fix'
        )

        print(f"\nService result:")
        print(json.dumps(result, indent=2, default=str))

        if result.get('success'):
            print("\n✅ Service call succeeded!")

            # Check final state
            print("\nStep 3: Check final user state...")
            # Refresh user from database
            db.session.refresh(user)
            print(f"   Account Type: {user.account_type}")
            print(f"   Roles: {user.roles}")
            print(f"   Status: {user.status}")

            # Check qualification state
            qual = TutorQualification.query.filter_by(
                user_id=user.id,
                course_id='course_f28f2264'
            ).first()

            if qual:
                print(f"   Qualification: {qual.id}")
                print(f"   Is Active: {qual.is_active}")
                print(f"   Qualified At: {qual.qualified_at}")
                print(f"   Revoked At: {qual.revoked_at}")
                print(f"   Revoke Reason: {qual.revoke_reason}")

                # Check if user now has tutor role
                if user.has_role('tutor'):
                    print("\n🎉 SUCCESS: User now has tutor role!")
                    print(f"Final roles: {user.roles}")
                    return True
                else:
                    print("\n❌ FAILED: User still doesn't have tutor role")
                    print(f"Current roles: {user.roles}")
                    return False
            else:
                print("   ❌ No qualification found after service call")
                return False
        else:
            print(f"\n❌ Service call failed: {result.get('error')}")
            return False

if __name__ == "__main__":
    success = test_requalification()
    if success:
        print("\n🎉 Requalification test PASSED!")
        print("The user should now have dual student/tutor roles!")
    else:
        print("\n💥 Requalification test FAILED!")
    sys.exit(0 if success else 1)