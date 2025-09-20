"""
Test script for password management features

This script tests the admin password reset and viewing functionality.
Run this after setting up the database and creating test users.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, AdminAction, PasswordResetToken, PasswordViewAudit
from app.services.admin_security_service import AdminSecurityService
from app.services.admin_password_reset_service import AdminPasswordResetService

def create_test_users():
    """Create test users for testing"""
    app = create_app()
    
    with app.app_context():
        # Create admin user
        admin_user = User.query.filter_by(email='admin@test.com').first()
        if not admin_user:
            admin_user = User(
                email='admin@test.com',
                account_type='admin',
                is_active=True,
                profile={'name': 'Test Admin'}
            )
            admin_user.set_password('admin123', store_plaintext=True)
            db.session.add(admin_user)
        
        # Create student user
        student_user = User.query.filter_by(email='student@test.com').first()
        if not student_user:
            student_user = User(
                email='student@test.com',
                account_type='student',
                is_active=True,
                profile={'name': 'Test Student'}
            )
            student_user.set_password('student123', store_plaintext=True)
            db.session.add(student_user)
        
        db.session.commit()
        
        # Create vault entries for pending passwords
        admin_user.create_pending_vault_entry()
        student_user.create_pending_vault_entry()
        db.session.commit()
        
        # Re-query to ensure objects are attached to session
        admin_user = User.query.filter_by(email='admin@test.com').first()
        student_user = User.query.filter_by(email='student@test.com').first()
        
        return admin_user, student_user

def test_secure_session():
    """Test secure session creation"""
    print("\n🧪 Testing Secure Session Creation...")
    
    app = create_app()
    
    with app.app_context():
        admin_user, _ = create_test_users()
        
        # Test valid password
        result = AdminSecurityService.initiate_secure_session(
            admin_user.id, 'admin123'
        )
        
        if result['success']:
            print("✅ Secure session created successfully")
            print(f"   Session token: {result['session_token'][:20]}...")
            print(f"   Expires at: {result['expires_at']}")
            
            # Test session verification
            is_valid = AdminSecurityService.verify_secure_session(
                admin_user.id, result['session_token']
            )
            print(f"✅ Session verification: {'PASSED' if is_valid else 'FAILED'}")
            
            return result['session_token']
        else:
            print(f"❌ Secure session creation failed: {result['error']}")
            return None

def test_password_reset():
    """Test password reset functionality"""
    print("\n🧪 Testing Password Reset...")
    
    app = create_app()
    
    with app.app_context():
        admin_user, student_user = create_test_users()
        
        # Test email reset
        print("  📧 Testing email reset...")
        result = AdminPasswordResetService.reset_password_via_email(
            admin_user.id, student_user.id, notify_user=False  # Don't send actual email
        )
        
        if result['success']:
            print("✅ Email reset initiated successfully")
            print(f"   Token ID: {result['token_id']}")
        else:
            print(f"❌ Email reset failed: {result['error']}")
        
        # Test temporary password
        print("  🔑 Testing temporary password generation...")
        result = AdminPasswordResetService.generate_temporary_password(
            admin_user.id, student_user.id
        )
        
        if result['success']:
            print("✅ Temporary password generated successfully")
            print(f"   Password: {result['temporary_password']}")
            
            # Re-query student user to get updated data
            student_user = User.query.filter_by(id=student_user.id).first()
            
            # Test login with temporary password
            if student_user.check_password(result['temporary_password']):
                print("✅ Temporary password login: PASSED")
            else:
                print("❌ Temporary password login: FAILED")
                print(f"   Expected temp password: {result['temporary_password']}")
                print(f"   User has temp password: {bool(student_user.temp_password_hash)}")
                print(f"   Temp expires at: {student_user.temp_password_expires_at}")
        else:
            print(f"❌ Temporary password generation failed: {result['error']}")

def test_password_viewing():
    """Test password viewing functionality"""
    print("\n🧪 Testing Password Viewing...")
    
    app = create_app()
    
    with app.app_context():
        admin_user, student_user = create_test_users()
        
        try:
            # Load password history relationship
            from sqlalchemy.orm import joinedload
            student_user = User.query.options(joinedload(User.password_history)).filter_by(id=student_user.id).first()
            
            # Test password viewing
            plaintext_password = student_user.get_plaintext_password(
                admin_user.id, 
                "Testing password viewing functionality for system validation"
            )
            
            if plaintext_password == 'student123':
                print("✅ Password viewing: PASSED")
                print(f"   Retrieved password: {plaintext_password}")
            else:
                print(f"❌ Password viewing: FAILED - got '{plaintext_password}'")
            
            # Check audit log
            audit_entries = PasswordViewAudit.query.filter_by(
                admin_id=admin_user.id,
                target_user_id=student_user.id
            ).count()
            
            if audit_entries > 0:
                print(f"✅ Audit logging: PASSED ({audit_entries} entries)")
            else:
                print("❌ Audit logging: FAILED")
                
        except Exception as e:
            print(f"❌ Password viewing failed: {str(e)}")

def test_rate_limiting():
    """Test rate limiting functionality"""
    print("\n🧪 Testing Rate Limiting...")
    
    app = create_app()
    
    with app.app_context():
        admin_user, _ = create_test_users()
        
        # Check current rate limit
        can_proceed = AdminSecurityService.check_rate_limit(admin_user.id)
        print(f"✅ Rate limit check: {'PASSED' if can_proceed else 'RATE LIMITED'}")

def test_audit_trail():
    """Test audit trail functionality"""
    print("\n🧪 Testing Audit Trail...")
    
    app = create_app()
    
    with app.app_context():
        # Check admin actions
        admin_actions = AdminAction.query.count()
        password_views = PasswordViewAudit.query.count()
        reset_tokens = PasswordResetToken.query.count()
        
        print(f"📊 Audit Statistics:")
        print(f"   Admin actions: {admin_actions}")
        print(f"   Password views: {password_views}")
        print(f"   Reset tokens: {reset_tokens}")
        
        if admin_actions > 0 or password_views > 0:
            print("✅ Audit trail: PASSED")
        else:
            print("⚠️  Audit trail: No entries found (run other tests first)")

def run_all_tests():
    """Run all tests"""
    print("🚀 Starting Password Management Tests")
    print("=" * 50)
    
    try:
        # Initialize default configs
        app = create_app()
        with app.app_context():
            AdminSecurityService.initialize_default_configs()
            print("✅ Security configurations initialized")
        
        # Run individual tests
        test_secure_session()
        test_password_reset()
        test_password_viewing()
        test_rate_limiting()
        test_audit_trail()
        
        print("\n" + "=" * 50)
        print("🎉 All tests completed!")
        print("\n📋 Next Steps:")
        print("1. Start the backend server")
        print("2. Test the frontend components")
        print("3. Verify email templates are working")
        print("4. Check database migrations")
        
    except Exception as e:
        print(f"\n💥 Test suite failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    run_all_tests()