#!/usr/bin/env python3
"""
Script to create an admin user for the ORMS system
"""

import sys
import uuid
from app import create_app, db
from app.models import User

def create_admin_user(email, password, name="System Administrator"):
    """Create an admin user"""
    
    # Create Flask app context
    app = create_app()
    
    with app.app_context():
        # Check if admin already exists
        existing_admin = User.query.filter_by(email=email.lower()).first()
        if existing_admin:
            print(f"❌ User with email {email} already exists!")
            return False
        
        # Create admin user
        admin_user = User(
            id=f"admin_{uuid.uuid4().hex[:8]}",
            email=email.lower(),
            account_type='admin',
            profile={
                'name': name,
                'role': 'System Administrator',
                'permissions': ['all'],
                'created_by': 'system'
            },
            is_active=True
        )
        
        # Set password
        admin_user.set_password(password)
        
        # Save to database
        try:
            db.create_all()  # Ensure tables exist
            db.session.add(admin_user)
            db.session.commit()
            
            print("✅ Admin user created successfully!")
            print(f"📧 Email: {email}")
            print(f"👤 Name: {name}")
            print(f"🆔 User ID: {admin_user.id}")
            print(f"🔑 Account Type: {admin_user.account_type}")
            print("\n🚀 You can now login with these credentials!")
            
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating admin user: {str(e)}")
            return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_admin.py <email> <password> [name]")
        print("Example: python create_admin.py admin@troupe.com admin123 'John Admin'")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    name = sys.argv[3] if len(sys.argv) > 3 else "System Administrator"
    
    print("🔨 Creating admin user...")
    create_admin_user(email, password, name)