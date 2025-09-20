#!/usr/bin/env python3
"""
Script to seed the database with test data for the admin dashboard
"""

import uuid
from datetime import datetime, timedelta
from app import create_app, db
from app.models import User, Course, Module, Lesson, Session, Enrollment, Invoice, TutorEarning

def create_seed_data():
    """Create seed data for testing admin dashboard"""
    
    app = create_app()
    
    with app.app_context():
        # Clear existing data
        db.drop_all()
        db.create_all()
        
        print("🌱 Seeding database with test data...")
        
        # Create users
        users = []
        
        # Create admin user
        admin = User(
            id=f"admin_{uuid.uuid4().hex[:8]}",
            email="admin@troupe.com",
            account_type='admin',
            profile={
                'name': 'System Administrator',
                'role': 'Super Admin',
                'permissions': ['all']
            },
            is_active=True
        )
        admin.set_password('admin123')
        users.append(admin)
        
        # NOTE: All sample users (students, guardians, tutors) have been removed
        # Only admin user will be created to keep the app clean
        
        # Add all users
        for user in users:
            db.session.add(user)
        
        # Commit users first
        db.session.commit()
        print(f"✅ Created {len(users)} users")
        
        # NOTE: All sample courses, modules, and lessons have been removed
        # Admin can create courses through the admin dashboard
        
        # NOTE: Removed enrollments, sessions, invoices, and tutor earnings
        # since there are no sample users to create them for
        
        print("\n🎉 Database seeded successfully!")
        print("\n📊 Summary:")
        print(f"   • {len([u for u in users if u.account_type == 'admin'])} Admin(s)")
        print(f"   • 0 Students (removed)")
        print(f"   • 0 Guardians (removed)")
        print(f"   • 0 Tutors (removed)")
        print(f"   • 0 Courses (removed)")
        print(f"   • 0 Modules (removed)")
        print(f"   • 0 Lessons (removed)")
        print(f"   • 0 Enrollments (removed)")
        print(f"   • 0 Sessions (removed)")
        print(f"   • 0 Invoices (removed)")
        print(f"   • 0 Tutor Earnings (removed)")
        
        print("\n🔐 Login Credentials:")
        print("   Admin: admin@troupe.com / admin123")
        print("\n📝 Next Steps:")
        print("   • All sample data has been completely removed")
        print("   • Admin can create courses through the admin dashboard")
        print("   • Users can register through the normal registration process")
        print("   • Database is now completely clean and production-ready")

if __name__ == "__main__":
    create_seed_data()